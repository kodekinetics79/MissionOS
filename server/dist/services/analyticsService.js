"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsSnapshotService = exports.reportScheduleService = exports.trendAnalyticsService = exports.readinessAnalyticsService = exports.stationComparisonService = exports.duplicateDetectionService = exports.dataQualityService = exports.reportExportService = exports.savedReportService = exports.reportBuilderService = exports.reportDefinitionService = exports.dashboardAnalyticsService = exports.analyticsCommandService = void 0;
exports.getAnalyticsCommandCenter = getAnalyticsCommandCenter;
exports.getExecutiveSummary = getExecutiveSummary;
exports.getStationComparison = getStationComparison;
exports.getAnalyticsWidgets = getAnalyticsWidgets;
exports.getAnalyticsWidget = getAnalyticsWidget;
exports.listReportDefinitions = listReportDefinitions;
exports.getReportDefinition = getReportDefinition;
exports.listSavedReports = listSavedReports;
exports.getSavedReport = getSavedReport;
exports.createSavedReport = createSavedReport;
exports.updateSavedReport = updateSavedReport;
exports.deleteSavedReport = deleteSavedReport;
exports.previewReport = previewReport;
exports.exportReport = exportReport;
exports.listExports = listExports;
exports.getExport = getExport;
exports.listSchedules = listSchedules;
exports.createSchedule = createSchedule;
exports.runScheduleNow = runScheduleNow;
exports.listDataQualityChecks = listDataQualityChecks;
exports.listDataQualityIssues = listDataQualityIssues;
exports.getDataQualitySummary = getDataQualitySummary;
exports.runDataQualityChecks = runDataQualityChecks;
exports.resolveDataQualityIssue = resolveDataQualityIssue;
exports.listDuplicateCandidates = listDuplicateCandidates;
exports.getDuplicateCandidate = getDuplicateCandidate;
exports.markDuplicateCandidate = markDuplicateCandidate;
exports.dismissDuplicateCandidate = dismissDuplicateCandidate;
exports.getReadinessAnalytics = getReadinessAnalytics;
exports.getTrendAnalytics = getTrendAnalytics;
exports.getModuleAnalytics = getModuleAnalytics;
const prisma_js_1 = require("../utils/prisma.js");
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page, take) => (page - 1) * take;
const nowIso = () => new Date().toISOString();
const dayMs = 24 * 60 * 60 * 1000;
const daysAgoIso = (days) => new Date(Date.now() - days * dayMs).toISOString();
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const isCritical = (value) => ['CRITICAL', 'FAILED', 'OUT_OF_SERVICE', 'OVERDUE', 'EXPIRED'].includes(statusCode(value));
const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
function parseDate(value) {
    if (!value)
        return null;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}
