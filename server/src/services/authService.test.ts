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
