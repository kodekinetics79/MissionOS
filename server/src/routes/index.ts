import { Router } from 'express';
import auth from './auth.js';
import analyticsRoutes from './analytics.js';
import adminRoutes from './admin.js';
import assetRoutes from './assets.js';
import incidentRoutes from './incidents.js';
import preventionRoutes from './prevention.js';
import trainingRouter from './training.js';
import supportRoutes from './support.js';
import integrationRoutes from './integrations.js';
import aiRoutes from './ai.js';
import staffingRoutes from './staffing.js';
import workforceRoutes from './workforce.js';
import { crudRouter } from './crud.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, created } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import {
  getPagination,
  getPlatformSummary,
  getRbacMatrix,
  listTenants,
  getStationSummary,
  listUsers,
  listRoles,
  listPermissions,
  listStations,
  listExpiringPersonnelCertifications,
  listCertifications,
  listNotifications,
  markNotificationRead,
  listAuditLogs,
  getRmsSummary,
  listRmsRecords,
  listNerisQueue,
  listEpcrQueue,
  searchPlatform,
} from '../services/foundationService.js';
import {
  listPersonnel,
  getPersonnel360,
  getPersonnelTraining,
  getPersonnelIncidents,
  getPersonnelStaffing,
  getPersonnelPerformance,
  getPersonnelGoals,
  getPersonnelDocuments,
  getPersonnelReadiness,
  getPersonnelRisks,
  getPersonnelReadinessSummary,
  createPersonnel,
  updatePersonnel,
  createPersonnelPerformanceReview,
  createPersonnelGoal,
  updatePersonnelGoal,
  createPersonnelDocument,
} from '../services/personnelService.js';
import { listProperties as listPreventionProperties } from '../services/preventionService.js';
import { analyticsCommandService } from '../services/analyticsService.js';
import { prisma } from '../utils/prisma.js';

const router = Router();
const statusCode = (value: unknown) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();

router.get('/status', asyncHandler(async (_req, res) => ok(res, { status: 'healthy', service: 'missionos-api', utc: new Date().toISOString() }, 'Platform status')));
router.use('/auth', auth);
router.use('/', incidentRoutes);
router.use('/', analyticsRoutes);
router.use('/admin', adminRoutes);
router.use('/support', supportRoutes);
router.use('/staffing', staffingRoutes);
router.use('/workforce', workforceRoutes);

router.get('/tenants', authRequired, asyncHandler(async (_req, res) => {
  const items = await listTenants();
  ok(res, { items, page: 1, take: items.length, total: items.length }, 'Tenants');
}));

router.get('/platform/summary', authRequired, asyncHandler(async (req, res) => {
  ok(res, await getPlatformSummary(req.user!.tenantId), 'Platform summary');
}));

router.get('/users', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listUsers(req.user!.tenantId, page, take), 'Users');
}));
router.get('/roles', authRequired, asyncHandler(async (req, res) => {
  const roles = await listRoles(req.user!.tenantId);
  ok(res, { items: roles, page: 1, take: roles.length, total: roles.length }, 'Roles');
}));
router.get('/permissions', authRequired, asyncHandler(async (_req, res) => {
  const permissions = await listPermissions();
  ok(res, { items: permissions, page: 1, take: permissions.length, total: permissions.length }, 'Permissions');
}));
router.get('/rbac/matrix', authRequired, asyncHandler(async (req, res) => ok(res, await getRbacMatrix(req.user!.tenantId), 'RBAC matrix')));

router.get('/stations', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listStations(req.user!.tenantId, page, take), 'Stations');
}));
router.get('/stations/:id', authRequired, asyncHandler(async (req, res) => {
  const station = await prisma.station.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
  ok(res, station, 'Station detail');
}));
router.get('/stations/:id/summary', authRequired, asyncHandler(async (req, res) => ok(res, await getStationSummary(req.user!.tenantId, String(req.params.id)), 'Station summary')));

