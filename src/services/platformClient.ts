import { apiRequest, apiRequestOptional } from './apiClient';
import {
  demoAiInsights,
  demoApparatus,
  demoAssets,
  demoAuditLogs,
  demoCertifications,
  demoInventory,
  demoNotifications,
  demoPersonnel,
  demoPersonnelAssignments,
  demoPersonnelCertifications,
  demoPersonnelDocuments,
  demoPermissions,
  demoPlatformSummary,
  demoReportDefinitions,
  demoProperties,
  demoRoles,
  demoSearchIndex,
  demoStations,
  demoSupportTickets,
  demoTenant,
  demoUsers,
} from '../data/platformMock';
import { demoEpcrQueue, demoNerisQueue, demoRmsRecords, demoRmsSummary } from '../data/rmsMock';
import {
  appraisalRows as staffingAppraisalRows,
  callbackQueue as staffingCallbackQueue,
  commandCenterSummary as staffingCommandCenterSummary,
  coverageBoard as staffingCoverageBoard,
  minimumStaffingRules as staffingMinimumStaffingRules,
  overtimeRows as staffingOvertimeRows,
  recommendationRows as staffingRecommendationRows,
  rosterForDay as staffingRosterForDay,
  shiftFillRows as staffingShiftFillRows,
  shiftPlanner as staffingShiftPlanner,
  staffForecast as staffingForecast,
  staffingKpis as staffingKpiSummary,
  tradeRows as staffingTradeRows,
} from '../data/staffingMock';
import {
  demoTrainingAssignments,
  demoTrainingAttendance,
  demoTrainingCourses,
  demoTrainingNeeds,
  demoTrainingReadiness,
  demoTrainingSessions,
  demoTrainerRecommendations,
  demoTraineeRecommendations,
  demoTrainingCategories,
  demoTrainingCertifications,
} from '../data/trainingMock';
import type {
  AiInsight,
  Apparatus,
  Asset,
  ApiResponse,
  AuditLog,
  CadImportLog,
  AnalyticsSnapshot,
  AnalyticsKpiDefinition,
  DataQualityCheck,
  DataQualityIssue,
  DashboardWidget,
  DuplicateRecordCandidate,
  EpcrExchangeItem,
  EpcrLink,
  Certification,
  CertificationRenewal,
  Course,
  CourseCategory,
  CourseSession,
  DashboardSummary,
  GlobalSearchResult,
  InventoryItem,
  Notification,
  NerisValidationQueueItem,
  NerisExportLog,
  NerisMapping,
  Incident,
  IncidentCommandCenter,
  IncidentDataQualityIssue,
  IncidentDetail,
  IncidentDuplicateCandidate,
  IncidentNarrative,
  IncidentQaReview,
  IncidentTimelineEvent,
  IntegrationLog,
  GlobalSearchGroup,
  GroupedSearchResults,
  PaginatedResponse,
  InstructorProfile,
  Personnel,
  Permission,
  Property,
  ReportDefinition,
  ReportExport,
  ReportSchedule,
  SavedReport,
  Role,
  Station,
  SupportTicket,
  Tenant,
  RmsRecord,
  RmsSummary,
  TrainingAssignment,
  TrainingAttendance,
  TrainingNeedAssessment,
  TrainerRecommendation,
  TraineeRecommendation,
  User,
} from '../types';

const fallbackPaginated = <T,>(items: T[], page = 1, take = items.length): PaginatedResponse<T> => ({
  items: items.slice((page - 1) * take, page * take),
  page,
  take,
  total: items.length,
});

const fallbackIncidentCommandCenter = (): IncidentCommandCenter => ({
  summary: {
    totalIncidents: demoRmsRecords.length,
    draft: demoRmsRecords.filter((item) => item.status === 'Draft').length,
    submitted: demoRmsRecords.filter((item) => item.status === 'Submitted').length,
    qaNeeded: demoRmsRecords.filter((item) => item.qaStatus === 'QA Needed').length,
    approved: demoRmsRecords.filter((item) => item.status === 'Approved').length,
    closed: demoRmsRecords.filter((item) => item.status === 'Closed').length,
    exported: demoRmsRecords.filter((item) => item.status === 'Exported').length,
    nerisReady: demoRmsRecords.filter((item) => item.nerisStatus === 'Ready').length,
    epcrLinked: demoRmsRecords.filter((item) => item.epcrStatus === 'Linked').length,
    openDataQualityIssues: 3,
    duplicateCandidates: 2,
  },
  incidents: demoRmsRecords as unknown as Incident[],
  qaQueue: demoRmsRecords.filter((item) => item.qaStatus === 'QA Needed' || item.status === 'Submitted') as unknown as Incident[],
  nerisReady: demoRmsRecords.filter((item) => item.nerisStatus === 'Ready' || item.nerisStatus === 'Queued') as unknown as Incident[],
  epcrQueue: demoRmsRecords.filter((item) => item.epcrStatus === 'Linked' || item.epcrStatus === 'Failed') as unknown as Incident[],
  dataQualityIssues: [],
  duplicateCandidates: [],
  readinessForecast: 78,
});

export async function login(email: string, password: string) {
  const response = await apiRequestOptional<{ accessToken: string; refreshToken: string; user: unknown }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (response) return response;
  const user = demoUsers.find((item) => item.email === email) ?? demoUsers[0];
  return {
    accessToken: 'demo-access-token',
    refreshToken: 'demo-refresh-token',
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      tenant: demoTenant.name,
      permissions: demoPermissions.map((permission) => permission.code),
    },
  };
}

export async function getCurrentUser() {
  const response = await apiRequestOptional('/auth/me');
  return response ?? {
    userId: demoUsers[0].id,
    tenantId: demoTenant.id,
    permissions: demoPermissions.map((permission) => permission.code),
    email: demoUsers[0].email,
  };
}

export async function getPlatformSummary(): Promise<DashboardSummary> {
  return (await apiRequestOptional<DashboardSummary>('/platform/summary')) ?? demoPlatformSummary;
}

export async function getStations(): Promise<PaginatedResponse<Station>> {
  return (await apiRequestOptional<PaginatedResponse<Station>>('/stations')) ?? fallbackPaginated(demoStations);
}

export async function getStation(id: string): Promise<Station | null> {
  const response = await apiRequestOptional<Station>(`/stations/${id}`);
  return response ?? demoStations.find((station) => station.id === id) ?? null;
}

export async function getStationSummary(id: string) {
  return (
    (await apiRequestOptional(`/stations/${id}/summary`)) ?? {
      station: demoStations.find((station) => station.id === id) ?? demoStations[0],
      personnelCount: demoPersonnel.filter((personnel) => personnel.currentStationId === id).length,
      apparatusCount: demoApparatus.filter((apparatus) => apparatus.stationId === id).length,
      inventoryItems: demoInventory.filter((item) => item.stationId === id).length,
    }
  );
}

export async function getPersonnel(): Promise<PaginatedResponse<Personnel>> {
  return (await apiRequestOptional<PaginatedResponse<Personnel>>('/personnel')) ?? fallbackPaginated(demoPersonnel);
}

export async function getPersonnelRecord(id: string): Promise<Personnel | null> {
  const response = await apiRequestOptional<Personnel>(`/personnel/${id}`);
  return response ?? demoPersonnel.find((personnel) => personnel.id === id) ?? null;
}

