import { prisma } from '../utils/prisma.js';

type PersonnelFilters = {
  search?: string;
  stationId?: string;
  rankId?: string;
  shiftPlatoonId?: string;
  readinessStatus?: string;
  employmentStatus?: string;
  certificationStatus?: string;
};

type RatingFields = {
  overallRating?: number | null;
  leadershipRating?: number | null;
  clinicalRating?: number | null;
  operationalRating?: number | null;
  documentationRating?: number | null;
  teamworkRating?: number | null;
  safetyRating?: number | null;
};

const horizonDays = (days: number) => new Date(Date.now() + days * 86400000);
const percent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function toFullName(personnel: any) {
  return personnel.fullName ?? personnel.name ?? `${personnel.firstName ?? ''} ${personnel.lastName ?? ''}`.trim();
}

function toPersonnelView(personnel: any, extras: Record<string, any> = {}) {
  return {
    ...personnel,
    name: toFullName(personnel),
    fullName: toFullName(personnel),
    rank: personnel.rankRef?.name ?? personnel.rank ?? 'Unassigned',
    role: personnel.roleTitle ?? personnel.role ?? 'Member',
    station: personnel.station?.name ?? personnel.station ?? 'Unassigned',
    platoon: personnel.currentShiftPlatoonId ?? personnel.platoon ?? null,
    certStatus: extras.certStatus ?? personnel.certStatus ?? 'Unknown',
    expiringCerts: extras.expiringCerts ?? personnel.expiringCerts ?? 0,
    incidents: extras.incidents ?? personnel.incidents ?? 0,
    attendance: extras.attendance ?? personnel.attendance ?? 0,
    readiness: personnel.readinessScore ?? extras.readiness ?? 0,
  };
}

function buildRiskFlags(input: {
  expiringCertCount: number;
  expiredCertCount: number;
  missingRequiredCertCount: number;
  overdueTrainingCount: number;
  qaIssueCount: number;
  overtimeHours: number;
  lowRatings: number;
}) {
  const flags: string[] = [];
  if (input.expiredCertCount > 0) flags.push(`${input.expiredCertCount} expired certification(s)`);
  if (input.expiringCertCount > 0) flags.push(`${input.expiringCertCount} certification(s) expiring soon`);
  if (input.missingRequiredCertCount > 0) flags.push(`${input.missingRequiredCertCount} missing role-required certification(s)`);
  if (input.overdueTrainingCount > 0) flags.push(`${input.overdueTrainingCount} overdue training assignment(s)`);
  if (input.qaIssueCount > 0) flags.push(`${input.qaIssueCount} incident QA issue(s)`);
  if (input.overtimeHours >= 24) flags.push('High overtime exposure');
  if (input.lowRatings > 0) flags.push('Performance follow-up needed');
  return flags;
}

function calculateReadiness(metrics: {
  trainingScore: number;
  certificationScore: number;
  staffingReliabilityScore: number;
  incidentDocumentationScore: number;
  performanceScore: number;
  overtimeRiskScore: number;
}) {
  const overallReadinessScore = percent(
    metrics.trainingScore * 0.2 +
      metrics.certificationScore * 0.25 +
      metrics.staffingReliabilityScore * 0.15 +
      metrics.incidentDocumentationScore * 0.15 +
      metrics.performanceScore * 0.15 +
      metrics.overtimeRiskScore * 0.1,
  );

  const riskLevel = overallReadinessScore >= 90 ? 'Ready' : overallReadinessScore >= 75 ? 'Watch' : overallReadinessScore >= 60 ? 'At Risk' : 'Critical';
  return { overallReadinessScore, riskLevel };
}

async function auditLog(tenantId: string, userId: string | undefined, action: string, entityId: string, after?: unknown, before?: unknown) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? null,
      action,
      entityName: 'Personnel',
      entityId,
      after: after ?? undefined,
      before: before ?? undefined,
      createdAt: new Date().toISOString(),
    },
  });
}

