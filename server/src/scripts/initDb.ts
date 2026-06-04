import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const dbPath = join(process.cwd(), 'data', 'missionos.sqlite');
if (existsSync(dbPath)) {
  rmSync(dbPath);
}

require('../utils/prisma.js');
console.log('MissionOS SQLite database is ready at data/missionos.sqlite');
