import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import * as ai from '../services/aiAdvisorService.js';

const router = Router();

const filterParams = (query: Record<string, unknown>, keys: string[]) => {
  const filters: Record<string, string | undefined> = {};
  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string' && value.trim()) filters[key] = value;
  }
  return filters;
};
const INSIGHT_FILTERS = ['severity', 'category', 'status', 'stationId', 'personnelId', 'integrationSystemId', 'module', 'openOnly', 'search'];

// ----- Command / briefing / snapshot / generate -----
router.get('/command-center', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.getCommandCenter(req.user!.tenantId, filterParams(req.query as Record<string, unknown>, INSIGHT_FILTERS)), 'AI command center')));
router.get('/readiness-briefing', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.getReadinessBriefing(req.user!.tenantId), 'Daily readiness briefing')));
router.get('/readiness-snapshot', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.getReadinessSnapshot(req.user!.tenantId), 'Readiness snapshot')));
router.post('/generate-insights', authRequired, requirePermission('ai.generate'), asyncHandler(async (req, res) =>
  created(res, await ai.generateInsights(req.user!.tenantId, req.user!.userId), 'Insights generated')));

// ----- Ask -----
router.post('/ask', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.ask(req.user!.tenantId, req.user!.userId, String(req.body?.question ?? 'What needs attention today?')), 'Advisor answer')));
router.get('/questions/history', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.questionHistory(req.user!.tenantId), 'Question history')));

// ----- Evidence (collection) -----
router.get('/evidence', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.listAllEvidence(req.user!.tenantId, filterParams(req.query as Record<string, unknown>, ['sourceModule', 'aiInsightId', 'page'])), 'Evidence')));

// ----- Rules -----
router.get('/rules', authRequired, requirePermission('ai.rules.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.listRules(req.user!.tenantId, filterParams(req.query as Record<string, unknown>, ['category', 'active'])), 'AI rules')));
router.post('/rules', authRequired, requirePermission('ai.rules.manage'), asyncHandler(async (req, res) =>
  created(res, await ai.createRule(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Rule created')));
router.put('/rules/:id', authRequired, requirePermission('ai.rules.manage'), asyncHandler(async (req, res) =>
  ok(res, await ai.updateRule(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Rule updated')));
router.post('/rules/:id/enable', authRequired, requirePermission('ai.rules.manage'), asyncHandler(async (req, res) =>
  ok(res, await ai.setRuleActive(req.user!.tenantId, String(req.params.id), req.user!.userId, true), 'Rule enabled')));
router.post('/rules/:id/disable', authRequired, requirePermission('ai.rules.manage'), asyncHandler(async (req, res) =>
  ok(res, await ai.setRuleActive(req.user!.tenantId, String(req.params.id), req.user!.userId, false), 'Rule disabled')));

// ----- Providers -----
router.get('/providers', authRequired, requirePermission('ai.providers.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.listProviders(req.user!.tenantId), 'AI providers')));
router.put('/providers/:id', authRequired, requirePermission('ai.providers.manage'), asyncHandler(async (req, res) =>
  ok(res, await ai.updateProvider(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Provider updated')));
router.post('/providers/:id/test', authRequired, requirePermission('ai.providers.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.testProvider(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Provider tested')));

// ----- Module risk views -----
router.get('/risks/:module', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.getModuleRisk(req.user!.tenantId, String(req.params.module)), 'Module risk')));

// ----- Insights collection -----
router.get('/insights', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await ai.listInsights(req.user!.tenantId, filterParams(req.query as Record<string, unknown>, INSIGHT_FILTERS), page, take), 'AI insights');
}));

// ----- Single insight + workflow -----
router.get('/insights/:id', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.getInsight(req.user!.tenantId, String(req.params.id)), 'AI insight detail')));
router.get('/insights/:id/evidence', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, { items: await ai.listInsightEvidence(req.user!.tenantId, String(req.params.id)) }, 'Insight evidence')));
router.post('/insights/:id/acknowledge', authRequired, requirePermission('ai.view'), asyncHandler(async (req, res) =>
  ok(res, await ai.acknowledgeInsight(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Insight acknowledged')));
router.post('/insights/:id/resolve', authRequired, requirePermission('ai.resolve'), asyncHandler(async (req, res) =>
  ok(res, await ai.resolveInsight(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Insight resolved')));
router.post('/insights/:id/dismiss', authRequired, requirePermission('ai.dismiss'), asyncHandler(async (req, res) =>
  ok(res, await ai.dismissInsight(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Insight dismissed')));
router.post('/insights/:id/actions', authRequired, requirePermission('ai.actions.assign'), asyncHandler(async (req, res) =>
  created(res, await ai.createInsightAction(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Action created')));
router.put('/insights/:id/actions/:actionId', authRequired, requirePermission('ai.actions.assign'), asyncHandler(async (req, res) =>
  ok(res, await ai.updateInsightAction(req.user!.tenantId, String(req.params.id), String(req.params.actionId), req.user!.userId, req.body ?? {}), 'Action updated')));

export default router;
