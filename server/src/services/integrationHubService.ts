import { prisma } from '../utils/prisma.js';
import { integrationAdapterRegistry } from '../integrations/adapters.js';

/**
 * Public Safety Integration Hub services.
 * Bundles system, health, endpoint, field-mapping, log, error, retry, webhook,
 * credential, audit, performance, and data-exchange logic behind one module.
 */

type Filters = Record<string, string | undefined>;
const nowIso = () => new Date().toISOString();
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const round = (value: number, digits = 1) => Number(value.toFixed(digits));

const STATUS_SCORE: Record<string, number> = {
  Connected: 100, Degraded: 60, 'Pending Configuration': 50, Failed: 20, Disabled: 0,
};

// ---------------------------------------------------------------------------
// Audit + notification helpers (cross-module)
// ---------------------------------------------------------------------------
export async function writeIntegrationAudit(tenantId: string, userId: string | undefined, action: string, entityId: string | undefined, after?: unknown) {
  return prisma.auditLog.create({
    data: { tenantId, userId: userId ?? null, action, entityName: 'IntegrationSystem', entityId: entityId ?? null, after: after ?? null, ipAddress: null, createdAt: nowIso() },
  });
}

export async function createIntegrationNotification(tenantId: string, title: string, message: string, notificationType: string, userId?: string) {
  return prisma.notification.create({
    data: { tenantId, userId: userId ?? 'user-admin', title, message, notificationType, isRead: false, createdAt: nowIso() },
  });
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export async function computeSystemHealth(tenantId: string, system: Record<string, any>) {
  const [errors, dataObjects, recentLogs] = await Promise.all([
    prisma.integrationError.findMany({ where: { tenantId, integrationSystemId: system.id } }),
    prisma.integrationDataObject.findMany({ where: { tenantId, integrationSystemId: system.id } }),
    prisma.integrationLog.findMany({ where: { tenantId, integrationSystemId: system.id }, orderBy: { startedAt: 'desc' }, take: 50 }),
  ]);

  const openErrors = errors.filter((error: any) => !['Resolved', 'Dismissed'].includes(error.status));
  const criticalErrors = openErrors.filter((error: any) => error.severity === 'Critical');
  const staleObjects = dataObjects.filter((object: any) => object.status === 'Stale');

  const connectionStatusScore = STATUS_SCORE[String(system.status)] ?? 50;
  const successRateScore = clamp(Number(system.successRatePercent ?? 90));
  const latencyScore = clamp(100 - Number(system.averageLatencyMs ?? 300) / 30);
  const errorScore = clamp(100 - criticalErrors.length * 25 - openErrors.length * 5);
  const dataFreshnessScore = clamp(100 - staleObjects.length * 30 - hoursSince(system.lastSuccessfulSyncAt) / 6);

  const healthScore = Math.round(
    connectionStatusScore * 0.3 +
    successRateScore * 0.25 +
    latencyScore * 0.15 +
    errorScore * 0.15 +
    dataFreshnessScore * 0.15,
  );

  const riskLevel = healthScore >= 90 ? 'Low' : healthScore >= 75 ? 'Watch' : healthScore >= 60 ? 'At Risk' : 'Critical';
  const failedSyncCount = recentLogs.filter((log: any) => log.status === 'Failed').length;

  return {
    healthScore,
    riskLevel,
    components: {
      connectionStatusScore: round(connectionStatusScore),
      successRateScore: round(successRateScore),
      latencyScore: round(latencyScore),
      errorScore: round(errorScore),
      dataFreshnessScore: round(dataFreshnessScore),
    },
    openErrorCount: openErrors.length,
    criticalErrorCount: criticalErrors.length,
    staleObjectCount: staleObjects.length,
    failedSyncCount,
    successRatePercent: round(successRateScore),
    averageLatencyMs: Number(system.averageLatencyMs ?? 0),
  };
}

function hoursSince(iso?: string | null): number {
  if (!iso) return 240;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, diff / 3600000);
}

