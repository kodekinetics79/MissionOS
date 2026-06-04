import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import { staffingService } from '../services/staffingService.js';

const router = Router();
router.use(authRequired);

router.get('/command-center', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  ok(res, await staffingService.getCommandCenter(req.user!.tenantId), 'Staffing command center');
}));

router.get('/board', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getBoard(req.user!.tenantId, page, take, {
    stationId: typeof req.query.stationId === 'string' ? req.query.stationId : undefined,
    riskLevel: typeof req.query.riskLevel === 'string' ? req.query.riskLevel : undefined,
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : typeof req.query.q === 'string' ? req.query.q : undefined,
  }), 'Staffing board');
}));

router.get('/gaps', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getGaps(req.user!.tenantId, page, take), 'Staffing gaps');
}));

router.get('/recommendations', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getRecommendations(req.user!.tenantId, page, take), 'Staffing recommendations');
}));

router.get('/shift-fill', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getShiftFill(req.user!.tenantId, page, take), 'Staffing shift fill');
}));

router.get('/trades', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getTrades(req.user!.tenantId, page, take), 'Staffing trades');
}));

router.get('/overtime', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getOvertime(req.user!.tenantId, page, take), 'Staffing overtime');
}));

router.get('/callback-queue', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getCallbackQueue(req.user!.tenantId, page, take), 'Staffing callback queue');
}));

router.get('/roster', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const dayOffset = typeof req.query.dayOffset === 'string' ? Number(req.query.dayOffset) || 0 : 0;
  ok(res, await staffingService.getRoster(req.user!.tenantId, dayOffset), 'Staffing roster');
}));

router.get('/planner', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const days = typeof req.query.days === 'string' ? Number(req.query.days) || 5 : 5;
  ok(res, await staffingService.getPlanner(req.user!.tenantId, days), 'Staffing planner');
}));

router.get('/forecast', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const days = typeof req.query.days === 'string' ? Number(req.query.days) || 7 : 7;
  ok(res, await staffingService.getForecast(req.user!.tenantId, days), 'Staffing forecast');
}));

router.get('/kpis', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  ok(res, await staffingService.getKpis(req.user!.tenantId), 'Staffing KPIs');
}));

router.get('/appraisals', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getAppraisals(req.user!.tenantId, page, take), 'Staffing appraisals');
}));

router.get('/minimum-rules', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getMinimumRules(req.user!.tenantId, page, take), 'Staffing minimum rules');
}));

router.get('/audit-log', requirePermission('staffing.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await staffingService.getAuditLog(req.user!.tenantId, page, take), 'Staffing audit log');
}));

router.post('/recommendations/:id/action', requirePermission('staffing.manage'), asyncHandler(async (req, res) => {
  ok(res, await staffingService.actOnRecommendation(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Staffing recommendation action recorded');
}));

export default router;
