import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import * as hub from '../services/integrationHubService.js';

const router = Router();

const filterParams = (query: Record<string, unknown>, keys: string[]) => {
  const filters: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string' && value.trim()) filters[key] = value;
  }
  return filters;
};

// ----- Command center / overview (static paths first) -----
router.get('/command-center', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getCommandCenter(req.user!.tenantId), 'Integration command center')));
router.get('/health', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getHealthOverview(req.user!.tenantId), 'Integration health')));
router.get('/performance', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getPerformance(req.user!.tenantId), 'Integration performance')));
router.get('/data-flow', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getDataFlow(req.user!.tenantId), 'Integration data flow')));

// ----- Adapters -----
router.get('/adapters', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, { items: await hub.listAdapters(req.user!.tenantId) }, 'Adapter registry')));

// ----- Logs / errors / retry (static before :id) -----
router.get('/logs', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const filters = filterParams(req.query as Record<string, unknown>, ['integrationSystemId', 'status', 'direction', 'eventType', 'errorOnly', 'search']);
  ok(res, await hub.listLogs(req.user!.tenantId, filters, page, take), 'Integration logs');
}));
router.get('/errors', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const filters = filterParams(req.query as Record<string, unknown>, ['integrationSystemId', 'status', 'severity', 'openOnly']);
  ok(res, await hub.listErrors(req.user!.tenantId, filters, page, take), 'Integration errors');
}));
router.post('/errors/:errorId/resolve', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  ok(res, await hub.resolveError(req.user!.tenantId, String(req.params.errorId), req.user!.userId), 'Error resolved')));
router.post('/errors/:errorId/dismiss', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  ok(res, await hub.dismissError(req.user!.tenantId, String(req.params.errorId), req.user!.userId), 'Error dismissed')));
router.post('/errors/:errorId/retry', authRequired, requirePermission('integrations.retry'), asyncHandler(async (req, res) =>
  ok(res, await hub.retryError(req.user!.tenantId, String(req.params.errorId), req.user!.userId), 'Retry attempted')));

router.get('/retry-jobs', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const filters = filterParams(req.query as Record<string, unknown>, ['integrationSystemId', 'retryStatus']);
  ok(res, await hub.listRetryJobs(req.user!.tenantId, filters), 'Retry jobs');
}));
router.post('/logs/:logId/retry', authRequired, requirePermission('integrations.retry'), asyncHandler(async (req, res) =>
  ok(res, await hub.retryLog(req.user!.tenantId, String(req.params.logId), req.user!.userId), 'Log retry attempted')));