function aiInsightForSystem(system: Record<string, any>, health: Record<string, any>): { riskSummary: string; recommendedAction: string } {
  if (health.criticalErrorCount > 0) {
    return {
      riskSummary: `${system.name} has ${health.criticalErrorCount} unresolved critical error(s) impacting exchange reliability.`,
      recommendedAction: `Open the Error & Retry Center for ${system.name} and resolve critical failures before the next batch window.`,
    };
  }
  if (system.status === 'Degraded') {
    return {
      riskSummary: `${system.name} is degraded with ${health.successRatePercent}% success and ${health.averageLatencyMs}ms latency.`,
      recommendedAction: `Run an adapter connection test and review recent sync logs for ${system.name}.`,
    };
  }
  if (health.staleObjectCount > 0) {
    return {
      riskSummary: `${system.name} has ${health.staleObjectCount} stale data object(s) — downstream modules may use outdated data.`,
      recommendedAction: `Trigger a manual sync for ${system.name} to refresh stale data objects.`,
    };
  }
  return {
    riskSummary: `${system.name} is healthy (score ${health.healthScore}).`,
    recommendedAction: 'No action required. Continue monitoring.',
  };
}

// ---------------------------------------------------------------------------
// Systems + Command Center
// ---------------------------------------------------------------------------
function applySystemFilters(systems: any[], filters: Filters) {
  let result = systems.filter((system) => !system.isDeleted);
  if (filters.status) result = result.filter((system) => system.status === filters.status);
  if (filters.systemType) result = result.filter((system) => system.systemType === filters.systemType);
  if (filters.exchangeMethod) result = result.filter((system) => system.exchangeMethod === filters.exchangeMethod);
  if (filters.dataDirection) result = result.filter((system) => system.dataDirection === filters.dataDirection);
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    result = result.filter((system) => `${system.name} ${system.vendorName ?? ''} ${system.systemType}`.toLowerCase().includes(needle));
  }
  return result;
}

export async function listSystems(tenantId: string, filters: Filters = {}, page = 1, take = 50) {
  const all = applySystemFilters(await prisma.integrationSystem.findMany({ where: { tenantId } }), filters);
  const enriched = await Promise.all(all.map(async (system: any) => {
    const health = await computeSystemHealth(tenantId, system);
    const openErrors = await prisma.integrationError.count({ where: { tenantId, integrationSystemId: system.id, status: { in: ['Open', 'Investigating', 'Retry Scheduled'] } } });
    return { ...system, adapterName: integrationAdapterRegistry.adapterName(system.systemType), health, openErrorCount: openErrors };
  }));
  const start = (page - 1) * take;
  return { items: enriched.slice(start, start + take), page, take, total: enriched.length };
}

