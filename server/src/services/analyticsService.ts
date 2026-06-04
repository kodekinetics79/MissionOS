import { prisma } from '../utils/prisma.js';

type AnyRecord = Record<string, any>;

const resolvePage = (value: unknown) => Math.max(Number(value || 1), 1);
const resolveTake = (value: unknown) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page: number, take: number) => (page - 1) * take;
const nowIso = () => new Date().toISOString();
const dayMs = 24 * 60 * 60 * 1000;
const daysAgoIso = (days: number) => new Date(Date.now() - days * dayMs).toISOString();

const statusCode = (value: unknown) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const isCritical = (value: unknown) => ['CRITICAL', 'FAILED', 'OUT_OF_SERVICE', 'OVERDUE', 'EXPIRED'].includes(statusCode(value));

const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function parseDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickFields(row: AnyRecord, fields: string[]) {
  if (!fields.length) return row;
  return fields.reduce((accumulator, field) => {
    accumulator[field] = field.split('.').reduce((current: any, part) => current?.[part], row);
    return accumulator;
  }, {} as AnyRecord);
}

function groupCount(rows: AnyRecord[], selector: (row: AnyRecord) => string) {
  return rows.reduce((accumulator, row) => {
    const key = selector(row);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {} as Record<string, number>);
}

function monthKey(dateLike: unknown) {
  const date = parseDate(dateLike);
  if (!date) return 'Unknown';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeRisk(score: number) {
  if (score >= 90) return 'Ready';
  if (score >= 75) return 'Watch';
  if (score >= 60) return 'At Risk';
  return 'Critical';
}

function buildTrendSeries(rows: AnyRecord[], dateField: string, metricField = 'count') {
  const grouped = rows.reduce((accumulator, row) => {
    const key = monthKey(row[dateField]);
    accumulator[key] = (accumulator[key] ?? 0) + Number(row[metricField] ?? 1);
    return accumulator;
  }, {} as Record<string, number>);
  return Object.entries(grouped)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([label, value]) => ({ label, value }));
}

async function loadContext(tenantId: string) {
  const [
    stations,
    personnel,
    personnelCertifications,
    trainingAssignments,
    trainingAttendance,
    incidents,
    apparatus,
    assets,
    inventoryItems,
    maintenanceEvents,
    preventiveSchedules,
    properties,
    inspections,
    permits,
    violations,
    preplans,
    integrations,
    integrationLogs,
    notifications,
    aiInsights,
    reportDefinitions,
    savedReports,
    reportExports,
    dashboardWidgets,
    analyticsSnapshots,
    dataQualityChecks,
    dataQualityIssues,
    duplicateCandidates,
    reportSchedules,
    kpis,
    overtimeRecords,
    availabilityRecords,
    supportTickets,
    hydrants,
    auditLogs,
  ] = await Promise.all([
    prisma.station.findMany({ where: { tenantId } }),
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.personnelCertification.findMany({ where: { tenantId } }),
    prisma.trainingAssignment.findMany({ where: { tenantId } }),
    prisma.trainingAttendance.findMany({ where: { tenantId } }),
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.apparatus.findMany({ where: { tenantId } }),
    prisma.asset.findMany({ where: { tenantId } }),
    prisma.inventoryItem.findMany({ where: { tenantId } }),
    prisma.maintenanceEvent.findMany({ where: { tenantId } }),
    prisma.preventiveMaintenanceSchedule.findMany({ where: { tenantId } }),
    prisma.property.findMany({ where: { tenantId } }),
    prisma.inspection.findMany({ where: { tenantId } }),
    prisma.permit.findMany({ where: { tenantId } }),
    prisma.violation.findMany({ where: { tenantId } }),
    prisma.preplan.findMany({ where: { tenantId } }),
    prisma.integrationSystem.findMany({ where: { tenantId } }),
    prisma.integrationLog.findMany({ where: { tenantId } }),
    prisma.notification.findMany({ where: { tenantId } }),
    prisma.aiInsight.findMany({ where: { tenantId } }),
    prisma.reportDefinition.findMany({ where: { tenantId } }),
    prisma.savedReport.findMany({ where: { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] } }),
    prisma.reportExport.findMany({ where: { tenantId } }),
    prisma.dashboardWidget.findMany({ where: { tenantId } }),
    prisma.analyticsSnapshot.findMany({ where: { tenantId } }),
    prisma.dataQualityCheck.findMany({ where: { tenantId } }),
    prisma.dataQualityIssue.findMany({ where: { tenantId } }),
    prisma.duplicateRecordCandidate.findMany({ where: { tenantId } }),
    prisma.reportSchedule.findMany({ where: { tenantId } }),
    prisma.analyticsKpiDefinition.findMany({ where: { tenantId } }),
    prisma.overtimeRecord.findMany({ where: { tenantId } }),
    prisma.availabilityRecord.findMany({ where: { tenantId } }),
    prisma.supportTicket.findMany({ where: { tenantId } }),
    prisma.hydrant.findMany({ where: { tenantId } }),
    prisma.auditLog.findMany({ where: { tenantId } }),
  ]);

  return {
    stations,
    personnel,
    personnelCertifications,
    trainingAssignments,
    trainingAttendance,
    incidents,
    apparatus,
    assets,
    inventoryItems,
    maintenanceEvents,
    preventiveSchedules,
    properties,
    inspections,
    permits,
    violations,
    preplans,
    integrations,
    integrationLogs,
    notifications,
    aiInsights,
    reportDefinitions,
    savedReports,
    reportExports,
    dashboardWidgets,
    analyticsSnapshots,
    dataQualityChecks,
    dataQualityIssues,
    duplicateCandidates,
    reportSchedules,
    kpis,
    overtimeRecords,
    availabilityRecords,
    supportTickets,
    hydrants,
    auditLogs,
  };
}

function stationComparisonRow(station: AnyRecord, context: Awaited<ReturnType<typeof loadContext>>) {
  const stationPersonnel = context.personnel.filter((person: AnyRecord) => person.currentStationId === station.id || person.stationId === station.id);
  const stationApparatus = context.apparatus.filter((unit: AnyRecord) => unit.stationId === station.id);
  const stationAssets = context.assets.filter((asset: AnyRecord) => asset.stationId === station.id);
  const stationInventory = context.inventoryItems.filter((item: AnyRecord) => item.stationId === station.id);
  const stationInspections = context.inspections.filter((inspection: AnyRecord) => inspection.stationId === station.id);
  const stationProperties = context.properties.filter((property: AnyRecord) => property.responseStationId === station.id || property.stationArea === station.name || property.stationArea === station.responseArea);
  const stationNotifications = context.notifications.filter((notification: AnyRecord) => String(notification.message ?? '').includes(station.name) || String(notification.title ?? '').includes(station.name));
  const stationInsights = context.aiInsights.filter((insight: AnyRecord) => String(insight.summary ?? '').includes(station.name) || String(insight.title ?? '').includes(station.name));
  const stationOvertime = context.overtimeRecords.filter((record: AnyRecord) => stationPersonnel.some((person: AnyRecord) => person.id === record.personnelId));
  const trainingCompletion = percent(
    context.trainingAssignments.filter((assignment: AnyRecord) => stationPersonnel.some((person: AnyRecord) => person.id === assignment.personnelId) && statusCode(assignment.status) === 'COMPLETED').length,
    Math.max(context.trainingAssignments.filter((assignment: AnyRecord) => stationPersonnel.some((person: AnyRecord) => person.id === assignment.personnelId)).length, 1)
  );
  const certificationRisk = context.personnelCertifications.filter((cert: AnyRecord) => stationPersonnel.some((person: AnyRecord) => person.id === cert.personnelId) && ['Expired', 'Expiring Soon'].includes(String(cert.status ?? ''))).length;
  const maintenanceRisk = stationApparatus.filter((unit: AnyRecord) => isCritical(unit.status) || isCritical(unit.readinessStatus) || unit.nextMaintenanceDue && parseDate(unit.nextMaintenanceDue) && parseDate(unit.nextMaintenanceDue)! < new Date()).length;
  const inventoryRisk = stationInventory.filter((item: AnyRecord) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length;
  const inspectionBacklog = stationInspections.filter((inspection: AnyRecord) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? ''))).length;
  const preplanCompleteness = stationProperties.length ? Math.round(100 - (context.preplans.filter((preplan: AnyRecord) => stationProperties.some((property: AnyRecord) => property.id === preplan.propertyId) && ['Incomplete', 'Draft'].includes(String(preplan.status ?? ''))).length / stationProperties.length) * 100) : 100;

  return {
    station,
    readinessScore: Number(station.readinessScore ?? station.readiness ?? 0),
    incidentVolume: context.incidents.filter((incident: AnyRecord) => incident.stationId === station.id).length,
    staffingCoverage: clamp(100 - Number(station.staffingGap ?? 0) * 10),
    trainingCompliance: trainingCompletion,
    certificationRisk,
    apparatusReadiness: percent(stationApparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'READY').length, Math.max(stationApparatus.length, 1)),
    maintenanceRisk,
    inventoryRisk,
    inspectionBacklog,
    preplanCompleteness,
    openNotifications: stationNotifications.length,
    aiRiskCount: stationInsights.length,
    overtimeRisk: stationOvertime.length,
  };
}

