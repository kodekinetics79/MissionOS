import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  if (!user || !user.isActive) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');
  const permissions = Array.from(new Set(user.roles.flatMap(r => r.role.permissions.map(p => p.permission.code))));
  const payload = { userId: user.id, tenantId: user.tenantId, email: user.email, permissions };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '2h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret', { expiresIn: '7d' });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, displayName: user.displayName, tenant: user.tenant.name, permissions } };
}

export function refreshSession(token: string) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret') as {
    userId: string;
    tenantId: string;
    email: string;
    permissions: string[];
  };

  const accessToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, email: payload.email, permissions: payload.permissions },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '2h' }
  );

  return { accessToken };
}
