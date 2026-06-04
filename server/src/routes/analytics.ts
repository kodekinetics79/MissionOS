import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import {
  analyticsCommandService,
  analyticsSnapshotService,
  dataQualityService,
  duplicateDetectionService,
  reportBuilderService,
  reportDefinitionService,
  reportExportService,
  reportScheduleService,
  savedReportService,
  getAnalyticsWidgets,
  getAnalyticsWidget,
  getModuleAnalytics,
} from '../services/analyticsService.js';
import { getPagination } from '../services/foundationService.js';

const router = Router();

const readAccess = requirePermission('analytics.view');
const writeAccess = requirePermission('analytics.manage');
const exportAccess = requirePermission('analytics.export');
const reportAccess = requirePermission('reports.view');
const reportWriteAccess = requirePermission('reports.create');
const dataQualityAccess = requirePermission('dataquality.view');
const dataQualityWriteAccess = requirePermission('dataquality.manage');
const duplicatesAccess = requirePermission('duplicates.view');
const duplicatesWriteAccess = requirePermission('duplicates.manage');

const parseFilters = (query: Record<string, unknown>) => ({
  dateRange: typeof query.dateRange === 'string' ? query.dateRange : undefined,
  stationId: typeof query.stationId === 'string' ? query.stationId : undefined,
  battalionId: typeof query.battalionId === 'string' ? query.battalionId : undefined,
  shiftPlatoonId: typeof query.shiftPlatoonId === 'string' ? query.shiftPlatoonId : undefined,
  module: typeof query.module === 'string' ? query.module : undefined,
  riskLevel: typeof query.riskLevel === 'string' ? query.riskLevel : undefined,
  sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
});

router.get('/analytics/command-center', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await analyticsCommandService.getAnalyticsCommandCenter(req.user!.tenantId), 'Analytics command center');
}));

router.get('/analytics/executive-summary', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await analyticsCommandService.getExecutiveSummary(req.user!.tenantId), 'Executive summary');
}));

router.get('/analytics/readiness', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await analyticsCommandService.getReadinessAnalytics(req.user!.tenantId), 'Readiness analytics');
}));

router.get('/analytics/trends', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await analyticsCommandService.getTrendAnalytics(req.user!.tenantId), 'Trend analytics');
}));

router.get('/analytics/station-comparison', authRequired, readAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await analyticsCommandService.getStationComparison(req.user!.tenantId, { page, take, sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined }), 'Station comparison');
}));

router.get('/analytics/widgets', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getAnalyticsWidgets(req.user!.tenantId), 'Analytics widgets');
}));

router.get('/analytics/widgets/:code', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getAnalyticsWidget(req.user!.tenantId, String(req.params.code)), 'Analytics widget');
}));

router.get('/reports/definitions', authRequired, reportAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await reportDefinitionService.listReportDefinitions(req.user!.tenantId, page, take), 'Report definitions');
}));

router.get('/reports/definitions/:id', authRequired, reportAccess, asyncHandler(async (req, res) => {
  ok(res, await reportDefinitionService.getReportDefinition(req.user!.tenantId, String(req.params.id)), 'Report definition');
}));

router.get('/reports/saved', authRequired, reportAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await savedReportService.listSavedReports(req.user!.tenantId, page, take), 'Saved reports');
}));

router.post('/reports/saved', authRequired, reportWriteAccess, asyncHandler(async (req, res) => {
  created(res, await savedReportService.createSavedReport(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Saved report created');
}));

router.get('/reports/saved/:id', authRequired, reportAccess, asyncHandler(async (req, res) => {
  ok(res, await savedReportService.getSavedReport(req.user!.tenantId, String(req.params.id)), 'Saved report');
}));

router.put('/reports/saved/:id', authRequired, reportWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await savedReportService.updateSavedReport(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Saved report updated');
}));

router.delete('/reports/saved/:id', authRequired, reportWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await savedReportService.deleteSavedReport(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Saved report archived');
}));

router.post('/reports/preview', authRequired, reportAccess, asyncHandler(async (req, res) => {
  ok(res, await reportBuilderService.previewReport(req.user!.tenantId, req.body ?? {}), 'Report preview');
}));

router.post('/reports/export', authRequired, exportAccess, asyncHandler(async (req, res) => {
  created(res, await reportExportService.exportReport(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Report export queued');
}));

router.get('/reports/exports', authRequired, exportAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await reportExportService.listExports(req.user!.tenantId, page, take), 'Report exports');
}));

