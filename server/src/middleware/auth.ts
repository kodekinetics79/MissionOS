import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { accessSecret, JWT_ALGS } from '../utils/secrets.js';
import { prisma } from '../utils/prisma.js';

export type AuthUser = {
  userId: string;
  tenantId: string;
  permissions: string[];
  email: string;
  sessionVersion: number;
};

type AccessClaims = {
  userId: string;
  sessionVersion?: number;
  tokenType?: 'access';
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function unauthorized(res: Response, reason = 'Invalid token') {
  return res.status(401).json({ success: false, data: null, message: 'Unauthorized', errors: [reason] });
}

/**
 * Authenticate against the current database state, not stale JWT authorization claims.
 *
 * Why this matters:
 * - disabling a user takes effect immediately;
 * - logout/session revocation takes effect immediately via sessionVersion;
 * - role/permission changes take effect on the next request;
 * - tenant identity is loaded from the user record rather than trusted from a token.
 */
export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return unauthorized(res, 'Missing bearer token');

  try {
    const claims = jwt.verify(header.slice(7), accessSecret(), { algorithms: [...JWT_ALGS] }) as AccessClaims;
    if (!claims?.userId || (claims.tokenType && claims.tokenType !== 'access')) return unauthorized(res);

    const user = await prisma.user.findFirst({
      where: { id: claims.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) return unauthorized(res);

    const currentSessionVersion = Number(user.sessionVersion ?? 0);
    const tokenSessionVersion = Number(claims.sessionVersion ?? 0);
    if (currentSessionVersion !== tokenSessionVersion) return unauthorized(res, 'Session expired');

    const permissions = Array.from(
      new Set(
        (user.roles ?? []).flatMap((link: any) =>
          (link.role?.permissions ?? []).map((entry: any) => entry.permission?.code).filter(Boolean),
        ),
      ),
    ) as string[];

    req.user = {
      userId: user.id,
      tenantId: user.tenantId,
      permissions,
      email: user.email,
      sessionVersion: currentSessionVersion,
    };
    next();
  } catch {
    return unauthorized(res);
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Exact permission only. `admin.security` is a security-domain permission,
    // not a global superuser wildcard. District Admin already receives all seeded
    // permissions explicitly, preserving least privilege for every other role.
    if (!req.user?.permissions?.includes(permission)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Forbidden',
        errors: [`Missing permission: ${permission}`],
      });
    }
    next();
  };
}
