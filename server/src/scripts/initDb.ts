import 'dotenv/config';
import { initDb, flushWrites } from '../utils/prisma.js';

// Reseed the MissionOS repository against the configured backend.
// Postgres (Neon) when DATABASE_URL points at a non-local host, else local SQLite.
initDb({ reset: true })
  .then(async (driver) => {
    await flushWrites();
    console.log(`MissionOS database seeded on ${driver}.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('MissionOS database seed failed:', err);
    process.exit(1);
  });
