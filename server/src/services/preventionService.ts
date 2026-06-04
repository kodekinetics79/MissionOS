import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const dayMs = 86_400_000;
const resolvePage = (value: unknown) => Math.max(Number(value || 1), 1);
const resolveTake = (value: unknown) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page: number, take: number) => (page - 1) * take;
const statusCode = (value: unknown) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const lower = (value: unknown) => String(value ?? '').toLowerCase();
const nowIso = () => new Date().toISOString();

type PreventionFilters = {
  stationId?: string;
  occupancyType?: string;
  riskLevel?: string;
  inspectionStatus?: string;
  permitStatus?: string;
  violationSeverity?: string;
  preplanStatus?: string;
  search?: string;
};

function percent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysUntil(value?: string | null) {
  if (!value) return null;
  return Math.round((new Date(value).getTime() - Date.now()) / dayMs);
}

function riskLevel(score: number) {
  if (score >= 90) return 'Low';
  if (score >= 75) return 'Moderate';
  if (score >= 60) return 'High';
  return 'Critical';
}

function severityWeight(severity: unknown) {
  const code = statusCode(severity);
  if (code === 'CRITICAL') return 20;
  if (code === 'HIGH') return 12;
  if (code === 'NORMAL') return 6;
  return 3;
}

function inspectionStatusScore(status: unknown) {
  const code = statusCode(status);
  if (code === 'PASSED' || code === 'CLOSED') return 100;
  if (code === 'SCHEDULED') return 82;
  if (code === 'IN_PROGRESS') return 72;
  if (code === 'FAILED') return 42;
  if (code === 'REINSPECTION_REQUIRED') return 35;
  if (code === 'CANCELLED') return 90;
  return 60;
}

function permitStatusScore(status: unknown) {
  const code = statusCode(status);
  if (code === 'APPROVED' || code === 'CLOSED') return 100;
  if (code === 'SUBMITTED' || code === 'UNDER_REVIEW') return 72;
  if (code === 'ADDITIONAL_INFO_REQUIRED') return 55;
  if (code === 'DENIED') return 40;
  if (code === 'EXPIRED') return 30;
  return 60;
}

function preplanStatusScore(status: unknown) {
  const code = statusCode(status);
  if (code === 'ACTIVE') return 100;
  if (code === 'DRAFT') return 70;
  if (code === 'REVIEW_DUE') return 58;
  if (code === 'INCOMPLETE') return 45;
  if (code === 'ARCHIVED') return 80;
  return 60;
}

