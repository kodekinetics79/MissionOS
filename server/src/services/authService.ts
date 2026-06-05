import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { accessSecret, refreshSecret, JWT_ALGS } from '../utils/secrets.js';
import { verifyTotp, adminMfaRequired } from './mfaService.js';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '2h';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

export async function login(email: string, password: string, totp?: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: { tenant: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  // Same generic error whether the account is missing, inactive, or the password
  // is wrong — avoids user enumeration.
  if (!user || !user.isActive) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');
  const permissions = Array.from(new Set(user.roles.flatMap(r => r.role.permissions.map(p => p.permission.code))));

  // Second factor: if MFA is enabled for this user, a valid TOTP code is required.
  if (user.mfaEnabled && user.mfaSecret) {
    if (!totp) { const e: any = new Error('MFA code required'); e.status = 401; e.mfaRequired = true; throw e; }
    if (!verifyTotp(user.mfaSecret, totp)) { const e: any = new Error('Invalid MFA code'); e.status = 401; e.mfaRequired = true; throw e; }
  }

  const payload = { userId: user.id, tenantId: user.tenantId, email: user.email, permissions };
  const accessToken = jwt.sign(payload, accessSecret(), { expiresIn: ACCESS_TTL as any, algorithm: 'HS256' });
  const refreshToken = jwt.sign(payload, refreshSecret(), { expiresIn: REFRESH_TTL as any, algorithm: 'HS256' });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return {
    accessToken,
    refreshToken,
    // Policy signal: admins required to enroll MFA (env-gated) but not yet enrolled.
    mfaEnrollmentRequired: adminMfaRequired(permissions as string[], Boolean(user.mfaEnabled)),
    user: { id: user.id, email: user.email, displayName: user.displayName, tenant: user.tenant.name, permissions, mfaEnabled: Boolean(user.mfaEnabled) },
  };
}

export function refreshSession(token: string) {
  const payload = jwt.verify(token, refreshSecret(), { algorithms: [...JWT_ALGS] }) as {
    userId: string;
    tenantId: string;
    email: string;
    permissions: string[];
  };

  const accessToken = jwt.sign(
    { userId: payload.userId, tenantId: payload.tenantId, email: payload.email, permissions: payload.permissions },
    accessSecret(),
    { expiresIn: ACCESS_TTL as any, algorithm: 'HS256' },
  );

  return { accessToken };
}
