"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPreventionCommandCenter = getPreventionCommandCenter;
exports.getPreventionRisks = getPreventionRisks;
exports.getPreventionReadinessImpact = getPreventionReadinessImpact;
exports.listProperties = listProperties;
exports.getProperty360 = getProperty360;
exports.getPropertyInspections = getPropertyInspections;
exports.getPropertyPermits = getPropertyPermits;
exports.getPropertyPreplans = getPropertyPreplans;
exports.getPropertyViolations = getPropertyViolations;
exports.getPropertyRisk = getPropertyRisk;
exports.listOccupancies = listOccupancies;
exports.createProperty = createProperty;
exports.updateProperty = updateProperty;
exports.listInspections = listInspections;
exports.getPrioritizedInspections = getPrioritizedInspections;
exports.getOverdueInspections = getOverdueInspections;
exports.createInspection = createInspection;
exports.updateInspection = updateInspection;
exports.startInspection = startInspection;
exports.completeInspection = completeInspection;
exports.closeInspection = closeInspection;
exports.getInspectionChecklist = getInspectionChecklist;
exports.addInspectionChecklistItem = addInspectionChecklistItem;
exports.listViolations = listViolations;
exports.listOpenViolations = listOpenViolations;
exports.listCriticalViolations = listCriticalViolations;
exports.createViolation = createViolation;
exports.updateViolation = updateViolation;
exports.resolveViolation = resolveViolation;
exports.escalateViolation = escalateViolation;
exports.getCorrectiveActions = getCorrectiveActions;
exports.createCorrectiveAction = createCorrectiveAction;
exports.updateCorrectiveAction = updateCorrectiveAction;
exports.completeCorrectiveAction = completeCorrectiveAction;
exports.listPermits = listPermits;
exports.listPermitBacklog = listPermitBacklog;
exports.listExpiringPermits = listExpiringPermits;
exports.createPermit = createPermit;
exports.updatePermit = updatePermit;
exports.reviewPermit = reviewPermit;
exports.approvePermit = approvePermit;
exports.denyPermit = denyPermit;
exports.requestPermitInfo = requestPermitInfo;
exports.listPreplans = listPreplans;
exports.listPreplansReviewDue = listPreplansReviewDue;
exports.listPreplansIncomplete = listPreplansIncomplete;
exports.createPreplan = createPreplan;
exports.updatePreplan = updatePreplan;
exports.activatePreplan = activatePreplan;
exports.markPreplanReviewDue = markPreplanReviewDue;
exports.listHydrants = listHydrants;
exports.listHydrantIssues = listHydrantIssues;
exports.createHydrant = createHydrant;
exports.listHazards = listHazards;
exports.listCriticalHazards = listCriticalHazards;
exports.createHazard = createHazard;
exports.listStationPreventionSummary = listStationPreventionSummary;
exports.getStationPreventionSummary = getStationPreventionSummary;
exports.getStationPreventionRisk = getStationPreventionRisk;
exports.getPreventionCommandCenterAndSeed = getPreventionCommandCenterAndSeed;
exports.createOccupancy = createOccupancy;
exports.updateOccupancy = updateOccupancy;
const node_crypto_1 = require("node:crypto");
const prisma_js_1 = require("../utils/prisma.js");
const dayMs = 86_400_000;
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page, take) => (page - 1) * take;
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const lower = (value) => String(value ?? '').toLowerCase();
const nowIso = () => new Date().toISOString();
function percent(value) {
    return Math.max(0, Math.min(100, Math.round(value)));
}
function daysUntil(value) {
    if (!value)
        return null;
    return Math.round((new Date(value).getTime() - Date.now()) / dayMs);
}
function riskLevel(score) {
    if (score >= 90)
        return 'Low';
    if (score >= 75)
        return 'Moderate';
    if (score >= 60)
        return 'High';
    return 'Critical';
}
function severityWeight(severity) {
    const code = statusCode(severity);
    if (code === 'CRITICAL')
        return 20;
    if (code === 'HIGH')
        return 12;
    if (code === 'NORMAL')
        return 6;
    return 3;
}
function inspectionStatusScore(status) {
    const code = statusCode(status);
    if (code === 'PASSED' || code === 'CLOSED')
        return 100;
    if (code === 'SCHEDULED')
        return 82;
    if (code === 'IN_PROGRESS')
        return 72;
    if (code === 'FAILED')
        return 42;
    if (code === 'REINSPECTION_REQUIRED')
        return 35;
    if (code === 'CANCELLED')
        return 90;
    return 60;
}
function permitStatusScore(status) {
    const code = statusCode(status);
    if (code === 'APPROVED' || code === 'CLOSED')
        return 100;
    if (code === 'SUBMITTED' || code === 'UNDER_REVIEW')
        return 72;
    if (code === 'ADDITIONAL_INFO_REQUIRED')
        return 55;
    if (code === 'DENIED')
        return 40;
    if (code === 'EXPIRED')
        return 30;
    return 60;
}
function preplanStatusScore(status) {
    const code = statusCode(status);
    if (code === 'ACTIVE')
        return 100;
    if (code === 'DRAFT')
        return 70;
    if (code === 'REVIEW_DUE')
        return 58;
    if (code === 'INCOMPLETE')
        return 45;
    if (code === 'ARCHIVED')
        return 80;
    return 60;
}
async function writeAudit(tenantId, userId, action, entityName, entityId, before, after) {
    await prisma_js_1.prisma.auditLog.create({
        data: {
            tenantId,
            userId: userId ?? null,
            action,
            entityName,
            entityId: entityId ?? null,
            before: before ?? undefined,
            after: after ?? undefined,
            createdAt: nowIso(),
        },
    });
}
async function createNotification(tenantId, title, message, type) {
    await prisma_js_1.prisma.notification.create({
        data: {
            tenantId,
            userId: null,
            title,
            message,
            notificationType: type,
            isRead: false,
            createdAt: nowIso(),
        },
    });
}
async function createInsight(tenantId, category, title, summary, severity, recommendedActions) {
    await prisma_js_1.prisma.aiInsight.create({
        data: {
            tenantId,
            category,
            title,
            summary,
            severity,
            confidenceScore: 0.87,
            dataSources: ['Prevention', 'Stations', 'Assets', 'Incidents', 'Analytics'],
            recommendedActions,
            status: 'Open',
            createdAt: nowIso(),
        },
    });
}
async function loadContext(tenantId) {
    const [properties, occupancies, inspections, checklistItems, violations, correctiveActions, permits, permitReviews, preplans, preplanAttachments, hydrants, hazards, contacts, documents, snapshots, stations, incidents, notifications, insights, auditLogs,] = await Promise.all([
        prisma_js_1.prisma.property.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.occupancy.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.inspection.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.inspectionChecklistItem.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.violation.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.correctiveAction.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.permit.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.permitReview.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preplan.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preplanAttachment.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.hydrant.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.hazard.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preventionContact.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preventionDocument.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.preventionRiskSnapshot.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incident.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        prisma_js_1.prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const occupancyByProperty = new Map();
    for (const occupancy of occupancies) {
        const list = occupancyByProperty.get(occupancy.propertyId) ?? [];
        list.push(occupancy);
        occupancyByProperty.set(occupancy.propertyId, list);
    }
    const inspectionsByProperty = new Map();
    for (const inspection of inspections) {
        const list = inspectionsByProperty.get(inspection.propertyId) ?? [];
        list.push(inspection);
        inspectionsByProperty.set(inspection.propertyId, list);
    }
    const checklistByInspection = new Map();
    for (const item of checklistItems) {
        const list = checklistByInspection.get(item.inspectionId) ?? [];
        list.push(item);
        checklistByInspection.set(item.inspectionId, list);
    }
    const violationsByProperty = new Map();
    const violationsByInspection = new Map();
    for (const violation of violations) {
        const propertyList = violationsByProperty.get(violation.propertyId) ?? [];
        propertyList.push(violation);
        violationsByProperty.set(violation.propertyId, propertyList);
        if (violation.inspectionId) {
            const inspectionList = violationsByInspection.get(violation.inspectionId) ?? [];
            inspectionList.push(violation);
            violationsByInspection.set(violation.inspectionId, inspectionList);
        }
    }
    const correctiveByViolation = new Map();
    for (const action of correctiveActions) {
        const list = correctiveByViolation.get(action.violationId) ?? [];
        list.push(action);
        correctiveByViolation.set(action.violationId, list);
    }
    const permitsByProperty = new Map();
    for (const permit of permits) {
        const list = permitsByProperty.get(permit.propertyId) ?? [];
        list.push(permit);
        permitsByProperty.set(permit.propertyId, list);
    }
    const preplansByProperty = new Map();
    for (const preplan of preplans) {
        const list = preplansByProperty.get(preplan.propertyId) ?? [];
        list.push(preplan);
        preplansByProperty.set(preplan.propertyId, list);
    }
    const hydrantsByProperty = new Map();
    const hydrantsByStation = new Map();
    for (const hydrant of hydrants) {
        if (hydrant.propertyId) {
            const propertyList = hydrantsByProperty.get(hydrant.propertyId) ?? [];
            propertyList.push(hydrant);
            hydrantsByProperty.set(hydrant.propertyId, propertyList);
        }
        if (hydrant.stationId) {
            const stationList = hydrantsByStation.get(hydrant.stationId) ?? [];
            stationList.push(hydrant);
            hydrantsByStation.set(hydrant.stationId, stationList);
        }
    }
    const hazardsByProperty = new Map();
    for (const hazard of hazards) {
        const list = hazardsByProperty.get(hazard.propertyId) ?? [];
        list.push(hazard);
        hazardsByProperty.set(hazard.propertyId, list);
    }
    const contactsByProperty = new Map();
    const docsByProperty = new Map();
    const docsByInspection = new Map();
    const docsByPermit = new Map();
    const docsByPreplan = new Map();
    for (const contact of contacts) {
        const list = contactsByProperty.get(contact.propertyId) ?? [];
        list.push(contact);
        contactsByProperty.set(contact.propertyId, list);
    }
    for (const document of documents) {
        if (document.propertyId) {
            const list = docsByProperty.get(document.propertyId) ?? [];
            list.push(document);
            docsByProperty.set(document.propertyId, list);
        }
        if (document.inspectionId) {
            const list = docsByInspection.get(document.inspectionId) ?? [];
            list.push(document);
            docsByInspection.set(document.inspectionId, list);
        }
        if (document.permitId) {
            const list = docsByPermit.get(document.permitId) ?? [];
            list.push(document);
            docsByPermit.set(document.permitId, list);
        }
        if (document.preplanId) {
            const list = docsByPreplan.get(document.preplanId) ?? [];
            list.push(document);
            docsByPreplan.set(document.preplanId, list);
        }
    }
    const stationById = new Map(stations.map((station) => [station.id, station]));
    return {
        auditLogs: auditLogs,
        checklistByInspection,
        contacts,
        contactsByProperty,
        correctiveActions: correctiveActions,
        correctiveByViolation,
        docsByInspection,
        docsByPermit,
        docsByPreplan,
        docsByProperty,
        hazards: hazards,
        hazardsByProperty,
        hydrants: hydrants,
        hydrantsByProperty,
        hydrantsByStation,
        insights: insights,
        incidents: incidents,
        inspections: inspections,
        inspectionsByProperty,
        notifications: notifications,
        occupancies: occupancies,
        occupancyByProperty,
        permits: permits,
        permitsByProperty,
        permitReviews: permitReviews,
        preplanAttachments: preplanAttachments,
        preplans: preplans,
        preplansByProperty,
        properties: properties,
        snapshots: snapshots,
        stations: stations,
        stationById,
        violations: violations,
        violationsByInspection,
        violationsByProperty,
    };
}
function basePropertyScore(property, occupancy = []) {
    const riskText = lower(property.occupancyRiskLevel ?? property.riskLevel);
    const occupancyRisk = occupancy.some((item) => item.highRisk || item.hazardousMaterials) ? 78 : 55;
    if (riskText.includes('critical'))
        return Math.max(occupancyRisk, 92);
    if (riskText.includes('high') || riskText.includes('extreme'))
        return Math.max(occupancyRisk, 80);
    if (riskText.includes('moderate'))
        return Math.max(occupancyRisk - 8, 66);
    return Math.max(occupancyRisk - 15, 52);
}
function calculatePropertyRisk(property, ctx) {
    const occupancy = ctx.occupancyByProperty.get(property.id) ?? [];
    const inspections = ctx.inspectionsByProperty.get(property.id) ?? [];
    const violations = ctx.violationsByProperty.get(property.id) ?? [];
    const permits = ctx.permitsByProperty.get(property.id) ?? [];
    const preplans = ctx.preplansByProperty.get(property.id) ?? [];
    const hydrants = ctx.hydrantsByProperty.get(property.id) ?? [];
    const hazards = ctx.hazardsByProperty.get(property.id) ?? [];
    const occupancyRisk = basePropertyScore(property, occupancy);
    const overdueInspections = inspections.filter((inspection) => {
        const days = daysUntil(inspection.scheduledDate ?? inspection.scheduledAt);
        return ['SCHEDULED', 'IN_PROGRESS', 'FAILED', 'REINSPECTION_REQUIRED'].includes(statusCode(inspection.status)) && (days != null && days < 0);
    }).length;
    const criticalViolations = violations.filter((violation) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity)) && !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status))).length;
    const preplanGap = preplans.length === 0 ? 20 : preplans.some((preplan) => ['INCOMPLETE', 'REVIEW_DUE', 'DRAFT'].includes(statusCode(preplan.status))) ? 12 : 0;
    const permitBacklog = permits.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'EXPIRED'].includes(statusCode(permit.status))).length;
    const hydrantHazard = hydrants.filter((hydrant) => ['NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status))).length + hazards.filter((hazard) => ['CRITICAL', 'HIGH'].includes(statusCode(hazard.severity)) && !['RESOLVED', 'CLOSED'].includes(statusCode(hazard.status))).length;
    const score = percent(occupancyRisk * 0.25
        + Math.max(0, 100 - overdueInspections * 10) * 0.2
        + Math.max(0, 100 - criticalViolations * 11) * 0.2
        + Math.max(0, 100 - preplanGap * 3) * 0.15
        + Math.max(0, 100 - permitBacklog * 5) * 0.1
        + Math.max(0, 100 - hydrantHazard * 7) * 0.1);
    return {
        score,
        level: riskLevel(score),
        occupancyRisk,
        overdueInspections,
        criticalViolations,
        preplanGap,
        permitBacklog,
        hydrantHazard,
        inspections,
        violations,
        permits,
        preplans,
        hydrants,
        hazards,
        occupancy,
    };
}
function inspectionPriorityScore(inspection, propertyRisk, ctx) {
    const days = daysUntil(inspection.scheduledDate ?? inspection.scheduledAt);
    const violations = ctx.violationsByInspection.get(inspection.id) ?? [];
    const openViolations = violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
    const inspectionScore = inspectionStatusScore(inspection.status);
    const overdueWeight = days != null && days < 0 ? Math.min(25, Math.abs(days) * 2) : 0;
    const openWeight = openViolations.reduce((total, violation) => total + severityWeight(violation.severity), 0);
    const specialHazardWeight = propertyRisk.hydrantHazard > 0 ? 6 : 0;
    const previousFailed = inspection.result === 'Failed' ? 10 : 0;
    const incidentHistory = ctx.incidents.filter((incident) => incident.propertyId === inspection.propertyId || incident.location?.toLowerCase().includes(String(inspection.propertyId).toLowerCase())).length;
    const score = percent(inspectionScore * 0.35
        + propertyRisk.score * 0.25
        + Math.max(0, 100 - overdueWeight * 2) * 0.15
        + Math.max(0, 100 - openWeight * 2) * 0.15
        + Math.max(0, 100 - specialHazardWeight * 3 - previousFailed * 2) * 0.1
        - Math.min(15, incidentHistory));
    return {
        score,
        overdueDays: days && days < 0 ? Math.abs(days) : 0,
        reason: days != null && days < 0 ? `${Math.abs(days)} days overdue` : violations.length ? `${violations.length} linked violation(s)` : propertyRisk.level === 'Critical' ? 'Critical occupancy risk' : 'Scheduled workload',
        openViolations: openViolations.length,
        propertyRisk,
    };
}
function mapPropertyRow(property, ctx) {
    const risk = calculatePropertyRisk(property, ctx);
    const occupancy = ctx.occupancyByProperty.get(property.id) ?? [];
    const inspections = ctx.inspectionsByProperty.get(property.id) ?? [];
    const violations = ctx.violationsByProperty.get(property.id) ?? [];
    const permits = ctx.permitsByProperty.get(property.id) ?? [];
    const preplans = ctx.preplansByProperty.get(property.id) ?? [];
    const hydrants = ctx.hydrantsByProperty.get(property.id) ?? [];
    const hazards = ctx.hazardsByProperty.get(property.id) ?? [];
    return {
        ...property,
        occupancies: occupancy,
        inspectionCount: inspections.length,
        openViolations: violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status))).length,
        permitStatus: permits[0]?.status ?? 'None',
        preplanStatus: preplans[0]?.status ?? 'Missing',
        hydrantCount: hydrants.length,
        hazardCount: hazards.length,
        riskScore: risk.score,
        riskLevel: risk.level,
        nextInspectionDue: occupancy[0]?.nextInspectionDue ?? null,
        lastInspectionDate: occupancy[0]?.lastInspectionDate ?? null,
        responseStationId: property.responseStationId ?? property.stationId ?? null,
    };
}
function mapInspectionRow(inspection, ctx) {
    const property = ctx.properties.find((entry) => entry.id === inspection.propertyId);
    const risk = property ? calculatePropertyRisk(property, ctx) : { score: 60, level: 'High', occupancyRisk: 60, overdueInspections: 0, criticalViolations: 0, preplanGap: 0, permitBacklog: 0, hydrantHazard: 0, inspections: [], violations: [], permits: [], preplans: [], hydrants: [], hazards: [], occupancy: [] };
    const priority = inspectionPriorityScore(inspection, risk, ctx);
    return {
        ...inspection,
        propertyName: property?.name ?? 'Unknown property',
        address: property?.addressLine1 ?? property?.address ?? inspection.address ?? '—',
        riskScore: priority.score,
        riskLevel: risk.level,
        overdueDays: priority.overdueDays,
        openViolations: priority.openViolations,
        priorityReason: priority.reason,
    };
}
async function touchRiskNotifications(tenantId, title, message, severity) {
    if (severity === 'Critical' || severity === 'High') {
        await createNotification(tenantId, title, message, 'prevention.risk');
        await createInsight(tenantId, 'Prevention', title, message, severity, ['Schedule the highest-risk inspection first', 'Resolve open violations', 'Update preplans and verify hydrants']);
    }
}
async function getPreventionCommandCenter(tenantId) {
    const ctx = await loadContext(tenantId);
    const mappedProperties = ctx.properties.map((property) => mapPropertyRow(property, ctx)).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
    const mappedInspections = ctx.inspections.map((inspection) => mapInspectionRow(inspection, ctx)).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
    const openViolations = ctx.violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
    const overdueInspections = mappedInspections.filter((inspection) => inspection.overdueDays > 0);
    const highRiskOccupancies = ctx.occupancies.filter((occupancy) => occupancy.highRisk || occupancy.hazardousMaterials || statusCode(occupancy.riskLevel) === 'CRITICAL' || statusCode(occupancy.riskLevel) === 'HIGH');
    const permitBacklog = ctx.permits.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'].includes(statusCode(permit.status)));
    const reviewDuePreplans = ctx.preplans.filter((preplan) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status)));
    const hydrantIssues = ctx.hydrants.filter((hydrant) => ['NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status)));
    const hazardsBySeverity = ctx.hazards.reduce((accumulator, hazard) => {
        const key = String(hazard.severity ?? 'Moderate');
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
    }, {});
    const snapshots = ctx.snapshots.filter((snapshot) => snapshot.propertyId || snapshot.stationId);
    const overallRiskScore = snapshots.length ? Math.round(snapshots.reduce((sum, snapshot) => sum + Number(snapshot.overallPreventionRiskScore ?? snapshot.occupancyRiskScore ?? 60), 0) / snapshots.length) : Math.round(mappedProperties.reduce((sum, property) => sum + Number(property.riskScore), 0) / Math.max(mappedProperties.length, 1));
    const stationWorkload = ctx.stations.map((station) => ({
        ...station,
        propertyCount: ctx.properties.filter((property) => property.responseStationId === station.id || property.stationArea === station.name).length,
        inspectionCount: mappedInspections.filter((inspection) => inspection.stationId === station.id).length,
        openViolationCount: openViolations.filter((violation) => {
            const property = ctx.properties.find((entry) => entry.id === violation.propertyId);
            return property?.responseStationId === station.id || property?.stationArea === station.name;
        }).length,
        preventionRiskScore: ctx.snapshots.find((snapshot) => snapshot.stationId === station.id)?.overallPreventionRiskScore ?? station.readinessScore,
    })).sort((left, right) => Number(right.preventionRiskScore) - Number(left.preventionRiskScore));
    return {
        summary: {
            overallPreventionRiskScore: overallRiskScore,
            overallRiskLevel: riskLevel(overallRiskScore),
            overdueInspections: overdueInspections.length,
            highRiskOccupancies: highRiskOccupancies.length,
            openCriticalViolations: openViolations.filter((violation) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity))).length,
            permitBacklog: permitBacklog.length,
            preplansDue: reviewDuePreplans.length,
            incompletePreplans: ctx.preplans.filter((preplan) => statusCode(preplan.status) === 'INCOMPLETE').length,
            hydrantIssues: hydrantIssues.length,
            activeHazards: ctx.hazards.filter((hazard) => !['RESOLVED', 'CLOSED'].includes(statusCode(hazard.status))).length,
            stationWorkloadAverage: Math.round(stationWorkload.reduce((sum, station) => sum + Number(station.preventionRiskScore ?? 0), 0) / Math.max(stationWorkload.length, 1)),
        },
        riskScore: overallRiskScore,
        properties: mappedProperties.slice(0, 12),
        inspections: mappedInspections.slice(0, 12),
        stationWorkload: stationWorkload.slice(0, 10),
        highRiskOccupancies: highRiskOccupancies.slice(0, 12),
        openCriticalViolations: openViolations.filter((violation) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity))).slice(0, 12),
        permitBacklog: permitBacklog.slice(0, 12),
        reviewDuePreplans: reviewDuePreplans.slice(0, 12),
        hydrantIssues: hydrantIssues.slice(0, 12),
        hazardCounts: hazardsBySeverity,
        aiRecommendedActions: [
            overdueInspections.length ? `Prioritize ${overdueInspections.length} overdue inspection(s) starting with ${overdueInspections[0]?.propertyName ?? 'highest-risk property'}` : 'No overdue inspections require immediate dispatch.',
            openViolations.length ? `${openViolations.filter((violation) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity))).length} critical/high violation(s) need corrective action.` : 'Violation queue is stable.',
            permitBacklog.length ? `Clear ${permitBacklog.length} permit application(s) before their review deadlines.` : 'Permit queue is healthy.',
            reviewDuePreplans.length ? `Refresh ${reviewDuePreplans.length} preplan(s) due for review.` : 'Preplans are current.',
        ],
        recentActivity: [...ctx.auditLogs.slice(0, 5), ...ctx.notifications.slice(0, 5)],
        insights: ctx.insights.slice(0, 8),
        readinessImpact: {
            agencyPreventionScore: overallRiskScore,
            stationAverage: Math.round(stationWorkload.reduce((sum, station) => sum + Number(station.preventionRiskScore ?? 0), 0) / Math.max(stationWorkload.length, 1)),
            propertiesAtCriticalRisk: mappedProperties.filter((property) => property.riskLevel === 'Critical').length,
            fireMarshalAction: overdueInspections.length ? 'Dispatch inspection team to highest-risk properties first.' : 'Maintain current inspection cadence and monitor permits.',
        },
    };
}
async function getPreventionRisks(tenantId) {
    const ctx = await loadContext(tenantId);
    const propertyRisks = ctx.properties.map((property) => {
        const mapped = mapPropertyRow(property, ctx);
        const severity = mapped.riskLevel === 'Critical' ? 'Critical' : mapped.riskLevel === 'High' ? 'High' : mapped.riskLevel === 'Moderate' ? 'Moderate' : 'Low';
        return {
            id: `risk-${property.id}`,
            source: 'Property',
            propertyId: property.id,
            stationId: mapped.responseStationId,
            title: `${property.name} prevention risk`,
            severity,
            evidenceSummary: `${mapped.inspectionCount} inspection(s), ${mapped.openViolations} open violation(s), ${mapped.hazardCount} hazard(s).`,
            readinessImpact: 100 - mapped.riskScore,
            recommendedAction: mapped.riskLevel === 'Critical' ? 'Schedule immediate inspection and review preplan.' : 'Monitor through upcoming inspection cycle.',
            status: mapped.riskLevel === 'Critical' || mapped.riskLevel === 'High' ? 'Open' : 'Monitoring',
            riskScore: mapped.riskScore,
        };
    });
    const inspectionRisks = ctx.inspections.map((inspection) => {
        const mapped = mapInspectionRow(inspection, ctx);
        return {
            id: `inspection-risk-${inspection.id}`,
            source: 'Inspection',
            propertyId: inspection.propertyId,
            stationId: inspection.stationId,
            title: `${mapped.propertyName} inspection priority`,
            severity: mapped.overdueDays > 0 ? 'Critical' : mapped.riskScore < 70 ? 'High' : 'Moderate',
            evidenceSummary: mapped.overdueDays > 0 ? `${mapped.overdueDays} day(s) overdue` : `${mapped.openViolations} open violation(s)`,
            readinessImpact: 100 - mapped.riskScore,
            recommendedAction: mapped.overdueDays > 0 ? 'Dispatch inspector now.' : 'Complete checklist and follow-up.',
            status: mapped.overdueDays > 0 ? 'Open' : 'Monitoring',
            riskScore: mapped.riskScore,
        };
    });
    const permitRisks = ctx.permits.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'EXPIRED'].includes(statusCode(permit.status))).map((permit) => ({
        id: `permit-risk-${permit.id}`,
        source: 'Permit',
        propertyId: permit.propertyId,
        stationId: ctx.properties.find((property) => property.id === permit.propertyId)?.responseStationId ?? null,
        title: `${permit.permitType} permit backlog`,
        severity: statusCode(permit.status) === 'EXPIRED' ? 'Critical' : 'High',
        evidenceSummary: `Permit status: ${permit.status}.`,
        readinessImpact: 100 - permitStatusScore(permit.status),
        recommendedAction: 'Review, request info, approve, or deny to clear queue.',
        status: 'Open',
        riskScore: permitStatusScore(permit.status),
    }));
    const preplanRisks = ctx.preplans.filter((preplan) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status))).map((preplan) => ({
        id: `preplan-risk-${preplan.id}`,
        source: 'Preplan',
        propertyId: preplan.propertyId,
        stationId: ctx.properties.find((property) => property.id === preplan.propertyId)?.responseStationId ?? null,
        title: `${preplan.title} needs attention`,
        severity: statusCode(preplan.status) === 'INCOMPLETE' ? 'Critical' : 'High',
        evidenceSummary: `Preplan status: ${preplan.status}.`,
        readinessImpact: 100 - preplanStatusScore(preplan.status),
        recommendedAction: 'Update tactical notes and review attachments.',
        status: 'Open',
        riskScore: preplanStatusScore(preplan.status),
    }));
    const hydrantRisks = ctx.hydrants.filter((hydrant) => ['NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status))).map((hydrant) => ({
        id: `hydrant-risk-${hydrant.id}`,
        source: 'Hydrant',
        propertyId: hydrant.propertyId ?? null,
        stationId: hydrant.stationId ?? null,
        title: `${hydrant.hydrantNumber} hydrant issue`,
        severity: statusCode(hydrant.status) === 'OUT_OF_SERVICE' ? 'Critical' : 'High',
        evidenceSummary: `Hydrant status: ${hydrant.status}.`,
        readinessImpact: 100 - (statusCode(hydrant.status) === 'OUT_OF_SERVICE' ? 35 : 60),
        recommendedAction: 'Inspect, flush, or repair hydrant.',
        status: 'Open',
        riskScore: statusCode(hydrant.status) === 'OUT_OF_SERVICE' ? 35 : 60,
    }));
    const hazardRisks = ctx.hazards.filter((hazard) => !['RESOLVED', 'CLOSED'].includes(statusCode(hazard.status))).map((hazard) => ({
        id: `hazard-risk-${hazard.id}`,
        source: 'Hazard',
        propertyId: hazard.propertyId,
        stationId: ctx.properties.find((property) => property.id === hazard.propertyId)?.responseStationId ?? null,
        title: hazard.title,
        severity: hazard.severity,
        evidenceSummary: hazard.description,
        readinessImpact: 100 - severityWeight(hazard.severity) * 4,
        recommendedAction: hazard.mitigationNotes ?? 'Create mitigation plan.',
        status: hazard.status,
        riskScore: 100 - severityWeight(hazard.severity) * 4,
    }));
    return [...propertyRisks, ...inspectionRisks, ...permitRisks, ...preplanRisks, ...hydrantRisks, ...hazardRisks].sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
}
async function getPreventionReadinessImpact(tenantId) {
    const ctx = await loadContext(tenantId);
    const stationSummaries = ctx.stations.map((station) => getStationPreventionSummaryInternal(station.id, ctx));
    const averageRisk = stationSummaries.length ? Math.round(stationSummaries.reduce((sum, entry) => sum + Number(entry.overallPreventionRiskScore ?? 0), 0) / stationSummaries.length) : 0;
    return {
        agencyPreventionRiskScore: averageRisk,
        riskLevel: riskLevel(averageRisk),
        stationSummaries: stationSummaries.slice(0, 17),
        topRisks: (await getPreventionRisks(tenantId)).slice(0, 12),
    };
}
async function listProperties(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await loadContext(tenantId);
    const search = lower(filters.search);
    const items = ctx.properties.map((property) => mapPropertyRow(property, ctx)).filter((property) => {
        if (filters.stationId && property.responseStationId !== filters.stationId)
            return false;
        if (filters.occupancyType && lower(property.occupancyType) !== lower(filters.occupancyType))
            return false;
        if (filters.riskLevel && lower(property.riskLevel) !== lower(filters.riskLevel))
            return false;
        if (filters.inspectionStatus && !property.occupancies.some((occupancy) => lower(occupancy.status) === lower(filters.inspectionStatus)))
            return false;
        if (filters.permitStatus && lower(property.permitStatus) !== lower(filters.permitStatus))
            return false;
        if (filters.preplanStatus && lower(property.preplanStatus) !== lower(filters.preplanStatus))
            return false;
        if (filters.violationSeverity && !String(property.openViolations).length)
            return false;
        if (search && ![property.name, property.addressLine1, property.city, property.propertyType, property.occupancyType].some((field) => lower(field).includes(search)))
            return false;
        return true;
    }).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function getProperty360(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    const property = ctx.properties.find((entry) => entry.id === propertyId);
    if (!property)
        return null;
    const occupancy = ctx.occupancyByProperty.get(property.id) ?? [];
    const inspections = (ctx.inspectionsByProperty.get(property.id) ?? []).map((inspection) => ({
        ...inspection,
        checklist: ctx.checklistByInspection.get(inspection.id) ?? [],
        violations: ctx.violationsByInspection.get(inspection.id) ?? [],
        documents: ctx.docsByInspection.get(inspection.id) ?? [],
    }));
    const violations = ctx.violationsByProperty.get(property.id) ?? [];
    const permits = ctx.permitsByProperty.get(property.id) ?? [];
    const preplans = ctx.preplansByProperty.get(property.id) ?? [];
    const hydrants = ctx.hydrantsByProperty.get(property.id) ?? [];
    const hazards = ctx.hazardsByProperty.get(property.id) ?? [];
    const contacts = ctx.contactsByProperty.get(property.id) ?? [];
    const documents = ctx.docsByProperty.get(property.id) ?? [];
    const snapshots = ctx.snapshots.filter((snapshot) => snapshot.propertyId === property.id);
    const risk = calculatePropertyRisk(property, ctx);
    const incidentHistory = ctx.incidents.filter((incident) => incident.propertyId === property.id || lower(incident.location).includes(lower(property.addressLine1)) || lower(incident.location).includes(lower(property.name)));
    const auditTrail = ctx.auditLogs.filter((log) => String(log.entityName ?? '').includes('Property') || String(log.entityName ?? '').includes('Inspection') || String(log.entityName ?? '').includes('Violation')).slice(0, 10);
    return {
        property: {
            ...mapPropertyRow(property, ctx),
            occupancy,
        },
        occupancy,
        inspections,
        violations,
        permits,
        preplans: preplans.map((preplan) => ({
            ...preplan,
            attachments: ctx.preplanAttachments.filter((attachment) => attachment.preplanId === preplan.id),
        })),
        hydrants,
        hazards,
        contacts,
        documents,
        snapshots,
        incidentHistory,
        auditTrail,
        readiness: {
            score: risk.score,
            riskLevel: risk.level,
            recommendedAction: risk.level === 'Critical' ? 'Immediate inspection, permit review, and preplan update required.' : 'Continue monitoring and close open items.',
            evidenceSummary: `${risk.overdueInspections} overdue inspection(s), ${risk.criticalViolations} critical violation(s), ${risk.preplanGap} preplan gap(s).`,
        },
    };
}
async function getPropertyInspections(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    return (ctx.inspectionsByProperty.get(propertyId) ?? []).map((inspection) => mapInspectionRow(inspection, ctx));
}
async function getPropertyPermits(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    return ctx.permitsByProperty.get(propertyId) ?? [];
}
async function getPropertyPreplans(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    return (ctx.preplansByProperty.get(propertyId) ?? []).map((preplan) => ({
        ...preplan,
        attachments: ctx.preplanAttachments.filter((attachment) => attachment.preplanId === preplan.id),
    }));
}
async function getPropertyViolations(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    return ctx.violationsByProperty.get(propertyId) ?? [];
}
async function getPropertyRisk(tenantId, propertyId) {
    const ctx = await loadContext(tenantId);
    const property = ctx.properties.find((entry) => entry.id === propertyId);
    if (!property)
        return null;
    const mapped = mapPropertyRow(property, ctx);
    return {
        ...mapped,
        readinessImpact: 100 - mapped.riskScore,
        recommendedAction: mapped.riskLevel === 'Critical' ? 'Dispatch inspection and mitigation team immediately.' : 'Monitor and complete scheduled prevention actions.',
    };
}
async function listOccupancies(tenantId, page = 1, take = 50) {
    const items = await prisma_js_1.prisma.occupancy.findMany({ where: { tenantId }, orderBy: [{ highRisk: 'desc' }, { occupancyName: 'asc' }] });
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function createProperty(tenantId, userId, payload) {
    const property = await prisma_js_1.prisma.property.create({
        data: {
            id: `property-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            ...payload,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            createdBy: userId ?? null,
            updatedBy: userId ?? null,
            isDeleted: false,
        },
    });
    await writeAudit(tenantId, userId, `Created property ${String(property.name ?? property.propertyNumber ?? property.id)}`, 'Property', property.id, null, property);
    await touchRiskNotifications(tenantId, 'New property added', `${String(property.name ?? property.id)} added to prevention registry.`, 'Moderate');
    return property;
}
async function updateProperty(tenantId, propertyId, userId, payload) {
    const before = await prisma_js_1.prisma.property.findFirst({ where: { id: propertyId, tenantId } });
    const property = await prisma_js_1.prisma.property.update({ where: { id: propertyId }, data: { ...payload, updatedAt: nowIso(), updatedBy: userId ?? null } });
    await writeAudit(tenantId, userId, `Updated property ${String(property.name ?? propertyId)}`, 'Property', propertyId, before, property);
    return property;
}
async function listInspections(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await loadContext(tenantId);
    const search = lower(filters.search);
    const items = ctx.inspections.map((inspection) => mapInspectionRow(inspection, ctx)).filter((inspection) => {
        if (filters.stationId && inspection.stationId !== filters.stationId)
            return false;
        if (filters.inspectionStatus && lower(inspection.status) !== lower(filters.inspectionStatus))
            return false;
        if (filters.riskLevel && lower(inspection.riskLevel) !== lower(filters.riskLevel))
            return false;
        if (search && ![inspection.propertyName, inspection.address, inspection.inspectionType, inspection.assignedInspectorPersonnelId].some((field) => lower(field).includes(search)))
            return false;
        return true;
    }).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function getPrioritizedInspections(tenantId) {
    const result = await listInspections(tenantId, 1, 500, {});
    return result.items.map((inspection) => ({
        ...inspection,
        priorityReason: inspection.priorityReason,
    })).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
}
async function getOverdueInspections(tenantId) {
    const inspections = await getPrioritizedInspections(tenantId);
    return inspections.filter((inspection) => Number(inspection.overdueDays ?? 0) > 0);
}
async function createInspection(tenantId, userId, payload) {
    const inspection = await prisma_js_1.prisma.inspection.create({
        data: {
            id: `inspection-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Scheduled',
            result: 'Pending',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created inspection ${inspection.id}`, 'Inspection', inspection.id, null, inspection);
    return inspection;
}
async function updateInspection(tenantId, inspectionId, userId, payload) {
    const before = await prisma_js_1.prisma.inspection.findFirst({ where: { id: inspectionId, tenantId } });
    const inspection = await prisma_js_1.prisma.inspection.update({ where: { id: inspectionId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated inspection ${inspection.id}`, 'Inspection', inspection.id, before, inspection);
    return inspection;
}
async function startInspection(tenantId, inspectionId, userId) {
    const inspection = await prisma_js_1.prisma.inspection.update({ where: { id: inspectionId }, data: { status: 'In Progress', startedAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Started inspection ${inspectionId}`, 'Inspection', inspectionId, null, inspection);
    return inspection;
}
async function completeInspection(tenantId, inspectionId, userId, payload = {}) {
    const before = await prisma_js_1.prisma.inspection.findFirst({ where: { id: inspectionId, tenantId } });
    const checklist = await prisma_js_1.prisma.inspectionChecklistItem.findMany({ where: { tenantId, inspectionId } });
    const failedCount = checklist.filter((item) => statusCode(item.result) === 'FAIL').length;
    const status = failedCount > 0 || statusCode(payload.result) === 'FAILED' ? 'Failed' : 'Passed';
    const inspection = await prisma_js_1.prisma.inspection.update({
        where: { id: inspectionId },
        data: {
            ...payload,
            status: status === 'Failed' ? 'Reinspection Required' : 'Passed',
            result: status,
            completedAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, `Completed inspection ${inspectionId}`, 'Inspection', inspectionId, before, inspection);
    if (status === 'Failed') {
        await createNotification(tenantId, 'Inspection failed', `Inspection ${inspectionId} needs reinspection and follow-up violations.`, 'inspection.failed');
    }
    return inspection;
}
async function closeInspection(tenantId, inspectionId, userId) {
    const inspection = await prisma_js_1.prisma.inspection.update({ where: { id: inspectionId }, data: { status: 'Closed', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Closed inspection ${inspectionId}`, 'Inspection', inspectionId, null, inspection);
    return inspection;
}
async function getInspectionChecklist(tenantId, inspectionId) {
    return prisma_js_1.prisma.inspectionChecklistItem.findMany({ where: { tenantId, inspectionId }, orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] });
}
async function addInspectionChecklistItem(tenantId, inspectionId, userId, payload) {
    const item = await prisma_js_1.prisma.inspectionChecklistItem.create({
        data: {
            id: `checklist-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            inspectionId,
            category: String(payload.category ?? 'General'),
            requirement: String(payload.requirement ?? 'Checklist requirement'),
            result: String(payload.result ?? 'Pass'),
            severity: payload.severity ?? null,
            notes: payload.notes ?? null,
            photoUrl: payload.photoUrl ?? null,
            requiresCorrection: Boolean(payload.requiresCorrection),
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, `Added checklist item to inspection ${inspectionId}`, 'InspectionChecklistItem', item.id, null, item);
    return item;
}
async function listViolations(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await loadContext(tenantId);
    const search = lower(filters.search);
    const items = ctx.violations.map((violation) => ({
        ...violation,
        propertyName: ctx.properties.find((property) => property.id === violation.propertyId)?.name ?? 'Unknown',
        occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === violation.occupancyId)?.occupancyName ?? null,
        correctiveActions: ctx.correctiveByViolation.get(violation.id) ?? [],
    })).filter((violation) => {
        if (filters.violationSeverity && lower(violation.severity) !== lower(filters.violationSeverity))
            return false;
        if (search && ![violation.title, violation.codeReference, violation.propertyName, violation.occupancyName].some((field) => lower(field).includes(search)))
            return false;
        return true;
    }).sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity));
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function listOpenViolations(tenantId) {
    const result = await listViolations(tenantId, 1, 500, {});
    return result.items.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
}
async function listCriticalViolations(tenantId) {
    const result = await listViolations(tenantId, 1, 500, {});
    return result.items.filter((violation) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity)));
}
async function createViolation(tenantId, userId, payload) {
    const violation = await prisma_js_1.prisma.violation.create({
        data: {
            id: `violation-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Open',
            correctiveActionRequired: true,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created violation ${violation.id}`, 'Violation', violation.id, null, violation);
    if (statusCode(violation.severity) === 'CRITICAL') {
        await createNotification(tenantId, 'Critical violation created', `${String(violation.title ?? violation.codeReference ?? violation.id)} needs immediate attention.`, 'prevention.violation');
    }
    return violation;
}
async function updateViolation(tenantId, violationId, userId, payload) {
    const before = await prisma_js_1.prisma.violation.findFirst({ where: { id: violationId, tenantId } });
    const violation = await prisma_js_1.prisma.violation.update({ where: { id: violationId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated violation ${violationId}`, 'Violation', violationId, before, violation);
    return violation;
}
async function resolveViolation(tenantId, violationId, userId) {
    const violation = await prisma_js_1.prisma.violation.update({ where: { id: violationId }, data: { status: 'Resolved', resolvedDate: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Resolved violation ${violationId}`, 'Violation', violationId, null, violation);
    await createNotification(tenantId, 'Violation resolved', `Violation ${violationId} has been resolved.`, 'prevention.violation');
    return violation;
}
async function escalateViolation(tenantId, violationId, userId) {
    const violation = await prisma_js_1.prisma.violation.update({ where: { id: violationId }, data: { status: 'Escalated', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Escalated violation ${violationId}`, 'Violation', violationId, null, violation);
    await createNotification(tenantId, 'Violation escalated', `Violation ${violationId} has been escalated for follow-up.`, 'prevention.violation');
    return violation;
}
async function getCorrectiveActions(tenantId) {
    return prisma_js_1.prisma.correctiveAction.findMany({ where: { tenantId }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] });
}
async function createCorrectiveAction(tenantId, userId, payload) {
    const action = await prisma_js_1.prisma.correctiveAction.create({
        data: {
            id: `corrective-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Pending',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created corrective action ${action.id}`, 'CorrectiveAction', action.id, null, action);
    return action;
}
async function updateCorrectiveAction(tenantId, correctiveActionId, userId, payload) {
    const before = await prisma_js_1.prisma.correctiveAction.findFirst({ where: { id: correctiveActionId, tenantId } });
    const action = await prisma_js_1.prisma.correctiveAction.update({ where: { id: correctiveActionId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated corrective action ${correctiveActionId}`, 'CorrectiveAction', correctiveActionId, before, action);
    return action;
}
async function completeCorrectiveAction(tenantId, correctiveActionId, userId) {
    const action = await prisma_js_1.prisma.correctiveAction.update({ where: { id: correctiveActionId }, data: { status: 'Completed', completedDate: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Completed corrective action ${correctiveActionId}`, 'CorrectiveAction', correctiveActionId, null, action);
    return action;
}
async function listPermits(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await loadContext(tenantId);
    const search = lower(filters.search);
    const items = ctx.permits.map((permit) => ({
        ...permit,
        propertyName: ctx.properties.find((property) => property.id === permit.propertyId)?.name ?? 'Unknown',
        occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === permit.occupancyId)?.occupancyName ?? null,
        reviews: ctx.permitReviews.filter((review) => review.permitId === permit.id),
    })).filter((permit) => {
        if (filters.permitStatus && lower(permit.status) !== lower(filters.permitStatus))
            return false;
        if (search && ![permit.permitNumber, permit.propertyName, permit.occupancyName, permit.permitType].some((field) => lower(field).includes(search)))
            return false;
        return true;
    }).sort((left, right) => permitStatusScore(left.status) - permitStatusScore(right.status));
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function listPermitBacklog(tenantId) {
    const result = await listPermits(tenantId, 1, 500, {});
    return result.items.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'EXPIRED'].includes(statusCode(permit.status)));
}
async function listExpiringPermits(tenantId) {
    const result = await listPermits(tenantId, 1, 500, {});
    return result.items.filter((permit) => {
        const days = daysUntil(permit.expirationDate);
        return days != null && days <= 30;
    });
}
async function createPermit(tenantId, userId, payload) {
    const permit = await prisma_js_1.prisma.permit.create({
        data: {
            id: `permit-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Submitted',
            submittedDate: nowIso(),
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created permit ${permit.id}`, 'Permit', permit.id, null, permit);
    return permit;
}
async function updatePermit(tenantId, permitId, userId, payload) {
    const before = await prisma_js_1.prisma.permit.findFirst({ where: { id: permitId, tenantId } });
    const permit = await prisma_js_1.prisma.permit.update({ where: { id: permitId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated permit ${permitId}`, 'Permit', permitId, before, permit);
    return permit;
}
async function reviewPermit(tenantId, permitId, userId, payload) {
    const review = await prisma_js_1.prisma.permitReview.create({
        data: {
            id: `permit-review-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            permitId,
            reviewerPersonnelId: String(payload.reviewerPersonnelId ?? ''),
            reviewStage: String(payload.reviewStage ?? 'Review'),
            status: String(payload.status ?? 'In Review'),
            comments: String(payload.comments ?? ''),
            reviewedAt: nowIso(),
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, `Reviewed permit ${permitId}`, 'PermitReview', review.id, null, review);
    return review;
}
async function approvePermit(tenantId, permitId, userId) {
    const permit = await prisma_js_1.prisma.permit.update({ where: { id: permitId }, data: { status: 'Approved', approvedDate: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Approved permit ${permitId}`, 'Permit', permitId, null, permit);
    await createNotification(tenantId, 'Permit approved', `Permit ${permitId} has been approved.`, 'prevention.permit');
    return permit;
}
async function denyPermit(tenantId, permitId, userId) {
    const permit = await prisma_js_1.prisma.permit.update({ where: { id: permitId }, data: { status: 'Denied', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Denied permit ${permitId}`, 'Permit', permitId, null, permit);
    await createNotification(tenantId, 'Permit denied', `Permit ${permitId} has been denied.`, 'prevention.permit');
    return permit;
}
async function requestPermitInfo(tenantId, permitId, userId) {
    const permit = await prisma_js_1.prisma.permit.update({ where: { id: permitId }, data: { status: 'Additional Info Required', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Requested info for permit ${permitId}`, 'Permit', permitId, null, permit);
    return permit;
}
async function listPreplans(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await loadContext(tenantId);
    const search = lower(filters.search);
    const items = ctx.preplans.map((preplan) => ({
        ...preplan,
        propertyName: ctx.properties.find((property) => property.id === preplan.propertyId)?.name ?? 'Unknown',
        occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === preplan.occupancyId)?.occupancyName ?? null,
        attachments: ctx.preplanAttachments.filter((attachment) => attachment.preplanId === preplan.id),
        completenessScore: preplanStatusScore(preplan.status),
    })).filter((preplan) => {
        if (filters.preplanStatus && lower(preplan.status) !== lower(filters.preplanStatus))
            return false;
        if (search && ![preplan.title, preplan.propertyName, preplan.occupancyName, preplan.preplanNumber].some((field) => lower(field).includes(search)))
            return false;
        return true;
    }).sort((left, right) => preplanStatusScore(right.status) - preplanStatusScore(left.status));
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function listPreplansReviewDue(tenantId) {
    const result = await listPreplans(tenantId, 1, 500, {});
    return result.items.filter((preplan) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status)));
}
async function listPreplansIncomplete(tenantId) {
    const result = await listPreplans(tenantId, 1, 500, {});
    return result.items.filter((preplan) => statusCode(preplan.status) === 'INCOMPLETE');
}
async function createPreplan(tenantId, userId, payload) {
    const preplan = await prisma_js_1.prisma.preplan.create({
        data: {
            id: `preplan-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Draft',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            isDeleted: false,
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created preplan ${preplan.id}`, 'Preplan', preplan.id, null, preplan);
    return preplan;
}
async function updatePreplan(tenantId, preplanId, userId, payload) {
    const before = await prisma_js_1.prisma.preplan.findFirst({ where: { id: preplanId, tenantId } });
    const preplan = await prisma_js_1.prisma.preplan.update({ where: { id: preplanId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated preplan ${preplanId}`, 'Preplan', preplanId, before, preplan);
    return preplan;
}
async function activatePreplan(tenantId, preplanId, userId) {
    const preplan = await prisma_js_1.prisma.preplan.update({ where: { id: preplanId }, data: { status: 'Active', lastReviewedDate: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Activated preplan ${preplanId}`, 'Preplan', preplanId, null, preplan);
    return preplan;
}
async function markPreplanReviewDue(tenantId, preplanId, userId) {
    const preplan = await prisma_js_1.prisma.preplan.update({ where: { id: preplanId }, data: { status: 'Review Due', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Marked preplan review due ${preplanId}`, 'Preplan', preplanId, null, preplan);
    return preplan;
}
async function listHydrants(tenantId, page = 1, take = 50) {
    const items = await prisma_js_1.prisma.hydrant.findMany({ where: { tenantId }, orderBy: [{ status: 'asc' }, { hydrantNumber: 'asc' }] });
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function listHydrantIssues(tenantId) {
    const hydrants = await prisma_js_1.prisma.hydrant.findMany({ where: { tenantId } });
    return hydrants.filter((hydrant) => ['NEEDS INSPECTION', 'OUT OF SERVICE', 'NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status)));
}
async function createHydrant(tenantId, userId, payload) {
    const hydrant = await prisma_js_1.prisma.hydrant.create({
        data: {
            id: `hydrant-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Active',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created hydrant ${hydrant.id}`, 'Hydrant', hydrant.id, null, hydrant);
    return hydrant;
}
async function listHazards(tenantId, page = 1, take = 50) {
    const items = await prisma_js_1.prisma.hazard.findMany({ where: { tenantId }, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }] });
    return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}
async function listCriticalHazards(tenantId) {
    const result = await listHazards(tenantId, 1, 500);
    return result.items.filter((hazard) => ['CRITICAL', 'HIGH'].includes(statusCode(hazard.severity)));
}
async function createHazard(tenantId, userId, payload) {
    const hazard = await prisma_js_1.prisma.hazard.create({
        data: {
            id: `hazard-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            status: 'Open',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created hazard ${hazard.id}`, 'Hazard', hazard.id, null, hazard);
    if (statusCode(hazard.severity) === 'CRITICAL' || statusCode(hazard.severity) === 'HIGH') {
        await createNotification(tenantId, 'Prevention hazard created', `${String(hazard.title ?? hazard.id)} requires mitigation follow-up.`, 'prevention.hazard');
    }
    return hazard;
}
async function listStationPreventionSummary(tenantId, stationId) {
    const ctx = await loadContext(tenantId);
    return getStationPreventionSummaryInternal(stationId, ctx);
}
function getStationPreventionSummaryInternal(stationId, ctx) {
    const properties = ctx.properties.filter((property) => property.responseStationId === stationId || property.stationArea === ctx.stationById.get(stationId)?.name);
    const inspections = ctx.inspections.filter((inspection) => properties.some((property) => property.id === inspection.propertyId));
    const violations = ctx.violations.filter((violation) => properties.some((property) => property.id === violation.propertyId));
    const permits = ctx.permits.filter((permit) => properties.some((property) => property.id === permit.propertyId));
    const preplans = ctx.preplans.filter((preplan) => properties.some((property) => property.id === preplan.propertyId));
    const hydrants = ctx.hydrants.filter((hydrant) => hydrant.stationId === stationId);
    const riskSnapshots = ctx.snapshots.filter((snapshot) => snapshot.stationId === stationId);
    const averagePropertyRisk = properties.length ? Math.round(properties.map((property) => calculatePropertyRisk(property, ctx).score).reduce((sum, value) => sum + value, 0) / properties.length) : 58;
    const riskScore = riskSnapshots.length ? Math.round(riskSnapshots.reduce((sum, snapshot) => sum + Number(snapshot.overallPreventionRiskScore ?? 0), 0) / riskSnapshots.length) : averagePropertyRisk;
    return {
        stationId,
        station: ctx.stationById.get(stationId) ?? null,
        propertyCount: properties.length,
        inspectionCount: inspections.length,
        openViolationCount: violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status))).length,
        permitBacklog: permits.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'].includes(statusCode(permit.status))).length,
        preplanGaps: preplans.filter((preplan) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status))).length,
        hydrantIssues: hydrants.filter((hydrant) => ['NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status))).length,
        overallPreventionRiskScore: riskScore,
        riskLevel: riskLevel(riskScore),
        evidenceSummary: `${properties.length} properties, ${violations.length} violation(s), ${preplans.length} preplan(s), ${hydrants.length} hydrant(s).`,
    };
}
async function getStationPreventionSummary(tenantId, stationId) {
    return listStationPreventionSummary(tenantId, stationId);
}
async function getStationPreventionRisk(tenantId, stationId) {
    return listStationPreventionSummary(tenantId, stationId);
}
async function getPreventionCommandCenterAndSeed(tenantId) {
    const data = await getPreventionCommandCenter(tenantId);
    if (data.summary.overallPreventionRiskScore >= 80) {
        await createNotification(tenantId, 'District prevention risk elevated', 'The prevention command center is showing elevated risk and backlog pressure.', 'prevention.risk');
    }
    return data;
}
async function createOccupancy(tenantId, userId, payload) {
    const occupancy = await prisma_js_1.prisma.occupancy.create({
        data: {
            id: `occupancy-${(0, node_crypto_1.randomUUID)()}`,
            tenantId,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            isDeleted: false,
            ...payload,
        },
    });
    await writeAudit(tenantId, userId, `Created occupancy ${occupancy.id}`, 'Occupancy', occupancy.id, null, occupancy);
    return occupancy;
}
async function updateOccupancy(tenantId, occupancyId, userId, payload) {
    const before = await prisma_js_1.prisma.occupancy.findFirst({ where: { id: occupancyId, tenantId } });
    const occupancy = await prisma_js_1.prisma.occupancy.update({ where: { id: occupancyId }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `Updated occupancy ${occupancyId}`, 'Occupancy', occupancyId, before, occupancy);
    return occupancy;
}
