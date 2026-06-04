"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const staffingService_js_1 = require("../services/staffingService.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authRequired);
router.get('/command-center', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getCommandCenter(req.user.tenantId), 'Staffing command center');
}));
router.get('/board', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getBoard(req.user.tenantId, page, take, {
        stationId: typeof req.query.stationId === 'string' ? req.query.stationId : undefined,
        riskLevel: typeof req.query.riskLevel === 'string' ? req.query.riskLevel : undefined,
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : typeof req.query.q === 'string' ? req.query.q : undefined,
    }), 'Staffing board');
}));
router.get('/gaps', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getGaps(req.user.tenantId, page, take), 'Staffing gaps');
}));
router.get('/recommendations', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getRecommendations(req.user.tenantId, page, take), 'Staffing recommendations');
}));
router.get('/shift-fill', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getShiftFill(req.user.tenantId, page, take), 'Staffing shift fill');
}));
router.get('/trades', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getTrades(req.user.tenantId, page, take), 'Staffing trades');
}));
router.get('/overtime', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getOvertime(req.user.tenantId, page, take), 'Staffing overtime');
}));
router.get('/callback-queue', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getCallbackQueue(req.user.tenantId, page, take), 'Staffing callback queue');
}));
router.get('/roster', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const dayOffset = typeof req.query.dayOffset === 'string' ? Number(req.query.dayOffset) || 0 : 0;
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getRoster(req.user.tenantId, dayOffset), 'Staffing roster');
}));
router.get('/planner', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const days = typeof req.query.days === 'string' ? Number(req.query.days) || 5 : 5;
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getPlanner(req.user.tenantId, days), 'Staffing planner');
}));
router.get('/forecast', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const days = typeof req.query.days === 'string' ? Number(req.query.days) || 7 : 7;
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getForecast(req.user.tenantId, days), 'Staffing forecast');
}));
router.get('/kpis', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getKpis(req.user.tenantId), 'Staffing KPIs');
}));
router.get('/appraisals', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getAppraisals(req.user.tenantId, page, take), 'Staffing appraisals');
}));
router.get('/minimum-rules', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getMinimumRules(req.user.tenantId, page, take), 'Staffing minimum rules');
}));
router.get('/audit-log', (0, auth_js_1.requirePermission)('staffing.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.getAuditLog(req.user.tenantId, page, take), 'Staffing audit log');
}));
router.post('/recommendations/:id/action', (0, auth_js_1.requirePermission)('staffing.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await staffingService_js_1.staffingService.actOnRecommendation(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Staffing recommendation action recorded');
}));
exports.default = router;
