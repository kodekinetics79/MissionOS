import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';
import { seedData } from '../data/seed.js';

type Row = Record<string, any>;
type Where = Record<string, any> | undefined;

// ── Durable storage backends ────────────────────────────────────────────────
// The repository keeps an in-memory read cache so all query / include / where
// logic stays synchronous and unchanged. The cache is backed by a durable store:
// Postgres (Neon) when DATABASE_URL points at a non-local host, otherwise a local
// SQLite file. Switching backends requires no changes to any service or route.
interface Backend {
  name: string;
  init(): Promise<void>;
  count(): Promise<number>;
  loadAll(): Promise<Map<string, Row[]>>;
  upsert(model: string, row: Row): Promise<void>;
  bulkInsert(all: Map<string, Row[]>): Promise<void>;
  replaceModel(model: string, kept: Row[]): Promise<void>;
  truncate(): Promise<void>;
}

const dbPath = join(process.cwd(), 'data', 'missionos.sqlite');

class SqliteBackend implements Backend {
  name = 'sqlite';
  private db!: DatabaseSync;
  async init() {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('CREATE TABLE IF NOT EXISTS records (model TEXT NOT NULL, id TEXT NOT NULL, tenantId TEXT, data TEXT NOT NULL, createdAt TEXT, updatedAt TEXT, PRIMARY KEY (model, id));');
  }
  async count() { return (this.db.prepare('SELECT COUNT(*) as c FROM records').get() as { c: number })?.c ?? 0; }
  async loadAll() {
    const rows = this.db.prepare('SELECT model, data FROM records').all() as Array<{ model: string; data: string }>;
    const map = new Map<string, Row[]>();
    for (const r of rows) { const bucket = map.get(r.model) ?? []; bucket.push(JSON.parse(r.data)); map.set(r.model, bucket); }
    return map;
  }
  async upsert(model: string, row: Row) {
    this.db.prepare('INSERT OR REPLACE INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
      .run(model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null);
  }
  async bulkInsert(all: Map<string, Row[]>) {
    const ins = this.db.prepare('INSERT OR REPLACE INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    for (const [model, rows] of all) for (const row of rows) ins.run(model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null);
  }
  async replaceModel(model: string, kept: Row[]) {
    this.db.prepare('DELETE FROM records WHERE model = ?').run(model);
    const ins = this.db.prepare('INSERT INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    for (const row of kept) ins.run(model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null);
  }
  async truncate() { this.db.exec('DELETE FROM records'); }
}

class PostgresBackend implements Backend {
  name = 'postgres';
  private pool!: Pool;
  constructor(private url: string) {}
  async init() {
    // TLS is required; certificates are verified by default (set PG_SSL_NO_VERIFY=true
    // only as a deliberate, documented escape hatch — verifying prevents MITM).
    const rejectUnauthorized = process.env.PG_SSL_NO_VERIFY !== 'true';
    this.pool = new Pool({ connectionString: this.url, ssl: { rejectUnauthorized }, max: 5 });
    await this.pool.query('CREATE TABLE IF NOT EXISTS records (model text NOT NULL, id text NOT NULL, "tenantId" text, data jsonb NOT NULL, "createdAt" text, "updatedAt" text, PRIMARY KEY (model, id));');
  }
  async count() { const r = await this.pool.query('SELECT COUNT(*)::int AS c FROM records'); return Number(r.rows[0].c ?? 0); }
  async loadAll() {
    const r = await this.pool.query('SELECT model, data FROM records');
    const map = new Map<string, Row[]>();
    for (const row of r.rows) { const bucket = map.get(row.model) ?? []; bucket.push(row.data); map.set(row.model, bucket); }
    return map;
  }
  async upsert(model: string, row: Row) {
    await this.pool.query(
      'INSERT INTO records (model, id, "tenantId", data, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (model, id) DO UPDATE SET "tenantId" = EXCLUDED."tenantId", data = EXCLUDED.data, "updatedAt" = EXCLUDED."updatedAt"',
      [model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null],
    );
  }
  async bulkInsert(all: Map<string, Row[]>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const CHUNK = 400;
      for (const [model, rows] of all) {
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const values: string[] = [];
          const params: any[] = [];
          let n = 1;
          for (const row of chunk) {
            values.push(`($${n++},$${n++},$${n++},$${n++},$${n++},$${n++})`);
            params.push(model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null);
          }
          await client.query(
            `INSERT INTO records (model, id, "tenantId", data, "createdAt", "updatedAt") VALUES ${values.join(',')} ON CONFLICT (model, id) DO UPDATE SET data = EXCLUDED.data`,
            params,
          );
        }
      }
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  }
  async replaceModel(model: string, kept: Row[]) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM records WHERE model = $1', [model]);
      for (const row of kept) {
        await client.query('INSERT INTO records (model, id, "tenantId", data, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6)', [model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null]);
      }
      await client.query('COMMIT');
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  }
  async truncate() { await this.pool.query('TRUNCATE records'); }
}

function selectBackend(): Backend {
  const url = process.env.DATABASE_URL ?? '';
  const isPg = /^postgres(ql)?:\/\//.test(url);
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  if (isPg && !isLocal && process.env.DB_DRIVER !== 'sqlite') return new PostgresBackend(url);
  return new SqliteBackend();
}

let backend: Backend = selectBackend();
const store = new Map<string, Row[]>();

// Serialize writes per model. The JSON-document repository persists a whole model
// for delete operations, so allowing a concurrent upsert against that same model
// can otherwise lose data when replaceModel commits after the upsert. Different
// models can still write in parallel.
const writeTails = new Map<string, Promise<void>>();

async function serializeModelWrite<T>(model: string, operation: () => Promise<T>): Promise<T> {
  const previous = writeTails.get(model) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(operation);
  const tail = run.then(() => undefined, () => undefined);
  writeTails.set(model, tail);
  try {
    return await run;
  } finally {
    if (writeTails.get(model) === tail) writeTails.delete(model);
  }
}

// Reads come from the in-memory store (keeps the sync query engine untouched).
// Writes update the store AND are persisted durably before the caller's promise
// resolves — important on serverless, where the process can be frozen the instant
// a response is sent (a fire-and-forget write would be lost).
export async function flushWrites() {
  await Promise.all([...writeTails.values()]);
}

function memUpsert(model: string, row: Row): Row {
  const id = row.id ?? `${model}-${randomUUID()}`;
  const storedRow = { ...row, id: String(id) };
  const bucket = store.get(model) ?? [];
  const idx = bucket.findIndex((r) => String(r.id) === storedRow.id);
  if (idx >= 0) bucket[idx] = storedRow; else bucket.push(storedRow);
  store.set(model, bucket);
  return storedRow;
}

function loadRows(model: string): Row[] {
  return store.get(model) ?? [];
}

async function upsertRow(model: string, row: Row) {
  return serializeModelWrite(model, async () => {
    const storedRow = memUpsert(model, row);
    await backend.upsert(model, storedRow);
    return storedRow;
  });
}

async function deleteRows(model: string, predicate: (row: Row) => boolean) {
  return serializeModelWrite(model, async () => {
    const rows = store.get(model) ?? [];
    const kept = rows.filter((row) => !predicate(row));
    const removed = rows.length - kept.length;
    store.set(model, kept);
    await backend.replaceModel(model, kept);
    return removed;
  });
}

// Populate the in-memory store from seed data (no per-row persistence — the
// caller persists the whole store in one batched transaction for speed).
function seedIntoStore() {
  for (const [model, rows] of Object.entries(seedData) as Array<[string, Row[]]>) {
    for (const row of rows) memUpsert(model, row);
  }
}

let initialized = false;

// Connect the durable backend, load the cache, and seed if empty. Call this once
// at server startup (and from the db:seed script with { reset: true }).
export async function initDb(options: { reset?: boolean } = {}): Promise<string> {
  if (initialized && !options.reset) return backend.name;
  try {
    await backend.init();
  } catch (err) {
    if (backend.name === 'postgres') {
      console.error('[db] Postgres unavailable, falling back to local SQLite:', (err as Error)?.message ?? err);
      backend = new SqliteBackend();
      await backend.init();
    } else {
      throw err;
    }
  }
  await flushWrites();
  store.clear();
  if (options.reset) await backend.truncate();
  const total = options.reset ? 0 : await backend.count();
  if (total === 0) {
    seedIntoStore();
    await backend.bulkInsert(store);
  } else {
    const loaded = await backend.loadAll();
    for (const [model, rows] of loaded) store.set(model, rows);
  }
  initialized = true;
  const records = [...store.values()].reduce((n, b) => n + b.length, 0);
  console.log(`[db] MissionOS repository ready on ${backend.name} (${records} records).`);
  return backend.name;
}

function pickPathValue(row: Row, key: string) {
  return key.split('.').reduce((value: any, part) => (value == null ? undefined : value[part]), row);
}

function matchCondition(value: any, condition: any): boolean {
  if (condition && typeof condition === 'object' && !Array.isArray(condition)) {
    const normalizeDate = (input: any) => (input instanceof Date ? input.getTime() : Number.isFinite(Date.parse(String(input))) ? new Date(input).getTime() : input);
    if ('in' in condition) return Array.isArray(condition.in) && condition.in.includes(value);
    if ('contains' in condition) {
      const needle = String(condition.contains ?? '').toLowerCase();
      return String(value ?? '').toLowerCase().includes(needle);
    }
    if ('lt' in condition) return normalizeDate(value) < normalizeDate(condition.lt);
    if ('lte' in condition) return normalizeDate(value) <= normalizeDate(condition.lte);
    if ('gt' in condition) return normalizeDate(value) > normalizeDate(condition.gt);
    if ('gte' in condition) return normalizeDate(value) >= normalizeDate(condition.gte);
    if ('equals' in condition) return value === condition.equals;
    if ('is' in condition) return matchWhere(value ?? {}, condition.is);
  }
  return value === condition;
}

function relatedRows(model: string, relation: string, row: Row) {
  if (model === 'personnelCertification' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'personnelCertification' && relation === 'certification') {
    return loadRows('certification').find((certification) => certification.id === row.certificationId) ?? null;
  }
  if (model === 'trainingAssignment' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'trainingAssignment' && relation === 'course') {
    return loadRows('course').find((course) => course.id === row.courseId) ?? null;
  }
  if (model === 'trainingAssignment' && relation === 'session') {
    return loadRows('courseSession').find((session) => session.id === row.sessionId) ?? null;
  }
  if (model === 'trainingAttendance' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'trainingAttendance' && relation === 'session') {
    return loadRows('courseSession').find((session) => session.id === row.sessionId) ?? null;
  }
  if (model === 'incidentPersonnel' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'incidentPersonnel' && relation === 'incident') {
    return loadRows('incident').find((incident) => incident.id === row.incidentId) ?? null;
  }
  if (model === 'personnelAssignment' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'personnelAssignment' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'personnelAssignmentHistory' && relation === 'personnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'personnelAssignmentHistory' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'apparatus' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'apparatus' && relation === 'apparatusTypeRef') {
    return loadRows('apparatusType').find((type) => type.id === row.apparatusTypeId) ?? null;
  }
  if (model === 'asset' && relation === 'tenant') {
    return loadRows('tenant').find((tenant) => tenant.id === row.tenantId) ?? null;
  }
  if (model === 'asset' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'asset' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'asset' && relation === 'assignedPersonnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.assignedPersonnelId) ?? null;
  }
  if (model === 'inventoryItem' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'inventoryItem' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'inventoryItem' && relation === 'vendor') {
    return loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
  }
  if (model === 'inventoryTransaction' && relation === 'inventoryItem') {
    return loadRows('inventoryItem').find((item) => item.id === row.inventoryItemId) ?? null;
  }
  if (model === 'inventoryTransaction' && relation === 'fromStation') {
    return loadRows('station').find((station) => station.id === row.fromStationId) ?? null;
  }
  if (model === 'inventoryTransaction' && relation === 'toStation') {
    return loadRows('station').find((station) => station.id === row.toStationId) ?? null;
  }
  if (model === 'inventoryTransaction' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'inventoryTransaction' && relation === 'performedByPersonnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.performedByPersonnelId) ?? null;
  }
  if (model === 'maintenanceEvent' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'maintenanceEvent' && relation === 'asset') {
    return loadRows('asset').find((asset) => asset.id === row.assetId) ?? null;
  }
  if (model === 'maintenanceEvent' && relation === 'vendor') {
    return loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
  }
  if (model === 'maintenanceEvent' && relation === 'reportedByPersonnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.reportedByPersonnelId) ?? null;
  }
  if (model === 'maintenanceEvent' && relation === 'assignedToPersonnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.assignedToPersonnelId) ?? null;
  }
  if (model === 'preventiveMaintenanceSchedule' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'preventiveMaintenanceSchedule' && relation === 'asset') {
    return loadRows('asset').find((asset) => asset.id === row.assetId) ?? null;
  }
  if (model === 'preventiveMaintenanceSchedule' && relation === 'assignedToPersonnel') {
    return loadRows('personnel').find((personnel) => personnel.id === row.assignedToPersonnelId) ?? null;
  }
  if (model === 'vendor' && relation === 'reorderRecommendations') {
    return loadRows('purchaseReorderRecommendation').filter((rec) => rec.vendorId === row.id);
  }
  if (model === 'purchaseReorderRecommendation' && relation === 'inventoryItem') {
    return loadRows('inventoryItem').find((item) => item.id === row.inventoryItemId) ?? null;
  }
  if (model === 'purchaseReorderRecommendation' && relation === 'vendor') {
    return loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
  }
  if (model === 'purchaseReorderRecommendation' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'purchaseReorderRecommendation' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'assetReadinessSnapshot' && relation === 'station') {
    return loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'assetReadinessSnapshot' && relation === 'apparatus') {
    return loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'userRole' && relation === 'role') {
    return loadRows('role').find((role) => role.id === row.roleId) ?? null;
  }
  if (model === 'userRole' && relation === 'user') {
    return loadRows('user').find((user) => user.id === row.userId) ?? null;
  }
  return null;
}

function matchWhere(row: Row, where: Where, model?: string): boolean {
  if (!where) return true;
  if (Array.isArray(where.OR)) {
    return where.OR.some((clause) => matchWhere(row, clause, model));
  }
  return Object.entries(where).every(([key, condition]) => {
    if (key === 'OR') return true;
    if (key === 'personnel' && model === 'personnelCertification' && condition && typeof condition === 'object' && 'is' in condition) {
      return matchWhere(relatedRows(model, 'personnel', row) ?? {}, condition.is, 'personnel');
    }
    if (key === 'tenant' && condition && typeof condition === 'object' && 'is' in condition) {
      return matchWhere(row, condition.is, model);
    }
    const value = pickPathValue(row, key);
    return matchCondition(value, condition);
  });
}

function sortRows(rows: Row[], orderBy: any) {
  if (!orderBy) return rows;
  const orderEntries = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((left, right) => {
    for (const clause of orderEntries) {
      const [key, direction] = Object.entries(clause)[0] ?? [];
      if (!key) continue;
      const leftValue = pickPathValue(left, key);
      const rightValue = pickPathValue(right, key);
      if (leftValue === rightValue) continue;
      const comparison = leftValue > rightValue ? 1 : -1;
      return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
}

function paginate(rows: Row[], take?: number, skip?: number) {
  const start = skip ?? 0;
  const end = take ? start + take : undefined;
  return rows.slice(start, end);
}

function withIncludes(model: string, row: Row, include: any) {
  if (!include) return row;
  const enriched: Row = { ...row };
  if (model === 'user') {
    if (include.tenant) enriched.tenant = loadRows('tenant').find((tenant) => tenant.id === row.tenantId) ?? null;
    if (include.roles) {
      const links = loadRows('userRole').filter((link) => link.userId === row.id);
      enriched.roles = links.map((link) => ({
        ...link,
        role: withIncludes('role', loadRows('role').find((role) => role.id === link.roleId) ?? {}, include.roles.include?.role?.include ?? include.roles.include?.role),
      }));
    }
  }
  if (model === 'role' && include.permissions) {
    const links = loadRows('rolePermission').filter((link) => link.roleId === row.id);
    enriched.permissions = links.map((link) => ({
      ...link,
      permission: loadRows('permission').find((permission) => permission.id === link.permissionId) ?? null,
    }));
  }
  if (model === 'personnel') {
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId || station.id === row.currentStationId) ?? null;
    if (include.rankRef) enriched.rankRef = loadRows('rank').find((rank) => rank.id === row.rankId) ?? null;
    if (include.certifications) {
      enriched.certifications = loadRows('personnelCertification')
        .filter((link) => link.personnelId === row.id)
        .map((link) => ({
          ...link,
          certification: loadRows('certification').find((certification) => certification.id === link.certificationId) ?? null,
        }));
    }
    if (include.assignments) enriched.assignments = loadRows('personnelAssignment').filter((assignment) => assignment.personnelId === row.id);
    if (include.assignmentHistory) enriched.assignmentHistory = loadRows('personnelAssignmentHistory').filter((assignment) => assignment.personnelId === row.id);
    if (include.reviews) enriched.reviews = loadRows('personnelPerformanceReview').filter((review) => review.personnelId === row.id);
    if (include.goals) enriched.goals = loadRows('personnelGoal').filter((goal) => goal.personnelId === row.id);
    if (include.notes) enriched.notes = loadRows('personnelNote').filter((note) => note.personnelId === row.id);
    if (include.documents) {
      enriched.documents = loadRows('personnelDocument').filter((document) => document.personnelId === row.id);
    }
    if (include.readinessSnapshots) enriched.readinessSnapshots = loadRows('personnelReadinessSnapshot').filter((snapshot) => snapshot.personnelId === row.id);
  }
  if (model === 'station') {
    if (include.personnel) enriched.personnel = loadRows('personnel').filter((person) => person.currentStationId === row.id || person.stationId === row.id);
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').filter((apparatus) => apparatus.stationId === row.id);
    if (include.shiftAssignments) enriched.shiftAssignments = loadRows('shiftAssignment').filter((assignment) => assignment.stationId === row.id);
  }
  if (model === 'apparatus') {
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.apparatusTypeRef) enriched.apparatusTypeRef = loadRows('apparatusType').find((type) => type.id === row.apparatusTypeId) ?? null;
    if (include.maintenanceEvents) enriched.maintenanceEvents = loadRows('maintenanceEvent').filter((event) => event.apparatusId === row.id);
    if (include.preventiveSchedules) enriched.preventiveSchedules = loadRows('preventiveMaintenanceSchedule').filter((schedule) => schedule.apparatusId === row.id);
  }
  if (model === 'asset') {
    if (include.tenant) enriched.tenant = loadRows('tenant').find((tenant) => tenant.id === row.tenantId) ?? null;
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
    if (include.assignedPersonnel) enriched.assignedPersonnel = loadRows('personnel').find((personnel) => personnel.id === row.assignedPersonnelId) ?? null;
  }
  if (model === 'inventoryItem') {
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
    if (include.vendor) enriched.vendor = loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
  }
  if (model === 'inventoryTransaction' && include.inventoryItem) {
    enriched.inventoryItem = loadRows('inventoryItem').find((item) => item.id === row.inventoryItemId) ?? null;
  }
  if (model === 'maintenanceEvent') {
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
    if (include.asset) enriched.asset = loadRows('asset').find((asset) => asset.id === row.assetId) ?? null;
    if (include.vendor) enriched.vendor = loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
    if (include.reportedByPersonnel) enriched.reportedByPersonnel = loadRows('personnel').find((personnel) => personnel.id === row.reportedByPersonnelId) ?? null;
    if (include.assignedToPersonnel) enriched.assignedToPersonnel = loadRows('personnel').find((personnel) => personnel.id === row.assignedToPersonnelId) ?? null;
  }
  if (model === 'preventiveMaintenanceSchedule') {
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
    if (include.asset) enriched.asset = loadRows('asset').find((asset) => asset.id === row.assetId) ?? null;
    if (include.assignedToPersonnel) enriched.assignedToPersonnel = loadRows('personnel').find((personnel) => personnel.id === row.assignedToPersonnelId) ?? null;
  }
  if (model === 'vendor' && include.reorderRecommendations) {
    enriched.reorderRecommendations = loadRows('purchaseReorderRecommendation').filter((recommendation) => recommendation.vendorId === row.id);
  }
  if (model === 'purchaseReorderRecommendation') {
    if (include.inventoryItem) enriched.inventoryItem = loadRows('inventoryItem').find((item) => item.id === row.inventoryItemId) ?? null;
    if (include.vendor) enriched.vendor = loadRows('vendor').find((vendor) => vendor.id === row.vendorId) ?? null;
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'assetReadinessSnapshot') {
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.apparatus) enriched.apparatus = loadRows('apparatus').find((apparatus) => apparatus.id === row.apparatusId) ?? null;
  }
  if (model === 'personnelCertification') {
    if (include.certification) enriched.certification = loadRows('certification').find((certification) => certification.id === row.certificationId) ?? null;
    if (include.personnel) enriched.personnel = loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
  }
  if (model === 'personnelAssignmentHistory') {
    if (include.personnel) enriched.personnel = loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
  }
  if (model === 'trainingAssignment') {
    if (include.personnel) enriched.personnel = loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
    if (include.course) enriched.course = loadRows('course').find((course) => course.id === row.courseId) ?? null;
    if (include.session) enriched.session = loadRows('courseSession').find((session) => session.id === row.sessionId) ?? null;
  }
  if (model === 'trainingAttendance') {
    if (include.personnel) enriched.personnel = loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
    if (include.session) {
      const session = loadRows('courseSession').find((entry) => entry.id === row.sessionId) ?? null;
      enriched.session = session ? { ...session, course: loadRows('course').find((course) => course.id === session.courseId) ?? null } : null;
    }
  }
  if (model === 'incidentPersonnel') {
    if (include.personnel) enriched.personnel = loadRows('personnel').find((personnel) => personnel.id === row.personnelId) ?? null;
    if (include.incident) enriched.incident = loadRows('incident').find((incident) => incident.id === row.incidentId) ?? null;
  }
  if (model === 'incident') {
    if (include.station) enriched.station = loadRows('station').find((station) => station.id === row.stationId) ?? null;
    if (include.units) {
      enriched.units = loadRows('incidentUnit').filter((unit) => unit.incidentId === row.id).map((unit) => ({
        ...unit,
        apparatus: loadRows('apparatus').find((apparatus) => apparatus.id === unit.apparatusId) ?? null,
      }));
    }
    if (include.personnel) {
      enriched.personnel = loadRows('incidentPersonnel').filter((person) => person.incidentId === row.id).map((person) => ({
        ...person,
        personnel: loadRows('personnel').find((member) => member.id === person.personnelId) ?? null,
      }));
    }
    if (include.timeline) enriched.timeline = loadRows('incidentTimelineEvent').filter((event) => event.incidentId === row.id);
    if (include.narratives) enriched.narratives = loadRows('incidentNarrative').filter((entry) => entry.incidentId === row.id);
    if (include.qaReviews) enriched.qaReviews = loadRows('incidentQaReview').filter((entry) => entry.incidentId === row.id);
    if (include.attachments) enriched.attachments = loadRows('incidentAttachment').filter((entry) => entry.incidentId === row.id);
    if (include.epcrLinks) enriched.epcrLinks = loadRows('epcrLink').filter((entry) => entry.incidentId === row.id);
    if (include.nerisExports) enriched.nerisExports = loadRows('nerisExportLog').filter((entry) => entry.incidentId === row.id);
    if (include.dataQualityIssues) enriched.dataQualityIssues = loadRows('incidentDataQualityIssue').filter((entry) => entry.incidentId === row.id);
    if (include.duplicateCandidates) enriched.duplicateCandidates = loadRows('incidentDuplicateCandidate').filter((entry) => entry.incidentId === row.id);
  }
  return enriched;
}

function makeDelegate(model: string) {
  return {
    findMany: async (args: { where?: Where; take?: number; skip?: number; orderBy?: any; include?: any } = {}) => {
      const rows = sortRows(loadRows(model).filter((row) => matchWhere(row, args.where, model)), args.orderBy);
      return paginate(rows, args.take, args.skip).map((row) => withIncludes(model, row, args.include));
    },
    findFirst: async (args: { where?: Where; include?: any } = {}) => {
      const rows = await makeDelegate(model).findMany({ ...args, take: 1 });
      return rows[0] ?? null;
    },
    findUnique: async (args: { where?: Where; include?: any } = {}) => {
      if (!args.where) return null;
      const rows = await makeDelegate(model).findMany({ where: args.where, include: args.include, take: 1 });
      return rows[0] ?? null;
    },
    count: async (args: { where?: Where } = {}) => loadRows(model).filter((row) => matchWhere(row, args.where, model)).length,
    create: async (args: { data?: Row } = {}) => {
      const row = {
        id: args.data?.id ?? crypto.randomUUID(),
        ...args.data,
        createdAt: args.data?.createdAt ?? new Date().toISOString(),
        updatedAt: args.data?.updatedAt ?? new Date().toISOString(),
      };
      return upsertRow(model, row);
    },
    update: async (args: { where?: { id?: string }; data?: Row } = {}) => {
      const id = args.where?.id;
      if (!id) throw new Error(`Missing id for ${model}.update`);
      const rows = loadRows(model);
      const current = rows.find((row) => row.id === id);
      if (!current) throw new Error(`${model} not found`);
      const updated = { ...current, ...args.data, updatedAt: new Date().toISOString() };
      return upsertRow(model, updated);
    },
    updateMany: async (args: { where?: Where; data?: Row } = {}) => {
      let count = 0;
      // Snapshot matching rows first. Each durable write is awaited; callers never
      // receive success while persistence is still pending.
      const matching = loadRows(model).filter((row) => matchWhere(row, args.where, model));
      for (const row of matching) {
        await upsertRow(model, { ...row, ...args.data, updatedAt: new Date().toISOString() });
        count += 1;
      }
      return { count };
    },
    deleteMany: async (args: { where?: Where } = {}) => {
      const count = await deleteRows(model, (row) => matchWhere(row, args.where, model));
      return { count };
    },
    findFirstOrThrow: async (args: { where?: Where; include?: any } = {}) => {
      const result = await makeDelegate(model).findFirst(args);
      if (!result) throw new Error(`${model} not found`);
      return result;
    },
    findUniqueOrThrow: async (args: { where?: Where; include?: any } = {}) => {
      const result = await makeDelegate(model).findUnique(args);
      if (!result) throw new Error(`${model} not found`);
      return result;
    },
    createMany: async (args: { data?: Row[] } = {}) => {
      const rows = args.data ?? [];
      for (const row of rows) await upsertRow(model, row);
      return { count: rows.length };
    },
  };
}

export const prisma: any = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === '$transaction') {
        // Compatibility only: callers pass already-created promises, so this is
        // not a true atomic database transaction. Production-critical multi-model
        // workflows must use explicit service-level compensation until the target
        // normalized Prisma/Postgres layer replaces this demo repository.
        return async (operations: Array<Promise<unknown>>) => Promise.all(operations);
      }
      if (property === '$disconnect') {
        return async () => {
          await flushWrites();
        };
      }
      return makeDelegate(String(property));
    },
  }
);