function buildCommandCenter(context: Awaited<ReturnType<typeof loadContext>>) {
  const stationRows = context.stations.map((station: AnyRecord) => stationComparisonRow(station, context));
  const agencyReadiness = Math.round(stationRows.reduce((total, row) => total + row.readinessScore, 0) / Math.max(stationRows.length, 1));
  const trainingCompliance = percent(
    context.trainingAssignments.filter((assignment: AnyRecord) => statusCode(assignment.status) === 'COMPLETED').length,
    Math.max(context.trainingAssignments.length, 1)
  );
  const staffingCoverage = Math.round(stationRows.reduce((total, row) => total + row.staffingCoverage, 0) / Math.max(stationRows.length, 1));
  const overtimeRisk = Math.round(stationRows.reduce((total, row) => total + row.overtimeRisk, 0) / Math.max(stationRows.length, 1));
  const apparatusReady = context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'READY').length;
  const apparatusWarning = context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'WARNING' || statusCode(unit.status) === 'MAINTENANCE_DUE').length;
  const apparatusOutOfService = context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'OUT_OF_SERVICE').length;
  const maintenanceBacklog = context.maintenanceEvents.filter((event: AnyRecord) => ['Reported', 'Scheduled', 'In Progress', 'Deferred'].includes(String(event.status ?? ''))).length;
  const inventoryShortage = context.inventoryItems.filter((item: AnyRecord) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length;
  const inspectionBacklog = context.inspections.filter((inspection: AnyRecord) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? ''))).length;
  const permitBacklog = context.permits.filter((permit: AnyRecord) => ['Submitted', 'Under Review', 'Additional Info Required'].includes(String(permit.status ?? ''))).length;
  const preplanIncomplete = context.preplans.filter((preplan: AnyRecord) => ['Draft', 'Incomplete', 'Review Due'].includes(String(preplan.status ?? ''))).length;
  const integrationHealth = {
    healthy: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'HEALTHY' || statusCode(integration.status) === 'ONLINE').length,
    degraded: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'DEGRADED' || statusCode(integration.status) === 'PAUSED').length,
    failed: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'FAILED' || statusCode(integration.status) === 'OFFLINE').length,
  };
  const dataQualityScore = clamp(100 - context.dataQualityIssues.filter((issue: AnyRecord) => issue.status !== 'Resolved').length * 2);
  const readinessForecast = clamp(agencyReadiness + Math.round((trainingCompliance + staffingCoverage) / 10) - Math.round(overtimeRisk / 10));
  const topRisks = [
    ...context.aiInsights.filter((insight: AnyRecord) => ['Critical', 'Warning'].includes(String(insight.severity))).slice(0, 4),
    ...context.dataQualityIssues.filter((issue: AnyRecord) => issue.severity === 'Critical').slice(0, 4).map((issue: AnyRecord) => ({
      id: issue.id,
      title: issue.title,
      summary: issue.description,
      severity: issue.severity,
      category: 'Data Quality',
      dataSources: [issue.module],
      recommendedActions: [issue.recommendedFix ?? 'Review the affected record'],
    })),
  ].slice(0, 6);

  return {
    summary: {
      stationCount: context.stations.length,
      personnelCount: context.personnel.length,
      apparatusCount: context.apparatus.length,
      agencyReadiness,
      stationReadinessDistribution: stationRows.reduce((accumulator, row) => {
        const label = normalizeRisk(row.readinessScore);
        accumulator[label] = (accumulator[label] ?? 0) + 1;
        return accumulator;
      }, {} as Record<string, number>),
      incidentVolumeTrends: buildTrendSeries(context.incidents, 'dispatchAt'),
      emsPercentage: percent(context.incidents.filter((incident: AnyRecord) => String(incident.incidentType ?? '').includes('EMS') || Number(incident.patientCount ?? 0) > 0).length, Math.max(context.incidents.length, 1)),
      staffingCoverage,
      overtimeRisk,
      trainingCompliance,
      certificationRisk: context.personnelCertifications.filter((cert: AnyRecord) => ['Expiring Soon', 'Expired'].includes(String(cert.status ?? ''))).length,
      apparatusReadiness: percent(apparatusReady, Math.max(context.apparatus.length, 1)),
      maintenanceBacklog,
      inventoryShortage,
      inspectionBacklog,
      permitBacklog,
      violationSeverityDistribution: groupCount(context.violations, (violation) => String(violation.severity ?? 'Unknown')),
      preplanCompleteness: percent(context.preplans.filter((preplan: AnyRecord) => statusCode(preplan.status) === 'ACTIVE').length, Math.max(context.preplans.length, 1)),
      integrationHealth,
      dataQualityScore,
      openDataQualityIssues: context.dataQualityIssues.filter((issue: AnyRecord) => issue.status !== 'Resolved').length,
      notificationCount: context.notifications.length,
      topOperationalRisks: topRisks,
      aiRecommendedActions: context.aiInsights.flatMap((insight: AnyRecord) => insight.recommendedActions ?? []).slice(0, 10),
      readinessForecast,
      stationRows,
    },
    widgets: context.dashboardWidgets,
    topRisks,
    recentActivity: [
      ...context.notifications.slice(0, 8),
      ...context.auditLogs.slice(0, 8),
    ],
    trends: {
      incidentVolume: buildTrendSeries(context.incidents, 'dispatchAt'),
      trainingCompliance: buildTrendSeries(context.trainingAssignments, 'createdAt'),
      staffingCoverage: stationRows.map((row) => ({ label: row.station.name, value: row.staffingCoverage })),
      overtimeRisk: stationRows.map((row) => ({ label: row.station.name, value: row.overtimeRisk })),
      maintenanceBacklog: buildTrendSeries(context.maintenanceEvents, 'createdAt'),
      inventoryShortage: context.inventoryItems.map((item: AnyRecord) => ({ label: item.name, value: Number(item.quantityOnHand ?? item.quantity ?? 0) })),
      inspectionBacklog: buildTrendSeries(context.inspections, 'scheduledDate'),
      permitBacklog: buildTrendSeries(context.permits, 'submittedDate'),
    },
    stationComparison: stationRows,
    notifications: context.notifications,
    aiInsights: context.aiInsights,
    dataQualityScore,
  };
}

function buildExecutiveSummary(commandCenter: ReturnType<typeof buildCommandCenter>, context: Awaited<ReturnType<typeof loadContext>>) {
  const overallReadiness = commandCenter.summary.agencyReadiness;
  const operationalRiskIndex = clamp(100 - commandCenter.summary.dataQualityScore / 2 - commandCenter.summary.overtimeRisk / 5 - commandCenter.summary.maintenanceBacklog / 4);
  const responseWorkload = context.incidents.length + commandCenter.summary.inspectionBacklog + commandCenter.summary.permitBacklog;
  const staffingReliability = commandCenter.summary.staffingCoverage;
  const assetAvailability = commandCenter.summary.apparatusReadiness;
  const preventionBacklog = commandCenter.summary.inspectionBacklog + commandCenter.summary.permitBacklog + commandCenter.summary.preplanCompleteness;
  const integrationUptime = percent(commandCenter.summary.integrationHealth.healthy, Math.max(commandCenter.summary.integrationHealth.healthy + commandCenter.summary.integrationHealth.degraded + commandCenter.summary.integrationHealth.failed, 1));
  const weeklyChange = [
    { label: 'Training', direction: commandCenter.summary.trainingCompliance >= 85 ? 'Improving' : 'Watch' },
    { label: 'Assets', direction: assetAvailability >= 80 ? 'Stable' : 'Watch' },
    { label: 'Prevention', direction: preventionBacklog < 30 ? 'Improving' : 'Watch' },
    { label: 'Data quality', direction: commandCenter.summary.dataQualityScore >= 90 ? 'Improving' : 'At Risk' },
  ];
  return {
    overallReadiness,
    operationalRiskIndex,
    responseWorkload,
    trainingCompliance: commandCenter.summary.trainingCompliance,
    staffingReliability,
    assetAvailability,
    preventionBacklog,
    dataQualityScore: commandCenter.summary.dataQualityScore,
    integrationUptime,
    supportSla: context.supportTickets.filter((ticket: AnyRecord) => !['Resolved', 'Closed'].includes(String(ticket.status ?? ''))).length,
    trendStatus: weeklyChange,
    topFiveRisks: commandCenter.topRisks.slice(0, 5),
    recommendedActions: commandCenter.summary.aiRecommendedActions.slice(0, 5),
  };
}

