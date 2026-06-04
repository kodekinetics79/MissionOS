import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma.js';

const resolvePage = (value: unknown) => Math.max(Number(value || 1), 1);
const resolveTake = (value: unknown) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page: number, take: number) => (page - 1) * take;
const statusCode = (value: unknown) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const daysUntil = (value?: string | null) => {
  if (!value) return Number.POSITIVE_INFINITY;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
};

function normalizeRows(rows: any[]) {
  return rows.map((row) => ({ ...row }));
}

async function loadContext(tenantId: string) {
  const [
    personnel,
    stations,
    certifications,
    courses,
    sessions,
    assignments,
    attendance,
    outcomes,
    needs,
    reviews,
    incidents,
    incidentPersonnel,
    personnelAssignments,
    apparatus,
    inspections,
    properties,
    assets,
  ] = await Promise.all([
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.station.findMany({ where: { tenantId } }),
    prisma.certification.findMany({ where: { tenantId } }),
    prisma.course.findMany({ where: { tenantId } }),
    prisma.courseSession.findMany({ where: { tenantId } }),
    prisma.trainingAssignment.findMany({ where: { tenantId } }),
    prisma.trainingAttendance.findMany({ where: { tenantId } }),
    prisma.trainingOutcome.findMany({ where: { tenantId } }),
    prisma.trainingNeedAssessment.findMany({ where: { tenantId } }),
    prisma.personnelPerformanceReview.findMany({ where: { tenantId } }),
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.incidentPersonnel.findMany({ where: { tenantId } }),
    prisma.personnelAssignment.findMany({ where: { tenantId, isCurrent: true } }),
    prisma.apparatus.findMany({ where: { tenantId } }),
    prisma.inspection.findMany({ where: { tenantId } }),
    prisma.property.findMany({ where: { tenantId } }),
    prisma.asset.findMany({ where: { tenantId } }),
  ]);

  const certificationLookup = new Map<string, any>();
  for (const certification of certifications) {
    certificationLookup.set(String(certification.id).toLowerCase(), certification);
    certificationLookup.set(String(certification.name).toLowerCase(), certification);
    certificationLookup.set(String(certification.code ?? certification.name).toLowerCase(), certification);
  }

  const personnelCertifications = normalizeRows(await prisma.personnelCertification.findMany({ where: { tenantId } }));
  const certsByPersonnel = new Map<string, any[]>();
  for (const certification of personnelCertifications) {
    const list = certsByPersonnel.get(certification.personnelId) ?? [];
    list.push(certification);
    certsByPersonnel.set(certification.personnelId, list);
  }

  const reviewsByPersonnel = new Map<string, any[]>();
  for (const review of reviews) {
    const list = reviewsByPersonnel.get(review.personnelId) ?? [];
    list.push(review);
    reviewsByPersonnel.set(review.personnelId, list);
  }

  const assignmentsByPersonnel = new Map<string, any[]>();
  for (const assignment of assignments) {
    const list = assignmentsByPersonnel.get(assignment.personnelId) ?? [];
    list.push(assignment);
    assignmentsByPersonnel.set(assignment.personnelId, list);
  }

  const incidentCountsByPersonnel = new Map<string, number>();
  for (const incidentPerson of incidentPersonnel) {
    incidentCountsByPersonnel.set(incidentPerson.personnelId, (incidentCountsByPersonnel.get(incidentPerson.personnelId) ?? 0) + 1);
  }

  const incidentCountsByType = new Map<string, number>();
  for (const incident of incidents) {
    const key = String(incident.incidentType ?? incident.type ?? 'Unknown').toLowerCase();
    incidentCountsByType.set(key, (incidentCountsByType.get(key) ?? 0) + 1);
  }

  const stationAssignments = new Map<string, any[]>();
  for (const assignment of personnelAssignments) {
    const list = stationAssignments.get(assignment.stationId) ?? [];
    list.push(assignment);
    stationAssignments.set(assignment.stationId, list);
  }

  return {
    assets,
    apparatus,
  assignments,
  assignmentsByPersonnel,
  attendance,
  certificationLookup,
  courseCategories: await prisma.courseCategory.findMany({ where: { tenantId } }),
  certsByPersonnel,
  courses,
  instructorProfiles: await prisma.instructorProfile.findMany({ where: { tenantId } }),
  renewals: await prisma.certificationRenewal.findMany({ where: { tenantId } }),
  incidents,
  incidentCountsByPersonnel,
  incidentCountsByType,
  incidentPersonnel,
  inspections,
  needs: normalizeRows(needs),
  personnel: normalizeRows(personnel),
  personnelAssignments: normalizeRows(personnelAssignments),
  personnelCertifications,
  reviewsByPersonnel,
  sessions: normalizeRows(sessions),
  outcomes,
  properties,
  stations: normalizeRows(stations),
  notifications: await prisma.notification.findMany({ where: { tenantId } }),
  aiInsights: await prisma.aiInsight.findMany({ where: { tenantId } }),
  };
}

function hasCertification(personCerts: any[], requirement: string, certificationLookup: Map<string, any>) {
  const normalized = requirement.toLowerCase();
  return personCerts.some((personCert) => {
    const cert = certificationLookup.get(String(personCert.certificationId).toLowerCase());
    if (!cert) return false;
    return [cert.id, cert.name, cert.code].some((field) => String(field ?? '').toLowerCase() === normalized);
  });
}

function activeAssignmentCount(assignmentsByPersonnel: Map<string, any[]>, personnelId: string) {
  return (assignmentsByPersonnel.get(personnelId) ?? []).filter((assignment) => !['COMPLETED', 'CANCELLED', 'MISSED', 'RESOLVED'].includes(statusCode(assignment.status))).length;
}

function averageReviewScore(reviews: any[]) {
  if (!reviews.length) return 3.5;
  const values = reviews.map((review) => Number(review.rating ?? 3)).filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 3.5;
}

