import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceUserRolesSafely } from './roleAssignmentIntegrityService.js';

type Row = Record<string, any>;

function makeStore(options: { failCreateRoleId?: string } = {}) {
  const users: Row[] = [{ id: 'user-1', tenantId: 'tenant-a', email: 'user@example.test' }];
  const roles: Row[] = [
    { id: 'role-a', tenantId: 'tenant-a', code: 'a' },
    { id: 'role-b', tenantId: 'tenant-a', code: 'b' },
    { id: 'role-c', tenantId: 'tenant-a', code: 'c' },
    { id: 'role-foreign', tenantId: 'tenant-b', code: 'foreign' },
    { id: 'role-global', tenantId: null, code: 'global' },
  ];
  let userRoles: Row[] = [
    { id: 'link-a', tenantId: 'tenant-a', userId: 'user-1', roleId: 'role-a', assignedByUserId: 'seed', assignedAt: '2026-01-01T00:00:00Z' },
  ];
  const audits: Row[] = [];

  const matches = (row: Row, where: Row = {}) => Object.entries(where).every(([key, value]) => row[key] === value);

  const store: any = {
    user: {
      async findFirst({ where }: any) {
        return users.find((row) => matches(row, where)) ?? null;
      },
    },
    role: {
      async findFirst({ where }: any) {
        return roles.find((row) => matches(row, where)) ?? null;
      },
    },
    userRole: {
      async findMany({ where }: any) {
        return userRoles.filter((row) => matches(row, where)).map((row) => ({ ...row }));
      },
      async create({ data }: any) {
        if (options.failCreateRoleId && data.roleId === options.failCreateRoleId) {
          throw new Error(`Injected create failure for ${data.roleId}`);
        }
        const row = { id: data.id ?? `link-${data.roleId}-${userRoles.length + 1}`, ...data };
        userRoles.push(row);
        return { ...row };
      },
      async deleteMany({ where }: any) {
        const before = userRoles.length;
        userRoles = userRoles.filter((row) => !matches(row, where));
        return { count: before - userRoles.length };
      },
    },
    auditLog: {
      async create({ data }: any) {
        audits.push({ ...data });
        return { ...data };
      },
    },
  };

  return {
    store,
    roleIds: () => userRoles.map((row) => row.roleId).sort(),
    audits: () => [...audits],
  };
}

test('role replacement reaches the complete validated target set and audits once', async () => {
  const fake = makeStore();

  const result = await replaceUserRolesSafely(
    'tenant-a',
    'user-1',
    'admin-1',
    ['role-b', 'role-global', 'role-b'],
    fake.store,
  );

  assert.deepEqual(fake.roleIds(), ['role-b', 'role-global']);
  assert.deepEqual(result.added.sort(), ['role-b', 'role-global']);
  assert.deepEqual(result.removed, ['role-a']);
  assert.equal(result.changed, true);
  assert.equal(fake.audits().length, 1);
});

test('injected write failure restores the exact original authorization set', async () => {
  const fake = makeStore({ failCreateRoleId: 'role-c' });

  await assert.rejects(
    () => replaceUserRolesSafely(
      'tenant-a',
      'user-1',
      'admin-1',
      ['role-b', 'role-c'],
      fake.store,
    ),
    /Injected create failure/,
  );

  assert.deepEqual(fake.roleIds(), ['role-a']);
  assert.equal(fake.audits().length, 0);
});

test('foreign-tenant roles are rejected before any authorization mutation', async () => {
  const fake = makeStore();

  await assert.rejects(
    () => replaceUserRolesSafely(
      'tenant-a',
      'user-1',
      'admin-1',
      ['role-foreign'],
      fake.store,
    ),
    (error: any) => error?.status === 403,
  );

  assert.deepEqual(fake.roleIds(), ['role-a']);
  assert.equal(fake.audits().length, 0);
});
