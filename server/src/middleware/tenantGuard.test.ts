import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enforceCurrentTenantSelector,
  sanitizeAdminUserPayload,
  sanitizeTenantRolePayload,
} from './tenantGuard.js';

function nextCounter() {
  let calls = 0;
  return {
    next: () => { calls += 1; },
    count: () => calls,
  };
}

function mockResponse() {
  const state: { status?: number; body?: any } = {};
  const response: any = {
    status(code: number) {
      state.status = code;
      return response;
    },
    json(body: any) {
      state.body = body;
      return response;
    },
  };
  return { response, state };
}

test('tenant selector rejects attempts to switch tenant context', () => {
  const req: any = {
    user: { tenantId: 'tenant-a' },
    query: { tenantId: 'tenant-b' },
    body: {},
  };
  const { response, state } = mockResponse();
  const counter = nextCounter();

  enforceCurrentTenantSelector(req, response, counter.next as any);

  assert.equal(state.status, 403);
  assert.equal(counter.count(), 0);
});

test('admin user update strips tenancy, credential, MFA and session fields', () => {
  const req: any = {
    method: 'PUT',
    params: { id: 'user-1' },
    body: {
      email: 'safe@example.test',
      displayName: 'Safe Name',
      status: 'Active',
      tenantId: 'tenant-b',
      id: 'replacement-id',
      password: 'plaintext',
      passwordHash: 'attacker-hash',
      mfaSecret: 'secret',
      mfaEnabled: true,
      sessionVersion: 0,
    },
  };
  const counter = nextCounter();

  sanitizeAdminUserPayload(req, {} as any, counter.next as any);

  assert.deepEqual(req.body, {
    email: 'safe@example.test',
    displayName: 'Safe Name',
    personnelId: undefined,
    status: 'Active',
    ssoProvider: undefined,
  });
  assert.equal(counter.count(), 1);
});

test('tenant role creation cannot create a system role', () => {
  const req: any = {
    method: 'POST',
    params: {},
    body: {
      name: 'Custom role',
      code: 'custom-role',
      description: 'Tenant role',
      roleType: 'Custom',
      isSystemRole: true,
      tenantId: 'other-tenant',
    },
  };
  const counter = nextCounter();

  sanitizeTenantRolePayload(req, {} as any, counter.next as any);

  assert.equal(req.body.isSystemRole, false);
  assert.equal('tenantId' in req.body, false);
  assert.equal(counter.count(), 1);
});