router.get('/personnel', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const readParam = (key: string) => {
    const value = req.query[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
  };
  ok(res, await listPersonnel(req.user!.tenantId, page, take, {
    search: readParam('search') ?? readParam('q'),
    stationId: readParam('stationId'),
    rankId: readParam('rankId'),
    shiftPlatoonId: readParam('shiftPlatoonId'),
    readinessStatus: readParam('readinessStatus'),
    employmentStatus: readParam('employmentStatus'),
    certificationStatus: readParam('certificationStatus'),
  }), 'Personnel');
}));
router.post('/personnel', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => {
  const createdPersonnel = await createPersonnel(req.user!.tenantId, req.user!.userId, req.body ?? {});
  created(res, createdPersonnel, 'Personnel created');
}));
// Static collection routes precede /personnel/:id so keywords cannot be captured as ids.
router.get('/personnel/risks', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelRisks(req.user!.tenantId), 'Personnel risks')));
router.get('/personnel/readiness-summary', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelReadinessSummary(req.user!.tenantId), 'Personnel readiness summary')));
router.get('/personnel/:id', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => {
  const personnel = await prisma.personnel.findFirst({ where: { id: req.params.id, tenantId: req.user!.tenantId } });
  ok(res, personnel, 'Personnel detail');
}));
router.put('/personnel/:id', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => {
  const updated = await updatePersonnel(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {});
  ok(res, updated, 'Personnel updated');
}));
router.get('/personnel/:id/360', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnel360(req.user!.tenantId, String(req.params.id)), 'Personnel 360')));
router.get('/personnel/:id/summary', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => {
  const bundle = await getPersonnel360(req.user!.tenantId, String(req.params.id));
  ok(res, bundle ? {
    personnel: bundle.personnel,
    assignments: bundle.assignmentHistory,
    certifications: bundle.certifications.active,
    documents: bundle.performance.documents,
    readinessScore: bundle.readiness.overallReadinessScore,
    incidentCount: bundle.incidents.participation.length,
    recentIncidentLinks: bundle.incidents.participation.slice(0, 5),
  } : null, 'Personnel summary');
}));
router.get('/personnel/:id/certifications', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, (await getPersonnel360(req.user!.tenantId, String(req.params.id)))?.certifications.active ?? [], 'Personnel certifications')));
router.get('/personnel/:id/training', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelTraining(req.user!.tenantId, String(req.params.id)), 'Personnel training')));
router.get('/personnel/:id/incidents', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelIncidents(req.user!.tenantId, String(req.params.id)), 'Personnel incidents')));
router.get('/personnel/:id/staffing', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelStaffing(req.user!.tenantId, String(req.params.id)), 'Personnel staffing')));
router.get('/personnel/:id/performance', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelPerformance(req.user!.tenantId, String(req.params.id)), 'Personnel performance')));
router.post('/personnel/:id/performance', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => created(res, await createPersonnelPerformanceReview(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Performance review created')));
router.get('/personnel/:id/goals', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelGoals(req.user!.tenantId, String(req.params.id)), 'Personnel goals')));
router.post('/personnel/:id/goals', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => created(res, await createPersonnelGoal(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Goal created')));
router.put('/personnel/:id/goals/:goalId', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => ok(res, await updatePersonnelGoal(req.user!.tenantId, String(req.params.id), String(req.params.goalId), req.user!.userId, req.body ?? {}), 'Goal updated')));
router.get('/personnel/:id/documents', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelDocuments(req.user!.tenantId, String(req.params.id)), 'Personnel documents')));
router.post('/personnel/:id/documents', authRequired, requirePermission('personnel.manage'), asyncHandler(async (req, res) => created(res, await createPersonnelDocument(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Document uploaded')));
router.get('/personnel/:id/readiness', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await getPersonnelReadiness(req.user!.tenantId, String(req.params.id)), 'Personnel readiness')));
router.get('/personnel-certifications/expiring', authRequired, requirePermission('personnel.view'), asyncHandler(async (req, res) => ok(res, await listExpiringPersonnelCertifications(req.user!.tenantId), 'Expiring certifications')));

router.get('/certifications', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listCertifications(req.user!.tenantId, page, take), 'Certifications');
}));