function buildTrainerScore(person: any, course: any, need: any, context: Awaited<ReturnType<typeof loadContext>>) {
  const personCerts = context.certsByPersonnel.get(person.id) ?? [];
  const requiredCerts = (course.requiredCertifications ?? []).filter(Boolean);
  const certificationMatch = requiredCerts.length ? requiredCerts.filter((required: string) => hasCertification(personCerts, required, context.certificationLookup)).length / requiredCerts.length : 0.7;

  const relevantIncidents = context.incidents.filter((incident) => {
    const incidentType = String(incident.incidentType ?? incident.type ?? '').toLowerCase();
    return (course.relatedIncidentTypes ?? []).some((type: string) => incidentType.includes(String(type).toLowerCase()));
  });
  const subjectExperience = clamp01(relevantIncidents.length / 8 + ((context.incidentCountsByPersonnel.get(person.id) ?? 0) / 30));

  const instructorHistory = clamp01(((context.assignmentsByPersonnel.get(person.id) ?? []).filter((assignment) => statusCode(assignment.status) === 'COMPLETED').length / 8) + ((context.outcomes.filter((outcome: any) => outcome.personnelId === person.id && outcome.passed).length) / 8));
  const performanceRating = clamp01(averageReviewScore(context.reviewsByPersonnel.get(person.id) ?? []) / 5);
  const instructorProfile = context.instructorProfiles.find((profile) => profile.personnelId === person.id);
  const profileBoost = instructorProfile ? clamp01((Number(instructorProfile.teachingHistory ?? 0) / 10) + (instructorProfile.specialties?.some((item: string) => (course.category ?? '').toLowerCase().includes(String(item).toLowerCase())) ? 0.2 : 0)) : 0;
  const availability = person.status && ['ACTIVE', 'AVAILABLE'].includes(statusCode(person.status)) ? clamp01(1 - (activeAssignmentCount(context.assignmentsByPersonnel, person.id) / 6)) : 0.2;
  const stationFamiliarity = need.stationId && person.stationId === need.stationId ? 1 : need.stationId && context.personnel.find((item) => item.stationId === need.stationId && item.battalionId === person.battalionId) ? 0.7 : 0.4;
  const lowWorkloadRisk = clamp01(1 - (activeAssignmentCount(context.assignmentsByPersonnel, person.id) / 6));

  const score =
    certificationMatch * 25 +
    subjectExperience * 20 +
    instructorHistory * 15 +
    performanceRating * 15 +
    availability * 10 +
    stationFamiliarity * 5 +
    lowWorkloadRisk * 10 +
    profileBoost * 5;

  return {
    certificationMatch,
    subjectExperience,
    instructorHistory,
    performanceRating,
    availability,
    stationFamiliarity,
    lowWorkloadRisk,
    score: Math.round(score * 10) / 10,
  };
}

function buildTraineeScore(person: any, course: any, need: any, context: Awaited<ReturnType<typeof loadContext>>) {
  const personCerts = context.certsByPersonnel.get(person.id) ?? [];
  const requiredCerts = (course.requiredCertifications ?? []).filter(Boolean);
  const missingRequired = requiredCerts.filter((required: string) => !hasCertification(personCerts, required, context.certificationLookup));
  const expiringSoon = personCerts.filter((personCert) => daysUntil(personCert.expiryDate ?? personCert.expiresAt) <= 60).length;
  const certificationGap = requiredCerts.length ? missingRequired.length / requiredCerts.length : expiringSoon > 0 ? 0.6 : 0.2;
  const expiryUrgency = clamp01(Math.max(0, 90 - Math.min(...personCerts.map((cert) => daysUntil(cert.expiryDate ?? cert.expiresAt)).filter(Number.isFinite), 90)) / 90);
  const roleRequirement = clamp01((course.requiredForRoles ?? []).some((role: string) => String(role).toLowerCase() === String(person.role ?? person.rank ?? '').toLowerCase()) ? 1 : 0.25);
  const stationNeed = clamp01(need.stationId ? (person.stationId === need.stationId ? 1 : 0.35) : 0.5);
  const performanceNotes = (context.reviewsByPersonnel.get(person.id) ?? []).map((review) => String(review.notes ?? '').toLowerCase()).join(' ');
  const performanceNeed = clamp01(averageReviewScore(context.reviewsByPersonnel.get(person.id) ?? []) < 3.5 || performanceNotes.includes('correction') || performanceNotes.includes('needs') ? 1 : 0.35);
  const incidentExposure = clamp01((context.incidentCountsByPersonnel.get(person.id) ?? 0) / 10);
  const readinessImpact = clamp01((Number(person.readinessScore ?? person.readiness ?? 0) / 100));
  const certificationGapScore = clamp01(certificationGap);
  const expiryUrgencyScore = clamp01(expiryUrgency);

  const score =
    certificationGapScore * 25 +
    expiryUrgencyScore * 20 +
    roleRequirement * 15 +
    stationNeed * 15 +
    performanceNeed * 10 +
    incidentExposure * 5 +
    readinessImpact * 10;

  return {
    certificationGap: certificationGapScore,
    expiryUrgency: expiryUrgencyScore,
    roleRequirement,
    stationNeed,
    performanceNeed,
    incidentExposure,
    readinessImpact,
    score: Math.round(score * 10) / 10,
  };
}

function deriveNeedCourse(need: any, courses: any[]) {
  return courses.find((course) => course.id === need.requiredCourseId)
    ?? courses.find((course) => (need.title ?? '').toLowerCase().includes(String(course.title ?? '').split(' ')[0].toLowerCase()))
    ?? courses.find((course) => course.category === 'EMS');
}

