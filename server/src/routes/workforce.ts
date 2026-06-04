import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { workforceService } from '../services/workforceService.js';

const router = Router();
router.use(authRequired);

const view = requirePermission('staffing.view');
const manage = requirePermission('staffing.manage');

router.get('/overview', view, asyncHandler(async (req, res) => ok(res, await workforceService.getOverview(req.user!.tenantId), 'Workforce overview')));
router.get('/kpis', view, asyncHandler(async (req, res) => ok(res, await workforceService.getKpis(req.user!.tenantId), 'Workforce KPIs')));
router.post('/kpis', manage, asyncHandler(async (req, res) => created(res, await workforceService.createKpi(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'KPI created')));
router.get('/kpi-categories', view, asyncHandler(async (_req, res) => ok(res, await workforceService.getKpiCategories(), 'KPI categories')));
router.get('/scorecards/department', view, asyncHandler(async (_req, res) => ok(res, await workforceService.getDepartmentScorecard(), 'Department scorecard')));
router.get('/scorecards/stations', view, asyncHandler(async (req, res) => ok(res, await workforceService.getStationScorecards(req.user!.tenantId), 'Station scorecards')));
router.get('/scorecards/platoons', view, asyncHandler(async (req, res) => ok(res, await workforceService.getPlatoonScorecards(req.user!.tenantId), 'Platoon scorecards')));
router.get('/scorecards/personnel', view, asyncHandler(async (req, res) => ok(res, await workforceService.getPersonnelScorecards(req.user!.tenantId), 'Personnel scorecards')));
router.get('/training-needs', view, asyncHandler(async (req, res) => ok(res, await workforceService.getTrainingNeeds(req.user!.tenantId), 'Training needs')));
router.get('/improvement', view, asyncHandler(async (req, res) => ok(res, await workforceService.getImprovement(req.user!.tenantId), 'Improvement tracking')));
router.get('/appraisals', view, asyncHandler(async (req, res) => ok(res, await workforceService.getAppraisals(req.user!.tenantId), 'Appraisals')));
router.get('/escalations', view, asyncHandler(async (req, res) => ok(res, await workforceService.getEscalations(req.user!.tenantId), 'Escalations')));
router.get('/forecast', view, asyncHandler(async (req, res) => {
  const days = typeof req.query.days === 'string' ? Number(req.query.days) || 7 : 7;
  ok(res, await workforceService.getForecast(req.user!.tenantId, days), 'Workforce forecast');
}));
router.get('/requisitions', view, asyncHandler(async (req, res) => ok(res, await workforceService.getRequisitions(req.user!.tenantId), 'Requisitions')));
router.get('/reports', view, asyncHandler(async (req, res) => ok(res, await workforceService.getReports(req.user!.tenantId), 'Workforce reports')));

router.post('/requisitions', manage, asyncHandler(async (req, res) => created(res, await workforceService.createRequisition(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Requisition created')));
router.post('/:kind/:id/action', manage, asyncHandler(async (req, res) => ok(res, await workforceService.actOnItem(req.user!.tenantId, req.user!.userId, String(req.params.kind), String(req.params.id), String((req.body ?? {}).action ?? 'Reviewed')), 'Workforce action recorded')));

export default router;
