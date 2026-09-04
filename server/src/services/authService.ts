import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { accessSecret, refreshSecret, JWT_ALGS } from '../utils/secrets.js';
import { verifyTotp, adminMfaRequired } from './mfaService.js';

const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '2h';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '7d';

type TokenClaims = {
  userId: string;
  sessionVersion?: number;
  tokenType?: 'access' | 'refresh';
};

const userInclude = {
  tenant: true,
  roles: {
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  },
};

function permissionsFor(user: any): string[] {
  return Array.from(
    new Set(
      (user.roles ?? []).flatMap((link: any) =>
        (link.role?.permissions ?? []).map((entry: any) => entry.permission?.code).filter(Boolean),
      ),
    ),
  ) as string[];
}

function currentSessionVersion(user: any) {
  return Number(user.sessionVersion ?? 0);
}

function signAccessToken(userId: string, sessionVersion: number) {
  return jwt.sign(
    { userId, sessionVersion, tokenType: 'access' },
    accessSecret(),
    { expiresIn: ACCESS_TTL as any, algorithm: 'HS256' },
  );
}

function signRefreshToken(userId: string, sessionVersion: number) {
  return jwt.sign(
    { userId, sessionVersion, tokenType: 'refresh' },
    refreshSecret(),
    { expiresIn: REFRESH_TTL as any, algorithm: 'HS256' },
  );
}

export async function login(email: string, password: string, totp?: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });

  // Same generic error whether the account is missing, inactive, or the password
  // is wrong — avoids user enumeration.
  if (!user || !user.isActive) throw new Error('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  const permissions = permissionsFor(user);

  // Second factor: if MFA is enabled for this user, a valid TOTP code is required.
  if (user.mfaEnabled && user.mfaSecret) {
    if (!totp) {
      const error: any = new Error('MFA code required');
      error.status = 401;
      error.mfaRequired = true;
      throw error;
    }
    if (!verifyTotp(user.mfaSecret, totp)) {
      const error: any = new Error('Invalid MFA code');
      error.status = 401;
      error.mfaRequired = true;
      throw error;
    }
  }

  const sessionVersion = currentSessionVersion(user);
  const accessToken = signAccessToken(user.id, sessionVersion);
  const refreshToken = signRefreshToken(user.id, sessionVersion);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), updatedAt: new Date().toISOString() },
  });

  return {
    accessToken,
    refreshToken,
    // Policy signal: admins required to enroll MFA (env-gated) but not yet enrolled.
    mfaEnrollmentRequired: adminMfaRequired(permissions, Boolean(user.mfaEnabled)),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      tenant: user.tenant.name,
      permissions,
      mfaEnabled: Boolean(user.mfaEnabled),
    },
  };
}

/**
 * Refresh only after reloading the current user, status and permissions context.
 * Refresh tokens no longer carry trusted tenant/permission claims.
 */
export async function refreshSession(token: string) {
  const claims = jwt.verify(token, refreshSecret(), { algorithms: [...JWT_ALGS] }) as TokenClaims;
  if (!claims?.userId || (claims.tokenType && claims.tokenType !== 'refresh')) throw new Error('Invalid credentials');

  const user = await prisma.user.findFirst({ where: { id: claims.userId }, include: userInclude });
  if (!user || !user.isActive) throw new Error('Invalid credentials');

  const sessionVersion = currentSessionVersion(user);
  if (Number(claims.sessionVersion ?? 0) !== sessionVersion) throw new Error('Invalid credentials');

  return {
    accessToken: signAccessToken(user.id, sessionVersion),
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      tenant: user.tenant.name,
      permissions: permissionsFor(user),
      mfaEnabled: Boolean(user.mfaEnabled),
    },
  };
}

/**
 * Revoke all access/refresh tokens issued for the user's current session version.
 * This gives logout and administrative account-disable operations a durable hook
 * without introducing a server-local token blacklist.
 */
export async function logout(userId: string) {
  const user = await prisma.user.findFirst({ where: { id: userId } });
  if (!user) return true;

  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionVersion: currentSessionVersion(user) + 1,
      updatedAt: new Date().toISOString(),
    },
  });
  return true;
}