export async function listTrainingNeeds(tenantId: string, page = 1, take = 50, status?: string, stationId?: string) {
  const where: any = { tenantId };
  if (status) where.status = status;
  if (stationId) where.stationId = stationId;
  const [items, total] = await Promise.all([
    prisma.trainingNeedAssessment.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ priority: 'asc' }, { severity: 'desc' }, { updatedAt: 'desc' }] }),
    prisma.trainingNeedAssessment.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function generateTrainingNeeds(tenantId: string, userId?: string) {
  const context = await loadContext(tenantId);
  const needs = [] as any[];
  const expiringCertGroups = new Map<string, { cert: any; personnel: any[] }>();

  for (const person of context.personnel) {
    const personCerts = context.certsByPersonnel.get(person.id) ?? [];
    for (const personCert of personCerts) {
      const days = daysUntil(personCert.expiryDate ?? personCert.expiresAt);
      if (days <= 90) {
        const cert = context.certificationLookup.get(String(personCert.certificationId).toLowerCase());
        if (!cert) continue;
        const group = expiringCertGroups.get(cert.id) ?? { cert, personnel: [] };
        group.personnel.push(person);
        expiringCertGroups.set(cert.id, group);
      }
    }
  }

  for (const { cert, personnel } of expiringCertGroups.values()) {
    needs.push({
      title: `${cert.name} renewal window`,
      needType: 'Certification',
      sourceType: 'Certification',
      sourceEntityId: cert.id,
      stationId: null,
      requiredCertificationId: cert.id,
      severity: personnel.length >= 6 ? 'Critical' : 'High',
      priority: personnel.length >= 6 ? '1' : '2',
      description: `${personnel.length} personnel are within the renewal window for ${cert.name}.`,
      evidenceSummary: `Renewal horizon shows the next ${personnel.length} personnel requiring attention.`,
      recommendedAction: `Schedule ${cert.name} renewal blocks and load the closest trainer-capable officers.`,
      readinessImpact: Math.min(10, 4 + personnel.length),
      affectedPersonnel: personnel.slice(0, 15).map((person) => person.id),
    });
  }

  const qaNeedCount = context.incidents.filter((incident) => ['QA Needed', 'Rejected'].includes(String(incident.qaStatus))).length;
  if (qaNeedCount > 0) {
    const targetStation = context.stations.find((station) => station.name === 'Station 4') ?? context.stations[0];
    needs.push({
      title: 'EMS Documentation QA Refresher',
      needType: 'QA',
      sourceType: 'Incident QA',
      sourceEntityId: context.incidents.find((incident) => ['QA Needed', 'Rejected'].includes(String(incident.qaStatus)))?.id ?? null,
      stationId: targetStation?.id ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-ems-doc')?.id ?? null,
      severity: 'Critical',
      priority: '1',
      description: 'Repeated QA corrections and incomplete narratives are reducing export readiness.',
      evidenceSummary: `${qaNeedCount} incident records need QA correction or export cleanup.`,
      recommendedAction: 'Assign officers and paramedics to documentation refresher sessions.',
      readinessImpact: 8,
      affectedPersonnel: context.personnel.filter((person) => person.rank === 'Lieutenant' || person.rank === 'Captain').slice(0, 10).map((person) => person.id),
    });
  }

  const platoonCoverage = new Map<string, number>();
  for (const person of context.personnel) {
    const key = `${person.stationId ?? 'agency'}:${String(person.platoon ?? 'U')}`;
    platoonCoverage.set(key, (platoonCoverage.get(key) ?? 0) + 1);
  }
  const platoonGapEntry = Array.from(platoonCoverage.entries()).find(([, count]) => count < 3);
  if (platoonGapEntry) {
    const [key] = platoonGapEntry;
    const [stationId] = key.split(':');
    const station = context.stations.find((item) => item.id === stationId);
    needs.push({
      title: `Shift / Platoon Coverage Gap - ${station?.name ?? 'District'}`,
      needType: 'Coverage',
      sourceType: 'Staffing',
      sourceEntityId: station?.id ?? null,
      stationId: station?.id ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-officer')?.id ?? null,
      severity: 'High',
      priority: '2',
      description: 'A platoon / station combination is thin on qualified coverage.',
      evidenceSummary: `Coverage matrix shows a low platoon count for ${station?.name ?? 'agency'} on ${key.split(':')[1]} shift.`,
      recommendedAction: 'Offer staggered training windows so staffing minimums remain intact.',
      readinessImpact: 6,
      affectedPersonnel: context.personnel.filter((person) => person.stationId === station?.id).slice(0, 10).map((person) => person.id),
    });
  }

  const incidentTrendTypes = Array.from((context.incidents.reduce((map, incident) => {
    const key = String(incident.incidentType ?? incident.type ?? 'Unknown').split(' - ')[0];
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map<string, number>()) as Map<string, number>).entries()).sort((left, right) => right[1] - left[1]);
  for (const [incidentType, count] of incidentTrendTypes.slice(0, 2)) {
    if (count < 2) continue;
    const lowerType = incidentType.toLowerCase();
    const course = context.courses.find((item) => (item.relatedIncidentTypes ?? []).some((related: string) => lowerType.includes(String(related).toLowerCase())));
    if (!course) continue;
    needs.push({
      title: `${incidentType} Trend Refresher`,
      needType: 'Trend',
      sourceType: 'Incident Trends',
      sourceEntityId: context.incidents.find((incident) => String(incident.incidentType ?? incident.type ?? '').startsWith(incidentType))?.id ?? null,
      stationId: context.incidents.find((incident) => String(incident.incidentType ?? incident.type ?? '').startsWith(incidentType))?.stationId ?? null,
      requiredCourseId: course.id,
      severity: count >= 4 ? 'High' : 'Moderate',
      priority: count >= 4 ? '2' : '3',
      description: `The agency is seeing repeated ${incidentType} activity.`,
      evidenceSummary: `${count} incidents share this operational pattern and may benefit from structured refreshers.`,
      recommendedAction: `Run a focused ${course.title} session for affected companies.`,
      readinessImpact: Math.min(8, 3 + count),
      affectedPersonnel: context.personnel.filter((person) => person.rank === 'Firefighter' || person.rank === 'Engineer').slice(0, 12).map((person) => person.id),
    });
  }

  const lowCoverageStations = context.stations.filter((station) => station.readinessScore < 82 || statusCode(station.staffingStatus) !== 'COVERED');
  for (const station of lowCoverageStations.slice(0, 3)) {
    needs.push({
      title: `Driver Operator Refresher - ${station.name}`,
      needType: 'Coverage',
      sourceType: 'Staffing',
      sourceEntityId: station.id,
      stationId: station.id,
      requiredCourseId: context.courses.find((course) => course.id === 'course-driver')?.id ?? null,
      severity: 'High',
      priority: '1',
      description: `${station.name} has reduced coverage for qualified apparatus operators.`,
      evidenceSummary: `Station readiness is ${station.readinessScore} with uncovered shift risk.`,
      recommendedAction: 'Train and backfill driver/operators before the next rotation change.',
      readinessImpact: 7,
      affectedPersonnel: context.personnel.filter((person) => person.stationId === station.id && person.rank === 'Engineer').slice(0, 8).map((person) => person.id),
    });
  }

  const hazmatExpiring = context.personnelCertifications.filter((certification) => {
    const cert = context.certificationLookup.get(String(certification.certificationId).toLowerCase());
    return cert?.name === 'HazMat Operations' && daysUntil(certification.expiryDate ?? certification.expiresAt) <= 45;
  });
  if (hazmatExpiring.length) {
    needs.push({
      title: 'HazMat Operations Renewal',
      needType: 'Certification',
      sourceType: 'Certification',
      sourceEntityId: 'cert-hazmat',
      stationId: null,
      requiredCertificationId: 'cert-hazmat',
      severity: 'High',
      priority: '1',
      description: 'HazMat qualifications are approaching expiration.',
      evidenceSummary: `${hazmatExpiring.length} personnel are inside the HazMat renewal window.`,
      recommendedAction: 'Schedule renewal and deploy a practical refresher for cross-shift coverage.',
      readinessImpact: 6,
      affectedPersonnel: hazmatExpiring.slice(0, 15).map((item) => item.personnelId),
    });
  }

  const wuiProperties = context.properties.filter((property) => String(property.occupancyType ?? '').toLowerCase().includes('high-risk') || String(property.riskLevel ?? '').toLowerCase() === 'high' || String(property.riskLevel ?? '').toLowerCase() === 'extreme');
  if (wuiProperties.length) {
    const targetStation = context.stations.find((station) => String(station.responseArea ?? '').includes('Sector 17')) ?? context.stations.find((station) => station.name === 'Station 17') ?? context.stations[16];
    needs.push({
      title: 'Wildland Interface Readiness',
      needType: 'Risk',
      sourceType: 'Prevention',
      sourceEntityId: wuiProperties[0]?.id ?? null,
      stationId: targetStation?.id ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-wui')?.id ?? null,
      severity: 'High',
      priority: '2',
      description: 'Wildland interface areas and high-risk occupancies require a seasonal refresher.',
      evidenceSummary: `${wuiProperties.length} high-risk properties and WUI response areas are active.`,
      recommendedAction: 'Run WUI refreshers before peak wind and fire weather season.',
      readinessImpact: 9,
      affectedPersonnel: context.personnel.filter((person) => person.stationId === targetStation?.id || person.platoon === 'A').slice(0, 15).map((person) => person.id),
    });
  }

  const nerisRejected = context.incidents.filter((incident) => String(incident.nerisStatus) === 'Rejected' || String(incident.epcrStatus) === 'Failed');
  if (nerisRejected.length) {
    needs.push({
      title: 'NERIS / RMS Report Completion',
      needType: 'Compliance',
      sourceType: 'Incident QA',
      sourceEntityId: nerisRejected[0]?.id ?? null,
      stationId: nerisRejected[0]?.stationId ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-neris')?.id ?? null,
      severity: 'Critical',
      priority: '1',
      description: 'Report packets are not reaching validation cleanly.',
      evidenceSummary: `${nerisRejected.length} reports are rejected or failed for export readiness.`,
      recommendedAction: 'Require report completion training and QA review for the affected crews.',
      readinessImpact: 8,
      affectedPersonnel: context.incidents.filter((incident) => String(incident.nerisStatus) === 'Rejected' || String(incident.epcrStatus) === 'Failed').slice(0, 10).map((incident) => incident.assignedTo).filter(Boolean).slice(0, 10),
    });
  }

  const lowReviews = Array.from(context.reviewsByPersonnel.entries())
    .filter(([, reviews]) => averageReviewScore(reviews) <= 3.5)
    .slice(0, 5);
  if (lowReviews.length) {
    needs.push({
      title: 'Officer I Leadership',
      needType: 'Role',
      sourceType: 'Performance',
      sourceEntityId: lowReviews[0]?.[0] ?? null,
      stationId: context.personnel.find((person) => person.id === lowReviews[0]?.[0])?.stationId ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-officer')?.id ?? null,
      severity: 'High',
      priority: '2',
      description: 'Leadership and documentation closeout need improvement on several crews.',
      evidenceSummary: `${lowReviews.length} personnel have low review ratings or coaching notes.`,
      recommendedAction: 'Enroll lieutenants and captains in officer leadership development.',
      readinessImpact: 5,
      affectedPersonnel: lowReviews.map(([personnelId]) => personnelId),
    });
  }

  const inspectionBacklog = context.inspections.filter((inspection) => ['OVERDUE', 'IN_REVIEW', 'SCHEDULED'].includes(statusCode(inspection.status)));
  if (inspectionBacklog.length) {
    needs.push({
      title: 'Commercial Occupancy Inspection Safety',
      needType: 'Prevention',
      sourceType: 'Prevention',
      sourceEntityId: inspectionBacklog[0]?.propertyId ?? null,
      stationId: inspectionBacklog[0]?.stationId ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-prevention')?.id ?? null,
      severity: 'Moderate',
      priority: '3',
      description: 'Inspection backlog and safety workflow risk require prevention refresher support.',
      evidenceSummary: `${inspectionBacklog.length} inspections are overdue or still in review.`,
      recommendedAction: 'Assign prevention refresher and pair it with backlog cleanup.',
      readinessImpact: 4,
      affectedPersonnel: context.personnel.filter((person) => person.role === 'Prevention Officer').map((person) => person.id),
    });
  }

  const cprExpiring = context.personnelCertifications.filter((certification) => {
    const cert = context.certificationLookup.get(String(certification.certificationId).toLowerCase());
    return cert?.name === 'CPR/BLS' && daysUntil(certification.expiryDate ?? certification.expiresAt) <= 30;
  });
  if (cprExpiring.length) {
    needs.push({
      title: 'CPR/BLS Renewal',
      needType: 'Certification',
      sourceType: 'Certification',
      sourceEntityId: 'cert-cprbls',
      stationId: null,
      requiredCertificationId: 'cert-cprbls',
      severity: 'Critical',
      priority: '1',
      description: 'Foundational EMS credential renewals are approaching quickly.',
      evidenceSummary: `${cprExpiring.length} personnel are inside the 30-day renewal horizon.`,
      recommendedAction: 'Auto-enroll all affected personnel into the next renewal block.',
      readinessImpact: 7,
      affectedPersonnel: cprExpiring.slice(0, 15).map((item) => item.personnelId),
    });
  }

  const aclsExpiring = context.personnelCertifications.filter((certification) => {
    const cert = context.certificationLookup.get(String(certification.certificationId).toLowerCase());
    return cert?.name === 'ACLS' && daysUntil(certification.expiryDate ?? certification.expiresAt) <= 60;
  });
  if (aclsExpiring.length) {
    needs.push({
      title: 'ACLS Renewal',
      needType: 'Certification',
      sourceType: 'Certification',
      sourceEntityId: 'cert-acls',
      stationId: null,
      requiredCertificationId: 'cert-acls',
      severity: 'High',
      priority: '2',
      description: 'Advanced EMS coverage needs proactive ACLS renewal scheduling.',
      evidenceSummary: `${aclsExpiring.length} personnel are within the ACLS renewal window.`,
      recommendedAction: 'Coordinate ACLS renewal around peak staffing windows.',
      readinessImpact: 6,
      affectedPersonnel: aclsExpiring.slice(0, 15).map((item) => item.personnelId),
    });
  }

  const apparatusRisk = context.apparatus.filter((item) => ['MAINTENANCE', 'WARNING', 'OUT_OF_SERVICE', 'DEGRADED'].includes(statusCode(item.status)));
  if (apparatusRisk.length) {
    needs.push({
      title: 'Apparatus Safety & Maintenance Awareness',
      needType: 'Asset',
      sourceType: 'Assets',
      sourceEntityId: apparatusRisk[0]?.id ?? null,
      stationId: apparatusRisk[0]?.stationId ?? null,
      requiredCourseId: context.courses.find((course) => course.id === 'course-driver')?.id ?? null,
      severity: 'Moderate',
      priority: '3',
      description: 'Maintenance warnings and apparatus care trends indicate a refresher need.',
      evidenceSummary: `${apparatusRisk.length} apparatus records are not in normal operating condition.`,
      recommendedAction: 'Pair apparatus safety awareness with driver refresher sessions.',
      readinessImpact: 4,
      affectedPersonnel: context.personnel.filter((person) => person.rank === 'Engineer').slice(0, 12).map((person) => person.id),
    });
  }

  const orderedNeeds = needs.sort((left, right) => Number(String(left.priority ?? '9')) - Number(String(right.priority ?? '9')));
  const savedNeeds = [];
  for (const need of orderedNeeds) {
    const existing = await prisma.trainingNeedAssessment.findFirst({
      where: {
        tenantId,
        title: need.title,
        sourceEntityId: need.sourceEntityId ?? null,
      },
    });
    const data = {
      tenantId,
      title: need.title,
      needType: need.needType,
      sourceType: need.sourceType,
      sourceEntityId: need.sourceEntityId ?? null,
      stationId: need.stationId ?? null,
      requiredCourseId: need.requiredCourseId ?? null,
      requiredCertificationId: need.requiredCertificationId ?? null,
      severity: need.severity,
      priority: need.priority,
      description: need.description,
      evidenceSummary: need.evidenceSummary,
      recommendedAction: need.recommendedAction,
      status: 'Open',
      readinessImpact: need.readinessImpact,
      affectedPersonnel: need.affectedPersonnel ?? [],
    };
    const record = existing ? await prisma.trainingNeedAssessment.update({ where: { id: existing.id }, data }) : await prisma.trainingNeedAssessment.create({ data: { id: randomUUID(), ...data } });
    savedNeeds.push(record);
  }

  if (userId) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `Generated ${savedNeeds.length} training needs`,
        entityName: 'TrainingNeedAssessment',
        entityId: 'bulk',
      },
    });
    await Promise.all(
      savedNeeds.slice(0, 5).map((need) =>
        prisma.notification.create({
          data: {
            tenantId,
            userId: userId ?? null,
            title: `Training need: ${need.title}`,
            message: `${need.evidenceSummary} Recommended action: ${need.recommendedAction}`,
            notificationType: 'training.need.generated',
            isRead: false,
          },
        })
      )
    );
    await prisma.aiInsight.create({
      data: {
        tenantId,
        category: 'Training readiness',
        title: 'Training needs regenerated',
        summary: `${savedNeeds.length} training needs were generated from certification, staffing, incident, prevention, and performance signals.`,
        severity: savedNeeds.some((need) => String(need.severity).toUpperCase() === 'CRITICAL') ? 'High' : 'Moderate',
        confidenceScore: 88,
        dataSources: ['Training', 'Personnel', 'Stations', 'Incidents', 'Assets', 'Prevention'],
        recommendedActions: ['Review high-priority needs', 'Schedule sessions around staffing coverage', 'Assign trainers'],
        status: 'Open',
      },
    });
  }

  return { items: savedNeeds, generatedCount: savedNeeds.length };
}

