"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const preventionService_js_1 = require("../services/preventionService.js");
const router = (0, express_1.Router)();
const readFilter = (query, key) => {
    const value = query[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
};
router.get('/prevention/command-center', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('prevention.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPreventionCommandCenter)(req.user.tenantId), 'Prevention command center')));
router.get('/prevention/risks', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('prevention.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPreventionRisks)(req.user.tenantId), 'Prevention risks')));
router.get('/prevention/readiness-impact', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('prevention.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPreventionReadinessImpact)(req.user.tenantId), 'Prevention readiness impact')));
router.post('/properties', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createProperty)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Property created')));
router.get('/properties/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getProperty360)(req.user.tenantId, String(req.params.id)), 'Property detail')));
router.put('/properties/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updateProperty)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Property updated')));
router.get('/properties/:id/360', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getProperty360)(req.user.tenantId, String(req.params.id)), 'Property 360')));
router.get('/properties/:id/inspections', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPropertyInspections)(req.user.tenantId, String(req.params.id)), 'Property inspections')));
router.get('/properties/:id/permits', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPropertyPermits)(req.user.tenantId, String(req.params.id)), 'Property permits')));
router.get('/properties/:id/preplans', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPropertyPreplans)(req.user.tenantId, String(req.params.id)), 'Property preplans')));
router.get('/properties/:id/violations', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPropertyViolations)(req.user.tenantId, String(req.params.id)), 'Property violations')));
router.get('/properties/:id/risk', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getPropertyRisk)(req.user.tenantId, String(req.params.id)), 'Property risk')));
router.post('/occupancies', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createOccupancy)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Occupancy created')));
router.get('/occupancies', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listOccupancies)(req.user.tenantId, page, take), 'Occupancies');
}));
router.get('/occupancies/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const items = await (0, preventionService_js_1.listOccupancies)(req.user.tenantId, 1, 500);
    (0, apiResponse_js_1.ok)(res, items.items.find((item) => item.id === req.params.id) ?? null, 'Occupancy detail');
}));
router.put('/occupancies/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('properties.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updateOccupancy)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Occupancy updated')));
router.get('/inspections', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listInspections)(req.user.tenantId, page, take, {
        stationId: readFilter(req.query, 'stationId'),
        inspectionStatus: readFilter(req.query, 'status'),
        riskLevel: readFilter(req.query, 'riskLevel'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    }), 'Inspections');
}));
router.post('/inspections', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createInspection)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Inspection created')));
router.get('/inspections/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const items = await (0, preventionService_js_1.listInspections)(req.user.tenantId, 1, 500, {});
    (0, apiResponse_js_1.ok)(res, items.items.find((item) => item.id === req.params.id) ?? null, 'Inspection detail');
}));
router.put('/inspections/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updateInspection)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Inspection updated')));
router.post('/inspections/:id/start', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.startInspection)(req.user.tenantId, String(req.params.id), req.user.userId), 'Inspection started')));
router.post('/inspections/:id/complete', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.completeInspection)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Inspection completed')));
router.post('/inspections/:id/close', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.closeInspection)(req.user.tenantId, String(req.params.id), req.user.userId), 'Inspection closed')));
router.get('/inspections/prioritized', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listInspections)(req.user.tenantId, 1, 500, {}), 'Prioritized inspections')));
router.get('/inspections/overdue', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getOverdueInspections)(req.user.tenantId), 'Overdue inspections')));
router.get('/inspections/:id/checklist', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getInspectionChecklist)(req.user.tenantId, String(req.params.id)), 'Inspection checklist')));
router.post('/inspections/:id/checklist', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inspections.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.addInspectionChecklistItem)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Checklist item created')));
router.get('/violations', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listViolations)(req.user.tenantId, page, take, {
        violationSeverity: readFilter(req.query, 'severity'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    }), 'Violations');
}));
router.post('/violations', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createViolation)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Violation created')));
router.get('/violations/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const items = await (0, preventionService_js_1.listViolations)(req.user.tenantId, 1, 500, {});
    (0, apiResponse_js_1.ok)(res, items.items.find((item) => item.id === req.params.id) ?? null, 'Violation detail');
}));
router.put('/violations/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updateViolation)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Violation updated')));
router.post('/violations/:id/resolve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.resolveViolation)(req.user.tenantId, String(req.params.id), req.user.userId), 'Violation resolved')));
router.post('/violations/:id/escalate', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.escalateViolation)(req.user.tenantId, String(req.params.id), req.user.userId), 'Violation escalated')));
router.get('/violations/open', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listOpenViolations)(req.user.tenantId), 'Open violations')));
router.get('/violations/critical', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listCriticalViolations)(req.user.tenantId), 'Critical violations')));
router.get('/corrective-actions', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getCorrectiveActions)(req.user.tenantId), 'Corrective actions')));
router.post('/corrective-actions', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createCorrectiveAction)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Corrective action created')));
router.put('/corrective-actions/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updateCorrectiveAction)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Corrective action updated')));
router.post('/corrective-actions/:id/complete', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('violations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.completeCorrectiveAction)(req.user.tenantId, String(req.params.id), req.user.userId), 'Corrective action completed')));
router.get('/permits', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listPermits)(req.user.tenantId, page, take, {
        permitStatus: readFilter(req.query, 'status'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    }), 'Permits');
}));
router.post('/permits', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createPermit)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Permit created')));
router.get('/permits/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const items = await (0, preventionService_js_1.listPermits)(req.user.tenantId, 1, 500, {});
    (0, apiResponse_js_1.ok)(res, items.items.find((item) => item.id === req.params.id) ?? null, 'Permit detail');
}));
router.put('/permits/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updatePermit)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Permit updated')));
router.post('/permits/:id/review', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.reviewPermit)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Permit review logged')));
router.post('/permits/:id/approve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.approvePermit)(req.user.tenantId, String(req.params.id), req.user.userId), 'Permit approved')));
router.post('/permits/:id/deny', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.denyPermit)(req.user.tenantId, String(req.params.id), req.user.userId), 'Permit denied')));
router.post('/permits/:id/request-info', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.requestPermitInfo)(req.user.tenantId, String(req.params.id), req.user.userId), 'Permit info requested')));
router.get('/permits/backlog', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listPermitBacklog)(req.user.tenantId), 'Permit backlog')));
router.get('/permits/expiring', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('permits.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listExpiringPermits)(req.user.tenantId), 'Expiring permits')));
router.get('/preplans', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listPreplans)(req.user.tenantId, page, take, {
        preplanStatus: readFilter(req.query, 'status'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    }), 'Preplans');
}));
router.post('/preplans', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createPreplan)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Preplan created')));
router.get('/preplans/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const items = await (0, preventionService_js_1.listPreplans)(req.user.tenantId, 1, 500, {});
    (0, apiResponse_js_1.ok)(res, items.items.find((item) => item.id === req.params.id) ?? null, 'Preplan detail');
}));
router.put('/preplans/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.updatePreplan)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Preplan updated')));
router.post('/preplans/:id/activate', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.activatePreplan)(req.user.tenantId, String(req.params.id), req.user.userId), 'Preplan activated')));
router.post('/preplans/:id/mark-review-due', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.markPreplanReviewDue)(req.user.tenantId, String(req.params.id), req.user.userId), 'Preplan marked review due')));
router.get('/preplans/review-due', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listPreplansReviewDue)(req.user.tenantId), 'Preplans review due')));
router.get('/preplans/incomplete', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('preplans.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listPreplansIncomplete)(req.user.tenantId), 'Incomplete preplans')));
router.get('/hydrants', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hydrants.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listHydrants)(req.user.tenantId, page, take), 'Hydrants');
}));
router.post('/hydrants', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hydrants.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createHydrant)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Hydrant created')));
router.get('/hydrants/issues', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hydrants.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listHydrantIssues)(req.user.tenantId), 'Hydrant issues')));
router.get('/hazards', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hazards.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listHazards)(req.user.tenantId, page, take), 'Hazards');
}));
router.post('/hazards', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hazards.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, preventionService_js_1.createHazard)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Hazard created')));
router.get('/hazards/critical', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('hazards.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.listCriticalHazards)(req.user.tenantId), 'Critical hazards')));
router.get('/stations/:id/prevention', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('stations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getStationPreventionSummary)(req.user.tenantId, String(req.params.id)), 'Station prevention summary')));
router.get('/stations/:id/prevention-risk', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('stations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, preventionService_js_1.getStationPreventionRisk)(req.user.tenantId, String(req.params.id)), 'Station prevention risk')));
exports.default = router;