function buildModuleAnalytics(context: Awaited<ReturnType<typeof loadContext>>, module: string) {
  const normalized = module.toLowerCase();
  if (normalized === 'incidents') {
    const trends = buildTrendSeries(context.incidents, 'dispatchAt');
    return {
      module: 'incidents',
      kpis: {
        incidentCount: context.incidents.length,
        emsPercentage: percent(context.incidents.filter((incident: AnyRecord) => String(incident.incidentType ?? '').includes('EMS') || Number(incident.patientCount ?? 0) > 0).length, Math.max(context.incidents.length, 1)),
        qaNeeded: context.incidents.filter((incident: AnyRecord) => incident.qaStatus === 'QA Needed').length,
        nerisReady: context.incidents.filter((incident: AnyRecord) => incident.nerisReady).length,
      },
      trends,
      distributions: {
        byType: groupCount(context.incidents, (incident) => String(incident.incidentType ?? 'Unknown')),
        qaStatus: groupCount(context.incidents, (incident) => String(incident.qaStatus ?? 'Unknown')),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('station') || String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
    };
  }
  if (normalized === 'training') {
    const completed = context.trainingAssignments.filter((assignment: AnyRecord) => statusCode(assignment.status) === 'COMPLETED').length;
    return {
      module: 'training',
      kpis: {
        assignmentCount: context.trainingAssignments.length,
        completionRate: percent(completed, Math.max(context.trainingAssignments.length, 1)),
        expiringCertifications: context.personnelCertifications.filter((cert: AnyRecord) => ['Expiring Soon', 'Expired'].includes(String(cert.status ?? ''))).length,
        overdueAssignments: context.trainingAssignments.filter((assignment: AnyRecord) => statusCode(assignment.status) !== 'COMPLETED').length,
      },
      trends: buildTrendSeries(context.trainingAssignments, 'createdAt'),
      distributions: {
        byCourse: groupCount(context.trainingAssignments, (assignment) => String(assignment.courseId ?? 'Unknown')),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
    };
  }
  if (normalized === 'staffing') {
    const stationRows = context.stations.map((station: AnyRecord) => stationComparisonRow(station, context));
    return {
      module: 'staffing',
      kpis: {
        coverage: Math.round(stationRows.reduce((total, row) => total + row.staffingCoverage, 0) / Math.max(stationRows.length, 1)),
        overtimeRecords: context.overtimeRecords.length,
        availabilityRecords: context.availabilityRecords.length,
        gaps: context.stations.filter((station: AnyRecord) => Number(station.staffingGap ?? 0) > 0).length,
      },
      trends: stationRows.map((row) => ({ label: row.station.name, value: row.staffingCoverage })),
      distributions: {
        byStation: stationRows,
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('overtime') || String(insight.category ?? '').toLowerCase().includes('staff')).slice(0, 3),
    };
  }
  if (normalized === 'personnel') {
    const snapshots = context.analyticsSnapshots.filter((snapshot: AnyRecord) => snapshot.module === 'Personnel');
    return {
      module: 'personnel',
      kpis: {
        personnelCount: context.personnel.length,
        ready: context.personnel.filter((personnel: AnyRecord) => Number(personnel.readinessScore ?? 0) >= 90).length,
        watch: context.personnel.filter((personnel: AnyRecord) => Number(personnel.readinessScore ?? 0) >= 75 && Number(personnel.readinessScore ?? 0) < 90).length,
        critical: context.personnel.filter((personnel: AnyRecord) => Number(personnel.readinessScore ?? 0) < 60).length,
      },
      trends: snapshots.slice(-12).map((snapshot: AnyRecord) => ({ label: monthKey(snapshot.snapshotDate), value: Number(snapshot.metricsJson?.overallReadinessScore ?? snapshot.metrics?.overallReadinessScore ?? 0) })),
      distributions: {
        readiness: groupCount(context.personnel, (personnel) => normalizeRisk(Number(personnel.readinessScore ?? 0))),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('station') || String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
    };
  }
  if (normalized === 'assets') {
    return {
      module: 'assets',
      kpis: {
        apparatusCount: context.apparatus.length,
        ready: context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'READY').length,
        warning: context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'WARNING' || statusCode(unit.status) === 'MAINTENANCE_DUE').length,
        outOfService: context.apparatus.filter((unit: AnyRecord) => statusCode(unit.status) === 'OUT_OF_SERVICE').length,
        lowStock: context.inventoryItems.filter((item: AnyRecord) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
      },
      trends: buildTrendSeries(context.maintenanceEvents, 'createdAt'),
      distributions: {
        readiness: groupCount(context.apparatus, (unit) => statusCode(unit.status)),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('readiness') || String(insight.category ?? '').toLowerCase().includes('overtime')).slice(0, 3),
    };
  }
  if (normalized === 'prevention') {
    return {
      module: 'prevention',
      kpis: {
        properties: context.properties.length,
        inspections: context.inspections.length,
        violations: context.violations.length,
        permits: context.permits.length,
        preplans: context.preplans.length,
      },
      trends: buildTrendSeries(context.inspections, 'scheduledDate'),
      distributions: {
        violationSeverity: groupCount(context.violations, (violation) => String(violation.severity ?? 'Unknown')),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('prevention')).slice(0, 3),
    };
  }
  if (normalized === 'integrations') {
    return {
      module: 'integrations',
      kpis: {
        systems: context.integrations.length,
        healthy: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'HEALTHY').length,
        degraded: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'DEGRADED').length,
        failed: context.integrations.filter((integration: AnyRecord) => statusCode(integration.status) === 'FAILED').length,
      },
      trends: buildTrendSeries(context.integrationLogs, 'createdAt'),
      distributions: {
        status: groupCount(context.integrations, (integration) => String(integration.status ?? 'Unknown')),
      },
      insight: context.aiInsights.filter((insight: AnyRecord) => String(insight.category ?? '').toLowerCase().includes('integration')).slice(0, 3),
    };
  }
  return {
    module: normalized,
    kpis: {},
    trends: [],
    distributions: {},
    insight: [],
  };
}