export async function getPersonnel360(id: string) {
  const bundle = (await apiRequestOptional(`/personnel/${id}/360`)) as any;
  if (bundle && bundle.certifications && bundle.certifications.active) return bundle;
  // Resilient fallback whose shape matches the live Personnel 360 bundle so the
  // page never crashes if the API returns null or an unexpected/partial payload.
  const person = demoPersonnel.find((personnel) => personnel.id === id) ?? demoPersonnel[0];
  const certs = demoPersonnelCertifications.filter((certification) => certification.personnelId === person?.id);
  const assignments = demoTrainingAssignments.filter((assignment) => assignment.personnelId === person?.id);
  const score = Number(person?.readinessScore ?? 0);
  return {
    personnel: person,
    station: null,
    rank: null,
    supervisor: null,
    certifications: {
      active: certs.filter((certification) => String(certification.status ?? '').toLowerCase() !== 'expired'),
      expiring: certs.filter((certification) => String(certification.status ?? '').toLowerCase().includes('expir') && String(certification.status ?? '').toLowerCase() !== 'expired'),
      expired: certs.filter((certification) => String(certification.status ?? '').toLowerCase() === 'expired'),
      missingRequired: [],
    },
    training: {
      assignments,
      attendance: demoTrainingAttendance.filter((attendance) => attendance.personnelId === person?.id),
      completed: assignments.filter((assignment) => assignment.status === 'Completed'),
      missed: [],
      recommendedNextTraining: assignments[0] ?? null,
    },
    staffing: {
      currentShift: null,
      recentAssignments: demoPersonnelAssignments.filter((assignment) => assignment.personnelId === person?.id),
      overtimeHours: 12,
      leaveRecords: [],
      availability: null,
      staffingReliabilityScore: score,
    },
    incidents: {
      participation: [],
      recentIncidents: [],
      qaIssues: [],
    },
    performance: {
      reviews: [],
      goals: [],
      notes: [],
      documents: demoPersonnelDocuments.filter((document) => document.personnelId === person?.id),
      latestReview: null,
    },
    readiness: {
      snapshots: [],
      overallReadinessScore: score,
      riskLevel: score >= 90 ? 'Ready' : score >= 75 ? 'Watch' : 'At Risk',
      evidenceSummary: 'Fallback personnel readiness summary',
      trainingScore: 82,
      certificationScore: 84,
      staffingReliabilityScore: 80,
      incidentDocumentationScore: 78,
      performanceScore: 85,
      overtimeRiskScore: 76,
      riskFlags: [],
    },
    aiInsights: demoAiInsights.filter((insight) => String(insight.dataSources).includes('Personnel')),
    notifications: [],
    assignmentHistory: [],
  };
}

export async function getPersonnelSummary(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/summary`)) ?? {
      personnel: demoPersonnel.find((personnel) => personnel.id === id) ?? demoPersonnel[0],
      assignments: demoPersonnelAssignments.filter((assignment) => assignment.personnelId === id).length,
      certifications: demoCertifications.length,
      readinessScore: demoPersonnel.find((personnel) => personnel.id === id)?.readinessScore ?? 0,
    }
  );
}

export async function getPersonnelCertifications(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/certifications`)) ?? demoPersonnelCertifications.filter((certification) => certification.personnelId === id)
  );
}

export async function getPersonnelTraining(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/training`)) ?? {
      assignments: demoTrainingAssignments.filter((assignment) => assignment.personnelId === id),
      attendance: demoTrainingAttendance.filter((attendance) => attendance.personnelId === id),
      nextRecommendedTraining: demoTrainingAssignments.find((assignment) => assignment.personnelId === id) ?? null,
    }
  );
}

export async function getPersonnelIncidents(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/incidents`)) ?? (demoRmsRecords as unknown as Incident[])
  );
}

export async function getPersonnelStaffing(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/staffing`)) ?? {
      assignments: demoPersonnelAssignments.filter((assignment) => assignment.personnelId === id),
      overtimeHours: 12,
      leaveRecords: [],
      reliabilityScore: demoPersonnel.find((personnel) => personnel.id === id)?.readinessScore ?? 0,
      availability: 'Available',
    }
  );
}

export async function getPersonnelPerformance(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/performance`)) ?? {
      reviews: [],
      notes: [],
      documents: demoPersonnelDocuments.filter((document) => document.personnelId === id),
    }
  );
}

export async function getPersonnelGoals(id: string) {
  return (await apiRequestOptional(`/personnel/${id}/goals`)) ?? [];
}

export async function getPersonnelDocuments(id: string) {
  return (await apiRequestOptional(`/personnel/${id}/documents`)) ?? demoPersonnelDocuments.filter((document) => document.personnelId === id);
}

export async function getPersonnelReadiness(id: string) {
  return (
    (await apiRequestOptional(`/personnel/${id}/readiness`)) ?? {
      personnel: demoPersonnel.find((personnel) => personnel.id === id) ?? demoPersonnel[0],
      overallReadinessScore: demoPersonnel.find((personnel) => personnel.id === id)?.readinessScore ?? 0,
      riskLevel: (demoPersonnel.find((personnel) => personnel.id === id)?.readinessScore ?? 0) >= 90 ? 'Ready' : 'Watch',
      evidenceSummary: 'Fallback readiness summary',
    }
  );
}

export async function getPersonnelRisks() {
  return (await apiRequestOptional('/personnel/risks')) ?? demoPersonnel.filter((personnel) => (personnel.expiringCerts ?? 0) > 0);
}

export async function getPersonnelReadinessSummary() {
  return (
    (await apiRequestOptional('/personnel/readiness-summary')) ?? {
      ready: demoPersonnel.filter((personnel) => (personnel.readinessScore ?? 0) >= 90).length,
      watch: demoPersonnel.filter((personnel) => (personnel.readinessScore ?? 0) >= 75 && (personnel.readinessScore ?? 0) < 90).length,
      atRisk: demoPersonnel.filter((personnel) => (personnel.readinessScore ?? 0) >= 60 && (personnel.readinessScore ?? 0) < 75).length,
      critical: demoPersonnel.filter((personnel) => (personnel.readinessScore ?? 0) < 60).length,
    }
  );
}

export async function getStaffingCommandCenter(): Promise<any> {
  const live = await apiRequestOptional<any>('/staffing/command-center');
  if (live) return live;
  const cc = staffingCommandCenterSummary();
  const staffingNotifications = demoNotifications.filter((notification) => String(notification.notificationType).includes('staffing'));
  const staffingInsights = demoAiInsights.filter((insight) => String(insight.category).includes('Staffing'));
  return {
    summary: {
      ...cc.summary,
      activeCertRisks: demoPersonnelCertifications.filter((cert) => cert.status === 'Expiring Soon' || cert.status === 'Expired').length,
      leaveRequests: demoPersonnel.filter((person) => String(person.status ?? '').toLowerCase() === 'leave').length,
      staffingRules: demoStations.length,
      openAlerts: staffingNotifications.length,
      aiInsights: staffingInsights.length,
    },
    topRiskStations: cc.topRiskStations,
    recentActivity: staffingNotifications.slice(0, 5),
    stationRows: cc.board,
    gaps: cc.gaps,
    recommendations: cc.recommendations,
    notifications: staffingNotifications,
    aiInsights: staffingInsights,
    coverageTrend: cc.board.map((row: any) => ({ label: row.station.name, value: row.coverage })),
    recommendationSummary: cc.recommendations.slice(0, 5).map((item: any) => ({
      station: item.station.name,
      personnel: item.personnel?.name,
      reason: item.reason,
    })),
  };
}