function pickFields(row, fields) {
    if (!fields.length)
        return row;
    return fields.reduce((accumulator, field) => {
        accumulator[field] = field.split('.').reduce((current, part) => current?.[part], row);
        return accumulator;
    }, {});
}
function groupCount(rows, selector) {
    return rows.reduce((accumulator, row) => {
        const key = selector(row);
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
    }, {});
}
function monthKey(dateLike) {
    const date = parseDate(dateLike);
    if (!date)
        return 'Unknown';
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
function normalizeRisk(score) {
    if (score >= 90)
        return 'Ready';
    if (score >= 75)
        return 'Watch';
    if (score >= 60)
        return 'At Risk';
    return 'Critical';
}
function buildTrendSeries(rows, dateField, metricField = 'count') {
    const grouped = rows.reduce((accumulator, row) => {
        const key = monthKey(row[dateField]);
        accumulator[key] = (accumulator[key] ?? 0) + Number(row[metricField] ?? 1);
        return accumulator;
    }, {});
    return Object.entries(grouped)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([label, value]) => ({ label, value }));
}
async function loadContext(tenantId) {
    const [stations, personnel, personnelCertifications, trainingAssignments, trainingAttendance, incidents, apparatus, assets, inventoryItems, maintenanceEvents, preventiveSchedules, properties, inspections, permits, violations, preplans, integrations, integrationLogs, notifications, aiInsights, reportDefinitions, savedReports, reportExports, dashboardWidgets, analyticsSnapshots, dataQualityChecks, dataQualityIssues, duplicateCandidates, reportSchedules, kpis, overtimeRecords, availabilityRecords, supportTickets, hydrants, auditLogs,] = await Promise.all([
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnelCertification.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.trainingAssignment.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.trainingAttendance.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incident.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.asset.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.inventoryItem.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.maintenanceEvent.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preventiveMaintenanceSchedule.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.property.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.inspection.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.permit.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.violation.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preplan.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.integrationSystem.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.integrationLog.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.reportDefinition.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.savedReport.findMany({ where: { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] } }),
        prisma_js_1.prisma.reportExport.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.dashboardWidget.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.analyticsSnapshot.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.dataQualityCheck.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.dataQualityIssue.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.duplicateRecordCandidate.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.reportSchedule.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.analyticsKpiDefinition.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.overtimeRecord.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.availabilityRecord.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.supportTicket.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.hydrant.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.auditLog.findMany({ where: { tenantId } }),
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
function stationComparisonRow(station, context) {
    const stationPersonnel = context.personnel.filter((person) => person.currentStationId === station.id || person.stationId === station.id);
    const stationApparatus = context.apparatus.filter((unit) => unit.stationId === station.id);
    const stationAssets = context.assets.filter((asset) => asset.stationId === station.id);
    const stationInventory = context.inventoryItems.filter((item) => item.stationId === station.id);
    const stationInspections = context.inspections.filter((inspection) => inspection.stationId === station.id);
    const stationProperties = context.properties.filter((property) => property.responseStationId === station.id || property.stationArea === station.name || property.stationArea === station.responseArea);
    const stationNotifications = context.notifications.filter((notification) => String(notification.message ?? '').includes(station.name) || String(notification.title ?? '').includes(station.name));
    const stationInsights = context.aiInsights.filter((insight) => String(insight.summary ?? '').includes(station.name) || String(insight.title ?? '').includes(station.name));
    const stationOvertime = context.overtimeRecords.filter((record) => stationPersonnel.some((person) => person.id === record.personnelId));
    const trainingCompletion = percent(context.trainingAssignments.filter((assignment) => stationPersonnel.some((person) => person.id === assignment.personnelId) && statusCode(assignment.status) === 'COMPLETED').length, Math.max(context.trainingAssignments.filter((assignment) => stationPersonnel.some((person) => person.id === assignment.personnelId)).length, 1));
    const certificationRisk = context.personnelCertifications.filter((cert) => stationPersonnel.some((person) => person.id === cert.personnelId) && ['Expired', 'Expiring Soon'].includes(String(cert.status ?? ''))).length;
    const maintenanceRisk = stationApparatus.filter((unit) => isCritical(unit.status) || isCritical(unit.readinessStatus) || unit.nextMaintenanceDue && parseDate(unit.nextMaintenanceDue) && parseDate(unit.nextMaintenanceDue) < new Date()).length;
    const inventoryRisk = stationInventory.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length;
    const inspectionBacklog = stationInspections.filter((inspection) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? ''))).length;
    const preplanCompleteness = stationProperties.length ? Math.round(100 - (context.preplans.filter((preplan) => stationProperties.some((property) => property.id === preplan.propertyId) && ['Incomplete', 'Draft'].includes(String(preplan.status ?? ''))).length / stationProperties.length) * 100) : 100;
    return {
        station,
        readinessScore: Number(station.readinessScore ?? station.readiness ?? 0),
        incidentVolume: context.incidents.filter((incident) => incident.stationId === station.id).length,
        staffingCoverage: clamp(100 - Number(station.staffingGap ?? 0) * 10),
        trainingCompliance: trainingCompletion,
        certificationRisk,
        apparatusReadiness: percent(stationApparatus.filter((unit) => statusCode(unit.status) === 'READY').length, Math.max(stationApparatus.length, 1)),
        maintenanceRisk,
        inventoryRisk,
        inspectionBacklog,
        preplanCompleteness,
        openNotifications: stationNotifications.length,
        aiRiskCount: stationInsights.length,
        overtimeRisk: stationOvertime.length,
    };
}
function buildCommandCenter(context) {
    const stationRows = context.stations.map((station) => stationComparisonRow(station, context));
    const agencyReadiness = Math.round(stationRows.reduce((total, row) => total + row.readinessScore, 0) / Math.max(stationRows.length, 1));
    const trainingCompliance = percent(context.trainingAssignments.filter((assignment) => statusCode(assignment.status) === 'COMPLETED').length, Math.max(context.trainingAssignments.length, 1));
    const staffingCoverage = Math.round(stationRows.reduce((total, row) => total + row.staffingCoverage, 0) / Math.max(stationRows.length, 1));
    const overtimeRisk = Math.round(stationRows.reduce((total, row) => total + row.overtimeRisk, 0) / Math.max(stationRows.length, 1));
    const apparatusReady = context.apparatus.filter((unit) => statusCode(unit.status) === 'READY').length;
    const apparatusWarning = context.apparatus.filter((unit) => statusCode(unit.status) === 'WARNING' || statusCode(unit.status) === 'MAINTENANCE_DUE').length;
    const apparatusOutOfService = context.apparatus.filter((unit) => statusCode(unit.status) === 'OUT_OF_SERVICE').length;
    const maintenanceBacklog = context.maintenanceEvents.filter((event) => ['Reported', 'Scheduled', 'In Progress', 'Deferred'].includes(String(event.status ?? ''))).length;
    const inventoryShortage = context.inventoryItems.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length;
    const inspectionBacklog = context.inspections.filter((inspection) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? ''))).length;
    const permitBacklog = context.permits.filter((permit) => ['Submitted', 'Under Review', 'Additional Info Required'].includes(String(permit.status ?? ''))).length;
    const preplanIncomplete = context.preplans.filter((preplan) => ['Draft', 'Incomplete', 'Review Due'].includes(String(preplan.status ?? ''))).length;
    const integrationHealth = {
        healthy: context.integrations.filter((integration) => statusCode(integration.status) === 'HEALTHY' || statusCode(integration.status) === 'ONLINE').length,
        degraded: context.integrations.filter((integration) => statusCode(integration.status) === 'DEGRADED' || statusCode(integration.status) === 'PAUSED').length,
        failed: context.integrations.filter((integration) => statusCode(integration.status) === 'FAILED' || statusCode(integration.status) === 'OFFLINE').length,
    };
    const dataQualityScore = clamp(100 - context.dataQualityIssues.filter((issue) => issue.status !== 'Resolved').length * 2);
    const readinessForecast = clamp(agencyReadiness + Math.round((trainingCompliance + staffingCoverage) / 10) - Math.round(overtimeRisk / 10));
    const topRisks = [
        ...context.aiInsights.filter((insight) => ['Critical', 'Warning'].includes(String(insight.severity))).slice(0, 4),
        ...context.dataQualityIssues.filter((issue) => issue.severity === 'Critical').slice(0, 4).map((issue) => ({
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
            }, {}),
            incidentVolumeTrends: buildTrendSeries(context.incidents, 'dispatchAt'),
            emsPercentage: percent(context.incidents.filter((incident) => String(incident.incidentType ?? '').includes('EMS') || Number(incident.patientCount ?? 0) > 0).length, Math.max(context.incidents.length, 1)),
            staffingCoverage,
            overtimeRisk,
            trainingCompliance,
            certificationRisk: context.personnelCertifications.filter((cert) => ['Expiring Soon', 'Expired'].includes(String(cert.status ?? ''))).length,
            apparatusReadiness: percent(apparatusReady, Math.max(context.apparatus.length, 1)),
            maintenanceBacklog,
            inventoryShortage,
            inspectionBacklog,
            permitBacklog,
            violationSeverityDistribution: groupCount(context.violations, (violation) => String(violation.severity ?? 'Unknown')),
            preplanCompleteness: percent(context.preplans.filter((preplan) => statusCode(preplan.status) === 'ACTIVE').length, Math.max(context.preplans.length, 1)),
            integrationHealth,
            dataQualityScore,
            openDataQualityIssues: context.dataQualityIssues.filter((issue) => issue.status !== 'Resolved').length,
            notificationCount: context.notifications.length,
            topOperationalRisks: topRisks,
            aiRecommendedActions: context.aiInsights.flatMap((insight) => insight.recommendedActions ?? []).slice(0, 10),
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
            inventoryShortage: context.inventoryItems.map((item) => ({ label: item.name, value: Number(item.quantityOnHand ?? item.quantity ?? 0) })),
            inspectionBacklog: buildTrendSeries(context.inspections, 'scheduledDate'),
            permitBacklog: buildTrendSeries(context.permits, 'submittedDate'),
        },
        stationComparison: stationRows,
        notifications: context.notifications,
        aiInsights: context.aiInsights,
        dataQualityScore,
    };
}
function buildExecutiveSummary(commandCenter, context) {
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
        supportSla: context.supportTickets.filter((ticket) => !['Resolved', 'Closed'].includes(String(ticket.status ?? ''))).length,
        trendStatus: weeklyChange,
        topFiveRisks: commandCenter.topRisks.slice(0, 5),
        recommendedActions: commandCenter.summary.aiRecommendedActions.slice(0, 5),
    };
}
function buildModuleAnalytics(context, module) {
    const normalized = module.toLowerCase();
    if (normalized === 'incidents') {
        const trends = buildTrendSeries(context.incidents, 'dispatchAt');
        return {
            module: 'incidents',
            kpis: {
                incidentCount: context.incidents.length,
                emsPercentage: percent(context.incidents.filter((incident) => String(incident.incidentType ?? '').includes('EMS') || Number(incident.patientCount ?? 0) > 0).length, Math.max(context.incidents.length, 1)),
                qaNeeded: context.incidents.filter((incident) => incident.qaStatus === 'QA Needed').length,
                nerisReady: context.incidents.filter((incident) => incident.nerisReady).length,
            },
            trends,
            distributions: {
                byType: groupCount(context.incidents, (incident) => String(incident.incidentType ?? 'Unknown')),
                qaStatus: groupCount(context.incidents, (incident) => String(incident.qaStatus ?? 'Unknown')),
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('station') || String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
        };
    }
    if (normalized === 'training') {
        const completed = context.trainingAssignments.filter((assignment) => statusCode(assignment.status) === 'COMPLETED').length;
        return {
            module: 'training',
            kpis: {
                assignmentCount: context.trainingAssignments.length,
                completionRate: percent(completed, Math.max(context.trainingAssignments.length, 1)),
                expiringCertifications: context.personnelCertifications.filter((cert) => ['Expiring Soon', 'Expired'].includes(String(cert.status ?? ''))).length,
                overdueAssignments: context.trainingAssignments.filter((assignment) => statusCode(assignment.status) !== 'COMPLETED').length,
            },
            trends: buildTrendSeries(context.trainingAssignments, 'createdAt'),
            distributions: {
                byCourse: groupCount(context.trainingAssignments, (assignment) => String(assignment.courseId ?? 'Unknown')),
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
        };
    }
    if (normalized === 'staffing') {
        const stationRows = context.stations.map((station) => stationComparisonRow(station, context));
        return {
            module: 'staffing',
            kpis: {
                coverage: Math.round(stationRows.reduce((total, row) => total + row.staffingCoverage, 0) / Math.max(stationRows.length, 1)),
                overtimeRecords: context.overtimeRecords.length,
                availabilityRecords: context.availabilityRecords.length,
                gaps: context.stations.filter((station) => Number(station.staffingGap ?? 0) > 0).length,
            },
            trends: stationRows.map((row) => ({ label: row.station.name, value: row.staffingCoverage })),
            distributions: {
                byStation: stationRows,
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('overtime') || String(insight.category ?? '').toLowerCase().includes('staff')).slice(0, 3),
        };
    }
    if (normalized === 'personnel') {
        const snapshots = context.analyticsSnapshots.filter((snapshot) => snapshot.module === 'Personnel');
        return {
            module: 'personnel',
            kpis: {
                personnelCount: context.personnel.length,
                ready: context.personnel.filter((personnel) => Number(personnel.readinessScore ?? 0) >= 90).length,
                watch: context.personnel.filter((personnel) => Number(personnel.readinessScore ?? 0) >= 75 && Number(personnel.readinessScore ?? 0) < 90).length,
                critical: context.personnel.filter((personnel) => Number(personnel.readinessScore ?? 0) < 60).length,
            },
            trends: snapshots.slice(-12).map((snapshot) => ({ label: monthKey(snapshot.snapshotDate), value: Number(snapshot.metricsJson?.overallReadinessScore ?? snapshot.metrics?.overallReadinessScore ?? 0) })),
            distributions: {
                readiness: groupCount(context.personnel, (personnel) => normalizeRisk(Number(personnel.readinessScore ?? 0))),
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('station') || String(insight.category ?? '').toLowerCase().includes('training')).slice(0, 3),
        };
    }
    if (normalized === 'assets') {
        return {
            module: 'assets',
            kpis: {
                apparatusCount: context.apparatus.length,
                ready: context.apparatus.filter((unit) => statusCode(unit.status) === 'READY').length,
                warning: context.apparatus.filter((unit) => statusCode(unit.status) === 'WARNING' || statusCode(unit.status) === 'MAINTENANCE_DUE').length,
                outOfService: context.apparatus.filter((unit) => statusCode(unit.status) === 'OUT_OF_SERVICE').length,
                lowStock: context.inventoryItems.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
            },
            trends: buildTrendSeries(context.maintenanceEvents, 'createdAt'),
            distributions: {
                readiness: groupCount(context.apparatus, (unit) => statusCode(unit.status)),
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('readiness') || String(insight.category ?? '').toLowerCase().includes('overtime')).slice(0, 3),
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
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('prevention')).slice(0, 3),
        };
    }
    if (normalized === 'integrations') {
        return {
            module: 'integrations',
            kpis: {
                systems: context.integrations.length,
                healthy: context.integrations.filter((integration) => statusCode(integration.status) === 'HEALTHY').length,
                degraded: context.integrations.filter((integration) => statusCode(integration.status) === 'DEGRADED').length,
                failed: context.integrations.filter((integration) => statusCode(integration.status) === 'FAILED').length,
            },
            trends: buildTrendSeries(context.integrationLogs, 'createdAt'),
            distributions: {
                status: groupCount(context.integrations, (integration) => String(integration.status ?? 'Unknown')),
            },
            insight: context.aiInsights.filter((insight) => String(insight.category ?? '').toLowerCase().includes('integration')).slice(0, 3),
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
function buildDataQuality(context) {
    const issues = [];
    const checks = [];
    const criticalCerts = context.personnelCertifications.filter((cert) => ['Expired', 'Expiring Soon'].includes(String(cert.status ?? '')));
    const missingStationPersonnel = context.personnel.filter((personnel) => !personnel.currentStationId && !personnel.stationId);
    const assetsWithoutLocation = context.assets.filter((asset) => !asset.stationId && !asset.apparatusId && !asset.assignedPersonnelId);
    const lowInventory = context.inventoryItems.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0));
    const propertyNoStation = context.properties.filter((property) => !property.responseStationId);
    const overdueInspections = context.inspections.filter((inspection) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? '')));
    const overduePermits = context.permits.filter((permit) => ['Submitted', 'Under Review', 'Additional Info Required', 'Expired'].includes(String(permit.status ?? '')));
    const incompletePreplans = context.preplans.filter((preplan) => ['Draft', 'Incomplete', 'Review Due'].includes(String(preplan.status ?? '')));
    const failingIntegrations = context.integrations.filter((integration) => isCritical(integration.status));
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
    const checkCounts = new Map([
        ['incident.station', context.incidents.filter((incident) => !incident.stationId).length],
        ['incident.personnel', context.incidents.filter((incident) => !incident.assignedTo && !(incident.personnel ?? []).length).length],
        ['neris.required', context.incidents.filter((incident) => incident.nerisStatus === 'Rejected' || incident.epcrStatus === 'Failed').length],
        ['personnel.station', missingStationPersonnel.length],
        ['cert.expiring', criticalCerts.length],
        ['training.overdue', context.trainingAssignments.filter((assignment) => statusCode(assignment.status) !== 'COMPLETED').length],
        ['apparatus.station', context.apparatus.filter((unit) => !unit.stationId).length],
        ['asset.location', assetsWithoutLocation.length],
        ['inventory.reorder', lowInventory.length],
        ['property.responseStation', propertyNoStation.length],
        ['inspection.overdue', overdueInspections.length],
        ['permit.overdue', overduePermits.length],
        ['preplan.incomplete', incompletePreplans.length],
        ['integration.failed', failingIntegrations.length],
        ['duplicate.personnel', context.personnel.length > 1 ? Math.ceil(context.personnel.length / 12) : 0],
        ['duplicate.property', Math.ceil(context.properties.length / 15)],
        ['asset.readiness', context.apparatus.filter((unit) => isCritical(unit.status) || isCritical(unit.readinessStatus)).length],
        ['prevention.hydrant', context.hydrants?.length ? Math.ceil(context.hydrants.length / 9) : 0],
        ['rms.qa', context.incidents.filter((incident) => incident.qaStatus === 'QA Needed').length],
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
    const issueSources = [
        { records: context.incidents.filter((incident) => !incident.stationId), entityKey: 'incident' },
        { records: context.personnel.filter((personnel) => !personnel.currentStationId && !personnel.stationId), entityKey: 'personnel' },
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
function buildDuplicateCandidates(context) {
    const candidates = [];
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
function buildAnalyticsSnapshots(context) {
    const snapshots = [];
    const modules = ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'];
    context.stations.forEach((station, index) => {
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
                    incidentCount: context.incidents.filter((incident) => incident.stationId === station.id).length,
                    staffingCoverage: Math.max(60, 100 - Number(station.staffingGap ?? 0) * 10),
                    maintenanceBacklog: context.maintenanceEvents.filter((event) => event.apparatusId && context.apparatus.some((unit) => unit.id === event.apparatusId && unit.stationId === station.id)).length,
                },
                riskLevel: normalizeRisk(base),
                createdAt: daysAgoIso(1),
            });
        });
    });
    context.personnel.slice(0, 20).forEach((member, index) => {
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
function buildReportPreviewDataset(context, category) {
    const normalized = category.toLowerCase();
    if (normalized.includes('incident') || normalized.includes('operations')) {
        return context.incidents.map((incident) => ({
            incidentNumber: incident.incidentNumber,
            incidentType: incident.incidentType,
            station: context.stations.find((station) => station.id === incident.stationId)?.name ?? incident.stationId,
            status: incident.status,
            qaStatus: incident.qaStatus,
            nerisStatus: incident.nerisStatus,
            epcrStatus: incident.epcrStatus,
            location: incident.location,
            dispatchAt: incident.dispatchAt,
        }));
    }
    if (normalized.includes('training')) {
        return context.trainingAssignments.map((assignment) => ({
            personnel: context.personnel.find((personnel) => personnel.id === assignment.personnelId)?.fullName ?? assignment.personnelId,
            course: assignment.courseId,
            status: assignment.status,
            dueDate: assignment.dueDate,
            score: assignment.score,
        }));
    }
    if (normalized.includes('staff')) {
        return context.personnel.map((personnel) => ({
            personnel: personnel.fullName ?? `${personnel.firstName ?? ''} ${personnel.lastName ?? ''}`.trim(),
            station: context.stations.find((station) => station.id === personnel.currentStationId)?.name ?? personnel.currentStationId,
            rank: personnel.rank ?? personnel.rankId ?? '—',
            readinessScore: Number(personnel.readinessScore ?? 0),
            status: personnel.employmentStatus ?? personnel.status,
        }));
    }
    if (normalized.includes('asset')) {
        return context.apparatus.map((unit) => ({
            unitNumber: unit.unitNumber,
            callSign: unit.callSign,
            station: context.stations.find((station) => station.id === unit.stationId)?.name ?? unit.stationId,
            status: unit.status,
            readinessScore: Number(unit.readinessScore ?? 0),
            nextMaintenanceDue: unit.nextMaintenanceDue,
        }));
    }
    if (normalized.includes('prevention')) {
        return context.properties.map((property) => ({
            propertyNumber: property.propertyNumber ?? property.id,
            name: property.name,
            station: context.stations.find((station) => station.id === property.responseStationId)?.name ?? property.responseStationId,
            riskLevel: property.occupancyRiskLevel ?? property.riskLevel,
            lastInspection: context.inspections.filter((inspection) => inspection.propertyId === property.id).sort((left, right) => new Date(String(right.scheduledDate ?? right.createdAt)).getTime() - new Date(String(left.scheduledDate ?? left.createdAt)).getTime())[0]?.scheduledDate ?? null,
        }));
    }
    if (normalized.includes('integration')) {
        return context.integrations.map((integration) => ({
            name: integration.name,
            systemType: integration.systemType,
            status: integration.status,
            lastSyncAt: integration.lastSyncAt,
            lastLogStatus: context.integrationLogs.find((log) => log.integrationId === integration.id)?.status ?? 'Unknown',
        }));
    }
    return context.stations.map((station) => ({
        station: station.name,
        readinessScore: Number(station.readinessScore ?? station.readiness ?? 0),
        incidentCount: context.incidents.filter((incident) => incident.stationId === station.id).length,
        trainingCompliance: percent(context.trainingAssignments.filter((assignment) => context.personnel.some((personnel) => personnel.id === assignment.personnelId && personnel.currentStationId === station.id) && statusCode(assignment.status) === 'COMPLETED').length, Math.max(context.trainingAssignments.filter((assignment) => context.personnel.some((personnel) => personnel.id === assignment.personnelId && personnel.currentStationId === station.id)).length, 1)),
        assetReadiness: percent(context.apparatus.filter((unit) => unit.stationId === station.id && statusCode(unit.status) === 'READY').length, Math.max(context.apparatus.filter((unit) => unit.stationId === station.id).length, 1)),
    }));
}
async function writeAnalyticsAudit(tenantId, userId, action, entityName, entityId, after) {
    await prisma_js_1.prisma.auditLog.create({
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
async function ensureCriticalNotification(tenantId, title, message, notificationType) {
    await prisma_js_1.prisma.notification.create({
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
async function ensureInsight(tenantId, category, title, summary, severity, recommendedActions) {
    await prisma_js_1.prisma.aiInsight.create({
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
async function getAnalyticsCommandCenter(tenantId) {
    const context = await loadContext(tenantId);
    return buildCommandCenter(context);
}
async function getExecutiveSummary(tenantId) {
    const context = await loadContext(tenantId);
    return buildExecutiveSummary(buildCommandCenter(context), context);
}
async function getStationComparison(tenantId, options = {}) {
    const context = await loadContext(tenantId);
    let items = context.stations.map((station) => stationComparisonRow(station, context));
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
async function getAnalyticsWidgets(tenantId) {
    const context = await loadContext(tenantId);
    return { items: context.dashboardWidgets.sort((left, right) => Number(left.positionJson?.y ?? 0) - Number(right.positionJson?.y ?? 0)) };
}
async function getAnalyticsWidget(tenantId, code) {
    const widgets = await prisma_js_1.prisma.dashboardWidget.findMany({ where: { tenantId, widgetCode: code } });
    return widgets[0] ?? null;
}
async function listReportDefinitions(tenantId, page = 1, take = 50) {
    const where = { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.reportDefinition.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
        prisma_js_1.prisma.reportDefinition.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getReportDefinition(tenantId, id) {
    return prisma_js_1.prisma.reportDefinition.findFirst({ where: { id, tenantId } });
}
async function listSavedReports(tenantId, page = 1, take = 50) {
    const where = { tenantId, OR: [{ isDeleted: false }, { isDeleted: null }] };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.savedReport.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
        prisma_js_1.prisma.savedReport.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getSavedReport(tenantId, id) {
    return prisma_js_1.prisma.savedReport.findFirst({ where: { id, tenantId } });
}
async function createSavedReport(tenantId, userId, payload) {
    const report = await prisma_js_1.prisma.savedReport.create({
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
async function updateSavedReport(tenantId, id, userId, payload) {
    const current = await prisma_js_1.prisma.savedReport.findFirst({ where: { id, tenantId } });
    const updated = await prisma_js_1.prisma.savedReport.update({
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
async function deleteSavedReport(tenantId, id, userId) {
    const current = await prisma_js_1.prisma.savedReport.findFirst({ where: { id, tenantId } });
    const updated = await prisma_js_1.prisma.savedReport.update({ where: { id }, data: { isDeleted: true, updatedAt: nowIso() } });
    await writeAnalyticsAudit(tenantId, userId, 'Archived saved report', 'SavedReport', id, { before: current, after: updated });
    return updated;
}
async function previewReport(tenantId, payload) {
    const context = await loadContext(tenantId);
    const category = String(payload.category ?? payload.reportType ?? payload.module ?? 'Cross-module readiness');
    const dataset = buildReportPreviewDataset(context, category);
    const filters = payload.filters ?? {};
    const filtered = dataset.filter((row) => {
        if (filters.stationId && String(row.stationId ?? row.station ?? '') !== String(filters.stationId))
            return false;
        if (filters.status && String(row.status ?? row.qaStatus ?? row.permitStatus ?? row.violationStatus ?? '').toLowerCase() !== String(filters.status).toLowerCase())
            return false;
        if (filters.riskLevel && String(row.riskLevel ?? row.readinessScore ?? '').toLowerCase() !== String(filters.riskLevel).toLowerCase())
            return false;
        if (filters.category && String(row.category ?? row.module ?? '').toLowerCase() !== String(filters.category).toLowerCase())
            return false;
        return true;
    });
    const columns = Array.isArray(payload.columns) && payload.columns.length ? payload.columns : Object.keys(filtered[0] ?? {}).slice(0, 8);
    return {
        category,
        columns,
        rows: filtered.slice(0, Number(payload.limit ?? 10)).map((row) => pickFields(row, columns)),
        total: filtered.length,
        filters,
    };
}
async function exportReport(tenantId, userId, payload) {
    const exportRecord = await prisma_js_1.prisma.reportExport.create({
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
async function listExports(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.reportExport.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { requestedAt: 'desc' } }),
        prisma_js_1.prisma.reportExport.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getExport(tenantId, id) {
    return prisma_js_1.prisma.reportExport.findFirst({ where: { id, tenantId } });
}
async function listSchedules(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total, savedReports, exports] = await Promise.all([
        prisma_js_1.prisma.reportSchedule.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { nextRunAt: 'asc' } }),
        prisma_js_1.prisma.reportSchedule.count({ where }),
        prisma_js_1.prisma.savedReport.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.reportExport.findMany({ where: { tenantId }, orderBy: { requestedAt: 'desc' } }),
    ]);
    const enriched = items.map((schedule) => {
        const report = savedReports.find((entry) => entry.id === schedule.savedReportId) ?? null;
        const history = exports.filter((entry) => entry.savedReportId === schedule.savedReportId || entry.reportDefinitionId === schedule.reportDefinitionId).slice(0, 5);
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
            exportHistory: history.map((entry) => ({
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
async function createSchedule(tenantId, userId, payload) {
    const schedule = await prisma_js_1.prisma.reportSchedule.create({
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
function nextRunFromFrequency(frequency, current = nowIso()) {
    const date = new Date(current);
    const days = frequency.toLowerCase().includes('daily') ? 1 : frequency.toLowerCase().includes('monthly') ? 30 : 7;
    date.setDate(date.getDate() + days);
    return date.toISOString();
}
async function runScheduleNow(tenantId, id, userId) {
    const current = await prisma_js_1.prisma.reportSchedule.findFirst({ where: { id, tenantId } });
    if (!current)
        return null;
    const report = current.savedReportId ? await prisma_js_1.prisma.savedReport.findFirst({ where: { id: current.savedReportId, tenantId } }) : null;
    const exportRecord = await prisma_js_1.prisma.reportExport.create({
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
    const updated = await prisma_js_1.prisma.reportSchedule.update({
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
async function listDataQualityChecks(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.dataQualityCheck.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ severity: 'desc' }, { lastRunAt: 'desc' }] }),
        prisma_js_1.prisma.dataQualityCheck.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listDataQualityIssues(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.dataQualityIssue.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }] }),
        prisma_js_1.prisma.dataQualityIssue.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getDataQualitySummary(tenantId) {
    const context = await loadContext(tenantId);
    const issues = context.dataQualityIssues;
    const score = clamp(100 - issues.filter((issue) => issue.status !== 'Resolved').length * 2 - issues.filter((issue) => issue.severity === 'Critical').length * 4);
    return {
        overallScore: score,
        bySeverity: groupCount(issues, (issue) => String(issue.severity ?? 'Unknown')),
        byModule: groupCount(issues, (issue) => String(issue.module ?? 'Unknown')),
        affectedRecords: issues.length,
        failedChecks: context.dataQualityChecks.filter((check) => Number(check.affectedRecordCount ?? 0) > 0).length,
        recommendations: [
            'Resolve critical RMS and prevention issues first.',
            'Run duplicate review on personnel and properties.',
            'Refresh integrations and export readiness checkpoints.',
        ],
    };
}
async function runDataQualityChecks(tenantId, userId) {
    const context = await loadContext(tenantId);
    const { checks, issues } = buildDataQuality(context);
    const duplicates = buildDuplicateCandidates(context);
    await prisma_js_1.prisma.dataQualityCheck.deleteMany({ where: { tenantId } });
    await prisma_js_1.prisma.dataQualityIssue.deleteMany({ where: { tenantId } });
    await prisma_js_1.prisma.duplicateRecordCandidate.deleteMany({ where: { tenantId } });
    await prisma_js_1.prisma.dataQualityCheck.createMany({ data: checks });
    await prisma_js_1.prisma.dataQualityIssue.createMany({ data: issues });
    await prisma_js_1.prisma.duplicateRecordCandidate.createMany({ data: duplicates });
    const criticalIssues = issues.filter((issue) => issue.severity === 'Critical');
    if (criticalIssues.length) {
        await ensureCriticalNotification(tenantId, 'Critical data quality issues detected', `${criticalIssues.length} critical issue(s) require leadership review.`, 'dataquality.critical');
        await ensureInsight(tenantId, 'Data Quality', 'Critical analytics issues detected', `${criticalIssues.length} critical data quality issue(s) were identified during the analytics sweep.`, 'Critical', ['Resolve critical issues', 'Review duplicate candidates', 'Refresh dashboard snapshots']);
    }
    await writeAnalyticsAudit(tenantId, userId, 'Ran data quality checks', 'DataQualityCheck', null, { checkCount: checks.length, issueCount: issues.length, duplicateCount: duplicates.length });
    return { checks, issues, duplicates };
}
async function resolveDataQualityIssue(tenantId, id, userId, payload = {}) {
    const updated = await prisma_js_1.prisma.dataQualityIssue.update({ where: { id }, data: { status: String(payload.status ?? 'Resolved'), resolvedAt: nowIso(), resolvedByUserId: userId, updatedAt: nowIso() } });
    await writeAnalyticsAudit(tenantId, userId, 'Resolved data quality issue', 'DataQualityIssue', id, updated);
    return updated;
}
async function listDuplicateCandidates(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.duplicateRecordCandidate.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ matchScore: 'desc' }, { createdAt: 'desc' }] }),
        prisma_js_1.prisma.duplicateRecordCandidate.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getDuplicateCandidate(tenantId, id) {
    const candidate = await prisma_js_1.prisma.duplicateRecordCandidate.findFirst({ where: { id, tenantId } });
    if (!candidate)
        return null;
    return {
        ...candidate,
        primaryRecord: await getEntityRecord(tenantId, candidate.entityName, candidate.primaryEntityId),
        duplicateRecord: await getEntityRecord(tenantId, candidate.entityName, candidate.duplicateEntityId),
    };
}
async function getEntityRecord(tenantId, entityName, id) {
    const lower = entityName.toLowerCase();
    if (lower === 'personnel')
        return prisma_js_1.prisma.personnel.findFirst({ where: { id, tenantId } });
    if (lower === 'property')
        return prisma_js_1.prisma.property.findFirst({ where: { id, tenantId } });
    if (lower === 'asset')
        return prisma_js_1.prisma.asset.findFirst({ where: { id, tenantId } });
    if (lower === 'incident')
        return prisma_js_1.prisma.incident.findFirst({ where: { id, tenantId } });
    return prisma_js_1.prisma[lower]?.findFirst ? prisma_js_1.prisma[lower].findFirst({ where: { id, tenantId } }) : null;
}
async function markDuplicateCandidate(tenantId, id, userId) {
    const updated = await prisma_js_1.prisma.duplicateRecordCandidate.update({ where: { id }, data: { status: 'Duplicate', reviewedByUserId: userId, reviewedAt: nowIso(), updatedAt: nowIso() } });
    await writeAnalyticsAudit(tenantId, userId, 'Marked duplicate candidate', 'DuplicateRecordCandidate', id, updated);
    return updated;
}
async function dismissDuplicateCandidate(tenantId, id, userId) {
    const updated = await prisma_js_1.prisma.duplicateRecordCandidate.update({ where: { id }, data: { status: 'Dismissed', reviewedByUserId: userId, reviewedAt: nowIso(), updatedAt: nowIso() } });
    await writeAnalyticsAudit(tenantId, userId, 'Dismissed duplicate candidate', 'DuplicateRecordCandidate', id, updated);
    return updated;
}
async function getReadinessAnalytics(tenantId) {
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
async function getTrendAnalytics(tenantId) {
    const context = await loadContext(tenantId);
    return {
        incidentVolume: buildTrendSeries(context.incidents, 'dispatchAt'),
        trainingCompliance: buildTrendSeries(context.trainingAssignments, 'createdAt'),
        staffingCoverage: context.stations.map((station) => stationComparisonRow(station, context)).map((row) => ({ label: row.station.name, value: row.staffingCoverage })),
        overtimeRisk: context.stations.map((station) => stationComparisonRow(station, context)).map((row) => ({ label: row.station.name, value: row.overtimeRisk })),
        maintenanceBacklog: buildTrendSeries(context.maintenanceEvents, 'createdAt'),
        inspectionBacklog: buildTrendSeries(context.inspections, 'scheduledDate'),
        permitBacklog: buildTrendSeries(context.permits, 'submittedDate'),
    };
}
async function getModuleAnalytics(tenantId, module) {
    const context = await loadContext(tenantId);
    return buildModuleAnalytics(context, module);
}
exports.analyticsCommandService = {
    getAnalyticsCommandCenter,
    getExecutiveSummary,
    getStationComparison,
    getReadinessAnalytics,
    getTrendAnalytics,
    getModuleAnalytics,
};
exports.dashboardAnalyticsService = {
    getAnalyticsCommandCenter,
    getExecutiveSummary,
    getStationComparison,
    getAnalyticsWidgets,
};
exports.reportDefinitionService = {
    listReportDefinitions,
    getReportDefinition,
};
exports.reportBuilderService = {
    previewReport,
    createSavedReport,
    updateSavedReport,
    deleteSavedReport,
};
exports.savedReportService = {
    listSavedReports,
    getSavedReport,
    createSavedReport,
    updateSavedReport,
    deleteSavedReport,
};
exports.reportExportService = {
    listExports,
    getExport,
    exportReport,
};
exports.dataQualityService = {
    getDataQualitySummary,
    listDataQualityChecks,
    listDataQualityIssues,
    runDataQualityChecks,
    resolveDataQualityIssue,
};
exports.duplicateDetectionService = {
    listDuplicateCandidates,
    getDuplicateCandidate,
    markDuplicateCandidate,
    dismissDuplicateCandidate,
};
exports.stationComparisonService = {
    getStationComparison,
};
exports.readinessAnalyticsService = {
    getReadinessAnalytics,
};
exports.trendAnalyticsService = {
    getTrendAnalytics,
};
exports.reportScheduleService = {
    listSchedules,
    createSchedule,
    runScheduleNow,
};
exports.analyticsSnapshotService = {
    listAnalyticsSnapshots: async (tenantId, page = 1, take = 50) => {
        const where = { tenantId };
        const [items, total] = await Promise.all([
            prisma_js_1.prisma.analyticsSnapshot.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { snapshotDate: 'desc' } }),
            prisma_js_1.prisma.analyticsSnapshot.count({ where }),
        ]);
        return { items, page, take, total };
    },
};
