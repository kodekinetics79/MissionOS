import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import { escalationService, slaService, supportTicketService, systemStatusService } from '../services/adminService.js';
import { prisma } from '../utils/prisma.js';

const router = Router();
router.use(authRequired);

router.get('/tickets', requirePermission('support.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const filters = {
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
    module: typeof req.query.module === 'string' ? req.query.module : undefined,
  };
  ok(res, await supportTicketService.list(req.user!.tenantId, page, take, filters), 'Support tickets');
}));

router.post('/tickets', requirePermission('support.manage'), asyncHandler(async (req, res) => created(res, await supportTicketService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Support ticket created')));
router.get('/tickets/:id', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, await prisma.supportTicket.findFirst({ where: { tenantId: req.user!.tenantId, id: String(req.params.id) } }), 'Support ticket')));
router.put('/tickets/:id', requirePermission('support.manage'), asyncHandler(async (req, res) => ok(res, await supportTicketService.update(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Support ticket updated')));
router.post('/tickets/:id/assign', requirePermission('support.manage'), asyncHandler(async (req, res) => ok(res, await supportTicketService.assign(req.user!.tenantId, req.user!.userId, String(req.params.id), String(req.body?.assignedToUserId ?? req.user!.userId)), 'Support ticket assigned')));
router.post('/tickets/:id/resolve', requirePermission('support.manage'), asyncHandler(async (req, res) => ok(res, await supportTicketService.resolve(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Support ticket resolved')));

router.get('/sla-policies', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, { items: await slaService.list(req.user!.tenantId) }, 'SLA policies')));
router.put('/sla-policies/:id', requirePermission('support.sla.manage'), asyncHandler(async (req, res) => ok(res, await slaService.update(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'SLA policy updated')));

router.get('/escalation-paths', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, { items: await escalationService.list(req.user!.tenantId) }, 'Escalation paths')));
router.get('/system-status', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, { items: await systemStatusService.list(req.user!.tenantId) }, 'System status')));
router.post('/system-status', requirePermission('support.manage'), asyncHandler(async (req, res) => created(res, await systemStatusService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'System status event created')));

export default router;