export async function getTrainingNeed(tenantId: string, needId: string) {
  return prisma.trainingNeedAssessment.findFirst({ where: { tenantId, id: needId } });
}

export async function dismissTrainingNeed(tenantId: string, needId: string, userId?: string) {
  const need = await prisma.trainingNeedAssessment.update({ where: { id: needId }, data: { status: 'Dismissed' } });
  if (userId) {
    await prisma.auditLog.create({ data: { tenantId, userId, action: `Dismissed training need ${need.title}`, entityName: 'TrainingNeedAssessment', entityId: needId } });
  }
  return need;
}

export async function resolveTrainingNeed(tenantId: string, needId: string, userId?: string) {
  const need = await prisma.trainingNeedAssessment.update({ where: { id: needId }, data: { status: 'Resolved' } });
  if (userId) {
    await prisma.auditLog.create({ data: { tenantId, userId, action: `Resolved training need ${need.title}`, entityName: 'TrainingNeedAssessment', entityId: needId } });
  }
  return need;
}

export async function listCourses(tenantId: string, page = 1, take = 50, filters: { category?: string; deliveryType?: string; certification?: string } = {}) {
  const where: any = { tenantId };
  if (filters.category) where.category = filters.category;
  if (filters.deliveryType) where.deliveryType = filters.deliveryType;
  const [items, total] = await Promise.all([
    prisma.course.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { title: 'asc' } }),
    prisma.course.count({ where }),
  ]);
  const filtered = filters.certification ? items.filter((course: any) => (course.requiredCertifications ?? []).some((required: string) => required.toLowerCase().includes(filters.certification!.toLowerCase()))) : items;
  return { items: filtered, page, take, total: filters.certification ? filtered.length : total };
}