export async function getStaffingBoard(page = 1, take = 50, filters: Record<string, unknown> = {}): Promise<PaginatedResponse<any>> {
  const params = new URLSearchParams({ page: String(page), take: String(take) });
  if (typeof filters.stationId === 'string') params.set('stationId', filters.stationId);
  if (typeof filters.riskLevel === 'string') params.set('riskLevel', filters.riskLevel);
  if (typeof filters.status === 'string') params.set('status', filters.status);
  if (typeof filters.search === 'string') params.set('search', filters.search);
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/board?${params.toString()}`);
  if (response) return response;
  let rows = staffingCoverageBoard();
  if (typeof filters.stationId === 'string') rows = rows.filter((row: any) => row.station.id === filters.stationId);
  if (typeof filters.riskLevel === 'string') rows = rows.filter((row: any) => String(row.riskLevel).toLowerCase() === String(filters.riskLevel).toLowerCase());
  return fallbackPaginated(rows, page, take);
}

export async function getStaffingGaps(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/gaps?page=${page}&take=${take}`);
  if (response) return response;
  const rows = staffingCoverageBoard().filter((row: any) => row.gap > 0 || row.coverage < 90 || row.openShifts > 0);
  return fallbackPaginated(rows, page, take);
}

export async function getStaffingRecommendations(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/recommendations?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingRecommendationRows(), page, take);
}

export async function getStaffingShiftFill(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/shift-fill?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingShiftFillRows(), page, take);
}

export async function getStaffingTrades(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/trades?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingTradeRows(), page, take);
}

export async function getStaffingOvertime(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/overtime?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingOvertimeRows(), page, take);
}

export async function getStaffingCallbackQueue(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/callback-queue?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingCallbackQueue(), page, take);
}

export async function getStaffingRoster(dayOffset = 0): Promise<any> {
  const response = await apiRequestOptional<any>(`/staffing/roster?dayOffset=${dayOffset}`);
  return response ?? staffingRosterForDay(dayOffset);
}

export async function getStaffingPlanner(days = 5): Promise<any> {
  const response = await apiRequestOptional<any>(`/staffing/planner?days=${days}`);
  return response ?? staffingShiftPlanner(days);
}

export async function getStaffingForecast(days = 7): Promise<any> {
  const response = await apiRequestOptional<any>(`/staffing/forecast?days=${days}`);
  return response ?? staffingForecast(days);
}

export async function getStaffingKpis(): Promise<any> {
  const response = await apiRequestOptional<any>('/staffing/kpis');
  return response ?? staffingKpiSummary();
}

export async function getStaffingAppraisals(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/appraisals?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingAppraisalRows(), page, take);
}

export async function getStaffingMinimumRules(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/minimum-rules?page=${page}&take=${take}`);
  return response ?? fallbackPaginated(staffingMinimumStaffingRules(), page, take);
}

export async function getStaffingAuditLog(page = 1, take = 50): Promise<PaginatedResponse<any>> {
  const response = await apiRequestOptional<PaginatedResponse<any>>(`/staffing/audit-log?page=${page}&take=${take}`);
  return response ?? fallbackPaginated([], page, take);
}

export async function actOnStaffingRecommendation(id: string, action: string) {
  // Tolerant of an unreachable API — the page also persists the decision locally
  // so the command action and audit trail still work in demo mode.
  return apiRequestOptional(`/staffing/recommendations/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) });
}

export async function getCertifications(): Promise<PaginatedResponse<Certification>> {
  return (await apiRequestOptional<PaginatedResponse<Certification>>('/certifications')) ?? fallbackPaginated(demoCertifications);
}

export async function getTrainingStats() {
  return (await apiRequestOptional('/training/stats')) ?? demoTrainingReadiness;
}

export async function getTrainingCommandCenter() {
  return (
    (await apiRequestOptional('/training/command-center')) ?? {
      agencyReadiness: demoTrainingReadiness.agencyReadiness,
      trainingComplianceScore: 88,
      expiringCertifications: 10,
      expiredCertifications: 2,
      highPriorityNeeds: demoTrainingNeeds.filter((need) => Number(need.priority ?? '9') <= 2).slice(0, 5),
      upcomingSessions: demoTrainingSessions.filter((session) => ['Scheduled', 'In Progress', 'Completed'].includes(session.status)).length,
      overdueAssignments: demoTrainingAssignments.filter((assignment) => assignment.status !== 'Completed').length,
      stationTrainingRisk: 4,
      recommendedCourses: demoTrainingCourses.slice(0, 5),
      recommendedTrainers: demoTrainerRecommendations.slice(0, 3),
      recommendedTrainees: demoTraineeRecommendations.slice(0, 3),
      readinessImprovementForecast: 8,
      notifications: demoNotifications.filter((notification) => String(notification.notificationType).includes('training')),
      aiInsights: demoAiInsights.filter((insight) => String(insight.category).toLowerCase().includes('training')),
      personnelCount: demoPersonnel.length,
    }
  );
}

export async function getTrainingNeeds(): Promise<PaginatedResponse<TrainingNeedAssessment>> {
  return (await apiRequestOptional<PaginatedResponse<TrainingNeedAssessment>>('/training/needs')) ?? fallbackPaginated(demoTrainingNeeds);
}

export async function generateTrainingNeeds() {
  return (await apiRequestOptional('/training/needs/generate', { method: 'POST' })) ?? { items: demoTrainingNeeds, generatedCount: demoTrainingNeeds.length };
}

export async function dismissTrainingNeed(id: string) {
  return (await apiRequestOptional(`/training/needs/${id}/dismiss`, { method: 'POST' })) ?? demoTrainingNeeds.find((need) => need.id === id) ?? null;
}

export async function resolveTrainingNeed(id: string) {
  return (await apiRequestOptional(`/training/needs/${id}/resolve`, { method: 'POST' })) ?? demoTrainingNeeds.find((need) => need.id === id) ?? null;
}

export async function getTrainingCourses(): Promise<PaginatedResponse<Course>> {
  return (await apiRequestOptional<PaginatedResponse<Course>>('/training/courses')) ?? fallbackPaginated(demoTrainingCourses);
}

export async function getCourseCategories(): Promise<PaginatedResponse<CourseCategory>> {
  return (await apiRequestOptional<PaginatedResponse<CourseCategory>>('/training/course-categories')) ?? fallbackPaginated(demoTrainingCategories);
}

export async function getTrainingSessions(): Promise<PaginatedResponse<CourseSession>> {
  return (await apiRequestOptional<PaginatedResponse<CourseSession>>('/training/sessions')) ?? fallbackPaginated(demoTrainingSessions);
}

export async function getTrainingAssignments(): Promise<PaginatedResponse<TrainingAssignment>> {
  return (await apiRequestOptional<PaginatedResponse<TrainingAssignment>>('/training/assignments')) ?? fallbackPaginated(demoTrainingAssignments);
}

export async function getTrainingAttendance(sessionId: string): Promise<TrainingAttendance[]> {
  return (await apiRequestOptional<TrainingAttendance[]>(`/training/sessions/${sessionId}/attendance`)) ?? demoTrainingAttendance.filter((attendance) => attendance.sessionId === sessionId);
}