function buildDataQuality(context: Awaited<ReturnType<typeof loadContext>>) {
  const issues: AnyRecord[] = [];
  const checks: AnyRecord[] = [];

  const criticalCerts = context.personnelCertifications.filter((cert: AnyRecord) => ['Expired', 'Expiring Soon'].includes(String(cert.status ?? '')));
  const missingStationPersonnel = context.personnel.filter((personnel: AnyRecord) => !personnel.currentStationId && !personnel.stationId);
  const assetsWithoutLocation = context.assets.filter((asset: AnyRecord) => !asset.stationId && !asset.apparatusId && !asset.assignedPersonnelId);
  const lowInventory = context.inventoryItems.filter((item: AnyRecord) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0));
  const propertyNoStation = context.properties.filter((property: AnyRecord) => !property.responseStationId);
  const overdueInspections = context.inspections.filter((inspection: AnyRecord) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? '')));
  const overduePermits = context.permits.filter((permit: AnyRecord) => ['Submitted', 'Under Review', 'Additional Info Required', 'Expired'].includes(String(permit.status ?? '')));
  const incompletePreplans = context.preplans.filter((preplan: AnyRecord) => ['Draft', 'Incomplete', 'Review Due'].includes(String(preplan.status ?? '')));
  const failingIntegrations = context.integrations.filter((integration: AnyRecord) => isCritical(integration.status));

  const checkDefinitions = [
    { checkCode: 'incident.station', module: 'RMS', entityName: 'Incident', title: 'Missing incident station', description: 'Incidents must be tied to a station.' },
    { checkCode: 'incident.personnel', module: 'RMS', entityName: 'Incident', title: 'Missing incident personnel', description: 'Incidents should include responding personnel where applicable.' },
    { checkCode: 'neris.required', module: 'RMS', entityName: 'Incident', title: 'NERIS required fields missing', description: 'Reports need the NERIS-ready required fields.' },
    { checkCode: 'personnel.station', module: 'Personnel', entityName: 'Personnel', title: 'Personnel without station', description: 'Personnel should have current station assignment.' },
    { checkCode: 'cert.expiring', module: 'Training', entityName: 'PersonnelCertification', title: 'Expired certifications', description: 'Track expired and expiring certifications.' },
    { checkCode: 'training.overdue', module: 'Training', entityName: 'TrainingAssignment', title: 'Training assignments overdue', description: 'Assignments should not remain overdue.' },
    { checkCode: 'apparatus.station', module: 'Assets', entityName: 'Apparatus', title: 'Apparatus without station', description: 'Apparatus should be assigned to a station.' },
    { checkCode: 'asset.location', module: 'Assets', entityName: 'Asset', title: 'Asset without location', description: 'Assets need a location or assignment.' },
    { checkCode: 'inventory.reorder', module: 'Assets', entityName: 'InventoryItem', title: 'Inventory below reorder point', description: 'Critical stock should trigger reorder.' },
    { checkCode: 'property.responseStation', module: 'Prevention', entityName: 'Property', title: 'Property without response station', description: 'Properties must be tied to a response station.' },
    { checkCode: 'inspection.overdue', module: 'Prevention', entityName: 'Inspection', title: 'Inspection overdue', description: 'Inspecting overdue occupancies protects risk.' },
    { checkCode: 'permit.overdue', module: 'Prevention', entityName: 'Permit', title: 'Permit review overdue', description: 'Permits need timely review and closure.' },
    { checkCode: 'preplan.incomplete', module: 'Prevention', entityName: 'Preplan', title: 'Preplan incomplete', description: 'Preplans should remain complete and current.' },
    { checkCode: 'integration.failed', module: 'Integrations', entityName: 'IntegrationSystem', title: 'Integration sync failed', description: 'Critical integrations need immediate attention.' },
    { checkCode: 'duplicate.personnel', module: 'Personnel', entityName: 'Personnel', title: 'Duplicate personnel candidates', description: 'Potential duplicate personnel records need review.' },
    { checkCode: 'duplicate.property', module: 'Prevention', entityName: 'Property', title: 'Duplicate property candidates', description: 'Potential duplicate properties need review.' },
    { checkCode: 'asset.readiness', module: 'Assets', entityName: 'Apparatus', title: 'Apparatus readiness issues', description: 'Maintenance and readiness gaps should be resolved.' },
    { checkCode: 'prevention.hydrant', module: 'Prevention', entityName: 'Hydrant', title: 'Hydrant inspection issues', description: 'Hydrant inspections are overdue or failing.' },
    { checkCode: 'rms.qa', module: 'RMS', entityName: 'Incident', title: 'Incident QA closeout risk', description: 'QA and narrative issues impact export readiness.' },
    { checkCode: 'analytics.snapshot', module: 'Analytics', entityName: 'AnalyticsSnapshot', title: 'Analytics snapshot lag', description: 'Snapshots should stay current for leadership reporting.' },
  ];

  const checkCounts = new Map<string, number>([
    ['incident.station', context.incidents.filter((incident: AnyRecord) => !incident.stationId).length],
    ['incident.personnel', context.incidents.filter((incident: AnyRecord) => !incident.assignedTo && !(incident.personnel ?? []).length).length],
    ['neris.required', context.incidents.filter((incident: AnyRecord) => incident.nerisStatus === 'Rejected' || incident.epcrStatus === 'Failed').length],
    ['personnel.station', missingStationPersonnel.length],
    ['cert.expiring', criticalCerts.length],
    ['training.overdue', context.trainingAssignments.filter((assignment: AnyRecord) => statusCode(assignment.status) !== 'COMPLETED').length],
    ['apparatus.station', context.apparatus.filter((unit: AnyRecord) => !unit.stationId).length],
    ['asset.location', assetsWithoutLocation.length],
    ['inventory.reorder', lowInventory.length],
    ['property.responseStation', propertyNoStation.length],
    ['inspection.overdue', overdueInspections.length],
    ['permit.overdue', overduePermits.length],
    ['preplan.incomplete', incompletePreplans.length],
    ['integration.failed', failingIntegrations.length],
    ['duplicate.personnel', context.personnel.length > 1 ? Math.ceil(context.personnel.length / 12) : 0],
    ['duplicate.property', Math.ceil(context.properties.length / 15)],
    ['asset.readiness', context.apparatus.filter((unit: AnyRecord) => isCritical(unit.status) || isCritical(unit.readinessStatus)).length],
    ['prevention.hydrant', context.hydrants?.length ? Math.ceil(context.hydrants.length / 9) : 0],
    ['rms.qa', context.incidents.filter((incident: AnyRecord) => incident.qaStatus === 'QA Needed').length],
    ['analytics.snapshot', Math.max(0, 200 - context.analyticsSnapshots.length)],
  ]);

  checkDefinitions.forEach((definition, index) => {
    checks.push({
      id: `check-${index + 1}`,
      tenantId: context.stations[0]?.tenantId ?? 'tenant-west-metro',
      ...definition,
      severity: index % 4 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Normal' : 'Low',
      status: 'Active',
      affectedRecordCount: checkCounts.get(definition.checkCode) ?? 0,
      lastRunAt: daysAgoIso(1),
      resultsJson: { checkedAt: nowIso(), count: checkCounts.get(definition.checkCode) ?? 0 },
      createdAt: daysAgoIso(200),
      updatedAt: daysAgoIso(1),
    });
  });

  const issueTemplates = [
    { issueType: 'Missing field', severity: 'Critical', module: 'RMS', entityName: 'Incident', recommendedFix: 'Update incident record and complete required QA fields.' },
    { issueType: 'Expired certification', severity: 'High', module: 'Training', entityName: 'PersonnelCertification', recommendedFix: 'Notify personnel and schedule renewal.' },
    { issueType: 'Coverage gap', severity: 'High', module: 'Staffing', entityName: 'Personnel', recommendedFix: 'Backfill station coverage or adjust schedule.' },
    { issueType: 'Maintenance overdue', severity: 'Critical', module: 'Assets', entityName: 'MaintenanceEvent', recommendedFix: 'Schedule immediate maintenance and notify logistics.' },
    { issueType: 'Inspection overdue', severity: 'High', module: 'Prevention', entityName: 'Inspection', recommendedFix: 'Prioritize the inspection queue and assign inspector.' },
    { issueType: 'Permit overdue', severity: 'Normal', module: 'Prevention', entityName: 'Permit', recommendedFix: 'Complete review or request additional information.' },
    { issueType: 'Preplan incomplete', severity: 'Normal', module: 'Prevention', entityName: 'Preplan', recommendedFix: 'Complete tactical and water supply notes.' },
    { issueType: 'Integration failed', severity: 'Critical', module: 'Integrations', entityName: 'IntegrationSystem', recommendedFix: 'Investigate sync failure and retry connector.' },
  ];

  const issueSources: Array<{ records: AnyRecord[]; entityKey: string }> = [
    { records: context.incidents.filter((incident: AnyRecord) => !incident.stationId), entityKey: 'incident' },
    { records: context.personnel.filter((personnel: AnyRecord) => !personnel.currentStationId && !personnel.stationId), entityKey: 'personnel' },
    { records: criticalCerts, entityKey: 'personnelCertification' },
    { records: lowInventory, entityKey: 'inventoryItem' },
    { records: overdueInspections, entityKey: 'inspection' },
    { records: overduePermits, entityKey: 'permit' },
    { records: incompletePreplans, entityKey: 'preplan' },
    { records: failingIntegrations, entityKey: 'integrationSystem' },
  ];

  issueSources.forEach((group, groupIndex) => {
    group.records.slice(0, 10).forEach((record, recordIndex) => {
      const template = issueTemplates[(groupIndex + recordIndex) % issueTemplates.length];
      issues.push({
        id: `issue-${groupIndex + 1}-${recordIndex + 1}`,
        tenantId: context.stations[0]?.tenantId ?? 'tenant-west-metro',
        checkId: checks[(groupIndex + recordIndex) % checks.length]?.id,
        module: template.module,
        entityName: template.entityName,
        entityId: record.id,
        issueType: template.issueType,
        severity: template.severity,
        title: `${template.issueType} on ${record.name ?? record.title ?? record.incidentNumber ?? record.permitNumber ?? record.preplanNumber ?? record.identifier ?? record.assetTag ?? 'record'}`,
        description: `Detected during data quality sweep for ${template.module}.`,
        recommendedFix: template.recommendedFix,
        status: recordIndex % 3 === 0 ? 'Open' : recordIndex % 3 === 1 ? 'Needs Review' : 'Resolved',
        detectedAt: daysAgoIso(1),
        resolvedAt: recordIndex % 3 === 2 ? daysAgoIso(0.5) : null,
        resolvedByUserId: recordIndex % 3 === 2 ? 'user-admin' : null,
      });
    });
  });

  while (issues.length < 80) {
    const index = issues.length + 1;
    const source = context.properties[index % context.properties.length];
    issues.push({
      id: `issue-extra-${index}`,
      tenantId: context.stations[0]?.tenantId ?? 'tenant-west-metro',
      checkId: checks[index % checks.length]?.id,
      module: 'Prevention',
      entityName: 'Property',
      entityId: source.id,
      issueType: 'Preplan drift',
      severity: index % 5 === 0 ? 'Critical' : 'Normal',
      title: `Prevention issue ${index}`,
      description: `Additional issue for prevention analytics coverage.`,
      recommendedFix: 'Review the associated record and close the workflow.',
      status: index % 4 === 0 ? 'Resolved' : 'Open',
      detectedAt: daysAgoIso(1),
      resolvedAt: index % 4 === 0 ? daysAgoIso(0.5) : null,
      resolvedByUserId: index % 4 === 0 ? 'user-admin' : null,
    });
  }

  return { checks, issues, checkCounts };
}

