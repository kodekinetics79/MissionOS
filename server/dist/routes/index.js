"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_js_1 = __importDefault(require("./auth.js"));
const analytics_js_1 = __importDefault(require("./analytics.js"));
const admin_js_1 = __importDefault(require("./admin.js"));
const assets_js_1 = __importDefault(require("./assets.js"));
const incidents_js_1 = __importDefault(require("./incidents.js"));
const prevention_js_1 = __importDefault(require("./prevention.js"));
const training_js_1 = __importDefault(require("./training.js"));
const support_js_1 = __importDefault(require("./support.js"));
const integrations_js_1 = __importDefault(require("./integrations.js"));
const ai_js_1 = __importDefault(require("./ai.js"));
const staffing_js_1 = __importDefault(require("./staffing.js"));
const workforce_js_1 = __importDefault(require("./workforce.js"));
const crud_js_1 = require("./crud.js");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_2 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const personnelService_js_1 = require("../services/personnelService.js");
const preventionService_js_1 = require("../services/preventionService.js");
const analyticsService_js_1 = require("../services/analyticsService.js");
const prisma_js_1 = require("../utils/prisma.js");
const router = (0, express_1.Router)();
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
router.get('/status', (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => (0, apiResponse_js_1.ok)(res, { status: 'healthy', service: 'missionos-api', utc: new Date().toISOString() }, 'Platform status')));
router.use('/auth', auth_js_1.default);
router.use('/', incidents_js_1.default);
router.use('/', analytics_js_1.default);
router.use('/admin', admin_js_1.default);
router.use('/support', support_js_1.default);
router.use('/staffing', staffing_js_1.default);
router.use('/workforce', workforce_js_1.default);
router.get('/tenants', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => {
    const items = await (0, foundationService_js_1.listTenants)();
    (0, apiResponse_js_1.ok)(res, { items, page: 1, take: items.length, total: items.length }, 'Tenants');
}));
router.get('/platform/summary', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.getPlatformSummary)(req.user.tenantId), 'Platform summary');
}));
router.get('/users', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listUsers)(req.user.tenantId, page, take), 'Users');
}));
router.get('/roles', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const roles = await (0, foundationService_js_1.listRoles)(req.user.tenantId);
    (0, apiResponse_js_1.ok)(res, { items: roles, page: 1, take: roles.length, total: roles.length }, 'Roles');
}));
router.get('/permissions', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => {
    const permissions = await (0, foundationService_js_1.listPermissions)();
    (0, apiResponse_js_1.ok)(res, { items: permissions, page: 1, take: permissions.length, total: permissions.length }, 'Permissions');
}));
router.get('/rbac/matrix', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.getRbacMatrix)(req.user.tenantId), 'RBAC matrix')));
router.get('/stations', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listStations)(req.user.tenantId, page, take), 'Stations');
}));
router.get('/stations/:id', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const station = await prisma_js_1.prisma.station.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    (0, apiResponse_js_1.ok)(res, station, 'Station detail');
}));
router.get('/stations/:id/summary', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.getStationSummary)(req.user.tenantId, String(req.params.id)), 'Station summary')));
router.get('/personnel', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const readParam = (key) => {
        const value = req.query[key];
        return typeof value === 'string' && value.trim() ? value : undefined;
    };
    (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.listPersonnel)(req.user.tenantId, page, take, {
        search: readParam('search') ?? readParam('q'),
        stationId: readParam('stationId'),
        rankId: readParam('rankId'),
        shiftPlatoonId: readParam('shiftPlatoonId'),
        readinessStatus: readParam('readinessStatus'),
        employmentStatus: readParam('employmentStatus'),
        certificationStatus: readParam('certificationStatus'),
    }), 'Personnel');
}));
router.post('/personnel', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const createdPersonnel = await (0, personnelService_js_1.createPersonnel)(req.user.tenantId, req.user.userId, req.body ?? {});
    (0, apiResponse_js_1.created)(res, createdPersonnel, 'Personnel created');
}));
router.get('/personnel/:id', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const personnel = await prisma_js_1.prisma.personnel.findFirst({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    (0, apiResponse_js_1.ok)(res, personnel, 'Personnel detail');
}));
router.put('/personnel/:id', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const updated = await (0, personnelService_js_1.updatePersonnel)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {});
    (0, apiResponse_js_1.ok)(res, updated, 'Personnel updated');
}));
router.get('/personnel/:id/360', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnel360)(req.user.tenantId, String(req.params.id)), 'Personnel 360')));
router.get('/personnel/:id/summary', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const bundle = await (0, personnelService_js_1.getPersonnel360)(req.user.tenantId, String(req.params.id));
    (0, apiResponse_js_1.ok)(res, bundle ? {
        personnel: bundle.personnel,
        assignments: bundle.assignmentHistory,
        certifications: bundle.certifications.active,
        documents: bundle.performance.documents,
        readinessScore: bundle.readiness.overallReadinessScore,
        incidentCount: bundle.incidents.participation.length,
        recentIncidentLinks: bundle.incidents.participation.slice(0, 5),
    } : null, 'Personnel summary');
}));
router.get('/personnel/:id/certifications', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, (await (0, personnelService_js_1.getPersonnel360)(req.user.tenantId, String(req.params.id)))?.certifications.active ?? [], 'Personnel certifications')));
router.get('/personnel/:id/training', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelTraining)(req.user.tenantId, String(req.params.id)), 'Personnel training')));
router.get('/personnel/:id/incidents', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelIncidents)(req.user.tenantId, String(req.params.id)), 'Personnel incidents')));
router.get('/personnel/:id/staffing', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelStaffing)(req.user.tenantId, String(req.params.id)), 'Personnel staffing')));
router.get('/personnel/:id/performance', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelPerformance)(req.user.tenantId, String(req.params.id)), 'Personnel performance')));
router.post('/personnel/:id/performance', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, personnelService_js_1.createPersonnelPerformanceReview)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Performance review created')));
router.get('/personnel/:id/goals', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelGoals)(req.user.tenantId, String(req.params.id)), 'Personnel goals')));
router.post('/personnel/:id/goals', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, personnelService_js_1.createPersonnelGoal)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Goal created')));
router.put('/personnel/:id/goals/:goalId', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.updatePersonnelGoal)(req.user.tenantId, String(req.params.id), String(req.params.goalId), req.user.userId, req.body ?? {}), 'Goal updated')));
router.get('/personnel/:id/documents', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelDocuments)(req.user.tenantId, String(req.params.id)), 'Personnel documents')));
router.post('/personnel/:id/documents', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, personnelService_js_1.createPersonnelDocument)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Document uploaded')));
router.get('/personnel/:id/readiness', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelReadiness)(req.user.tenantId, String(req.params.id)), 'Personnel readiness')));
router.get('/personnel/risks', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelRisks)(req.user.tenantId), 'Personnel risks')));
router.get('/personnel/readiness-summary', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, personnelService_js_1.getPersonnelReadinessSummary)(req.user.tenantId), 'Personnel readiness summary')));
router.get('/personnel-certifications/expiring', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('personnel.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listExpiringPersonnelCertifications)(req.user.tenantId), 'Expiring certifications')));
router.get('/certifications', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listCertifications)(req.user.tenantId, page, take), 'Certifications');
}));
router.get('/properties', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listProperties)(req.user.tenantId, page, take, {
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
router.get('/notifications', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const notifications = await (0, foundationService_js_1.listNotifications)(req.user.tenantId, req.user.userId);
    (0, apiResponse_js_1.ok)(res, { items: notifications, page: 1, take: notifications.length, total: notifications.length }, 'Notifications');
}));
router.post('/notifications/:id/read', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    await (0, foundationService_js_1.markNotificationRead)(req.user.tenantId, String(req.params.id), req.user.userId);
    (0, apiResponse_js_1.ok)(res, true, 'Notification updated');
}));
router.get('/audit-logs', auth_js_2.authRequired, (0, auth_js_2.requirePermission)('admin.audit'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listAuditLogs)(req.user.tenantId, page, take), 'Audit logs');
}));
router.get('/rms/summary', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.getRmsSummary)(req.user.tenantId), 'RMS summary')));
router.get('/rms/records', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listRmsRecords)(req.user.tenantId, page, take), 'RMS records');
}));
router.get('/rms/neris/queue', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listNerisQueue)(req.user.tenantId, page, take), 'NERIS queue');
}));
router.get('/rms/epcr/queue', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.listEpcrQueue)(req.user.tenantId, page, take), 'ePCR queue');
}));
router.get('/search', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const query = String(req.query.q ?? '');
    (0, apiResponse_js_1.ok)(res, await (0, foundationService_js_1.searchPlatform)(req.user.tenantId, query), 'Search results');
}));
router.use('/training', training_js_1.default);
router.use('/', prevention_js_1.default);
router.use('/', assets_js_1.default);
router.use('/courses', (0, crud_js_1.crudRouter)('course', 'courses'));
router.use('/training/assignments', (0, crud_js_1.crudRouter)('trainingAssignment', 'training assignments'));
router.use('/shifts', (0, crud_js_1.crudRouter)('shift', 'shifts'));
router.use('/staffing/assignments', (0, crud_js_1.crudRouter)('shiftAssignment', 'shift assignments'));
router.use('/inspections', (0, crud_js_1.crudRouter)('inspection', 'inspections'));
router.use('/permits', (0, crud_js_1.crudRouter)('permit', 'permits'));
router.use('/preplans', (0, crud_js_1.crudRouter)('preplan', 'preplans'));
router.use('/integrations', integrations_js_1.default);
router.use('/ai', ai_js_1.default);
router.get('/analytics/dashboard', auth_js_2.authRequired, (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const commandCenter = await analyticsService_js_1.analyticsCommandService.getAnalyticsCommandCenter(req.user.tenantId);
    (0, apiResponse_js_1.ok)(res, {
        agencyReadiness: commandCenter.summary.agencyReadiness,
        stationCount: commandCenter.summary.stationCount,
        incidentCount: commandCenter.trends.incidentVolume.reduce((total, point) => total + Number(point.value ?? 0), 0),
        personnelCount: commandCenter.summary.personnelCount,
        apparatusWarnings: Math.max(0, Math.round(commandCenter.summary.apparatusCount * (100 - Number(commandCenter.summary.apparatusReadiness ?? 0)) / 100)),
        overdueInspections: commandCenter.summary.inspectionBacklog,
        openAiInsights: commandCenter.aiInsights.length,
    }, 'Dashboard analytics');
}));
exports.default = router;