async function createRiskNotification(tenantId: string, personnelId: string, title: string, message: string) {
  await prisma.notification.create({
    data: {
      tenantId,
      personnelId,
      title,
      message,
      notificationType: 'personnel.readiness',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  });
}

async function getPersonnelForTenant(tenantId: string, personnelId: string) {
  return prisma.personnel.findFirst({
    where: { id: personnelId, tenantId },
    include: {
      station: true,
      rankRef: true,
      certifications: { include: { certification: true } },
      documents: true,
      reviews: true,
      goals: true,
      notes: true,
      readinessSnapshots: true,
    },
  });
}

export async function listPersonnel(tenantId: string, page = 1, take = 50, filters: PersonnelFilters = {}) {
  const search = filters.search?.trim();
  const where: Record<string, any> = { tenantId, isDeleted: false };
  if (filters.stationId) where.currentStationId = filters.stationId;
  if (filters.rankId) where.rankId = filters.rankId;
  if (filters.shiftPlatoonId) where.currentShiftPlatoonId = filters.shiftPlatoonId;
  if (filters.readinessStatus) where.readinessStatus = filters.readinessStatus;
  if (filters.employmentStatus) where.employmentStatus = filters.employmentStatus;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { employeeNumber: { contains: search, mode: 'insensitive' } },
      { role: { contains: search, mode: 'insensitive' } },
      { roleTitle: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.personnel.findMany({
      where,
      take,
      skip: (page - 1) * take,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        station: true,
        rankRef: true,
        certifications: { include: { certification: true } },
        documents: true,
      },
    }),
    prisma.personnel.count({ where }),
  ]);

  const transformed = await Promise.all(items.map(async (personnel) => {
    const expiringCerts = personnel.certifications.filter((certification) => {
      const expiry = certification.expiryDate ?? certification.expiresAt;
      return expiry ? new Date(expiry).getTime() <= Date.now() + 30 * 86400000 : false;
    }).length;
    const certStatus = filters.certificationStatus && filters.certificationStatus !== 'all'
      ? filters.certificationStatus
      : expiringCerts > 0
        ? 'Warning'
        : 'Healthy';
    return toPersonnelView(personnel, { expiringCerts, certStatus });
  }));

  return { items: transformed, page, take, total };
}