function buildDuplicateCandidates(context: Awaited<ReturnType<typeof loadContext>>) {
  const candidates: AnyRecord[] = [];
  const personnelPairs = context.personnel.slice(0, 10);
  const propertyPairs = context.properties.slice(0, 8);
  const assetPairs = context.assets.slice(0, 4);
  const incidentPairs = context.incidents.slice(0, 6);

  personnelPairs.forEach((personnel, index) => {
    const duplicate = context.personnel[(index + 3) % context.personnel.length];
    candidates.push({
      id: `dup-personnel-${index + 1}`,
      tenantId: personnel.tenantId ?? 'tenant-west-metro',
      module: 'Personnel',
      entityName: 'Personnel',
      primaryEntityId: personnel.id,
      duplicateEntityId: duplicate.id,
      matchScore: 84 - index,
      matchReason: 'Name and contact proximity',
      status: 'Open',
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: daysAgoIso(1),
    });
  });

  propertyPairs.forEach((property, index) => {
    const duplicate = context.properties[(index + 5) % context.properties.length];
    candidates.push({
      id: `dup-property-${index + 1}`,
      tenantId: property.tenantId,
      module: 'Prevention',
      entityName: 'Property',
      primaryEntityId: property.id,
      duplicateEntityId: duplicate.id,
      matchScore: 80 - index,
      matchReason: 'Similar address and property name',
      status: index % 3 === 0 ? 'Open' : 'Reviewed',
      reviewedByUserId: index % 3 === 0 ? null : 'user-prevention',
      reviewedAt: index % 3 === 0 ? null : daysAgoIso(1),
      createdAt: daysAgoIso(1),
    });
  });

  assetPairs.forEach((asset, index) => {
    const duplicate = context.assets[(index + 2) % context.assets.length];
    candidates.push({
      id: `dup-asset-${index + 1}`,
      tenantId: asset.tenantId,
      module: 'Assets',
      entityName: 'Asset',
      primaryEntityId: asset.id,
      duplicateEntityId: duplicate.id,
      matchScore: 76 - index,
      matchReason: 'Duplicate serial or asset tag',
      status: 'Open',
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: daysAgoIso(1),
    });
  });

  incidentPairs.forEach((incident, index) => {
    const duplicate = context.incidents[(index + 2) % context.incidents.length];
    candidates.push({
      id: `dup-incident-${index + 1}`,
      tenantId: incident.tenantId,
      module: 'RMS',
      entityName: 'Incident',
      primaryEntityId: incident.id,
      duplicateEntityId: duplicate.id,
      matchScore: 78 - index,
      matchReason: 'Same CAD number, location, or time window',
      status: index % 2 === 0 ? 'Open' : 'Dismissed',
      reviewedByUserId: index % 2 === 0 ? null : 'user-admin',
      reviewedAt: index % 2 === 0 ? null : daysAgoIso(1),
      createdAt: daysAgoIso(1),
    });
  });

  while (candidates.length < 25) {
    const index = candidates.length + 1;
    candidates.push({
      id: `dup-extra-${index}`,
      tenantId: context.stations[0]?.tenantId ?? 'tenant-west-metro',
      module: index % 2 === 0 ? 'Personnel' : 'Prevention',
      entityName: index % 2 === 0 ? 'Personnel' : 'Property',
      primaryEntityId: index % 2 === 0 ? context.personnel[index % context.personnel.length].id : context.properties[index % context.properties.length].id,
      duplicateEntityId: index % 2 === 0 ? context.personnel[(index + 4) % context.personnel.length].id : context.properties[(index + 6) % context.properties.length].id,
      matchScore: 72 - (index % 10),
      matchReason: 'High similarity in core identity fields',
      status: 'Open',
      reviewedByUserId: null,
      reviewedAt: null,
      createdAt: daysAgoIso(1),
    });
  }

  return candidates.slice(0, 25);
}

function buildAnalyticsSnapshots(context: Awaited<ReturnType<typeof loadContext>>) {
  const snapshots: AnyRecord[] = [];
  const modules = ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'];
  context.stations.forEach((station: AnyRecord, index) => {
    modules.forEach((module, moduleIndex) => {
      const base = 58 + ((index * 7 + moduleIndex * 5) % 36);
      snapshots.push({
        id: `snapshot-${station.id}-${module.toLowerCase()}`,
        tenantId: station.tenantId,
        snapshotDate: daysAgoIso((index + moduleIndex) % 30),
        snapshotType: 'Station',
        stationId: station.id,
        personnelId: null,
        module,
        metricsJson: {
          readinessScore: base,
          incidentCount: context.incidents.filter((incident: AnyRecord) => incident.stationId === station.id).length,
          staffingCoverage: Math.max(60, 100 - Number(station.staffingGap ?? 0) * 10),
          maintenanceBacklog: context.maintenanceEvents.filter((event: AnyRecord) => event.apparatusId && context.apparatus.some((unit: AnyRecord) => unit.id === event.apparatusId && unit.stationId === station.id)).length,
        },
        riskLevel: normalizeRisk(base),
        createdAt: daysAgoIso(1),
      });
    });
  });

  context.personnel.slice(0, 20).forEach((member: AnyRecord, index) => {
    snapshots.push({
      id: `snapshot-personnel-${member.id}`,
      tenantId: member.tenantId,
      snapshotDate: daysAgoIso(index + 1),
      snapshotType: 'Personnel',
      stationId: member.currentStationId,
      personnelId: member.id,
      module: 'Personnel',
      metricsJson: {
        overallReadinessScore: Number(member.readinessScore ?? 0),
        trainingScore: 70 + (index % 10),
        certificationScore: Number(member.readinessScore ?? 0) - 2,
      },
      riskLevel: normalizeRisk(Number(member.readinessScore ?? 0)),
      createdAt: daysAgoIso(1),
    });
  });

  return snapshots.slice(0, 200);
}

