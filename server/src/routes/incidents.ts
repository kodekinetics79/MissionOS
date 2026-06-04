import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import {
  incidentService,
  incidentWorkflowService,
  incidentQaService,
  incidentTimelineService,
  incidentNarrativeService,
  nerisMappingService,
  nerisExportService,
  epcrLinkService,
  cadImportService,
  incidentDataQualityService,
  incidentDuplicateDetectionService,
} from '../services/incidentService.js';

const router = Router();

router.get('/incidents/command-center', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentService.getIncidentCommandCenter(req.user!.tenantId), 'Incident command center');
}));

router.get('/incidents', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const take = Number(req.query.take ?? req.query.limit ?? 50);
  ok(res, await incidentService.listIncidents(req.user!.tenantId, page, take, req.query as Record<string, unknown>), 'Incidents');
}));

router.post('/incidents', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentWorkflowService.createIncident(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Incident created');
}));

router.get('/incidents/duplicates', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentDuplicateDetectionService.listIncidentDuplicateCandidates(req.user!.tenantId), 'Incident duplicate candidates');
}));

router.get('/incidents/:id', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentService.getIncidentDetail(req.user!.tenantId, String(req.params.id)), 'Incident detail');
}));

router.put('/incidents/:id', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentWorkflowService.updateIncident(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Incident updated');
}));

router.post('/incidents/:id/submit', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentWorkflowService.submitIncident(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Incident submitted');
}));

router.post('/incidents/:id/qa/approve', authRequired, requirePermission('incidents.qa'), asyncHandler(async (req, res) => {
  ok(res, await incidentQaService.approveIncidentQa(req.user!.tenantId, req.user!.userId, String(req.params.id), String(req.body?.notes ?? '')), 'Incident QA approved');
}));

router.post('/incidents/:id/qa/return', authRequired, requirePermission('incidents.qa'), asyncHandler(async (req, res) => {
  ok(res, await incidentQaService.returnIncidentQa(req.user!.tenantId, req.user!.userId, String(req.params.id), String(req.body?.notes ?? '')), 'Incident returned');
}));

router.post('/incidents/:id/close', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentWorkflowService.closeIncident(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Incident closed');
}));

router.get('/incidents/:id/timeline', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentTimelineService.listIncidentTimeline(req.user!.tenantId, String(req.params.id)), 'Incident timeline');
}));

router.post('/incidents/:id/timeline', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentTimelineService.addIncidentTimelineEvent(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Timeline event created');
}));

router.get('/incidents/:id/narratives', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentNarrativeService.listIncidentNarratives(req.user!.tenantId, String(req.params.id)), 'Incident narratives');
}));

router.post('/incidents/:id/narratives', authRequired, requirePermission('incidents.manage'), asyncHandler(async (req, res) => {
  ok(res, await incidentNarrativeService.addIncidentNarrative(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Narrative added');
}));

router.get('/incidents/:id/data-quality', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await incidentDataQualityService.listIncidentDataQualityIssues(req.user!.tenantId, String(req.params.id)), 'Incident data quality');
}));

router.get('/neris/mappings', authRequired, requirePermission('neris.export'), asyncHandler(async (req, res) => {
  ok(res, await nerisMappingService.listNerisMappings(req.user!.tenantId), 'NERIS mappings');
}));

router.put('/neris/mappings/:id', authRequired, requirePermission('neris.export'), asyncHandler(async (req, res) => {
  ok(res, await nerisMappingService.updateNerisMapping(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'NERIS mapping updated');
}));

router.get('/neris/export-preview/:incidentId', authRequired, requirePermission('neris.export'), asyncHandler(async (req, res) => {
  ok(res, await nerisExportService.getNerisExportPreview(req.user!.tenantId, String(req.params.incidentId)), 'NERIS export preview');
}));

router.post('/neris/export/:incidentId', authRequired, requirePermission('neris.export'), asyncHandler(async (req, res) => {
  ok(res, await nerisExportService.exportIncidentToNeris(req.user!.tenantId, req.user!.userId, String(req.params.incidentId)), 'NERIS export submitted');
}));

router.get('/epcr/links', authRequired, requirePermission('epcr.view'), asyncHandler(async (req, res) => {
  ok(res, await epcrLinkService.listEpcrLinks(req.user!.tenantId), 'ePCR links');
}));

router.post('/epcr/links', authRequired, requirePermission('epcr.view'), asyncHandler(async (req, res) => {
  ok(res, await epcrLinkService.createEpcrLink(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'ePCR link created');
}));

router.get('/cad/import-logs', authRequired, requirePermission('incidents.view'), asyncHandler(async (req, res) => {
  ok(res, await cadImportService.listCadImportLogs(req.user!.tenantId), 'CAD import logs');
}));

export default router;
