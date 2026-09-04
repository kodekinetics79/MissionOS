import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { runProductionMigrations } from './productionMigrationService.js';

const databaseUrl = process.env.TEST_DATABASE_URL ?? '';
const destructiveAllowed = process.env.ALLOW_DESTRUCTIVE_DB_TESTS === 'true';
const canRun = Boolean(databaseUrl && destructiveAllowed);

async function withPool<T>(fn: (pool: Pool) => Promise<T>) {
  const pool = new Pool({ connectionString: databaseUrl, ssl: false, max: 2 });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

test('production migrations are transactional, idempotent and enforce authorization invariants', { skip: !canRun }, async () => {
  await withPool(async (pool) => {
    await pool.query('DROP TABLE IF EXISTS missionos_schema_migrations');
    await pool.query('DROP TABLE IF EXISTS records');
  });

  const first = await runProductionMigrations(databaseUrl);
  assert.deepEqual(first.applied, ['001_authorization_integrity.sql']);
  assert.deepEqual(first.skipped, []);

  const second = await runProductionMigrations(databaseUrl);
  assert.deepEqual(second.applied, []);
  assert.deepEqual(second.skipped, ['001_authorization_integrity.sql']);

  await withPool(async (pool) => {
    const insertRecord = async (model: string, id: string, tenantId: string | null, data: Record<string, unknown>) => {
      return pool.query(
        'INSERT INTO records (model, id, "tenantId", data, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6)',
        [model, id, tenantId, JSON.stringify(data), new Date().toISOString(), new Date().toISOString()],
      );
    };

    await insertRecord('user', 'ci-user-1', 'tenant-a', { email: 'Admin@Example.Test' });
    await assert.rejects(
      () => insertRecord('user', 'ci-user-2', 'tenant-b', { email: 'admin@example.test' }),
      (error: any) => error?.code === '23505',
    );

    await insertRecord('userRole', 'ci-link-1', 'tenant-a', { userId: 'user-1', roleId: 'role-1' });
    await assert.rejects(
      () => insertRecord('userRole', 'ci-link-2', 'tenant-a', { userId: 'user-1', roleId: 'role-1' }),
      (error: any) => error?.code === '23505',
    );

    // The same logical ids in a different tenant are allowed because the durable
    // authorization invariant is tenant-scoped.
    await insertRecord('userRole', 'ci-link-3', 'tenant-b', { userId: 'user-1', roleId: 'role-1' });

    const migrationRows = await pool.query('SELECT name, checksum FROM missionos_schema_migrations ORDER BY name');
    assert.equal(migrationRows.rowCount, 1);
    assert.match(migrationRows.rows[0].checksum, /^[a-f0-9]{64}$/);
  });
});