export async function getCourse(tenantId: string, courseId: string) {
  return prisma.course.findFirst({ where: { tenantId, id: courseId } });
}

export async function createCourse(tenantId: string, payload: any, userId?: string) {
  const course = await prisma.course.create({ data: { tenantId, ...payload } });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Created course ${course.title}`, entityName: 'Course', entityId: course.id } });
  return course;
}

export async function updateCourse(tenantId: string, courseId: string, payload: any, userId?: string) {
  const course = await prisma.course.update({ where: { id: courseId }, data: payload });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Updated course ${course.title}`, entityName: 'Course', entityId: course.id } });
  return course;
}

export async function listSessions(tenantId: string, page = 1, take = 50, filters: { courseId?: string; stationId?: string; status?: string } = {}) {
  const where: any = { tenantId };
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.status) where.status = filters.status;
  const [items, total] = await Promise.all([
    prisma.courseSession.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { startDateTime: 'asc' } }),
    prisma.courseSession.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getSession(tenantId: string, sessionId: string) {
  return prisma.courseSession.findFirst({ where: { tenantId, id: sessionId } });
}

export async function createSession(tenantId: string, payload: any, userId?: string) {
  const session = await prisma.courseSession.create({ data: { tenantId, ...payload } });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Scheduled session ${session.id}`, entityName: 'CourseSession', entityId: session.id } });
  return session;
}

export async function updateSession(tenantId: string, sessionId: string, payload: any, userId?: string) {
  const session = await prisma.courseSession.update({ where: { id: sessionId }, data: payload });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Updated session ${session.id}`, entityName: 'CourseSession', entityId: session.id } });
  return session;
}

