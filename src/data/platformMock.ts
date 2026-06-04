import type {
  AiInsight,
  Apparatus,
  AuditLog,
  Battalion,
  Certification,
  DashboardSummary,
  DepartmentUnit,
  GlobalSearchResult,
  IntegrationLog,
  IntegrationSystem,
  InventoryItem,
  Notification,
  Occupancy,
  Personnel,
  PersonnelCertification,
  PersonnelDocument,
  PersonnelAssignment,
  Permission,
  Property,
  Rank,
  ReadinessState,
  ReportDefinition,
  Role,
  RolePermission,
  RoleName,
  ShiftPlatoon,
  Station,
  SupportTicket,
  Tenant,
  User,
  UserRole,
} from '../types';

const now = Date.now();
const iso = (daysFromNow: number) => new Date(now + daysFromNow * 86400000).toISOString();
const historicalIso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();

// Sample tenant used for the MissionOS demo. MissionOS is multi-tenant; this is
// one configured agency, not the product itself. The Station 4 / Medic 4
// storyline lives inside this sample tenant.
export const demoTenant: Tenant = {
  id: 'tenant-west-metro',
  code: 'WMFPD',
  name: 'West Metro Fire & EMS (Sample Agency)',
  timezone: 'America/Denver',
  createdAt: historicalIso(1200),
  updatedAt: historicalIso(1),
};

export const demoBattalions: Battalion[] = Array.from({ length: 3 }, (_, index) => ({
  id: `battalion-${index + 1}`,
  tenantId: demoTenant.id,
  code: `B${index + 1}`,
  name: `Battalion ${index + 1}`,
  chiefName: ['Chris Alvarez', 'Maya Chen', 'Jordan Fields'][index],
  createdAt: historicalIso(900),
  updatedAt: historicalIso(1),
}));

