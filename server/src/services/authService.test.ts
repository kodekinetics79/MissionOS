import test from 'node:test';
import assert from 'node:assert/strict';

// Tests must never depend on developer secrets or a remote database.
process.env.JWT_SECRET = 'test-access-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
process.env.DB_DRIVER = 'sqlite';
process.env.DATABASE_URL = '';
process.env.MFA_REQUIRED_FOR_ADMIN = 'false';

const { initDb } = await import('../utils/prisma.js');
const { login, refreshSession, logout } = await import('./authService.js');
const { authRequired } = await import('../middleware/auth.js');

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

test('logout revokes previously issued refresh tokens and permits a fresh login', async () => {
  await initDb({ reset: true });

  const session = await login('admin@westmetro.example', 'MissionOS2026!');
  assert.ok(session.accessToken);
  assert.ok(session.refreshToken);

  const refreshed = await refreshSession(session.refreshToken);
  assert.ok(refreshed.accessToken);
  assert.equal(refreshed.user.email, 'admin@westmetro.example');

  await logout('user-admin');

  await assert.rejects(
    () => refreshSession(session.refreshToken),
    /Invalid credentials/,
  );

  const nextSession = await login('admin@westmetro.example', 'MissionOS2026!');
  assert.ok(nextSession.accessToken);
  assert.ok(nextSession.refreshToken);
});

test('privileged MFA policy restricts an unenrolled admin to enrollment endpoints', async () => {
  await initDb({ reset: true });
  process.env.MFA_REQUIRED_FOR_ADMIN = 'true';

  try {
    const session = await login('admin@westmetro.example', 'MissionOS2026!');
    assert.equal(session.mfaEnrollmentRequired, true);
    assert.equal(session.user.mfaEnabled, false);

    const blockedReq: any = {
      headers: { authorization: `Bearer ${session.accessToken}` },
      originalUrl: '/api/platform/summary',
      path: '/api/platform/summary',
    };
    const blocked = mockResponse();
    let blockedNext = 0;
    await authRequired(blockedReq, blocked.response, () => { blockedNext += 1; });
    assert.equal(blocked.state.status, 403);
    assert.equal(blockedNext, 0);
    assert.equal(blockedReq.user?.mfaRestricted, true);

    const allowedReq: any = {
      headers: { authorization: `Bearer ${session.accessToken}` },
      originalUrl: '/api/auth/mfa/status',
      path: '/mfa/status',
    };
    const allowed = mockResponse();
    let allowedNext = 0;
    await authRequired(allowedReq, allowed.response, () => { allowedNext += 1; });
    assert.equal(allowed.state.status, undefined);
    assert.equal(allowedNext, 1);
    assert.equal(allowedReq.user?.mfaRestricted, true);
  } finally {
    process.env.MFA_REQUIRED_FOR_ADMIN = 'false';
  }
});
