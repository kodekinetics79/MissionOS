"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const hub = __importStar(require("../services/integrationHubService.js"));
const router = (0, express_1.Router)();
const filterParams = (query, keys) => {
    const filters = {};
    for (const key of keys) {
        const value = query[key];
        if (typeof value === 'string' && value.trim())
            filters[key] = value;
    }
    return filters;
};
// ----- Command center / overview (static paths first) -----
router.get('/command-center', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getCommandCenter(req.user.tenantId), 'Integration command center')));
router.get('/health', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getHealthOverview(req.user.tenantId), 'Integration health')));
router.get('/performance', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getPerformance(req.user.tenantId), 'Integration performance')));
router.get('/data-flow', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getDataFlow(req.user.tenantId), 'Integration data flow')));
// ----- Adapters -----
router.get('/adapters', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await hub.listAdapters(req.user.tenantId) }, 'Adapter registry')));
// ----- Logs / errors / retry (static before :id) -----
router.get('/logs', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const filters = filterParams(req.query, ['integrationSystemId', 'status', 'direction', 'eventType', 'errorOnly', 'search']);
    (0, apiResponse_js_1.ok)(res, await hub.listLogs(req.user.tenantId, filters, page, take), 'Integration logs');
}));
router.get('/errors', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const filters = filterParams(req.query, ['integrationSystemId', 'status', 'severity', 'openOnly']);
    (0, apiResponse_js_1.ok)(res, await hub.listErrors(req.user.tenantId, filters, page, take), 'Integration errors');
}));
router.post('/errors/:errorId/resolve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.resolveError(req.user.tenantId, String(req.params.errorId), req.user.userId), 'Error resolved')));
router.post('/errors/:errorId/dismiss', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.dismissError(req.user.tenantId, String(req.params.errorId), req.user.userId), 'Error dismissed')));
router.post('/errors/:errorId/retry', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.retry'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.retryError(req.user.tenantId, String(req.params.errorId), req.user.userId), 'Retry attempted')));
router.get('/retry-jobs', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const filters = filterParams(req.query, ['integrationSystemId', 'retryStatus']);
    (0, apiResponse_js_1.ok)(res, await hub.listRetryJobs(req.user.tenantId, filters), 'Retry jobs');
}));
router.post('/logs/:logId/retry', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.retry'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.retryLog(req.user.tenantId, String(req.params.logId), req.user.userId), 'Log retry attempted')));
// ----- Systems collection -----
router.get('/', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const filters = filterParams(req.query, ['status', 'systemType', 'exchangeMethod', 'dataDirection', 'search']);
    (0, apiResponse_js_1.ok)(res, await hub.listSystems(req.user.tenantId, filters, page, take), 'Integration systems');
}));
router.post('/', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await hub.createSystem(req.user.tenantId, req.user.userId, req.body ?? {}), 'Integration system created')));
// ----- Single system (dynamic) -----
router.get('/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getSystem360(req.user.tenantId, String(req.params.id)), 'System 360')));
router.put('/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.updateSystem(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Integration system updated')));
router.post('/:id/test', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.test'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.testConnection(req.user.tenantId, String(req.params.id), req.user.userId), 'Connection tested')));
router.post('/:id/sync', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.sync'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.syncSystem(req.user.tenantId, String(req.params.id), req.user.userId), 'Sync triggered')));
router.post('/:id/disable', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.setSystemEnabled(req.user.tenantId, String(req.params.id), req.user.userId, false), 'Integration disabled')));
router.post('/:id/enable', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.setSystemEnabled(req.user.tenantId, String(req.params.id), req.user.userId, true), 'Integration enabled')));
// ----- Adapter (per system) -----
router.get('/:id/adapter-info', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getAdapterInfo(req.user.tenantId, String(req.params.id)), 'Adapter info')));
router.post('/:id/adapter/test', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.test'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.testConnection(req.user.tenantId, String(req.params.id), req.user.userId), 'Adapter connection tested')));
router.post('/:id/adapter/sync', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.sync'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.syncSystem(req.user.tenantId, String(req.params.id), req.user.userId), 'Adapter sync triggered')));
// ----- Endpoints -----
router.get('/:id/endpoints', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await hub.listEndpoints(req.user.tenantId, String(req.params.id)) }, 'Endpoints')));
router.post('/:id/endpoints', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await hub.createEndpoint(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Endpoint created')));
router.get('/:id/endpoints/:endpointId', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getEndpoint(req.user.tenantId, String(req.params.id), String(req.params.endpointId)), 'Endpoint detail')));
// ----- Field mappings -----
router.get('/:id/field-mappings', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const filters = filterParams(req.query, ['status', 'requiredOnly']);
    (0, apiResponse_js_1.ok)(res, { items: await hub.listFieldMappings(req.user.tenantId, String(req.params.id), filters) }, 'Field mappings');
}));
router.post('/:id/field-mappings', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.mappings'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await hub.createFieldMapping(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Field mapping created')));
router.put('/:id/field-mappings/:mappingId', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.mappings'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.updateFieldMapping(req.user.tenantId, String(req.params.id), String(req.params.mappingId), req.user.userId, req.body ?? {}), 'Field mapping updated')));
router.post('/:id/field-mappings/validate', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.mappings'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.validateFieldMappings(req.user.tenantId, String(req.params.id), req.user.userId), 'Field mappings validated')));
// ----- Per-system logs / errors -----
router.get('/:id/logs', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const filters = { ...filterParams(req.query, ['status', 'direction', 'eventType', 'errorOnly', 'search']), integrationSystemId: String(req.params.id) };
    (0, apiResponse_js_1.ok)(res, await hub.listLogs(req.user.tenantId, filters, page, take), 'System logs');
}));
router.get('/:id/errors', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const filters = { ...filterParams(req.query, ['status', 'severity', 'openOnly']), integrationSystemId: String(req.params.id) };
    (0, apiResponse_js_1.ok)(res, await hub.listErrors(req.user.tenantId, filters), 'System errors');
}));
// ----- Webhooks -----
router.get('/:id/webhooks', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await hub.listWebhooks(req.user.tenantId, String(req.params.id)) }, 'Webhooks')));
router.post('/:id/webhooks', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.webhooks'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await hub.createWebhook(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Webhook created')));
router.post('/:id/webhooks/:webhookId/test', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.webhooks'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.testWebhook(req.user.tenantId, String(req.params.id), String(req.params.webhookId), req.user.userId), 'Webhook tested')));
// ----- Credentials -----
router.get('/:id/credentials', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.credentials'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await hub.listCredentials(req.user.tenantId, String(req.params.id)) }, 'Credentials')));
router.post('/:id/credentials', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.credentials'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await hub.createCredential(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Credential created')));
router.post('/:id/credentials/:credentialId/rotate', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.credentials'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.rotateCredential(req.user.tenantId, String(req.params.id), String(req.params.credentialId), req.user.userId), 'Credential rotated')));
// ----- API docs + data objects -----
router.get('/:id/api-docs', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await hub.getApiDocs(req.user.tenantId, String(req.params.id)), 'API docs')));
router.get('/:id/data-objects', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('integrations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await hub.listDataObjects(req.user.tenantId, String(req.params.id)) }, 'Data objects')));
exports.default = router;
