"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dismissInsight = exports.resolveInsight = exports.acknowledgeInsight = void 0;
exports.computePriorityScore = computePriorityScore;
exports.deriveConfidence = deriveConfidence;
exports.listInsights = listInsights;
exports.getInsight = getInsight;
exports.createInsightAction = createInsightAction;
exports.updateInsightAction = updateInsightAction;
exports.listInsightEvidence = listInsightEvidence;
exports.listAllEvidence = listAllEvidence;
exports.getCommandCenter = getCommandCenter;
exports.getReadinessSnapshot = getReadinessSnapshot;
exports.getReadinessBriefing = getReadinessBriefing;
exports.generateInsights = generateInsights;
exports.ask = ask;
exports.questionHistory = questionHistory;
exports.listRules = listRules;
exports.createRule = createRule;
exports.updateRule = updateRule;
exports.setRuleActive = setRuleActive;
exports.listProviders = listProviders;
exports.updateProvider = updateProvider;
exports.testProvider = testProvider;
exports.getModuleRisk = getModuleRisk;
const prisma_js_1 = require("../utils/prisma.js");
const providers_js_1 = require("../ai/providers.js");
const nowIso = () => new Date().toISOString();
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const SEVERITY_WEIGHT = { Critical: 100, High: 80, Medium: 60, Low: 35, Info: 15 };
const TIME_WEIGHT = { Immediate: 100, 'Within 24 hours': 80, 'This week': 60, 'This month': 35, Monitor: 15 };
const SCOPE_WEIGHT = { District: 100, Battalion: 80, Station: 60, 'Crew/shift': 45, Individual: 30, 'Single asset/property': 25 };
const OPEN_STATUSES = ['New', 'Acknowledged', 'In Progress'];
function computePriorityScore(insight) {
    const severity = SEVERITY_WEIGHT[insight.severity] ?? 40;
    const readiness = Number(insight.readinessImpactScore ?? 40);
    const time = TIME_WEIGHT[insight.estimatedTimeSensitivity] ?? 35;
    const scope = SCOPE_WEIGHT[insight.affectedScope] ?? 30;
    const confidence = Number(insight.confidenceScore ?? 70);
    return Math.round(severity * 0.3 + readiness * 0.25 + time * 0.2 + scope * 0.15 + confidence * 0.1);
}
/** Confidence derived from evidence count, weight, and source diversity. */
function deriveConfidence(evidence) {
    if (!evidence.length)
        return 60;
    const totalWeight = evidence.reduce((sum, item) => sum + Number(item.weight ?? 1), 0);
    const sources = new Set(evidence.map((item) => item.sourceModule)).size;
    return clamp(50 + Math.min(30, totalWeight * 2) + Math.min(20, sources * 5));
}
// ---------------------------------------------------------------------------
// Entity lookups (for related-record enrichment)
// ---------------------------------------------------------------------------
async function entityMaps(tenantId) {
    const [stations, personnel, apparatus, properties, integrations] = await Promise.all([
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.property.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.integrationSystem.findMany({ where: { tenantId } }),
    ]);
    return {
        station: new Map(stations.map((row) => [row.id, row.name])),
        personnel: new Map(personnel.map((row) => [row.id, `${row.firstName ?? ''} ${row.lastName ?? row.employeeNumber ?? ''}`.trim()])),
        apparatus: new Map(apparatus.map((row) => [row.id, row.unitNumber])),
        property: new Map(properties.map((row) => [row.id, row.name])),
        integration: new Map(integrations.map((row) => [row.id, row.name])),
    };
}
function relatedRecords(insight, maps) {
    const records = [];
    if (insight.affectedStationId)
        records.push({ type: 'Station', id: insight.affectedStationId, label: maps.station.get(insight.affectedStationId) ?? insight.affectedStationId, route: 'station360' });
    if (insight.affectedPersonnelId)
        records.push({ type: 'Personnel', id: insight.affectedPersonnelId, label: maps.personnel.get(insight.affectedPersonnelId) ?? insight.affectedPersonnelId, route: 'personnel360' });
    if (insight.affectedApparatusId)
        records.push({ type: 'Apparatus', id: insight.affectedApparatusId, label: maps.apparatus.get(insight.affectedApparatusId) ?? insight.affectedApparatusId, route: 'apparatus360' });
    if (insight.affectedPropertyId)
        records.push({ type: 'Property', id: insight.affectedPropertyId, label: maps.property.get(insight.affectedPropertyId) ?? insight.affectedPropertyId, route: 'prevention-property' });
    if (insight.affectedIncidentId)
        records.push({ type: 'Incident', id: insight.affectedIncidentId, label: insight.affectedIncidentId, route: 'incident-detail' });
    if (insight.affectedIntegrationSystemId)
        records.push({ type: 'Integration', id: insight.affectedIntegrationSystemId, label: maps.integration.get(insight.affectedIntegrationSystemId) ?? insight.affectedIntegrationSystemId, route: 'integration-system' });
    return records;
}
function enrich(insight, maps) {
    return {
        ...insight,
        priorityScore: computePriorityScore(insight),
        relatedRecords: relatedRecords(insight, maps),
        affectedStationName: insight.affectedStationId ? maps.station.get(insight.affectedStationId) ?? null : null,
    };
}
// ---------------------------------------------------------------------------
// Audit + notification helpers
// ---------------------------------------------------------------------------
async function writeAiAudit(tenantId, userId, action, entityId, after) {
    return prisma_js_1.prisma.auditLog.create({ data: { tenantId, userId: userId ?? null, action, entityName: 'AiInsight', entityId: entityId ?? null, after: after ?? null, ipAddress: null, createdAt: nowIso() } });
}
async function notify(tenantId, title, message, notificationType, userId = 'user-admin') {
    return prisma_js_1.prisma.notification.create({ data: { tenantId, userId, title, message, notificationType, isRead: false, createdAt: nowIso() } });
}
// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------
function applyInsightFilters(insights, filters) {
    let result = insights.filter((insight) => !insight.isDeleted);
    if (filters.severity)
        result = result.filter((insight) => insight.severity === filters.severity);
    if (filters.category)
        result = result.filter((insight) => insight.category === filters.category);
    if (filters.status)
        result = result.filter((insight) => insight.status === filters.status);
    if (filters.stationId)
        result = result.filter((insight) => insight.affectedStationId === filters.stationId);
    if (filters.personnelId)
        result = result.filter((insight) => insight.affectedPersonnelId === filters.personnelId);
    if (filters.integrationSystemId)
        result = result.filter((insight) => insight.affectedIntegrationSystemId === filters.integrationSystemId);
    if (filters.module)
        result = result.filter((insight) => (insight.sourceModulesJson ?? []).map((m) => m.toLowerCase()).includes(filters.module.toLowerCase()));
    if (filters.openOnly === 'true')
        result = result.filter((insight) => OPEN_STATUSES.includes(insight.status));
    if (filters.search) {
        const needle = filters.search.toLowerCase();
        result = result.filter((insight) => `${insight.title} ${insight.summary}`.toLowerCase().includes(needle));
    }
    return result;
}
async function listInsights(tenantId, filters = {}, page = 1, take = 200) {
    const maps = await entityMaps(tenantId);
    const all = applyInsightFilters(await prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }), filters)
        .map((insight) => enrich(insight, maps))
        .sort((left, right) => right.priorityScore - left.priorityScore);
    const start = (page - 1) * take;
    return { items: all.slice(start, start + take), page, take, total: all.length };
}
async function getInsight(tenantId, id) {
    const insight = await prisma_js_1.prisma.aiInsight.findFirst({ where: { tenantId, id } });
    if (!insight)
        return null;
    const maps = await entityMaps(tenantId);
    const [evidence, actions] = await Promise.all([
        prisma_js_1.prisma.aiInsightEvidence.findMany({ where: { tenantId, aiInsightId: id }, orderBy: { weight: 'desc' } }),
        prisma_js_1.prisma.aiInsightAction.findMany({ where: { tenantId, aiInsightId: id } }),
    ]);
    const enriched = enrich(insight, maps);
    return {
        insight: enriched,
        evidence,
        actions,
        timeline: [
            { event: 'Created', at: insight.createdAt },
            ...(insight.status !== 'New' ? [{ event: 'Acknowledged', at: insight.updatedAt }] : []),
            ...(actions.length ? [{ event: 'Action created', at: actions[0].createdAt }] : []),
            ...(insight.resolvedAt ? [{ event: 'Resolved', at: insight.resolvedAt }] : []),
            ...(insight.dismissedAt ? [{ event: 'Dismissed', at: insight.dismissedAt }] : []),
        ],
        operationalImpact: {
            readinessImpact: insight.readinessImpactScore,
            impactArea: insight.impactArea ?? 'operational availability',
            complianceImpact: ['Training Risk', 'NERIS/ePCR Risk', 'Permit/Violation Risk'].includes(insight.category) ? 'High' : 'Moderate',
            communityRiskImpact: ['Prevention Risk', 'Permit/Violation Risk'].includes(insight.category) ? 'Elevated' : 'Low',
            reportingImpact: ['Incident Data Quality Risk', 'Data Quality Risk', 'Integration Risk', 'NERIS/ePCR Risk'].includes(insight.category) ? 'High' : 'Low',
        },
    };
}
async function transitionInsight(tenantId, id, userId, status, extra, auditAction) {
    const insight = await prisma_js_1.prisma.aiInsight.findFirst({ where: { tenantId, id } });
    if (!insight)
        throw new Error('Insight not found');
    const updated = await prisma_js_1.prisma.aiInsight.update({ where: { id }, data: { status, ...extra } });
    await writeAiAudit(tenantId, userId, auditAction, id, { status });
    return updated;
}
const acknowledgeInsight = (tenantId, id, userId) => transitionInsight(tenantId, id, userId, 'Acknowledged', {}, 'Acknowledged AI insight');
exports.acknowledgeInsight = acknowledgeInsight;
const resolveInsight = (tenantId, id, userId) => transitionInsight(tenantId, id, userId, 'Resolved', { resolvedAt: nowIso(), resolvedByUserId: userId }, 'Resolved AI insight');
exports.resolveInsight = resolveInsight;
const dismissInsight = (tenantId, id, userId) => transitionInsight(tenantId, id, userId, 'Dismissed', { dismissedAt: nowIso(), dismissedByUserId: userId }, 'Dismissed AI insight');
exports.dismissInsight = dismissInsight;
async function createInsightAction(tenantId, id, userId, body) {
    const insight = await prisma_js_1.prisma.aiInsight.findFirst({ where: { tenantId, id } });
    if (!insight)
        throw new Error('Insight not found');
    const action = await prisma_js_1.prisma.aiInsightAction.create({
        data: {
            tenantId, aiInsightId: id, actionTitle: body.actionTitle ?? 'New action', actionDescription: body.actionDescription ?? '',
            actionType: body.actionType ?? 'Review', targetModule: body.targetModule ?? 'platform', targetEntityName: body.targetEntityName ?? null,
            targetEntityId: body.targetEntityId ?? null, status: body.status ?? 'Suggested', assignedToUserId: body.assignedToUserId ?? null,
            dueDate: body.dueDate ?? null, completedAt: null, createdAt: nowIso(), updatedAt: nowIso(),
        },
    });
    await writeAiAudit(tenantId, userId, 'Created AI insight action', id, { action: action.id });
    return action;
}
async function updateInsightAction(tenantId, id, actionId, userId, body) {
    const action = await prisma_js_1.prisma.aiInsightAction.findFirst({ where: { tenantId, aiInsightId: id, id: actionId } });
    if (!action)
        throw new Error('Action not found');
    const completedAt = body.status === 'Completed' ? nowIso() : action.completedAt ?? null;
    const updated = await prisma_js_1.prisma.aiInsightAction.update({ where: { id: actionId }, data: { ...body, completedAt, updatedAt: nowIso() } });
    await writeAiAudit(tenantId, userId, 'Updated AI insight action', id, { action: actionId, changes: body });
    return updated;
}
async function listInsightEvidence(tenantId, id) {
    return prisma_js_1.prisma.aiInsightEvidence.findMany({ where: { tenantId, aiInsightId: id }, orderBy: { weight: 'desc' } });
}
async function listAllEvidence(tenantId, filters = {}) {
    let evidence = await prisma_js_1.prisma.aiInsightEvidence.findMany({ where: { tenantId } });
    if (filters.sourceModule)
        evidence = evidence.filter((item) => item.sourceModule === filters.sourceModule);
    if (filters.aiInsightId)
        evidence = evidence.filter((item) => item.aiInsightId === filters.aiInsightId);
    const start = filters.page ? (Number(filters.page) - 1) * 100 : 0;
    return { items: evidence.slice(start, start + 200), page: 1, take: 200, total: evidence.length };
}
// ---------------------------------------------------------------------------
// Command center + briefing + snapshots
// ---------------------------------------------------------------------------
async function getCommandCenter(tenantId, filters = {}) {
    const maps = await entityMaps(tenantId);
    const insights = applyInsightFilters(await prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }), filters)
        .map((insight) => enrich(insight, maps))
        .sort((left, right) => right.priorityScore - left.priorityScore);
    const open = insights.filter((insight) => OPEN_STATUSES.includes(insight.status));
    const actions = await prisma_js_1.prisma.aiInsightAction.findMany({ where: { tenantId } });
    const openActions = actions.filter((action) => ['Suggested', 'Assigned', 'In Progress'].includes(action.status));
    const snapshots = (await prisma_js_1.prisma.aiReadinessSnapshot.findMany({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } }));
    const latest = snapshots[0];
    const byCategory = AI_CATEGORY_LIST.map((category) => {
        const list = open.filter((insight) => insight.category === category);
        return { category, count: list.length, critical: list.filter((insight) => insight.severity === 'Critical').length, topPriority: list[0]?.priorityScore ?? 0 };
    });
    const stationCounts = new Map();
    for (const insight of open) {
        if (!insight.affectedStationId)
            continue;
        const entry = stationCounts.get(insight.affectedStationId) ?? { id: insight.affectedStationId, name: insight.affectedStationName ?? insight.affectedStationId, count: 0, maxPriority: 0 };
        entry.count += 1;
        entry.maxPriority = Math.max(entry.maxPriority, insight.priorityScore);
        stationCounts.set(insight.affectedStationId, entry);
    }
    const overallRiskLevel = latest?.overallRiskLevel ?? 'Medium';
    return {
        summary: {
            agencyReadinessScore: latest?.agencyReadinessScore ?? 82,
            overallRiskLevel,
            totalInsights: insights.length,
            openInsights: open.length,
            criticalCount: open.filter((insight) => insight.severity === 'Critical').length,
            highCount: open.filter((insight) => insight.severity === 'High').length,
            openActions: openActions.length,
            averageConfidence: open.length ? Math.round(open.reduce((sum, insight) => sum + Number(insight.confidenceScore ?? 0), 0) / open.length) : 0,
        },
        riskByCategory: byCategory,
        topAffectedStations: [...stationCounts.values()].sort((a, b) => b.maxPriority - a.maxPriority).slice(0, 5),
        whatNeedsAttention: open.slice(0, 8),
        executiveActions: open.filter((insight) => insight.severity === 'Critical' || insight.affectedScope === 'District').slice(0, 5).map((insight) => ({
            insightId: insight.id, title: insight.title, recommendedAction: insight.recommendedAction, severity: insight.severity, priorityScore: insight.priorityScore,
        })),
        readinessTrend: snapshots.slice(0, 14).reverse().map((snapshot) => ({ date: snapshot.snapshotDate, value: snapshot.agencyReadinessScore })),
    };
}
async function getReadinessSnapshot(tenantId) {
    const snapshots = await prisma_js_1.prisma.aiReadinessSnapshot.findMany({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } });
    return { latest: snapshots[0] ?? null, history: snapshots.slice(0, 30).reverse() };
}
async function getReadinessBriefing(tenantId) {
    const maps = await entityMaps(tenantId);
    const insights = applyInsightFilters(await prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }), { openOnly: 'true' })
        .map((insight) => enrich(insight, maps))
        .sort((left, right) => right.priorityScore - left.priorityScore);
    const snapshots = await prisma_js_1.prisma.aiReadinessSnapshot.findMany({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } });
    const latest = snapshots[0];
    const byCategories = (categories) => insights.filter((insight) => categories.includes(insight.category)).slice(0, 6);
    const topStation = insights.find((insight) => insight.affectedStationId);
    const morningSummary = `Today's agency readiness is ${latest?.agencyReadinessScore ?? 82}%. ${topStation ? `${topStation.affectedStationName ?? 'A station'} is the highest priority due to ${topStation.title.toLowerCase()}.` : 'No single station dominates today\'s risk profile.'} There are ${insights.filter((insight) => insight.severity === 'Critical').length} critical and ${insights.filter((insight) => insight.severity === 'High').length} high-priority open insights.`;
    return {
        date: nowIso(),
        morningSummary,
        agencyReadinessScore: latest?.agencyReadinessScore ?? 82,
        overallRiskLevel: latest?.overallRiskLevel ?? 'Medium',
        topRisks: insights.slice(0, 5),
        stationsRequiringAttention: dedupeByStation(insights).slice(0, 5),
        personnelTrainingRisks: byCategories(['Personnel Risk', 'Training Risk']),
        apparatusInventoryRisks: byCategories(['Asset Readiness Risk', 'Inventory Risk', 'Maintenance Risk']),
        preventionRisks: byCategories(['Prevention Risk', 'Permit/Violation Risk']),
        integrationDataRisks: byCategories(['Integration Risk', 'Data Quality Risk', 'Incident Data Quality Risk', 'NERIS/ePCR Risk']),
        recommendedToday: insights.filter((insight) => ['Immediate', 'Within 24 hours'].includes(insight.estimatedTimeSensitivity)).slice(0, 6).map((insight) => ({ title: insight.title, recommendedAction: insight.recommendedAction, severity: insight.severity })),
        monitorThisWeek: insights.filter((insight) => ['This week', 'This month'].includes(insight.estimatedTimeSensitivity)).slice(0, 6).map((insight) => ({ title: insight.title, recommendedAction: insight.recommendedAction, severity: insight.severity })),
    };
}
function dedupeByStation(insights) {
    const seen = new Set();
    const result = [];
    for (const insight of insights) {
        if (!insight.affectedStationId || seen.has(insight.affectedStationId))
            continue;
        seen.add(insight.affectedStationId);
        result.push(insight);
    }
    return result;
}
// ---------------------------------------------------------------------------
// Insight generation from live shared data (rule engine)
// ---------------------------------------------------------------------------
const AI_CATEGORY_LIST = [
    'Staffing Risk', 'Training Risk', 'Personnel Risk', 'Incident Data Quality Risk', 'NERIS/ePCR Risk',
    'Asset Readiness Risk', 'Inventory Risk', 'Maintenance Risk', 'Prevention Risk', 'Permit/Violation Risk',
    'Integration Risk', 'Data Quality Risk', 'Station Readiness Risk', 'Executive Priority',
];
async function generateInsights(tenantId, userId) {
    const rules = await prisma_js_1.prisma.aiRule.findMany({ where: { tenantId, isActive: true } });
    const ruleActive = (code) => rules.some((rule) => rule.ruleCode === code);
    const generated = [];
    let criticalCreated = 0;
    const upsert = async (key, data) => {
        const id = `gen-${key}`;
        const existing = await prisma_js_1.prisma.aiInsight.findFirst({ where: { tenantId, id } });
        const evidence = data.__evidence;
        delete data.__evidence;
        const confidence = deriveConfidence(evidence);
        const payload = { ...data, id, tenantId, confidenceScore: confidence, updatedAt: nowIso() };
        if (existing) {
            await prisma_js_1.prisma.aiInsight.update({ where: { id }, data: { ...payload, status: existing.status } });
        }
        else {
            await prisma_js_1.prisma.aiInsight.create({ data: { ...payload, status: 'New', createdAt: nowIso(), isDeleted: false } });
            await prisma_js_1.prisma.aiInsightEvidence.deleteMany({ where: { tenantId, aiInsightId: id } });
            await Promise.all(evidence.map((item, index) => prisma_js_1.prisma.aiInsightEvidence.create({
                data: { id: `${id}-ev-${index + 1}`, tenantId, aiInsightId: id, sourceModule: item.sourceModule, entityName: item.entityName, entityId: item.entityId ?? null, evidenceType: item.evidenceType ?? 'metric', evidenceTitle: item.evidenceTitle, evidenceValue: item.evidenceValue, evidenceJson: item.evidenceJson ?? null, weight: item.weight ?? 5, createdAt: nowIso() },
            })));
            if (data.severity === 'Critical' || data.severity === 'High') {
                if (data.severity === 'Critical')
                    criticalCreated += 1;
                await notify(tenantId, `${data.severity} AI insight: ${data.title}`, data.summary, data.severity === 'Critical' ? 'ai.insight.critical' : 'ai.insight.high');
            }
        }
        generated.push(payload);
    };
    // A. Station readiness (Station Readiness Risk)
    if (ruleActive('STAFF-MIN') || ruleActive('PERS-READINESS')) {
        const stations = await prisma_js_1.prisma.station.findMany({ where: { tenantId } });
        for (const station of stations.filter((s) => Number(s.readinessScore) < 80)) {
            await upsert(`station-readiness-${station.id}`, {
                insightNumber: `AI-GEN-${station.id}`,
                title: `${station.name} readiness below target (${station.readinessScore})`,
                category: 'Station Readiness Risk', severity: Number(station.readinessScore) < 76 ? 'High' : 'Medium',
                priority: 'P2', sourceModulesJson: ['Stations', 'Staffing'], dataSources: ['Stations', 'Staffing'],
                affectedStationId: station.id, affectedScope: 'Station', estimatedTimeSensitivity: 'This week',
                readinessImpactScore: 100 - Number(station.readinessScore),
                summary: `${station.name} is at ${station.readinessScore} readiness with staffing status "${station.staffingStatus}".`,
                evidenceSummary: `Readiness ${station.readinessScore}; staffing ${station.staffingStatus}`,
                operationalImpact: `${station.name} readiness is below agency target.`,
                recommendedAction: `Review ${station.name} staffing and asset risks; close the largest gap first.`,
                recommendedActions: [`Review ${station.name} readiness`],
                impactArea: 'station readiness',
                __evidence: [
                    { sourceModule: 'Stations', entityName: 'Station', entityId: station.id, evidenceType: 'score', evidenceTitle: 'Readiness score', evidenceValue: String(station.readinessScore), weight: 7 },
                    { sourceModule: 'Staffing', entityName: 'Station', entityId: station.id, evidenceType: 'flag', evidenceTitle: 'Staffing status', evidenceValue: String(station.staffingStatus), weight: 5 },
                ],
            });
        }
    }
    // E/G. Integration risk (failed/degraded + stale)
    if (ruleActive('INT-FAIL') || ruleActive('INT-STALE')) {
        const systems = await prisma_js_1.prisma.integrationSystem.findMany({ where: { tenantId } });
        for (const system of systems.filter((s) => ['Degraded', 'Failed'].includes(s.status))) {
            await upsert(`integration-${system.id}`, {
                insightNumber: `AI-GEN-${system.id}`,
                title: `${system.name} integration is ${String(system.status).toLowerCase()}`,
                category: 'Integration Risk', severity: system.status === 'Failed' ? 'Critical' : 'High',
                priority: 'P2', sourceModulesJson: ['Integrations'], dataSources: ['Integrations'],
                affectedIntegrationSystemId: system.id, affectedScope: 'District', estimatedTimeSensitivity: 'Within 24 hours',
                readinessImpactScore: system.status === 'Failed' ? 70 : 50,
                summary: `${system.name} is reporting ${system.status} status, which can affect data exchange and reporting.`,
                evidenceSummary: `${system.name} status: ${system.status}`,
                operationalImpact: `${system.name} issues affect reporting quality and downstream modules.`,
                recommendedAction: `Test the ${system.name} connection, review error logs, and retry the failed sync.`,
                recommendedActions: [`Retry ${system.name} sync`],
                impactArea: 'reporting quality',
                __evidence: [
                    { sourceModule: 'Integrations', entityName: 'IntegrationSystem', entityId: system.id, evidenceType: 'flag', evidenceTitle: 'System status', evidenceValue: String(system.status), weight: 8 },
                    { sourceModule: 'Integrations', entityName: 'IntegrationSystem', entityId: system.id, evidenceType: 'metric', evidenceTitle: 'Success rate', evidenceValue: `${system.successRatePercent ?? '—'}%`, weight: 5 },
                ],
            });
        }
    }
    // F. Asset readiness (apparatus warning / out of service)
    if (ruleActive('ASSET-OOS')) {
        const apparatus = await prisma_js_1.prisma.apparatus.findMany({ where: { tenantId } });
        for (const unit of apparatus.filter((a) => ['Warning', 'Out of Service'].includes(a.status)).slice(0, 8)) {
            await upsert(`apparatus-${unit.id}`, {
                insightNumber: `AI-GEN-${unit.id}`,
                title: `${unit.unitNumber} status is ${unit.status}`,
                category: 'Asset Readiness Risk', severity: unit.status === 'Out of Service' ? 'High' : 'Medium',
                priority: 'P3', sourceModulesJson: ['Assets', 'Apparatus'], dataSources: ['Assets'],
                affectedApparatusId: unit.id, affectedStationId: unit.stationId ?? null, affectedScope: 'Single asset/property', estimatedTimeSensitivity: 'This week',
                readinessImpactScore: unit.status === 'Out of Service' ? 60 : 40,
                summary: `${unit.unitNumber} is ${unit.status} (readiness ${unit.readinessScore ?? '—'}).`,
                evidenceSummary: `${unit.unitNumber} status: ${unit.status}`,
                operationalImpact: `${unit.unitNumber} availability affects station coverage.`,
                recommendedAction: `Schedule maintenance for ${unit.unitNumber} and stage a reserve unit if needed.`,
                recommendedActions: [`Schedule maintenance for ${unit.unitNumber}`],
                impactArea: 'operational availability',
                __evidence: [
                    { sourceModule: 'Assets', entityName: 'Apparatus', entityId: unit.id, evidenceType: 'flag', evidenceTitle: 'Apparatus status', evidenceValue: String(unit.status), weight: 7 },
                ],
            });
        }
    }
    await writeAiAudit(tenantId, userId, 'Generated AI insights', undefined, { generated: generated.length, criticalCreated });
    return { generated: generated.length, criticalCreated, insights: generated.slice(0, 25) };
}
// ---------------------------------------------------------------------------
// Ask MissionOS (rule-based, optional provider passthrough)
// ---------------------------------------------------------------------------
async function ask(tenantId, userId, question) {
    const maps = await entityMaps(tenantId);
    const insights = applyInsightFilters(await prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }), { openOnly: 'true' })
        .map((insight) => enrich(insight, maps))
        .sort((left, right) => right.priorityScore - left.priorityScore);
    const snapshots = await prisma_js_1.prisma.aiReadinessSnapshot.findMany({ where: { tenantId }, orderBy: { snapshotDate: 'desc' } });
    const latest = snapshots[0];
    const lower = question.toLowerCase();
    let scope = insights;
    let intro = 'Here are the highest-priority cross-module signals right now';
    const sourceModules = new Set();
    if (/(station).*(risk|readiness|attention)|which station/.test(lower)) {
        scope = dedupeByStation(insights);
        intro = 'These stations carry the highest readiness risk';
    }
    else if (/train|certif|compliance/.test(lower)) {
        scope = insights.filter((insight) => ['Training Risk', 'Personnel Risk'].includes(insight.category));
        intro = 'Training and certification risks needing attention';
    }
    else if (/apparatus|asset|maintenance|inventory|equipment/.test(lower)) {
        scope = insights.filter((insight) => ['Asset Readiness Risk', 'Inventory Risk', 'Maintenance Risk'].includes(insight.category));
        intro = 'Asset, maintenance, and inventory risks affecting readiness';
    }
    else if (/inspect|permit|violation|prevention|preplan/.test(lower)) {
        scope = insights.filter((insight) => ['Prevention Risk', 'Permit/Violation Risk'].includes(insight.category));
        intro = 'Prevention and community-risk priorities';
    }
    else if (/integrat|sync|cad|neris|epcr|gis/.test(lower)) {
        scope = insights.filter((insight) => ['Integration Risk', 'NERIS/ePCR Risk'].includes(insight.category));
        intro = 'Integration and exchange issues that could affect reporting';
    }
    else if (/data quality|duplicate|reporting/.test(lower)) {
        scope = insights.filter((insight) => ['Data Quality Risk', 'Incident Data Quality Risk'].includes(insight.category));
        intro = 'Data quality issues affecting reporting';
    }
    else if (/staff|overtime|coverage|shift/.test(lower)) {
        scope = insights.filter((insight) => insight.category === 'Staffing Risk');
        intro = 'Staffing and coverage risks';
    }
    else if (/readiness score|agency/.test(lower)) {
        intro = `District readiness is ${latest?.agencyReadinessScore ?? 82}% (${latest?.overallRiskLevel ?? 'Medium'} overall risk). Leading signals`;
    }
    else {
        const stationMatch = lower.match(/station\s*(\d+)/);
        if (stationMatch) {
            const stationId = `station-${stationMatch[1]}`;
            scope = insights.filter((insight) => insight.affectedStationId === stationId);
            intro = `Summary for Station ${stationMatch[1]}`;
        }
    }
    const top = scope.slice(0, 5);
    top.forEach((insight) => (insight.sourceModulesJson ?? []).forEach((module) => sourceModules.add(module)));
    const bullets = top.map((insight) => `• ${insight.title} (${insight.severity}, priority ${insight.priorityScore}) — ${insight.recommendedAction}`);
    const localAnswer = top.length
        ? `${intro}:\n${bullets.join('\n')}`
        : `${intro}: no open insights match that question right now. District readiness is ${latest?.agencyReadinessScore ?? 82}%.`;
    const relatedRecords = top.flatMap((insight) => insight.relatedRecords ?? []).slice(0, 8);
    const suggestedActions = [...new Set(top.map((insight) => insight.recommendedAction))].slice(0, 5);
    const confidence = top.length ? Math.round(top.reduce((sum, insight) => sum + Number(insight.confidenceScore ?? 0), 0) / top.length) : 70;
    const context = { question, localAnswer, confidence, sourceModules: [...sourceModules], relatedRecords: relatedRecords.map((record) => ({ type: record.type, id: record.id, label: record.label })), suggestedActions };
    const providers = await prisma_js_1.prisma.aiProviderConfig.findMany({ where: { tenantId } });
    const provider = await (0, providers_js_1.resolveActiveProvider)(providers);
    const result = await provider.answer(context);
    const log = await prisma_js_1.prisma.aiQuestionLog.create({
        data: { tenantId, userId: userId ?? null, question, answer: result.answer, sourceModulesJson: [...sourceModules], confidenceScore: result.confidence, createdAt: nowIso() },
    });
    return {
        answer: result.answer,
        provider: result.provider,
        usedLlm: result.usedLlm,
        confidence: result.confidence,
        sourceModules: [...sourceModules],
        relatedRecords: context.relatedRecords,
        suggestedActions,
        logId: log.id,
    };
}
async function questionHistory(tenantId) {
    const items = await prisma_js_1.prisma.aiQuestionLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    return { items: items.slice(0, 50), page: 1, take: 50, total: items.length };
}
// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------
async function listRules(tenantId, filters = {}) {
    let rules = await prisma_js_1.prisma.aiRule.findMany({ where: { tenantId } });
    if (filters.category)
        rules = rules.filter((rule) => rule.category === filters.category);
    if (filters.active)
        rules = rules.filter((rule) => String(rule.isActive) === filters.active);
    return { items: rules, page: 1, take: rules.length, total: rules.length };
}
async function createRule(tenantId, userId, body) {
    const rule = await prisma_js_1.prisma.aiRule.create({
        data: {
            tenantId, ruleCode: body.ruleCode ?? `RULE-${Date.now()}`, name: body.name ?? 'New rule', category: body.category ?? 'Executive Priority',
            description: body.description ?? '', severityDefault: body.severityDefault ?? 'Medium', isActive: body.isActive ?? true,
            configJson: body.configJson ?? {}, lastTriggeredCount: 0, createdAt: nowIso(), updatedAt: nowIso(),
        },
    });
    await writeAiAudit(tenantId, userId, 'Created AI rule', rule.id, { rule: rule.ruleCode });
    return rule;
}
async function updateRule(tenantId, id, userId, body) {
    const rule = await prisma_js_1.prisma.aiRule.update({ where: { id }, data: { ...body, updatedAt: nowIso() } });
    await writeAiAudit(tenantId, userId, 'Updated AI rule', id, body);
    return rule;
}
async function setRuleActive(tenantId, id, userId, isActive) {
    const rule = await prisma_js_1.prisma.aiRule.update({ where: { id }, data: { isActive, updatedAt: nowIso() } });
    await writeAiAudit(tenantId, userId, isActive ? 'Enabled AI rule' : 'Disabled AI rule', id, { isActive });
    return rule;
}
// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
async function listProviders(tenantId) {
    return { items: await prisma_js_1.prisma.aiProviderConfig.findMany({ where: { tenantId } }) };
}
async function updateProvider(tenantId, id, userId, body) {
    const provider = await prisma_js_1.prisma.aiProviderConfig.update({ where: { id }, data: { ...body, updatedAt: nowIso() } });
    await writeAiAudit(tenantId, userId, 'Updated AI provider config', id, { enabled: body.enabled, provider: provider.providerName });
    return provider;
}
async function testProvider(tenantId, id, userId) {
    const provider = await prisma_js_1.prisma.aiProviderConfig.findFirst({ where: { tenantId, id } });
    if (!provider)
        throw new Error('Provider not found');
    await writeAiAudit(tenantId, userId, 'Tested AI provider', id, { provider: provider.providerName });
    if (provider.providerType === 'rule-engine') {
        return { ok: true, reachable: true, message: 'Local Rule Engine is always available.', usedLlm: false };
    }
    // Placeholder: no real network call. Report config-readiness only.
    const ready = Boolean(provider.enabled && provider.baseUrl && (provider.providerType === 'ollama' || provider.apiKeyConfigured));
    return {
        ok: ready,
        reachable: false,
        message: ready
            ? `${provider.providerName} is configured; live connectivity test is a placeholder (no external call performed).`
            : `${provider.providerName} is not fully configured. Enable it and set base URL / API key to use it. The Local Rule Engine remains active.`,
        usedLlm: false,
    };
}
// ---------------------------------------------------------------------------
// Module risk views
// ---------------------------------------------------------------------------
async function getModuleRisk(tenantId, module) {
    const maps = await entityMaps(tenantId);
    const insights = (await prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }))
        .filter((insight) => !insight.isDeleted)
        .map((insight) => enrich(insight, maps))
        .sort((left, right) => right.priorityScore - left.priorityScore);
    const byCategories = (categories) => insights.filter((insight) => categories.includes(insight.category));
    const moduleMap = {
        staffing: { categories: ['Staffing Risk'], label: 'Staffing Risk' },
        training: { categories: ['Training Risk'], label: 'Training Risk' },
        personnel: { categories: ['Personnel Risk'], label: 'Personnel Risk' },
        incidents: { categories: ['Incident Data Quality Risk', 'NERIS/ePCR Risk'], label: 'Incident Data Risk' },
        assets: { categories: ['Asset Readiness Risk', 'Inventory Risk', 'Maintenance Risk'], label: 'Asset Risk' },
        prevention: { categories: ['Prevention Risk', 'Permit/Violation Risk'], label: 'Prevention Risk' },
        integrations: { categories: ['Integration Risk'], label: 'Integration Risk' },
        'data-quality': { categories: ['Data Quality Risk'], label: 'Data Quality Risk' },
        stations: { categories: ['Station Readiness Risk', 'Executive Priority'], label: 'Station Risk' },
    };
    const config = moduleMap[module] ?? { categories: AI_CATEGORY_LIST, label: 'All Risk' };
    const list = byCategories(config.categories);
    return {
        module, label: config.label,
        summary: {
            total: list.length,
            open: list.filter((insight) => OPEN_STATUSES.includes(insight.status)).length,
            critical: list.filter((insight) => insight.severity === 'Critical').length,
            high: list.filter((insight) => insight.severity === 'High').length,
            averagePriority: list.length ? Math.round(list.reduce((sum, insight) => sum + insight.priorityScore, 0) / list.length) : 0,
        },
        insights: list,
    };
}