export const demoPlatoons: ShiftPlatoon[] = [
  { id: 'platoon-a', tenantId: demoTenant.id, code: 'A', name: 'A Shift', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'platoon-b', tenantId: demoTenant.id, code: 'B', name: 'B Shift', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'platoon-c', tenantId: demoTenant.id, code: 'C', name: 'C Shift', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
];

export const demoDepartmentUnits: DepartmentUnit[] = [
  { id: 'unit-ops', tenantId: demoTenant.id, code: 'OPS', name: 'Operations', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'unit-prevention', tenantId: demoTenant.id, code: 'PREV', name: 'Prevention', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'unit-training', tenantId: demoTenant.id, code: 'TRN', name: 'Training', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'unit-logistics', tenantId: demoTenant.id, code: 'LOG', name: 'Logistics', createdAt: historicalIso(900), updatedAt: historicalIso(1) },
];

export const demoPermissions: Permission[] = [
  'core.view',
  'dashboard.view',
  'personnel.view',
  'personnel.manage',
  'staffing.view',
  'staffing.manage',
  'training.view',
  'training.manage',
  'incidents.view',
  'incidents.manage',
  'incidents.qa',
  'neris.export',
  'epcr.view',
  'assets.view',
  'assets.manage',
  'prevention.view',
  'prevention.manage',
  'analytics.view',
  'analytics.export',
  'analytics.manage',
  'reports.view',
  'reports.create',
  'reports.export',
  'reports.schedule',
  'dataquality.view',
  'dataquality.manage',
  'duplicates.view',
  'duplicates.manage',
  'integrations.view',
  'integrations.manage',
  'admin.users',
  'admin.roles',
  'admin.audit',
  'support.view',
  'support.manage',
  'ai.view',
  'ai.manage',
].map((code) => {
  const [module] = code.split('.');
  return {
    id: `perm-${code}`,
    code,
    module,
    name: code.replace('.', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    description: `Allows ${code} access`,
    createdAt: historicalIso(900),
    updatedAt: historicalIso(1),
  };
});

const roleDefinitions: Array<{ code: RoleName; description: string; permissions: string[] }> = [
  { code: 'Firefighter', description: 'Front-line response member', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'incidents.view', 'assets.view', 'prevention.view'] },
  { code: 'Company Officer', description: 'Company-level supervisor', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'training.manage', 'incidents.view', 'incidents.manage', 'assets.view', 'prevention.view'] },
  { code: 'Battalion Chief', description: 'Command and operations oversight', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'personnel.manage', 'staffing.view', 'staffing.manage', 'training.view', 'training.manage', 'incidents.view', 'incidents.manage', 'incidents.qa', 'assets.view', 'assets.manage', 'prevention.view', 'analytics.view', 'reports.view', 'reports.export', 'dataquality.view', 'duplicates.view'] },
  { code: 'Training Admin', description: 'Training and certification admin', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'training.view', 'training.manage', 'analytics.view', 'analytics.export', 'reports.view', 'reports.create', 'reports.export', 'reports.schedule'] },
  { code: 'Prevention Officer', description: 'Inspection and permit lead', permissions: ['core.view', 'dashboard.view', 'prevention.view', 'prevention.manage', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view'] },
  { code: 'Logistics Manager', description: 'Asset and inventory admin', permissions: ['core.view', 'dashboard.view', 'assets.view', 'assets.manage', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view'] },
  { code: 'District Admin', description: 'District-wide administrator', permissions: demoPermissions.map((permission) => permission.code) },
  { code: 'System Admin', description: 'System and integration administrator', permissions: ['core.view', 'dashboard.view', 'integrations.view', 'integrations.manage', 'admin.users', 'admin.roles', 'admin.audit', 'support.view', 'support.manage', 'ai.view', 'ai.manage'] },
  { code: 'Read-Only Auditor', description: 'Read-only oversight user', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'incidents.view', 'assets.view', 'prevention.view', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view', 'integrations.view', 'admin.audit', 'support.view', 'ai.view'] },
];

export const demoRoles: Role[] = roleDefinitions.map((definition, index) => ({
  id: `role-${index + 1}`,
  tenantId: demoTenant.id,
  code: definition.code.replace(/\s+/g, '_').toLowerCase(),
  name: definition.code,
  description: definition.description,
  createdAt: historicalIso(900),
  updatedAt: historicalIso(1),
}));

export const demoRolePermissions: RolePermission[] = demoRoles.flatMap((role) =>
  roleDefinitions
    .find((definition) => definition.code === role.name)
    ?.permissions.map((permissionCode) => ({
      roleId: role.id,
      permissionId: `perm-${permissionCode}`,
      createdAt: historicalIso(900),
    })) ?? []
);

export const demoUsers: User[] = [
  { id: 'user-admin', tenantId: demoTenant.id, email: 'admin@westmetro.example', displayName: 'Dana Mitchell', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(1) },
  { id: 'user-chief', tenantId: demoTenant.id, email: 'chief@westmetro.example', displayName: 'Chris Alvarez', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(2) },
  { id: 'user-training', tenantId: demoTenant.id, email: 'training@westmetro.example', displayName: 'Maya Chen', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(2) },
  { id: 'user-prevention', tenantId: demoTenant.id, email: 'prevention@westmetro.example', displayName: 'Jordan Fields', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(3) },
  { id: 'user-logistics', tenantId: demoTenant.id, email: 'logistics@westmetro.example', displayName: 'Sam Brooks', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(3) },
  { id: 'user-auditor', tenantId: demoTenant.id, email: 'auditor@westmetro.example', displayName: 'Taylor Grant', isActive: true, createdAt: historicalIso(500), updatedAt: historicalIso(1), lastLoginAt: historicalIso(4) },
];

export const demoUserRoles: UserRole[] = [
  { userId: 'user-admin', roleId: 'role-7', createdAt: historicalIso(500) },
  { userId: 'user-chief', roleId: 'role-3', createdAt: historicalIso(500) },
  { userId: 'user-training', roleId: 'role-4', createdAt: historicalIso(500) },
  { userId: 'user-prevention', roleId: 'role-5', createdAt: historicalIso(500) },
  { userId: 'user-logistics', roleId: 'role-6', createdAt: historicalIso(500) },
  { userId: 'user-auditor', roleId: 'role-9', createdAt: historicalIso(500) },
];

export const demoStations: Station[] = Array.from({ length: 17 }, (_, index) => {
  const battalion = demoBattalions[Math.min(Math.floor(index / 6), demoBattalions.length - 1)];
  const readiness = 72 + ((index * 7) % 23);
  return {
    id: `station-${index + 1}`,
    tenantId: demoTenant.id,
    number: index + 1,
    name: `Station ${index + 1}`,
    city: index % 3 === 0 ? 'Lakewood' : index % 3 === 1 ? 'Wheat Ridge' : 'Golden',
    readiness: readiness,
    staffingGap: index % 5 === 0 ? 2 : index % 4 === 0 ? 1 : 0,
    apparatusReady: readiness + 4,
    openInspections: 2 + (index % 6),
    status: readiness >= 88 ? 'Healthy' : readiness >= 80 ? 'Warning' : 'Critical',
    address: `${1000 + index} West Metro Blvd`,
    battalion: battalion.name,
    responseArea: `Sector ${index + 1}`,
    readinessScore: readiness,
    readinessStatus: (readiness >= 88 ? 'READY' : readiness >= 80 ? 'WARNING' : 'MAINTENANCE_DUE') as ReadinessState,
    createdAt: historicalIso(900),
    updatedAt: historicalIso(1),
  };
});

export const demoRanks: Rank[] = [
  { id: 'rank-firefighter', tenantId: demoTenant.id, code: 'FF', name: 'Firefighter', sortOrder: 1, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-engineer', tenantId: demoTenant.id, code: 'ENG', name: 'Engineer', sortOrder: 2, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-lieutenant', tenantId: demoTenant.id, code: 'LT', name: 'Lieutenant', sortOrder: 3, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-captain', tenantId: demoTenant.id, code: 'CAPT', name: 'Captain', sortOrder: 4, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-battalion-chief', tenantId: demoTenant.id, code: 'BC', name: 'Battalion Chief', sortOrder: 5, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-training-officer', tenantId: demoTenant.id, code: 'TRN', name: 'Training Officer', sortOrder: 6, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-prevention-officer', tenantId: demoTenant.id, code: 'PREV', name: 'Prevention Officer', sortOrder: 7, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'rank-logistics-tech', tenantId: demoTenant.id, code: 'LOG', name: 'Logistics Technician', sortOrder: 8, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
];

export const demoCertifications: Certification[] = [
  { id: 'cert-emt', tenantId: demoTenant.id, name: 'EMT', category: 'EMS', validityMonths: 24, isRequired: true, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-paramedic', tenantId: demoTenant.id, name: 'Paramedic', category: 'EMS', validityMonths: 24, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-ff1', tenantId: demoTenant.id, name: 'Firefighter I', category: 'Fire', validityMonths: 60, isRequired: true, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-ff2', tenantId: demoTenant.id, name: 'Firefighter II', category: 'Fire', validityMonths: 60, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-hazmat', tenantId: demoTenant.id, name: 'HazMat Operations', category: 'Operations', validityMonths: 36, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-driver', tenantId: demoTenant.id, name: 'Driver Operator', category: 'Operations', validityMonths: 36, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-wildland', tenantId: demoTenant.id, name: 'Wildland Firefighter', category: 'Operations', validityMonths: 36, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-officer1', tenantId: demoTenant.id, name: 'Officer I', category: 'Command', validityMonths: 48, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-inspector1', tenantId: demoTenant.id, name: 'Inspector I', category: 'Prevention', validityMonths: 48, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-cprbls', tenantId: demoTenant.id, name: 'CPR/BLS', category: 'EMS', validityMonths: 24, isRequired: true, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
  { id: 'cert-acls', tenantId: demoTenant.id, name: 'ACLS', category: 'EMS', validityMonths: 24, isRequired: false, createdAt: historicalIso(900), updatedAt: historicalIso(1) },
];

const firstNames = ['Alex', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Jamie', 'Avery', 'Parker', 'Quinn'];
const lastNames = ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'];
const rankRotation = ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Training Officer', 'Prevention Officer', 'Logistics Technician'];

export const demoPersonnel: Personnel[] = Array.from({ length: 80 }, (_, index) => {
  const station = demoStations[index % demoStations.length];
  const rank = rankRotation[index % rankRotation.length];
  const readiness = 72 + ((index * 3) % 26);
  const personnelId = `person-${index + 1}`;
  return {
    id: personnelId,
    tenantId: demoTenant.id,
    employeeNumber: `WM-${String(index + 1).padStart(4, '0')}`,
    firstName: firstNames[index % firstNames.length],
    lastName: `${lastNames[index % lastNames.length]} ${index + 1}`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]} ${index + 1}`,
    rank,
    role: rank === 'Firefighter' ? 'Firefighter' : rank,
    station: station.name,
    currentStationId: station.id,
    battalionId: demoBattalions[Math.min(Math.floor(index / 27), demoBattalions.length - 1)].id,
    platoon: ['A', 'B', 'C'][index % 3],
    email: `person${index + 1}@westmetro.example`,
    phone: `303-555-${String(2000 + index).slice(-4)}`,
    status: index % 18 === 0 ? 'Leave' : index % 11 === 0 ? 'Training' : 'Active',
    readiness: readiness,
    readinessScore: readiness,
    expiringCerts: index % 8 === 0 ? 2 : index % 5 === 0 ? 1 : 0,
    incidents: 40 + (index * 2),
    attendance: 88 + (index % 11),
    employmentStatus: index % 7 === 0 ? 'Probationary' : 'Full Time',
    readinessStatus: index % 8 === 0 ? 'WARNING' : 'READY',
    performanceSummary: {
      attendanceRate: 88 + (index % 10),
      incidentParticipation: 35 + (index * 2),
      certificationCompliance: index % 8 === 0 ? 81 : 95,
      overtimeHours: 8 + (index % 12),
      readinessScore: readiness,
      openActions: index % 4 === 0 ? 2 : 0,
    },
    createdAt: historicalIso(700),
    updatedAt: historicalIso(1),
  };
});

export const demoPersonnelAssignments: PersonnelAssignment[] = demoPersonnel.map((personnel, index) => ({
  id: `assignment-${index + 1}`,
  tenantId: demoTenant.id,
  personnelId: personnel.id,
  stationId: personnel.currentStationId ?? demoStations[0].id,
  platoonCode: (['A', 'B', 'C'][index % 3] as 'A' | 'B' | 'C'),
  assignmentType: index % 6 === 0 ? 'Temporary Relief' : 'Primary Assignment',
  startDate: historicalIso(180),
  endDate: null,
  isCurrent: true,
  createdAt: historicalIso(180),
  updatedAt: historicalIso(1),
}));

const certificationCycle = [0, 1, 2, 3, 4, 5];
export const demoPersonnelCertifications: PersonnelCertification[] = demoPersonnel.flatMap((personnel, index) =>
  demoCertifications.slice(0, 3 + (index % 4)).map((certification, certIndex) => {
    const expired = index % 9 === 0 && certIndex === 0;
    const expiring = index % 7 === 0 && certIndex === 1;
    return {
      id: `person-cert-${index + 1}-${certIndex + 1}`,
      tenantId: demoTenant.id,
      personnelId: personnel.id,
      certificationId: certification.id,
      issuedAt: historicalIso(280 + certificationCycle[certIndex]),
      expiresAt: expired ? historicalIso(2) : expiring ? iso(14) : iso(120 + certIndex * 30),
      status: expired ? 'Expired' : expiring ? 'Expiring Soon' : 'Valid',
      createdAt: historicalIso(280),
      updatedAt: historicalIso(1),
    };
  })
);

export const demoPersonnelDocuments: PersonnelDocument[] = demoPersonnel.slice(0, 15).map((personnel, index) => ({
  id: `person-doc-${index + 1}`,
  tenantId: demoTenant.id,
  personnelId: personnel.id,
  title: `HR File ${index + 1}`,
  fileUrl: null,
  documentType: index % 2 === 0 ? 'Performance Review' : 'Credential',
  createdAt: historicalIso(200),
  updatedAt: historicalIso(1),
}));

export const demoApparatus: Apparatus[] = Array.from({ length: 30 }, (_, index) => {
  const station = demoStations[index % demoStations.length];
  const type = index % 6 === 0 ? 'Battalion Vehicle' : index % 5 === 0 ? 'Ladder Truck' : index % 3 === 0 ? 'Medic Unit' : index % 2 === 0 ? 'Engine' : 'Brush Truck';
  const readiness = index % 8 === 0 ? 68 : 90 + (index % 7);
  return {
    id: `apparatus-${index + 1}`,
    tenantId: demoTenant.id,
    stationId: station.id,
    unitNumber: `${type.startsWith('Medic') ? 'M' : type.startsWith('Ladder') ? 'L' : type.startsWith('Battalion') ? 'B' : type.startsWith('Brush') ? 'BR' : 'E'}-${index + 1}`,
    name: `${type} ${index + 1}`,
    apparatusType: type,
    status: index % 8 === 0 ? 'Maintenance Warning' : index % 13 === 0 ? 'Out of Service' : 'Ready',
    readinessScore: readiness,
    mileage: 12000 + index * 900,
    lastInspectionAt: historicalIso(40 + index),
    nextMaintenanceAt: index % 8 === 0 ? iso(7) : iso(60 + index),
    createdAt: historicalIso(600),
    updatedAt: historicalIso(1),
  };
});

export const demoAssets: Apparatus[] = Array.from({ length: 45 }, (_, index) => {
  const station = demoStations[index % demoStations.length];
  return {
    id: `asset-${index + 1}`,
    tenantId: demoTenant.id,
    stationId: station.id,
    unitNumber: `ASSET-${index + 1}`,
    name: ['SCBA', 'Thermal Camera', 'Radio', 'Monitor', 'Chainsaw'][index % 5],
    apparatusType: ['PPE', 'Electronics', 'Communications', 'EMS', 'Tools'][index % 5],
    status: index % 11 === 0 ? 'Maintenance Warning' : 'Ready',
    readinessScore: index % 11 === 0 ? 76 : 96,
    mileage: null,
    lastInspectionAt: historicalIso(30 + index),
    nextMaintenanceAt: iso(45 + index),
    createdAt: historicalIso(500),
    updatedAt: historicalIso(1),
  };
});

export const demoInventory: InventoryItem[] = Array.from({ length: 60 }, (_, index) => {
  const station = demoStations[index % demoStations.length];
  return {
    id: `inventory-${index + 1}`,
    tenantId: demoTenant.id,
    stationId: station.id,
    sku: `INV-${String(index + 1).padStart(4, '0')}`,
    name: ['Gloves', 'IV Kits', 'Masks', 'Batteries', 'Foam'][index % 5],
    category: ['EMS', 'EMS', 'PPE', 'Equipment', 'Suppression'][index % 5],
    quantity: index % 13 === 0 ? 4 : 20 + index,
    reorderPoint: 10,
    unit: 'each',
    expiresAt: index % 10 === 0 ? iso(21) : null,
    createdAt: historicalIso(400),
    updatedAt: historicalIso(1),
  };
});

export const demoProperties: Property[] = Array.from({ length: 30 }, (_, index) => {
  const station = demoStations[index % demoStations.length];
  return {
    id: `property-${index + 1}`,
    tenantId: demoTenant.id,
    name: `${['Commercial', 'Residential', 'School', 'Healthcare', 'Industrial'][index % 5]} Property ${index + 1}`,
    address: `${500 + index} Colfax Ave`,
    city: index % 2 === 0 ? 'Lakewood' : 'Wheat Ridge',
    occupancyType: ['commercial', 'residential multi-family', 'school', 'healthcare', 'industrial', 'high-risk occupancy'][index % 6],
    riskLevel: index % 6 === 0 ? 'Extreme' : index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Moderate' : 'Low',
    stationArea: station.name,
    latitude: 39.7 + index * 0.01,
    longitude: -105.1 - index * 0.01,
    createdAt: historicalIso(300),
    updatedAt: historicalIso(1),
  };
});

export const demoOccupancies: Occupancy[] = demoProperties.map((property, index) => ({
  id: `occupancy-${index + 1}`,
  tenantId: demoTenant.id,
  propertyId: property.id,
  occupancyName: property.name,
  occupantLoad: 10 + index * 2,
  riskLevel: property.riskLevel,
  notes: index % 4 === 0 ? 'Annual review required' : 'Current',
  createdAt: historicalIso(200),
  updatedAt: historicalIso(1),
}));

export const demoNotifications: Notification[] = [
  { id: 'note-1', tenantId: demoTenant.id, userId: 'user-admin', title: 'Certification expiring', message: 'Two EMT certifications expire within 14 days.', notificationType: 'certification.expiring', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-2', tenantId: demoTenant.id, userId: 'user-chief', title: 'Open staffing gap', message: 'Station 4 still has a paramedic coverage gap on B shift.', notificationType: 'staffing.gap', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-3', tenantId: demoTenant.id, userId: 'user-logistics', title: 'Maintenance warning', message: 'Medic 4 is due for brake inspection this week.', notificationType: 'asset.maintenance', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-4', tenantId: demoTenant.id, userId: 'user-training', title: 'Integration sync issue', message: 'NERIS validation queue has exceeded the response threshold.', notificationType: 'integration.sync', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-5', tenantId: demoTenant.id, userId: 'user-prevention', title: 'Inspection overdue', message: 'Commercial corridor inspections require follow-up scheduling.', notificationType: 'inspection.overdue', isRead: true, createdAt: historicalIso(2) },
];

export const demoAuditLogs: AuditLog[] = [
  { id: 'audit-1', tenantId: demoTenant.id, userId: 'user-chief', action: 'Viewed station summary', entityName: 'Station', entityId: 'station-4', createdAt: historicalIso(1) },
  { id: 'audit-2', tenantId: demoTenant.id, userId: 'user-prevention', action: 'Updated inspection queue', entityName: 'Inspection', entityId: 'property-12', createdAt: historicalIso(1) },
  { id: 'audit-3', tenantId: demoTenant.id, userId: 'user-admin', action: 'Updated role permissions', entityName: 'Role', entityId: 'role-7', createdAt: historicalIso(2) },
  { id: 'audit-4', tenantId: demoTenant.id, userId: 'user-logistics', action: 'Resolved maintenance warning', entityName: 'Apparatus', entityId: 'apparatus-4', createdAt: historicalIso(2) },
];

export const demoIntegrationSystems: IntegrationSystem[] = [
  { id: 'integration-cad', tenantId: demoTenant.id, name: 'CAD', systemType: 'CAD', status: 'Healthy', exchangeMethod: 'Real-time API', apiBaseUrl: 'https://cad.example', authMethod: 'OAuth2', rateLimitPerMinute: 900, lastSyncAt: historicalIso(0.2), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-rms', tenantId: demoTenant.id, name: 'RMS', systemType: 'RMS', status: 'Healthy', exchangeMethod: 'Event-driven', apiBaseUrl: 'https://rms.example', authMethod: 'API Key', rateLimitPerMinute: 600, lastSyncAt: historicalIso(0.3), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-neris', tenantId: demoTenant.id, name: 'NERIS', systemType: 'NERIS', status: 'Degraded', exchangeMethod: 'Batch', apiBaseUrl: 'https://neris.example', authMethod: 'OAuth2', rateLimitPerMinute: 120, lastSyncAt: historicalIso(1), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-payroll', tenantId: demoTenant.id, name: 'Payroll', systemType: 'Payroll', status: 'Healthy', exchangeMethod: 'Batch', apiBaseUrl: 'https://payroll.example', authMethod: 'SFTP', rateLimitPerMinute: 200, lastSyncAt: historicalIso(0.5), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-gis', tenantId: demoTenant.id, name: 'GIS', systemType: 'GIS', status: 'Healthy', exchangeMethod: 'REST', apiBaseUrl: 'https://gis.example', authMethod: 'SAML', rateLimitPerMinute: 300, lastSyncAt: historicalIso(0.5), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-epcr', tenantId: demoTenant.id, name: 'ePCR', systemType: 'ePCR', status: 'Healthy', exchangeMethod: 'FHIR', apiBaseUrl: 'https://epcr.example', authMethod: 'OAuth2', rateLimitPerMinute: 300, lastSyncAt: historicalIso(0.4), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-lms', tenantId: demoTenant.id, name: 'LMS', systemType: 'LMS', status: 'Healthy', exchangeMethod: 'REST', apiBaseUrl: 'https://lms.example', authMethod: 'OIDC', rateLimitPerMinute: 700, lastSyncAt: historicalIso(0.2), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
  { id: 'integration-sso', tenantId: demoTenant.id, name: 'SSO', systemType: 'SSO', status: 'Healthy', exchangeMethod: 'OIDC', apiBaseUrl: 'https://sso.example', authMethod: 'OIDC', rateLimitPerMinute: 1000, lastSyncAt: historicalIso(0.1), createdAt: historicalIso(400), updatedAt: historicalIso(1) },
];

export const demoIntegrationLogs: IntegrationLog[] = demoIntegrationSystems.map((system, index) => ({
  id: `integration-log-${index + 1}`,
  tenantId: demoTenant.id,
  integrationId: system.id ?? `integration-${index + 1}`,
  status: system.status === 'Healthy' ? 'Success' : 'Warning',
  message: `${system.name} sync completed`,
  payload: { source: system.name },
  durationMs: 120 + index * 35,
  createdAt: historicalIso(index + 1),
}));

export const demoReportDefinitions: ReportDefinition[] = [
  {
    id: 'report-readiness',
    tenantId: demoTenant.id,
    name: 'District Readiness Summary',
    module: 'platform',
    definition: {
      widgets: ['readiness', 'staffing', 'training', 'assets', 'prevention'],
    },
    createdBy: 'user-admin',
    createdAt: historicalIso(90),
    updatedAt: historicalIso(1),
  },
];

export const demoAiInsights: AiInsight[] = [
  {
    id: 'insight-1',
    tenantId: demoTenant.id,
    category: 'Station readiness',
    title: 'Station 4 readiness reduction',
    summary: 'Medic 4 maintenance warning and two expiring EMS certifications reduce readiness.',
    severity: 'Critical',
    confidence: 94,
    confidenceScore: 94,
    impact: 'Potential EMS response capacity reduction during peak call window.',
    dataSources: ['Staffing', 'Assets', 'Training'],
    recommendedActions: ['Schedule Medic 4 brake inspection', 'Backfill paramedic coverage', 'Assign EMS refresher'],
    status: 'Open',
    createdAt: historicalIso(1),
  },
  {
    id: 'insight-2',
    tenantId: demoTenant.id,
    category: 'Overtime risk',
    title: 'B-shift overtime pressure is increasing',
    summary: 'Repeated backfill at Stations 2 and 9 is driving overtime exposure.',
    severity: 'Warning',
    confidence: 88,
    confidenceScore: 88,
    impact: 'Higher labor cost and reduced crew resilience.',
    dataSources: ['Staffing', 'Attendance'],
    recommendedActions: ['Review open shifts', 'Invite qualified availability pool'],
    status: 'Open',
    createdAt: historicalIso(2),
  },
  {
    id: 'insight-3',
    tenantId: demoTenant.id,
    category: 'Prevention backlog',
    title: 'Inspection backlog in commercial corridor',
    summary: 'High-risk occupancies require follow-up scheduling.',
    severity: 'Warning',
    confidence: 91,
    confidenceScore: 91,
    impact: 'Prevention compliance exposure and delayed violation closure.',
    dataSources: ['Prevention', 'Properties'],
    recommendedActions: ['Batch inspections by corridor', 'Assign one additional prevention officer'],
    status: 'Open',
    createdAt: historicalIso(3),
  },
];

export const demoSupportTickets: SupportTicket[] = [
  { id: 'ticket-1001', tenantId: demoTenant.id, ticketNumber: 'SUP-1001', title: 'CAD sync warning review', description: 'Review delayed CAD import batch.', severity: 'High', status: 'Open', requesterName: 'Battalion Chief', assignedTo: 'Integration Support', slaDueAt: iso(1), createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'ticket-1002', tenantId: demoTenant.id, ticketNumber: 'SUP-1002', title: 'Add Station 17 WUI preplan layer', description: 'Expose the map layer in the prevention dashboard.', severity: 'Normal', status: 'In Progress', requesterName: 'Prevention Officer', assignedTo: 'GIS Support', slaDueAt: iso(2), createdAt: historicalIso(2), updatedAt: historicalIso(1) },
  { id: 'ticket-1003', tenantId: demoTenant.id, ticketNumber: 'SUP-1003', title: 'Training export format request', description: 'Need CSV export grouped by certification.', severity: 'Normal', status: 'Resolved', requesterName: 'Training Admin', assignedTo: 'Customer Success', slaDueAt: iso(3), createdAt: historicalIso(3), updatedAt: historicalIso(1) },
];

export const demoSearchIndex: GlobalSearchResult[] = [
  ...demoStations.slice(0, 5).map((station) => ({ id: station.id, entity: 'Station', title: station.name, subtitle: `${station.battalion} - ${station.city}`, module: 'Organization', status: station.status, score: station.readinessScore, href: `/stations/${station.id}` })),
  ...demoPersonnel.slice(0, 5).map((personnel) => ({ id: personnel.id, entity: 'Personnel', title: personnel.name ?? `${personnel.firstName} ${personnel.lastName}`, subtitle: `${personnel.rank} - ${personnel.station}`, module: 'Personnel', status: personnel.status, score: personnel.readinessScore, href: `/personnel/${personnel.id}` })),
  ...demoProperties.slice(0, 5).map((property) => ({ id: property.id, entity: 'Property', title: property.name, subtitle: property.address, module: 'Prevention', status: property.riskLevel, score: property.riskLevel === 'Extreme' ? 100 : property.riskLevel === 'High' ? 80 : 60, href: `/properties/${property.id}` })),
];

export const demoPlatformSummary: DashboardSummary = {
  tenant: demoTenant,
  stationCount: demoStations.length,
  personnelCount: demoPersonnel.length,
  apparatusCount: demoApparatus.length,
  propertyCount: demoProperties.length,
  notificationCount: demoNotifications.length,
  openAlerts: demoNotifications.filter((notification) => !notification.isRead).length,
  integrationHealth: {
    healthy: demoIntegrationSystems.filter((integration) => integration.status === 'Healthy').length,
    degraded: demoIntegrationSystems.filter((integration) => integration.status === 'Degraded').length,
    failed: demoIntegrationSystems.filter((integration) => integration.status === 'Failed').length,
  },
  readiness: {
    agencyAverage: Math.round(demoStations.reduce((total, station) => total + station.readiness, 0) / demoStations.length),
    criticalStations: demoStations.filter((station) => station.status === 'Critical').length,
    expiringCertifications: demoPersonnel.filter((personnel) => (personnel.expiringCerts ?? 0) > 0).length,
    openStaffingGaps: demoStations.filter((station) => station.staffingGap > 0).length,
  },
};
