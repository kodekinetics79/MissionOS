import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';

type DelegateName = keyof typeof prisma;

type CrudPermissionPair = {
  view: string;
  manage: string;
};

const CRUD_PERMISSIONS: Record<string, CrudPermissionPair> = {
  courses: { view: 'training.view', manage: 'training.manage' },
  'training assignments': { view: 'training.view', manage: 'training.assign' },
  shifts: { view: 'staffing.view', manage: 'staffing.manage' },
  'shift assignments': { view: 'staffing.view', manage: 'staffing.manage' },
  inspections: { view: 'prevention.view', manage: 'prevention.manage' },
  permits: { view: 'prevention.view', manage: 'prevention.manage' },
  preplans: { view: 'prevention.view', manage: 'prevention.manage' },
};

export const safeTake = (value: unknown) => {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(Math.floor(parsed), 100));
};

function permissionsFor(label: string): CrudPermissionPair {
  const permissions = CRUD_PERMISSIONS[label];
  if (!permissions) throw new Error(`CRUD permissions not configured for ${label}`);
  return permissions;
}

function notFound() {
  const error: any = new Error('not found');
  error.status = 404;
  throw error;
}

/**
 * Strip identity, tenancy and audit fields that must never be client-controlled.
 * The generic repository uses globally unique model/id keys, so accepting a
 * client-supplied id could overwrite another tenant's record.
 */
export function sanitizeCreatePayload(body: Record<string, any> = {}) {
  const {
    id: _id,
    tenantId: _tenantId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    createdBy: _createdBy,
    updatedBy: _updatedBy,
    ...input
  } = body;
  return input;
}

export function sanitizeUpdatePayload(body: Record<string, any> = {}) {
  const {
    id: _id,
    tenantId: _tenantId,
    createdAt: _createdAt,
    createdBy: _createdBy,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    ...input
  } = body;
  return input;
}

export function crudRouter(delegateName: DelegateName, permissionPrefix: string) {
  const router = Router();
  const permissions = permissionsFor(permissionPrefix);
  const delegate = (prisma as any)[delegateName];

  router.get('/', authRequired, requirePermission(permissions.view), asyncHandler(async (req, res) => {
    const pageRaw = Number(req.query.page ?? 1);
    const page = Number.isFinite(pageRaw) ? Math.max(Math.floor(pageRaw), 1) : 1;
    const take = safeTake(req.query.take);
    const skip = (page - 1) * take;
    const where = { tenantId: req.user!.tenantId };

    const [items, total] = await Promise.all([
      delegate.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } })
        .catch(() => delegate.findMany({ where, take, skip })),
      delegate.count({ where }).catch(() => 0),
    ]);

    ok(res, { items, page, take, total }, `${permissionPrefix} list`);
  }));

  router.get('/:id', authRequired, requirePermission(permissions.view), asyncHandler(async (req, res) => {
    const item = await delegate.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!item) notFound();
    ok(res, item, `${permissionPrefix} detail`);
  }));

  router.post('/', authRequired, requirePermission(permissions.manage), asyncHandler(async (req, res) => {
    const input = sanitizeCreatePayload(req.body ?? {});
    const item = await delegate.create({
      data: {
        ...input,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.userId,
        updatedBy: req.user!.userId,
      },
    });
    created(res, item, `${permissionPrefix} created`);
  }));

  router.put('/:id', authRequired, requirePermission(permissions.manage), asyncHandler(async (req, res) => {
    // Ownership check before the repository's id-only update call closes the BOLA
    // path where a user could otherwise update another tenant's record by UUID.
    const existing = await delegate.findFirst({
      where: { id: req.params.id, tenantId: req.user!.tenantId },
    });
    if (!existing) notFound();

    const input = sanitizeUpdatePayload(req.body ?? {});
    const item = await delegate.update({
      where: { id: req.params.id },
      data: {
        ...input,
        tenantId: req.user!.tenantId,
        updatedBy: req.user!.userId,
      },
    });
    ok(res, item, `${permissionPrefix} updated`);
  }));

  return router;
}