export async function getPersonnel360(tenantId: string, personnelId: string) {
  const personnel = await getPersonnelForTenant(tenantId, personnelId);
  if (!personnel) return null;

  const [trainingAssignments, trainingAttendance, incidentLinks, staffingAssignments, assignmentHistory, overtimeRecords, availabilityRecords, performanceReviews, goals, notes, documents, snapshots, aiInsights, notifications, qaIssues] = await Promise.all([
    prisma.trainingAssignment.findMany({ where: { tenantId, personnelId }, include: { course: true, session: true }, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }] }),
    prisma.trainingAttendance.findMany({ where: { tenantId, personnelId }, include: { session: { include: { course: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.incidentPersonnel.findMany({ where: { tenantId, personnelId }, include: { incident: true }, orderBy: { createdAt: 'desc' } }),
    prisma.personnelAssignment.findMany({ where: { tenantId, personnelId }, include: { station: true }, orderBy: { startDate: 'desc' } }),
    prisma.personnelAssignmentHistory.findMany({ where: { tenantId, personnelId }, include: { station: true }, orderBy: { startDate: 'desc' } }),
    prisma.overtimeRecord.findMany({ where: { tenantId, personnelId }, orderBy: { date: 'desc' } }),
    prisma.availabilityRecord.findMany({ where: { tenantId, personnelId }, orderBy: { date: 'desc' } }),
    prisma.personnelPerformanceReview.findMany({ where: { tenantId, personnelId }, orderBy: { createdAt: 'desc' } }),
    prisma.personnelGoal.findMany({ where: { tenantId, personnelId, isDeleted: false }, orderBy: [{ status: 'asc' }, { targetDate: 'asc' }] }),
    prisma.personnelNote.findMany({ where: { tenantId, personnelId }, orderBy: { createdAt: 'desc' } }),
    prisma.personnelDocument.findMany({ where: { tenantId, personnelId, isDeleted: false }, orderBy: { createdAt: 'desc' } }),
    prisma.personnelReadinessSnapshot.findMany({ where: { tenantId, personnelId }, orderBy: { snapshotDate: 'desc' }, take: 6 }),
    prisma.aiInsight.findMany({ where: { tenantId, OR: [{ title: { contains: personnel.fullName ?? personnel.firstName, mode: 'insensitive' } }, { summary: { contains: personnel.lastName, mode: 'insensitive' } }, { dataSources: { contains: 'Personnel', mode: 'insensitive' } }] }, orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.notification.findMany({ where: { tenantId, personnelId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.incidentQaReview.findMany({ where: { tenantId, reviewerName: { contains: personnel.fullName ?? personnel.firstName ?? '', mode: 'insensitive' } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  const stationIncidents = await Promise.all(
    incidentLinks.slice(0, 10).map(async (link) => ({
      link,
      incident: await prisma.incident.findFirst({ where: { tenantId, id: link.incidentId }, include: { station: true } }),
    })),
  );

  const certifications = personnel.certifications.map((certification) => ({
    ...certification,
    issueDate: certification.issueDate ?? certification.issuedAt ?? null,
    expiryDate: certification.expiryDate ?? certification.expiresAt ?? null,
  }));
  const now = Date.now();
  const expiringCertifications = certifications.filter((certification) => {
    const expiry = certification.expiryDate ? new Date(certification.expiryDate).getTime() : null;
    return expiry != null && expiry <= now + 30 * 86400000 && expiry >= now;
  });
  const expiredCertifications = certifications.filter((certification) => {
    const expiry = certification.expiryDate ? new Date(certification.expiryDate).getTime() : null;
    return expiry != null && expiry < now;
  });
  const requiredCerts = (personnel.rankRef?.isOfficerRank || personnel.roleTitle?.includes('Officer') ? ['Officer I', 'CPR/BLS'] : ['Firefighter I', 'CPR/BLS']).filter(Boolean);
  const certNames = certifications.map((certification) => certification.certification?.name ?? certification.certificationId);
  const missingRequiredCertifications = requiredCerts.filter((required) => !certNames.includes(required));

  const trainingScores = {
    trainingScore: percent(100 - trainingAssignments.filter((assignment) => ['Overdue', 'Assigned'].includes(String(assignment.status))).length * 8 + trainingAttendance.filter((attendance) => attendance.attendanceStatus === 'Completed').length * 2),
    certificationScore: percent(100 - expiredCertifications.length * 20 - expiringCertifications.length * 8 - missingRequiredCertifications.length * 12 + certifications.length * 2),
    staffingReliabilityScore: percent(100 - overtimeRecords.reduce((sum, record) => sum + Number(record.hours ?? 0), 0) * 2 - availabilityRecords.filter((record) => record.status !== 'Available').length * 6),
    incidentDocumentationScore: percent(100 - qaIssues.length * 10 + incidentLinks.filter((link) => String(link.roleAtIncident).toLowerCase().includes('officer')).length * 2),
    performanceScore: percent((performanceReviews.reduce((sum, review) => sum + Number(review.overallRating ?? review.rating ?? 0), 0) / Math.max(performanceReviews.length, 1)) * 20 || 70),
    overtimeRiskScore: percent(100 - Math.min(40, overtimeRecords.reduce((sum, record) => sum + Number(record.hours ?? 0), 0) * 2)),
  };
  const readiness = calculateReadiness(trainingScores);
  const riskFlags = buildRiskFlags({
    expiringCertCount: expiringCertifications.length,
    expiredCertCount: expiredCertifications.length,
    missingRequiredCertCount: missingRequiredCertifications.length,
    overdueTrainingCount: trainingAssignments.filter((assignment) => ['Overdue', 'Assigned'].includes(String(assignment.status))).length,
    qaIssueCount: qaIssues.length,
    overtimeHours: overtimeRecords.reduce((sum, record) => sum + Number(record.hours ?? 0), 0),
    lowRatings: performanceReviews.filter((review) => Number(review.overallRating ?? review.rating ?? 0) <= 2).length,
  });

  return {
    personnel: toPersonnelView(personnel, {
      expiringCerts: expiringCertifications.length,
      certStatus: expiredCertifications.length > 0 ? 'Critical' : expiringCertifications.length > 0 ? 'Warning' : 'Healthy',
      incidents: incidentLinks.length,
    }),
    station: personnel.station,
    rank: personnel.rankRef,
    supervisor: personnel.supervisorPersonnelId ? await prisma.personnel.findFirst({ where: { tenantId, id: personnel.supervisorPersonnelId } }) : null,
    certifications: {
      active: certifications.filter((certification) => !expiredCertifications.some((expired) => expired.id === certification.id)),
      expiring: expiringCertifications,
      expired: expiredCertifications,
      missingRequired: missingRequiredCertifications,
    },
    training: {
      assignments: trainingAssignments,
      attendance: trainingAttendance,
      completed: trainingAssignments.filter((assignment) => String(assignment.status) === 'Completed'),
      missed: trainingAttendance.filter((attendance) => ['Missed', 'Failed', 'Needs Remediation'].includes(attendance.attendanceStatus)),
      recommendedNextTraining: trainingAssignments.find((assignment) => ['Assigned', 'Overdue'].includes(String(assignment.status))) ?? null,
    },
    staffing: {
      currentShift: personnel.currentShiftPlatoonId ?? personnel.platoon ?? null,
      recentAssignments: staffingAssignments,
      overtimeHours: overtimeRecords.reduce((sum, record) => sum + Number(record.hours ?? 0), 0),
      leaveRecords: availabilityRecords.filter((record) => String(record.status).toLowerCase() !== 'available'),
      availability: availabilityRecords[0] ?? null,
      staffingReliabilityScore: trainingScores.staffingReliabilityScore,
    },
    incidents: {
      participation: incidentLinks,
      recentIncidents: stationIncidents.map((entry) => entry.incident).filter(Boolean),
      qaIssues,
    },
    performance: {
      reviews: performanceReviews,
      goals,
      notes,
      documents,
      latestReview: performanceReviews[0] ?? null,
    },
    readiness: {
      snapshots,
      ...readiness,
      ...trainingScores,
      evidenceSummary: `Training ${trainingScores.trainingScore}, certification ${trainingScores.certificationScore}, staffing ${trainingScores.staffingReliabilityScore}, documentation ${trainingScores.incidentDocumentationScore}.`,
      riskFlags,
    },
    aiInsights,
    notifications,
    assignmentHistory,
  };
}

export async function getPersonnelTraining(tenantId: string, personnelId: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  return result.training;
}

export async function getPersonnelIncidents(tenantId: string, personnelId: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  return result.incidents;
}

export async function getPersonnelStaffing(tenantId: string, personnelId: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  return result.staffing;
}

export async function getPersonnelPerformance(tenantId: string, personnelId: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  return result.performance;
}

export async function getPersonnelGoals(tenantId: string, personnelId: string) {
  return prisma.personnelGoal.findMany({ where: { tenantId, personnelId, isDeleted: false }, orderBy: [{ status: 'asc' }, { targetDate: 'asc' }] });
}

export async function getPersonnelDocuments(tenantId: string, personnelId: string) {
  return prisma.personnelDocument.findMany({ where: { tenantId, personnelId, isDeleted: false }, orderBy: { createdAt: 'desc' } });
}

export async function getPersonnelReadiness(tenantId: string, personnelId: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  return { personnel: result.personnel, ...result.readiness };
}

export async function getPersonnelRisks(tenantId: string) {
  const personnel = await prisma.personnel.findMany({ where: { tenantId, isDeleted: false }, include: { station: true, rankRef: true, certifications: { include: { certification: true } } }, orderBy: { readinessScore: 'asc' } });
  const risks = await Promise.all(personnel.map(async (entry) => {
    const expiringCerts = entry.certifications.filter((certification) => {
      const expiry = certification.expiryDate ?? certification.expiresAt;
      return expiry ? new Date(expiry).getTime() <= Date.now() + 30 * 86400000 : false;
    }).length;
    const incidents = await prisma.incidentPersonnel.count({ where: { tenantId, personnelId: entry.id } });
    const lowCertScore = Math.max(0, 100 - expiringCerts * 10 - (entry.certifications.length === 0 ? 20 : 0));
    const score = percent((entry.readinessScore ?? 0) * 0.5 + lowCertScore * 0.5 - incidents * 0.2);
    return {
      personnel: toPersonnelView(entry, { expiringCerts }),
      riskScore: score,
      riskLevel: score >= 90 ? 'Ready' : score >= 75 ? 'Watch' : score >= 60 ? 'At Risk' : 'Critical',
      reasons: buildRiskFlags({
        expiringCertCount: expiringCerts,
        expiredCertCount: 0,
        missingRequiredCertCount: 0,
        overdueTrainingCount: 0,
        qaIssueCount: 0,
        overtimeHours: 0,
        lowRatings: entry.readinessScore && entry.readinessScore < 70 ? 1 : 0,
      }),
    };
  }));
  return risks.sort((left, right) => left.riskScore - right.riskScore);
}

export async function getPersonnelReadinessSummary(tenantId: string) {
  const personnel = await prisma.personnel.findMany({ where: { tenantId, isDeleted: false }, select: { id: true, readinessScore: true, readinessStatus: true } });
  const readinessBuckets = personnel.reduce((acc, item) => {
    const score = item.readinessScore ?? 0;
    if (score >= 90) acc.ready += 1;
    else if (score >= 75) acc.watch += 1;
    else if (score >= 60) acc.atRisk += 1;
    else acc.critical += 1;
    return acc;
  }, { ready: 0, watch: 0, atRisk: 0, critical: 0 });
  const expiring = await prisma.personnelCertification.count({ where: { tenantId, OR: [{ expiryDate: { lte: horizonDays(30).toISOString() } }, { expiresAt: { lte: horizonDays(30) } }] } });
  return {
    ...readinessBuckets,
    total: personnel.length,
    expiringCertifications: expiring,
    readinessAverage: personnel.length ? Math.round(personnel.reduce((sum, item) => sum + Number(item.readinessScore ?? 0), 0) / personnel.length) : 0,
  };
}

export async function createPersonnel(tenantId: string, userId: string | undefined, data: Record<string, any>) {
  const payload = {
    tenantId,
    employeeNumber: data.employeeNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullName ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
    rankId: data.rankId ?? null,
    rank: data.rank ?? data.roleTitle ?? 'Firefighter',
    roleTitle: data.roleTitle ?? data.rank ?? 'Firefighter',
    role: data.role ?? data.roleTitle ?? 'Firefighter',
    stationId: data.stationId ?? null,
    currentStationId: data.currentStationId ?? data.stationId ?? null,
    currentShiftPlatoonId: data.currentShiftPlatoonId ?? null,
    battalionId: data.battalionId ?? null,
    email: data.email ?? null,
    phone: data.phone ?? null,
    employmentStatus: data.employmentStatus ?? 'Full Time',
    status: data.status ?? 'Active',
    readinessStatus: data.readinessStatus ?? 'READY',
    readinessScore: Number(data.readinessScore ?? 85),
    yearsOfService: Number(data.yearsOfService ?? 0),
    supervisorPersonnelId: data.supervisorPersonnelId ?? null,
    createdBy: userId ?? null,
    updatedBy: userId ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDeleted: false,
  };
  const created = await prisma.personnel.create({ data: payload });
  await auditLog(tenantId, userId, 'Created personnel', created.id, created);
  if (Number(created.readinessScore ?? 0) < 60) {
    await createRiskNotification(tenantId, created.id, 'Personnel readiness critical', 'A newly created personnel record is below readiness threshold and needs review.');
  }
  return toPersonnelView(created);
}

export async function updatePersonnel(tenantId: string, personnelId: string, userId: string | undefined, data: Record<string, any>) {
  const existing = await prisma.personnel.findFirst({ where: { id: personnelId, tenantId } });
  if (!existing) return null;
  const updated = await prisma.personnel.update({
    where: { id: personnelId },
    data: {
      ...existing,
      ...data,
      fullName: data.fullName ?? `${data.firstName ?? existing.firstName} ${data.lastName ?? existing.lastName}`.trim(),
      updatedBy: userId ?? existing.updatedBy ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
  await auditLog(tenantId, userId, 'Updated personnel', updated.id, updated, existing);
  if (Number(updated.readinessScore ?? 0) < 60) {
    await createRiskNotification(tenantId, updated.id, 'Personnel readiness critical', 'An updated personnel record is below readiness threshold and needs review.');
  }
  return toPersonnelView(updated);
}

export async function createPersonnelPerformanceReview(tenantId: string, personnelId: string, userId: string | undefined, data: RatingFields & Record<string, any>) {
  const review = await prisma.personnelPerformanceReview.create({
    data: {
      tenantId,
      personnelId,
      reviewPeriod: String(data.reviewPeriod ?? 'Current'),
      reviewerPersonnelId: data.reviewerPersonnelId ?? null,
      overallRating: data.overallRating ?? null,
      leadershipRating: data.leadershipRating ?? null,
      clinicalRating: data.clinicalRating ?? null,
      operationalRating: data.operationalRating ?? null,
      documentationRating: data.documentationRating ?? null,
      teamworkRating: data.teamworkRating ?? null,
      safetyRating: data.safetyRating ?? null,
      comments: data.comments ?? null,
      status: data.status ?? 'Draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  const snapshot = await createReadinessSnapshot(tenantId, personnelId, userId);
  if (Number(review.overallRating ?? review.rating ?? 0) <= 2) {
    await createRiskNotification(tenantId, personnelId, 'Performance review needs attention', 'A recent performance review indicates follow-up support is needed.');
  }
  await auditLog(tenantId, userId, 'Created performance review', personnelId, review);
  return { review, snapshot };
}

export async function createPersonnelGoal(tenantId: string, personnelId: string, userId: string | undefined, data: Record<string, any>) {
  const goal = await prisma.personnelGoal.create({
    data: {
      tenantId,
      personnelId,
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      targetDate: data.targetDate ?? null,
      status: data.status ?? 'Open',
      progressPercent: Number(data.progressPercent ?? 0),
      createdBy: userId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    },
  });
  await auditLog(tenantId, userId, 'Created personnel goal', personnelId, goal);
  return goal;
}

export async function updatePersonnelGoal(tenantId: string, personnelId: string, goalId: string, userId: string | undefined, data: Record<string, any>) {
  const existing = await prisma.personnelGoal.findFirst({ where: { id: goalId, tenantId, personnelId } });
  if (!existing) return null;
  const goal = await prisma.personnelGoal.update({
    where: { id: goalId },
    data: {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    },
  });
  await auditLog(tenantId, userId, 'Updated personnel goal', personnelId, goal, existing);
  return goal;
}

export async function createPersonnelDocument(tenantId: string, personnelId: string, userId: string | undefined, data: Record<string, any>) {
  const document = await prisma.personnelDocument.create({
    data: {
      tenantId,
      personnelId,
      documentType: data.documentType ?? 'General',
      title: data.title,
      fileName: data.fileName ?? null,
      fileUrl: data.fileUrl ?? null,
      expiryDate: data.expiryDate ?? null,
      uploadedBy: userId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    },
  });
  await auditLog(tenantId, userId, 'Uploaded personnel document', personnelId, document);
  return document;
}

export async function createReadinessSnapshot(tenantId: string, personnelId: string, userId?: string) {
  const result = await getPersonnel360(tenantId, personnelId);
  if (!result) return null;
  const snapshot = await prisma.personnelReadinessSnapshot.create({
    data: {
      tenantId,
      personnelId,
      snapshotDate: new Date().toISOString(),
      trainingScore: result.readiness.trainingScore,
      certificationScore: result.readiness.certificationScore,
      staffingReliabilityScore: result.readiness.staffingReliabilityScore,
      incidentDocumentationScore: result.readiness.incidentDocumentationScore,
      performanceScore: result.readiness.performanceScore,
      overtimeRiskScore: result.readiness.overtimeRiskScore,
      overallReadinessScore: result.readiness.overallReadinessScore,
      riskLevel: result.readiness.riskLevel,
      evidenceSummary: result.readiness.evidenceSummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });
  await auditLog(tenantId, userId, 'Created readiness snapshot', personnelId, snapshot);
  return snapshot;
}