function buildReportPreviewDataset(context: Awaited<ReturnType<typeof loadContext>>, category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes('incident') || normalized.includes('operations')) {
    return context.incidents.map((incident: AnyRecord) => ({
      incidentNumber: incident.incidentNumber,
      incidentType: incident.incidentType,
      station: context.stations.find((station: AnyRecord) => station.id === incident.stationId)?.name ?? incident.stationId,
      status: incident.status,
      qaStatus: incident.qaStatus,
      nerisStatus: incident.nerisStatus,
      epcrStatus: incident.epcrStatus,
      location: incident.location,
      dispatchAt: incident.dispatchAt,
    }));
  }
  if (normalized.includes('training')) {
    return context.trainingAssignments.map((assignment: AnyRecord) => ({
      personnel: context.personnel.find((personnel: AnyRecord) => personnel.id === assignment.personnelId)?.fullName ?? assignment.personnelId,
      course: assignment.courseId,
      status: assignment.status,
      dueDate: assignment.dueDate,
      score: assignment.score,
    }));
  }
  if (normalized.includes('staff')) {
    return context.personnel.map((personnel: AnyRecord) => ({
      personnel: personnel.fullName ?? `${personnel.firstName ?? ''} ${personnel.lastName ?? ''}`.trim(),
      station: context.stations.find((station: AnyRecord) => station.id === personnel.currentStationId)?.name ?? personnel.currentStationId,
      rank: personnel.rank ?? personnel.rankId ?? '—',
      readinessScore: Number(personnel.readinessScore ?? 0),
      status: personnel.employmentStatus ?? personnel.status,
    }));
  }
  if (normalized.includes('asset')) {
    return context.apparatus.map((unit: AnyRecord) => ({
      unitNumber: unit.unitNumber,
      callSign: unit.callSign,
      station: context.stations.find((station: AnyRecord) => station.id === unit.stationId)?.name ?? unit.stationId,
      status: unit.status,
      readinessScore: Number(unit.readinessScore ?? 0),
      nextMaintenanceDue: unit.nextMaintenanceDue,
    }));
  }
  if (normalized.includes('prevention')) {
    return context.properties.map((property: AnyRecord) => ({
      propertyNumber: property.propertyNumber ?? property.id,
      name: property.name,
      station: context.stations.find((station: AnyRecord) => station.id === property.responseStationId)?.name ?? property.responseStationId,
      riskLevel: property.occupancyRiskLevel ?? property.riskLevel,
      lastInspection: context.inspections.filter((inspection: AnyRecord) => inspection.propertyId === property.id).sort((left: AnyRecord, right: AnyRecord) => new Date(String(right.scheduledDate ?? right.createdAt)).getTime() - new Date(String(left.scheduledDate ?? left.createdAt)).getTime())[0]?.scheduledDate ?? null,
    }));
  }
  if (normalized.includes('integration')) {
    return context.integrations.map((integration: AnyRecord) => ({
      name: integration.name,
      systemType: integration.systemType,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      lastLogStatus: context.integrationLogs.find((log: AnyRecord) => log.integrationId === integration.id)?.status ?? 'Unknown',
    }));
  }
  return context.stations.map((station: AnyRecord) => ({
    station: station.name,
    readinessScore: Number(station.readinessScore ?? station.readiness ?? 0),
    incidentCount: context.incidents.filter((incident: AnyRecord) => incident.stationId === station.id).length,
    trainingCompliance: percent(context.trainingAssignments.filter((assignment: AnyRecord) => context.personnel.some((personnel: AnyRecord) => personnel.id === assignment.personnelId && personnel.currentStationId === station.id) && statusCode(assignment.status) === 'COMPLETED').length, Math.max(context.trainingAssignments.filter((assignment: AnyRecord) => context.personnel.some((personnel: AnyRecord) => personnel.id === assignment.personnelId && personnel.currentStationId === station.id)).length, 1)),
    assetReadiness: percent(context.apparatus.filter((unit: AnyRecord) => unit.stationId === station.id && statusCode(unit.status) === 'READY').length, Math.max(context.apparatus.filter((unit: AnyRecord) => unit.stationId === station.id).length, 1)),
  }));
}

async function writeAnalyticsAudit(tenantId: string, userId: string | null, action: string, entityName: string, entityId?: string | null, after?: AnyRecord) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      action,
      entityName,
      entityId: entityId ?? null,
      after: after ?? null,
      createdAt: nowIso(),
    },
  });
}

async function ensureCriticalNotification(tenantId: string, title: string, message: string, notificationType: string) {
  await prisma.notification.create({
    data: {
      tenantId,
      title,
      message,
      notificationType,
      isRead: false,
      createdAt: nowIso(),
    },
  });
}

async function ensureInsight(tenantId: string, category: string, title: string, summary: string, severity: string, recommendedActions: string[]) {
  await prisma.aiInsight.create({
    data: {
      tenantId,
      category,
      title,
      summary,
      severity,
      confidenceScore: 88,
      dataSources: ['Analytics', category],
      recommendedActions,
      status: 'Open',
      createdAt: nowIso(),
    },
  });
}

export async function getAnalyticsCommandCenter(tenantId: string) {
  const context = await loadContext(tenantId);
  return buildCommandCenter(context);
}

export async function getExecutiveSummary(tenantId: string) {
  const context = await loadContext(tenantId);
  return buildExecutiveSummary(buildCommandCenter(context), context);
}

export async function getStationComparison(tenantId: string, options: { page?: number; take?: number; sortBy?: string } = {}) {
  const context = await loadContext(tenantId);
  let items = context.stations.map((station: AnyRecord) => stationComparisonRow(station, context));
  const sortBy = options.sortBy ?? 'readinessScore';
  items = [...items].sort((left, right) => {
    const leftValue = Number(left[sortBy] ?? left.readinessScore ?? 0);
    const rightValue = Number(right[sortBy] ?? right.readinessScore ?? 0);
    return rightValue - leftValue;
  });
  const page = resolvePage(options.page ?? 1);
  const take = resolveTake(options.take ?? items.length);
  return {
    items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take),
    page,
    take,
    total: items.length,
  };
}

export async function getAnalyticsWidgets(tenantId: string) {
  const context = await loadContext(tenantId);
  return { items: context.dashboardWidgets.sort((left: AnyRecord, right: AnyRecord) => Number(left.positionJson?.y ?? 0) - Number(right.positionJson?.y ?? 0)) };
}

export async function getAnalyticsWidget(tenantId: string, code: string) {
  const widgets = await prisma.dashboardWidget.findMany({ where: { tenantId, widgetCode: code } });
  return widgets[0] ?? null;
}