export async function listAssignments(tenantId: string, page = 1, take = 50, filters: { personnelId?: string; courseId?: string; status?: string } = {}) {
  const where: any = { tenantId };
  if (filters.personnelId) where.personnelId = filters.personnelId;
  if (filters.courseId) where.courseId = filters.courseId;
  if (filters.status) where.status = filters.status;
  const [items, total] = await Promise.all([
    prisma.trainingAssignment.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
    prisma.trainingAssignment.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function createAssignment(tenantId: string, payload: any, userId?: string) {
  const assignment = await prisma.trainingAssignment.create({ data: { tenantId, ...payload } });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Assigned ${assignment.courseId} to ${assignment.personnelId}`, entityName: 'TrainingAssignment', entityId: assignment.id } });
  return assignment;
}

export async function bulkCreateAssignments(tenantId: string, payload: any, userId?: string) {
  const rows = Array.isArray(payload.assignments) ? payload.assignments : [];
  const created = [];
  for (const assignment of rows) {
    created.push(await prisma.trainingAssignment.create({ data: { tenantId, ...assignment } }));
  }
  if (userId && created.length) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `Created ${created.length} training assignments`,
        entityName: 'TrainingAssignment',
        entityId: 'bulk',
      },
    });
  }
  return created;
}

export async function listAttendance(tenantId: string, sessionId: string) {
  return prisma.trainingAttendance.findMany({ where: { tenantId, sessionId }, orderBy: { createdAt: 'desc' } });
}

export async function recordAttendance(tenantId: string, sessionId: string, payload: any, userId?: string) {
  const existing = await prisma.trainingAttendance.findFirst({ where: { tenantId, sessionId, personnelId: payload.personnelId } });
  const attendance = existing
    ? await prisma.trainingAttendance.update({ where: { id: existing.id }, data: { ...payload, sessionId } })
    : await prisma.trainingAttendance.create({ data: { tenantId, sessionId, ...payload } });
  if (userId) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: `Recorded attendance for ${payload.personnelId} in session ${sessionId}`,
        entityName: 'TrainingAttendance',
        entityId: attendance.id,
      },
    });
  }

  const assignment = await prisma.trainingAssignment.findFirst({ where: { tenantId, sessionId, personnelId: payload.personnelId } });
  if (assignment && ['COMPLETED', 'ATTENDED', 'PASSED'].includes(statusCode(payload.attendanceStatus))) {
    await prisma.trainingAssignment.update({ where: { id: assignment.id }, data: { status: 'Completed', completedAt: payload.checkOutTime ?? new Date().toISOString(), score: payload.participationScore ?? assignment.score } });
    await prisma.trainingOutcome.create({
      data: {
        tenantId,
        assignmentId: assignment.id,
        personnelId: payload.personnelId,
        courseId: assignment.courseId,
        preAssessmentScore: payload.preAssessmentScore ?? null,
        postAssessmentScore: payload.participationScore ?? null,
        passed: true,
        improvementScore: Number(payload.participationScore ?? 0) - Number(payload.preAssessmentScore ?? 0),
        instructorFeedback: payload.instructorNotes ?? null,
        readinessImpact: 5,
      },
    });
  }

  return attendance;
}

export async function listCertifications(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.certification.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { name: 'asc' } }),
    prisma.certification.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getCertificationCompliance(tenantId: string) {
  const [certifications, personnelCertifications, personnel, stations] = await Promise.all([
    prisma.certification.findMany({ where: { tenantId } }),
    prisma.personnelCertification.findMany({ where: { tenantId } }),
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.station.findMany({ where: { tenantId } }),
  ]);

  const byCertification = certifications.map((certification: any) => {
    const relevant = personnelCertifications.filter((entry: any) => String(entry.certificationId) === String(certification.id));
    const active = relevant.filter((entry: any) => !entry.expiryDate || daysUntil(entry.expiryDate) > 0);
    const expiring = relevant.filter((entry: any) => daysUntil(entry.expiryDate) <= 90 && daysUntil(entry.expiryDate) > 0).length;
    const expired = relevant.filter((entry: any) => daysUntil(entry.expiryDate) <= 0).length;
    return {
      certification,
      total: relevant.length,
      active: active.length,
      expiring,
      expired,
      complianceRate: relevant.length ? Math.round((active.length / relevant.length) * 100) : 100,
    };
  });

  const byStation = stations.map((station: any) => {
    const stationPersonnel = personnel.filter((entry: any) => entry.stationId === station.id);
    const criticalCerts = personnelCertifications.filter((entry: any) => stationPersonnel.some((person: any) => person.id === entry.personnelId) && daysUntil(entry.expiryDate) <= 60);
    return {
      station,
      personnelCount: stationPersonnel.length,
      expiringCertifications: criticalCerts.length,
      readinessScore: station.readinessScore,
      staffingStatus: station.staffingStatus,
    };
  });

  return { byCertification, byStation };
}

export async function getExpiringCertifications(tenantId: string) {
  return prisma.personnelCertification.findMany({
    where: {
      tenantId,
      expiryDate: { lte: new Date(Date.now() + 90 * 86400000).toISOString() },
    },
    orderBy: { expiryDate: 'asc' },
  });
}

export async function createRenewal(tenantId: string, payload: any, userId?: string) {
  const certification = await prisma.personnelCertification.create({
    data: {
      tenantId,
      personnelId: payload.personnelId,
      certificationId: payload.certificationId,
      issueDate: payload.issueDate ?? new Date().toISOString(),
      expiryDate: payload.expiryDate,
      status: payload.status ?? 'Valid',
      documentUrl: payload.documentUrl ?? null,
      verifiedBy: userId ?? payload.verifiedBy ?? null,
      verifiedAt: new Date().toISOString(),
    },
  });
  await prisma.certificationRenewal.create({
    data: {
      tenantId,
      personnelId: payload.personnelId,
      certificationId: payload.certificationId,
      renewalDate: payload.issueDate ?? new Date().toISOString(),
      newExpiryDate: payload.expiryDate ?? null,
      status: payload.status ?? 'Completed',
      completedBy: userId ?? payload.verifiedBy ?? null,
      notes: payload.notes ?? null,
    },
  });
  if (userId) await prisma.auditLog.create({ data: { tenantId, userId, action: `Renewed certification ${payload.certificationId} for ${payload.personnelId}`, entityName: 'PersonnelCertification', entityId: certification.id } });
  return certification;
}

export async function getTrainingCommandCenter(tenantId: string) {
  const [stats, needs, sessions, assignments, compliance, readiness, courseRecommendations, trainerRecommendations, traineeRecommendations, expiringCertifications, personnel, stations, aiInsights, notifications] = await Promise.all([
    getReadinessImpact(tenantId),
    prisma.trainingNeedAssessment.findMany({ where: { tenantId }, orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }], take: 20 }),
    prisma.courseSession.findMany({ where: { tenantId }, orderBy: { startDateTime: 'asc' }, take: 20 }),
    prisma.trainingAssignment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    getCertificationCompliance(tenantId),
    getReadinessImpact(tenantId),
    getCourseRecommendations(tenantId),
    getTrainerRecommendations(tenantId),
    getTraineeRecommendations(tenantId),
    getExpiringCertifications(tenantId),
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.station.findMany({ where: { tenantId } }),
    prisma.aiInsight.findMany({ where: { tenantId, status: 'Open' } }),
    prisma.notification.findMany({ where: { tenantId, isRead: false } }),
  ]);

  const complianceRate = compliance.byCertification.length
    ? Math.round(compliance.byCertification.reduce((total: number, item: any) => total + Number(item.complianceRate ?? 0), 0) / compliance.byCertification.length)
    : 0;
  const expiredCertifications = expiringCertifications.filter((item: any) => daysUntil(item.expiryDate ?? item.expiresAt) <= 0).length;
  const overdueAssignments = assignments.filter((assignment: any) => !['Completed', 'Waived'].includes(statusCode(assignment.status))).length;
  const upcomingSessions = sessions.filter((session: any) => daysUntil(session.startDateTime) >= 0).length;
  const stationTrainingRisk = stations.filter((station: any) => Number(station.readinessScore ?? 0) < 85).length;
  const recommendedCourses = courseRecommendations.slice(0, 5);
  const recommendedTrainers = trainerRecommendations.slice(0, 3);
  const recommendedTrainees = traineeRecommendations.slice(0, 3);

  return {
    agencyReadiness: readiness.agencyReadiness,
    trainingComplianceScore: complianceRate,
    expiringCertifications: expiringCertifications.length,
    expiredCertifications,
    highPriorityNeeds: needs.filter((need: any) => Number(String(need.priority ?? '9')) <= 2).slice(0, 5),
    upcomingSessions,
    overdueAssignments,
    stationTrainingRisk,
    recommendedCourses,
    recommendedTrainers,
    recommendedTrainees,
    readinessImprovementForecast: readiness.projectedReadinessLift,
    notifications,
    aiInsights,
    personnelCount: personnel.length,
  };
}

export async function getTrainerRecommendations(tenantId: string, needId?: string, courseId?: string) {
  const context = await loadContext(tenantId);
  const needs = needId ? context.needs.filter((need) => need.id === needId) : context.needs;
  const results = [];
  for (const need of needs) {
    const course = context.courses.find((item) => item.id === (courseId ?? need.requiredCourseId)) ?? deriveNeedCourse(need, context.courses);
    if (!course) continue;
    const ranked = context.personnel
      .map((person) => {
        const metrics = buildTrainerScore(person, course, need, context);
        return {
          personnelId: person.id,
          personnel: person,
          trainingNeedAssessmentId: need.id,
          courseId: course.id,
          suitabilityScore: metrics.score,
          reasonSummary: `${person.rank} ${person.name} brings matching experience, certification alignment, and workload balance.`,
          availabilityScore: Math.round(metrics.availability * 100),
          expertiseScore: Math.round(((metrics.certificationMatch + metrics.subjectExperience) / 2) * 100),
          performanceScore: Math.round(((metrics.instructorHistory + metrics.performanceRating) / 2) * 100),
          workloadScore: Math.round(metrics.lowWorkloadRisk * 100),
          metrics,
        };
      })
      .sort((left, right) => right.suitabilityScore - left.suitabilityScore)
      .slice(0, 3);
    results.push({ need, course, topTrainer: ranked[0] ?? null, alternates: ranked.slice(1), recommendations: ranked });
  }
  return results;
}

export async function getTraineeRecommendations(tenantId: string, needId?: string, courseId?: string) {
  const context = await loadContext(tenantId);
  const needs = needId ? context.needs.filter((need) => need.id === needId) : context.needs;
  const results = [];
  for (const need of needs) {
    const course = context.courses.find((item) => item.id === (courseId ?? need.requiredCourseId)) ?? deriveNeedCourse(need, context.courses);
    if (!course) continue;
    const ranked = context.personnel
      .map((person) => {
        const metrics = buildTraineeScore(person, course, need, context);
        return {
          personnelId: person.id,
          personnel: person,
          trainingNeedAssessmentId: need.id,
          courseId: course.id,
          suitabilityScore: metrics.score,
          gapReason: metrics.certificationGap > 0.5 ? 'Missing or expiring required certification' : 'Role or station gap with readiness impact',
          urgencyScore: Math.round((metrics.expiryUrgency * 100) || 0),
          readinessImpactScore: Math.round(metrics.readinessImpact * 10),
          stationCoverageImpact: need.stationId && person.stationId === need.stationId ? 'Low - can attend in a staggered session' : 'Moderate - schedule around minimum staffing windows',
          metrics,
        };
      })
      .filter((entry) => entry.suitabilityScore >= 35)
      .sort((left, right) => right.suitabilityScore - left.suitabilityScore)
      .slice(0, 15);
    results.push({ need, course, recommendedTrainees: ranked, priorityOrder: ranked.slice(0, 10) });
  }
  return results;
}

export async function getCourseRecommendations(tenantId: string) {
  const context = await loadContext(tenantId);
  const recommendations = [];
  for (const need of context.needs) {
    const course = deriveNeedCourse(need, context.courses);
    if (!course) {
      recommendations.push({
        need,
        recommendedCourse: null,
        newCourseSuggestion: {
          title: need.title,
          objectives: [
            `Address ${need.needType.toLowerCase()} readiness gaps`,
            `Reduce ${need.sourceType.toLowerCase()} risk`,
            'Improve operational readiness and compliance',
          ],
          suggestedDurationHours: 2,
          targetRoles: need.stationId ? ['Company Officer', 'Firefighter'] : ['Company Officer', 'Battalion Chief'],
          trainerQualifications: ['Subject matter expert', 'Current certification match'],
        },
      });
      continue;
    }
    recommendations.push({
      need,
      recommendedCourse: course,
      whyThisCourse: need.evidenceSummary,
      targetAudience: course.requiredForRoles ?? [],
      requiredTrainerQualifications: course.requiredCertifications ?? [],
      urgency: need.priority,
      operationalImpact: need.readinessImpact ?? 0,
      estimatedReadinessImprovement: need.readinessImpact ?? 0,
    });
  }
  return recommendations;
}

export async function getReadinessImpact(tenantId: string) {
  const context = await loadContext(tenantId);
  const agencyReadiness = context.stations.length ? Math.round(context.stations.reduce((sum, station) => sum + Number(station.readinessScore ?? 0), 0) / context.stations.length) : 0;
  const openNeeds = context.needs.filter((need) => statusCode(need.status) === 'OPEN');
  const projectedImpact = openNeeds.reduce((sum, need) => sum + Number(need.readinessImpact ?? 0), 0);
  const riskStations = context.stations
    .filter((station) => station.readinessScore < 85)
    .map((station) => ({
      station,
      readinessScore: station.readinessScore,
      trainingRisk: openNeeds.filter((need) => need.stationId === station.id).length,
    }));
  return {
    agencyReadiness,
    openNeedCount: openNeeds.length,
    projectedReadinessLift: Math.round(projectedImpact / Math.max(openNeeds.length, 1)),
    riskStations,
    trainingCoverageRate: Math.round(((context.assignments.filter((assignment) => statusCode(assignment.status) === 'COMPLETED').length / Math.max(context.assignments.length, 1)) * 100)),
  };
}

export async function getPersonnelTrainingProfile(tenantId: string, personnelId: string) {
  const [personnel, assignments, certifications, reviews, outcomes, attendance] = await Promise.all([
    prisma.personnel.findFirst({ where: { tenantId, id: personnelId } }),
    prisma.trainingAssignment.findMany({ where: { tenantId, personnelId } }),
    prisma.personnelCertification.findMany({ where: { tenantId, personnelId } }),
    prisma.personnelPerformanceReview.findMany({ where: { tenantId, personnelId } }),
    prisma.trainingOutcome.findMany({ where: { tenantId, personnelId } }),
    prisma.trainingAttendance.findMany({ where: { tenantId, personnelId } }),
  ]);

  return {
    personnel,
    assignments,
    certifications,
    reviews,
    outcomes,
    attendance,
    readinessImpact: outcomes.reduce((sum: number, outcome: any) => sum + Number(outcome.readinessImpact ?? 0), 0),
    nextRecommendedTraining: assignments.find((assignment: any) => statusCode(assignment.status) !== 'COMPLETED') ?? null,
  };
}

export const trainingNeedAssessmentService = {
  listTrainingNeeds,
  generateTrainingNeeds,
  getTrainingNeed,
  dismissTrainingNeed,
  resolveTrainingNeed,
  getTrainingCommandCenter,
};

export const courseRecommendationService = { getCourseRecommendations };
export const trainerRecommendationService = { getTrainerRecommendations };
export const traineeRecommendationService = { getTraineeRecommendations };
export const certificationComplianceService = { getCertificationCompliance, getExpiringCertifications, createRenewal, listCertifications };
export const trainingAttendanceService = { listAttendance, recordAttendance };
export const trainingReadinessImpactService = { getReadinessImpact };
