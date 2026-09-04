import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Pool } from 'pg';

const MIGRATION_LOCK_KEY = 71925026;

type MigrationResult = {
  applied: string[];
  skipped: string[];
};

function isPostgresUrl(value: string) {
  return /^postgres(ql)?:\/\//i.test(value);
}

function isLocalPostgres(value: string) {
  return /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(value);
}

function checksum(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

export async function runProductionMigrations(
  databaseUrl = process.env.DATABASE_URL ?? '',
  migrationsDir = join(process.cwd(), 'database', 'migrations'),
): Promise<MigrationResult> {
  if (!isPostgresUrl(databaseUrl)) {
    throw new Error('Production migrations require a PostgreSQL DATABASE_URL');
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
    ssl: isLocalPostgres(databaseUrl)
      ? false
      : { rejectUnauthorized: process.env.PG_SSL_NO_VERIFY !== 'true' },
  });

  const client = await pool.connect();
  const result: MigrationResult = { applied: [], skipped: [] };

  try {
    // Serialize schema migrations across concurrently starting API nodes.
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_KEY]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS missionos_schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((name) => /^\d+.*\.sql$/i.test(name))
      .sort((a, b) => a.localeCompare(b));

    for (const name of files) {
      const sql = await readFile(join(migrationsDir, name), 'utf8');
      const digest = checksum(sql);
      const existing = await client.query(
        'SELECT checksum FROM missionos_schema_migrations WHERE name = $1',
        [name],
      );

      if (existing.rowCount) {
        if (existing.rows[0].checksum !== digest) {
          throw new Error(`Applied migration checksum mismatch: ${name}`);
        }
        result.skipped.push(name);
        continue;
      }

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO missionos_schema_migrations (name, checksum) VALUES ($1, $2)',
          [name, digest],
        );
        await client.query('COMMIT');
        result.applied.push(name);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return result;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_KEY]);
    } catch {
      // The connection may already be unusable; closing the pool releases locks.
    }
    client.release();
    await pool.end();
  }
}