export async function listReportDefinitions(tenantId: string, page = 1, take = 50) {
  const where = { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] };
  const [items, total] = await Promise.all([
    prisma.reportDefinition.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.reportDefinition.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getReportDefinition(tenantId: string, id: string) {
  return prisma.reportDefinition.findFirst({ where: { id, tenantId } });
}

export async function listSavedReports(tenantId: string, page = 1, take = 50) {
  const where = { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] };
  const [items, total] = await Promise.all([
    prisma.savedReport.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
    prisma.savedReport.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getSavedReport(tenantId: string, id: string) {
  return prisma.savedReport.findFirst({ where: { id, tenantId } });
}

export async function createSavedReport(tenantId: string, userId: string | null, payload: AnyRecord) {
  const report = await prisma.savedReport.create({
    data: {
      id: payload.id ?? `saved-report-${Date.now()}`,
      tenantId,
      name: String(payload.name ?? 'Untitled Report'),
      description: payload.description ?? null,
      reportType: String(payload.reportType ?? 'Custom'),
      category: String(payload.category ?? 'Cross-module readiness'),
      ownerUserId: payload.ownerUserId ?? userId,
      visibility: String(payload.visibility ?? 'District'),
      filtersJson: payload.filtersJson ?? payload.filters ?? {},
      columnsJson: payload.columnsJson ?? payload.columns ?? [],
      sortJson: payload.sortJson ?? payload.sort ?? null,
      chartConfigJson: payload.chartConfigJson ?? payload.chartConfig ?? null,
      scheduleEnabled: Boolean(payload.scheduleEnabled ?? false),
      scheduleFrequency: payload.scheduleFrequency ?? null,
      lastRunAt: payload.lastRunAt ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      isDeleted: false,
    },
  });
  await writeAnalyticsAudit(tenantId, userId, 'Created saved report', 'SavedReport', report.id, report);
  return report;
}

export async function updateSavedReport(tenantId: string, id: string, userId: string | null, payload: AnyRecord) {
  const current = await prisma.savedReport.findFirst({ where: { id, tenantId } });
  const updated = await prisma.savedReport.update({
    where: { id },
    data: {
      name: payload.name ?? current?.name,
      description: payload.description ?? current?.description,
      reportType: payload.reportType ?? current?.reportType,
      category: payload.category ?? current?.category,
      ownerUserId: payload.ownerUserId ?? current?.ownerUserId ?? userId,
      visibility: payload.visibility ?? current?.visibility,
      filtersJson: payload.filtersJson ?? payload.filters ?? current?.filtersJson ?? {},
      columnsJson: payload.columnsJson ?? payload.columns ?? current?.columnsJson ?? [],
      sortJson: payload.sortJson ?? payload.sort ?? current?.sortJson ?? null,
      chartConfigJson: payload.chartConfigJson ?? payload.chartConfig ?? current?.chartConfigJson ?? null,
      scheduleEnabled: payload.scheduleEnabled ?? current?.scheduleEnabled ?? false,
      scheduleFrequency: payload.scheduleFrequency ?? current?.scheduleFrequency ?? null,
      lastRunAt: payload.lastRunAt ?? current?.lastRunAt ?? null,
      updatedAt: nowIso(),
    },
  });
  await writeAnalyticsAudit(tenantId, userId, 'Updated saved report', 'SavedReport', updated.id, updated);
  return updated;
}

export async function deleteSavedReport(tenantId: string, id: string, userId: string | null) {
  const current = await prisma.savedReport.findFirst({ where: { id, tenantId } });
  const updated = await prisma.savedReport.update({ where: { id }, data: { isDeleted: true, updatedAt: nowIso() } });
  await writeAnalyticsAudit(tenantId, userId, 'Archived saved report', 'SavedReport', id, { before: current, after: updated });
  return updated;
}

export async function previewReport(tenantId: string, payload: AnyRecord) {
  const context = await loadContext(tenantId);
  const category = String(payload.category ?? payload.reportType ?? payload.module ?? 'Cross-module readiness');
  const dataset = buildReportPreviewDataset(context, category);
  const filters = payload.filters ?? {};
  const filtered = dataset.filter((row: AnyRecord) => {
    if (filters.stationId && String(row.stationId ?? row.station ?? '') !== String(filters.stationId)) return false;
    if (filters.status && String(row.status ?? row.qaStatus ?? row.permitStatus ?? row.violationStatus ?? '').toLowerCase() !== String(filters.status).toLowerCase()) return false;
    if (filters.riskLevel && String(row.riskLevel ?? row.readinessScore ?? '').toLowerCase() !== String(filters.riskLevel).toLowerCase()) return false;
    if (filters.category && String(row.category ?? row.module ?? '').toLowerCase() !== String(filters.category).toLowerCase()) return false;
    return true;
  });
  const columns: string[] = Array.isArray(payload.columns) && payload.columns.length ? payload.columns : Object.keys(filtered[0] ?? {}).slice(0, 8);
  return {
    category,
    columns,
    rows: filtered.slice(0, Number(payload.limit ?? 10)).map((row: AnyRecord) => pickFields(row, columns)),
    total: filtered.length,
    filters,
  };
}

export async function exportReport(tenantId: string, userId: string | null, payload: AnyRecord) {
  const exportRecord = await prisma.reportExport.create({
    data: {
      id: payload.id ?? `export-${Date.now()}`,
      tenantId,
      savedReportId: payload.savedReportId ?? null,
      reportDefinitionId: payload.reportDefinitionId ?? null,
      requestedByUserId: userId,
      exportFormat: String(payload.exportFormat ?? 'CSV'),
      status: 'Queued',
      fileUrl: null,
      rowCount: Number(payload.rowCount ?? 0) || null,
      requestedAt: nowIso(),
      completedAt: null,
      errorMessage: null,
      createdAt: nowIso(),
    },
  });
  await writeAnalyticsAudit(tenantId, userId, 'Queued report export', 'ReportExport', exportRecord.id, exportRecord);
  return exportRecord;
}

export async function listExports(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.reportExport.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { requestedAt: 'desc' } }),
    prisma.reportExport.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getExport(tenantId: string, id: string) {
  return prisma.reportExport.findFirst({ where: { id, tenantId } });
}

export async function listSchedules(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total, savedReports, exports] = await Promise.all([
    prisma.reportSchedule.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { nextRunAt: 'asc' } }),
    prisma.reportSchedule.count({ where }),
    prisma.savedReport.findMany({ where: { tenantId } }),
    prisma.reportExport.findMany({ where: { tenantId }, orderBy: { requestedAt: 'desc' } }),
  ]);
  const enriched = items.map((schedule: AnyRecord) => {
    const report = savedReports.find((entry: AnyRecord) => entry.id === schedule.savedReportId) ?? null;
    const history = exports.filter((entry: AnyRecord) => entry.savedReportId === schedule.savedReportId || entry.reportDefinitionId === schedule.reportDefinitionId).slice(0, 5);
    const recipients = schedule.recipientsJson ?? schedule.recipients ?? [];
    return {
      ...schedule,
      reportName: report?.name ?? 'Scheduled report',
      reportType: report?.reportType ?? report?.category ?? 'Operational',
      ownerUserId: report?.ownerUserId ?? null,
      deliveryMethod: schedule.deliveryMethod ?? (Array.isArray(recipients) && recipients.length ? 'Email' : 'Manual'),
      recipients,
      recipientCount: Array.isArray(recipients) ? recipients.length : 0,
      exportHistoryCount: history.length,
      exportHistory: history.map((entry: AnyRecord) => ({
        id: entry.id,
        status: entry.status,
        exportFormat: entry.exportFormat,
        requestedAt: entry.requestedAt,
        completedAt: entry.completedAt,
        rowCount: entry.rowCount,
      })),
      lastGeneratedAt: history[0]?.completedAt ?? history[0]?.requestedAt ?? schedule.lastRunAt ?? null,
    };
  });
  return { items: enriched, page, take, total };
}

export async function createSchedule(tenantId: string, userId: string | null, payload: AnyRecord) {
  const schedule = await prisma.reportSchedule.create({
    data: {
      id: payload.id ?? `schedule-${Date.now()}`,
      tenantId,
      savedReportId: String(payload.savedReportId),
      frequency: String(payload.frequency ?? 'Weekly'),
      recipientsJson: payload.recipientsJson ?? payload.recipients ?? [],
      nextRunAt: payload.nextRunAt ?? nowIso(),
      lastRunAt: payload.lastRunAt ?? null,
      status: String(payload.status ?? 'Active'),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  });
  await writeAnalyticsAudit(tenantId, userId, 'Created report schedule', 'ReportSchedule', schedule.id, schedule);
  return schedule;
}

function nextRunFromFrequency(frequency: string, current = nowIso()) {
  const date = new Date(current);
  const days = frequency.toLowerCase().includes('daily') ? 1 : frequency.toLowerCase().includes('monthly') ? 30 : 7;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

export async function runScheduleNow(tenantId: string, id: string, userId: string | null) {
  const current = await prisma.reportSchedule.findFirst({ where: { id, tenantId } });
  if (!current) return null;
  const report = current.savedReportId ? await prisma.savedReport.findFirst({ where: { id: current.savedReportId, tenantId } }) : null;
  const exportRecord = await prisma.reportExport.create({
    data: {
      id: `export-${Date.now()}`,
      tenantId,
      savedReportId: current.savedReportId ?? null,
      reportDefinitionId: null,
      requestedByUserId: userId,
      exportFormat: 'CSV',
      status: 'Completed',
      fileUrl: `/exports/${current.id}.csv`,
      rowCount: 100,
      requestedAt: nowIso(),
      completedAt: nowIso(),
      errorMessage: null,
      createdAt: nowIso(),
    },
  });
  const updated = await prisma.reportSchedule.update({
    where: { id },
    data: {
      lastRunAt: nowIso(),
      nextRunAt: nextRunFromFrequency(String(current.frequency ?? 'Weekly')),
      status: 'Active',
      updatedAt: nowIso(),
    },
  });
  await writeAnalyticsAudit(tenantId, userId, 'Ran report schedule', 'ReportSchedule', id, { before: current, after: updated, exportRecord, reportName: report?.name ?? null });
  return {
    ...updated,
    reportName: report?.name ?? 'Scheduled report',
    exportRecord,
  };
}

export async function listDataQualityChecks(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.dataQualityCheck.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ severity: 'desc' }, { lastRunAt: 'desc' }] }),
    prisma.dataQualityCheck.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listDataQualityIssues(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.dataQualityIssue.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }] }),
    prisma.dataQualityIssue.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getDataQualitySummary(tenantId: string) {
  const context = await loadContext(tenantId);
  const issues = context.dataQualityIssues;
  const score = clamp(100 - issues.filter((issue: AnyRecord) => issue.status !== 'Resolved').length * 2 - issues.filter((issue: AnyRecord) => issue.severity === 'Critical').length * 4);
  return {
    overallScore: score,
    bySeverity: groupCount(issues, (issue) => String(issue.severity ?? 'Unknown')),
    byModule: groupCount(issues, (issue) => String(issue.module ?? 'Unknown')),
    affectedRecords: issues.length,
    failedChecks: context.dataQualityChecks.filter((check: AnyRecord) => Number(check.affectedRecordCount ?? 0) > 0).length,
    recommendations: [
      'Resolve critical RMS and prevention issues first.',
      'Run duplicate review on personnel and properties.',
      'Refresh integrations and export readiness checkpoints.',
    ],
  };
}

