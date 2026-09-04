import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import {
  activatePreplan,
  addInspectionChecklistItem,
  approvePermit,
  closeInspection,
  completeCorrectiveAction,
  completeInspection,
  createCorrectiveAction,
  createHazard,
  createHydrant,
  createInspection,
  createOccupancy,
  createPermit,
  createPreplan,
  createProperty,
  createViolation,
  denyPermit,
  escalateViolation,
  getCorrectiveActions,
  getInspectionChecklist,
  getOverdueInspections,
  getPreventionCommandCenter,
  getPreventionReadinessImpact,
  getPreventionRisks,
  getProperty360,
  getPropertyInspections,
  getPropertyPermits,
  getPropertyPreplans,
  getPropertyRisk,
  getPropertyViolations,
  getStationPreventionRisk,
  getStationPreventionSummary,
  listCriticalHazards,
  listCriticalViolations,
  listExpiringPermits,
  listHazards,
  listHydrantIssues,
  listHydrants,
  listInspections,
  listOccupancies,
  listOpenViolations,
  listPermitBacklog,
  listPermits,
  listPreplans,
  listPreplansIncomplete,
  listPreplansReviewDue,
  listProperties,
  listStationPreventionSummary,
  listViolations,
  markPreplanReviewDue,
  requestPermitInfo,
  resolveViolation,
  startInspection,
  updateInspection,
  updateOccupancy,
  updatePermit,
  updatePreplan,
  updateProperty,
  updateViolation,
  reviewPermit,
  updateCorrectiveAction,
} from '../services/preventionService.js';

const router = Router();
const readFilter = (query: Record<string, unknown>, key: string) => {
  const value = query[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

router.get('/prevention/command-center', authRequired, requirePermission('prevention.view'), asyncHandler(async (req, res) => ok(res, await getPreventionCommandCenter(req.user!.tenantId), 'Prevention command center')));
router.get('/prevention/risks', authRequired, requirePermission('prevention.view'), asyncHandler(async (req, res) => ok(res, await getPreventionRisks(req.user!.tenantId), 'Prevention risks')));
router.get('/prevention/readiness-impact', authRequired, requirePermission('prevention.view'), asyncHandler(async (req, res) => ok(res, await getPreventionReadinessImpact(req.user!.tenantId), 'Prevention readiness impact')));

router.post('/properties', authRequired, requirePermission('properties.manage'), asyncHandler(async (req, res) => created(res, await createProperty(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Property created')));
router.get('/properties/:id', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getProperty360(req.user!.tenantId, String(req.params.id)), 'Property detail')));
router.put('/properties/:id', authRequired, requirePermission('properties.manage'), asyncHandler(async (req, res) => ok(res, await updateProperty(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Property updated')));
router.get('/properties/:id/360', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getProperty360(req.user!.tenantId, String(req.params.id)), 'Property 360')));
router.get('/properties/:id/inspections', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getPropertyInspections(req.user!.tenantId, String(req.params.id)), 'Property inspections')));
router.get('/properties/:id/permits', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getPropertyPermits(req.user!.tenantId, String(req.params.id)), 'Property permits')));
router.get('/properties/:id/preplans', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getPropertyPreplans(req.user!.tenantId, String(req.params.id)), 'Property preplans')));
router.get('/properties/:id/violations', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getPropertyViolations(req.user!.tenantId, String(req.params.id)), 'Property violations')));
router.get('/properties/:id/risk', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => ok(res, await getPropertyRisk(req.user!.tenantId, String(req.params.id)), 'Property risk')));

