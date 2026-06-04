export type Status = 'Healthy' | 'Warning' | 'Critical' | 'Offline' | 'Online' | 'Degraded' | 'Draft' | 'Submitted' | 'Closed' | 'Open' | 'Overdue' | 'Scheduled' | 'In Review' | 'QA Needed' | 'Passed';

export type RoleName =
  | 'Firefighter'
  | 'Company Officer'
  | 'Battalion Chief'
  | 'Training Admin'
  | 'Prevention Officer'
  | 'Logistics Manager'
  | 'District Admin'
  | 'System Admin'
  | 'Read-Only Auditor'
  | 'Engineer'
  | 'Captain'
  | 'Lieutenant'
  | 'Training Officer'
  | 'Logistics Technician';

export type PersonnelStatus = 'Active' | 'Leave' | 'Training' | 'Light Duty' | 'Retired';
export type TrainingStatus = 'Assigned' | 'In Progress' | 'Completed' | 'Overdue' | 'Waived' | 'Needs Remediation';
export type TrainingAttendanceStatus = 'Assigned' | 'Attended' | 'Missed' | 'Excused' | 'Completed' | 'Failed' | 'Needs Remediation';
export type IncidentState = 'Draft' | 'Submitted' | 'QA Needed' | 'Approved' | 'Closed' | 'Exported';
export type Priority = 'Low' | 'Normal' | 'High' | 'Critical';
export type AssetStatus = 'Ready' | 'Maintenance Warning' | 'Out of Service' | 'Retired' | 'Warning' | 'Maintenance Due';
export type ApparatusStatus = 'Ready' | 'Warning' | 'Out of Service' | 'Maintenance Due' | 'Retired';
export type InventoryStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Expiring Soon' | 'Expired';
export type MaintenanceStatus = 'Reported' | 'Scheduled' | 'In Progress' | 'Completed' | 'Deferred' | 'Cancelled';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Extreme';
export type IntegrationState = 'Healthy' | 'Degraded' | 'Failed' | 'Paused' | 'Online' | 'Offline';
export type SupportState = 'Open' | 'In Progress' | 'Waiting On Customer' | 'Resolved' | 'Closed';
export type ReadinessState = 'READY' | 'WARNING' | 'OUT_OF_SERVICE' | 'MAINTENANCE_DUE' | 'RETIRED';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors: string[];
  meta?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  take: number;
  total: number;
}

export interface GlobalSearchResult {
  id: string;
  entity: string;
  title: string;
  subtitle?: string;
  module: string;
  status?: string;
  score?: number;
  href?: string;
}

export interface GlobalSearchGroup {
  entity: string;
  label: string;
  items: GlobalSearchResult[];
}

export interface GroupedSearchResults {
  query: string;
  total: number;
  groups: GlobalSearchGroup[];
}

