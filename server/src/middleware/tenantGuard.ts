import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma.js';

function forbidden(res: Response) {
  return res.status(403).json({
    success: false,
    data: null,
    message: 'Forbidden',
    errors: ['Cross-tenant access is not allowed'],
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
  if (role.isSystemRole) return forbidden(res);
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