router.post('/occupancies', authRequired, requirePermission('properties.manage'), asyncHandler(async (req, res) => created(res, await createOccupancy(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Occupancy created')));
router.get('/occupancies', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listOccupancies(req.user!.tenantId, page, take), 'Occupancies');
}));
router.get('/occupancies/:id', authRequired, requirePermission('properties.view'), asyncHandler(async (req, res) => {
  const items = await listOccupancies(req.user!.tenantId, 1, 500);
  ok(res, items.items.find((item: any) => item.id === req.params.id) ?? null, 'Occupancy detail');
}));
router.put('/occupancies/:id', authRequired, requirePermission('properties.manage'), asyncHandler(async (req, res) => ok(res, await updateOccupancy(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Occupancy updated')));

router.get('/inspections', authRequired, requirePermission('inspections.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listInspections(req.user!.tenantId, page, take, {
    stationId: readFilter(req.query as Record<string, unknown>, 'stationId'),
    inspectionStatus: readFilter(req.query as Record<string, unknown>, 'status'),
    riskLevel: readFilter(req.query as Record<string, unknown>, 'riskLevel'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  }), 'Inspections');
}));
router.post('/inspections', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => created(res, await createInspection(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Inspection created')));
// Static collection routes MUST precede /:id or Express will treat the keyword as an id.
router.get('/inspections/prioritized', authRequired, requirePermission('inspections.view'), asyncHandler(async (req, res) => ok(res, await listInspections(req.user!.tenantId, 1, 500, {}), 'Prioritized inspections')));
router.get('/inspections/overdue', authRequired, requirePermission('inspections.view'), asyncHandler(async (req, res) => ok(res, await getOverdueInspections(req.user!.tenantId), 'Overdue inspections')));
router.get('/inspections/:id', authRequired, requirePermission('inspections.view'), asyncHandler(async (req, res) => {
  const items = await listInspections(req.user!.tenantId, 1, 500, {});
  ok(res, items.items.find((item: any) => item.id === req.params.id) ?? null, 'Inspection detail');
}));
router.put('/inspections/:id', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => ok(res, await updateInspection(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Inspection updated')));
router.post('/inspections/:id/start', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => ok(res, await startInspection(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Inspection started')));
router.post('/inspections/:id/complete', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => ok(res, await completeInspection(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Inspection completed')));
router.post('/inspections/:id/close', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => ok(res, await closeInspection(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Inspection closed')));
router.get('/inspections/:id/checklist', authRequired, requirePermission('inspections.view'), asyncHandler(async (req, res) => ok(res, await getInspectionChecklist(req.user!.tenantId, String(req.params.id)), 'Inspection checklist')));
router.post('/inspections/:id/checklist', authRequired, requirePermission('inspections.manage'), asyncHandler(async (req, res) => created(res, await addInspectionChecklistItem(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Checklist item created')));

router.get('/violations', authRequired, requirePermission('violations.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listViolations(req.user!.tenantId, page, take, {
    violationSeverity: readFilter(req.query as Record<string, unknown>, 'severity'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  }), 'Violations');
}));
router.post('/violations', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => created(res, await createViolation(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Violation created')));
router.get('/violations/open', authRequired, requirePermission('violations.view'), asyncHandler(async (req, res) => ok(res, await listOpenViolations(req.user!.tenantId), 'Open violations')));
router.get('/violations/critical', authRequired, requirePermission('violations.view'), asyncHandler(async (req, res) => ok(res, await listCriticalViolations(req.user!.tenantId), 'Critical violations')));
router.get('/violations/:id', authRequired, requirePermission('violations.view'), asyncHandler(async (req, res) => {
  const items = await listViolations(req.user!.tenantId, 1, 500, {});
  ok(res, items.items.find((item: any) => item.id === req.params.id) ?? null, 'Violation detail');
}));
router.put('/violations/:id', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => ok(res, await updateViolation(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Violation updated')));
router.post('/violations/:id/resolve', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => ok(res, await resolveViolation(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Violation resolved')));
router.post('/violations/:id/escalate', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => ok(res, await escalateViolation(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Violation escalated')));

router.get('/corrective-actions', authRequired, requirePermission('violations.view'), asyncHandler(async (req, res) => ok(res, await getCorrectiveActions(req.user!.tenantId), 'Corrective actions')));
router.post('/corrective-actions', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => created(res, await createCorrectiveAction(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Corrective action created')));
router.put('/corrective-actions/:id', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => ok(res, await updateCorrectiveAction(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Corrective action updated')));
router.post('/corrective-actions/:id/complete', authRequired, requirePermission('violations.manage'), asyncHandler(async (req, res) => ok(res, await completeCorrectiveAction(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Corrective action completed')));

router.get('/permits', authRequired, requirePermission('permits.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listPermits(req.user!.tenantId, page, take, {
    permitStatus: readFilter(req.query as Record<string, unknown>, 'status'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  }), 'Permits');
}));
router.post('/permits', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => created(res, await createPermit(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Permit created')));
router.get('/permits/backlog', authRequired, requirePermission('permits.view'), asyncHandler(async (req, res) => ok(res, await listPermitBacklog(req.user!.tenantId), 'Permit backlog')));
router.get('/permits/expiring', authRequired, requirePermission('permits.view'), asyncHandler(async (req, res) => ok(res, await listExpiringPermits(req.user!.tenantId), 'Expiring permits')));
router.get('/permits/:id', authRequired, requirePermission('permits.view'), asyncHandler(async (req, res) => {
  const items = await listPermits(req.user!.tenantId, 1, 500, {});
  ok(res, items.items.find((item: any) => item.id === req.params.id) ?? null, 'Permit detail');
}));
router.put('/permits/:id', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => ok(res, await updatePermit(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Permit updated')));
router.post('/permits/:id/review', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => ok(res, await reviewPermit(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Permit review logged')));
router.post('/permits/:id/approve', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => ok(res, await approvePermit(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Permit approved')));
router.post('/permits/:id/deny', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => ok(res, await denyPermit(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Permit denied')));
router.post('/permits/:id/request-info', authRequired, requirePermission('permits.manage'), asyncHandler(async (req, res) => ok(res, await requestPermitInfo(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Permit info requested')));

router.get('/preplans', authRequired, requirePermission('preplans.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listPreplans(req.user!.tenantId, page, take, {
    preplanStatus: readFilter(req.query as Record<string, unknown>, 'status'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  }), 'Preplans');
}));
router.post('/preplans', authRequired, requirePermission('preplans.manage'), asyncHandler(async (req, res) => created(res, await createPreplan(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Preplan created')));
router.get('/preplans/review-due', authRequired, requirePermission('preplans.view'), asyncHandler(async (req, res) => ok(res, await listPreplansReviewDue(req.user!.tenantId), 'Preplans review due')));
router.get('/preplans/incomplete', authRequired, requirePermission('preplans.view'), asyncHandler(async (req, res) => ok(res, await listPreplansIncomplete(req.user!.tenantId), 'Incomplete preplans')));
router.get('/preplans/:id', authRequired, requirePermission('preplans.view'), asyncHandler(async (req, res) => {
  const items = await listPreplans(req.user!.tenantId, 1, 500, {});
  ok(res, items.items.find((item: any) => item.id === req.params.id) ?? null, 'Preplan detail');
}));
router.put('/preplans/:id', authRequired, requirePermission('preplans.manage'), asyncHandler(async (req, res) => ok(res, await updatePreplan(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Preplan updated')));
router.post('/preplans/:id/activate', authRequired, requirePermission('preplans.manage'), asyncHandler(async (req, res) => ok(res, await activatePreplan(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Preplan activated')));
router.post('/preplans/:id/mark-review-due', authRequired, requirePermission('preplans.manage'), asyncHandler(async (req, res) => ok(res, await markPreplanReviewDue(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Preplan marked review due')));

router.get('/hydrants', authRequired, requirePermission('hydrants.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listHydrants(req.user!.tenantId, page, take), 'Hydrants');
}));
router.post('/hydrants', authRequired, requirePermission('hydrants.manage'), asyncHandler(async (req, res) => created(res, await createHydrant(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Hydrant created')));
router.get('/hydrants/issues', authRequired, requirePermission('hydrants.view'), asyncHandler(async (req, res) => ok(res, await listHydrantIssues(req.user!.tenantId), 'Hydrant issues')));

router.get('/hazards', authRequired, requirePermission('hazards.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listHazards(req.user!.tenantId, page, take), 'Hazards');
}));
router.post('/hazards', authRequired, requirePermission('hazards.manage'), asyncHandler(async (req, res) => created(res, await createHazard(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Hazard created')));
router.get('/hazards/critical', authRequired, requirePermission('hazards.view'), asyncHandler(async (req, res) => ok(res, await listCriticalHazards(req.user!.tenantId), 'Critical hazards')));

router.get('/stations/:id/prevention', authRequired, requirePermission('stations.view'), asyncHandler(async (req, res) => ok(res, await getStationPreventionSummary(req.user!.tenantId, String(req.params.id)), 'Station prevention summary')));
router.get('/stations/:id/prevention-risk', authRequired, requirePermission('stations.view'), asyncHandler(async (req, res) => ok(res, await getStationPreventionRisk(req.user!.tenantId, String(req.params.id)), 'Station prevention risk')));

export default router;
