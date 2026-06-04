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
const ai = __importStar(require("../services/aiAdvisorService.js"));
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
const INSIGHT_FILTERS = ['severity', 'category', 'status', 'stationId', 'personnelId', 'integrationSystemId', 'module', 'openOnly', 'search'];
// ----- Command / briefing / snapshot / generate -----
router.get('/command-center', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.getCommandCenter(req.user.tenantId, filterParams(req.query, INSIGHT_FILTERS)), 'AI command center')));
router.get('/readiness-briefing', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.getReadinessBriefing(req.user.tenantId), 'Daily readiness briefing')));
router.get('/readiness-snapshot', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.getReadinessSnapshot(req.user.tenantId), 'Readiness snapshot')));
router.post('/generate-insights', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.generate'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await ai.generateInsights(req.user.tenantId, req.user.userId), 'Insights generated')));
// ----- Ask -----
router.post('/ask', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.ask(req.user.tenantId, req.user.userId, String(req.body?.question ?? 'What needs attention today?')), 'Advisor answer')));
router.get('/questions/history', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.questionHistory(req.user.tenantId), 'Question history')));
// ----- Evidence (collection) -----
router.get('/evidence', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.listAllEvidence(req.user.tenantId, filterParams(req.query, ['sourceModule', 'aiInsightId', 'page'])), 'Evidence')));
// ----- Rules -----
router.get('/rules', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.rules.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.listRules(req.user.tenantId, filterParams(req.query, ['category', 'active'])), 'AI rules')));
router.post('/rules', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.rules.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await ai.createRule(req.user.tenantId, req.user.userId, req.body ?? {}), 'Rule created')));
router.put('/rules/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.rules.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.updateRule(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Rule updated')));
router.post('/rules/:id/enable', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.rules.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.setRuleActive(req.user.tenantId, String(req.params.id), req.user.userId, true), 'Rule enabled')));
router.post('/rules/:id/disable', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.rules.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.setRuleActive(req.user.tenantId, String(req.params.id), req.user.userId, false), 'Rule disabled')));
// ----- Providers -----
router.get('/providers', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.providers.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.listProviders(req.user.tenantId), 'AI providers')));
router.put('/providers/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.providers.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.updateProvider(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Provider updated')));
router.post('/providers/:id/test', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.providers.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.testProvider(req.user.tenantId, String(req.params.id), req.user.userId), 'Provider tested')));
// ----- Module risk views -----
router.get('/risks/:module', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.getModuleRisk(req.user.tenantId, String(req.params.module)), 'Module risk')));
// ----- Insights collection -----
router.get('/insights', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await ai.listInsights(req.user.tenantId, filterParams(req.query, INSIGHT_FILTERS), page, take), 'AI insights');
}));
// ----- Single insight + workflow -----
router.get('/insights/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.getInsight(req.user.tenantId, String(req.params.id)), 'AI insight detail')));
router.get('/insights/:id/evidence', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await ai.listInsightEvidence(req.user.tenantId, String(req.params.id)) }, 'Insight evidence')));
router.post('/insights/:id/acknowledge', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.acknowledgeInsight(req.user.tenantId, String(req.params.id), req.user.userId), 'Insight acknowledged')));
router.post('/insights/:id/resolve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.resolve'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.resolveInsight(req.user.tenantId, String(req.params.id), req.user.userId), 'Insight resolved')));
router.post('/insights/:id/dismiss', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.dismiss'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.dismissInsight(req.user.tenantId, String(req.params.id), req.user.userId), 'Insight dismissed')));
router.post('/insights/:id/actions', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.actions.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await ai.createInsightAction(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Action created')));
router.put('/insights/:id/actions/:actionId', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('ai.actions.assign'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await ai.updateInsightAction(req.user.tenantId, String(req.params.id), String(req.params.actionId), req.user.userId, req.body ?? {}), 'Action updated')));
exports.default = router;