router.get('/properties', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listPreventionProperties(req.user!.tenantId, page, take, {
    stationId: typeof req.query.stationId === 'string' ? req.query.stationId : undefined,
    occupancyType: typeof req.query.occupancyType === 'string' ? req.query.occupancyType : undefined,
    riskLevel: typeof req.query.riskLevel === 'string' ? req.query.riskLevel : undefined,
    inspectionStatus: typeof req.query.inspectionStatus === 'string' ? req.query.inspectionStatus : undefined,
    permitStatus: typeof req.query.permitStatus === 'string' ? req.query.permitStatus : undefined,
    violationSeverity: typeof req.query.violationSeverity === 'string' ? req.query.violationSeverity : undefined,
    preplanStatus: typeof req.query.preplanStatus === 'string' ? req.query.preplanStatus : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : typeof req.query.q === 'string' ? req.query.q : undefined,
  }), 'Properties');
}));

router.get('/notifications', authRequired, asyncHandler(async (req, res) => {
  const notifications = await listNotifications(req.user!.tenantId, req.user!.userId);
  ok(res, { items: notifications, page: 1, take: notifications.length, total: notifications.length }, 'Notifications');
}));
router.post('/notifications/:id/read', authRequired, asyncHandler(async (req, res) => {
  await markNotificationRead(req.user!.tenantId, String(req.params.id), req.user!.userId);
  ok(res, true, 'Notification updated');
}));

router.get('/audit-logs', authRequired, requirePermission('admin.audit'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listAuditLogs(req.user!.tenantId, page, take), 'Audit logs');
}));

router.get('/rms/summary', authRequired, asyncHandler(async (req, res) => ok(res, await getRmsSummary(req.user!.tenantId), 'RMS summary')));
router.get('/rms/records', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listRmsRecords(req.user!.tenantId, page, take), 'RMS records');
}));
router.get('/rms/neris/queue', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listNerisQueue(req.user!.tenantId, page, take), 'NERIS queue');
}));
router.get('/rms/epcr/queue', authRequired, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listEpcrQueue(req.user!.tenantId, page, take), 'ePCR queue');
}));

router.get('/search', authRequired, asyncHandler(async (req, res) => {
  const query = String(req.query.q ?? '');
  ok(res, await searchPlatform(req.user!.tenantId, query), 'Search results');
}));

router.use('/training', trainingRouter);
router.use('/', preventionRoutes);
router.use('/', assetRoutes);

router.use('/courses', crudRouter('course' as any, 'courses'));
router.use('/training/assignments', crudRouter('trainingAssignment' as any, 'training assignments'));
router.use('/shifts', crudRouter('shift' as any, 'shifts'));
router.use('/staffing/assignments', crudRouter('shiftAssignment' as any, 'shift assignments'));
router.use('/inspections', crudRouter('inspection' as any, 'inspections'));
router.use('/permits', crudRouter('permit' as any, 'permits'));
router.use('/preplans', crudRouter('preplan' as any, 'preplans'));
router.use('/integrations', integrationRoutes);
router.use('/ai', aiRoutes);

router.get('/analytics/dashboard', authRequired, asyncHandler(async (req, res) => {
  const commandCenter = await analyticsCommandService.getAnalyticsCommandCenter(req.user!.tenantId);
  ok(res, {
    agencyReadiness: commandCenter.summary.agencyReadiness,
    stationCount: commandCenter.summary.stationCount,
    incidentCount: commandCenter.trends.incidentVolume.reduce((total: number, point: any) => total + Number(point.value ?? 0), 0),
    personnelCount: commandCenter.summary.personnelCount,
    apparatusWarnings: Math.max(0, Math.round(commandCenter.summary.apparatusCount * (100 - Number(commandCenter.summary.apparatusReadiness ?? 0)) / 100)),
    overdueInspections: commandCenter.summary.inspectionBacklog,
    openAiInsights: commandCenter.aiInsights.length,
  }, 'Dashboard analytics');
}));

export default router;
