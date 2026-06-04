import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired } from '../middleware/auth.js';

type DelegateName = keyof typeof prisma;
const safeTake = (value: unknown) => Math.min(Number(value || 50), 100);

export function crudRouter(delegateName: DelegateName, permissionPrefix: string) {
  const router = Router();
  router.use(authRequired);
  const delegate = (prisma as any)[delegateName];
  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(Number(req.query.page || 1), 1);
    const take = safeTake(req.query.take);
    const skip = (page - 1) * take;
    const where: any = req.user?.tenantId ? { tenantId: req.user.tenantId } : {};
    const [items, total] = await Promise.all([delegate.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }).catch(() => delegate.findMany({ where, take, skip })), delegate.count({ where }).catch(() => 0)]);
    ok(res, { items, page, take, total }, `${permissionPrefix} list`);
  }));
  router.get('/:id', asyncHandler(async (req, res) => {
    const where: any = { id: req.params.id };
    const item = await delegate.findFirst({ where: { ...where, tenantId: req.user?.tenantId } }).catch(() => delegate.findUnique({ where }));
    ok(res, item, `${permissionPrefix} detail`);
  }));
  router.post('/', asyncHandler(async (req, res) => {
    const data = { ...req.body, tenantId: req.user?.tenantId };
    const item = await delegate.create({ data });
    created(res, item, `${permissionPrefix} created`);
  }));
  router.put('/:id', asyncHandler(async (req, res) => {
    const item = await delegate.update({ where: { id: req.params.id }, data: req.body });
    ok(res, item, `${permissionPrefix} updated`);
  }));
  return router;
}