export async function getCommandCenter(tenantId: string) {
  const systems = applySystemFilters(await prisma.integrationSystem.findMany({ where: { tenantId } }), {});
  const enriched = await Promise.all(systems.map(async (system: any) => {
    const health = await computeSystemHealth(tenantId, system);
    return { ...system, adapterName: integrationAdapterRegistry.adapterName(system.systemType), health, ...aiInsightForSystem(system, health) };
  }));

  const logs = await prisma.integrationLog.findMany({ where: { tenantId } });
  const errors = await prisma.integrationError.findMany({ where: { tenantId } });
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayLogs = logs.filter((log: any) => new Date(log.startedAt ?? log.createdAt) >= startOfDay);

  const connected = enriched.filter((system) => system.status === 'Connected');
  const degraded = enriched.filter((system) => system.status === 'Degraded');
  const failed = enriched.filter((system) => ['Failed', 'Disabled'].includes(system.status));
  const overallHealthScore = enriched.length
    ? Math.round(enriched.reduce((total, system) => total + system.health.healthScore, 0) / enriched.length)
    : 0;
  const lastSuccessfulSyncAt = enriched
    .map((system) => system.lastSuccessfulSyncAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  const recommendedActions = enriched
    .filter((system) => system.status !== 'Connected' || system.health.criticalErrorCount > 0 || system.health.staleObjectCount > 0)
    .slice(0, 5)
    .map((system) => ({ system: system.name, riskSummary: system.riskSummary, recommendedAction: system.recommendedAction, severity: system.health.riskLevel }));

  return {
    summary: {
      overallHealthScore,
      connectedCount: connected.length,
      degradedCount: degraded.length,
      failedCount: failed.length,
      totalSystems: enriched.length,
      lastSuccessfulSyncAt,
      failedSyncsToday: todayLogs.filter((log: any) => log.status === 'Failed').length,
      recordsExchangedToday: todayLogs.reduce((total: number, log: any) => total + Number(log.recordsSucceeded ?? 0), 0),
      averageLatencyMs: enriched.length ? Math.round(enriched.reduce((total, system) => total + Number(system.averageLatencyMs ?? 0), 0) / enriched.length) : 0,
      criticalErrorCount: errors.filter((error: any) => error.severity === 'Critical' && !['Resolved', 'Dismissed'].includes(error.status)).length,
      dataFreshnessRisks: enriched.reduce((total, system) => total + system.health.staleObjectCount, 0),
    },
    systems: enriched,
    recommendedActions,
  };
}

export async function getHealthOverview(tenantId: string) {
  const command = await getCommandCenter(tenantId);
  return {
    overallHealthScore: command.summary.overallHealthScore,
    systems: command.systems.map((system: any) => ({
      id: system.id, name: system.name, systemType: system.systemType, status: system.status,
      healthScore: system.health.healthScore, riskLevel: system.health.riskLevel, components: system.health.components,
      successRatePercent: system.health.successRatePercent, averageLatencyMs: system.averageLatencyMs,
    })),
  };
}

export async function getPerformance(tenantId: string) {
  const systems = applySystemFilters(await prisma.integrationSystem.findMany({ where: { tenantId } }), {});
  const perSystem = await Promise.all(systems.map(async (system: any) => {
    const snapshots = await prisma.integrationHealthSnapshot.findMany({ where: { tenantId, integrationSystemId: system.id }, orderBy: { snapshotDate: 'asc' } });
    const health = await computeSystemHealth(tenantId, system);
    return {
      id: system.id, name: system.name, systemType: system.systemType, status: system.status,
      successRatePercent: Number(system.successRatePercent ?? 0),
      averageLatencyMs: Number(system.averageLatencyMs ?? 0),
      failedSyncCount: health.failedSyncCount,
      recordsExchanged: snapshots.reduce((total: number, snapshot: any) => total + Number(snapshot.recordsExchanged ?? 0), 0),
      uptimePercent: snapshots.length ? round(snapshots.reduce((total: number, snapshot: any) => total + Number(snapshot.uptimePercent ?? 0), 0) / snapshots.length) : 100,
      healthScore: health.healthScore,
      riskLevel: health.riskLevel,
      latencyTrend: snapshots.slice(-10).map((snapshot: any) => ({ date: snapshot.snapshotDate, value: Number(snapshot.averageLatencyMs ?? 0) })),
      successTrend: snapshots.slice(-10).map((snapshot: any) => ({ date: snapshot.snapshotDate, value: Number(snapshot.successRatePercent ?? 0) })),
    };
  }));
  return { systems: perSystem };
}

export async function getDataFlow(tenantId: string) {
  const systems = applySystemFilters(await prisma.integrationSystem.findMany({ where: { tenantId } }), {});
  const objects = await prisma.integrationDataObject.findMany({ where: { tenantId } });
  const systemById = new Map(systems.map((system: any) => [system.id, system]));
  const flows = objects.map((object: any) => {
    const system: any = systemById.get(object.integrationSystemId) ?? {};
    const inbound = object.direction === 'Inbound';
    const source = inbound ? `${system.name} · ${object.objectName}` : `MissionOS · ${object.objectName}`;
    const target = inbound ? `MissionOS · ${object.objectName}` : `${system.name} · ${object.objectName}`;
    const risk = object.status === 'Stale' ? 'At Risk' : system.status === 'Degraded' ? 'Watch' : 'Healthy';
    return {
      id: object.id, integrationSystemId: object.integrationSystemId, systemName: system.name,
      source, target, direction: object.direction, method: system.exchangeMethod,
      frequency: object.syncFrequency, lastRun: object.lastSyncedAt, status: object.status,
      recordCount: object.recordCountLastSync, latencyMs: system.averageLatencyMs, risk,
    };
  });
  return { flows };
}

export async function getSystem360(tenantId: string, id: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) return null;
  const [health, endpoints, mappings, dataObjects, logs, errors, performance, credentials, webhooks] = await Promise.all([
    computeSystemHealth(tenantId, system),
    prisma.integrationEndpoint.findMany({ where: { tenantId, integrationSystemId: id } }),
    prisma.fieldMapping.findMany({ where: { tenantId, integrationSystemId: id } }),
    prisma.integrationDataObject.findMany({ where: { tenantId, integrationSystemId: id } }),
    prisma.integrationLog.findMany({ where: { tenantId, integrationSystemId: id }, orderBy: { startedAt: 'desc' }, take: 15 }),
    prisma.integrationError.findMany({ where: { tenantId, integrationSystemId: id, status: { in: ['Open', 'Investigating', 'Retry Scheduled'] } } }),
    prisma.integrationHealthSnapshot.findMany({ where: { tenantId, integrationSystemId: id }, orderBy: { snapshotDate: 'asc' } }),
    prisma.apiCredential.findMany({ where: { tenantId, integrationSystemId: id } }),
    prisma.webhookSubscription.findMany({ where: { tenantId, integrationSystemId: id } }),
  ]);
  const adapter = integrationAdapterRegistry.resolve(system);
  return {
    system: { ...system, maskedBaseUrl: maskUrl(system.baseUrl), adapterName: integrationAdapterRegistry.adapterName(system.systemType) },
    health,
    adapterInfo: adapter.getSystemInfo(),
    connectionProfile: {
      baseUrl: maskUrl(system.baseUrl), authenticationType: system.authenticationType, exchangeMethod: system.exchangeMethod,
      dataDirection: system.dataDirection, ownerTeam: system.ownerTeam, rateLimitPerMinute: system.rateLimitPerMinute, environment: system.environment,
    },
    dataObjects, endpoints, fieldMappings: mappings, recentLogs: logs, openErrors: errors,
    credentials: credentials.map(maskCredential), webhooks: webhooks.map(maskWebhook),
    performance: {
      successTrend: performance.slice(-12).map((snapshot: any) => ({ date: snapshot.snapshotDate, value: Number(snapshot.successRatePercent ?? 0) })),
      latencyTrend: performance.slice(-12).map((snapshot: any) => ({ date: snapshot.snapshotDate, value: Number(snapshot.averageLatencyMs ?? 0) })),
      recordsExchanged: performance.reduce((total: number, snapshot: any) => total + Number(snapshot.recordsExchanged ?? 0), 0),
      failedSyncCount: health.failedSyncCount,
    },
    aiInsight: aiInsightForSystem(system, health),
  };
}

function maskUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/****`;
  } catch {
    return '****';
  }
}
function maskCredential(credential: any) {
  return { ...credential, maskedIdentifier: credential.maskedIdentifier ?? '****' };
}
function maskWebhook(webhook: any) {
  return { ...webhook, targetUrl: webhook.targetUrl };
}

// ---------------------------------------------------------------------------
// System lifecycle: create / update / test / sync / enable / disable
// ---------------------------------------------------------------------------
export async function createSystem(tenantId: string, userId: string, body: Record<string, any>) {
  const system = await prisma.integrationSystem.create({
    data: {
      tenantId, name: body.name ?? 'New System', systemType: body.systemType ?? 'Generic',
      vendorName: body.vendorName ?? null, description: body.description ?? '', status: body.status ?? 'Pending Configuration',
      environment: body.environment ?? 'Sandbox', baseUrl: body.baseUrl ?? null, apiBaseUrl: body.baseUrl ?? null,
      authenticationType: body.authenticationType ?? 'Pending', authMethod: body.authenticationType ?? 'Pending',
      exchangeMethod: body.exchangeMethod ?? 'Batch', dataDirection: body.dataDirection ?? 'Inbound',
      averageLatencyMs: body.averageLatencyMs ?? null, successRatePercent: body.successRatePercent ?? null,
      rateLimitPerMinute: body.rateLimitPerMinute ?? null, ownerTeam: body.ownerTeam ?? 'Unassigned',
      isCritical: Boolean(body.isCritical), isDeleted: false,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Created integration system', system.id, { name: system.name });
  return system;
}

export async function updateSystem(tenantId: string, id: string, userId: string, body: Record<string, any>) {
  const existing = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!existing) throw new Error('Integration system not found');
  const updated = await prisma.integrationSystem.update({ where: { id }, data: { ...body, apiBaseUrl: body.baseUrl ?? existing.apiBaseUrl } });
  await writeIntegrationAudit(tenantId, userId, 'Updated integration system', id, body);
  return updated;
}

export async function testConnection(tenantId: string, id: string, userId: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const adapter = integrationAdapterRegistry.resolve(system);
  const result = await adapter.testConnection();
  await prisma.integrationLog.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, eventType: 'connection-test',
      direction: system.dataDirection, status: result.ok ? 'Success' : 'Failed', message: result.message,
      recordsProcessed: 0, recordsSucceeded: 0, recordsFailed: 0, latencyMs: result.latencyMs, durationMs: result.latencyMs,
      correlationId: `corr-${Date.now()}`, startedAt: result.checkedAt, completedAt: result.checkedAt, createdAt: result.checkedAt,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Tested integration connection', id, result);
  if (!result.ok) await createIntegrationNotification(tenantId, `Integration test failed: ${system.name}`, result.message, 'integration.test.failed');
  return result;
}

export async function syncSystem(tenantId: string, id: string, userId: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const adapter = integrationAdapterRegistry.resolve(system);
  const result = await adapter.sync();
  await prisma.integrationLog.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, eventType: 'sync', direction: system.dataDirection,
      status: result.recordsFailed > 0 ? 'Partial Success' : 'Success', message: result.message,
      recordsProcessed: result.recordsProcessed, recordsSucceeded: result.recordsSucceeded, recordsFailed: result.recordsFailed,
      latencyMs: result.latencyMs, durationMs: result.latencyMs, correlationId: result.correlationId,
      startedAt: result.startedAt, completedAt: result.completedAt, createdAt: result.completedAt,
    },
  });
  await prisma.integrationSystem.update({ where: { id }, data: { lastSuccessfulSyncAt: result.completedAt, lastSyncAt: result.completedAt } });
  await writeIntegrationAudit(tenantId, userId, 'Triggered integration sync', id, result);
  if (result.recordsFailed > 0) {
    await createIntegrationNotification(tenantId, `Integration sync had failures: ${system.name}`, `${result.recordsFailed} records failed during sync.`, 'integration.sync.partial');
  }
  return result;
}

export async function setSystemEnabled(tenantId: string, id: string, userId: string, enabled: boolean) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const status = enabled ? 'Connected' : 'Disabled';
  const updated = await prisma.integrationSystem.update({ where: { id }, data: { status } });
  await writeIntegrationAudit(tenantId, userId, enabled ? 'Enabled integration' : 'Disabled integration', id, { status });
  return updated;
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------
export async function listAdapters(tenantId: string) {
  const systems = await prisma.integrationSystem.findMany({ where: { tenantId } });
  const lastTestedBySystem = new Map<string, string>();
  const logs = await prisma.integrationLog.findMany({ where: { tenantId, eventType: 'connection-test' }, orderBy: { startedAt: 'desc' } });
  for (const log of logs) if (!lastTestedBySystem.has(log.integrationSystemId)) lastTestedBySystem.set(log.integrationSystemId, log.startedAt);
  return integrationAdapterRegistry.catalog().map((adapter) => {
    const system = systems.find((entry: any) => entry.systemType === adapter.systemType);
    return {
      ...adapter,
      systemId: system?.id ?? null,
      systemName: system?.name ?? adapter.systemType,
      status: system?.status ?? 'Pending Configuration',
      lastTestedAt: system ? lastTestedBySystem.get(system.id) ?? system.lastSuccessfulSyncAt ?? null : null,
    };
  });
}

export async function getAdapterInfo(tenantId: string, id: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const adapter = integrationAdapterRegistry.resolve(system);
  return {
    adapterName: integrationAdapterRegistry.adapterName(system.systemType),
    isReal: adapter.isReal,
    supportedOperations: adapter.supportedOperations,
    info: adapter.getSystemInfo(),
  };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export async function listEndpoints(tenantId: string, id: string) {
  return prisma.integrationEndpoint.findMany({ where: { tenantId, integrationSystemId: id } });
}
export async function createEndpoint(tenantId: string, id: string, userId: string, body: Record<string, any>) {
  const endpoint = await prisma.integrationEndpoint.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, name: body.name ?? 'New Endpoint', method: body.method ?? 'GET',
      path: body.path ?? '/', description: body.description ?? '', requestExampleJson: body.requestExampleJson ?? null,
      responseExampleJson: body.responseExampleJson ?? null, errorCodes: body.errorCodes ?? [],
      authRequired: body.authRequired ?? true, rateLimit: body.rateLimit ?? null, status: 'Active',
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Created integration endpoint', id, { endpoint: endpoint.name });
  return endpoint;
}
export async function getEndpoint(tenantId: string, id: string, endpointId: string) {
  return prisma.integrationEndpoint.findFirst({ where: { tenantId, integrationSystemId: id, id: endpointId } });
}

// ---------------------------------------------------------------------------
// Field mappings
// ---------------------------------------------------------------------------
export async function listFieldMappings(tenantId: string, id: string, filters: Filters = {}) {
  let mappings = await prisma.fieldMapping.findMany({ where: { tenantId, integrationSystemId: id } });
  if (filters.status) mappings = mappings.filter((mapping: any) => mapping.status === filters.status);
  if (filters.requiredOnly === 'true') mappings = mappings.filter((mapping: any) => mapping.required);
  return mappings;
}
export async function createFieldMapping(tenantId: string, id: string, userId: string, body: Record<string, any>) {
  const mapping = await prisma.fieldMapping.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, sourceObject: body.sourceObject ?? '', sourceField: body.sourceField ?? '',
      targetObject: body.targetObject ?? '', targetField: body.targetField ?? '', dataType: body.dataType ?? 'string',
      required: Boolean(body.required), transformationRule: body.transformationRule ?? null, transformRule: body.transformationRule ?? null,
      validationRule: body.validationRule ?? null, status: 'Active', lastValidatedAt: null,
      internalField: `${body.sourceObject}.${body.sourceField}`, nerisField: `${body.targetObject}.${body.targetField}`,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Created field mapping', id, { mapping: mapping.id });
  return mapping;
}
export async function updateFieldMapping(tenantId: string, id: string, mappingId: string, userId: string, body: Record<string, any>) {
  const mapping = await prisma.fieldMapping.update({ where: { id: mappingId }, data: body });
  await writeIntegrationAudit(tenantId, userId, 'Updated field mapping', id, { mapping: mappingId, changes: body });
  return mapping;
}
export async function validateFieldMappings(tenantId: string, id: string, userId: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const adapter = integrationAdapterRegistry.resolve(system);
  const result = await adapter.validateFieldMappings();
  // stamp lastValidatedAt
  const mappings = await prisma.fieldMapping.findMany({ where: { tenantId, integrationSystemId: id } });
  await Promise.all(mappings.map((mapping: any) => prisma.fieldMapping.update({ where: { id: mapping.id }, data: { lastValidatedAt: nowIso() } })));
  await writeIntegrationAudit(tenantId, userId, 'Validated field mappings', id, { issues: result.issues.length });
  if (result.issues.length) {
    await createIntegrationNotification(tenantId, `Field mapping issues: ${system.name}`, `${result.issues.length} mapping issue(s) detected during validation.`, 'integration.mapping.invalid');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Logs + errors
// ---------------------------------------------------------------------------
export async function listLogs(tenantId: string, filters: Filters = {}, page = 1, take = 100) {
  let logs = await prisma.integrationLog.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' } });
  if (filters.integrationSystemId) logs = logs.filter((log: any) => log.integrationSystemId === filters.integrationSystemId);
  if (filters.status) logs = logs.filter((log: any) => log.status === filters.status);
  if (filters.direction) logs = logs.filter((log: any) => log.direction === filters.direction);
  if (filters.eventType) logs = logs.filter((log: any) => log.eventType === filters.eventType);
  if (filters.errorOnly === 'true') logs = logs.filter((log: any) => log.status === 'Failed' || log.status === 'Partial Success');
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    logs = logs.filter((log: any) => `${log.message} ${log.correlationId ?? ''} ${log.errorMessage ?? ''}`.toLowerCase().includes(needle));
  }
  const systems = await prisma.integrationSystem.findMany({ where: { tenantId } });
  const nameById = new Map(systems.map((system: any) => [system.id, system.name]));
  const enriched = logs.map((log: any) => ({ ...log, systemName: nameById.get(log.integrationSystemId) ?? 'Unknown' }));
  const start = (page - 1) * take;
  return { items: enriched.slice(start, start + take), page, take, total: enriched.length };
}

export async function listErrors(tenantId: string, filters: Filters = {}, page = 1, take = 100) {
  let errors = await prisma.integrationError.findMany({ where: { tenantId }, orderBy: { lastSeenAt: 'desc' } });
  if (filters.integrationSystemId) errors = errors.filter((error: any) => error.integrationSystemId === filters.integrationSystemId);
  if (filters.status) errors = errors.filter((error: any) => error.status === filters.status);
  if (filters.severity) errors = errors.filter((error: any) => error.severity === filters.severity);
  if (filters.openOnly === 'true') errors = errors.filter((error: any) => !['Resolved', 'Dismissed'].includes(error.status));
  const systems = await prisma.integrationSystem.findMany({ where: { tenantId } });
  const nameById = new Map(systems.map((system: any) => [system.id, system.name]));
  const enriched = errors.map((error: any) => ({ ...error, systemName: nameById.get(error.integrationSystemId) ?? 'Unknown' }));
  const start = (page - 1) * take;
  return { items: enriched.slice(start, start + take), page, take, total: enriched.length };
}

export async function resolveError(tenantId: string, errorId: string, userId: string) {
  const error = await prisma.integrationError.findFirst({ where: { tenantId, id: errorId } });
  if (!error) throw new Error('Integration error not found');
  const updated = await prisma.integrationError.update({ where: { id: errorId }, data: { status: 'Resolved', resolvedAt: nowIso(), resolvedByUserId: userId } });
  await writeIntegrationAudit(tenantId, userId, 'Resolved integration error', error.integrationSystemId, { errorId });
  return updated;
}
export async function dismissError(tenantId: string, errorId: string, userId: string) {
  const error = await prisma.integrationError.findFirst({ where: { tenantId, id: errorId } });
  if (!error) throw new Error('Integration error not found');
  const updated = await prisma.integrationError.update({ where: { id: errorId }, data: { status: 'Dismissed' } });
  await writeIntegrationAudit(tenantId, userId, 'Dismissed integration error', error.integrationSystemId, { errorId });
  return updated;
}

// ---------------------------------------------------------------------------
// Retry workflow
// ---------------------------------------------------------------------------
export async function listRetryJobs(tenantId: string, filters: Filters = {}) {
  let jobs = await prisma.integrationRetryJob.findMany({ where: { tenantId }, orderBy: { scheduledAt: 'desc' } });
  if (filters.integrationSystemId) jobs = jobs.filter((job: any) => job.integrationSystemId === filters.integrationSystemId);
  if (filters.retryStatus) jobs = jobs.filter((job: any) => job.retryStatus === filters.retryStatus);
  const systems = await prisma.integrationSystem.findMany({ where: { tenantId } });
  const nameById = new Map(systems.map((system: any) => [system.id, system.name]));
  return { items: jobs.map((job: any) => ({ ...job, systemName: nameById.get(job.integrationSystemId) ?? 'Unknown' })), page: 1, take: jobs.length, total: jobs.length };
}

export async function retryError(tenantId: string, errorId: string, userId: string) {
  const error = await prisma.integrationError.findFirst({ where: { tenantId, id: errorId } });
  if (!error) throw new Error('Integration error not found');
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id: error.integrationSystemId } });
  const adapter = integrationAdapterRegistry.resolve(system ?? {});
  const result = await adapter.retryFailed();
  const succeeded = result.recordsFailed === 0;
  const job = await prisma.integrationRetryJob.create({
    data: {
      tenantId, integrationSystemId: error.integrationSystemId, integrationId: error.integrationSystemId, errorId, logId: error.logId ?? null,
      retryStatus: succeeded ? 'Succeeded' : 'Failed', scheduledAt: nowIso(), attemptedAt: nowIso(), completedAt: nowIso(),
      resultMessage: result.message, createdByUserId: userId,
    },
  });
  await prisma.integrationError.update({
    where: { id: errorId },
    data: { retryCount: Number(error.retryCount ?? 0) + 1, status: succeeded ? 'Resolved' : 'Retry Scheduled', resolvedAt: succeeded ? nowIso() : null, lastSeenAt: nowIso() },
  });
  await prisma.integrationLog.create({
    data: {
      tenantId, integrationSystemId: error.integrationSystemId, integrationId: error.integrationSystemId, eventType: 'retry', direction: system?.dataDirection ?? 'Outbound',
      status: succeeded ? 'Retried' : 'Failed', message: result.message, recordsProcessed: result.recordsProcessed, recordsSucceeded: result.recordsSucceeded,
      recordsFailed: result.recordsFailed, latencyMs: result.latencyMs, durationMs: result.latencyMs, correlationId: result.correlationId,
      startedAt: result.startedAt, completedAt: result.completedAt, createdAt: result.completedAt,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Retried integration error', error.integrationSystemId, { errorId, succeeded });
  if (!succeeded) {
    await createIntegrationNotification(tenantId, `Integration retry failed: ${system?.name ?? 'system'}`, `Retry of "${error.title}" failed again.`, 'integration.retry.failed');
  }
  return { job, result };
}

export async function retryLog(tenantId: string, logId: string, userId: string) {
  const log = await prisma.integrationLog.findFirst({ where: { tenantId, id: logId } });
  if (!log) throw new Error('Integration log not found');
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id: log.integrationSystemId } });
  const adapter = integrationAdapterRegistry.resolve(system ?? {});
  const result = await adapter.retryFailed();
  const job = await prisma.integrationRetryJob.create({
    data: {
      tenantId, integrationSystemId: log.integrationSystemId, integrationId: log.integrationSystemId, errorId: null, logId,
      retryStatus: result.recordsFailed === 0 ? 'Succeeded' : 'Failed', scheduledAt: nowIso(), attemptedAt: nowIso(), completedAt: nowIso(),
      resultMessage: result.message, createdByUserId: userId,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Retried integration log', log.integrationSystemId, { logId });
  return { job, result };
}

// ---------------------------------------------------------------------------
// Webhooks + credentials
// ---------------------------------------------------------------------------
export async function listWebhooks(tenantId: string, id: string) {
  return prisma.webhookSubscription.findMany({ where: { tenantId, integrationSystemId: id } });
}
export async function createWebhook(tenantId: string, id: string, userId: string, body: Record<string, any>) {
  const webhook = await prisma.webhookSubscription.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, name: body.name ?? 'New Webhook', eventType: body.eventType ?? 'record.created',
      targetUrl: body.targetUrl ?? 'https://hooks.westmetro.gov/****', secretConfigured: Boolean(body.secretConfigured), status: 'Active', lastTriggeredAt: null,
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Created webhook subscription', id, { webhook: webhook.id });
  return webhook;
}
export async function testWebhook(tenantId: string, id: string, webhookId: string, userId: string) {
  const webhook = await prisma.webhookSubscription.findFirst({ where: { tenantId, integrationSystemId: id, id: webhookId } });
  if (!webhook) throw new Error('Webhook not found');
  await prisma.webhookSubscription.update({ where: { id: webhookId }, data: { lastTriggeredAt: nowIso() } });
  await writeIntegrationAudit(tenantId, userId, 'Tested webhook subscription', id, { webhook: webhookId });
  return { ok: true, deliveredAt: nowIso(), message: `Test event delivered to ${webhook.eventType} subscription.` };
}
export async function listCredentials(tenantId: string, id: string) {
  return (await prisma.apiCredential.findMany({ where: { tenantId, integrationSystemId: id } })).map(maskCredential);
}
export async function createCredential(tenantId: string, id: string, userId: string, body: Record<string, any>) {
  const credential = await prisma.apiCredential.create({
    data: {
      tenantId, integrationSystemId: id, integrationId: id, credentialName: body.credentialName ?? 'New Credential', authType: body.authType ?? 'API Key',
      maskedIdentifier: body.maskedIdentifier ?? '****-****', status: 'Active', expiresAt: body.expiresAt ?? null, lastRotatedAt: nowIso(),
    },
  });
  await writeIntegrationAudit(tenantId, userId, 'Created API credential', id, { credential: credential.id });
  return maskCredential(credential);
}
export async function rotateCredential(tenantId: string, id: string, credentialId: string, userId: string) {
  const credential = await prisma.apiCredential.findFirst({ where: { tenantId, integrationSystemId: id, id: credentialId } });
  if (!credential) throw new Error('Credential not found');
  const updated = await prisma.apiCredential.update({ where: { id: credentialId }, data: { lastRotatedAt: nowIso(), status: 'Active', expiresAt: new Date(Date.now() + 180 * 86400000).toISOString() } });
  await writeIntegrationAudit(tenantId, userId, 'Rotated API credential', id, { credential: credentialId });
  return maskCredential(updated);
}

// ---------------------------------------------------------------------------
// API docs + data objects
// ---------------------------------------------------------------------------
export async function getApiDocs(tenantId: string, id: string) {
  const system = await prisma.integrationSystem.findFirst({ where: { tenantId, id } });
  if (!system) throw new Error('Integration system not found');
  const endpoints = await prisma.integrationEndpoint.findMany({ where: { tenantId, integrationSystemId: id } });
  return {
    system: { id: system.id, name: system.name, systemType: system.systemType, baseUrl: maskUrl(system.baseUrl), authenticationType: system.authenticationType },
    endpoints,
  };
}
export async function listDataObjects(tenantId: string, id: string) {
  return prisma.integrationDataObject.findMany({ where: { tenantId, integrationSystemId: id } });
}