router.get('/reports/exports/:id', authRequired, exportAccess, asyncHandler(async (req, res) => {
  ok(res, await reportExportService.getExport(req.user!.tenantId, String(req.params.id)), 'Report export');
}));

router.get('/reports/schedules', authRequired, reportAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await reportScheduleService.listSchedules(req.user!.tenantId, page, take), 'Report schedules');
}));

router.post('/reports/schedules', authRequired, reportWriteAccess, asyncHandler(async (req, res) => {
  created(res, await reportScheduleService.createSchedule(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Report schedule created');
}));

router.post('/reports/schedules/:id/run', authRequired, reportWriteAccess, asyncHandler(async (req, res) => {
  const result = await reportScheduleService.runScheduleNow(req.user!.tenantId, String(req.params.id), req.user!.userId);
  ok(res, result, 'Report schedule run');
}));

router.get('/data-quality/summary', authRequired, dataQualityAccess, asyncHandler(async (req, res) => {
  ok(res, await dataQualityService.getDataQualitySummary(req.user!.tenantId), 'Data quality summary');
}));

router.get('/data-quality/checks', authRequired, dataQualityAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await dataQualityService.listDataQualityChecks(req.user!.tenantId, page, take), 'Data quality checks');
}));

router.post('/data-quality/checks/run', authRequired, dataQualityWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await dataQualityService.runDataQualityChecks(req.user!.tenantId, req.user!.userId), 'Data quality checks run');
}));

router.get('/data-quality/issues', authRequired, dataQualityAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await dataQualityService.listDataQualityIssues(req.user!.tenantId, page, take), 'Data quality issues');
}));

router.post('/data-quality/issues/:id/resolve', authRequired, dataQualityWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await dataQualityService.resolveDataQualityIssue(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Data quality issue resolved');
}));

router.get('/duplicates', authRequired, duplicatesAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await duplicateDetectionService.listDuplicateCandidates(req.user!.tenantId, page, take), 'Duplicate candidates');
}));

router.get('/duplicates/:id', authRequired, duplicatesAccess, asyncHandler(async (req, res) => {
  ok(res, await duplicateDetectionService.getDuplicateCandidate(req.user!.tenantId, String(req.params.id)), 'Duplicate candidate');
}));

router.post('/duplicates/:id/mark-duplicate', authRequired, duplicatesWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await duplicateDetectionService.markDuplicateCandidate(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Duplicate marked');
}));

router.post('/duplicates/:id/dismiss', authRequired, duplicatesWriteAccess, asyncHandler(async (req, res) => {
  ok(res, await duplicateDetectionService.dismissDuplicateCandidate(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Duplicate dismissed');
}));

router.get('/analytics/incidents', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'incidents'), 'Incident analytics');
}));

router.get('/analytics/training', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'training'), 'Training analytics');
}));

router.get('/analytics/staffing', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'staffing'), 'Staffing analytics');
}));

router.get('/analytics/personnel', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'personnel'), 'Personnel analytics');
}));

router.get('/analytics/assets', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'assets'), 'Asset analytics');
}));

router.get('/analytics/prevention', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'prevention'), 'Prevention analytics');
}));

router.get('/analytics/integrations', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await getModuleAnalytics(req.user!.tenantId, 'integrations'), 'Integration analytics');
}));

router.get('/analytics/readiness-summary', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, await analyticsCommandService.getReadinessAnalytics(req.user!.tenantId), 'Readiness summary');
}));

router.get('/reports/preview/:id', authRequired, reportAccess, asyncHandler(async (req, res) => {
  const report = await savedReportService.getSavedReport(req.user!.tenantId, String(req.params.id));
  ok(res, report ? await reportBuilderService.previewReport(req.user!.tenantId, report) : null, 'Saved report preview');
}));

router.get('/analytics/snapshots', authRequired, readAccess, asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await analyticsSnapshotService.listAnalyticsSnapshots(req.user!.tenantId, page, take), 'Analytics snapshots');
}));

router.get('/analytics/filters', authRequired, readAccess, asyncHandler(async (req, res) => {
  ok(res, {
    stations: true,
    battalions: true,
    shiftPlatoons: true,
    modules: ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'],
    riskLevels: ['Low', 'Watch', 'At Risk', 'Critical'],
  }, 'Analytics filters');
}));

export default router;