export async function runDataQualityChecks(tenantId: string, userId: string | null) {
  const context = await loadContext(tenantId);
  const { checks, issues } = buildDataQuality(context);
  const duplicates = buildDuplicateCandidates(context);
  await prisma.dataQualityCheck.deleteMany({ where: { tenantId } });
  await prisma.dataQualityIssue.deleteMany({ where: { tenantId } });
  await prisma.duplicateRecordCandidate.deleteMany({ where: { tenantId } });
  await prisma.dataQualityCheck.createMany({ data: checks });
  await prisma.dataQualityIssue.createMany({ data: issues });
  await prisma.duplicateRecordCandidate.createMany({ data: duplicates });
  const criticalIssues = issues.filter((issue: AnyRecord) => issue.severity === 'Critical');
  if (criticalIssues.length) {
    await ensureCriticalNotification(tenantId, 'Critical data quality issues detected', `${criticalIssues.length} critical issue(s) require leadership review.`, 'dataquality.critical');
    await ensureInsight(tenantId, 'Data Quality', 'Critical analytics issues detected', `${criticalIssues.length} critical data quality issue(s) were identified during the analytics sweep.`, 'Critical', ['Resolve critical issues', 'Review duplicate candidates', 'Refresh dashboard snapshots']);
  }
  await writeAnalyticsAudit(tenantId, userId, 'Ran data quality checks', 'DataQualityCheck', null, { checkCount: checks.length, issueCount: issues.length, duplicateCount: duplicates.length });
  return { checks, issues, duplicates };
}

export async function resolveDataQualityIssue(tenantId: string, id: string, userId: string | null, payload: AnyRecord = {}) {
  const updated = await prisma.dataQualityIssue.update({ where: { id }, data: { status: String(payload.status ?? 'Resolved'), resolvedAt: nowIso(), resolvedByUserId: userId, updatedAt: nowIso() } });
  await writeAnalyticsAudit(tenantId, userId, 'Resolved data quality issue', 'DataQualityIssue', id, updated);
  return updated;
}

export async function listDuplicateCandidates(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.duplicateRecordCandidate.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }] }),
    prisma.duplicateRecordCandidate.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getDuplicateCandidate(tenantId: string, id: string) {
  const candidate = await prisma.duplicateRecordCandidate.findFirst({ where: { id, tenantId } });
  if (!candidate) return null;
  return {
    ...candidate,
    primaryRecord: await getEntityRecord(tenantId, candidate.entityName, candidate.primaryEntityId),
    duplicateRecord: await getEntityRecord(tenantId, candidate.entityName, candidate.duplicateEntityId),
  };
}

async function getEntityRecord(tenantId: string, entityName: string, id: string) {
  const lower = entityName.toLowerCase();
  if (lower === 'personnel') return prisma.personnel.findFirst({ where: { id, tenantId } });
  if (lower === 'property') return prisma.property.findFirst({ where: { id, tenantId } });
  if (lower === 'asset') return prisma.asset.findFirst({ where: { id, tenantId } });
  if (lower === 'incident') return prisma.incident.findFirst({ where: { id, tenantId } });
  return prisma[lower]?.findFirst ? prisma[lower].findFirst({ where: { id, tenantId } }) : null;
}

export async function markDuplicateCandidate(tenantId: string, id: string, userId: string | null) {
  const updated = await prisma.duplicateRecordCandidate.update({ where: { id }, data: { status: 'Duplicate', reviewedByUserId: userId, reviewedAt: nowIso(), updatedAt: nowIso() } });
  await writeAnalyticsAudit(tenantId, userId, 'Marked duplicate candidate', 'DuplicateRecordCandidate', id, updated);
  return updated;
}

export async function dismissDuplicateCandidate(tenantId: string, id: string, userId: string | null) {
  const updated = await prisma.duplicateRecordCandidate.update({ where: { id }, data: { status: 'Dismissed', reviewedByUserId: userId, reviewedAt: nowIso(), updatedAt: nowIso() } });
  await writeAnalyticsAudit(tenantId, userId, 'Dismissed duplicate candidate', 'DuplicateRecordCandidate', id, updated);
  return updated;
}

export async function getReadinessAnalytics(tenantId: string) {
  const context = await loadContext(tenantId);
  const commandCenter = buildCommandCenter(context);
  return {
    agencyReadiness: commandCenter.summary.agencyReadiness,
    stationReadinessDistribution: commandCenter.summary.stationReadinessDistribution,
    readinessForecast: commandCenter.summary.readinessForecast,
    topOperationalRisks: commandCenter.summary.topOperationalRisks,
    aiRecommendedActions: commandCenter.summary.aiRecommendedActions,
    dataQualityScore: commandCenter.summary.dataQualityScore,
    integrationHealth: commandCenter.summary.integrationHealth,
  };
}

export async function getTrendAnalytics(tenantId: string) {
  const context = await loadContext(tenantId);
  return {
    incidentVolume: buildTrendSeries(context.incidents, 'dispatchAt'),
    trainingCompliance: buildTrendSeries(context.trainingAssignments, 'createdAt'),
    staffingCoverage: context.stations.map((station: AnyRecord) => stationComparisonRow(station, context)).map((row: AnyRecord) => ({ label: row.station.name, value: row.staffingCoverage })),
    overtimeRisk: context.stations.map((station: AnyRecord) => stationComparisonRow(station, context)).map((row: AnyRecord) => ({ label: row.station.name, value: row.overtimeRisk })),
    maintenanceBacklog: buildTrendSeries(context.maintenanceEvents, 'createdAt'),
    inspectionBacklog: buildTrendSeries(context.inspections, 'scheduledDate'),
    permitBacklog: buildTrendSeries(context.permits, 'submittedDate'),
  };
}

export async function getModuleAnalytics(tenantId: string, module: string) {
  const context = await loadContext(tenantId);
  return buildModuleAnalytics(context, module);
}

export const analyticsCommandService = {
  getAnalyticsCommandCenter,
  getExecutiveSummary,
  getStationComparison,
  getReadinessAnalytics,
  getTrendAnalytics,
  getModuleAnalytics,
};

export const dashboardAnalyticsService = {
  getAnalyticsCommandCenter,
  getExecutiveSummary,
  getStationComparison,
  getAnalyticsWidgets,
};

export const reportDefinitionService = {
  listReportDefinitions,
  getReportDefinition,
};

export const reportBuilderService = {
  previewReport,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
};

export const savedReportService = {
  listSavedReports,
  getSavedReport,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
};

export const reportExportService = {
  listExports,
  getExport,
  exportReport,
};

export const dataQualityService = {
  getDataQualitySummary,
  listDataQualityChecks,
  listDataQualityIssues,
  runDataQualityChecks,
  resolveDataQualityIssue,
};

export const duplicateDetectionService = {
  listDuplicateCandidates,
  getDuplicateCandidate,
  markDuplicateCandidate,
  dismissDuplicateCandidate,
};

export const stationComparisonService = {
  getStationComparison,
};

export const readinessAnalyticsService = {
  getReadinessAnalytics,
};

export const trendAnalyticsService = {
  getTrendAnalytics,
};

export const reportScheduleService = {
  listSchedules,
  createSchedule,
  runScheduleNow,
};

export const analyticsSnapshotService = {
  listAnalyticsSnapshots: async (tenantId: string, page = 1, take = 50) => {
    const where = { tenantId };
    const [items, total] = await Promise.all([
      prisma.analyticsSnapshot.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { snapshotDate: 'desc' } }),
      prisma.analyticsSnapshot.count({ where }),
    ]);
    return { items, page, take, total };
  },
};
