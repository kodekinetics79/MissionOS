import 'dotenv/config';
import { runProductionMigrations } from '../services/productionMigrationService.js';

runProductionMigrations()
  .then((result) => {
    console.log(`[db:migrate:production] applied=${result.applied.length} skipped=${result.skipped.length}`);
    if (result.applied.length) console.log(`[db:migrate:production] applied: ${result.applied.join(', ')}`);
  })
  .catch((error) => {
    console.error('[db:migrate:production] failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