async function writeAudit(tenantId: string, userId: string | undefined, action: string, entityName: string, entityId?: string, before?: unknown, after?: unknown) {
  await prisma.auditLog.create({
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

async function createNotification(tenantId: string, title: string, message: string, type: string) {
  await prisma.notification.create({
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

async function createInsight(tenantId: string, category: string, title: string, summary: string, severity: string, recommendedActions: string[]) {
  await prisma.aiInsight.create({
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

async function loadContext(tenantId: string) {
  const [
    properties,
    occupancies,
    inspections,
    checklistItems,
    violations,
    correctiveActions,
    permits,
    permitReviews,
    preplans,
    preplanAttachments,
    hydrants,
    hazards,
    contacts,
    documents,
    snapshots,
    stations,
    incidents,
    notifications,
    insights,
    auditLogs,
  ] = await Promise.all([
    prisma.property.findMany({ where: { tenantId } }),
    prisma.occupancy.findMany({ where: { tenantId } }),
    prisma.inspection.findMany({ where: { tenantId } }),
    prisma.inspectionChecklistItem.findMany({ where: { tenantId } }),
    prisma.violation.findMany({ where: { tenantId } }),
    prisma.correctiveAction.findMany({ where: { tenantId } }),
    prisma.permit.findMany({ where: { tenantId } }),
    prisma.permitReview.findMany({ where: { tenantId } }),
    prisma.preplan.findMany({ where: { tenantId } }),
    prisma.preplanAttachment.findMany({ where: { tenantId } }),
    prisma.hydrant.findMany({ where: { tenantId } }),
    prisma.hazard.findMany({ where: { tenantId } }),
    prisma.preventionContact.findMany({ where: { tenantId } }),
    prisma.preventionDocument.findMany({ where: { tenantId } }),
    prisma.preventionRiskSnapshot.findMany({ where: { tenantId } }),
    prisma.station.findMany({ where: { tenantId } }),
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.notification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.aiInsight.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const occupancyByProperty = new Map<string, any[]>();
  for (const occupancy of occupancies as any[]) {
    const list = occupancyByProperty.get(occupancy.propertyId) ?? [];
    list.push(occupancy);
    occupancyByProperty.set(occupancy.propertyId, list);
  }

  const inspectionsByProperty = new Map<string, any[]>();
  for (const inspection of inspections as any[]) {
    const list = inspectionsByProperty.get(inspection.propertyId) ?? [];
    list.push(inspection);
    inspectionsByProperty.set(inspection.propertyId, list);
  }

  const checklistByInspection = new Map<string, any[]>();
  for (const item of checklistItems as any[]) {
    const list = checklistByInspection.get(item.inspectionId) ?? [];
    list.push(item);
    checklistByInspection.set(item.inspectionId, list);
  }

  const violationsByProperty = new Map<string, any[]>();
  const violationsByInspection = new Map<string, any[]>();
  for (const violation of violations as any[]) {
    const propertyList = violationsByProperty.get(violation.propertyId) ?? [];
    propertyList.push(violation);
    violationsByProperty.set(violation.propertyId, propertyList);
    if (violation.inspectionId) {
      const inspectionList = violationsByInspection.get(violation.inspectionId) ?? [];
      inspectionList.push(violation);
      violationsByInspection.set(violation.inspectionId, inspectionList);
    }
  }

  const correctiveByViolation = new Map<string, any[]>();
  for (const action of correctiveActions as any[]) {
    const list = correctiveByViolation.get(action.violationId) ?? [];
    list.push(action);
    correctiveByViolation.set(action.violationId, list);
  }

  const permitsByProperty = new Map<string, any[]>();
  for (const permit of permits as any[]) {
    const list = permitsByProperty.get(permit.propertyId) ?? [];
    list.push(permit);
    permitsByProperty.set(permit.propertyId, list);
  }

  const preplansByProperty = new Map<string, any[]>();
  for (const preplan of preplans as any[]) {
    const list = preplansByProperty.get(preplan.propertyId) ?? [];
    list.push(preplan);
    preplansByProperty.set(preplan.propertyId, list);
  }

  const hydrantsByProperty = new Map<string, any[]>();
  const hydrantsByStation = new Map<string, any[]>();
  for (const hydrant of hydrants as any[]) {
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

  const hazardsByProperty = new Map<string, any[]>();
  for (const hazard of hazards as any[]) {
    const list = hazardsByProperty.get(hazard.propertyId) ?? [];
    list.push(hazard);
    hazardsByProperty.set(hazard.propertyId, list);
  }

  const contactsByProperty = new Map<string, any[]>();
  const docsByProperty = new Map<string, any[]>();
  const docsByInspection = new Map<string, any[]>();
  const docsByPermit = new Map<string, any[]>();
  const docsByPreplan = new Map<string, any[]>();
  for (const contact of contacts as any[]) {
    const list = contactsByProperty.get(contact.propertyId) ?? [];
    list.push(contact);
    contactsByProperty.set(contact.propertyId, list);
  }
  for (const document of documents as any[]) {
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

  const stationById = new Map((stations as any[]).map((station) => [station.id, station]));

  return {
    auditLogs: auditLogs as any[],
    checklistByInspection,
    contacts,
    contactsByProperty,
    correctiveActions: correctiveActions as any[],
    correctiveByViolation,
    docsByInspection,
    docsByPermit,
    docsByPreplan,
    docsByProperty,
    hazards: hazards as any[],
    hazardsByProperty,
    hydrants: hydrants as any[],
    hydrantsByProperty,
    hydrantsByStation,
    insights: insights as any[],
    incidents: incidents as any[],
    inspections: inspections as any[],
    inspectionsByProperty,
    notifications: notifications as any[],
    occupancies: occupancies as any[],
    occupancyByProperty,
    permits: permits as any[],
    permitsByProperty,
    permitReviews: permitReviews as any[],
    preplanAttachments: preplanAttachments as any[],
    preplans: preplans as any[],
    preplansByProperty,
    properties: properties as any[],
    snapshots: snapshots as any[],
    stations: stations as any[],
    stationById,
    violations: violations as any[],
    violationsByInspection,
    violationsByProperty,
  };
}

function basePropertyScore(property: any, occupancy: any[] = []) {
  const riskText = lower(property.occupancyRiskLevel ?? property.riskLevel);
  const occupancyRisk = occupancy.some((item) => item.highRisk || item.hazardousMaterials) ? 78 : 55;
  if (riskText.includes('critical')) return Math.max(occupancyRisk, 92);
  if (riskText.includes('high') || riskText.includes('extreme')) return Math.max(occupancyRisk, 80);
  if (riskText.includes('moderate')) return Math.max(occupancyRisk - 8, 66);
  return Math.max(occupancyRisk - 15, 52);
}

function calculatePropertyRisk(property: any, ctx: Awaited<ReturnType<typeof loadContext>>) {
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

  const score = percent(
    occupancyRisk * 0.25
      + Math.max(0, 100 - overdueInspections * 10) * 0.2
      + Math.max(0, 100 - criticalViolations * 11) * 0.2
      + Math.max(0, 100 - preplanGap * 3) * 0.15
      + Math.max(0, 100 - permitBacklog * 5) * 0.1
      + Math.max(0, 100 - hydrantHazard * 7) * 0.1,
  );

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

function inspectionPriorityScore(inspection: any, propertyRisk: ReturnType<typeof calculatePropertyRisk>, ctx: Awaited<ReturnType<typeof loadContext>>) {
  const days = daysUntil(inspection.scheduledDate ?? inspection.scheduledAt);
  const violations = ctx.violationsByInspection.get(inspection.id) ?? [];
  const openViolations = violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
  const inspectionScore = inspectionStatusScore(inspection.status);
  const overdueWeight = days != null && days < 0 ? Math.min(25, Math.abs(days) * 2) : 0;
  const openWeight = openViolations.reduce((total, violation) => total + severityWeight(violation.severity), 0);
  const specialHazardWeight = propertyRisk.hydrantHazard > 0 ? 6 : 0;
  const previousFailed = inspection.result === 'Failed' ? 10 : 0;
  const incidentHistory = ctx.incidents.filter((incident) => incident.propertyId === inspection.propertyId || incident.location?.toLowerCase().includes(String(inspection.propertyId).toLowerCase())).length;
  const score = percent(
    inspectionScore * 0.35
      + propertyRisk.score * 0.25
      + Math.max(0, 100 - overdueWeight * 2) * 0.15
      + Math.max(0, 100 - openWeight * 2) * 0.15
      + Math.max(0, 100 - specialHazardWeight * 3 - previousFailed * 2) * 0.1
      - Math.min(15, incidentHistory),
  );

  return {
    score,
    overdueDays: days && days < 0 ? Math.abs(days) : 0,
    reason: days != null && days < 0 ? `${Math.abs(days)} days overdue` : violations.length ? `${violations.length} linked violation(s)` : propertyRisk.level === 'Critical' ? 'Critical occupancy risk' : 'Scheduled workload',
    openViolations: openViolations.length,
    propertyRisk,
  };
}

function mapPropertyRow(property: any, ctx: Awaited<ReturnType<typeof loadContext>>) {
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

function mapInspectionRow(inspection: any, ctx: Awaited<ReturnType<typeof loadContext>>) {
  const property = ctx.properties.find((entry) => entry.id === inspection.propertyId);
  const risk = property ? calculatePropertyRisk(property, ctx) : { score: 60, level: 'High', occupancyRisk: 60, overdueInspections: 0, criticalViolations: 0, preplanGap: 0, permitBacklog: 0, hydrantHazard: 0, inspections: [], violations: [], permits: [], preplans: [], hydrants: [], hazards: [], occupancy: [] };
  const priority = inspectionPriorityScore(inspection, risk as any, ctx);
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

async function touchRiskNotifications(tenantId: string, title: string, message: string, severity: string) {
  if (severity === 'Critical' || severity === 'High') {
    await createNotification(tenantId, title, message, 'prevention.risk');
    await createInsight(tenantId, 'Prevention', title, message, severity, ['Schedule the highest-risk inspection first', 'Resolve open violations', 'Update preplans and verify hydrants']);
  }
}

export async function getPreventionCommandCenter(tenantId: string) {
  const ctx = await loadContext(tenantId);
  const mappedProperties = ctx.properties.map((property) => mapPropertyRow(property, ctx)).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
  const mappedInspections = ctx.inspections.map((inspection) => mapInspectionRow(inspection, ctx)).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
  const openViolations = ctx.violations.filter((violation) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
  const overdueInspections = mappedInspections.filter((inspection) => inspection.overdueDays > 0);
  const highRiskOccupancies = ctx.occupancies.filter((occupancy) => occupancy.highRisk || occupancy.hazardousMaterials || statusCode(occupancy.riskLevel) === 'CRITICAL' || statusCode(occupancy.riskLevel) === 'HIGH');
  const permitBacklog = ctx.permits.filter((permit) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED'].includes(statusCode(permit.status)));
  const reviewDuePreplans = ctx.preplans.filter((preplan) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status)));
  const hydrantIssues = ctx.hydrants.filter((hydrant) => ['NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status)));
  const hazardsBySeverity = ctx.hazards.reduce<Record<string, number>>((accumulator, hazard) => {
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

export async function getPreventionRisks(tenantId: string) {
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

export async function getPreventionReadinessImpact(tenantId: string) {
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

export async function listProperties(tenantId: string, page = 1, take = 50, filters: PreventionFilters = {}) {
  const ctx = await loadContext(tenantId);
  const search = lower(filters.search);
  const items = ctx.properties.map((property) => mapPropertyRow(property, ctx)).filter((property) => {
    if (filters.stationId && property.responseStationId !== filters.stationId) return false;
    if (filters.occupancyType && lower(property.occupancyType) !== lower(filters.occupancyType)) return false;
    if (filters.riskLevel && lower(property.riskLevel) !== lower(filters.riskLevel)) return false;
    if (filters.inspectionStatus && !property.occupancies.some((occupancy: any) => lower(occupancy.status) === lower(filters.inspectionStatus))) return false;
    if (filters.permitStatus && lower(property.permitStatus) !== lower(filters.permitStatus)) return false;
    if (filters.preplanStatus && lower(property.preplanStatus) !== lower(filters.preplanStatus)) return false;
    if (filters.violationSeverity && !String(property.openViolations).length) return false;
    if (search && ![property.name, property.addressLine1, property.city, property.propertyType, property.occupancyType].some((field) => lower(field).includes(search))) return false;
    return true;
  }).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function getProperty360(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  const property = ctx.properties.find((entry) => entry.id === propertyId);
  if (!property) return null;
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

export async function getPropertyInspections(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  return (ctx.inspectionsByProperty.get(propertyId) ?? []).map((inspection) => mapInspectionRow(inspection, ctx));
}

export async function getPropertyPermits(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  return ctx.permitsByProperty.get(propertyId) ?? [];
}

export async function getPropertyPreplans(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  return (ctx.preplansByProperty.get(propertyId) ?? []).map((preplan) => ({
    ...preplan,
    attachments: ctx.preplanAttachments.filter((attachment) => attachment.preplanId === preplan.id),
  }));
}

export async function getPropertyViolations(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  return ctx.violationsByProperty.get(propertyId) ?? [];
}

export async function getPropertyRisk(tenantId: string, propertyId: string) {
  const ctx = await loadContext(tenantId);
  const property = ctx.properties.find((entry) => entry.id === propertyId);
  if (!property) return null;
  const mapped = mapPropertyRow(property, ctx);
  return {
    ...mapped,
    readinessImpact: 100 - mapped.riskScore,
    recommendedAction: mapped.riskLevel === 'Critical' ? 'Dispatch inspection and mitigation team immediately.' : 'Monitor and complete scheduled prevention actions.',
  };
}

export async function listOccupancies(tenantId: string, page = 1, take = 50) {
  const items = await prisma.occupancy.findMany({ where: { tenantId }, orderBy: [{ highRisk: 'desc' }, { occupancyName: 'asc' }] });
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function createProperty(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const property = await prisma.property.create({
    data: {
      id: `property-${randomUUID()}`,
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

export async function updateProperty(tenantId: string, propertyId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.property.findFirst({ where: { id: propertyId, tenantId } });
  const property = await prisma.property.update({ where: { id: propertyId }, data: { ...payload, updatedAt: nowIso(), updatedBy: userId ?? null } });
  await writeAudit(tenantId, userId, `Updated property ${String(property.name ?? propertyId)}`, 'Property', propertyId, before, property);
  return property;
}

export async function listInspections(tenantId: string, page = 1, take = 50, filters: PreventionFilters = {}) {
  const ctx = await loadContext(tenantId);
  const search = lower(filters.search);
  const items = ctx.inspections.map((inspection) => mapInspectionRow(inspection, ctx)).filter((inspection) => {
    if (filters.stationId && inspection.stationId !== filters.stationId) return false;
    if (filters.inspectionStatus && lower(inspection.status) !== lower(filters.inspectionStatus)) return false;
    if (filters.riskLevel && lower(inspection.riskLevel) !== lower(filters.riskLevel)) return false;
    if (search && ![inspection.propertyName, inspection.address, inspection.inspectionType, inspection.assignedInspectorPersonnelId].some((field) => lower(field).includes(search))) return false;
    return true;
  }).sort((left, right) => Number(right.riskScore) - Number(left.riskScore));
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function getPrioritizedInspections(tenantId: string) {
  const result = await listInspections(tenantId, 1, 500, {});
  return result.items.map((inspection: any) => ({
    ...inspection,
    priorityReason: inspection.priorityReason,
  })).sort((left: any, right: any) => Number(right.riskScore) - Number(left.riskScore));
}

export async function getOverdueInspections(tenantId: string) {
  const inspections = await getPrioritizedInspections(tenantId);
  return inspections.filter((inspection: any) => Number(inspection.overdueDays ?? 0) > 0);
}

export async function createInspection(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const inspection = await prisma.inspection.create({
    data: {
      id: `inspection-${randomUUID()}`,
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

export async function updateInspection(tenantId: string, inspectionId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.inspection.findFirst({ where: { id: inspectionId, tenantId } });
  const inspection = await prisma.inspection.update({ where: { id: inspectionId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated inspection ${inspection.id}`, 'Inspection', inspection.id, before, inspection);
  return inspection;
}

export async function startInspection(tenantId: string, inspectionId: string, userId: string | undefined) {
  const inspection = await prisma.inspection.update({ where: { id: inspectionId }, data: { status: 'In Progress', startedAt: nowIso(), updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Started inspection ${inspectionId}`, 'Inspection', inspectionId, null, inspection);
  return inspection;
}

export async function completeInspection(tenantId: string, inspectionId: string, userId: string | undefined, payload: Record<string, unknown> = {}) {
  const before = await prisma.inspection.findFirst({ where: { id: inspectionId, tenantId } });
  const checklist = await prisma.inspectionChecklistItem.findMany({ where: { tenantId, inspectionId } });
  const failedCount = checklist.filter((item) => statusCode(item.result) === 'FAIL').length;
  const status = failedCount > 0 || statusCode(payload.result) === 'FAILED' ? 'Failed' : 'Passed';
  const inspection = await prisma.inspection.update({
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

export async function closeInspection(tenantId: string, inspectionId: string, userId: string | undefined) {
  const inspection = await prisma.inspection.update({ where: { id: inspectionId }, data: { status: 'Closed', updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Closed inspection ${inspectionId}`, 'Inspection', inspectionId, null, inspection);
  return inspection;
}

export async function getInspectionChecklist(tenantId: string, inspectionId: string) {
  return prisma.inspectionChecklistItem.findMany({ where: { tenantId, inspectionId }, orderBy: [{ category: 'asc' }, { createdAt: 'asc' }] });
}

export async function addInspectionChecklistItem(tenantId: string, inspectionId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const item = await prisma.inspectionChecklistItem.create({
    data: {
      id: `checklist-${randomUUID()}`,
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

export async function listViolations(tenantId: string, page = 1, take = 50, filters: PreventionFilters = {}) {
  const ctx = await loadContext(tenantId);
  const search = lower(filters.search);
  const items = ctx.violations.map((violation) => ({
    ...violation,
    propertyName: ctx.properties.find((property) => property.id === violation.propertyId)?.name ?? 'Unknown',
    occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === violation.occupancyId)?.occupancyName ?? null,
    correctiveActions: ctx.correctiveByViolation.get(violation.id) ?? [],
  })).filter((violation) => {
    if (filters.violationSeverity && lower(violation.severity) !== lower(filters.violationSeverity)) return false;
    if (search && ![violation.title, violation.codeReference, violation.propertyName, violation.occupancyName].some((field) => lower(field).includes(search))) return false;
    return true;
  }).sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity));
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function listOpenViolations(tenantId: string) {
  const result = await listViolations(tenantId, 1, 500, {});
  return result.items.filter((violation: any) => !['RESOLVED', 'CLOSED'].includes(statusCode(violation.status)));
}

export async function listCriticalViolations(tenantId: string) {
  const result = await listViolations(tenantId, 1, 500, {});
  return result.items.filter((violation: any) => ['CRITICAL', 'HIGH'].includes(statusCode(violation.severity)));
}

export async function createViolation(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const violation = await prisma.violation.create({
    data: {
      id: `violation-${randomUUID()}`,
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

export async function updateViolation(tenantId: string, violationId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.violation.findFirst({ where: { id: violationId, tenantId } });
  const violation = await prisma.violation.update({ where: { id: violationId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated violation ${violationId}`, 'Violation', violationId, before, violation);
  return violation;
}

export async function resolveViolation(tenantId: string, violationId: string, userId: string | undefined) {
  const violation = await prisma.violation.update({ where: { id: violationId }, data: { status: 'Resolved', resolvedDate: nowIso(), updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Resolved violation ${violationId}`, 'Violation', violationId, null, violation);
  await createNotification(tenantId, 'Violation resolved', `Violation ${violationId} has been resolved.`, 'prevention.violation');
  return violation;
}

export async function escalateViolation(tenantId: string, violationId: string, userId: string | undefined) {
  const violation = await prisma.violation.update({ where: { id: violationId }, data: { status: 'Escalated', updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Escalated violation ${violationId}`, 'Violation', violationId, null, violation);
  await createNotification(tenantId, 'Violation escalated', `Violation ${violationId} has been escalated for follow-up.`, 'prevention.violation');
  return violation;
}

export async function getCorrectiveActions(tenantId: string) {
  return prisma.correctiveAction.findMany({ where: { tenantId }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] });
}

export async function createCorrectiveAction(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const action = await prisma.correctiveAction.create({
    data: {
      id: `corrective-${randomUUID()}`,
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

export async function updateCorrectiveAction(tenantId: string, correctiveActionId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.correctiveAction.findFirst({ where: { id: correctiveActionId, tenantId } });
  const action = await prisma.correctiveAction.update({ where: { id: correctiveActionId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated corrective action ${correctiveActionId}`, 'CorrectiveAction', correctiveActionId, before, action);
  return action;
}

export async function completeCorrectiveAction(tenantId: string, correctiveActionId: string, userId: string | undefined) {
  const action = await prisma.correctiveAction.update({ where: { id: correctiveActionId }, data: { status: 'Completed', completedDate: nowIso(), updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Completed corrective action ${correctiveActionId}`, 'CorrectiveAction', correctiveActionId, null, action);
  return action;
}

export async function listPermits(tenantId: string, page = 1, take = 50, filters: PreventionFilters = {}) {
  const ctx = await loadContext(tenantId);
  const search = lower(filters.search);
  const items = ctx.permits.map((permit) => ({
    ...permit,
    propertyName: ctx.properties.find((property) => property.id === permit.propertyId)?.name ?? 'Unknown',
    occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === permit.occupancyId)?.occupancyName ?? null,
    reviews: ctx.permitReviews.filter((review) => review.permitId === permit.id),
  })).filter((permit) => {
    if (filters.permitStatus && lower(permit.status) !== lower(filters.permitStatus)) return false;
    if (search && ![permit.permitNumber, permit.propertyName, permit.occupancyName, permit.permitType].some((field) => lower(field).includes(search))) return false;
    return true;
  }).sort((left, right) => permitStatusScore(left.status) - permitStatusScore(right.status));
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function listPermitBacklog(tenantId: string) {
  const result = await listPermits(tenantId, 1, 500, {});
  return result.items.filter((permit: any) => ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'EXPIRED'].includes(statusCode(permit.status)));
}

export async function listExpiringPermits(tenantId: string) {
  const result = await listPermits(tenantId, 1, 500, {});
  return result.items.filter((permit: any) => {
    const days = daysUntil(permit.expirationDate);
    return days != null && days <= 30;
  });
}

export async function createPermit(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const permit = await prisma.permit.create({
    data: {
      id: `permit-${randomUUID()}`,
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

export async function updatePermit(tenantId: string, permitId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.permit.findFirst({ where: { id: permitId, tenantId } });
  const permit = await prisma.permit.update({ where: { id: permitId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated permit ${permitId}`, 'Permit', permitId, before, permit);
  return permit;
}

export async function reviewPermit(tenantId: string, permitId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const review = await prisma.permitReview.create({
    data: {
      id: `permit-review-${randomUUID()}`,
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

export async function approvePermit(tenantId: string, permitId: string, userId: string | undefined) {
  const permit = await prisma.permit.update({ where: { id: permitId }, data: { status: 'Approved', approvedDate: nowIso(), updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Approved permit ${permitId}`, 'Permit', permitId, null, permit);
  await createNotification(tenantId, 'Permit approved', `Permit ${permitId} has been approved.`, 'prevention.permit');
  return permit;
}

export async function denyPermit(tenantId: string, permitId: string, userId: string | undefined) {
  const permit = await prisma.permit.update({ where: { id: permitId }, data: { status: 'Denied', updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Denied permit ${permitId}`, 'Permit', permitId, null, permit);
  await createNotification(tenantId, 'Permit denied', `Permit ${permitId} has been denied.`, 'prevention.permit');
  return permit;
}

export async function requestPermitInfo(tenantId: string, permitId: string, userId: string | undefined) {
  const permit = await prisma.permit.update({ where: { id: permitId }, data: { status: 'Additional Info Required', updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Requested info for permit ${permitId}`, 'Permit', permitId, null, permit);
  return permit;
}

export async function listPreplans(tenantId: string, page = 1, take = 50, filters: PreventionFilters = {}) {
  const ctx = await loadContext(tenantId);
  const search = lower(filters.search);
  const items = ctx.preplans.map((preplan) => ({
    ...preplan,
    propertyName: ctx.properties.find((property) => property.id === preplan.propertyId)?.name ?? 'Unknown',
    occupancyName: ctx.occupancies.find((occupancy) => occupancy.id === preplan.occupancyId)?.occupancyName ?? null,
    attachments: ctx.preplanAttachments.filter((attachment) => attachment.preplanId === preplan.id),
    completenessScore: preplanStatusScore(preplan.status),
  })).filter((preplan) => {
    if (filters.preplanStatus && lower(preplan.status) !== lower(filters.preplanStatus)) return false;
    if (search && ![preplan.title, preplan.propertyName, preplan.occupancyName, preplan.preplanNumber].some((field) => lower(field).includes(search))) return false;
    return true;
  }).sort((left, right) => preplanStatusScore(right.status) - preplanStatusScore(left.status));
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function listPreplansReviewDue(tenantId: string) {
  const result = await listPreplans(tenantId, 1, 500, {});
  return result.items.filter((preplan: any) => ['REVIEW_DUE', 'INCOMPLETE', 'DRAFT'].includes(statusCode(preplan.status)));
}

export async function listPreplansIncomplete(tenantId: string) {
  const result = await listPreplans(tenantId, 1, 500, {});
  return result.items.filter((preplan: any) => statusCode(preplan.status) === 'INCOMPLETE');
}

export async function createPreplan(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const preplan = await prisma.preplan.create({
    data: {
      id: `preplan-${randomUUID()}`,
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

export async function updatePreplan(tenantId: string, preplanId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.preplan.findFirst({ where: { id: preplanId, tenantId } });
  const preplan = await prisma.preplan.update({ where: { id: preplanId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated preplan ${preplanId}`, 'Preplan', preplanId, before, preplan);
  return preplan;
}

export async function activatePreplan(tenantId: string, preplanId: string, userId: string | undefined) {
  const preplan = await prisma.preplan.update({ where: { id: preplanId }, data: { status: 'Active', lastReviewedDate: nowIso(), updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Activated preplan ${preplanId}`, 'Preplan', preplanId, null, preplan);
  return preplan;
}

export async function markPreplanReviewDue(tenantId: string, preplanId: string, userId: string | undefined) {
  const preplan = await prisma.preplan.update({ where: { id: preplanId }, data: { status: 'Review Due', updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Marked preplan review due ${preplanId}`, 'Preplan', preplanId, null, preplan);
  return preplan;
}

export async function listHydrants(tenantId: string, page = 1, take = 50) {
  const items = await prisma.hydrant.findMany({ where: { tenantId }, orderBy: [{ status: 'asc' }, { hydrantNumber: 'asc' }] });
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function listHydrantIssues(tenantId: string) {
  const hydrants = await prisma.hydrant.findMany({ where: { tenantId } });
  return hydrants.filter((hydrant: any) => ['NEEDS INSPECTION', 'OUT OF SERVICE', 'NEEDS_INSPECTION', 'OUT_OF_SERVICE'].includes(statusCode(hydrant.status)));
}

export async function createHydrant(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const hydrant = await prisma.hydrant.create({
    data: {
      id: `hydrant-${randomUUID()}`,
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

export async function listHazards(tenantId: string, page = 1, take = 50) {
  const items = await prisma.hazard.findMany({ where: { tenantId }, orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }] });
  return { items: items.slice(resolveSkip(page, take), resolveSkip(page, take) + take), page, take, total: items.length };
}

export async function listCriticalHazards(tenantId: string) {
  const result = await listHazards(tenantId, 1, 500);
  return result.items.filter((hazard: any) => ['CRITICAL', 'HIGH'].includes(statusCode(hazard.severity)));
}

export async function createHazard(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const hazard = await prisma.hazard.create({
    data: {
      id: `hazard-${randomUUID()}`,
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

export async function listStationPreventionSummary(tenantId: string, stationId: string) {
  const ctx = await loadContext(tenantId);
  return getStationPreventionSummaryInternal(stationId, ctx);
}

function getStationPreventionSummaryInternal(stationId: string, ctx: Awaited<ReturnType<typeof loadContext>>) {
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

export async function getStationPreventionSummary(tenantId: string, stationId: string) {
  return listStationPreventionSummary(tenantId, stationId);
}

export async function getStationPreventionRisk(tenantId: string, stationId: string) {
  return listStationPreventionSummary(tenantId, stationId);
}

export async function getPreventionCommandCenterAndSeed(tenantId: string) {
  const data = await getPreventionCommandCenter(tenantId);
  if (data.summary.overallPreventionRiskScore >= 80) {
    await createNotification(tenantId, 'District prevention risk elevated', 'The prevention command center is showing elevated risk and backlog pressure.', 'prevention.risk');
  }
  return data;
}

export async function createOccupancy(tenantId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const occupancy = await prisma.occupancy.create({
    data: {
      id: `occupancy-${randomUUID()}`,
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

export async function updateOccupancy(tenantId: string, occupancyId: string, userId: string | undefined, payload: Record<string, unknown>) {
  const before = await prisma.occupancy.findFirst({ where: { id: occupancyId, tenantId } });
  const occupancy = await prisma.occupancy.update({ where: { id: occupancyId }, data: { ...payload, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, `Updated occupancy ${occupancyId}`, 'Occupancy', occupancyId, before, occupancy);
  return occupancy;
}

