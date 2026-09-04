import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

function forbidden(res: Response, message = 'Cross-tenant access is not allowed') {
  return res.status(403).json({
    success: false,
    data: null,
    message: 'Forbidden',
    errors: [message],
  });
}

function notFound(res: Response) {
  return res.status(404).json({
    success: false,
    data: null,
    message: 'Not found',
    errors: ['Resource not found'],
  });
}

/**
 * Reject tenant selectors supplied by a client when they differ from the tenant
 * established by authentication. Tenant administrators must never be able to
 * switch context by changing a query/body tenantId.
 */
export function enforceCurrentTenantSelector(req: Request, res: Response, next: NextFunction) {
  const requestedQueryTenant = typeof req.query?.tenantId === 'string' ? req.query.tenantId : undefined;
  const requestedBodyTenant = typeof req.body?.tenantId === 'string' ? req.body.tenantId : undefined;
  const requestedTenant = requestedBodyTenant ?? requestedQueryTenant;

  if (requestedTenant && requestedTenant !== req.user?.tenantId) return forbidden(res);
  next();
}

/**
 * Protect all /admin/users/:id subroutes before they reach services that use an
 * id-only update operation after lookup. Returning 404 avoids leaking whether a
 * user id exists in a different tenant.
 */
export async function requireTenantOwnedUser(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id;
  if (!id || !req.user?.tenantId) return notFound(res);

  const user = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!user) return notFound(res);
  next();
}

/**
 * Tenant admins may read shared/system roles, but mutations must target a custom
 * role owned by their tenant. This prevents a tenant from editing a shared role
 * by guessing its id.
 */
export async function requireTenantOwnedRoleMutation(req: Request, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const id = req.params.id;
  if (!id || !req.user?.tenantId) return notFound(res);

  const role = await prisma.role.findFirst({ where: { id } });
  if (!role || role.tenantId !== req.user.tenantId) return notFound(res);
  if (role.isSystemRole) return forbidden(res, 'System roles cannot be modified by tenant administrators');
  next();
}

/**
 * User create/update is intentionally allowlisted. The legacy admin service
 * spreads update payloads into the stored row, so sensitive fields such as
 * tenantId, passwordHash, MFA secrets, sessionVersion or an arbitrary id must
 * never reach it from the client.
 */
export function sanitizeAdminUserPayload(req: Request, _res: Response, next: NextFunction) {
  const body = req.body ?? {};

  if (req.method === 'POST' && !req.params.id) {
    req.body = {
      email: body.email,
      displayName: body.displayName,
      personnelId: body.personnelId ?? null,
      status: body.status,
      ssoProvider: body.ssoProvider ?? null,
      password: body.password,
      roleIds: Array.isArray(body.roleIds) ? body.roleIds : [],
      // MFA must be enabled through proof-of-possession enrollment, never by a
      // cosmetic/admin-created boolean with no secret behind it.
      mfaEnabled: false,
    };
    return next();
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    req.body = {
      email: body.email,
      displayName: body.displayName,
      personnelId: body.personnelId,
      status: body.status,
      ssoProvider: body.ssoProvider,
    };
  }
  next();
}

/** Tenant profile updates cannot rewrite the tenant's immutable identity. */
export function sanitizeTenantProfilePayload(req: Request, _res: Response, next: NextFunction) {
  if (req.method !== 'PUT' && req.method !== 'PATCH') return next();
  const { id: _id, tenantId: _tenantId, createdAt: _createdAt, createdBy: _createdBy, ...safe } = req.body ?? {};
  req.body = safe;
  next();
}

/** Tenant-created roles can never elevate themselves into system roles. */
export function sanitizeTenantRolePayload(req: Request, _res: Response, next: NextFunction) {
  const body = req.body ?? {};
  if (req.method === 'POST' && !req.params.id) {
    req.body = {
      name: body.name,
      code: body.code,
      description: body.description,
      roleType: body.roleType,
      isSystemRole: false,
    };
  } else if (req.method === 'PUT' || req.method === 'PATCH') {
    req.body = {
      name: body.name,
      code: body.code,
      description: body.description,
      roleType: body.roleType,
    };
  }
  next();
}

/**
 * Validate every requested role assignment against the caller's tenant (or a
 * shared/global role). Guessing another tenant's custom role id must not grant its
 * permissions to a local user.
 */
export async function validateRoleAssignments(req: Request, res: Response, next: NextFunction) {
  const roleIds = Array.isArray(req.body?.roleIds)
    ? Array.from(new Set(req.body.roleIds.map(String).filter(Boolean)))
    : [];
  if (!roleIds.length) return next();

  for (const roleId of roleIds) {
    const role = await prisma.role.findFirst({ where: { id: roleId } });
    if (!role || (role.tenantId != null && role.tenantId !== req.user?.tenantId)) {
      return forbidden(res, 'One or more requested roles are outside the current tenant');
    }
  }

  req.body.roleIds = roleIds;
  next();
}

/** Return only the caller's tenant from the legacy /api/tenants route. */
export async function currentTenantList(req: Request, res: Response) {
  const tenant = await prisma.tenant.findFirst({ where: { id: req.user!.tenantId } });
  const items = tenant ? [tenant] : [];
  return res.json({
    success: true,
    data: { items, page: 1, take: items.length, total: items.length },
    message: 'Tenants',
    errors: [],
  });
}
