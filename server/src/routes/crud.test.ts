import test from 'node:test';
import assert from 'node:assert/strict';
import { safeTake, sanitizeCreatePayload, sanitizeUpdatePayload } from './crud.js';

test('safeTake rejects invalid and abusive pagination values', () => {
  assert.equal(safeTake(undefined), 50);
  assert.equal(safeTake('not-a-number'), 50);
  assert.equal(safeTake(0), 1);
  assert.equal(safeTake(-50), 1);
  assert.equal(safeTake(250), 100);
  assert.equal(safeTake('25'), 25);
});

test('create payload cannot override identity, tenant or audit ownership', () => {
  const sanitized = sanitizeCreatePayload({
    id: 'attacker-controlled-id',
    tenantId: 'other-tenant',
    createdAt: '2000-01-01T00:00:00Z',
    updatedAt: '2000-01-01T00:00:00Z',
    createdBy: 'other-user',
    updatedBy: 'other-user',
    name: 'Allowed field',
  });

  assert.deepEqual(sanitized, { name: 'Allowed field' });
});

test('update payload cannot move a record across tenants or rewrite immutable identity fields', () => {
  const sanitized = sanitizeUpdatePayload({
    id: 'different-id',
    tenantId: 'other-tenant',
    createdAt: '2000-01-01T00:00:00Z',
    createdBy: 'other-user',
    updatedAt: '2000-01-01T00:00:00Z',
    updatedBy: 'other-user',
    status: 'Updated',
  });

  assert.deepEqual(sanitized, { status: 'Updated' });
});