// ----- Systems collection -----
router.get('/', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const filters = filterParams(req.query as Record<string, unknown>, ['status', 'systemType', 'exchangeMethod', 'dataDirection', 'search']);
  ok(res, await hub.listSystems(req.user!.tenantId, filters, page, take), 'Integration systems');
}));
router.post('/', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  created(res, await hub.createSystem(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Integration system created')));

// ----- Single system (dynamic) -----
router.get('/:id', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getSystem360(req.user!.tenantId, String(req.params.id)), 'System 360')));
router.put('/:id', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  ok(res, await hub.updateSystem(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Integration system updated')));
router.post('/:id/test', authRequired, requirePermission('integrations.test'), asyncHandler(async (req, res) =>
  ok(res, await hub.testConnection(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Connection tested')));
router.post('/:id/sync', authRequired, requirePermission('integrations.sync'), asyncHandler(async (req, res) =>
  ok(res, await hub.syncSystem(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Sync triggered')));
router.post('/:id/disable', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  ok(res, await hub.setSystemEnabled(req.user!.tenantId, String(req.params.id), req.user!.userId, false), 'Integration disabled')));
router.post('/:id/enable', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  ok(res, await hub.setSystemEnabled(req.user!.tenantId, String(req.params.id), req.user!.userId, true), 'Integration enabled')));

// ----- Adapter (per system) -----
router.get('/:id/adapter-info', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getAdapterInfo(req.user!.tenantId, String(req.params.id)), 'Adapter info')));
router.post('/:id/adapter/test', authRequired, requirePermission('integrations.test'), asyncHandler(async (req, res) =>
  ok(res, await hub.testConnection(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Adapter connection tested')));
router.post('/:id/adapter/sync', authRequired, requirePermission('integrations.sync'), asyncHandler(async (req, res) =>
  ok(res, await hub.syncSystem(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Adapter sync triggered')));

// ----- Endpoints -----
router.get('/:id/endpoints', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, { items: await hub.listEndpoints(req.user!.tenantId, String(req.params.id)) }, 'Endpoints')));
router.post('/:id/endpoints', authRequired, requirePermission('integrations.manage'), asyncHandler(async (req, res) =>
  created(res, await hub.createEndpoint(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Endpoint created')));
router.get('/:id/endpoints/:endpointId', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getEndpoint(req.user!.tenantId, String(req.params.id), String(req.params.endpointId)), 'Endpoint detail')));

// ----- Field mappings -----
router.get('/:id/field-mappings', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const filters = filterParams(req.query as Record<string, unknown>, ['status', 'requiredOnly']);
  ok(res, { items: await hub.listFieldMappings(req.user!.tenantId, String(req.params.id), filters) }, 'Field mappings');
}));
router.post('/:id/field-mappings', authRequired, requirePermission('integrations.mappings'), asyncHandler(async (req, res) =>
  created(res, await hub.createFieldMapping(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Field mapping created')));
router.put('/:id/field-mappings/:mappingId', authRequired, requirePermission('integrations.mappings'), asyncHandler(async (req, res) =>
  ok(res, await hub.updateFieldMapping(req.user!.tenantId, String(req.params.id), String(req.params.mappingId), req.user!.userId, req.body ?? {}), 'Field mapping updated')));
router.post('/:id/field-mappings/validate', authRequired, requirePermission('integrations.mappings'), asyncHandler(async (req, res) =>
  ok(res, await hub.validateFieldMappings(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Field mappings validated')));

// ----- Per-system logs / errors -----
router.get('/:id/logs', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const filters = { ...filterParams(req.query as Record<string, unknown>, ['status', 'direction', 'eventType', 'errorOnly', 'search']), integrationSystemId: String(req.params.id) };
  ok(res, await hub.listLogs(req.user!.tenantId, filters, page, take), 'System logs');
}));
router.get('/:id/errors', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) => {
  const filters = { ...filterParams(req.query as Record<string, unknown>, ['status', 'severity', 'openOnly']), integrationSystemId: String(req.params.id) };
  ok(res, await hub.listErrors(req.user!.tenantId, filters), 'System errors');
}));

// ----- Webhooks -----
router.get('/:id/webhooks', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, { items: await hub.listWebhooks(req.user!.tenantId, String(req.params.id)) }, 'Webhooks')));
router.post('/:id/webhooks', authRequired, requirePermission('integrations.webhooks'), asyncHandler(async (req, res) =>
  created(res, await hub.createWebhook(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Webhook created')));
router.post('/:id/webhooks/:webhookId/test', authRequired, requirePermission('integrations.webhooks'), asyncHandler(async (req, res) =>
  ok(res, await hub.testWebhook(req.user!.tenantId, String(req.params.id), String(req.params.webhookId), req.user!.userId), 'Webhook tested')));

// ----- Credentials -----
router.get('/:id/credentials', authRequired, requirePermission('integrations.credentials'), asyncHandler(async (req, res) =>
  ok(res, { items: await hub.listCredentials(req.user!.tenantId, String(req.params.id)) }, 'Credentials')));
router.post('/:id/credentials', authRequired, requirePermission('integrations.credentials'), asyncHandler(async (req, res) =>
  created(res, await hub.createCredential(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Credential created')));
router.post('/:id/credentials/:credentialId/rotate', authRequired, requirePermission('integrations.credentials'), asyncHandler(async (req, res) =>
  ok(res, await hub.rotateCredential(req.user!.tenantId, String(req.params.id), String(req.params.credentialId), req.user!.userId), 'Credential rotated')));

// ----- API docs + data objects -----
router.get('/:id/api-docs', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, await hub.getApiDocs(req.user!.tenantId, String(req.params.id)), 'API docs')));
router.get('/:id/data-objects', authRequired, requirePermission('integrations.view'), asyncHandler(async (req, res) =>
  ok(res, { items: await hub.listDataObjects(req.user!.tenantId, String(req.params.id)) }, 'Data objects')));

export default router;
