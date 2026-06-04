"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const incidentService_js_1 = require("../services/incidentService.js");
const router = (0, express_1.Router)();
router.get('/incidents/command-center', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentService.getIncidentCommandCenter(req.user.tenantId), 'Incident command center');
}));
router.get('/incidents', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const page = Number(req.query.page ?? 1);
    const take = Number(req.query.take ?? req.query.limit ?? 50);
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentService.listIncidents(req.user.tenantId, page, take, req.query), 'Incidents');
}));
router.post('/incidents', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentWorkflowService.createIncident(req.user.tenantId, req.user.userId, req.body ?? {}), 'Incident created');
}));
router.get('/incidents/duplicates', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentDuplicateDetectionService.listIncidentDuplicateCandidates(req.user.tenantId), 'Incident duplicate candidates');
}));
router.get('/incidents/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentService.getIncidentDetail(req.user.tenantId, String(req.params.id)), 'Incident detail');
}));
router.put('/incidents/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentWorkflowService.updateIncident(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Incident updated');
}));
router.post('/incidents/:id/submit', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentWorkflowService.submitIncident(req.user.tenantId, req.user.userId, String(req.params.id)), 'Incident submitted');
}));
router.post('/incidents/:id/qa/approve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.qa'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentQaService.approveIncidentQa(req.user.tenantId, req.user.userId, String(req.params.id), String(req.body?.notes ?? '')), 'Incident QA approved');
}));
router.post('/incidents/:id/qa/return', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.qa'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentQaService.returnIncidentQa(req.user.tenantId, req.user.userId, String(req.params.id), String(req.body?.notes ?? '')), 'Incident returned');
}));
router.post('/incidents/:id/close', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentWorkflowService.closeIncident(req.user.tenantId, req.user.userId, String(req.params.id)), 'Incident closed');
}));
router.get('/incidents/:id/timeline', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentTimelineService.listIncidentTimeline(req.user.tenantId, String(req.params.id)), 'Incident timeline');
}));
router.post('/incidents/:id/timeline', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentTimelineService.addIncidentTimelineEvent(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Timeline event created');
}));
router.get('/incidents/:id/narratives', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentNarrativeService.listIncidentNarratives(req.user.tenantId, String(req.params.id)), 'Incident narratives');
}));
router.post('/incidents/:id/narratives', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentNarrativeService.addIncidentNarrative(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Narrative added');
}));
router.get('/incidents/:id/data-quality', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.incidentDataQualityService.listIncidentDataQualityIssues(req.user.tenantId, String(req.params.id)), 'Incident data quality');
}));
router.get('/neris/mappings', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('neris.export'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.nerisMappingService.listNerisMappings(req.user.tenantId), 'NERIS mappings');
}));
router.put('/neris/mappings/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('neris.export'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.nerisMappingService.updateNerisMapping(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'NERIS mapping updated');
}));
router.get('/neris/export-preview/:incidentId', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('neris.export'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.nerisExportService.getNerisExportPreview(req.user.tenantId, String(req.params.incidentId)), 'NERIS export preview');
}));
router.post('/neris/export/:incidentId', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('neris.export'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.nerisExportService.exportIncidentToNeris(req.user.tenantId, req.user.userId, String(req.params.incidentId)), 'NERIS export submitted');
}));
router.get('/epcr/links', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('epcr.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.epcrLinkService.listEpcrLinks(req.user.tenantId), 'ePCR links');
}));
router.post('/epcr/links', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('epcr.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.epcrLinkService.createEpcrLink(req.user.tenantId, req.user.userId, req.body ?? {}), 'ePCR link created');
}));
router.get('/cad/import-logs', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('incidents.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    (0, apiResponse_js_1.ok)(res, await incidentService_js_1.cadImportService.listCadImportLogs(req.user.tenantId), 'CAD import logs');
}));
exports.default = router;
