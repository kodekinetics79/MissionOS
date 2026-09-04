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
  tokenType?: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'admin.users': ['admin.users.view', 'admin.users.manage'],
  'admin.roles': ['admin.roles.view', 'admin.roles.manage', 'admin.permissions.view', 'admin.permissions.manage'],
  'admin.audit': ['admin.audit.view'],
  'admin.security': ['admin.security.view', 'admin.security.manage'],
};

function hasPermission(granted: string[], required: string) {
  if (granted.includes(required)) return true;
  return Object.entries(LEGACY_PERMISSION_ALIASES).some(
    ([legacy, aliases]) => granted.includes(legacy) && aliases.includes(required),
  );
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
  // App-level policy guards may authenticate before a route's own authRequired.
  // Reuse that verified identity within the same request to avoid duplicate DB reads.
  if (req.user) return next();

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
    // Exact permission or a bounded legacy alias in the same admin domain only.
    // `admin.security` is no longer a global superuser wildcard.
    if (!req.user || !hasPermission(req.user.permissions ?? [], permission)) {
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