export interface Tenant {
  id: string;
  code: string;
  name: string;
  type?: string;
  status?: string;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  timezone: string;
  dataRegion?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  personnelId?: string | null;
  status?: string;
  isActive: boolean;
  mfaEnabled?: boolean;
  ssoProvider?: string | null;
  passwordHash?: string | null;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Role {
  id: string;
  tenantId?: string | null;
  name: RoleName | string;
  code: string;
  description?: string | null;
  roleType?: string;
  isSystemRole?: boolean;
  assignedUsersCount?: number;
  permissionCount?: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  name: string;
  description?: string | null;
  riskLevel?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRole {
  userId: string;
  roleId: string;
  createdAt?: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string | null;
  module?: string;
  action: string;
  entityName?: string;
  entityId?: string | null;
  severity?: string;
  before?: unknown;
  after?: unknown;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string | null;
  personnelId?: string | null;
  title: string;
  message: string;
  notificationType: string;
  isRead: boolean;
  createdAt: string;
}

export interface Battalion {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  chiefName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ShiftPlatoon {
  id: string;
  tenantId: string;
  code: 'A' | 'B' | 'C';
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepartmentUnit {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Station {
  id: string;
  tenantId?: string;
  number?: number;
  name: string;
  city: string;
  readiness: number;
  staffingGap: number;
  apparatusReady: number;
  openInspections: number;
  status: Status;
  staffingStatus?: string;
  address?: string;
  battalion?: string;
  responseArea?: string;
  readinessScore?: number;
  readinessStatus?: ReadinessState;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Rank {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  sortOrder?: number;
  level?: number;
  category?: string;
  isOfficerRank?: boolean;
  isCommandRank?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelAssignment {
  id: string;
  tenantId: string;
  personnelId: string;
  stationId: string;
  platoonCode?: 'A' | 'B' | 'C' | string;
  assignmentType?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelAssignmentHistory {
  id: string;
  tenantId: string;
  personnelId: string;
  stationId: string;
  shiftPlatoonId?: string | null;
  rankId?: string | null;
  startDate?: string;
  endDate?: string | null;
  assignmentType?: string | null;
  reason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface PersonnelCertification {
  id: string;
  tenantId: string;
  personnelId: string;
  certificationId: string;
  certification?: Certification | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  status: string;
  documentUrl?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelPerformanceReview {
  id: string;
  tenantId: string;
  personnelId: string;
  reviewPeriod: string;
  rating?: number | null;
  reviewerName?: string | null;
  reviewerPersonnelId?: string | null;
  overallRating?: number | null;
  leadershipRating?: number | null;
  clinicalRating?: number | null;
  operationalRating?: number | null;
  documentationRating?: number | null;
  teamworkRating?: number | null;
  safetyRating?: number | null;
  comments?: string | null;
  notes?: string | null;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelGoal {
  id: string;
  tenantId: string;
  personnelId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status: string;
  progressPercent?: number;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelNote {
  id: string;
  tenantId: string;
  personnelId: string;
  noteType: string;
  visibility: string;
  title: string;
  body: string;
  createdBy?: string | null;
  createdAt?: string;
}

export interface PersonnelDocument {
  id: string;
  tenantId: string;
  personnelId: string;
  documentType: string;
  title: string;
  fileName?: string | null;
  fileUrl?: string | null;
  expiryDate?: string | null;
  uploadedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonnelReadinessSnapshot {
  id: string;
  tenantId: string;
  personnelId: string;
  snapshotDate: string;
  trainingScore: number;
  certificationScore: number;
  staffingReliabilityScore: number;
  incidentDocumentationScore: number;
  performanceScore: number;
  overtimeRiskScore: number;
  overallReadinessScore: number;
  riskLevel: 'Ready' | 'Watch' | 'At Risk' | 'Critical' | string;
  evidenceSummary: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingNeedAssessment {
  id: string;
  tenantId: string;
  title: string;
  needType: string;
  sourceType: string;
  sourceEntityId?: string | null;
  stationId?: string | null;
  requiredCourseId?: string | null;
  requiredCertificationId?: string | null;
  severity: string;
  priority: string;
  description: string;
  evidenceSummary: string;
  recommendedAction: string;
  status: string;
  readinessImpact?: number;
  affectedPersonnel?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainerRecommendation {
  id: string;
  tenantId: string;
  trainingNeedAssessmentId: string;
  courseId: string;
  trainerPersonnelId: string;
  suitabilityScore: number;
  reasonSummary: string;
  availabilityScore: number;
  expertiseScore: number;
  performanceScore: number;
  workloadScore: number;
  createdAt?: string;
}

export interface TraineeRecommendation {
  id: string;
  tenantId: string;
  trainingNeedAssessmentId: string;
  courseId: string;
  personnelId: string;
  suitabilityScore: number;
  gapReason: string;
  urgencyScore: number;
  readinessImpactScore: number;
  stationCoverageImpact: string;
  createdAt?: string;
}

export interface TrainingOutcome {
  id: string;
  tenantId: string;
  assignmentId: string;
  personnelId: string;
  courseId: string;
  preAssessmentScore?: number | null;
  postAssessmentScore?: number | null;
  passed: boolean;
  improvementScore?: number | null;
  instructorFeedback?: string | null;
  readinessImpact: number;
  createdAt?: string;
}

export interface PerformanceSummary {
  attendanceRate: number;
  incidentParticipation: number;
  certificationCompliance: number;
  overtimeHours: number;
  readinessScore: number;
  openActions: number;
}

export interface Personnel {
  id: string;
  tenantId?: string;
  employeeNumber?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  rank: string;
  roleTitle?: string;
  role: string;
  station: string;
  currentStationId?: string | null;
  currentShiftPlatoonId?: string | null;
  battalionId?: string | null;
  platoon?: 'A' | 'B' | 'C' | string;
  email?: string | null;
  phone?: string | null;
  yearsOfService?: number;
  supervisorPersonnelId?: string | null;
  status?: PersonnelStatus | string;
  certStatus?: string;
  readiness?: number;
  readinessScore?: number;
  expiringCerts?: number;
  incidents?: number;
  attendance?: number;
  employmentStatus?: string;
  readinessStatus?: string;
  certifications?: PersonnelCertification[];
  assignments?: PersonnelAssignment[];
  assignmentHistory?: PersonnelAssignmentHistory[];
  documents?: PersonnelDocument[];
  performanceSummary?: PerformanceSummary;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Certification {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  code?: string;
  validityMonths?: number | null;
  issuingAuthority?: string | null;
  requiredForRanks?: string[];
  requiredForRoles?: string[];
  isRequired: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  id: string;
  tenantId: string;
  title: string;
  code?: string;
  category: string;
  description?: string | null;
  deliveryType?: string;
  durationHours?: number;
  requiredForRoles?: string[];
  requiredForRanks?: string[];
  requiredCertifications?: string[];
  relatedCertifications?: string[];
  relatedIncidentTypes?: string[];
  relatedAssets?: string[];
  relatedPreventionAreas?: string[];
  complianceCriticality?: 'Low' | 'Moderate' | 'High' | 'Critical' | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseSession {
  id: string;
  tenantId: string;
  courseId: string;
  trainerPersonnelId: string;
  stationId?: string | null;
  startDateTime: string;
  endDateTime: string;
  capacity: number;
  deliveryLocation?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingAssignment {
  id: string;
  tenantId: string;
  courseId: string;
  course?: Course | null;
  sessionId?: string | null;
  session?: CourseSession | null;
  personnelId: string;
  assignedBy?: string | null;
  assignmentReason?: string | null;
  priority?: string;
  dueDate?: string | null;
  status: TrainingStatus | string;
  completedAt?: string | null;
  score?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingAttendance {
  id: string;
  tenantId: string;
  sessionId: string;
  session?: CourseSession & { course?: Course | null } | null;
  personnelId: string;
  attendanceStatus: TrainingAttendanceStatus | string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  participationScore?: number | null;
  instructorNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CertificationRenewal {
  id: string;
  tenantId: string;
  personnelId: string;
  certificationId: string;
  renewalDate: string;
  newExpiryDate?: string | null;
  status: string;
  completedBy?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstructorProfile {
  id: string;
  tenantId: string;
  personnelId: string;
  bio?: string | null;
  specialties?: string[];
  certifications?: string[];
  teachingHistory: number;
  availability?: string | null;
  workloadRisk?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Incident {
  id: string;
  tenantId?: string;
  incidentNumber?: string;
  type?: string;
  incidentType?: string;
  recordType?: string;
  reportNumber?: string;
  patientCount?: number;
  assignedTo?: string;
  station?: string;
  stationId?: string | null;
  location?: string;
  city?: string;
  status: IncidentState | string;
  qaStatus?: string;
  qaReviewedAt?: string | null;
  source?: string;
  units?: string[];
  priority?: string;
  time?: string;
  dispatchAt?: string | null;
  arrivalAt?: string | null;
  clearedAt?: string | null;
  lastUpdatedAt?: string | null;
  turnaroundMinutes?: number | null;
  nerisStatus?: string;
  epcrStatus?: string;
  nerisReady?: boolean;
  epcrLinked?: boolean;
  narrativeComplete?: boolean;
  attachmentsComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentUnit {
  id: string;
  tenantId: string;
  incidentId: string;
  apparatusId?: string | null;
  unitName: string;
  role?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentPersonnel {
  id: string;
  tenantId: string;
  incidentId: string;
  personnelId: string;
  roleAtIncident: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentTimelineEvent {
  id: string;
  tenantId: string;
  incidentId: string;
  eventTime: string;
  eventType: string;
  notes?: string | null;
  createdAt?: string;
}

export interface IncidentNarrative {
  id: string;
  tenantId: string;
  incidentId: string;
  authorName: string;
  narrative: string;
  createdAt?: string;
}

export interface IncidentQaReview {
  id: string;
  tenantId: string;
  incidentId: string;
  reviewerName: string;
  status: string;
  notes?: string | null;
  reviewedAt?: string;
  createdAt?: string;
}

export interface IncidentAttachment {
  id: string;
  tenantId: string;
  incidentId: string;
  fileName: string;
  fileUrl?: string | null;
  fileType?: string | null;
  createdAt?: string;
}

export interface EpcrLink {
  id: string;
  tenantId: string;
  incidentId: string;
  externalEpcrId: string;
  vendorName: string;
  syncStatus: string;
  accessRestricted?: boolean;
  hipaaWarning?: boolean;
  sensitiveAccessLogCount?: number;
  lastAccessedAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface NerisMapping {
  id: string;
  tenantId: string;
  internalField: string;
  nerisField: string;
  required: boolean;
  validationRule?: string | null;
  validationStatus?: string | null;
  exportReadiness?: number | null;
  lastExportedAt?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NerisExportLog {
  id: string;
  tenantId: string;
  incidentId: string;
  status: string;
  payload?: Record<string, unknown> | null;
  exportedAt?: string;
  createdAt?: string;
}

export interface CadImportLog {
  id: string;
  tenantId: string;
  incidentId?: string | null;
  sourceSystem: string;
  externalId: string;
  status: string;
  payload?: Record<string, unknown> | null;
  importedAt?: string;
  createdAt?: string;
}

export interface IncidentDataQualityIssue {
  id: string;
  tenantId: string;
  incidentId: string;
  category: string;
  severity: Priority | string;
  status: string;
  fieldName?: string | null;
  issueDescription: string;
  resolutionNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentDuplicateCandidate {
  id: string;
  tenantId: string;
  incidentId: string;
  candidateIncidentId: string;
  candidateIncidentNumber: string;
  confidence: number;
  qualitySignals?: Record<string, unknown> | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IncidentDetail extends Omit<Incident, 'station'> {
  stationName?: string | null;
  battalionName?: string | null;
  unitsDetailed?: Array<Record<string, unknown>>;
  personnelDetailed?: Array<Record<string, unknown>>;
  timeline?: IncidentTimelineEvent[];
  narratives?: IncidentNarrative[];
  qaReviews?: IncidentQaReview[];
  attachments?: IncidentAttachment[];
  epcrLinks?: EpcrLink[];
  nerisExports?: NerisExportLog[];
  dataQualityIssues?: IncidentDataQualityIssue[];
  duplicateCandidates?: IncidentDuplicateCandidate[];
  station?: Record<string, unknown> | string | null;
  battalion?: Record<string, unknown> | string | null;
  readinessImpact?: number;
  riskWarnings?: string[];
}

export interface RmsRecord {
  id: string;
  tenantId?: string;
  incidentNumber: string;
  reportNumber: string;
  recordType: 'Incident Report' | 'EMS Run' | 'Fire Report' | 'Support Record';
  station: string;
  location: string;
  city?: string;
  status: IncidentState | string;
  qaStatus: 'Open' | 'In Review' | 'QA Needed' | 'Passed' | 'Returned';
  nerisStatus: 'Ready' | 'Queued' | 'Validated' | 'Rejected' | 'Transmitted';
  epcrStatus: 'Not Required' | 'Pending' | 'Linked' | 'Transmitted' | 'Failed';
  source: 'CAD Import' | 'Manual Entry' | 'Mobile Entry' | 'ePCR Sync';
  patientCount?: number;
  units?: string[];
  priority?: string;
  assignedTo?: string;
  lastUpdatedAt?: string;
  narrativeComplete?: boolean;
  attachmentsComplete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NerisValidationQueueItem {
  id: string;
  recordId: string;
  incidentNumber: string;
  validationState: 'Pending' | 'Queued' | 'Validated' | 'Rejected';
  issueCount: number;
  lastSubmittedAt?: string;
  nextRetryAt?: string | null;
  classification: string;
  transmissionStatus: 'Queued' | 'Retrying' | 'Complete' | 'Blocked';
}

export interface EpcrExchangeItem {
  id: string;
  recordId: string;
  incidentNumber: string;
  exchangeStatus: 'Pending' | 'Linked' | 'Synced' | 'Failed';
  patientCount: number;
  transportType: string;
  payerStatus: 'Unknown' | 'Pending' | 'Verified' | 'Rejected';
  lastSyncedAt?: string;
  endpoint: string;
}

export interface Apparatus {
  id: string;
  tenantId?: string;
  stationId?: string | null;
  unitNumber: string;
  name?: string;
  callSign?: string | null;
  apparatusType: string;
  apparatusTypeId?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  vin?: string | null;
  licensePlate?: string | null;
  engineHours?: number | null;
  status: ReadinessState | ApparatusStatus | AssetStatus | string;
  readinessScore?: number;
  mileage?: number | null;
  lastInspectionDate?: string | null;
  lastInspectionAt?: string | null;
  nextInspectionDue?: string | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDue?: string | null;
  nextMaintenanceAt?: string | null;
  assignedCrewShift?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Asset {
  id: string;
  tenantId?: string;
  assetTag?: string;
  name: string;
  category?: string;
  subcategory?: string | null;
  type?: string;
  station?: string;
  stationId?: string | null;
  apparatusId?: string | null;
  assignedTo?: string;
  assignedToPersonnelId?: string | null;
  serialNumber?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  purchaseDate?: string | null;
  warrantyExpiryDate?: string | null;
  usefulLifeMonths?: number | null;
  condition?: string | null;
  locationType?: string | null;
  locationDescription?: string | null;
  readinessImpact?: number;
  replacementCost?: number | string | null;
  status: AssetStatus | Status | ApparatusStatus | string;
  readiness?: number;
  maintenance?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface InventoryItem {
  id: string;
  tenantId?: string;
  stationId?: string | null;
  apparatusId?: string | null;
  vendorId?: string | null;
  sku: string;
  name: string;
  category: string;
  unitOfMeasure?: string;
  unit?: string;
  quantity: number;
  quantityOnHand?: number;
  reorderPoint: number;
  reorderQuantity?: number | null;
  maxStockLevel?: number | null;
  expirationDate?: string | null;
  expiresAt?: string | null;
  lotNumber?: string | null;
  readinessCriticality?: Priority | string;
  status?: InventoryStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApparatusType {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  requiredCrewCount?: number;
  requiresDriverOperator?: boolean;
  requiresParamedic?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface EquipmentCategory {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  readinessCriticality?: Priority | string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface InventoryTransaction {
  id: string;
  tenantId: string;
  inventoryItemId: string;
  transactionType: string;
  quantity: number;
  fromStationId?: string | null;
  toStationId?: string | null;
  apparatusId?: string | null;
  performedByPersonnelId?: string | null;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  transactionDate: string;
  createdAt?: string;
}

export interface MaintenanceEvent {
  id: string;
  tenantId: string;
  apparatusId?: string | null;
  assetId?: string | null;
  title: string;
  description?: string | null;
  maintenanceType?: string | null;
  status: MaintenanceStatus | string;
  priority: Priority | string;
  reportedByPersonnelId?: string | null;
  assignedToPersonnelId?: string | null;
  vendorId?: string | null;
  reportedDate: string;
  scheduledDate?: string | null;
  startedDate?: string | null;
  completedDate?: string | null;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  downtimeHours?: number | string | null;
  resolutionNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface PreventiveMaintenanceSchedule {
  id: string;
  tenantId: string;
  apparatusId?: string | null;
  assetId?: string | null;
  maintenanceName: string;
  frequencyType: string;
  frequencyValue: number;
  lastCompletedDate?: string | null;
  nextDueDate: string;
  status: string;
  assignedToPersonnelId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface Vendor {
  id: string;
  tenantId: string;
  name: string;
  vendorType: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  serviceCategories?: string[];
  preferredVendor?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface PurchaseReorderRecommendation {
  id: string;
  tenantId: string;
  inventoryItemId: string;
  stationId?: string | null;
  apparatusId?: string | null;
  recommendedQuantity: number;
  reason: string;
  priority: Priority | string;
  estimatedCost?: number | string | null;
  vendorId?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface AssetReadinessSnapshot {
  id: string;
  tenantId: string;
  stationId?: string | null;
  apparatusId?: string | null;
  snapshotDate: string;
  apparatusReadinessScore: number;
  equipmentReadinessScore: number;
  inventoryReadinessScore: number;
  maintenanceRiskScore: number;
  overallAssetReadinessScore: number;
  riskLevel: RiskLevel | string;
  evidenceSummary: string;
  createdAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Property {
  id: string;
  tenantId?: string;
  name: string;
  address: string;
  city: string;
  occupancyType: string;
  riskLevel: RiskLevel | string;
  stationArea?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  isDeleted?: boolean;
}

export interface Occupancy {
  id: string;
  tenantId: string;
  propertyId: string;
  occupancyName: string;
  occupantLoad?: number | null;
  riskLevel: RiskLevel | string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Inspection {
  id: string;
  tenantId?: string;
  property?: string;
  propertyId?: string;
  city?: string;
  risk?: string;
  status: Status | string;
  due?: string;
  violations?: number;
  preplan?: boolean;
  inspectionType?: string;
  scheduledAt?: string;
  inspectorName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Permit {
  id: string;
  tenantId: string;
  propertyId: string;
  permitNumber: string;
  permitType: string;
  status: Status | string;
  submittedAt?: string;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Preplan {
  id: string;
  tenantId: string;
  propertyId: string;
  title: string;
  summary: string;
  hazards: string[];
  hydrantNotes?: string | null;
  updatedAt?: string;
}

export interface IntegrationSystem {
  id?: string;
  tenantId?: string;
  name: string;
  systemType?: string;
  status: IntegrationState | string;
  exchangeMethod?: string;
  apiBaseUrl?: string | null;
  authMethod?: string | null;
  rateLimitPerMinute?: number | null;
  lastSyncAt?: string | null;
  method?: string;
  latency?: string;
  lastSync?: string;
  auth?: string;
  rateLimit?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationLog {
  id: string;
  tenantId: string;
  integrationId: string;
  status: string;
  message: string;
  payload?: unknown;
  durationMs?: number | null;
  createdAt: string;
}

export interface ReportDefinition {
  id: string;
  tenantId: string;
  name: string;
  module: string;
  definition: Record<string, unknown>;
  code?: string;
  category?: string;
  description?: string;
  sourceModules?: string[];
  availableFieldsJson?: unknown;
  defaultFiltersJson?: unknown;
  defaultColumnsJson?: unknown;
  supportsExport?: boolean;
  supportsSchedule?: boolean;
  isSystemReport?: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface SavedReport {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  reportType: string;
  category: string;
  ownerUserId?: string | null;
  reportDefinitionId?: string | null;
  visibility: string;
  filtersJson: Record<string, unknown>;
  columnsJson: string[];
  sortJson?: Record<string, unknown> | null;
  chartConfigJson?: Record<string, unknown> | null;
  scheduleEnabled: boolean;
  scheduleFrequency?: string | null;
  lastRunAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface ReportExport {
  id: string;
  tenantId: string;
  savedReportId?: string | null;
  reportDefinitionId?: string | null;
  requestedByUserId?: string | null;
  exportFormat: string;
  status: string;
  fileUrl?: string | null;
  rowCount?: number | null;
  requestedAt?: string;
  completedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
}

export interface DashboardWidget {
  id: string;
  tenantId: string;
  dashboardCode: string;
  widgetCode: string;
  title: string;
  widgetType: string;
  sourceModule: string;
  configJson: Record<string, unknown>;
  positionJson: Record<string, unknown>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsSnapshot {
  id: string;
  tenantId: string;
  snapshotDate: string;
  snapshotType: string;
  stationId?: string | null;
  personnelId?: string | null;
  module: string;
  metricsJson: Record<string, unknown>;
  riskLevel?: string | null;
  createdAt?: string;
}

export interface DataQualityCheck {
  id: string;
  tenantId: string;
  checkCode: string;
  module: string;
  entityName: string;
  title: string;
  description: string;
  severity: Priority | string;
  status: string;
  affectedRecordCount: number;
  lastRunAt?: string | null;
  resultsJson?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface DataQualityIssue {
  id: string;
  tenantId: string;
  checkId?: string | null;
  module: string;
  entityName: string;
  entityId: string;
  issueType: string;
  severity: Priority | string;
  title: string;
  description: string;
  recommendedFix: string;
  status: string;
  detectedAt: string;
  resolvedAt?: string | null;
  resolvedByUserId?: string | null;
}

export interface DuplicateRecordCandidate {
  id: string;
  tenantId: string;
  module: string;
  entityName: string;
  primaryEntityId: string;
  duplicateEntityId: string;
  matchScore: number;
  matchReason: string;
  status: string;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
}

export interface ReportSchedule {
  id: string;
  tenantId: string;
  savedReportId: string;
  frequency: string;
  recipientsJson: string[];
  nextRunAt: string;
  lastRunAt?: string | null;
  status: string;
  reportName?: string;
  ownerUserId?: string | null;
  deliveryMethod?: string;
  recipients?: string[];
  exportHistoryCount?: number;
  exportHistory?: Array<{
    id: string;
    status: string;
    exportFormat: string;
    requestedAt?: string | null;
    completedAt?: string | null;
    rowCount?: number | null;
  }>;
  lastGeneratedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AnalyticsKpiDefinition {
  id: string;
  tenantId: string;
  kpiCode: string;
  name: string;
  module: string;
  description: string;
  calculationMethod: string;
  targetValue?: number | null;
  warningThreshold?: number | null;
  criticalThreshold?: number | null;
  unitLabel?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiInsight {
  id: string;
  tenantId?: string;
  category?: string;
  title: string;
  summary: string;
  severity: 'Info' | 'Warning' | 'Critical' | string;
  confidence?: number;
  confidenceScore?: number;
  impact?: string;
  dataSources?: string[];
  sources?: string[];
  recommendedActions?: string[];
  action?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}

export interface SupportTicket {
  id: string;
  tenantId?: string;
  ticketNumber?: string;
  title: string;
  description?: string;
  severity: string;
  status: SupportState | string;
  module?: string;
  requesterName?: string | null;
  assignedTo?: string | null;
  requesterUserId?: string | null;
  assignedToUserId?: string | null;
  firstResponseDueAt?: string | null;
  resolutionDueAt?: string | null;
  slaDueAt?: string | null;
  slaStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  tenant: Tenant;
  stationCount: number;
  personnelCount: number;
  apparatusCount: number;
  propertyCount: number;
  notificationCount: number;
  openAlerts: number;
  integrationHealth: {
    healthy: number;
    degraded: number;
    failed: number;
  };
  readiness: {
    agencyAverage: number;
    criticalStations: number;
    expiringCertifications: number;
    openStaffingGaps: number;
  };
  personnelReadiness?: {
    ready: number;
    watch: number;
    atRisk: number;
    critical: number;
    average: number;
  };
}

export interface RmsSummary {
  incidentCount: number;
  openRecords: number;
  qaNeeded: number;
  nerisQueued: number;
  nerisRejected: number;
  epcrLinked: number;
  epcrFailed: number;
  averageTurnaroundMinutes: number;
  draftExports: number;
}

export interface IncidentCommandCenter {
  summary: {
    totalIncidents: number;
    draft: number;
    submitted: number;
    qaNeeded: number;
    approved: number;
    closed: number;
    exported: number;
    nerisReady: number;
    epcrLinked: number;
    openDataQualityIssues: number;
    duplicateCandidates: number;
  };
  incidents: Incident[];
  qaQueue: Incident[];
  nerisReady: Incident[];
  epcrQueue: Incident[];
  dataQualityIssues: IncidentDataQualityIssue[];
  duplicateCandidates: IncidentDuplicateCandidate[];
  readinessForecast: number;
}
