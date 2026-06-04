import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { seedData } from '../data/seed.js';

type Row = Record<string, any>;
type Where = Record<string, any> | undefined;

const dbPath = join(process.cwd(), 'data', 'missionos.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    model TEXT NOT NULL,
    id TEXT NOT NULL,
    tenantId TEXT,
    data TEXT NOT NULL,
    createdAt TEXT,
    updatedAt TEXT,
    PRIMARY KEY (model, id)
  );
`);

const rowCount = db.prepare('SELECT COUNT(*) as count FROM records').get() as { count: number };
if ((rowCount?.count ?? 0) === 0) {
  const insert = db.prepare('INSERT OR REPLACE INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
  for (const [model, rows] of Object.entries(seedData) as Array<[string, Row[]]>) {
    for (const row of rows) {
      const id = row.id ?? `${model}-${randomUUID()}`;
      insert.run(model, String(id), row.tenantId ?? null, JSON.stringify({ ...row, id }), row.createdAt ?? null, row.updatedAt ?? null);
    }
  }
}

function loadRows(model: string): Row[] {
  const query = db.prepare('SELECT data FROM records WHERE model = ?');
  return (query.all(model) as Array<{ data: string }>).map(({ data }) => JSON.parse(data));
}

function upsertRow(model: string, row: Row) {
  const statement = db.prepare('INSERT OR REPLACE INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
  const id = row.id ?? `${model}-${randomUUID()}`;
  const storedRow = { ...row, id };
  statement.run(model, String(id), row.tenantId ?? null, JSON.stringify(storedRow), row.createdAt ?? null, row.updatedAt ?? null);
  return storedRow;
}

function deleteRows(model: string, predicate: (row: Row) => boolean) {
  const rows = loadRows(model);
  const kept = rows.filter((row) => !predicate(row));
  db.prepare('DELETE FROM records WHERE model = ?').run(model);
  const insert = db.prepare('INSERT INTO records (model, id, tenantId, data, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
  for (const row of kept) {
    insert.run(model, String(row.id), row.tenantId ?? null, JSON.stringify(row), row.createdAt ?? null, row.updatedAt ?? null);
  }
  return rows.length - kept.length;
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
      for (const row of loadRows(model)) {
        if (matchWhere(row, args.where, model)) {
          upsertRow(model, { ...row, ...args.data, updatedAt: new Date().toISOString() });
          count += 1;
        }
      }
      return { count };
    },
    deleteMany: async (args: { where?: Where } = {}) => ({ count: deleteRows(model, (row) => matchWhere(row, args.where, model)) }),
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
      for (const row of args.data ?? []) upsertRow(model, row);
      return { count: (args.data ?? []).length };
    },
  };
}

export const prisma: any = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === '$transaction') {
        return async (operations: Array<Promise<unknown>>) => Promise.all(operations);
      }
      if (property === '$disconnect') {
        return async () => undefined;
      }
      return makeDelegate(String(property));
    },
  }
);
