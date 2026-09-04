import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const source = (name: string) => readFileSync(join(here, name), 'utf8');

function assertBefore(content: string, specificRoute: string, dynamicRoute: string) {
  const specific = content.indexOf(specificRoute);
  const dynamic = content.indexOf(dynamicRoute);
  assert.notEqual(specific, -1, `Missing route: ${specificRoute}`);
  assert.notEqual(dynamic, -1, `Missing route: ${dynamicRoute}`);
  assert.ok(specific < dynamic, `${specificRoute} must be registered before ${dynamicRoute}`);
}

test('prevention collection keywords are registered before dynamic id routes', () => {
  const content = source('prevention.ts');
  assertBefore(content, "router.get('/inspections/prioritized'", "router.get('/inspections/:id'");
  assertBefore(content, "router.get('/inspections/overdue'", "router.get('/inspections/:id'");
  assertBefore(content, "router.get('/violations/open'", "router.get('/violations/:id'");
  assertBefore(content, "router.get('/violations/critical'", "router.get('/violations/:id'");
  assertBefore(content, "router.get('/permits/backlog'", "router.get('/permits/:id'");
  assertBefore(content, "router.get('/permits/expiring'", "router.get('/permits/:id'");
  assertBefore(content, "router.get('/preplans/review-due'", "router.get('/preplans/:id'");
  assertBefore(content, "router.get('/preplans/incomplete'", "router.get('/preplans/:id'");
});

test('inventory transaction collection route precedes inventory detail', () => {
  const content = source('assets.ts');
  assertBefore(content, "router.get('/inventory/transactions'", "router.get('/inventory/:id'");
});