export async function getCertificationCompliance() {
  return (await apiRequestOptional('/training/certifications/compliance')) ?? {
    byCertification: demoTrainingCertifications.map((certification) => ({
      certification,
      total: 8,
      active: 7,
      expiring: 1,
      expired: 0,
      complianceRate: 88,
    })),
    byStation: demoStations.map((station) => ({
      station,
      personnelCount: demoPersonnel.filter((personnel) => personnel.currentStationId === station.id).length,
      expiringCertifications: 1,
      readinessScore: station.readiness,
      staffingStatus: station.status,
    })),
  };
}

export async function getExpiringCertifications() {
  return (await apiRequestOptional('/training/certifications/expiring')) ?? demoPersonnelCertifications.slice(0, 10);
}

export async function getTrainerRecommendations(needId?: string, courseId?: string): Promise<Array<{ need: TrainingNeedAssessment; course: Course; topTrainer: TrainerRecommendation | null; alternates: TrainerRecommendation[]; recommendations: TrainerRecommendation[] }>> {
  const query = new URLSearchParams();
  if (needId) query.set('needId', needId);
  if (courseId) query.set('courseId', courseId);
  return (await apiRequestOptional(`/training/recommendations/trainers${query.toString() ? `?${query.toString()}` : ''}`)) ?? demoTrainingNeeds.map((need, index) => ({
    need,
    course: demoTrainingCourses.find((course) => course.id === (need.requiredCourseId ?? 'course-ems-doc')) ?? demoTrainingCourses[0],
    topTrainer: demoTrainerRecommendations[index % demoTrainerRecommendations.length] ?? null,
    alternates: demoTrainerRecommendations,
    recommendations: demoTrainerRecommendations,
  }));
}

export async function getTraineeRecommendations(needId?: string, courseId?: string): Promise<Array<{ need: TrainingNeedAssessment; course: Course; recommendedTrainees: TraineeRecommendation[]; priorityOrder: TraineeRecommendation[] }>> {
  const query = new URLSearchParams();
  if (needId) query.set('needId', needId);
  if (courseId) query.set('courseId', courseId);
  return (await apiRequestOptional(`/training/recommendations/trainees${query.toString() ? `?${query.toString()}` : ''}`)) ?? demoTrainingNeeds.map((need) => ({
    need,
    course: demoTrainingCourses.find((course) => course.id === (need.requiredCourseId ?? 'course-ems-doc')) ?? demoTrainingCourses[0],
    recommendedTrainees: demoTraineeRecommendations.filter((item) => item.trainingNeedAssessmentId === need.id),
    priorityOrder: demoTraineeRecommendations.filter((item) => item.trainingNeedAssessmentId === need.id),
  }));
}

export async function getCourseRecommendations(): Promise<any[]> {
  return (await apiRequestOptional('/training/recommendations/courses')) ?? demoTrainingNeeds.map((need) => ({
    need,
    recommendedCourse: demoTrainingCourses.find((course) => course.id === (need.requiredCourseId ?? 'course-ems-doc')) ?? demoTrainingCourses[0],
    whyThisCourse: need.evidenceSummary,
    targetAudience: ['Company Officer', 'Firefighter'],
    requiredTrainerQualifications: ['Current certification match'],
    urgency: need.priority,
    operationalImpact: need.readinessImpact ?? 0,
    estimatedReadinessImprovement: need.readinessImpact ?? 0,
  }));
}

export async function getTrainingReadinessImpact() {
  return (await apiRequestOptional('/training/readiness-impact')) ?? demoTrainingReadiness;
}

export async function getPersonnelTrainingProfile(personnelId: string) {
  return (
    (await apiRequestOptional(`/training/personnel/${personnelId}/profile`)) ?? {
      personnel: demoPersonnel.find((personnel) => personnel.id === personnelId) ?? demoPersonnel[0],
      assignments: demoTrainingAssignments.filter((assignment) => assignment.personnelId === personnelId),
      certifications: demoPersonnelCertifications.filter((certification) => certification.personnelId === personnelId),
      reviews: [],
      outcomes: [],
      attendance: demoTrainingAttendance.filter((attendance) => attendance.personnelId === personnelId),
      readinessImpact: 5,
      nextRecommendedTraining: demoTrainingAssignments.find((assignment) => assignment.personnelId === personnelId) ?? null,
    }
  );
}

export async function getExpiringPersonnelCertifications(): Promise<Array<{ personnel: Personnel; expiringCount: number; nextExpiryDate: string }>> {
  return (
    (await apiRequestOptional('/personnel-certifications/expiring')) ?? demoPersonnel
      .filter((personnel) => (personnel.expiringCerts ?? 0) > 0)
      .map((personnel) => ({
        personnel,
        expiringCount: personnel.expiringCerts ?? 0,
        nextExpiryDate: '2026-06-16',
      }))
  );
}

export async function getApparatus(): Promise<PaginatedResponse<Apparatus>> {
  return (await apiRequestOptional<PaginatedResponse<Apparatus>>('/apparatus')) ?? fallbackPaginated(demoApparatus);
}

