"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const analyticsService_js_1 = require("../services/analyticsService.js");
const foundationService_js_1 = require("../services/foundationService.js");
const router = (0, express_1.Router)();
const readAccess = (0, auth_js_1.requirePermission)('analytics.view');
const writeAccess = (0, auth_js_1.requirePermission)('analytics.manage');
const exportAccess = (0, auth_js_1.requirePermission)('analytics.export');
const reportAccess = (0, auth_js_1.requirePermission)('reports.view');
const reportWriteAccess = (0, auth_js_1.requirePermission)('reports.create');
const dataQualityAccess = (0, auth_js_1.requirePermission)('dataquality.view');
const dataQualityWriteAccess = (0, auth_js_1.requirePermission)('dataquality.manage');
const duplicatesAccess = (0, auth_js_1.requirePermission)('duplicates.view');
const duplicatesWriteAccess = (0, auth_js_1.requirePermission)('duplicates.manage');
const parseFilters = (query) => ({
    dateRange: typeof query.dateRange === 'string' ? query.dateRange : undefined,
    stationId: typeof query.stationId === 'string' ? query.stationId : undefined,
    battalionId: typeof query.battalionId === 'string' ? query.battalionId : undefined,
    shiftPlatoonId: typeof query.shiftPlatoonId === 'string' ? query.shiftPlatoonId : undefined,
    module: typeof query.module === 'string' ? query.module : undefined,
    riskLevel: typeof query.riskLevel === 'string' ? query.riskLevel : undefined,
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : undefined,
});
router.get('/analytics/command-center', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getAnalyticsCommandCenter(req.user.tenantId), 'Analytics command center');
}));
router.get('/analytics/executive-summary', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getExecutiveSummary(req.user.tenantId), 'Executive summary');
}));
router.get('/analytics/readiness', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getReadinessAnalytics(req.user.tenantId), 'Readiness analytics');
}));
router.get('/analytics/trends', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getTrendAnalytics(req.user.tenantId), 'Trend analytics');
}));
router.get('/analytics/station-comparison', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getStationComparison(req.user.tenantId, { page, take, sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined }), 'Station comparison');
}));
router.get('/analytics/widgets', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getAnalyticsWidgets)(req.user.tenantId), 'Analytics widgets');
}));
router.get('/analytics/widgets/:code', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getAnalyticsWidget)(req.user.tenantId, String(req.params.code)), 'Analytics widget');
}));
router.get('/reports/definitions', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportDefinitionService.listReportDefinitions(req.user.tenantId, page, take), 'Report definitions');
}));
router.get('/reports/definitions/:id', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportDefinitionService.getReportDefinition(req.user.tenantId, String(req.params.id)), 'Report definition');
}));
router.get('/reports/saved', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.savedReportService.listSavedReports(req.user.tenantId, page, take), 'Saved reports');
}));
router.post('/reports/saved', auth_js_1.authRequired, reportWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await analyticsService_js_1.savedReportService.createSavedReport(req.user.tenantId, req.user.userId, req.body ?? {}), 'Saved report created');
}));
router.get('/reports/saved/:id', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.savedReportService.getSavedReport(req.user.tenantId, String(req.params.id)), 'Saved report');
}));
router.put('/reports/saved/:id', auth_js_1.authRequired, reportWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.savedReportService.updateSavedReport(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Saved report updated');
}));
router.delete('/reports/saved/:id', auth_js_1.authRequired, reportWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.savedReportService.deleteSavedReport(req.user.tenantId, String(req.params.id), req.user.userId), 'Saved report archived');
}));
router.post('/reports/preview', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportBuilderService.previewReport(req.user.tenantId, req.body ?? {}), 'Report preview');
}));
router.post('/reports/export', auth_js_1.authRequired, exportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await analyticsService_js_1.reportExportService.exportReport(req.user.tenantId, req.user.userId, req.body ?? {}), 'Report export queued');
}));
router.get('/reports/exports', auth_js_1.authRequired, exportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportExportService.listExports(req.user.tenantId, page, take), 'Report exports');
}));
router.get('/reports/exports/:id', auth_js_1.authRequired, exportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportExportService.getExport(req.user.tenantId, String(req.params.id)), 'Report export');
}));
router.get('/reports/schedules', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.reportScheduleService.listSchedules(req.user.tenantId, page, take), 'Report schedules');
}));
router.post('/reports/schedules', auth_js_1.authRequired, reportWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.created)(res, await analyticsService_js_1.reportScheduleService.createSchedule(req.user.tenantId, req.user.userId, req.body ?? {}), 'Report schedule created');
}));
router.post('/reports/schedules/:id/run', auth_js_1.authRequired, reportWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const result = await analyticsService_js_1.reportScheduleService.runScheduleNow(req.user.tenantId, String(req.params.id), req.user.userId);
    (0, apiResponse_js_1.ok)(res, result, 'Report schedule run');
}));
router.get('/data-quality/summary', auth_js_1.authRequired, dataQualityAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.dataQualityService.getDataQualitySummary(req.user.tenantId), 'Data quality summary');
}));
router.get('/data-quality/checks', auth_js_1.authRequired, dataQualityAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.dataQualityService.listDataQualityChecks(req.user.tenantId, page, take), 'Data quality checks');
}));
router.post('/data-quality/checks/run', auth_js_1.authRequired, dataQualityWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.dataQualityService.runDataQualityChecks(req.user.tenantId, req.user.userId), 'Data quality checks run');
}));
router.get('/data-quality/issues', auth_js_1.authRequired, dataQualityAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.dataQualityService.listDataQualityIssues(req.user.tenantId, page, take), 'Data quality issues');
}));
router.post('/data-quality/issues/:id/resolve', auth_js_1.authRequired, dataQualityWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.dataQualityService.resolveDataQualityIssue(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Data quality issue resolved');
}));
router.get('/duplicates', auth_js_1.authRequired, duplicatesAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.duplicateDetectionService.listDuplicateCandidates(req.user.tenantId, page, take), 'Duplicate candidates');
}));
router.get('/duplicates/:id', auth_js_1.authRequired, duplicatesAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.duplicateDetectionService.getDuplicateCandidate(req.user.tenantId, String(req.params.id)), 'Duplicate candidate');
}));
router.post('/duplicates/:id/mark-duplicate', auth_js_1.authRequired, duplicatesWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.duplicateDetectionService.markDuplicateCandidate(req.user.tenantId, String(req.params.id), req.user.userId), 'Duplicate marked');
}));
router.post('/duplicates/:id/dismiss', auth_js_1.authRequired, duplicatesWriteAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.duplicateDetectionService.dismissDuplicateCandidate(req.user.tenantId, String(req.params.id), req.user.userId), 'Duplicate dismissed');
}));
router.get('/analytics/incidents', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'incidents'), 'Incident analytics');
}));
router.get('/analytics/training', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'training'), 'Training analytics');
}));
router.get('/analytics/staffing', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'staffing'), 'Staffing analytics');
}));
router.get('/analytics/personnel', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'personnel'), 'Personnel analytics');
}));
router.get('/analytics/assets', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'assets'), 'Asset analytics');
}));
router.get('/analytics/prevention', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'prevention'), 'Prevention analytics');
}));
router.get('/analytics/integrations', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, analyticsService_js_1.getModuleAnalytics)(req.user.tenantId, 'integrations'), 'Integration analytics');
}));
router.get('/analytics/readiness-summary', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsCommandService.getReadinessAnalytics(req.user.tenantId), 'Readiness summary');
}));
router.get('/reports/preview/:id', auth_js_1.authRequired, reportAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const report = await analyticsService_js_1.savedReportService.getSavedReport(req.user.tenantId, String(req.params.id));
    (0, apiResponse_js_1.ok)(res, report ? await analyticsService_js_1.reportBuilderService.previewReport(req.user.tenantId, report) : null, 'Saved report preview');
}));
router.get('/analytics/snapshots', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await analyticsService_js_1.analyticsSnapshotService.listAnalyticsSnapshots(req.user.tenantId, page, take), 'Analytics snapshots');
}));
router.get('/analytics/filters', auth_js_1.authRequired, readAccess, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, {
        stations: true,
        battalions: true,
        shiftPlatoons: true,
        modules: ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'],
        riskLevels: ['Low', 'Watch', 'At Risk', 'Critical'],
    }, 'Analytics filters');
}));
exports.default = router;