export async function getAssetCommandCenter(): Promise<any> {
  return (await apiRequestOptional<any>('/assets/command-center')) ?? {
    overallAssetReadinessScore: 81,
    riskLevel: 'Watch',
    apparatusReady: demoApparatus.filter((apparatus) => String(apparatus.status).toUpperCase() === 'READY').length,
    apparatusWarning: demoApparatus.filter((apparatus) => String(apparatus.status).toUpperCase() === 'WARNING').length,
    apparatusOutOfService: demoApparatus.filter((apparatus) => String(apparatus.status).toUpperCase() === 'OUT_OF_SERVICE').length,
    maintenanceDueThisWeek: 3,
    overdueMaintenance: 2,
    criticalLowStock: demoInventory.filter((item) => Number(item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
    expiringSupplies: demoInventory.filter((item) => Number(item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
    stationReadinessImpact: [],
    highRiskApparatus: demoApparatus.slice(0, 5),
    recentMaintenanceActivity: [],
    reorderRecommendations: [],
    aiInsights: [],
    notifications: demoNotifications.filter((notification) => String(notification.notificationType).includes('asset')),
  };
}

export async function getAssetRisks(): Promise<any[]> {
  return (await apiRequestOptional<any[]>('/assets/risks')) ?? [];
}

export async function getAssets(): Promise<PaginatedResponse<Asset>> {
  return (await apiRequestOptional<PaginatedResponse<Asset>>('/assets')) ?? fallbackPaginated(demoAssets as Asset[]);
}

export async function getAsset(id: string) {
  return (await apiRequestOptional(`/assets/${id}`)) ?? demoAssets.find((asset) => asset.id === id) ?? null;
}

export async function createAsset(data: Record<string, unknown>) {
  return apiRequest('/assets', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateAsset(id: string, data: Record<string, unknown>) {
  return apiRequest(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function getAssetHistory(id: string) {
  return (await apiRequestOptional(`/assets/${id}/history`)) ?? [];
}

export async function getApparatus360(id: string) {
  return (await apiRequestOptional(`/apparatus/${id}/360`)) ?? null;
}

export async function getApparatusReadiness(id: string) {
  return (await apiRequestOptional(`/apparatus/${id}/readiness`)) ?? null;
}

export async function getApparatusMaintenance(id: string) {
  return (await apiRequestOptional(`/apparatus/${id}/maintenance`)) ?? [];
}

export async function getApparatusInventory(id: string) {
  return (await apiRequestOptional(`/apparatus/${id}/inventory`)) ?? [];
}

export async function getStationAssetSummary(id: string) {
  return (await apiRequestOptional(`/stations/${id}/asset-readiness`)) ?? null;
}

export async function getStationAssets(id: string): Promise<any> {
  return (await apiRequestOptional<any>(`/stations/${id}/assets`)) ?? { apparatus: [], assets: [], inventory: [], maintenance: [] };
}

export async function getInventoryLowStock(): Promise<any[]> {
  return (await apiRequestOptional<any[]>('/inventory/low-stock')) ?? [];
}

export async function getInventoryExpiring(): Promise<any[]> {
  return (await apiRequestOptional<any[]>('/inventory/expiring')) ?? [];
}

export async function getInventoryTransactions(): Promise<any> {
  return (await apiRequestOptional<any>('/inventory/transactions')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function createInventoryTransaction(data: Record<string, unknown>) {
  return apiRequest('/inventory/transactions', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMaintenanceEvents(): Promise<any> {
  return (await apiRequestOptional<any>('/maintenance-events')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function createMaintenanceEvent(data: Record<string, unknown>) {
  return apiRequest('/maintenance-events', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateMaintenanceEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/maintenance-events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function scheduleMaintenanceEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/maintenance-events/${id}/schedule`, { method: 'POST', body: JSON.stringify(data) });
}

export async function startMaintenanceEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/maintenance-events/${id}/start`, { method: 'POST', body: JSON.stringify(data) });
}

export async function completeMaintenanceEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/maintenance-events/${id}/complete`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deferMaintenanceEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/maintenance-events/${id}/defer`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getPreventiveMaintenance(): Promise<any> {
  return (await apiRequestOptional<any>('/preventive-maintenance')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getPreventiveMaintenanceDue(): Promise<any[]> {
  return (await apiRequestOptional<any[]>('/preventive-maintenance/due')) ?? [];
}

export async function completePreventiveMaintenance(id: string) {
  return apiRequest(`/preventive-maintenance/${id}/complete`, { method: 'POST' });
}

export async function getVendors(): Promise<any> {
  return (await apiRequestOptional<any>('/vendors')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getReorderRecommendations(): Promise<any> {
  return (await apiRequestOptional<any>('/reorder-recommendations')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function approveReorderRecommendation(id: string) {
  return apiRequest(`/reorder-recommendations/${id}/approve`, { method: 'POST' });
}

export async function rejectReorderRecommendation(id: string) {
  return apiRequest(`/reorder-recommendations/${id}/reject`, { method: 'POST' });
}

export async function getInventory(): Promise<PaginatedResponse<InventoryItem>> {
  return (await apiRequestOptional<PaginatedResponse<InventoryItem>>('/inventory')) ?? fallbackPaginated(demoInventory);
}

export async function createInventory(data: Record<string, unknown>) {
  return apiRequest('/inventory', { method: 'POST', body: JSON.stringify(data) });
}

export async function getProperties(): Promise<PaginatedResponse<Property>> {
  return (await apiRequestOptional<PaginatedResponse<Property>>('/properties')) ?? fallbackPaginated(demoProperties);
}

export async function getNotifications(): Promise<PaginatedResponse<Notification>> {
  return (await apiRequestOptional<PaginatedResponse<Notification>>('/notifications')) ?? fallbackPaginated(demoNotifications);
}

export async function markNotificationRead(id: string) {
  const response = await apiRequestOptional<Notification>(`/notifications/${id}/read`, { method: 'POST' });
  return response ?? demoNotifications.find((notification) => notification.id === id) ?? null;
}

export async function getAuditLogs(): Promise<PaginatedResponse<AuditLog>> {
  return (await apiRequestOptional<PaginatedResponse<AuditLog>>('/audit-logs')) ?? fallbackPaginated(demoAuditLogs);
}

export async function getIncidents(): Promise<PaginatedResponse<Incident>> {
  return (await apiRequestOptional<PaginatedResponse<Incident>>('/incidents')) ?? fallbackPaginated(demoRmsRecords as unknown as Incident[]);
}

export async function getIncidentCommandCenter(): Promise<IncidentCommandCenter> {
  return (await apiRequestOptional<IncidentCommandCenter>('/incidents/command-center')) ?? fallbackIncidentCommandCenter();
}

export async function getIncident(id: string): Promise<IncidentDetail | null> {
  return (await apiRequestOptional<IncidentDetail>(`/incidents/${id}`)) ?? null;
}

export async function createIncident(data: Record<string, unknown>): Promise<IncidentDetail> {
  return apiRequest<IncidentDetail>('/incidents', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateIncident(id: string, data: Record<string, unknown>): Promise<IncidentDetail> {
  return apiRequest<IncidentDetail>(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function submitIncident(id: string) {
  return apiRequest<IncidentDetail>(`/incidents/${id}/submit`, { method: 'POST' });
}

export async function approveIncidentQa(id: string, notes?: string) {
  return apiRequest<IncidentDetail>(`/incidents/${id}/qa/approve`, { method: 'POST', body: JSON.stringify({ notes }) });
}

export async function returnIncidentQa(id: string, notes?: string) {
  return apiRequest<IncidentDetail>(`/incidents/${id}/qa/return`, { method: 'POST', body: JSON.stringify({ notes }) });
}

export async function closeIncident(id: string) {
  return apiRequest<IncidentDetail>(`/incidents/${id}/close`, { method: 'POST' });
}

export async function getIncidentTimeline(id: string): Promise<IncidentTimelineEvent[]> {
  return (await apiRequestOptional<IncidentTimelineEvent[]>(`/incidents/${id}/timeline`)) ?? [];
}

export async function addIncidentTimelineEvent(id: string, data: Record<string, unknown>) {
  return apiRequest(`/incidents/${id}/timeline`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getIncidentNarratives(id: string): Promise<IncidentNarrative[]> {
  return (await apiRequestOptional<IncidentNarrative[]>(`/incidents/${id}/narratives`)) ?? [];
}

export async function addIncidentNarrative(id: string, data: Record<string, unknown>) {
  return apiRequest(`/incidents/${id}/narratives`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getIncidentDataQuality(id: string): Promise<IncidentDataQualityIssue[]> {
  return (await apiRequestOptional<IncidentDataQualityIssue[]>(`/incidents/${id}/data-quality`)) ?? [];
}

export async function getIncidentDuplicates(): Promise<IncidentDuplicateCandidate[]> {
  return (await apiRequestOptional<IncidentDuplicateCandidate[]>('/incidents/duplicates')) ?? [];
}

export async function getNerisMappings(): Promise<NerisMapping[]> {
  return (await apiRequestOptional<NerisMapping[]>('/neris/mappings')) ?? [];
}

export async function updateNerisMapping(id: string, data: Record<string, unknown>) {
  return apiRequest(`/neris/mappings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function getNerisExportPreview(incidentId: string) {
  return apiRequestOptional(`/neris/export-preview/${incidentId}`);
}

export async function exportIncidentToNeris(incidentId: string) {
  return apiRequest(`/neris/export/${incidentId}`, { method: 'POST' });
}

export async function getEpcrLinks(): Promise<EpcrLink[]> {
  return (await apiRequestOptional<EpcrLink[]>('/epcr/links')) ?? [];
}

export async function createEpcrLink(data: Record<string, unknown>) {
  return apiRequest('/epcr/links', { method: 'POST', body: JSON.stringify(data) });
}

export async function getCadImportLogs(): Promise<CadImportLog[]> {
  return (await apiRequestOptional<CadImportLog[]>('/cad/import-logs')) ?? [];
}

export async function getIntegrationLogs(): Promise<PaginatedResponse<IntegrationLog>> {
  return (await apiRequestOptional<PaginatedResponse<IntegrationLog>>('/integrations/logs')) ?? fallbackPaginated((demoAuditLogs as unknown as IntegrationLog[]).slice(0, 6));
}

export async function getAnalyticsCommandCenter(): Promise<any> {
  return (await apiRequestOptional<any>('/analytics/command-center')) ?? {
    summary: {
      stationCount: demoStations.length,
      personnelCount: demoPersonnel.length,
      apparatusCount: demoApparatus.length,
      agencyReadiness: demoPlatformSummary.readiness.agencyAverage,
      stationReadinessDistribution: { Ready: 7, Watch: 6, 'At Risk': 3, Critical: 1 },
      incidentVolumeTrends: [],
      emsPercentage: 58,
      staffingCoverage: 84,
      overtimeRisk: 4,
      trainingCompliance: 88,
      certificationRisk: demoPersonnelCertifications.filter((cert) => cert.status === 'Expiring Soon' || cert.status === 'Expired').length,
      apparatusReadiness: 81,
      maintenanceBacklog: 3,
      inventoryShortage: 4,
      inspectionBacklog: 6,
      permitBacklog: 5,
      violationSeverityDistribution: { Critical: 4, High: 12, Normal: 24, Low: 8 },
      preplanCompleteness: 86,
      integrationHealth: demoPlatformSummary.integrationHealth,
      dataQualityScore: 90,
      openDataQualityIssues: 6,
      notificationCount: demoNotifications.length,
      topOperationalRisks: demoAiInsights.slice(0, 3),
      aiRecommendedActions: demoAiInsights.flatMap((insight) => insight.recommendedActions ?? []).slice(0, 5),
      readinessForecast: 87,
      stationRows: demoStations.map((station) => ({ station, readinessScore: station.readinessScore, staffingCoverage: 84, overtimeRisk: 3 })),
    },
    widgets: [],
    topRisks: demoAiInsights.slice(0, 3),
    recentActivity: demoNotifications.slice(0, 4),
    trends: {
      incidentVolume: [],
      trainingCompliance: [],
      staffingCoverage: [],
      overtimeRisk: [],
      maintenanceBacklog: [],
      inventoryShortage: [],
      inspectionBacklog: [],
      permitBacklog: [],
    },
    stationComparison: demoStations.map((station) => ({
      station,
      readinessScore: station.readinessScore,
      incidentVolume: 10,
      staffingCoverage: 84,
      trainingCompliance: 86,
      certificationRisk: 3,
      apparatusReadiness: 81,
      maintenanceRisk: 2,
      inventoryRisk: 3,
      inspectionBacklog: 5,
      preplanCompleteness: 88,
      openNotifications: 1,
      aiRiskCount: 1,
      overtimeRisk: 2,
    })),
    notifications: demoNotifications,
    aiInsights: demoAiInsights,
    dataQualityScore: 90,
  };
}

export async function getExecutiveSummary(): Promise<any> {
  return (await apiRequestOptional<any>('/analytics/executive-summary')) ?? {
    overallReadiness: demoPlatformSummary.readiness.agencyAverage,
    operationalRiskIndex: 42,
    responseWorkload: demoRmsSummary.incidentCount + 15,
    trainingCompliance: 88,
    staffingReliability: 84,
    assetAvailability: 81,
    preventionBacklog: 17,
    dataQualityScore: 90,
    integrationUptime: 88,
    supportSla: demoSupportTickets.length,
    trendStatus: [
      { label: 'Training', direction: 'Improving' },
      { label: 'Assets', direction: 'Watch' },
      { label: 'Prevention', direction: 'Watch' },
      { label: 'Data quality', direction: 'Improving' },
    ],
    topFiveRisks: demoAiInsights.slice(0, 5),
    recommendedActions: demoAiInsights.flatMap((insight) => insight.recommendedActions ?? []).slice(0, 5),
  };
}

export async function getStationComparison(page = 1, take = 50, sortBy?: string): Promise<PaginatedResponse<any>> {
  const query = new URLSearchParams({ page: String(page), take: String(take) });
  if (sortBy) query.set('sortBy', sortBy);
  return (await apiRequestOptional<PaginatedResponse<any>>(`/analytics/station-comparison?${query.toString()}`)) ?? fallbackPaginated(demoStations.map((station) => ({
    station,
    readinessScore: station.readinessScore,
    incidentVolume: 10,
    staffingCoverage: 84,
    trainingCompliance: 86,
    certificationRisk: 3,
    apparatusReadiness: 81,
    maintenanceRisk: 2,
    inventoryRisk: 3,
    inspectionBacklog: 5,
    preplanCompleteness: 88,
    openNotifications: 1,
    aiRiskCount: 1,
    overtimeRisk: 2,
  })), page, take);
}

export async function getAnalyticsWidgets(): Promise<{ items: DashboardWidget[] }> {
  return (await apiRequestOptional<{ items: DashboardWidget[] }>('/analytics/widgets')) ?? { items: [] };
}

export async function getAnalyticsWidget(code: string): Promise<DashboardWidget | null> {
  return (await apiRequestOptional<DashboardWidget>(`/analytics/widgets/${encodeURIComponent(code)}`)) ?? null;
}

export async function getAnalyticsReadiness(): Promise<any> {
  const response = await apiRequestOptional<any>('/analytics/readiness');
  if (response) return response;
  const commandCenter = await getAnalyticsCommandCenter();
  return commandCenter.summary;
}

export async function getAnalyticsTrends(): Promise<any> {
  return (await apiRequestOptional<any>('/analytics/trends')) ?? {
    incidentVolume: [],
    trainingCompliance: [],
    staffingCoverage: [],
    overtimeRisk: [],
    maintenanceBacklog: [],
    inspectionBacklog: [],
    permitBacklog: [],
  };
}

export async function getModuleAnalytics(module: 'incidents' | 'training' | 'staffing' | 'personnel' | 'assets' | 'prevention' | 'integrations'): Promise<any> {
  return (await apiRequestOptional<any>(`/analytics/${module}`)) ?? {};
}

export async function getReportDefinitions(): Promise<PaginatedResponse<ReportDefinition>> {
  return (await apiRequestOptional<PaginatedResponse<ReportDefinition>>('/reports/definitions')) ?? fallbackPaginated(demoReportDefinitions as unknown as ReportDefinition[]);
}

export async function getReportDefinition(id: string): Promise<ReportDefinition | null> {
  return (await apiRequestOptional<ReportDefinition>(`/reports/definitions/${id}`)) ?? demoReportDefinitions.find((definition) => definition.id === id) ?? null;
}

export async function getSavedReports(): Promise<PaginatedResponse<SavedReport>> {
  return (await apiRequestOptional<PaginatedResponse<SavedReport>>('/reports/saved')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function createSavedReport(data: Record<string, unknown>) {
  return apiRequest('/reports/saved', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSavedReport(id: string, data: Record<string, unknown>) {
  return apiRequest(`/reports/saved/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteSavedReport(id: string) {
  return apiRequest(`/reports/saved/${id}`, { method: 'DELETE' });
}

export async function previewReport(data: Record<string, unknown>): Promise<any> {
  return (await apiRequestOptional<any>('/reports/preview', { method: 'POST', body: JSON.stringify(data) })) ?? { columns: [], rows: [], total: 0 };
}

export async function exportReport(data: Record<string, unknown>): Promise<ReportExport | any> {
  return apiRequest<ReportExport>('/reports/export', { method: 'POST', body: JSON.stringify(data) });
}

export async function getReportExports(): Promise<PaginatedResponse<ReportExport>> {
  return (await apiRequestOptional<PaginatedResponse<ReportExport>>('/reports/exports')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getReportExport(id: string): Promise<ReportExport | null> {
  return (await apiRequestOptional<ReportExport>(`/reports/exports/${id}`)) ?? null;
}

export async function getReportSchedules(): Promise<PaginatedResponse<ReportSchedule>> {
  return (await apiRequestOptional<PaginatedResponse<ReportSchedule>>('/reports/schedules')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function createReportSchedule(data: Record<string, unknown>) {
  return apiRequest('/reports/schedules', { method: 'POST', body: JSON.stringify(data) });
}

export async function runReportSchedule(id: string) {
  return apiRequest(`/reports/schedules/${id}/run`, { method: 'POST' });
}

export async function getDataQualitySummary(): Promise<any> {
  return (await apiRequestOptional<any>('/data-quality/summary')) ?? { overallScore: 90, bySeverity: { Critical: 2, High: 4, Normal: 8 }, byModule: {}, affectedRecords: 0, failedChecks: 0, recommendations: [] };
}

export async function getDataQualityChecks(): Promise<PaginatedResponse<DataQualityCheck>> {
  return (await apiRequestOptional<PaginatedResponse<DataQualityCheck>>('/data-quality/checks')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function runDataQualityChecks(): Promise<any> {
  return apiRequest('/data-quality/checks/run', { method: 'POST' });
}

export async function getDataQualityIssues(): Promise<PaginatedResponse<DataQualityIssue>> {
  return (await apiRequestOptional<PaginatedResponse<DataQualityIssue>>('/data-quality/issues')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function resolveDataQualityIssue(id: string, data: Record<string, unknown> = {}) {
  return apiRequest(`/data-quality/issues/${id}/resolve`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getDuplicateCandidates(): Promise<PaginatedResponse<DuplicateRecordCandidate>> {
  return (await apiRequestOptional<PaginatedResponse<DuplicateRecordCandidate>>('/duplicates')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getDuplicateCandidate(id: string): Promise<any> {
  return (await apiRequestOptional<any>(`/duplicates/${id}`)) ?? null;
}

export async function markDuplicateCandidate(id: string) {
  return apiRequest(`/duplicates/${id}/mark-duplicate`, { method: 'POST' });
}

export async function dismissDuplicateCandidate(id: string) {
  return apiRequest(`/duplicates/${id}/dismiss`, { method: 'POST' });
}

export async function getAnalyticsSnapshots(): Promise<PaginatedResponse<AnalyticsSnapshot>> {
  return (await apiRequestOptional<PaginatedResponse<AnalyticsSnapshot>>('/analytics/snapshots')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getAnalyticsFilters(): Promise<any> {
  return (await apiRequestOptional<any>('/analytics/filters')) ?? { stations: true, battalions: true, shiftPlatoons: true, modules: ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'], riskLevels: ['Low', 'Watch', 'At Risk', 'Critical'] };
}

export async function getAnalyticsDashboard() {
  const commandCenter = await getAnalyticsCommandCenter();
  return {
    agencyReadiness: commandCenter.summary.agencyReadiness,
    stationCount: commandCenter.summary.stationCount,
    incidentCount: commandCenter.trends.incidentVolume.reduce((count: number, entry: any) => count + Number(entry.value ?? 0), 0),
    personnelCount: commandCenter.summary.personnelCount,
    apparatusWarnings: Math.max(0, Math.round(commandCenter.summary.apparatusCount * (100 - Number(commandCenter.summary.apparatusReadiness ?? 0)) / 100)),
    overdueInspections: commandCenter.summary.inspectionBacklog,
    openAiInsights: commandCenter.aiInsights.length,
  };
}

function groupSearchResults(items: GlobalSearchResult[], query: string): GroupedSearchResults {
  const grouped = items.reduce((accumulator, item) => {
    const group = accumulator.get(item.entity) ?? { entity: item.entity, label: `${item.entity}s`, items: [] as GlobalSearchResult[] };
    group.items.push(item);
    accumulator.set(item.entity, group);
    return accumulator;
  }, new Map<string, GlobalSearchGroup>());
  const groups = Array.from(grouped.values()).filter((group) => group.items.length > 0);
  return {
    query,
    total: groups.reduce((count, group) => count + group.items.length, 0),
    groups,
  };
}

export async function getSearchResults(query: string): Promise<GroupedSearchResults> {
  const response = await apiRequestOptional<GroupedSearchResults>(`/search?q=${encodeURIComponent(query)}`);
  if (response) {
    return response;
  }
  return groupSearchResults(
    [
      ...demoSearchIndex,
      ...demoSupportTickets.map((ticket) => ({
        id: ticket.id,
        entity: 'Support Ticket',
        title: ticket.title,
        subtitle: ticket.ticketNumber,
        module: 'Support',
        status: ticket.status,
      })),
    ].filter((item) => item.title.toLowerCase().includes(query.toLowerCase()) || item.subtitle?.toLowerCase().includes(query.toLowerCase())),
    query
  );
}

export async function getRmsSummary(): Promise<RmsSummary> {
  return (await apiRequestOptional<RmsSummary>('/rms/summary')) ?? demoRmsSummary;
}

export async function getRmsRecords(): Promise<PaginatedResponse<RmsRecord>> {
  return (await apiRequestOptional<PaginatedResponse<RmsRecord>>('/rms/records')) ?? fallbackPaginated(demoRmsRecords);
}

export async function getNerisValidationQueue(): Promise<PaginatedResponse<NerisValidationQueueItem>> {
  return (await apiRequestOptional<PaginatedResponse<NerisValidationQueueItem>>('/rms/neris/queue')) ?? fallbackPaginated(demoNerisQueue);
}

export async function getEpcrExchangeQueue(): Promise<PaginatedResponse<EpcrExchangeItem>> {
  return (await apiRequestOptional<PaginatedResponse<EpcrExchangeItem>>('/rms/epcr/queue')) ?? fallbackPaginated(demoEpcrQueue);
}

export async function getUsers(): Promise<PaginatedResponse<User>> {
  return (await apiRequestOptional<PaginatedResponse<User>>('/users')) ?? fallbackPaginated(demoUsers);
}

export async function getRoles(): Promise<PaginatedResponse<Role>> {
  return (await apiRequestOptional<PaginatedResponse<Role>>('/roles')) ?? fallbackPaginated(demoRoles);
}

export async function getPermissions(): Promise<PaginatedResponse<Permission>> {
  return (await apiRequestOptional<PaginatedResponse<Permission>>('/permissions')) ?? fallbackPaginated(demoPermissions);
}

export async function getRbacMatrix() {
  return (
    (await apiRequestOptional('/rbac/matrix')) ?? {
      roles: demoRoles,
      permissions: demoPermissions,
      matrix: demoRoles.map((role) => ({
        roleId: role.id,
        permissions: demoPermissions.slice(0, role.name === 'District Admin' ? demoPermissions.length : 8).map((permission) => permission.code),
      })),
    }
  );
}

export async function getPlatformUsersAndRoles() {
  const [users, roles, permissions] = await Promise.all([getUsers(), getRoles(), getPermissions()]);
  return { users, roles, permissions };
}

export async function getAiInsights(): Promise<PaginatedResponse<AiInsight>> {
  return (await apiRequestOptional<PaginatedResponse<AiInsight>>('/ai/insights')) ?? fallbackPaginated(demoAiInsights);
}

export async function getSupportTickets(): Promise<PaginatedResponse<SupportTicket>> {
  return (await apiRequestOptional<PaginatedResponse<SupportTicket>>('/support/tickets')) ?? fallbackPaginated(demoSupportTickets);
}

export async function getAdminTrustCenter(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/trust-center')) ?? {
    activeUsers: demoUsers.filter((user) => user.isActive).length,
    disabledUsers: demoUsers.filter((user) => !user.isActive).length,
    adminUsers: 2,
    rolesCount: demoRoles.length,
    permissionsCount: demoPermissions.length,
    riskyPermissions: 8,
    mfaAdoptionPlaceholder: demoUsers.filter((user) => (user as any).mfaEnabled).length,
    ssoStatus: 'Active',
    openAccessReviews: 2,
    auditEventsToday: demoAuditLogs.length,
    sensitiveAccessCount: 12,
    openSecurityIncidents: 3,
    openVulnerabilities: 6,
    backupStatus: 'Healthy',
    rtoMinutes: 240,
    rpoMinutes: 15,
    supportSlaStatus: 'On Track',
    uptime: 99.8,
    compliancePosture: { nistMapped: 5, cjisMapped: 3, hipaaMapped: 2, soc2Ready: 4 },
    recommendedActions: ['Review access reviews', 'Triage open vulnerabilities'],
    summaryCards: [
      { label: 'Users', value: demoUsers.length },
      { label: 'Roles', value: demoRoles.length },
      { label: 'Permissions', value: demoPermissions.length },
      { label: 'Audit events today', value: demoAuditLogs.length },
    ],
  };
}

export async function getSecuritySummary(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/security-summary')) ?? await getAdminTrustCenter();
}

export async function getComplianceSummary(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/compliance-summary')) ?? await getAdminTrustCenter();
}

export async function getSlaSummary(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/sla-summary')) ?? await getAdminTrustCenter();
}

export async function getAdminTenant(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/tenant')) ?? demoTenant;
}

export async function updateAdminTenant(data: Record<string, unknown>) {
  return apiRequest('/admin/tenant', { method: 'PUT', body: JSON.stringify(data) });
}

export async function getAdminUsers(query: Record<string, unknown> = {}): Promise<PaginatedResponse<any>> {
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && String(value).length) search.set(key, String(value));
  });
  return (await apiRequestOptional<PaginatedResponse<any>>(`/admin/users?${search.toString()}`)) ?? { items: demoUsers as any, page: 1, take: demoUsers.length, total: demoUsers.length };
}

export async function getAdminUser(id: string): Promise<any> {
  return (await apiRequestOptional<any>(`/admin/users/${id}`)) ?? demoUsers.find((user) => user.id === id) ?? null;
}

export async function updateAdminUser(id: string, data: Record<string, unknown>) {
  return apiRequest(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function createAdminUser(data: Record<string, unknown>) {
  return apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(data) });
}

export async function setAdminUserStatus(id: string, action: 'disable' | 'enable' | 'lock' | 'unlock') {
  return apiRequest(`/admin/users/${id}/${action}`, { method: 'POST' });
}

export async function assignAdminUserRoles(id: string, roleIds: string[]) {
  return apiRequest(`/admin/users/${id}/roles`, { method: 'POST', body: JSON.stringify({ roleIds }) });
}

export async function removeAdminUserRole(id: string, roleId: string) {
  return apiRequest(`/admin/users/${id}/roles/${roleId}`, { method: 'DELETE' });
}

export async function getMfaStatus(): Promise<{ enabled: boolean; pending: boolean }> {
  return (await apiRequestOptional<{ enabled: boolean; pending: boolean }>('/auth/mfa/status')) ?? { enabled: false, pending: false };
}
export async function mfaSetup(): Promise<{ secret: string; otpauth: string; issuer: string; account: string }> {
  return apiRequest('/auth/mfa/setup', { method: 'POST' });
}
export async function mfaActivate(token: string) {
  return apiRequest('/auth/mfa/activate', { method: 'POST', body: JSON.stringify({ token }) });
}
export async function mfaDisable(token: string) {
  return apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ token }) });
}

export async function getAdminRoles(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/roles')) ?? { items: demoRoles as any, page: 1, take: demoRoles.length, total: demoRoles.length };
}

export async function getAdminPermissions(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/permissions')) ?? { items: demoPermissions as any, page: 1, take: demoPermissions.length, total: demoPermissions.length };
}

export async function getAdminRbacMatrix(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/rbac-matrix')) ?? { roles: demoRoles, permissions: demoPermissions, matrix: demoRoles.map((role) => ({ roleId: role.id, permissions: demoPermissions.slice(0, 8).map((permission) => permission.code) })) };
}

export async function getAccessReviews(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/access-reviews')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getSensitiveAccessLogs(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/sensitive-access-logs')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getSessionLogs(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/session-logs')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getPasswordPolicy(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/password-policy')) ?? { minLength: 14, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecial: true, rotationDays: 180, lockoutThreshold: 5, lockoutMinutes: 30 };
}

export async function getMfaPolicy(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/mfa-policy')) ?? { requiredForAllUsers: false, requiredForAdmins: true, allowedMethodsJson: ['TOTP', 'Push', 'FIDO2'], gracePeriodDays: 7, status: 'Implemented' };
}

export async function getSsoConfig(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/sso')) ?? { items: [{ id: 'sso-entra', providerName: 'Microsoft Entra ID', status: 'Active' }] };
}

export async function getSecurityControls(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/security-controls')) ?? { items: [] };
}

export async function getComplianceMapping(framework?: string): Promise<any> {
  const path = framework ? `/admin/compliance-mapping/${encodeURIComponent(framework)}` : '/admin/compliance-mapping';
  return (await apiRequestOptional<any>(path)) ?? { items: [] };
}

export async function getBackupPolicy(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/backup-policy')) ?? { backupFrequency: 'Daily', retentionDays: 30, encryptionEnabled: true, lastBackupAt: null, lastRestoreTestAt: null, status: 'Healthy', rpoMinutes: 15, rtoMinutes: 240 };
}

export async function getDrPlan(): Promise<any> {
  return (await apiRequestOptional<any>('/admin/dr-plan')) ?? { planName: 'MissionOS DR Plan', status: 'Active', rtoMinutes: 240, rpoMinutes: 15, lastTestedAt: null, ownerTeam: 'IT / Operations', summary: 'Placeholder' };
}

export async function getSecurityIncidents(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/security-incidents')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getVulnerabilities(): Promise<PaginatedResponse<any>> {
  return (await apiRequestOptional<PaginatedResponse<any>>('/admin/vulnerabilities')) ?? { items: [], page: 1, take: 50, total: 0 };
}

export async function getSlaPolicies(): Promise<any> {
  return (await apiRequestOptional<any>('/support/sla-policies')) ?? { items: [] };
}

export async function getEscalationPaths(): Promise<any> {
  return (await apiRequestOptional<any>('/support/escalation-paths')) ?? { items: [] };
}

export async function getSystemStatus(): Promise<any> {
  return (await apiRequestOptional<any>('/support/system-status')) ?? { items: [] };
}

export async function getTenants(): Promise<Tenant[]> {
  const response = await apiRequestOptional<Tenant[]>('/tenants');
  return response ?? [demoTenant];
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
  localStorage.removeItem('missionos_token');
  localStorage.removeItem('missionos_refresh_token');
}
