import bcrypt from 'bcryptjs';

const now = Date.now();
const iso = (daysFromNow: number) => new Date(now + daysFromNow * 86400000).toISOString();
const historicalIso = (daysAgo: number) => new Date(now - daysAgo * 86400000).toISOString();
const tenantId = 'tenant-west-metro';

const permissions = [
  'core.view',
  'dashboard.view',
  'personnel.view',
  'personnel.manage',
  'staffing.view',
  'staffing.manage',
  'training.view',
  'training.manage',
  'training.assign',
  'training.attendance',
  'training.certifications',
  'training.needs.view',
  'training.needs.generate',
  'training.recommendations.view',
  'training.trainer.assign',
  'training.export',
  'incidents.view',
  'incidents.manage',
  'incidents.qa',
  'neris.export',
  'epcr.view',
  'stations.view',
  'apparatus.view',
  'apparatus.manage',
  'assets.view',
  'assets.manage',
  'inventory.view',
  'inventory.manage',
  'maintenance.view',
  'maintenance.manage',
  'vendors.view',
  'vendors.manage',
  'reorder.approve',
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
  'integrations.test',
  'integrations.sync',
  'integrations.retry',
  'integrations.credentials',
  'integrations.webhooks',
  'integrations.mappings',
  'integrations.logs',
  'integrations.audit',
  'admin.users',
  'admin.roles',
  'admin.audit',
  'support.view',
  'support.manage',
  'ai.view',
  'ai.manage',
  'ai.generate',
  'ai.resolve',
  'ai.dismiss',
  'ai.rules.view',
  'ai.rules.manage',
  'ai.providers.view',
  'ai.providers.manage',
  'ai.actions.assign',
  'admin.security',
  'admin.users.view',
  'admin.users.manage',
  'admin.roles.view',
  'admin.roles.manage',
  'admin.permissions.view',
  'admin.permissions.manage',
  'admin.audit.view',
  'admin.security.view',
  'admin.security.manage',
  'admin.compliance.view',
  'admin.compliance.manage',
  'admin.sso.manage',
  'admin.mfa.manage',
  'admin.backup.view',
  'admin.backup.manage',
  'admin.incidents.manage',
  'admin.vulnerabilities.manage',
  'support.view',
  'support.manage',
  'support.sla.manage',
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

const roles = [
  { code: 'Firefighter', description: 'Front-line response member', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'training.certifications', 'training.recommendations.view', 'incidents.view', 'stations.view', 'apparatus.view', 'assets.view', 'inventory.view', 'prevention.view', 'ai.view'] },
  { code: 'Company Officer', description: 'Company-level supervisor', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'training.assign', 'training.attendance', 'training.recommendations.view', 'training.needs.view', 'training.manage', 'incidents.view', 'incidents.manage', 'stations.view', 'apparatus.view', 'assets.view', 'inventory.view', 'maintenance.view', 'prevention.view', 'ai.view'] },
  { code: 'Battalion Chief', description: 'Command and operations oversight', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'personnel.manage', 'staffing.view', 'staffing.manage', 'training.view', 'training.manage', 'training.needs.view', 'training.needs.generate', 'training.recommendations.view', 'training.trainer.assign', 'training.export', 'incidents.view', 'incidents.manage', 'incidents.qa', 'stations.view', 'apparatus.view', 'apparatus.manage', 'assets.view', 'assets.manage', 'inventory.view', 'maintenance.view', 'prevention.view', 'analytics.view', 'reports.view', 'reports.export', 'dataquality.view', 'duplicates.view', 'integrations.view', 'ai.view', 'ai.resolve', 'ai.dismiss', 'ai.actions.assign', 'admin.security', 'admin.security.view', 'support.view'] },
  { code: 'Training Admin', description: 'Training and certification admin', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'training.view', 'training.manage', 'training.assign', 'training.attendance', 'training.certifications', 'training.needs.view', 'training.needs.generate', 'training.recommendations.view', 'training.trainer.assign', 'training.export', 'analytics.view', 'analytics.export', 'reports.view', 'reports.create', 'reports.export', 'reports.schedule', 'integrations.view', 'ai.view', 'support.view'] },
  { code: 'Prevention Officer', description: 'Inspection and permit lead', permissions: ['core.view', 'dashboard.view', 'prevention.view', 'prevention.manage', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view', 'integrations.view', 'ai.view', 'support.view'] },
  { code: 'Logistics Manager', description: 'Asset and inventory admin', permissions: ['core.view', 'dashboard.view', 'stations.view', 'apparatus.view', 'apparatus.manage', 'assets.view', 'assets.manage', 'inventory.view', 'inventory.manage', 'maintenance.view', 'maintenance.manage', 'vendors.view', 'vendors.manage', 'reorder.approve', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view', 'integrations.view', 'ai.view', 'support.view'] },
  { code: 'District Admin', description: 'District-wide administrator', permissions: permissions.map((permission) => permission.code) },
  { code: 'System Admin', description: 'System and integration administrator', permissions: ['core.view', 'dashboard.view', 'integrations.view', 'integrations.manage', 'integrations.test', 'integrations.sync', 'integrations.retry', 'integrations.credentials', 'integrations.webhooks', 'integrations.mappings', 'integrations.logs', 'integrations.audit', 'admin.users', 'admin.roles', 'admin.audit', 'admin.security', 'admin.security.view', 'support.view', 'support.manage', 'ai.view', 'ai.manage', 'ai.generate', 'ai.resolve', 'ai.dismiss', 'ai.rules.view', 'ai.rules.manage', 'ai.providers.view', 'ai.providers.manage', 'ai.actions.assign'] },
  { code: 'Read-Only Auditor', description: 'Read-only oversight user', permissions: ['core.view', 'dashboard.view', 'personnel.view', 'staffing.view', 'training.view', 'training.recommendations.view', 'incidents.view', 'stations.view', 'apparatus.view', 'assets.view', 'inventory.view', 'maintenance.view', 'vendors.view', 'prevention.view', 'analytics.view', 'reports.view', 'dataquality.view', 'duplicates.view', 'integrations.view', 'integrations.logs', 'integrations.audit', 'admin.audit', 'admin.security.view', 'support.view', 'ai.view', 'ai.rules.view', 'ai.providers.view'] },
  { code: 'Data Steward', description: 'Reporting and data governance reviewer', permissions: ['core.view', 'dashboard.view', 'analytics.view', 'analytics.export', 'reports.view', 'reports.create', 'reports.export', 'reports.schedule', 'dataquality.view', 'dataquality.manage', 'duplicates.view', 'duplicates.manage', 'support.view'] },
  { code: 'Support Analyst', description: 'Customer support and SLA operations', permissions: ['core.view', 'dashboard.view', 'support.view', 'support.manage', 'support.sla.manage', 'integrations.view', 'analytics.view', 'reports.view'] },
].map((definition, index) => ({
  id: `role-${index + 1}`,
  tenantId,
  name: definition.code,
  code: definition.code.replace(/\s+/g, '_').toLowerCase(),
  description: definition.description,
  createdAt: historicalIso(900),
  updatedAt: historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
  permissionCodes: definition.permissions,
}));

const users = [
  { id: 'user-admin', email: 'admin@westmetro.example', displayName: 'Dana Mitchell', roleCodes: ['District Admin'], personnelId: 'person-1', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-chief', email: 'chief@westmetro.example', displayName: 'Chris Alvarez', roleCodes: ['Battalion Chief'], personnelId: 'person-4', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-training', email: 'training@westmetro.example', displayName: 'Maya Chen', roleCodes: ['Training Admin'], personnelId: 'person-5', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-prevention', email: 'prevention@westmetro.example', displayName: 'Jordan Fields', roleCodes: ['Prevention Officer'], personnelId: 'person-49', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-logistics', email: 'logistics@westmetro.example', displayName: 'Sam Brooks', roleCodes: ['Logistics Manager'], personnelId: 'person-17', status: 'Active', mfaEnabled: false, ssoProvider: null, isActive: true },
  { id: 'user-auditor', email: 'auditor@westmetro.example', displayName: 'Taylor Grant', roleCodes: ['Read-Only Auditor'], personnelId: null, status: 'Active', mfaEnabled: false, ssoProvider: 'SAML', isActive: true },
  { id: 'user-data-steward', email: 'data.steward@westmetro.example', displayName: 'Riley Ford', roleCodes: ['Data Steward'], personnelId: 'person-57', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-support-analyst', email: 'support.analyst@westmetro.example', displayName: 'Alex Kim', roleCodes: ['Support Analyst'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-ops-1', email: 'ops1@westmetro.example', displayName: 'Morgan Lee', roleCodes: ['Company Officer'], personnelId: 'person-8', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-ops-2', email: 'ops2@westmetro.example', displayName: 'Avery Brooks', roleCodes: ['Company Officer'], personnelId: 'person-16', status: 'Invited', mfaEnabled: false, ssoProvider: null, isActive: false },
  { id: 'user-ops-3', email: 'ops3@westmetro.example', displayName: 'Parker Stone', roleCodes: ['Company Officer'], personnelId: 'person-24', status: 'Locked', mfaEnabled: true, ssoProvider: 'SAML', isActive: false },
  { id: 'user-ops-4', email: 'ops4@westmetro.example', displayName: 'Quinn Miller', roleCodes: ['Company Officer'], personnelId: 'person-32', status: 'Disabled', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: false },
  { id: 'user-ops-5', email: 'ops5@westmetro.example', displayName: 'Casey Reed', roleCodes: ['Firefighter'], personnelId: 'person-40', status: 'Active', mfaEnabled: false, ssoProvider: null, isActive: true },
  { id: 'user-ops-6', email: 'ops6@westmetro.example', displayName: 'Jamie Brooks', roleCodes: ['Firefighter'], personnelId: 'person-48', status: 'Active', mfaEnabled: false, ssoProvider: null, isActive: true },
  { id: 'user-ops-7', email: 'ops7@westmetro.example', displayName: 'Taylor Hart', roleCodes: ['Firefighter'], personnelId: 'person-56', status: 'Active', mfaEnabled: false, ssoProvider: 'SAML', isActive: true },
  { id: 'user-ops-8', email: 'ops8@westmetro.example', displayName: 'Jordan Blake', roleCodes: ['Firefighter'], personnelId: 'person-64', status: 'Invited', mfaEnabled: false, ssoProvider: null, isActive: false },
  { id: 'user-ops-9', email: 'ops9@westmetro.example', displayName: 'Avery Carter', roleCodes: ['Firefighter'], personnelId: 'person-72', status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-ops-10', email: 'ops10@westmetro.example', displayName: 'Riley Adams', roleCodes: ['Firefighter'], personnelId: 'person-80', status: 'Locked', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: false },
  { id: 'user-support-1', email: 'support1@westmetro.example', displayName: 'Chris Nolan', roleCodes: ['Support Analyst'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-support-2', email: 'support2@westmetro.example', displayName: 'Dana Stone', roleCodes: ['Support Analyst'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-audit-2', email: 'audit2@westmetro.example', displayName: 'Taylor Price', roleCodes: ['Read-Only Auditor'], personnelId: null, status: 'Active', mfaEnabled: false, ssoProvider: 'SAML', isActive: true },
  { id: 'user-data-2', email: 'data2@westmetro.example', displayName: 'Jordan Price', roleCodes: ['Data Steward'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-system', email: 'system@westmetro.example', displayName: 'System Admin', roleCodes: ['System Admin'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'Microsoft Entra ID', isActive: true },
  { id: 'user-agency-support', email: 'agency.support@westmetro.example', displayName: 'Sam Tyler', roleCodes: ['Support Analyst'], personnelId: null, status: 'Invited', mfaEnabled: false, ssoProvider: null, isActive: false },
  { id: 'user-agency-audit', email: 'agency.audit@westmetro.example', displayName: 'Taylor Morgan', roleCodes: ['Read-Only Auditor'], personnelId: null, status: 'Active', mfaEnabled: true, ssoProvider: 'SAML', isActive: true },
].map((user) => ({
  ...user,
  tenantId,
  passwordHash: bcrypt.hashSync('MissionOS2026!', 10),
  isActive: Boolean(user.isActive),
  createdAt: historicalIso(500),
  updatedAt: historicalIso(1),
  lastLoginAt: user.status === 'Invited' ? null : historicalIso(1),
  createdBy: null,
  updatedBy: null,
}));

const battalions = Array.from({ length: 3 }, (_, index) => ({
  id: `battalion-${index + 1}`,
  tenantId,
  code: `B${index + 1}`,
  name: `Battalion ${index + 1}`,
  chiefName: ['Chris Alvarez', 'Maya Chen', 'Jordan Fields'][index],
  createdAt: historicalIso(900),
  updatedAt: historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
}));

const stations = Array.from({ length: 17 }, (_, index) => {
  const battalion = battalions[Math.min(Math.floor(index / 6), battalions.length - 1)];
  const readiness = 72 + ((index * 7) % 23);
  return {
    id: `station-${index + 1}`,
    tenantId,
    number: index + 1,
    name: `Station ${index + 1}`,
    city: index % 3 === 0 ? 'Lakewood' : index % 3 === 1 ? 'Wheat Ridge' : 'Golden',
    readinessScore: readiness,
    // Staffing gap distribution kept index-based to match the web demo seed
    // (src/data/platformMock.ts) so live and demo coverage boards read the same.
    staffingStatus: index % 5 === 0 ? 'Critical' : index % 4 === 0 ? 'Warning' : 'Covered',
    staffingGap: index % 5 === 0 ? 2 : index % 4 === 0 ? 1 : 0,
    address: `${1000 + index} West Metro Blvd`,
    battalionId: battalion.id,
    battalion: battalion.name,
    responseArea: `Sector ${index + 1}`,
    createdAt: historicalIso(900),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const rankRotation = ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief', 'Training Officer', 'Prevention Officer', 'Logistics Technician'];
const personnel = Array.from({ length: 80 }, (_, index) => {
  const station = stations[index % stations.length];
  const rank = rankRotation[index % rankRotation.length];
  const readiness = 72 + ((index * 3) % 26);
  const platoon = ['A', 'B', 'C'][index % 3];
  const supervisorIndex = index < 5 ? 0 : index < 20 ? 3 : index < 40 ? 8 : 16;
  return {
    id: `person-${index + 1}`,
    tenantId,
    employeeNumber: `WM-${String(index + 1).padStart(4, '0')}`,
    firstName: ['Alex', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Jamie', 'Avery', 'Parker', 'Quinn'][index % 10],
    lastName: ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'][index % 10] + ` ${index + 1}`,
    name: `${['Alex', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Jamie', 'Avery', 'Parker', 'Quinn'][index % 10]} ${['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'][index % 10]} ${index + 1}`,
    fullName: `${['Alex', 'Taylor', 'Morgan', 'Riley', 'Casey', 'Jordan', 'Jamie', 'Avery', 'Parker', 'Quinn'][index % 10]} ${['Garcia', 'Smith', 'Johnson', 'Martinez', 'Brown', 'Davis', 'Wilson', 'Lee', 'Clark', 'Moore'][index % 10]} ${index + 1}`,
    rank,
    role: rank === 'Firefighter' ? 'Firefighter' : rank,
    roleTitle: rank === 'Firefighter' ? 'Firefighter' : rank === 'Engineer' ? 'Driver Operator' : `${rank} Operations`,
    stationId: station.id,
    currentStationId: station.id,
    station: station.name,
    battalionId: battalions[Math.min(Math.floor(index / 27), battalions.length - 1)].id,
    currentShiftPlatoonId: platoon,
    platoon,
    email: `person${index + 1}@westmetro.example`,
    phone: `303-555-${String(2000 + index).slice(-4)}`,
    status: index % 18 === 0 ? 'Leave' : index % 11 === 0 ? 'Training' : 'Active',
    employmentStatus: 'Full Time',
    readinessStatus: readiness >= 90 ? 'READY' : readiness >= 75 ? 'WATCH' : readiness >= 60 ? 'AT_RISK' : 'CRITICAL',
    readinessScore: readiness,
    yearsOfService: 2 + (index % 24),
    supervisorPersonnelId: index === 0 ? null : `person-${supervisorIndex + 1}`,
    expiringCerts: index % 8 === 0 ? 2 : index % 5 === 0 ? 1 : 0,
    incidents: 40 + (index * 2),
    attendance: 90 + (index % 10),
    createdAt: historicalIso(600),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const certifications = [
  { id: 'cert-emt', code: 'EMT', name: 'EMT', category: 'EMS', validityMonths: 24, issuingAuthority: 'State EMS', requiredForRanks: ['Firefighter', 'Engineer'], requiredForRoles: ['Firefighter', 'Company Officer'], isRequired: true, isActive: true },
  { id: 'cert-paramedic', code: 'PARAMEDIC', name: 'Paramedic', category: 'EMS', validityMonths: 24, issuingAuthority: 'State EMS', requiredForRanks: ['Lieutenant', 'Captain'], requiredForRoles: ['Battalion Chief'], isRequired: false, isActive: true },
  { id: 'cert-ff1', code: 'FF1', name: 'Firefighter I', category: 'Fire', validityMonths: 60, issuingAuthority: 'State Fire Marshal', requiredForRanks: ['Firefighter'], requiredForRoles: ['Firefighter'], isRequired: true, isActive: true },
  { id: 'cert-ff2', code: 'FF2', name: 'Firefighter II', category: 'Fire', validityMonths: 60, issuingAuthority: 'State Fire Marshal', requiredForRanks: ['Engineer', 'Lieutenant'], requiredForRoles: ['Company Officer'], isRequired: false, isActive: true },
  { id: 'cert-hazmat', code: 'HAZMAT', name: 'HazMat Operations', category: 'Operations', validityMonths: 36, issuingAuthority: 'State Fire Academy', requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant'], requiredForRoles: ['Company Officer', 'Battalion Chief'], isRequired: false, isActive: true },
  { id: 'cert-driver', code: 'DRIVER', name: 'Driver Operator', category: 'Operations', validityMonths: 36, issuingAuthority: 'State Fire Academy', requiredForRanks: ['Engineer'], requiredForRoles: ['Company Officer'], isRequired: false, isActive: true },
  { id: 'cert-wildland', code: 'WILDLAND', name: 'Wildland Firefighter', category: 'Operations', validityMonths: 36, issuingAuthority: 'State Fire Academy', requiredForRanks: ['Firefighter', 'Engineer'], requiredForRoles: ['Firefighter', 'Company Officer'], isRequired: false, isActive: true },
  { id: 'cert-officer1', code: 'OFFICER-I', name: 'Officer I', category: 'Command', validityMonths: 48, issuingAuthority: 'State Fire Academy', requiredForRanks: ['Lieutenant', 'Captain'], requiredForRoles: ['Company Officer', 'Battalion Chief'], isRequired: false, isActive: true },
  { id: 'cert-inspector1', code: 'INSPECTOR-I', name: 'Inspector I', category: 'Prevention', validityMonths: 48, issuingAuthority: 'State Fire Marshal', requiredForRanks: ['Prevention Officer'], requiredForRoles: ['Prevention Officer', 'Battalion Chief'], isRequired: false, isActive: true },
  { id: 'cert-cprbls', code: 'CPR-BLS', name: 'CPR/BLS', category: 'EMS', validityMonths: 24, issuingAuthority: 'AHA', requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant'], requiredForRoles: ['Firefighter', 'Company Officer', 'Battalion Chief'], isRequired: true, isActive: true },
  { id: 'cert-acls', code: 'ACLS', name: 'ACLS', category: 'EMS', validityMonths: 24, issuingAuthority: 'AHA', requiredForRanks: ['Lieutenant', 'Captain'], requiredForRoles: ['Company Officer'], isRequired: false, isActive: true },
].map((certification) => ({
  ...certification,
  tenantId,
  createdAt: historicalIso(900),
  updatedAt: historicalIso(1),
}));

const personnelCertifications = personnel.flatMap((member, index) => [
  {
    id: `pc-${index + 1}-1`,
    tenantId,
    personnelId: member.id,
    certificationId: certifications[index % certifications.length].id,
    issueDate: historicalIso(300),
    expiryDate: index % 8 === 0 ? iso(12) : iso(120),
    status: index % 8 === 0 ? 'Expiring Soon' : 'Valid',
    documentUrl: null,
    verifiedBy: index % 3 === 0 ? 'user-training' : null,
    verifiedAt: historicalIso(280),
    createdAt: historicalIso(300),
    updatedAt: historicalIso(1),
  },
]);

const personnelAssignments = personnel.map((member, index) => ({
  id: `assignment-${index + 1}`,
  tenantId,
  personnelId: member.id,
  stationId: member.stationId,
  platoonCode: member.platoon,
  assignmentType: 'Current',
  startDate: historicalIso(100),
  endDate: null,
  isCurrent: true,
  createdAt: historicalIso(100),
  updatedAt: historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
}));

const personnelDocuments = personnel.slice(0, 8).map((member, index) => ({
  id: `doc-${index + 1}`,
  tenantId,
  personnelId: member.id,
  title: `Credential Packet ${index + 1}`,
  fileUrl: null,
  documentType: 'Credential',
  createdAt: historicalIso(30),
  updatedAt: historicalIso(1),
}));

const apparatusTypes = [
  { id: 'apparatus-type-engine', tenantId, name: 'Engine', category: 'Suppression', requiredCrewCount: 4, requiresDriverOperator: true, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-medic', tenantId, name: 'Medic Unit', category: 'EMS', requiredCrewCount: 2, requiresDriverOperator: true, requiresParamedic: true, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-ladder', tenantId, name: 'Ladder', category: 'Truck', requiredCrewCount: 4, requiresDriverOperator: true, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-brush', tenantId, name: 'Brush', category: 'Wildland', requiredCrewCount: 2, requiresDriverOperator: true, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-rescue', tenantId, name: 'Rescue', category: 'Special Ops', requiredCrewCount: 4, requiresDriverOperator: true, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-battalion', tenantId, name: 'Battalion Vehicle', category: 'Command', requiredCrewCount: 1, requiresDriverOperator: false, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'apparatus-type-utility', tenantId, name: 'Utility', category: 'Support', requiredCrewCount: 2, requiresDriverOperator: true, requiresParamedic: false, isActive: true, createdAt: historicalIso(800), updatedAt: historicalIso(1), isDeleted: false },
];

const equipmentCategories = [
  { id: 'eq-cat-scba', tenantId, name: 'SCBA', description: 'Respiratory protection and air systems', readinessCriticality: 'Critical', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'eq-cat-ems', tenantId, name: 'EMS', description: 'Patient care and transport equipment', readinessCriticality: 'Critical', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'eq-cat-comms', tenantId, name: 'Comms', description: 'Radios, chargers, and alerting devices', readinessCriticality: 'High', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'eq-cat-extrication', tenantId, name: 'Extrication', description: 'Rescue and extrication tools', readinessCriticality: 'High', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'eq-cat-wildland', tenantId, name: 'Wildland', description: 'WUI and wildfire operations gear', readinessCriticality: 'High', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'eq-cat-ppe', tenantId, name: 'PPE', description: 'Protective clothing and consumables', readinessCriticality: 'Critical', isActive: true, createdAt: historicalIso(600), updatedAt: historicalIso(1), isDeleted: false },
];

const vendors = [
  { id: 'vendor-1', tenantId, name: 'Front Range Fleet Service', vendorType: 'Fleet Maintenance', contactName: 'Morgan Lee', email: 'service@frfleet.example', phone: '303-555-0180', address: '1200 Industrial Way, Denver, CO', serviceCategories: ['Fleet', 'Apparatus', 'Pump Service'], preferredVendor: true, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-2', tenantId, name: 'Metro Medical Supply', vendorType: 'Medical Supply', contactName: 'Ava Patel', email: 'orders@metromed.example', phone: '303-555-0181', address: '500 Central Ave, Lakewood, CO', serviceCategories: ['EMS', 'Medical', 'Consumables'], preferredVendor: true, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-3', tenantId, name: 'Peak PPE Warehouse', vendorType: 'PPE', contactName: 'Jesse Torres', email: 'support@peakppe.example', phone: '303-555-0182', address: '2150 Commerce St, Wheat Ridge, CO', serviceCategories: ['PPE', 'Uniform', 'Boots'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-4', tenantId, name: 'Redline Communications', vendorType: 'Comms', contactName: 'Casey Morgan', email: 'dispatch@redlinecomms.example', phone: '303-555-0183', address: '89 Signal Dr, Arvada, CO', serviceCategories: ['Radios', 'Batteries', 'Paging'], preferredVendor: true, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-5', tenantId, name: 'Summit Rescue Tools', vendorType: 'Rescue Equipment', contactName: 'Noah Kim', email: 'orders@summitrescue.example', phone: '303-555-0184', address: '420 Summit Rd, Golden, CO', serviceCategories: ['Extrication', 'Hydraulics', 'Rescue'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-6', tenantId, name: 'Wildland Ready Supply', vendorType: 'Wildland Gear', contactName: 'Erin Brooks', email: 'sales@wildlandready.example', phone: '303-555-0185', address: '77 Ridge Trl, Golden, CO', serviceCategories: ['Wildland', 'Fuel', 'Hose'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-7', tenantId, name: 'Hydrant & Hose Depot', vendorType: 'Operations', contactName: 'Zoe Ramirez', email: 'help@hydrantandhose.example', phone: '303-555-0186', address: '88 Supply Loop, Denver, CO', serviceCategories: ['Hose', 'Nozzles', 'Adapters'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-8', tenantId, name: 'Rocky Mountain Labs', vendorType: 'Testing', contactName: 'Liam Chen', email: 'lab@rmlabs.example', phone: '303-555-0187', address: '100 Lab Way, Broomfield, CO', serviceCategories: ['Testing', 'Calibration', 'Inspection'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-9', tenantId, name: 'Station Supply Co.', vendorType: 'General Supply', contactName: 'Mila Johnson', email: 'orders@stationsupply.example', phone: '303-555-0188', address: '200 Depot Ave, Lakewood, CO', serviceCategories: ['General', 'Batteries', 'Consumables'], preferredVendor: true, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-10', tenantId, name: 'Aerial Service Center', vendorType: 'Apparatus Repair', contactName: 'Owen Price', email: 'support@aerialservice.example', phone: '303-555-0189', address: '10 Lift Rd, Wheat Ridge, CO', serviceCategories: ['Ladder', 'Hydraulics', 'Aerial'], preferredVendor: true, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-11', tenantId, name: 'Fuel & Foam Logistics', vendorType: 'HazMat', contactName: 'Sophia Nguyen', email: 'dispatch@fuelfoam.example', phone: '303-555-0190', address: '501 Foam Dr, Arvada, CO', serviceCategories: ['Foam', 'Fuel', 'HazMat'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
  { id: 'vendor-12', tenantId, name: 'Inspection Ready Services', vendorType: 'Inspection', contactName: 'Cole Bennett', email: 'info@inspectionready.example', phone: '303-555-0191', address: '44 Compliance Ct, Denver, CO', serviceCategories: ['Inspection', 'Service', 'Calibration'], preferredVendor: false, status: 'Active', createdAt: historicalIso(300), updatedAt: historicalIso(1), createdBy: null, updatedBy: null, isDeleted: false },
];

const apparatusBase = [
  { id: 'apparatus-1', stationId: stations[3].id, unitNumber: 'Medic 4', apparatusTypeId: 'apparatus-type-medic', callSign: 'MED-4', apparatusType: 'Medic Unit', make: 'Ford', model: 'E-450', year: 2020, vin: '1FDEF4A0001', licensePlate: 'WM-004M', status: 'Warning', readinessScore: 71, mileage: 11800, engineHours: 420, lastInspectionDate: historicalIso(14), nextInspectionDue: iso(19), lastMaintenanceDate: historicalIso(20), nextMaintenanceDue: iso(6), assignedCrewShift: 'B', notes: 'Brake inspection due and airway kit audit pending.' },
  { id: 'apparatus-2', stationId: stations[3].id, unitNumber: 'Engine 4', apparatusTypeId: 'apparatus-type-engine', callSign: 'ENG-4', apparatusType: 'Engine', make: 'Pierce', model: 'Enforcer', year: 2021, vin: '1PCE4A0002', licensePlate: 'WM-004E', status: 'Ready', readinessScore: 94, mileage: 9200, engineHours: 330, lastInspectionDate: historicalIso(10), nextInspectionDue: iso(28), lastMaintenanceDate: historicalIso(17), nextMaintenanceDue: iso(28), assignedCrewShift: 'B', notes: 'Primary structural engine.' },
  { id: 'apparatus-3', stationId: stations[8].id, unitNumber: 'Engine 9', apparatusTypeId: 'apparatus-type-engine', callSign: 'ENG-9', apparatusType: 'Engine', make: 'Pierce', model: 'Enforcer', year: 2018, vin: '1PCE9A0003', licensePlate: 'WM-009E', status: 'Warning', readinessScore: 82, mileage: 14100, engineHours: 590, lastInspectionDate: historicalIso(21), nextInspectionDue: iso(12), lastMaintenanceDate: historicalIso(32), nextMaintenanceDue: iso(12), assignedCrewShift: 'A', notes: 'Pump service due in less than two weeks.' },
  { id: 'apparatus-4', stationId: stations[16].id, unitNumber: 'Brush 17', apparatusTypeId: 'apparatus-type-brush', callSign: 'BR-17', apparatusType: 'Wildland', make: 'Ford', model: 'F-550', year: 2019, vin: '1WLD170004', licensePlate: 'WM-017B', status: 'Ready', readinessScore: 91, mileage: 5400, engineHours: 210, lastInspectionDate: historicalIso(5), nextInspectionDue: iso(40), lastMaintenanceDate: historicalIso(16), nextMaintenanceDue: iso(40), assignedCrewShift: 'C', notes: 'WUI response unit.' },
  { id: 'apparatus-5', stationId: stations[1].id, unitNumber: 'Medic 2', apparatusTypeId: 'apparatus-type-medic', callSign: 'MED-2', apparatusType: 'Medic Unit', make: 'Ford', model: 'Transit', year: 2022, vin: '1MED200005', licensePlate: 'WM-002M', status: 'Ready', readinessScore: 96, mileage: 7800, engineHours: 270, lastInspectionDate: historicalIso(7), nextInspectionDue: iso(30), lastMaintenanceDate: historicalIso(13), nextMaintenanceDue: iso(30), assignedCrewShift: 'A', notes: 'Frontline transport unit.' },
];

const generatedApparatus = Array.from({ length: 30 }, (_, index) => {
  const station = stations[index % stations.length];
  const apparatusType = apparatusTypes[index % apparatusTypes.length];
  const unitPrefix = apparatusType.name.includes('Medic') ? 'Medic' : apparatusType.name.includes('Ladder') ? 'Ladder' : apparatusType.name.includes('Brush') ? 'Brush' : apparatusType.name.includes('Battalion') ? 'Battalion' : apparatusType.name.includes('Utility') ? 'Utility' : apparatusType.name.includes('Rescue') ? 'Rescue' : 'Engine';
  const readinessScore = [97, 92, 89, 84, 78, 72, 66, 58][index % 8];
  const status = readinessScore >= 90 ? 'Ready' : readinessScore >= 75 ? 'Warning' : readinessScore >= 60 ? 'Maintenance Due' : 'Out of Service';
  return {
    id: `apparatus-gen-${index + 1}`,
    tenantId,
    stationId: station.id,
    unitNumber: `${unitPrefix} ${index + 10}`,
    callSign: `${unitPrefix.slice(0, 3).toUpperCase()}-${index + 10}`,
    apparatusTypeId: apparatusType.id,
    apparatusType: apparatusType.name,
    make: ['Pierce', 'Wheeled Coach', 'E-One', 'Ford', 'Ram'][index % 5],
    model: ['Enforcer', 'F-550', 'Velocity', 'Transit', '3500'][index % 5],
    year: 2017 + (index % 8),
    vin: `VIN${String(index + 1000).padStart(6, '0')}`,
    licensePlate: `WM-${String(index + 10).padStart(3, '0')}${unitPrefix[0]}`,
    status,
    readinessScore,
    mileage: 6000 + index * 420,
    engineHours: 180 + index * 24,
    lastInspectionDate: historicalIso(5 + (index % 25)),
    nextInspectionDue: iso(10 + (index % 35)),
    lastMaintenanceDate: historicalIso(8 + (index % 18)),
    nextMaintenanceDue: iso(5 + (index % 28)),
    assignedCrewShift: ['A', 'B', 'C'][index % 3],
    notes: index % 4 === 0 ? 'Coverage support apparatus with recurring check schedule.' : 'Operational response unit.',
  };
}).map((unit) => ({
  ...unit,
  name: unit.unitNumber,
  createdAt: historicalIso(400),
  updatedAt: historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
}));

const apparatus = [...apparatusBase, ...generatedApparatus];

const generatedAssets = Array.from({ length: 145 }, (_, index) => {
  const station = stations[index % stations.length];
  const apparatusRef = apparatus[index % apparatus.length];
  const assignedPersonnel = personnel[index % personnel.length];
  const categories = ['SCBA', 'EMS', 'Comms', 'Extrication', 'Wildland', 'PPE'];
  const statusCycle = ['READY', 'WARNING', 'OUT_OF_SERVICE', 'MAINTENANCE_DUE', 'READY'];
  const conditionCycle = ['Good', 'Good', 'Fair', 'Needs Service', 'Fair'];
  return {
    id: `asset-gen-${index + 1}`,
    assetTag: `EQ-${String(index + 101).padStart(4, '0')}`,
    name: `${categories[index % categories.length]} Asset ${index + 1}`,
    category: categories[index % categories.length],
    subcategory: `${categories[index % categories.length]} Subcategory`,
    serialNumber: `SN-${String(index + 5000).padStart(6, '0')}`,
    manufacturer: ['Scott', 'Zoll', 'Motorola', 'Hurst', 'Safeland'][index % 5],
    model: ['AirPak', 'X-Series', 'APX', 'eDraulic', 'WildPak'][index % 5],
    purchaseDate: historicalIso(500 - index),
    warrantyExpiryDate: index % 3 === 0 ? iso(90 - index) : iso(365 - index),
    usefulLifeMonths: 84,
    status: statusCycle[index % statusCycle.length],
    condition: conditionCycle[index % conditionCycle.length],
    stationId: index % 3 === 0 ? station.id : null,
    apparatusId: index % 3 === 1 ? apparatusRef.id : null,
    assignedPersonnelId: index % 3 === 2 ? assignedPersonnel.id : null,
    locationType: index % 3 === 0 ? 'Station' : index % 3 === 1 ? 'Apparatus' : 'Personnel',
    locationDescription: index % 3 === 0 ? station.name : index % 3 === 1 ? apparatusRef.unitNumber : `${assignedPersonnel.firstName} ${assignedPersonnel.lastName}`,
    readinessImpact: [2, 4, 8, 12, 15][index % 5],
    replacementCost: 850 + index * 55,
    notes: index % 6 === 0 ? 'Critical replacement candidate.' : 'Operationally assigned equipment.',
    tenantId,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const assets = [
  { id: 'asset-1', assetTag: 'A-004-M', name: 'Medic 4', category: 'Vehicle', subcategory: 'Transport', serialNumber: 'VEH-004M', manufacturer: 'Ford', model: 'E-450', purchaseDate: historicalIso(500), warrantyExpiryDate: iso(90), usefulLifeMonths: 120, stationId: stations[3].id, apparatusId: apparatus[0].id, status: 'Warning', condition: 'Fair', locationType: 'Apparatus', locationDescription: 'Medic 4', readinessImpact: 18, replacementCost: 145000, notes: 'Brake inspection due and patient compartment audit pending.' },
  { id: 'asset-2', assetTag: 'A-004-E', name: 'Engine 4', category: 'Vehicle', subcategory: 'Suppression', serialNumber: 'VEH-004E', manufacturer: 'Pierce', model: 'Enforcer', purchaseDate: historicalIso(500), warrantyExpiryDate: iso(180), usefulLifeMonths: 144, stationId: stations[3].id, apparatusId: apparatus[1].id, status: 'Ready', condition: 'Good', locationType: 'Apparatus', locationDescription: 'Engine 4', readinessImpact: 4, replacementCost: 670000, notes: 'Current and fully operational.' },
  { id: 'asset-3', assetTag: 'A-009-E', name: 'Engine 9', category: 'Vehicle', subcategory: 'Suppression', serialNumber: 'VEH-009E', manufacturer: 'Pierce', model: 'Enforcer', purchaseDate: historicalIso(500), warrantyExpiryDate: iso(150), usefulLifeMonths: 144, stationId: stations[8].id, apparatusId: apparatus[2].id, status: 'Warning', condition: 'Fair', locationType: 'Apparatus', locationDescription: 'Engine 9', readinessImpact: 12, replacementCost: 680000, notes: 'Pump service in 6 days.' },
  { id: 'asset-4', assetTag: 'A-017-B', name: 'Brush 17', category: 'Vehicle', subcategory: 'Wildland', serialNumber: 'VEH-017B', manufacturer: 'Ford', model: 'F-550', purchaseDate: historicalIso(500), warrantyExpiryDate: iso(220), usefulLifeMonths: 144, stationId: stations[16].id, apparatusId: apparatus[3].id, status: 'Ready', condition: 'Good', locationType: 'Apparatus', locationDescription: 'Brush 17', readinessImpact: 3, replacementCost: 215000, notes: 'Current and ready.' },
  { id: 'asset-5', assetTag: 'A-002-M', name: 'Medic 2', category: 'Vehicle', subcategory: 'Transport', serialNumber: 'VEH-002M', manufacturer: 'Ford', model: 'Transit', purchaseDate: historicalIso(500), warrantyExpiryDate: iso(200), usefulLifeMonths: 120, stationId: stations[1].id, apparatusId: apparatus[4].id, status: 'Ready', condition: 'Good', locationType: 'Apparatus', locationDescription: 'Medic 2', readinessImpact: 2, replacementCost: 140000, notes: 'Current and ready.' },
  ...generatedAssets,
].map((asset: any) => ({
  ...asset,
  tenantId,
  createdAt: asset.createdAt ?? historicalIso(200),
  updatedAt: asset.updatedAt ?? historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
}));

const inventoryItemsBase = [
  { id: 'inventory-1', stationId: stations[3].id, apparatusId: apparatus[0].id, vendorId: 'vendor-2', sku: 'MED-001', name: 'Oxygen Cylinder', category: 'EMS', unitOfMeasure: 'each', quantityOnHand: 8, reorderPoint: 4, reorderQuantity: 8, maxStockLevel: 16, expirationDate: iso(90), lotNumber: 'LOT-MED-01', readinessCriticality: 'Critical', status: 'In Stock' },
  { id: 'inventory-2', stationId: stations[1].id, apparatusId: apparatus[4].id, vendorId: 'vendor-2', sku: 'MED-002', name: 'Trauma Kit', category: 'EMS', unitOfMeasure: 'each', quantityOnHand: 12, reorderPoint: 5, reorderQuantity: 10, maxStockLevel: 24, expirationDate: iso(120), lotNumber: 'LOT-MED-02', readinessCriticality: 'Critical', status: 'In Stock' },
  { id: 'inventory-3', stationId: stations[8].id, apparatusId: apparatus[2].id, vendorId: 'vendor-7', sku: 'FIR-001', name: 'Hose Pack', category: 'Operations', unitOfMeasure: 'each', quantityOnHand: 6, reorderPoint: 3, reorderQuantity: 6, maxStockLevel: 12, expirationDate: null, lotNumber: 'LOT-FIR-01', readinessCriticality: 'High', status: 'In Stock' },
  { id: 'inventory-4', stationId: stations[16].id, apparatusId: apparatus[3].id, vendorId: 'vendor-6', sku: 'WLD-001', name: 'Chainsaw Fuel', category: 'Wildland', unitOfMeasure: 'bottle', quantityOnHand: 14, reorderPoint: 6, reorderQuantity: 12, maxStockLevel: 24, expirationDate: iso(180), lotNumber: 'LOT-WLD-01', readinessCriticality: 'High', status: 'In Stock' },
  { id: 'inventory-5', stationId: stations[0].id, apparatusId: apparatus[5].id ?? null, vendorId: 'vendor-2', sku: 'GEN-001', name: 'AED Pads', category: 'EMS', unitOfMeasure: 'pair', quantityOnHand: 18, reorderPoint: 8, reorderQuantity: 16, maxStockLevel: 24, expirationDate: iso(60), lotNumber: 'LOT-EMS-01', readinessCriticality: 'Critical', status: 'In Stock' },
];

const generatedInventoryItems = Array.from({ length: 115 }, (_, index) => {
  const station = stations[index % stations.length];
  const apparatusRef = apparatus[index % apparatus.length];
  const vendor = vendors[index % vendors.length];
  const categories = ['EMS', 'Operations', 'Wildland', 'PPE', 'Comms', 'Maintenance'];
  const statusCycle = ['In Stock', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'In Stock', 'In Stock'];
  const quantity = [2, 4, 6, 8, 12, 18][index % 6];
  const reorderPoint = [4, 6, 8, 10, 12][index % 5];
  const expirationDate = index % 4 === 0 ? iso(14 + (index % 12)) : index % 7 === 0 ? iso(-5 + (index % 3)) : null;
  return {
    id: `inventory-gen-${index + 1}`,
    stationId: index % 2 === 0 ? station.id : null,
    apparatusId: index % 3 === 0 ? apparatusRef.id : null,
    vendorId: vendor.id,
    sku: `INV-${String(index + 100).padStart(4, '0')}`,
    name: `${categories[index % categories.length]} Item ${index + 1}`,
    category: categories[index % categories.length],
    unitOfMeasure: index % 2 === 0 ? 'each' : 'box',
    quantityOnHand: quantity,
    reorderPoint,
    reorderQuantity: reorderPoint * 2,
    maxStockLevel: reorderPoint * 4,
    expirationDate,
    lotNumber: `LOT-${index + 1}`,
    readinessCriticality: index % 3 === 0 ? 'Critical' : index % 2 === 0 ? 'High' : 'Normal',
    status: statusCycle[index % statusCycle.length],
    tenantId,
    createdAt: historicalIso(50),
    updatedAt: historicalIso(1),
  };
});

const inventoryItems = [
  ...inventoryItemsBase,
  ...generatedInventoryItems,
].map((item: any) => ({
  ...item,
  tenantId,
  createdAt: item.createdAt ?? historicalIso(50),
  updatedAt: item.updatedAt ?? historicalIso(1),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
}));

const inventoryTransactions = Array.from({ length: 180 }, (_, index) => {
  const item = inventoryItems[index % inventoryItems.length];
  const transactionTypes = ['Receive', 'Issue', 'Transfer', 'Assign to Apparatus', 'Consume', 'Adjust', 'Expire', 'Dispose'];
  const station = stations[index % stations.length];
  const nextStation = stations[(index + 1) % stations.length];
  return {
    id: `inv-tx-${index + 1}`,
    tenantId,
    inventoryItemId: item.id,
    transactionType: transactionTypes[index % transactionTypes.length],
    quantity: [1, 2, 4, 6, 8][index % 5],
    fromStationId: index % 3 === 0 ? station.id : null,
    toStationId: index % 4 === 0 ? nextStation.id : null,
    apparatusId: index % 2 === 0 ? apparatus[index % apparatus.length].id : null,
    performedByPersonnelId: personnel[index % personnel.length].id,
    reason: index % 5 === 0 ? 'Routine replenishment' : 'Operational usage',
    referenceType: index % 2 === 0 ? 'MaintenanceEvent' : 'Incident',
    referenceId: index % 2 === 0 ? `maintenance-${(index % 50) + 1}` : `incident-${(index % 105) + 1}`,
    transactionDate: historicalIso(15 + (index % 30) * 0.2),
    createdAt: historicalIso(15 + (index % 30) * 0.2),
  };
});

const maintenanceEvents = Array.from({ length: 50 }, (_, index) => {
  const apparatusRef = apparatus[index % apparatus.length];
  const assetRef = assets[index % assets.length];
  const vendor = vendors[index % vendors.length];
  const statusCycle = ['Reported', 'Scheduled', 'In Progress', 'Completed', 'Deferred', 'Cancelled'];
  const priorityCycle = ['Critical', 'High', 'Normal', 'Low'];
  return {
    id: `maintenance-${index + 1}`,
    tenantId,
    apparatusId: index % 2 === 0 ? apparatusRef.id : null,
    assetId: index % 2 === 1 ? assetRef.id : null,
    title: `${index % 2 === 0 ? apparatusRef.unitNumber : assetRef.name} ${index % 3 === 0 ? 'preventive service' : 'repair'}`,
    description: 'Operational maintenance event seeded for logistics readiness.',
    maintenanceType: index % 2 === 0 ? 'Preventive' : 'Corrective',
    status: statusCycle[index % statusCycle.length],
    priority: priorityCycle[index % priorityCycle.length],
    reportedByPersonnelId: personnel[index % personnel.length].id,
    assignedToPersonnelId: personnel[(index + 7) % personnel.length].id,
    vendorId: vendor.id,
    reportedDate: historicalIso(10 + (index % 20) * 0.3),
    scheduledDate: index % 3 === 0 ? iso(index % 2 === 0 ? 5 : -3) : iso(8 + (index % 10)),
    startedDate: index % 4 === 0 ? historicalIso(5 + (index % 8) * 0.2) : null,
    completedDate: index % 4 === 0 ? historicalIso(2 + (index % 8) * 0.1) : null,
    estimatedCost: 1200 + index * 85,
    actualCost: index % 4 === 0 ? 900 + index * 70 : null,
    downtimeHours: index % 4 === 0 ? 2 + (index % 6) : null,
    resolutionNotes: index % 4 === 0 ? 'Maintenance completed and returned to service.' : null,
    createdAt: historicalIso(12 + (index % 20) * 0.3),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const preventiveMaintenanceSchedules = Array.from({ length: 60 }, (_, index) => {
  const apparatusRef = apparatus[index % apparatus.length];
  const assetRef = assets[index % assets.length];
  const dueOffset = index % 5 === 0 ? -8 : index % 4 === 0 ? 3 : 14 + (index % 30);
  return {
    id: `pm-${index + 1}`,
    tenantId,
    apparatusId: index % 2 === 0 ? apparatusRef.id : null,
    assetId: index % 2 === 1 ? assetRef.id : null,
    maintenanceName: `${index % 2 === 0 ? apparatusRef.unitNumber : assetRef.name} scheduled service`,
    frequencyType: index % 3 === 0 ? 'Days' : index % 3 === 1 ? 'Weeks' : 'Months',
    frequencyValue: index % 3 === 0 ? 30 : index % 3 === 1 ? 12 : 6,
    lastCompletedDate: index % 4 === 0 ? historicalIso(40 + index) : null,
    nextDueDate: iso(dueOffset),
    status: dueOffset < 0 ? 'Overdue' : dueOffset <= 7 ? 'Due Soon' : 'Scheduled',
    assignedToPersonnelId: personnel[index % personnel.length].id,
    createdAt: historicalIso(20),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const purchaseReorderRecommendations = Array.from({ length: 18 }, (_, index) => {
  const item = inventoryItems[index % inventoryItems.length];
  const vendor = vendors[index % vendors.length];
  const station = stations[index % stations.length];
  const apparatusRef = apparatus[index % apparatus.length];
  const recommendedQuantity = Math.max(4, Number(item.reorderPoint ?? 4) * 2);
  return {
    id: `reorder-${index + 1}`,
    tenantId,
    inventoryItemId: item.id,
    stationId: index % 2 === 0 ? station.id : null,
    apparatusId: index % 3 === 0 ? apparatusRef.id : null,
    recommendedQuantity,
    reason: `${item.name} is below minimum readiness threshold or projected to expire soon.`,
    priority: index % 4 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : 'Normal',
    estimatedCost: recommendedQuantity * 42,
    vendorId: vendor.id,
    status: index % 5 === 0 ? 'Pending Approval' : 'Draft',
    createdAt: historicalIso(18),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const assetReadinessSnapshots = [
  ...stations.map((station, index) => {
    const stationApparatus = apparatus.filter((unit) => unit.stationId === station.id);
    const stationAssets = assets.filter((asset) => asset.stationId === station.id);
    const stationInventory = inventoryItems.filter((item) => item.stationId === station.id);
    const score = Math.max(55, 96 - index * 2 - stationAssets.filter((asset) => ['Warning', 'OUT_OF_SERVICE', 'Maintenance Due'].includes(String(asset.status))).length * 4 - stationInventory.filter((item) => ['Low Stock', 'Out of Stock', 'Expiring Soon'].includes(String(item.status))).length * 3);
    return {
      id: `snapshot-station-${index + 1}`,
      tenantId,
      stationId: station.id,
      apparatusId: null,
      snapshotDate: historicalIso(index),
      apparatusReadinessScore: score,
      equipmentReadinessScore: Math.max(60, score - 4),
      inventoryReadinessScore: Math.max(58, score - 8),
      maintenanceRiskScore: Math.max(50, 100 - stationApparatus.length * 2 - stationAssets.filter((asset) => String(asset.status) !== 'Ready').length * 3),
      overallAssetReadinessScore: score,
      riskLevel: score >= 90 ? 'Ready' : score >= 75 ? 'Watch' : score >= 60 ? 'At Risk' : 'Critical',
      evidenceSummary: `${stationApparatus.length} apparatus, ${stationAssets.length} assets, ${stationInventory.length} inventory items reviewed.`,
      createdAt: historicalIso(1),
      createdBy: null,
      updatedBy: null,
      isDeleted: false,
    };
  }),
  ...apparatus.map((unit, index) => ({
    id: `snapshot-apparatus-${index + 1}`,
    tenantId,
    stationId: unit.stationId,
    apparatusId: unit.id,
    snapshotDate: historicalIso(index % 14),
    apparatusReadinessScore: unit.readinessScore ?? 85,
    equipmentReadinessScore: Math.max(60, (unit.readinessScore ?? 85) - 5),
    inventoryReadinessScore: Math.max(60, (unit.readinessScore ?? 85) - 8),
    maintenanceRiskScore: Math.max(40, 100 - Number(unit.readinessScore ?? 85)),
    overallAssetReadinessScore: unit.readinessScore ?? 85,
    riskLevel: Number(unit.readinessScore ?? 85) >= 90 ? 'Ready' : Number(unit.readinessScore ?? 85) >= 75 ? 'Watch' : Number(unit.readinessScore ?? 85) >= 60 ? 'At Risk' : 'Critical',
    evidenceSummary: `${unit.unitNumber} readiness calculated from maintenance and inventory support.`,
    createdAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  })),
];

const properties = Array.from({ length: 60 }, (_, index) => {
  const station = stations[index % stations.length];
  const propertyType = ['Commercial', 'Residential', 'School', 'Healthcare', 'Industrial', 'Multi-Family', 'Warehouse', 'Restaurant', 'High-Rise', 'WUI Adjacency'][index % 10];
  const occupancyRiskLevel = index % 10 === 0 ? 'Critical' : index % 4 === 0 ? 'High' : index % 3 === 0 ? 'Moderate' : 'Low';
  return {
    id: `property-${index + 1}`,
    tenantId,
    propertyNumber: `PR-${String(index + 1).padStart(4, '0')}`,
    name: `${propertyType} Property ${index + 1}`,
    propertyType,
    addressLine1: `${500 + index} Colfax Ave`,
    addressLine2: index % 9 === 0 ? `Suite ${100 + index}` : null,
    address: `${500 + index} Colfax Ave`,
    city: index % 2 === 0 ? 'Lakewood' : 'Wheat Ridge',
    state: 'CO',
    zip: `80${String(200 + (index % 80)).padStart(3, '0')}`,
    occupancyType: ['commercial', 'residential multi-family', 'school', 'healthcare', 'industrial', 'mixed use', 'warehouse', 'restaurant', 'high-rise', 'wui-adjacent'][index % 10],
    occupancyRiskLevel,
    riskLevel: occupancyRiskLevel,
    responseStationId: station.id,
    battalionId: station.battalionId,
    stationArea: station.name,
    fireFlowRequirement: 2500 + index * 75,
    squareFootage: 12000 + index * 850,
    stories: 1 + (index % 8),
    constructionType: ['Type I', 'Type II', 'Type III', 'Type IV', 'Type V'][index % 5],
    sprinklered: index % 4 !== 0,
    alarmSystem: index % 5 !== 0,
    KnoxBox: index % 3 === 0,
    specialHazards: index % 6 === 0,
    latitude: 39.7 + index * 0.01,
    longitude: -105.1 - index * 0.01,
    status: index % 11 === 0 ? 'Review Due' : 'Active',
    createdAt: historicalIso(300),
    updatedAt: historicalIso(1),
    createdBy: null,
    updatedBy: null,
    isDeleted: false,
  };
});

const occupancies = Array.from({ length: 75 }, (_, index) => {
  const property = properties[index % properties.length];
  return {
    id: `occupancy-${index + 1}`,
    tenantId,
    propertyId: property.id,
    occupancyName: `${property.name} Occupancy ${index + 1}`,
    occupancyType: property.propertyType,
    businessType: property.propertyType,
    contactName: ['Alex Morgan', 'Taylor Brooks', 'Jordan Fields', 'Maya Chen', 'Chris Alvarez'][index % 5],
    contactPhone: `303-777-${String(1000 + index).slice(-4)}`,
    contactEmail: `contact${index + 1}@westmetro.example`,
    maxOccupancy: 75 + index * 3,
    highRisk: index % 4 === 0,
    hazardousMaterials: index % 6 === 0,
    inspectionFrequencyMonths: index % 4 === 0 ? 3 : index % 3 === 0 ? 6 : 12,
    lastInspectionDate: historicalIso(15 + (index % 45)),
    nextInspectionDue: iso(index % 4 === 0 ? -8 : index % 3 === 0 ? 12 : 34),
    status: index % 8 === 0 ? 'Review Due' : 'Active',
    notes: index % 5 === 0 ? 'High-risk occupancy with elevated community exposure.' : property.occupancyType,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
    isDeleted: false,
  };
});

const preventionOfficers = personnel.filter((member) => String(member.rank).toLowerCase().includes('prevention') || String(member.roleTitle).toLowerCase().includes('prevention'));
const preventionInspectors = preventionOfficers.length ? preventionOfficers : personnel.slice(0, 6);
const inspectionChecklistCategories = [
  'Access / egress',
  'Fire alarm',
  'Sprinkler system',
  'Electrical hazards',
  'Storage / combustibles',
  'Exit signage',
  'Fire extinguishers',
  'Hazardous materials',
  'Occupant load',
  'KnoxBox / key access',
];

const inspections = Array.from({ length: 120 }, (_, index) => {
  const property = properties[index % properties.length];
  const occupancy = occupancies[index % occupancies.length];
  const inspector = preventionInspectors[index % preventionInspectors.length];
  const scheduledOffset = index % 5 === 0 ? -12 - index : index % 3 === 0 ? 4 + index : 8 + index;
  const status = index % 11 === 0 ? 'Reinspection Required' : index % 7 === 0 ? 'Failed' : index % 5 === 0 ? 'Passed' : index % 3 === 0 ? 'In Progress' : 'Scheduled';
  return {
    id: `inspection-${index + 1}`,
    tenantId,
    propertyId: property.id,
    occupancyId: occupancy.id,
    assignedInspectorPersonnelId: inspector.id,
    inspectionType: index % 4 === 0 ? 'Annual' : index % 4 === 1 ? 'Reinspection' : index % 4 === 2 ? 'Complaint' : 'Construction',
    scheduledDate: iso(scheduledOffset),
    startedAt: index % 3 === 0 ? historicalIso(2 + (index % 4)) : null,
    completedAt: status === 'Passed' || status === 'Failed' || status === 'Reinspection Required' ? historicalIso(1 + (index % 4) * 0.2) : null,
    status,
    result: status === 'Passed' ? 'Passed' : status === 'Failed' ? 'Failed' : status === 'Reinspection Required' ? 'Reinspection Required' : 'Pending',
    riskScoreBefore: 42 + (index % 46),
    riskScoreAfter: status === 'Passed' ? 24 + (index % 22) : 48 + (index % 30),
    notes: index % 6 === 0 ? 'High-risk occupancy requires follow-up on checklist failures.' : 'Standard prevention inspection workflow.',
    createdAt: historicalIso(20),
    updatedAt: historicalIso(1),
  };
});

const incidentTemplates = [
  { incidentType: 'EMS - Cardiac', recordType: 'EMS Run', status: 'Submitted', qaStatus: 'QA Needed', source: 'CAD Import', priority: 'High', patientCount: 1 },
  { incidentType: 'Structure Fire', recordType: 'Fire Report', status: 'Approved', qaStatus: 'Passed', source: 'CAD Import', priority: 'Critical', patientCount: 0 },
  { incidentType: 'Vehicle Accident', recordType: 'EMS Run', status: 'Submitted', qaStatus: 'QA Needed', source: 'ePCR Sync', priority: 'High', patientCount: 2 },
  { incidentType: 'Wildland Interface Check', recordType: 'Fire Report', status: 'Closed', qaStatus: 'Passed', source: 'Mobile Entry', priority: 'Medium', patientCount: 0 },
  { incidentType: 'Inspection', recordType: 'Support Record', status: 'Draft', qaStatus: 'Open', source: 'Manual Entry', priority: 'Normal', patientCount: 0 },
  { incidentType: 'HazMat', recordType: 'Incident Report', status: 'QA Needed', qaStatus: 'QA Needed', source: 'CAD Import', priority: 'Critical', patientCount: 0 },
  { incidentType: 'EMS - Fall Injury', recordType: 'EMS Run', status: 'Submitted', qaStatus: 'Passed', source: 'ePCR Sync', priority: 'Normal', patientCount: 1 },
  { incidentType: 'Structure Alarm', recordType: 'Incident Report', status: 'Submitted', qaStatus: 'QA Needed', source: 'CAD Import', priority: 'Medium', patientCount: 0 },
];

const fixedIncidents = [
  { id: 'incident-1', incidentNumber: 'WM-260601-0182', incidentType: 'EMS - Cardiac', stationId: stations[3].id, propertyId: properties[3].id, occupancyId: occupancies[3].id, location: 'W Alameda Ave', city: 'Lakewood', status: 'Submitted', qaStatus: 'QA Needed', source: 'CAD Import', units: ['Medic 4', 'Engine 4'], priority: 'High', dispatchAt: historicalIso(1), arrivalAt: historicalIso(1), clearedAt: null, nerisReady: true, epcrLinked: true, recordType: 'EMS Run', reportNumber: 'RPT-260601-001', patientCount: 1, assignedTo: 'Jordan Ellis', nerisStatus: 'Queued', epcrStatus: 'Linked', narrativeComplete: true, attachmentsComplete: false, lastUpdatedAt: historicalIso(0.3), turnaroundMinutes: 22 },
  { id: 'incident-2', incidentNumber: 'WM-260601-0183', incidentType: 'Structure Alarm', stationId: stations[8].id, propertyId: properties[8].id, occupancyId: occupancies[8].id, location: 'Kipling St', city: 'Wheat Ridge', status: 'Draft', qaStatus: 'Open', source: 'CAD Import', units: ['Engine 9', 'Tower 2'], priority: 'Medium', dispatchAt: historicalIso(0.8), arrivalAt: historicalIso(0.7), clearedAt: null, nerisReady: true, epcrLinked: false, recordType: 'Incident Report', reportNumber: 'RPT-260601-002', patientCount: 0, assignedTo: 'Aisha Turner', nerisStatus: 'Ready', epcrStatus: 'Not Required', narrativeComplete: false, attachmentsComplete: true, lastUpdatedAt: historicalIso(0.5), turnaroundMinutes: 14 },
  { id: 'incident-3', incidentNumber: 'WM-260601-0184', incidentType: 'Wildland Interface Check', stationId: stations[16].id, propertyId: properties[16].id, occupancyId: occupancies[16].id, location: 'Foothills Ridge', city: 'WUI Zone', status: 'Closed', qaStatus: 'Passed', source: 'Mobile Entry', units: ['Brush 17'], priority: 'Medium', dispatchAt: historicalIso(1.4), arrivalAt: historicalIso(1.3), clearedAt: historicalIso(1.1), nerisReady: true, epcrLinked: false, recordType: 'Fire Report', reportNumber: 'RPT-260601-003', patientCount: 0, assignedTo: 'Jordan Fields', nerisStatus: 'Validated', epcrStatus: 'Not Required', narrativeComplete: true, attachmentsComplete: true, lastUpdatedAt: historicalIso(1.2), turnaroundMinutes: 19 },
  { id: 'incident-4', incidentNumber: 'WM-260601-0185', incidentType: 'EMS - Fall Injury', stationId: stations[1].id, propertyId: properties[1].id, occupancyId: occupancies[1].id, location: 'W 38th Ave', city: 'Wheat Ridge', status: 'Submitted', qaStatus: 'Passed', source: 'ePCR Sync', units: ['Medic 2'], priority: 'Normal', dispatchAt: historicalIso(0.6), arrivalAt: historicalIso(0.55), clearedAt: historicalIso(0.4), nerisReady: true, epcrLinked: true, recordType: 'EMS Run', reportNumber: 'RPT-260601-004', patientCount: 1, assignedTo: 'Maya Chen', nerisStatus: 'Queued', epcrStatus: 'Transmitted', narrativeComplete: true, attachmentsComplete: true, lastUpdatedAt: historicalIso(0.2), turnaroundMinutes: 11 },
  { id: 'incident-5', incidentNumber: 'WM-260601-0186', incidentType: 'Vehicle Accident', stationId: stations[7].id, propertyId: properties[7].id, occupancyId: occupancies[7].id, location: 'I-70 Corridor', city: 'Edgewater Area', status: 'Submitted', qaStatus: 'QA Needed', source: 'CAD Import', units: ['Engine 8', 'Medic 8'], priority: 'High', dispatchAt: historicalIso(0.4), arrivalAt: historicalIso(0.3), clearedAt: null, nerisReady: false, epcrLinked: false, recordType: 'EMS Run', reportNumber: 'RPT-260601-005', patientCount: 2, assignedTo: 'Chris Alvarez', nerisStatus: 'Rejected', epcrStatus: 'Failed', narrativeComplete: true, attachmentsComplete: false, lastUpdatedAt: historicalIso(0.1), turnaroundMinutes: 26 },
];

const generatedIncidents = Array.from({ length: 100 }, (_, index) => {
  const template = incidentTemplates[index % incidentTemplates.length];
  const station = stations[index % stations.length];
  const stationCrew = personnel.filter((member) => member.stationId === station.id && member.status === 'Active');
  const assignedTo = stationCrew[0];
  const unitsForStation = apparatus.filter((unit) => unit.stationId === station.id);
  const primaryUnit = unitsForStation[0] ?? apparatus[index % apparatus.length];
  const supportUnit = unitsForStation[1] ?? apparatus[(index + 3) % apparatus.length];
  const dispatchAt = historicalIso(0.25 + index * 0.08);
  const arrivalAt = historicalIso(0.2 + index * 0.08);
  const isEms = template.recordType === 'EMS Run';
  const isExportBlocked = index % 11 === 0;
  return {
    id: `incident-gen-${index + 1}`,
    incidentNumber: `WM-260601-${String(1900 + index).padStart(4, '0')}`,
    incidentType: template.incidentType,
    stationId: station.id,
    propertyId: properties[index % properties.length].id,
    occupancyId: occupancies[(index + station.id.length) % occupancies.length]?.id ?? occupancies[index % occupancies.length].id,
    location: station.address ?? `${station.name} Response Area`,
    city: station.city ?? 'West Metro',
    status: template.status,
    qaStatus: template.qaStatus,
    source: template.source,
    units: supportUnit ? [primaryUnit.unitNumber, supportUnit.unitNumber] : [primaryUnit.unitNumber],
    priority: template.priority,
    dispatchAt,
    arrivalAt,
    clearedAt: template.status === 'Closed' ? historicalIso(0.05 + index * 0.04) : null,
    nerisReady: !isExportBlocked && index % 7 !== 0,
    epcrLinked: isEms && !isExportBlocked,
    recordType: template.recordType,
    reportNumber: `RPT-260601-${String(100 + index).padStart(3, '0')}`,
    patientCount: template.patientCount,
    assignedTo: assignedTo ? `${assignedTo.firstName} ${assignedTo.lastName}` : 'Unassigned',
    nerisStatus: isExportBlocked ? 'Rejected' : template.status === 'Closed' ? 'Validated' : template.qaStatus === 'QA Needed' ? 'Queued' : 'Ready',
    epcrStatus: isEms ? (isExportBlocked ? 'Failed' : template.status === 'Closed' ? 'Transmitted' : 'Linked') : 'Not Required',
    narrativeComplete: index % 5 !== 0,
    attachmentsComplete: index % 3 !== 0,
    lastUpdatedAt: historicalIso(0.05 + index * 0.05),
    turnaroundMinutes: 10 + (index % 19),
  };
}).map((incident: any) => ({
  ...incident,
  tenantId,
  createdAt: historicalIso(8 + (Number(incident.id.replace('incident-gen-', '')) % 24) * 0.15),
  updatedAt: historicalIso(0.05 + (Number(incident.id.replace('incident-gen-', '')) % 12) * 0.05),
}));

const incidents = [...fixedIncidents, ...generatedIncidents].map((incident: any) => ({
  ...incident,
  tenantId,
  createdAt: incident.createdAt ?? historicalIso(2),
  updatedAt: incident.updatedAt ?? historicalIso(0.3),
}));

const incidentUnits = [
  { id: 'incident-unit-1', tenantId, incidentId: 'incident-1', apparatusId: apparatus[0].id, unitName: 'Medic 4', role: 'Primary Transport' },
  { id: 'incident-unit-2', tenantId, incidentId: 'incident-1', apparatusId: apparatus[1].id, unitName: 'Engine 4', role: 'Support' },
  { id: 'incident-unit-3', tenantId, incidentId: 'incident-2', apparatusId: apparatus[2].id, unitName: 'Engine 9', role: 'Primary' },
  { id: 'incident-unit-4', tenantId, incidentId: 'incident-3', apparatusId: apparatus[3].id, unitName: 'Brush 17', role: 'Primary' },
  { id: 'incident-unit-5', tenantId, incidentId: 'incident-4', apparatusId: apparatus[4].id, unitName: 'Medic 2', role: 'Primary Transport' },
  { id: 'incident-unit-6', tenantId, incidentId: 'incident-5', apparatusId: apparatus[2].id, unitName: 'Engine 8', role: 'Primary' },
  { id: 'incident-unit-7', tenantId, incidentId: 'incident-5', apparatusId: apparatus[0].id, unitName: 'Medic 8', role: 'Transport' },
  ...generatedIncidents.flatMap((incident, index) => {
    const stationUnits = apparatus.filter((unit) => unit.stationId === incident.stationId);
    const primary = stationUnits[0] ?? apparatus[index % apparatus.length];
    const support = stationUnits[1] ?? apparatus[(index + 5) % apparatus.length];
    const rows = [
      { id: `incident-unit-gen-${index + 1}-1`, tenantId, incidentId: incident.id, apparatusId: primary.id, unitName: primary.unitNumber, role: 'Primary' },
    ];
    if (support && support.id !== primary.id) {
      rows.push({ id: `incident-unit-gen-${index + 1}-2`, tenantId, incidentId: incident.id, apparatusId: support.id, unitName: support.unitNumber, role: 'Support' });
    }
    return rows;
  }),
].map((unit) => ({ ...unit, createdAt: historicalIso(2), updatedAt: historicalIso(1) }));

const incidentPersonnel = [
  { id: 'incident-person-1', tenantId, incidentId: 'incident-1', personnelId: personnel[0].id, roleAtIncident: 'Lead Paramedic' },
  { id: 'incident-person-2', tenantId, incidentId: 'incident-1', personnelId: personnel[1].id, roleAtIncident: 'Engineer' },
  { id: 'incident-person-3', tenantId, incidentId: 'incident-4', personnelId: personnel[2].id, roleAtIncident: 'Paramedic' },
  { id: 'incident-person-4', tenantId, incidentId: 'incident-5', personnelId: personnel[3].id, roleAtIncident: 'Officer' },
  ...generatedIncidents.flatMap((incident, index) => {
    const stationCrew = personnel.filter((member) => member.stationId === incident.stationId && member.status === 'Active').slice(0, 3);
    return stationCrew.map((member, crewIndex) => ({
      id: `incident-person-gen-${index + 1}-${crewIndex + 1}`,
      tenantId,
      incidentId: incident.id,
      personnelId: member.id,
      roleAtIncident: crewIndex === 0 ? 'Lead' : crewIndex === 1 ? 'Engineer' : 'Crew Member',
    }));
  }),
].map((item) => ({ ...item, createdAt: historicalIso(2), updatedAt: historicalIso(1) }));

const nerisMappings = [
  { id: 'neris-map-1', tenantId, internalField: 'incidentNumber', nerisField: 'IncidentNumber', required: true, validationRule: 'NotEmpty', validationStatus: 'Valid', exportReadiness: 100, lastExportedAt: historicalIso(0.2), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'neris-map-2', tenantId, internalField: 'incidentType', nerisField: 'IncidentType', required: true, validationRule: 'CategoryMatch', validationStatus: 'Valid', exportReadiness: 96, lastExportedAt: historicalIso(0.2), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'neris-map-3', tenantId, internalField: 'stationId', nerisField: 'StationID', required: true, validationRule: 'Lookup', validationStatus: 'Warning', exportReadiness: 88, lastExportedAt: historicalIso(0.6), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'neris-map-4', tenantId, internalField: 'location', nerisField: 'Address', required: true, validationRule: 'NotEmpty', validationStatus: 'Valid', exportReadiness: 98, lastExportedAt: historicalIso(0.3), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'neris-map-5', tenantId, internalField: 'qaStatus', nerisField: 'QAStatus', required: true, validationRule: 'StatusMatch', validationStatus: 'Warning', exportReadiness: 84, lastExportedAt: historicalIso(1.2), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'neris-map-6', tenantId, internalField: 'reportNumber', nerisField: 'ReportNumber', required: true, validationRule: 'NotEmpty', validationStatus: 'Valid', exportReadiness: 91, lastExportedAt: historicalIso(0.8), isActive: true, createdAt: historicalIso(200), updatedAt: historicalIso(1) },
];

const incidentTimelineEvents = incidents.flatMap((incident, index) => [
  { id: `timeline-${index + 1}-1`, tenantId, incidentId: incident.id, eventTime: incident.dispatchAt ?? historicalIso(1), eventType: 'Dispatch', notes: 'CAD dispatch transmitted', createdAt: historicalIso(1) },
  { id: `timeline-${index + 1}-2`, tenantId, incidentId: incident.id, eventTime: incident.arrivalAt ?? historicalIso(0.9), eventType: 'Arrival', notes: 'Crew on scene', createdAt: historicalIso(1) },
  { id: `timeline-${index + 1}-3`, tenantId, incidentId: incident.id, eventTime: incident.clearedAt ?? historicalIso(0.7), eventType: 'Clear', notes: 'Incident cleared', createdAt: historicalIso(1) },
]);

const incidentNarratives = incidents.map((incident, index) => ({
  id: `narrative-${index + 1}`,
  tenantId,
  incidentId: incident.id,
  authorName: incident.assignedTo ?? 'Duty Officer',
  narrative: `${incident.incidentType} at ${incident.location} was processed through the incident workflow with ${incident.qaStatus?.toLowerCase() ?? 'open'} QA and ${incident.nerisStatus?.toLowerCase() ?? 'pending'} export readiness.`,
  createdAt: historicalIso(1),
}));

const incidentQaReviews = incidents.map((incident, index) => ({
  id: `qa-review-${index + 1}`,
  tenantId,
  incidentId: incident.id,
  reviewerName: index % 2 === 0 ? 'Maya Chen' : 'Chris Alvarez',
  status: incident.qaStatus === 'Passed' ? 'Approved' : incident.qaStatus === 'QA Needed' ? 'Returned' : 'In Review',
  notes: incident.qaStatus === 'Passed' ? 'QA approved' : incident.qaStatus === 'QA Needed' ? 'Missing narrative or attachments flagged' : 'Initial review complete',
  reviewedAt: historicalIso(0.5 + index * 0.02),
  createdAt: historicalIso(1),
}));

const incidentAttachments = incidents.flatMap((incident, index) => (
  index % 2 === 0
    ? [{
        id: `attachment-${index + 1}`,
        tenantId,
        incidentId: incident.id,
        fileName: `${incident.incidentNumber}-photo.jpg`,
        fileUrl: `https://files.example/${incident.id}.jpg`,
        fileType: 'image/jpeg',
        createdAt: historicalIso(1),
      }]
    : []
));

const epcrLinks = incidents
  .filter((incident) => incident.epcrLinked)
  .map((incident, index) => ({
    id: `epcr-link-${index + 1}`,
    tenantId,
    incidentId: incident.id,
    externalEpcrId: `EPCR-${String(index + 1).padStart(4, '0')}`,
    vendorName: index % 2 === 0 ? 'Zoll ePCR' : 'ImageTrend',
    syncStatus: incident.epcrStatus === 'Transmitted' ? 'Synced' : 'Linked',
    accessRestricted: true,
    hipaaWarning: true,
    sensitiveAccessLogCount: index % 5,
    lastAccessedAt: historicalIso(0.2 + index * 0.03),
    lastSyncedAt: historicalIso(0.4 + index * 0.03),
  }));

const nerisExportLogs = incidents.map((incident, index) => ({
  id: `neris-export-${index + 1}`,
  tenantId,
  incidentId: incident.id,
  status: incident.nerisStatus === 'Rejected' ? 'Rejected' : incident.nerisStatus === 'Queued' ? 'Queued' : 'Success',
  payload: {
    incidentNumber: incident.incidentNumber,
    incidentType: incident.incidentType,
    stationId: incident.stationId,
    qaStatus: incident.qaStatus,
  },
  exportedAt: historicalIso(0.1 + index * 0.02),
  createdAt: historicalIso(0.1 + index * 0.02),
}));

const cadImportLogs = incidents.map((incident, index) => ({
  id: `cad-log-${index + 1}`,
  tenantId,
  incidentId: incident.id,
  sourceSystem: 'CAD',
  externalId: `CAD-${String(5000 + index).padStart(5, '0')}`,
  status: index % 10 === 0 ? 'Warning' : 'Success',
  payload: {
    incidentNumber: incident.incidentNumber,
    stationId: incident.stationId,
    source: incident.source,
  },
  importedAt: historicalIso(0.3 + index * 0.03),
  createdAt: historicalIso(0.3 + index * 0.03),
}));

const incidentDataQualityIssues = incidents.flatMap((incident, index) => {
  const issues: Array<Record<string, unknown>> = [];
  if (!incident.narrativeComplete) {
    issues.push({
      id: `dq-${index + 1}-narrative`,
      tenantId,
      incidentId: incident.id,
      category: 'Missing Narrative',
      severity: 'High',
      status: 'Open',
      fieldName: 'narrative',
      issueDescription: 'Narrative is incomplete or missing required detail.',
      resolutionNotes: null,
      createdAt: historicalIso(1),
      updatedAt: historicalIso(1),
    });
  }
  if (!incident.attachmentsComplete) {
    issues.push({
      id: `dq-${index + 1}-attachments`,
      tenantId,
      incidentId: incident.id,
      category: 'Attachments',
      severity: 'Normal',
      status: 'Open',
      fieldName: 'attachments',
      issueDescription: 'Attachment packet is incomplete for QA closeout.',
      resolutionNotes: null,
      createdAt: historicalIso(1),
      updatedAt: historicalIso(1),
    });
  }
  if (incident.nerisStatus === 'Rejected' || incident.epcrStatus === 'Failed') {
    issues.push({
      id: `dq-${index + 1}-neris`,
      tenantId,
      incidentId: incident.id,
      category: 'NERIS Readiness',
      severity: 'Critical',
      status: 'Open',
      fieldName: 'nerisStatus',
      issueDescription: 'Incident fails NERIS export validation.',
      resolutionNotes: null,
      createdAt: historicalIso(1),
      updatedAt: historicalIso(1),
    });
  }
  return issues;
});

const incidentDuplicateCandidates = incidents.slice(1, 21).map((incident, index) => ({
  id: `duplicate-${index + 1}`,
  tenantId,
  incidentId: incident.id,
  candidateIncidentId: incidents[index].id,
  candidateIncidentNumber: incidents[index].incidentNumber,
  confidence: Number((0.74 + (index % 5) * 0.04).toFixed(2)),
  qualitySignals: {
    sameStation: incident.stationId === incidents[index].stationId,
    sameIncidentType: incident.incidentType === incidents[index].incidentType,
    timeProximityMinutes: 12 + index,
  },
  status: 'Open',
  createdAt: historicalIso(1),
  updatedAt: historicalIso(1),
}));

const inspectionChecklistItems = inspections.flatMap((inspection, index) => inspectionChecklistCategories.slice(0, 5).map((category, categoryIndex) => {
  const isFailed = (index + categoryIndex) % 7 === 0 || (inspection.status === 'Failed' && categoryIndex < 2);
  const isNin = (index + categoryIndex) % 9 === 0;
  return {
    id: `checklist-${index + 1}-${categoryIndex + 1}`,
    tenantId,
    inspectionId: inspection.id,
    category,
    requirement: `${category} compliance for ${inspection.inspectionType.toLowerCase()} inspection`,
    result: isNin ? 'N/A' : isFailed ? 'Fail' : 'Pass',
    severity: isFailed ? (categoryIndex % 2 === 0 ? 'High' : 'Normal') : null,
    notes: isFailed ? 'Follow-up required before closeout.' : 'No issues found.',
    photoUrl: isFailed && categoryIndex === 0 ? `https://files.example/${inspection.id}-${categoryIndex + 1}.jpg` : null,
    requiresCorrection: isFailed,
    createdAt: historicalIso(1),
    updatedAt: historicalIso(1),
  };
}));

const violationStatuses = ['Open', 'Correction Pending', 'Reinspection Scheduled', 'Resolved', 'Escalated', 'Closed'];
const violations = Array.from({ length: 80 }, (_, index) => {
  const inspection = inspections[index % inspections.length];
  const property = properties[index % properties.length];
  const occupancy = occupancies[index % occupancies.length];
  const severity = index % 9 === 0 ? 'Critical' : index % 4 === 0 ? 'High' : index % 3 === 0 ? 'Normal' : 'Low';
  const status = violationStatuses[index % violationStatuses.length];
  return {
    id: `violation-${index + 1}`,
    tenantId,
    inspectionId: inspection.id,
    propertyId: property.id,
    occupancyId: occupancy.id,
    codeReference: `${index % 2 === 0 ? 'IFC' : 'NFPA'}-${100 + index}`,
    title: `${severity} ${['Exit access', 'Fire alarm', 'Sprinkler', 'Housekeeping', 'Hazardous materials'][index % 5]} issue`,
    description: `Inspection follow-up item related to ${property.name}.`,
    severity,
    status,
    correctiveActionRequired: status !== 'Resolved' && status !== 'Closed',
    dueDate: iso(index % 6 === 0 ? -8 : index % 4 === 0 ? 12 : 30),
    resolvedDate: status === 'Resolved' || status === 'Closed' ? historicalIso(3 + (index % 5)) : null,
    resolvedByPersonnelId: status === 'Resolved' || status === 'Closed' ? preventionInspectors[index % preventionInspectors.length].id : null,
    reinspectionRequired: index % 3 === 0,
    notes: index % 5 === 0 ? 'Critical follow-up requires Fire Marshal review.' : 'Track through corrective action workflow.',
    createdAt: historicalIso(8),
    updatedAt: historicalIso(1),
  };
});

const correctiveActions = violations.slice(0, 60).map((violation, index) => ({
  id: `corrective-${index + 1}`,
  tenantId,
  violationId: violation.id,
  actionDescription: `Complete corrective work for ${violation.title.toLowerCase()}.`,
  assignedToName: ['Building Manager', 'Facilities Lead', 'Operations Manager', 'Tenant Contact'][index % 4],
  assignedToEmail: `contact${index + 1}@westmetro.example`,
  dueDate: iso(index % 5 === 0 ? -4 : 21 + (index % 10)),
  status: index % 4 === 0 ? 'Completed' : index % 4 === 1 ? 'Pending' : index % 4 === 2 ? 'In Progress' : 'Overdue',
  completedDate: index % 4 === 0 ? historicalIso(2 + (index % 4)) : null,
  evidenceDocumentUrl: index % 3 === 0 ? `https://files.example/corrective-${index + 1}.pdf` : null,
  notes: index % 4 === 0 ? 'Evidence received and validated.' : 'Awaiting follow-up from occupancy contact.',
  createdAt: historicalIso(6),
  updatedAt: historicalIso(1),
}));

const permitTypes = ['Fire alarm', 'Sprinkler', 'Special event', 'Hazardous materials', 'Construction', 'Hot work', 'Tent / temporary structure', 'Occupancy'];
const permitStatuses = ['Submitted', 'Under Review', 'Additional Info Required', 'Approved', 'Denied', 'Expired', 'Closed'];
const permits = Array.from({ length: 70 }, (_, index) => {
  const property = properties[index % properties.length];
  const occupancy = occupancies[index % occupancies.length];
  const status = permitStatuses[index % permitStatuses.length];
  return {
    id: `permit-${index + 1}`,
    tenantId,
    permitNumber: `PT-${String(index + 1).padStart(5, '0')}`,
    propertyId: property.id,
    occupancyId: occupancy.id,
    permitType: permitTypes[index % permitTypes.length],
    applicantName: ['Ryan Blake', 'Morgan Lee', 'Patricia Gomez', 'Elena Torres', 'Derek Nguyen'][index % 5],
    applicantEmail: `applicant${index + 1}@example.com`,
    applicantPhone: `303-555-${String(3000 + index).slice(-4)}`,
    submittedDate: historicalIso(20 + (index % 12)),
    reviewDueDate: iso(index % 4 === 0 ? -6 : 8 + (index % 14)),
    approvedDate: status === 'Approved' || status === 'Closed' ? historicalIso(5 + (index % 5)) : null,
    expirationDate: status === 'Expired' ? historicalIso(3) : iso(60 + (index % 90)),
    status,
    feeAmount: 120 + index * 15,
    reviewerPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
    notes: index % 3 === 0 ? 'Priority review due to occupancy risk.' : 'Standard permit workflow.',
    createdAt: historicalIso(20),
    updatedAt: historicalIso(1),
  };
});

const permitReviews = permits.map((permit, index) => ({
  id: `permit-review-${index + 1}`,
  tenantId,
  permitId: permit.id,
  reviewerPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
  reviewStage: index % 3 === 0 ? 'Initial Review' : index % 3 === 1 ? 'Technical Review' : 'Final Review',
  status: permit.status === 'Approved' || permit.status === 'Closed' ? 'Approved' : permit.status === 'Denied' ? 'Denied' : 'In Review',
  comments: `Reviewed ${permit.permitType.toLowerCase()} application for ${permit.propertyId}.`,
  reviewedAt: historicalIso(2 + (index % 5)),
  createdAt: historicalIso(2),
  updatedAt: historicalIso(1),
}));

const preplans = Array.from({ length: 60 }, (_, index) => {
  const property = properties[index % properties.length];
  const occupancy = occupancies[index % occupancies.length];
  return {
    id: `preplan-${index + 1}`,
    tenantId,
    propertyId: property.id,
    occupancyId: occupancy.id,
    preplanNumber: `PP-${String(index + 1).padStart(4, '0')}`,
    title: `${property.name} Preplan`,
    status: index % 6 === 0 ? 'Review Due' : index % 5 === 0 ? 'Incomplete' : index % 4 === 0 ? 'Draft' : 'Active',
    lastReviewedDate: historicalIso(45 + (index % 35)),
    nextReviewDue: iso(index % 6 === 0 ? -9 : 25 + (index % 40)),
    waterSupplyNotes: `Hydrant coverage and flow notes for ${property.name}.`,
    accessNotes: `Primary access via ${property.addressLine1}.`,
    hazardNotes: index % 3 === 0 ? 'Special hazard noted during review.' : 'No extraordinary hazard notes.',
    tacticalNotes: 'Standard tactical approach with agency preplan checklist.',
    evacuationNotes: 'Primary evacuation point located at front assembly zone.',
    roofAccessNotes: 'Roof access via rear stairwell and ladder bank.',
    utilityShutoffNotes: 'Utilities located on the north side exterior wall.',
    createdAt: historicalIso(90),
    updatedAt: historicalIso(1),
    isDeleted: false,
  };
});

const preplanAttachments = preplans.map((preplan, index) => ({
  id: `preplan-attachment-${index + 1}`,
  tenantId,
  preplanId: preplan.id,
  attachmentType: index % 2 === 0 ? 'Floor Plan' : 'Site Photo',
  title: `${preplan.title} Attachment ${index + 1}`,
  fileName: `${preplan.preplanNumber}-attachment-${index + 1}.pdf`,
  fileUrl: `https://files.example/${preplan.id}.pdf`,
  uploadedByPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
  createdAt: historicalIso(4),
}));

const hydrants = Array.from({ length: 100 }, (_, index) => {
  const property = properties[index % properties.length];
  const station = stations[index % stations.length];
  return {
    id: `hydrant-${index + 1}`,
    tenantId,
    hydrantNumber: `HY-${String(index + 1).padStart(4, '0')}`,
    propertyId: index % 2 === 0 ? property.id : null,
    stationId: station.id,
    latitude: 39.75 + index * 0.004,
    longitude: -105.1 - index * 0.004,
    flowRateGpm: 650 + (index % 7) * 125,
    lastInspectionDate: historicalIso(index % 18),
    nextInspectionDue: iso(index % 8 === 0 ? -14 : 20 + (index % 30)),
    status: index % 10 === 0 ? 'Needs Inspection' : index % 9 === 0 ? 'Out of Service' : 'Active',
    notes: index % 5 === 0 ? 'Hydrant needs flushing and cap replacement.' : 'Operational hydrant in service area.',
    createdAt: historicalIso(300),
    updatedAt: historicalIso(1),
  };
});

const hazards = Array.from({ length: 40 }, (_, index) => {
  const property = properties[index % properties.length];
  return {
    id: `hazard-${index + 1}`,
    tenantId,
    propertyId: property.id,
    hazardType: ['Access', 'Electrical', 'Combustible Storage', 'HazMat', 'Roof Access', 'Water Supply'][index % 6],
    title: `${['Access', 'Electrical', 'Combustible Storage', 'HazMat', 'Roof Access', 'Water Supply'][index % 6]} hazard ${index + 1}`,
    description: `Hazard observed at ${property.name} requiring prevention mitigation.`,
    severity: index % 8 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : 'Moderate',
    locationDescription: `Zone ${index % 5 + 1}`,
    mitigationNotes: index % 4 === 0 ? 'Mitigation underway with property manager.' : 'Monitor during next inspection.',
    status: index % 6 === 0 ? 'Open' : 'Monitoring',
    createdAt: historicalIso(40),
    updatedAt: historicalIso(1),
  };
});

const preventionContacts = Array.from({ length: 80 }, (_, index) => {
  const property = properties[index % properties.length];
  const occupancy = occupancies[index % occupancies.length];
  return {
    id: `prevention-contact-${index + 1}`,
    tenantId,
    propertyId: property.id,
    occupancyId: occupancy.id,
    name: ['Jordan Ellis', 'Mina Patel', 'Tom Rivera', 'Sara Kim', 'Nadia Johnson'][index % 5],
    role: index % 3 === 0 ? 'Owner' : index % 3 === 1 ? 'Manager' : 'Safety Contact',
    email: `contact${index + 1}@westmetro.example`,
    phone: `303-888-${String(4000 + index).slice(-4)}`,
    emergencyContact: index % 4 === 0,
    createdAt: historicalIso(60),
    updatedAt: historicalIso(1),
  };
});

const preventionDocuments = [...inspections.slice(0, 60).map((inspection, index) => ({
  id: `prevention-doc-${index + 1}`,
  tenantId,
  propertyId: inspection.propertyId,
  occupancyId: inspection.occupancyId,
  inspectionId: inspection.id,
  permitId: null,
  preplanId: null,
  documentType: 'Inspection Photo',
  title: `${inspection.id} photo evidence`,
  fileName: `${inspection.id}.jpg`,
  fileUrl: `https://files.example/${inspection.id}.jpg`,
  uploadedByPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
  createdAt: historicalIso(1),
})), ...permits.slice(0, 30).map((permit, index) => ({
  id: `permit-doc-${index + 1}`,
  tenantId,
  propertyId: permit.propertyId,
  occupancyId: permit.occupancyId,
  inspectionId: null,
  permitId: permit.id,
  preplanId: null,
  documentType: 'Permit Document',
  title: `${permit.permitNumber} supporting doc`,
  fileName: `${permit.permitNumber}.pdf`,
  fileUrl: `https://files.example/${permit.id}.pdf`,
  uploadedByPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
  createdAt: historicalIso(1),
})), ...preplans.slice(0, 30).map((preplan, index) => ({
  id: `preplan-doc-${index + 1}`,
  tenantId,
  propertyId: preplan.propertyId,
  occupancyId: preplan.occupancyId,
  inspectionId: null,
  permitId: null,
  preplanId: preplan.id,
  documentType: 'Preplan Attachment',
  title: `${preplan.preplanNumber} attachment`,
  fileName: `${preplan.preplanNumber}.pdf`,
  fileUrl: `https://files.example/${preplan.id}.pdf`,
  uploadedByPersonnelId: preventionInspectors[index % preventionInspectors.length].id,
  createdAt: historicalIso(1),
}))];

const preventionRiskSnapshots = [
  ...properties.map((property, index) => {
    const station = stations[index % stations.length];
    const base = property.occupancyRiskLevel === 'Critical' ? 82 : property.occupancyRiskLevel === 'High' ? 74 : property.occupancyRiskLevel === 'Moderate' ? 63 : 51;
    return {
      id: `risk-property-${index + 1}`,
      tenantId,
      propertyId: property.id,
      stationId: station.id,
      snapshotDate: historicalIso(index % 14),
      inspectionBacklogScore: Math.max(40, base - (index % 9) * 2),
      violationRiskScore: Math.max(35, base - (index % 7) * 3),
      occupancyRiskScore: base,
      permitBacklogScore: Math.max(42, base - (index % 5) * 2),
      preplanCompletenessScore: Math.max(50, 100 - (index % 5) * 8),
      overallPreventionRiskScore: base,
      riskLevel: base >= 80 ? 'Critical' : base >= 70 ? 'High' : base >= 55 ? 'Moderate' : 'Low',
      evidenceSummary: `${property.name} risk summarized from inspections, permits, preplans, hazards, and hydrants.`,
      createdAt: historicalIso(1),
    };
  }),
  ...stations.map((station, index) => {
    const stationProperties = properties.filter((property) => property.responseStationId === station.id);
    const base = Math.min(95, 52 + stationProperties.filter((property) => property.occupancyRiskLevel === 'High' || property.occupancyRiskLevel === 'Critical').length * 4);
    return {
      id: `risk-station-${index + 1}`,
      tenantId,
      propertyId: null,
      stationId: station.id,
      snapshotDate: historicalIso(index % 7),
      inspectionBacklogScore: Math.max(40, base - 3),
      violationRiskScore: Math.max(35, base - 5),
      occupancyRiskScore: base,
      permitBacklogScore: Math.max(42, base - 6),
      preplanCompletenessScore: Math.max(50, 100 - stationProperties.length * 2),
      overallPreventionRiskScore: base,
      riskLevel: base >= 80 ? 'Critical' : base >= 70 ? 'High' : base >= 55 ? 'Moderate' : 'Low',
      evidenceSummary: `${station.name} response area includes ${stationProperties.length} properties and associated prevention workload.`,
      createdAt: historicalIso(1),
    };
  }),
];

// ============================================================================
// PUBLIC SAFETY INTEGRATION HUB — rich, adapter-aligned seed data
// ============================================================================

type IntegrationSeedDescriptor = {
  id: string;
  name: string;
  systemType: string;
  vendorName: string | null;
  description: string;
  status: string;
  environment: string;
  baseUrl: string | null;
  authenticationType: string;
  exchangeMethod: string;
  dataDirection: string;
  averageLatencyMs: number;
  successRatePercent: number;
  rateLimitPerMinute: number;
  ownerTeam: string;
  isCritical: boolean;
  lastSuccessfulDaysAgo: number;
  lastFailedDaysAgo: number | null;
  objects: Array<{ name: string; direction: string; frequency: string; recordCount: number }>;
  mappings: Array<{ sourceObject: string; sourceField: string; targetObject: string; targetField: string; dataType: string; required: boolean; transform?: string; validation?: string }>;
  endpoints: Array<{ name: string; method: string; path: string; description: string; authRequired: boolean; rateLimit: number; request?: unknown; response?: unknown; errorCodes?: string[] }>;
};

const integrationSeed: IntegrationSeedDescriptor[] = [
  {
    id: 'integration-cad', name: 'CAD', systemType: 'CAD', vendorName: 'Tyler Technologies / New World CAD',
    description: 'Computer-Aided Dispatch feed delivering live incident dispatch, unit assignment, and timestamp data into MissionOS Incidents.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://cad.westmetro.gov/api/v2',
    authenticationType: 'OAuth2', exchangeMethod: 'Event-Driven', dataDirection: 'Inbound',
    averageLatencyMs: 240, successRatePercent: 99.2, rateLimitPerMinute: 900, ownerTeam: 'Communications / Dispatch', isCritical: true,
    lastSuccessfulDaysAgo: 0.02, lastFailedDaysAgo: 0.9,
    objects: [
      { name: 'Incidents', direction: 'Inbound', frequency: 'Event-Driven', recordCount: 412 },
      { name: 'Units Dispatched', direction: 'Inbound', frequency: 'Event-Driven', recordCount: 938 },
      { name: 'Dispatch Timestamps', direction: 'Inbound', frequency: 'Event-Driven', recordCount: 2104 },
      { name: 'Incident Locations', direction: 'Inbound', frequency: 'Event-Driven', recordCount: 412 },
    ],
    mappings: [
      { sourceObject: 'cad', sourceField: 'cadIncidentNumber', targetObject: 'incident', targetField: 'cadNumber', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'cad', sourceField: 'dispatchTime', targetObject: 'incident', targetField: 'dispatchTime', dataType: 'datetime', required: true, transform: 'toISO8601', validation: 'notNull' },
      { sourceObject: 'cad', sourceField: 'unitAssigned', targetObject: 'incident', targetField: 'units', dataType: 'array', required: true, transform: 'splitCsv' },
      { sourceObject: 'cad', sourceField: 'incidentTypeCode', targetObject: 'incident', targetField: 'incidentType', dataType: 'string', required: true, transform: 'lookupCadType' },
      { sourceObject: 'cad', sourceField: 'callLatitude', targetObject: 'incident', targetField: 'latitude', dataType: 'decimal', required: false },
      { sourceObject: 'cad', sourceField: 'callLongitude', targetObject: 'incident', targetField: 'longitude', dataType: 'decimal', required: false },
      { sourceObject: 'cad', sourceField: 'enrouteTime', targetObject: 'incident', targetField: 'enrouteAt', dataType: 'datetime', required: false, transform: 'toISO8601' },
      { sourceObject: 'cad', sourceField: 'arrivalTime', targetObject: 'incident', targetField: 'arrivalAt', dataType: 'datetime', required: false, transform: 'toISO8601' },
    ],
    endpoints: [
      { name: 'Import CAD Incident', method: 'POST', path: '/api/external/cad/import', description: 'Receive a CAD incident dispatch event and create or update the linked MissionOS incident.', authRequired: true, rateLimit: 900, request: { cadIncidentNumber: 'F2026-004812', dispatchTime: '2026-06-03T13:42:11Z', incidentTypeCode: '111', unitAssigned: 'E41,M41', callLatitude: 39.742, callLongitude: -105.01 }, response: { incidentId: 'incident-1042', status: 'created', matched: false }, errorCodes: ['400 INVALID_PAYLOAD', '409 DUPLICATE_CAD_NUMBER', '422 MISSING_DISPATCH_TIME'] },
      { name: 'List CAD Incidents', method: 'GET', path: '/api/external/cad/incidents', description: 'List recent CAD-sourced incidents with sync status.', authRequired: true, rateLimit: 600, response: { items: [{ cadIncidentNumber: 'F2026-004812', status: 'synced' }], total: 412 }, errorCodes: ['401 UNAUTHORIZED', '429 RATE_LIMITED'] },
      { name: 'Get Dispatch Timeline', method: 'GET', path: '/api/external/cad/incidents/{id}/timeline', description: 'Return CAD dispatch timestamps for an incident.', authRequired: true, rateLimit: 600, response: { dispatch: '13:42:11', enroute: '13:44:02', arrival: '13:49:55' }, errorCodes: ['404 NOT_FOUND'] },
      { name: 'CAD Webhook Ack', method: 'POST', path: '/api/external/cad/ack', description: 'Acknowledge receipt of a CAD event stream batch.', authRequired: true, rateLimit: 1200, response: { acknowledged: true }, errorCodes: ['400 INVALID_BATCH'] },
    ],
  },
  {
    id: 'integration-rms', name: 'RMS', systemType: 'RMS', vendorName: 'MissionOS RMS (internal)',
    description: 'Records Management System event stream synchronizing incident report lifecycle, QA status, and closure events.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://rms.westmetro.gov/api',
    authenticationType: 'API Key', exchangeMethod: 'Event-Driven', dataDirection: 'Bidirectional',
    averageLatencyMs: 180, successRatePercent: 99.6, rateLimitPerMinute: 600, ownerTeam: 'Records / RMS', isCritical: true,
    lastSuccessfulDaysAgo: 0.04, lastFailedDaysAgo: 3.2,
    objects: [
      { name: 'Incident Reports', direction: 'Bidirectional', frequency: 'Event-Driven', recordCount: 1280 },
      { name: 'QA Reviews', direction: 'Inbound', frequency: 'Event-Driven', recordCount: 318 },
      { name: 'Report Attachments', direction: 'Inbound', frequency: 'Batch', recordCount: 642 },
    ],
    mappings: [
      { sourceObject: 'rms', sourceField: 'reportNumber', targetObject: 'incident', targetField: 'reportNumber', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'rms', sourceField: 'qaStatus', targetObject: 'incident', targetField: 'qaStatus', dataType: 'string', required: false, transform: 'mapQaStatus' },
      { sourceObject: 'rms', sourceField: 'narrativeComplete', targetObject: 'incident', targetField: 'narrativeComplete', dataType: 'boolean', required: false },
      { sourceObject: 'rms', sourceField: 'closedAt', targetObject: 'incident', targetField: 'clearedAt', dataType: 'datetime', required: false, transform: 'toISO8601' },
    ],
    endpoints: [
      { name: 'Sync Incident Report', method: 'POST', path: '/api/external/rms/reports', description: 'Push a finalized incident report to RMS.', authRequired: true, rateLimit: 600, request: { incidentId: 'incident-1042', reportNumber: 'WM-2026-1042', status: 'Approved' }, response: { accepted: true }, errorCodes: ['400 INVALID_REPORT', '409 ALREADY_FINALIZED'] },
      { name: 'List Report QA', method: 'GET', path: '/api/external/rms/qa', description: 'List QA reviews awaiting reconciliation.', authRequired: true, rateLimit: 600, response: { items: [], total: 318 }, errorCodes: ['401 UNAUTHORIZED'] },
      { name: 'Get Report', method: 'GET', path: '/api/external/rms/reports/{id}', description: 'Retrieve a single RMS report record.', authRequired: true, rateLimit: 600, response: { reportNumber: 'WM-2026-1042' }, errorCodes: ['404 NOT_FOUND'] },
    ],
  },
  {
    id: 'integration-neris', name: 'NERIS', systemType: 'NERIS', vendorName: 'USFA NERIS (National Emergency Response Information System)',
    description: 'Outbound export of incident reports to the national NERIS standard with required-field validation and fire/EMS categorization.',
    status: 'Degraded', environment: 'Production', baseUrl: 'https://api.neris.fema.gov/v1',
    authenticationType: 'OAuth2', exchangeMethod: 'Batch', dataDirection: 'Outbound',
    averageLatencyMs: 1480, successRatePercent: 91.4, rateLimitPerMinute: 120, ownerTeam: 'Records / Compliance', isCritical: true,
    lastSuccessfulDaysAgo: 0.6, lastFailedDaysAgo: 0.4,
    objects: [
      { name: 'Incident Report (NERIS)', direction: 'Outbound', frequency: 'Daily Batch', recordCount: 286 },
      { name: 'Unit Response', direction: 'Outbound', frequency: 'Daily Batch', recordCount: 742 },
      { name: 'Fire/EMS Categories', direction: 'Outbound', frequency: 'Daily Batch', recordCount: 286 },
    ],
    mappings: [
      { sourceObject: 'incident', sourceField: 'incidentType', targetObject: 'neris', targetField: 'incidentCategory', dataType: 'string', required: true, transform: 'mapNerisCategory', validation: 'nerisCodeset' },
      { sourceObject: 'station', sourceField: 'id', targetObject: 'neris', targetField: 'reportingUnit', dataType: 'string', required: true, validation: 'notNull' },
      { sourceObject: 'incident', sourceField: 'location', targetObject: 'neris', targetField: 'locationAddress', dataType: 'string', required: true, validation: 'notNull' },
      { sourceObject: 'apparatus', sourceField: 'unitNumber', targetObject: 'neris', targetField: 'unitIdentifier', dataType: 'string', required: true },
      { sourceObject: 'personnel', sourceField: 'role', targetObject: 'neris', targetField: 'personnelRole', dataType: 'string', required: false, transform: 'mapNerisRole' },
      { sourceObject: 'incident', sourceField: 'dispatchAt', targetObject: 'neris', targetField: 'alarmDateTime', dataType: 'datetime', required: true, transform: 'toISO8601', validation: 'notNull' },
      { sourceObject: 'incident', sourceField: 'latitude', targetObject: 'neris', targetField: 'geoLat', dataType: 'decimal', required: true, validation: 'geoRequired' },
      { sourceObject: 'incident', sourceField: 'longitude', targetObject: 'neris', targetField: 'geoLon', dataType: 'decimal', required: true, validation: 'geoRequired' },
    ],
    endpoints: [
      { name: 'Export to NERIS', method: 'POST', path: '/api/external/neris/export', description: 'Submit a validated incident batch to the national NERIS endpoint.', authRequired: true, rateLimit: 120, request: { incidentId: 'incident-1042', incidentCategory: '111', reportingUnit: 'WM-STA-41', locationAddress: '1200 Main St' }, response: { nerisId: 'NERIS-88213', status: 'accepted' }, errorCodes: ['422 MISSING_LOCATION_FIELDS', '422 INVALID_CATEGORY', '503 NERIS_UNAVAILABLE'] },
      { name: 'Validate NERIS Payload', method: 'POST', path: '/api/external/neris/validate', description: 'Pre-validate an incident against NERIS required fields and codesets.', authRequired: true, rateLimit: 240, response: { valid: false, missing: ['locationAddress'] }, errorCodes: ['400 INVALID_PAYLOAD'] },
      { name: 'Get Export Status', method: 'GET', path: '/api/external/neris/export/{id}', description: 'Check the status of a submitted NERIS export.', authRequired: true, rateLimit: 240, response: { nerisId: 'NERIS-88213', status: 'accepted' }, errorCodes: ['404 NOT_FOUND'] },
    ],
  },
  {
    id: 'integration-payroll', name: 'Payroll', systemType: 'Payroll', vendorName: 'Workday Payroll',
    description: 'Exports overtime and staffing hours to payroll and imports payroll confirmation and pay-period close events.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://payroll.westmetro.gov/api',
    authenticationType: 'Service Account', exchangeMethod: 'Batch', dataDirection: 'Bidirectional',
    averageLatencyMs: 920, successRatePercent: 97.8, rateLimitPerMinute: 200, ownerTeam: 'Finance / HR', isCritical: true,
    lastSuccessfulDaysAgo: 0.5, lastFailedDaysAgo: 1.2,
    objects: [
      { name: 'Overtime Hours', direction: 'Outbound', frequency: 'Weekly Batch', recordCount: 614 },
      { name: 'Staffing Hours', direction: 'Outbound', frequency: 'Weekly Batch', recordCount: 1820 },
      { name: 'Payroll Confirmation', direction: 'Inbound', frequency: 'Weekly Batch', recordCount: 412 },
    ],
    mappings: [
      { sourceObject: 'personnel', sourceField: 'employeeNumber', targetObject: 'payroll', targetField: 'employeeId', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'overtime', sourceField: 'overtimeHours', targetObject: 'payroll', targetField: 'overtimeUnits', dataType: 'decimal', required: true, transform: 'roundQuarterHour' },
      { sourceObject: 'shift', sourceField: 'regularHours', targetObject: 'payroll', targetField: 'regularUnits', dataType: 'decimal', required: true },
      { sourceObject: 'personnel', sourceField: 'payGrade', targetObject: 'payroll', targetField: 'payClass', dataType: 'string', required: false, transform: 'mapPayClass' },
    ],
    endpoints: [
      { name: 'Export Overtime', method: 'GET', path: '/api/external/staffing/overtime', description: 'Provide the current pay-period overtime export to payroll.', authRequired: true, rateLimit: 200, response: { periodId: '2026-W22', records: 614 }, errorCodes: ['401 UNAUTHORIZED', '423 PERIOD_LOCKED'] },
      { name: 'Post Payroll Confirmation', method: 'POST', path: '/api/external/payroll/confirm', description: 'Receive payroll confirmation for an exported period.', authRequired: true, rateLimit: 200, request: { periodId: '2026-W22', confirmed: 612, rejected: 2 }, response: { accepted: true }, errorCodes: ['409 PERIOD_MISMATCH'] },
    ],
  },
  {
    id: 'integration-gis', name: 'GIS', systemType: 'GIS', vendorName: 'Esri ArcGIS Enterprise',
    description: 'Imports map layers, hydrants, and property boundaries; exports response-area overlays back to the GIS platform.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://gis.westmetro.gov/arcgis/rest',
    authenticationType: 'OAuth2', exchangeMethod: 'Hybrid', dataDirection: 'Bidirectional',
    averageLatencyMs: 540, successRatePercent: 96.1, rateLimitPerMinute: 300, ownerTeam: 'GIS / Planning', isCritical: false,
    lastSuccessfulDaysAgo: 2.1, lastFailedDaysAgo: 2.0,
    objects: [
      { name: 'Hydrant Layer', direction: 'Inbound', frequency: 'Daily', recordCount: 1842 },
      { name: 'Property Boundaries', direction: 'Inbound', frequency: 'Weekly', recordCount: 9210 },
      { name: 'Map Layers', direction: 'Inbound', frequency: 'Weekly', recordCount: 64 },
      { name: 'Response Area Overlays', direction: 'Outbound', frequency: 'Weekly', recordCount: 28 },
    ],
    mappings: [
      { sourceObject: 'gis', sourceField: 'hydrantId', targetObject: 'hydrant', targetField: 'identifier', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'gis', sourceField: 'flowGpm', targetObject: 'hydrant', targetField: 'flowRate', dataType: 'integer', required: false },
      { sourceObject: 'gis', sourceField: 'parcelAddress', targetObject: 'property', targetField: 'address', dataType: 'string', required: true },
      { sourceObject: 'gis', sourceField: 'occupancyClass', targetObject: 'property', targetField: 'occupancyType', dataType: 'string', required: false, transform: 'mapOccupancy' },
      { sourceObject: 'gis', sourceField: 'geometryLat', targetObject: 'property', targetField: 'latitude', dataType: 'decimal', required: false },
      { sourceObject: 'gis', sourceField: 'geometryLon', targetObject: 'property', targetField: 'longitude', dataType: 'decimal', required: false },
    ],
    endpoints: [
      { name: 'Get Hydrants', method: 'GET', path: '/api/external/gis/hydrants', description: 'Retrieve the current hydrant layer with flow and status.', authRequired: true, rateLimit: 300, response: { items: [{ hydrantId: 'HYD-2241', flowGpm: 1500 }], total: 1842 }, errorCodes: ['401 UNAUTHORIZED', '503 LAYER_UNAVAILABLE'] },
      { name: 'Get Property Boundaries', method: 'GET', path: '/api/external/gis/parcels', description: 'Retrieve property/parcel boundary features.', authRequired: true, rateLimit: 120, response: { total: 9210 }, errorCodes: ['401 UNAUTHORIZED'] },
      { name: 'Push Response Areas', method: 'POST', path: '/api/external/gis/response-areas', description: 'Export response-area overlays to GIS.', authRequired: true, rateLimit: 60, response: { published: 28 }, errorCodes: ['400 INVALID_GEOMETRY'] },
    ],
  },
  {
    id: 'integration-epcr', name: 'ePCR', systemType: 'ePCR', vendorName: 'ESO Health Data Exchange',
    description: 'Links EMS patient-care records to incidents via HIPAA-restricted exchange; returns linked ePCR record IDs and sync status.',
    status: 'Degraded', environment: 'Production', baseUrl: 'https://hde.eso.com/fhir',
    authenticationType: 'Mutual TLS', exchangeMethod: 'Real-Time', dataDirection: 'Inbound',
    averageLatencyMs: 760, successRatePercent: 94.2, rateLimitPerMinute: 300, ownerTeam: 'EMS / Clinical', isCritical: true,
    lastSuccessfulDaysAgo: 0.3, lastFailedDaysAgo: 0.35,
    objects: [
      { name: 'Linked EMS Records', direction: 'Inbound', frequency: 'Real-Time', recordCount: 528 },
      { name: 'Patient Care Reports', direction: 'Inbound', frequency: 'Real-Time', recordCount: 528 },
    ],
    mappings: [
      { sourceObject: 'epcr', sourceField: 'patientCareRecordId', targetObject: 'epcrLink', targetField: 'externalEpcrId', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'epcr', sourceField: 'cadLinkNumber', targetObject: 'epcrLink', targetField: 'incidentId', dataType: 'string', required: true, transform: 'resolveIncidentByCad', validation: 'notNull' },
      { sourceObject: 'epcr', sourceField: 'syncStatus', targetObject: 'epcrLink', targetField: 'syncStatus', dataType: 'string', required: false },
    ],
    endpoints: [
      { name: 'Get Linked EMS Record', method: 'GET', path: '/api/external/epcr/{id}', description: 'Retrieve a linked ePCR record (HIPAA-restricted; access logged).', authRequired: true, rateLimit: 300, response: { externalEpcrId: 'EPCR-77231', syncStatus: 'linked', accessRestricted: true }, errorCodes: ['403 HIPAA_RESTRICTED', '404 NOT_FOUND'] },
      { name: 'Link ePCR to Incident', method: 'POST', path: '/api/external/epcr/link', description: 'Establish a privacy-aware link between an ePCR record and an incident.', authRequired: true, rateLimit: 300, request: { patientCareRecordId: 'EPCR-77231', cadLinkNumber: 'F2026-004812' }, response: { linked: true, incidentId: 'incident-1042' }, errorCodes: ['409 ALREADY_LINKED', '422 NO_MATCHING_INCIDENT'] },
    ],
  },
  {
    id: 'integration-lms', name: 'LMS', systemType: 'LMS', vendorName: 'Vector Solutions / TargetSolutions',
    description: 'Bidirectional training compliance sync — course completions, certifications, and assignment status.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://lms.westmetro.gov/api',
    authenticationType: 'OIDC', exchangeMethod: 'Real-Time', dataDirection: 'Bidirectional',
    averageLatencyMs: 300, successRatePercent: 98.9, rateLimitPerMinute: 700, ownerTeam: 'Training / Professional Development', isCritical: false,
    lastSuccessfulDaysAgo: 0.2, lastFailedDaysAgo: 5.4,
    objects: [
      { name: 'Course Completions', direction: 'Inbound', frequency: 'Real-Time', recordCount: 1430 },
      { name: 'Certifications', direction: 'Bidirectional', frequency: 'Real-Time', recordCount: 880 },
      { name: 'Training Assignments', direction: 'Outbound', frequency: 'Real-Time', recordCount: 1210 },
    ],
    mappings: [
      { sourceObject: 'lms', sourceField: 'externalCourseId', targetObject: 'course', targetField: 'externalId', dataType: 'string', required: true },
      { sourceObject: 'lms', sourceField: 'employeeId', targetObject: 'personnel', targetField: 'employeeNumber', dataType: 'string', required: true, validation: 'resolvePersonnel' },
      { sourceObject: 'lms', sourceField: 'completionDate', targetObject: 'trainingAttendance', targetField: 'completedAt', dataType: 'datetime', required: false, transform: 'toISO8601' },
      { sourceObject: 'lms', sourceField: 'certCode', targetObject: 'certification', targetField: 'code', dataType: 'string', required: false },
    ],
    endpoints: [
      { name: 'Get Completions', method: 'GET', path: '/api/external/lms/completions', description: 'Retrieve recent course completions for compliance sync.', authRequired: true, rateLimit: 700, response: { total: 1430 }, errorCodes: ['401 UNAUTHORIZED'] },
      { name: 'Push Assignment', method: 'POST', path: '/api/external/lms/assignments', description: 'Assign a course to personnel in the LMS.', authRequired: true, rateLimit: 700, request: { employeeId: 'E-1042', externalCourseId: 'C-EMT-REFRESH' }, response: { assigned: true }, errorCodes: ['404 COURSE_NOT_FOUND'] },
    ],
  },
  {
    id: 'integration-sso', name: 'SSO', systemType: 'SSO', vendorName: 'Microsoft Entra ID',
    description: 'OIDC/SAML identity provider for single sign-on, user provisioning, and role/group synchronization.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://login.microsoftonline.com/westmetro',
    authenticationType: 'OIDC', exchangeMethod: 'Real-Time', dataDirection: 'Inbound',
    averageLatencyMs: 120, successRatePercent: 99.9, rateLimitPerMinute: 1000, ownerTeam: 'IT / Identity', isCritical: true,
    lastSuccessfulDaysAgo: 0.05, lastFailedDaysAgo: null,
    objects: [
      { name: 'Users', direction: 'Inbound', frequency: 'Real-Time', recordCount: 642 },
      { name: 'Roles / Groups', direction: 'Inbound', frequency: 'Real-Time', recordCount: 38 },
    ],
    mappings: [
      { sourceObject: 'sso', sourceField: 'oid', targetObject: 'user', targetField: 'externalId', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'sso', sourceField: 'mail', targetObject: 'user', targetField: 'email', dataType: 'string', required: true, validation: 'email' },
      { sourceObject: 'sso', sourceField: 'groups', targetObject: 'user', targetField: 'roles', dataType: 'array', required: false, transform: 'mapEntraGroups' },
    ],
    endpoints: [
      { name: 'OIDC Discovery', method: 'GET', path: '/.well-known/openid-configuration', description: 'OIDC discovery document for the Entra ID tenant.', authRequired: false, rateLimit: 1000, response: { issuer: 'https://login.microsoftonline.com/westmetro/v2.0' }, errorCodes: [] },
      { name: 'SCIM Provision User', method: 'POST', path: '/api/external/sso/scim/Users', description: 'Provision or update a user via SCIM.', authRequired: true, rateLimit: 1000, request: { userName: 'jdoe@westmetro.gov', active: true }, response: { id: 'user-1042', active: true }, errorCodes: ['409 USER_EXISTS'] },
    ],
  },
  {
    id: 'integration-hris', name: 'HRIS', systemType: 'HRIS', vendorName: 'Workday HCM',
    description: 'Imports authoritative personnel records, employment status, rank, and assignment data from the HR system of record.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://hris.westmetro.gov/api',
    authenticationType: 'Service Account', exchangeMethod: 'Batch', dataDirection: 'Inbound',
    averageLatencyMs: 1100, successRatePercent: 98.1, rateLimitPerMinute: 220, ownerTeam: 'Human Resources', isCritical: false,
    lastSuccessfulDaysAgo: 0.6, lastFailedDaysAgo: 4.5,
    objects: [
      { name: 'Personnel Records', direction: 'Inbound', frequency: 'Nightly Batch', recordCount: 642 },
      { name: 'Employment Status', direction: 'Inbound', frequency: 'Nightly Batch', recordCount: 642 },
      { name: 'Rank / Position', direction: 'Inbound', frequency: 'Nightly Batch', recordCount: 642 },
    ],
    mappings: [
      { sourceObject: 'hris', sourceField: 'employeeId', targetObject: 'personnel', targetField: 'employeeNumber', dataType: 'string', required: true, validation: 'unique' },
      { sourceObject: 'hris', sourceField: 'legalFirstName', targetObject: 'personnel', targetField: 'firstName', dataType: 'string', required: true },
      { sourceObject: 'hris', sourceField: 'legalLastName', targetObject: 'personnel', targetField: 'lastName', dataType: 'string', required: true },
      { sourceObject: 'hris', sourceField: 'employmentStatus', targetObject: 'personnel', targetField: 'employmentStatus', dataType: 'string', required: false, transform: 'mapEmploymentStatus' },
      { sourceObject: 'hris', sourceField: 'jobTitle', targetObject: 'personnel', targetField: 'rankId', dataType: 'string', required: false, transform: 'resolveRank' },
    ],
    endpoints: [
      { name: 'Get Personnel Feed', method: 'GET', path: '/api/external/hris/personnel', description: 'Nightly personnel feed of active employees.', authRequired: true, rateLimit: 220, response: { total: 642 }, errorCodes: ['401 UNAUTHORIZED', '500 FEED_ERROR'] },
    ],
  },
  {
    id: 'integration-dw', name: 'Data Warehouse', systemType: 'Warehouse', vendorName: 'Snowflake',
    description: 'Outbound analytics export of incident, readiness, and operational metrics into the enterprise data warehouse.',
    status: 'Connected', environment: 'Production', baseUrl: 'https://westmetro.snowflakecomputing.com',
    authenticationType: 'API Key', exchangeMethod: 'Batch', dataDirection: 'Outbound',
    averageLatencyMs: 2100, successRatePercent: 99.0, rateLimitPerMinute: 100, ownerTeam: 'Analytics / BI', isCritical: false,
    lastSuccessfulDaysAgo: 0.4, lastFailedDaysAgo: 6.1,
    objects: [
      { name: 'Incident Facts', direction: 'Outbound', frequency: 'Nightly Batch', recordCount: 12840 },
      { name: 'Readiness Snapshots', direction: 'Outbound', frequency: 'Nightly Batch', recordCount: 6420 },
      { name: 'Integration Metrics', direction: 'Outbound', frequency: 'Nightly Batch', recordCount: 3100 },
    ],
    mappings: [
      { sourceObject: 'incident', sourceField: 'id', targetObject: 'dw', targetField: 'incident_key', dataType: 'string', required: true },
      { sourceObject: 'incident', sourceField: 'turnaroundMinutes', targetObject: 'dw', targetField: 'turnaround_min', dataType: 'integer', required: false },
      { sourceObject: 'readiness', sourceField: 'overallReadinessScore', targetObject: 'dw', targetField: 'readiness_score', dataType: 'integer', required: false },
    ],
    endpoints: [
      { name: 'Stage Export', method: 'POST', path: '/api/external/dw/stage', description: 'Stage a nightly analytics export batch to the warehouse.', authRequired: true, rateLimit: 100, request: { dataset: 'incident_facts', rows: 12840 }, response: { staged: true, jobId: 'DW-99281' }, errorCodes: ['400 INVALID_DATASET', '507 STAGE_FULL'] },
    ],
  },
];

const ERROR_STATUSES = ['Open', 'Investigating', 'Retry Scheduled', 'Resolved', 'Dismissed'];
const LOG_STATUSES = ['Success', 'Success', 'Success', 'Partial Success', 'Failed', 'Retried'];

const integrationSystems = integrationSeed.map((descriptor) => ({
  id: descriptor.id,
  tenantId,
  name: descriptor.name,
  systemType: descriptor.systemType,
  vendorName: descriptor.vendorName,
  description: descriptor.description,
  status: descriptor.status,
  environment: descriptor.environment,
  baseUrl: descriptor.baseUrl,
  apiBaseUrl: descriptor.baseUrl,
  authenticationType: descriptor.authenticationType,
  authMethod: descriptor.authenticationType,
  exchangeMethod: descriptor.exchangeMethod,
  dataDirection: descriptor.dataDirection,
  lastSuccessfulSyncAt: historicalIso(descriptor.lastSuccessfulDaysAgo),
  lastFailedSyncAt: descriptor.lastFailedDaysAgo == null ? null : historicalIso(descriptor.lastFailedDaysAgo),
  lastSyncAt: historicalIso(descriptor.lastSuccessfulDaysAgo),
  averageLatencyMs: descriptor.averageLatencyMs,
  successRatePercent: descriptor.successRatePercent,
  rateLimitPerMinute: descriptor.rateLimitPerMinute,
  ownerTeam: descriptor.ownerTeam,
  isCritical: descriptor.isCritical,
  isDeleted: false,
  createdAt: historicalIso(400),
  updatedAt: historicalIso(1),
}));

const integrationEndpoints = integrationSeed.flatMap((descriptor) => {
  const slug = descriptor.systemType.toLowerCase();
  const primary = descriptor.endpoints.map((endpoint, index) => ({
    id: `endpoint-${descriptor.id}-${index + 1}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    name: endpoint.name,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description,
    requestExampleJson: endpoint.request ?? null,
    responseExampleJson: endpoint.response ?? null,
    requestExample: endpoint.request ?? null,
    responseExample: endpoint.response ?? null,
    errorCodes: endpoint.errorCodes ?? [],
    authRequired: endpoint.authRequired,
    rateLimit: endpoint.rateLimit,
    status: 'Active',
    createdAt: historicalIso(380),
    updatedAt: historicalIso(2),
  }));
  // every connector also exposes operational health + sync-status probes
  const extra = [
    { suffix: 'health', name: `${descriptor.name} Health Check`, method: 'GET', path: `/api/external/${slug}/health`, description: `Liveness and readiness probe for the ${descriptor.name} connector.`, errorCodes: ['503 UNAVAILABLE'] },
    { suffix: 'status', name: `${descriptor.name} Sync Status`, method: 'GET', path: `/api/external/${slug}/sync/status`, description: `Return the last sync status and watermark for ${descriptor.name}.`, errorCodes: ['401 UNAUTHORIZED'] },
  ].map((endpoint) => ({
    id: `endpoint-${descriptor.id}-${endpoint.suffix}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    name: endpoint.name,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description,
    requestExampleJson: null,
    responseExampleJson: { status: 'ok', lastSyncAt: historicalIso(0.2) },
    requestExample: null,
    responseExample: { status: 'ok', lastSyncAt: historicalIso(0.2) },
    errorCodes: endpoint.errorCodes,
    authRequired: true,
    rateLimit: descriptor.rateLimitPerMinute,
    status: 'Active',
    createdAt: historicalIso(380),
    updatedAt: historicalIso(2),
  }));
  return [...primary, ...extra];
});

const integrationFieldMappings = integrationSeed.flatMap((descriptor) => {
  const base = descriptor.mappings.map((mapping, index) => {
    const stale = descriptor.id === 'integration-gis' && index === 0;
    const failed = descriptor.id === 'integration-neris' && mapping.targetField === 'locationAddress';
    return {
      id: `mapping-${descriptor.id}-${index + 1}`,
      tenantId,
      integrationSystemId: descriptor.id,
      integrationId: descriptor.id,
      sourceObject: mapping.sourceObject,
      sourceField: mapping.sourceField,
      targetObject: mapping.targetObject,
      targetField: mapping.targetField,
      // legacy compatibility fields
      internalField: `${mapping.sourceObject}.${mapping.sourceField}`,
      nerisField: `${mapping.targetObject}.${mapping.targetField}`,
      transformRule: mapping.transform ?? null,
      dataType: mapping.dataType,
      required: mapping.required,
      transformationRule: mapping.transform ?? null,
      validationRule: mapping.validation ?? null,
      status: failed ? 'Error' : stale ? 'Stale' : 'Active',
      lastValidatedAt: stale ? historicalIso(12) : historicalIso(Math.round(index / 2) + 1),
      createdAt: historicalIso(360),
      updatedAt: historicalIso(2),
    };
  });
  // pad each system with additional realistic attribute mappings to reach a rich catalog
  const padCount = Math.max(0, 13 - base.length);
  const pad = Array.from({ length: padCount }).map((_, index) => ({
    id: `mapping-${descriptor.id}-pad-${index + 1}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    sourceObject: descriptor.systemType.toLowerCase(),
    sourceField: `attribute_${index + 1}`,
    targetObject: 'missionos',
    targetField: `field_${index + 1}`,
    internalField: `${descriptor.systemType.toLowerCase()}.attribute_${index + 1}`,
    nerisField: `missionos.field_${index + 1}`,
    transformRule: null,
    dataType: ['string', 'integer', 'datetime', 'boolean', 'decimal'][index % 5],
    required: index % 4 === 0,
    transformationRule: index % 3 === 0 ? 'passthrough' : null,
    validationRule: index % 5 === 0 ? 'notNull' : null,
    status: 'Active',
    lastValidatedAt: historicalIso(index + 2),
    createdAt: historicalIso(355),
    updatedAt: historicalIso(3),
  }));
  return [...base, ...pad];
});

const integrationDataObjects = integrationSeed.flatMap((descriptor) => {
  const objects = descriptor.objects.map((object, index) => ({
    id: `dataobject-${descriptor.id}-${index + 1}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    objectName: object.name,
    description: `${object.name} exchanged via ${descriptor.name} (${object.frequency.toLowerCase()}).`,
    direction: object.direction,
    syncFrequency: object.frequency,
    recordCountLastSync: object.recordCount,
    lastSyncedAt: descriptor.id === 'integration-gis' && index === 0 ? historicalIso(2) : historicalIso(descriptor.lastSuccessfulDaysAgo + index * 0.1),
    status: descriptor.id === 'integration-gis' && index === 0 ? 'Stale' : 'Healthy',
    createdAt: historicalIso(380),
    updatedAt: historicalIso(1),
  }));
  // every system exposes at least 4 catalog objects so the data-object catalog stays rich
  const fillerNames = ['Exchange Audit', 'Sync Watermark', 'Reconciliation Summary'];
  let fillerIndex = 0;
  while (objects.length < 4) {
    const label = fillerNames[fillerIndex % fillerNames.length];
    objects.push({
      id: `dataobject-${descriptor.id}-filler-${fillerIndex + 1}`,
      tenantId,
      integrationSystemId: descriptor.id,
      integrationId: descriptor.id,
      objectName: `${descriptor.name} ${label}`,
      description: `${label} for ${descriptor.name} exchange events and reconciliation results.`,
      direction: descriptor.dataDirection,
      syncFrequency: descriptor.exchangeMethod,
      recordCountLastSync: 120 + objects.length * 11,
      lastSyncedAt: historicalIso(descriptor.lastSuccessfulDaysAgo),
      status: 'Healthy',
      createdAt: historicalIso(380),
      updatedAt: historicalIso(1),
    });
    fillerIndex += 1;
  }
  return objects;
});

const integrationLogs = integrationSeed.flatMap((descriptor, systemIndex) =>
  Array.from({ length: 22 }).map((_, index) => {
    const seq = systemIndex * 22 + index;
    let status = LOG_STATUSES[seq % LOG_STATUSES.length];
    if (descriptor.status === 'Connected' && status === 'Failed' && index % 2 === 0) status = 'Success';
    const direction = descriptor.dataDirection === 'Bidirectional' ? (index % 2 === 0 ? 'Inbound' : 'Outbound') : descriptor.dataDirection;
    const processed = 20 + ((seq * 7) % 180);
    const failed = status === 'Failed' ? processed : status === 'Partial Success' ? Math.max(1, Math.round(processed * 0.12)) : 0;
    const endpoint = integrationEndpoints.find((entry) => entry.integrationSystemId === descriptor.id);
    return {
      id: `integration-log-${descriptor.id}-${index + 1}`,
      tenantId,
      integrationSystemId: descriptor.id,
      integrationId: descriptor.id,
      endpointId: endpoint?.id ?? null,
      eventType: ['sync', 'export', 'import', 'webhook', 'validation'][seq % 5],
      direction,
      status,
      message: `${descriptor.name} ${status === 'Failed' ? 'sync failed' : status === 'Partial Success' ? 'sync partially completed' : 'sync completed'}`,
      recordsProcessed: processed,
      recordsSucceeded: processed - failed,
      recordsFailed: failed,
      latencyMs: descriptor.averageLatencyMs + ((seq * 13) % 400) - 100,
      durationMs: descriptor.averageLatencyMs + ((seq * 13) % 400) - 100,
      requestId: `req-${descriptor.id}-${1000 + seq}`,
      correlationId: `corr-${10000 + seq}`,
      errorCode: status === 'Failed' ? 'SYNC_ERROR' : status === 'Partial Success' ? 'PARTIAL_VALIDATION' : null,
      errorMessage: status === 'Failed' ? `${descriptor.name} endpoint returned an error during exchange` : status === 'Partial Success' ? `${failed} records failed validation` : null,
      payload: { source: descriptor.name },
      payloadSampleJson: { source: descriptor.name, batch: seq },
      startedAt: historicalIso(index * 0.5 + 0.1),
      completedAt: historicalIso(index * 0.5),
      createdAt: historicalIso(index * 0.5),
    };
  }),
);

const INTEGRATION_ERROR_TEMPLATES: Array<{ systemId: string; severity: string; errorCode: string; title: string; description: string; affectedObject: string; retryable: boolean; recommendedFix: string }> = [
  { systemId: 'integration-cad', severity: 'High', errorCode: 'CAD_IMPORT_FAILED', title: 'CAD import failed for 14 incident records', description: 'The CAD event stream returned malformed dispatch payloads for 14 incidents in the last batch.', affectedObject: 'Incidents', retryable: true, recommendedFix: 'Re-run the CAD import for the affected window; verify dispatch time formatting on the CAD side.' },
  { systemId: 'integration-neris', severity: 'Critical', errorCode: 'NERIS_MISSING_LOCATION', title: 'NERIS export rejected due to missing required incident location fields', description: 'NERIS rejected 9 incident reports because locationAddress and geo coordinates were missing.', affectedObject: 'Incident Report (NERIS)', retryable: true, recommendedFix: 'Populate incident location/geo fields, re-validate against NERIS codesets, then re-export.' },
  { systemId: 'integration-payroll', severity: 'High', errorCode: 'PAYROLL_PARTIAL_EXPORT', title: 'Payroll overtime export partially failed for B-shift', description: 'B-shift overtime records failed because 2 employee IDs could not be resolved in payroll.', affectedObject: 'Overtime Hours', retryable: true, recommendedFix: 'Reconcile the 2 unmatched employee IDs in HRIS, then retry the payroll export.' },
  { systemId: 'integration-gis', severity: 'Medium', errorCode: 'GIS_LAYER_STALE', title: 'GIS hydrant layer sync is stale by 48 hours', description: 'The hydrant layer has not refreshed in 48 hours; downstream preplans may reference outdated flow data.', affectedObject: 'Hydrant Layer', retryable: true, recommendedFix: 'Trigger a manual GIS hydrant layer sync and confirm the ArcGIS feature service is reachable.' },
  { systemId: 'integration-epcr', severity: 'High', errorCode: 'EPCR_SYNC_DELAY', title: 'ePCR vendor sync delayed for 9 linked EMS records', description: '9 ePCR records are pending linkage beyond the expected real-time window.', affectedObject: 'Linked EMS Records', retryable: true, recommendedFix: 'Verify mutual TLS certificate validity and retry the ePCR linkage for the delayed records.' },
];

const integrationErrors = [
  ...INTEGRATION_ERROR_TEMPLATES.map((template, index) => ({
    id: `integration-error-${index + 1}`,
    tenantId,
    integrationSystemId: template.systemId,
    integrationId: template.systemId,
    logId: integrationLogs.find((log) => log.integrationSystemId === template.systemId && log.status === 'Failed')?.id ?? null,
    severity: template.severity,
    errorCode: template.errorCode,
    title: template.title,
    description: template.description,
    recommendedFix: template.recommendedFix,
    affectedObject: template.affectedObject,
    affectedRecordId: null,
    retryable: template.retryable,
    retryCount: index % 3,
    status: index === 3 ? 'Retry Scheduled' : 'Open',
    firstSeenAt: historicalIso(index + 1),
    lastSeenAt: historicalIso(index * 0.2),
    resolvedAt: null,
    resolvedByUserId: null,
    createdAt: historicalIso(index + 1),
    updatedAt: historicalIso(index * 0.2),
  })),
  ...Array.from({ length: 37 }).map((_, index) => {
    const descriptor = integrationSeed[index % integrationSeed.length];
    const status = ERROR_STATUSES[index % ERROR_STATUSES.length];
    const severity = ['Low', 'Medium', 'High', 'Critical'][index % 4];
    return {
      id: `integration-error-${index + 6}`,
      tenantId,
      integrationSystemId: descriptor.id,
      integrationId: descriptor.id,
      logId: null,
      severity,
      errorCode: `${descriptor.systemType.toUpperCase()}_ERR_${1000 + index}`,
      title: `${descriptor.name} exchange error #${index + 1}`,
      description: `${descriptor.name} reported a ${severity.toLowerCase()} ${status === 'Resolved' ? '(now resolved) ' : ''}exchange issue during a recent sync.`,
      recommendedFix: `Review ${descriptor.name} adapter logs and re-run the affected sync window.`,
      affectedObject: descriptor.objects[index % descriptor.objects.length].name,
      affectedRecordId: null,
      retryable: index % 3 !== 0,
      retryCount: index % 4,
      status,
      firstSeenAt: historicalIso(index + 2),
      lastSeenAt: historicalIso(index * 0.15),
      resolvedAt: status === 'Resolved' ? historicalIso(index * 0.1) : null,
      resolvedByUserId: status === 'Resolved' ? 'user-admin' : null,
      createdAt: historicalIso(index + 2),
      updatedAt: historicalIso(index * 0.15),
    };
  }),
];

const integrationRetryJobs = Array.from({ length: 28 }).map((_, index) => {
  const error = integrationErrors[index % integrationErrors.length];
  const retryStatus = ['Scheduled', 'Running', 'Succeeded', 'Failed', 'Cancelled'][index % 5];
  return {
    id: `retry-job-${index + 1}`,
    tenantId,
    integrationSystemId: error.integrationSystemId,
    integrationId: error.integrationSystemId,
    errorId: error.id,
    logId: error.logId,
    retryStatus,
    scheduledAt: historicalIso(index * 0.2 - 0.5),
    attemptedAt: retryStatus === 'Scheduled' ? null : historicalIso(index * 0.2 - 0.6),
    completedAt: ['Succeeded', 'Failed', 'Cancelled'].includes(retryStatus) ? historicalIso(index * 0.2 - 0.7) : null,
    resultMessage: retryStatus === 'Succeeded' ? 'Retry completed successfully' : retryStatus === 'Failed' ? 'Retry failed again; escallate to system owner' : null,
    createdByUserId: 'user-admin',
    createdAt: historicalIso(index * 0.2),
    updatedAt: historicalIso(index * 0.15),
  };
});

const webhookSubscriptions = integrationSeed.slice(0, 6).flatMap((descriptor, systemIndex) =>
  Array.from({ length: 2 }).map((_, index) => ({
    id: `webhook-${descriptor.id}-${index + 1}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    name: `${descriptor.name} ${index === 0 ? 'event' : 'status'} webhook`,
    eventType: index === 0 ? `${descriptor.systemType.toLowerCase()}.record.created` : `${descriptor.systemType.toLowerCase()}.sync.failed`,
    targetUrl: `https://hooks.westmetro.gov/${descriptor.systemType.toLowerCase()}/****${systemIndex}${index}`,
    secretConfigured: true,
    status: index === 1 && descriptor.status === 'Degraded' ? 'Disabled' : 'Active',
    lastTriggeredAt: historicalIso(index + systemIndex * 0.3),
    createdAt: historicalIso(300),
    updatedAt: historicalIso(2),
  })),
);

const apiCredentials = [
  ...integrationSeed.map((descriptor, index) => ({
    id: `credential-${descriptor.id}`,
    tenantId,
    integrationSystemId: descriptor.id,
    integrationId: descriptor.id,
    credentialName: `${descriptor.name} ${descriptor.authenticationType} credential`,
    authType: descriptor.authenticationType,
    maskedIdentifier: `${descriptor.systemType.toUpperCase()}-****-${String(1000 + index).slice(-4)}`,
    status: index === 2 ? 'Expiring Soon' : 'Active',
    expiresAt: index === 2 ? iso(11) : iso(180 + index * 5),
    lastRotatedAt: historicalIso(60 + index * 3),
    createdAt: historicalIso(360),
    updatedAt: historicalIso(2),
  })),
  // secondary / rotation-pending credentials for critical systems
  {
    id: 'credential-integration-cad-rotation', tenantId, integrationSystemId: 'integration-cad', integrationId: 'integration-cad',
    credentialName: 'CAD OAuth2 rotation key', authType: 'OAuth2', maskedIdentifier: 'CAD-****-7782',
    status: 'Active', expiresAt: iso(90), lastRotatedAt: historicalIso(5), createdAt: historicalIso(120), updatedAt: historicalIso(1),
  },
  {
    id: 'credential-integration-neris-backup', tenantId, integrationSystemId: 'integration-neris', integrationId: 'integration-neris',
    credentialName: 'NERIS backup client secret', authType: 'OAuth2', maskedIdentifier: 'NERIS-****-3391',
    status: 'Expiring Soon', expiresAt: iso(6), lastRotatedAt: historicalIso(170), createdAt: historicalIso(200), updatedAt: historicalIso(2),
  },
];

const integrationHealthSnapshots = integrationSeed.flatMap((descriptor) =>
  Array.from({ length: 12 }).map((_, dayIndex) => {
    const drift = (dayIndex % 4) * 0.6;
    const successRate = Math.max(80, Math.round((descriptor.successRatePercent - drift) * 10) / 10);
    const riskLevel = successRate >= 98 ? 'Low' : successRate >= 94 ? 'Watch' : successRate >= 90 ? 'At Risk' : 'Critical';
    const healthScore = Math.max(40, Math.round(successRate - (descriptor.averageLatencyMs / 100) - (descriptor.status === 'Degraded' ? 8 : 0)));
    return {
      id: `health-snap-${descriptor.id}-${dayIndex + 1}`,
      tenantId,
      integrationSystemId: descriptor.id,
      integrationId: descriptor.id,
      snapshotDate: historicalIso(dayIndex),
      uptimePercent: Math.max(95, 100 - dayIndex * 0.2),
      successRatePercent: successRate,
      averageLatencyMs: descriptor.averageLatencyMs + dayIndex * 8,
      failedSyncCount: descriptor.status === 'Degraded' ? 3 + (dayIndex % 3) : dayIndex % 2,
      recordsExchanged: 800 + dayIndex * 120 + (descriptor.isCritical ? 600 : 0),
      healthScore,
      riskLevel,
      evidenceSummary: `${descriptor.name}: ${successRate}% success, ${descriptor.averageLatencyMs + dayIndex * 8}ms avg latency over the last 24h.`,
      createdAt: historicalIso(dayIndex),
    };
  }),
);

const notifications = [
  { id: 'note-1', tenantId, userId: 'user-admin', title: 'Certification expiring', message: 'Two EMT certifications expire within 14 days.', notificationType: 'certification.expiring', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-2', tenantId, userId: 'user-chief', title: 'Open staffing gap', message: 'Station 4 still has a paramedic coverage gap on B shift.', notificationType: 'staffing.gap', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-3', tenantId, userId: 'user-logistics', title: 'Maintenance warning', message: 'Medic 4 is due for brake inspection this week.', notificationType: 'asset.maintenance', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-4', tenantId, userId: 'user-training', title: 'Integration sync issue', message: 'NERIS validation queue has exceeded the response threshold.', notificationType: 'integration.sync', isRead: false, createdAt: historicalIso(1) },
  { id: 'note-5', tenantId, userId: 'user-prevention', title: 'Inspection overdue', message: 'Commercial corridor inspections require follow-up scheduling.', notificationType: 'inspection.overdue', isRead: true, createdAt: historicalIso(2) },
];

const auditLogs = [
  { id: 'audit-1', tenantId, userId: 'user-chief', action: 'Viewed station summary', entityName: 'Station', entityId: 'station-4', createdAt: historicalIso(1) },
  { id: 'audit-2', tenantId, userId: 'user-prevention', action: 'Updated inspection queue', entityName: 'Inspection', entityId: 'property-12', createdAt: historicalIso(1) },
  { id: 'audit-3', tenantId, userId: 'user-admin', action: 'Updated role permissions', entityName: 'Role', entityId: 'role-7', createdAt: historicalIso(2) },
  { id: 'audit-4', tenantId, userId: 'user-logistics', action: 'Resolved maintenance warning', entityName: 'Apparatus', entityId: 'apparatus-4', createdAt: historicalIso(2) },
];

const generatedAuditLogs = Array.from({ length: 296 }, (_, index) => {
  const modulePool = ['Dashboard', 'Personnel', 'Training', 'Staffing', 'RMS', 'Assets', 'Prevention', 'Analytics', 'Integrations', 'Admin'];
  const entityPool = ['Station', 'Personnel', 'Course', 'Incident', 'Apparatus', 'Property', 'Report', 'User', 'Role', 'Ticket'];
  const actionPool = [
    'Viewed detail panel',
    'Exported operational summary',
    'Updated readiness status',
    'Reviewed risk signal',
    'Acknowledged notification',
    'Changed workflow status',
    'Logged compliance review',
    'Opened detail drawer',
    'Updated administrative setting',
    'Reviewed support escalation',
  ];
  const moduleName = modulePool[index % modulePool.length];
  const entityName = entityPool[index % entityPool.length];
  const action = actionPool[index % actionPool.length];
  const userId = index % 6 === 0 ? 'user-admin' : index % 5 === 0 ? 'user-chief' : index % 4 === 0 ? 'user-battalion-1' : index % 3 === 0 ? 'user-support-1' : 'user-logistics';
  return {
    id: `audit-${index + 5}`,
    tenantId,
    userId,
    module: moduleName,
    action,
    entityName,
    entityId: `${entityName.toLowerCase()}-${(index % 24) + 1}`,
    severity: index % 48 === 0 ? 'High' : index % 12 === 0 ? 'Medium' : 'Low',
    ipAddress: `10.4.${Math.floor(index / 24)}.${(index % 24) + 10}`,
    userAgent: index % 2 === 0 ? 'Chrome / macOS' : 'Edge / Windows',
    createdAt: historicalIso(index * 0.25 + 3),
  };
});

// ============================================================================
// AI READINESS ADVISOR — cross-module intelligence engine seed data
// ============================================================================

type AiCategoryMeta = { sourceModules: string[]; targetModule: string; impactArea: string };
const AI_CATEGORY_META: Record<string, AiCategoryMeta> = {
  'Staffing Risk': { sourceModules: ['Staffing', 'Personnel'], targetModule: 'staffing', impactArea: 'operational availability' },
  'Training Risk': { sourceModules: ['LMS', 'Personnel'], targetModule: 'learning', impactArea: 'compliance' },
  'Personnel Risk': { sourceModules: ['Personnel', 'Staffing', 'LMS'], targetModule: 'personnel', impactArea: 'individual readiness' },
  'Incident Data Quality Risk': { sourceModules: ['RMS', 'Incidents'], targetModule: 'incidents', impactArea: 'reporting quality' },
  'NERIS/ePCR Risk': { sourceModules: ['RMS', 'Integrations', 'NERIS', 'ePCR'], targetModule: 'incidents', impactArea: 'compliance' },
  'Asset Readiness Risk': { sourceModules: ['Assets', 'Apparatus', 'Maintenance'], targetModule: 'assets', impactArea: 'operational availability' },
  'Inventory Risk': { sourceModules: ['Inventory', 'Assets'], targetModule: 'assets', impactArea: 'operational availability' },
  'Maintenance Risk': { sourceModules: ['Maintenance', 'Apparatus'], targetModule: 'assets', impactArea: 'operational availability' },
  'Prevention Risk': { sourceModules: ['Prevention', 'GIS'], targetModule: 'prevention', impactArea: 'public/community risk' },
  'Permit/Violation Risk': { sourceModules: ['Prevention'], targetModule: 'prevention', impactArea: 'public/community risk' },
  'Integration Risk': { sourceModules: ['Integrations'], targetModule: 'integrations', impactArea: 'reporting quality' },
  'Data Quality Risk': { sourceModules: ['Analytics', 'Data Warehouse'], targetModule: 'analytics', impactArea: 'reporting quality' },
  'Station Readiness Risk': { sourceModules: ['Stations', 'Staffing', 'Assets', 'Training'], targetModule: 'stations', impactArea: 'station readiness' },
  'Executive Priority': { sourceModules: ['Stations', 'Personnel', 'Assets', 'Prevention', 'Integrations'], targetModule: 'platform', impactArea: 'agency readiness' },
};
const AI_CATEGORIES = Object.keys(AI_CATEGORY_META);
const AI_SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Info'];
const AI_TIME = ['Immediate', 'Within 24 hours', 'This week', 'This month', 'Monitor'];
const AI_SCOPE = ['District', 'Battalion', 'Station', 'Crew/shift', 'Individual', 'Single asset/property'];
const AI_STATUSES = ['New', 'New', 'Acknowledged', 'In Progress', 'Resolved', 'Dismissed'];

type AiAnchor = {
  category: string; title: string; severity: string; summary: string; operationalImpact: string; recommendedAction: string;
  timeSensitivity: string; scope: string; readinessImpact: number; confidence: number;
  affected?: Partial<Record<'station' | 'personnel' | 'apparatus' | 'asset' | 'property' | 'incident' | 'integration', string>>;
  actions: Array<{ title: string; type: string; description: string }>;
  evidence: Array<{ module: string; entityName: string; entityId?: string; type: string; title: string; value: string; weight: number }>;
};

const aiAnchorInsights: AiAnchor[] = [
  {
    category: 'Station Readiness Risk', title: 'Station 4 readiness reduced by combined asset, training, and inspection risk', severity: 'Critical',
    summary: 'Station 4 is the agency\'s highest-priority readiness concern: Medic 4 has an open maintenance warning, two paramedic certifications expire within 30 days, and a high-risk occupancy inspection in its response area is overdue.',
    operationalImpact: 'EMS unit availability and compliance are both at risk at Station 4, affecting battalion coverage.',
    recommendedAction: 'Schedule Medic 4 brake inspection, backfill paramedic coverage, and prioritize the overdue high-risk inspection.',
    timeSensitivity: 'Within 24 hours', scope: 'Station', readinessImpact: 88, confidence: 94,
    affected: { station: 'station-4', apparatus: 'apparatus-1' },
    actions: [
      { title: 'Schedule Medic 4 brake inspection', type: 'Schedule Maintenance', description: 'Open a maintenance work order for Medic 4 brake system.' },
      { title: 'Backfill paramedic coverage on B-shift', type: 'Adjust Coverage', description: 'Fill the paramedic gap from the qualified availability pool.' },
      { title: 'Prioritize overdue high-risk inspection', type: 'Prioritize Inspection', description: 'Move the overdue occupancy inspection to the top of the queue.' },
    ],
    evidence: [
      { module: 'Assets', entityName: 'Apparatus', entityId: 'apparatus-1', type: 'metric', title: 'Medic 4 status', value: 'Warning — brake inspection due', weight: 9 },
      { module: 'Training', entityName: 'Certification', type: 'count', title: 'Expiring paramedic certs', value: '2 within 30 days', weight: 7 },
      { module: 'Prevention', entityName: 'Inspection', type: 'flag', title: 'Overdue high-risk inspection', value: '1 overdue in Sector 4', weight: 6 },
      { module: 'Stations', entityName: 'Station', entityId: 'station-4', type: 'score', title: 'Station readiness score', value: '71', weight: 8 },
    ],
  },
  {
    category: 'Staffing Risk', title: 'B-shift overtime exposure is rising across Stations 2 and 9', severity: 'High',
    summary: 'Repeated backfill on B-shift at Stations 2 and 9 is driving overtime exposure above the agency threshold.',
    operationalImpact: 'Sustained overtime increases burnout risk and budget pressure across the battalion.',
    recommendedAction: 'Review open B-shift shifts and invite the qualified availability pool before assigning overtime.',
    timeSensitivity: 'This week', scope: 'Crew/shift', readinessImpact: 62, confidence: 88,
    affected: { station: 'station-2' },
    actions: [
      { title: 'Review B-shift open shifts', type: 'Review Overtime', description: 'Audit open shifts driving overtime at Stations 2 and 9.' },
      { title: 'Invite qualified availability pool', type: 'Fill Open Shift', description: 'Offer open shifts to available qualified personnel first.' },
    ],
    evidence: [
      { module: 'Staffing', entityName: 'OpenShift', type: 'count', title: 'Repeated open shifts', value: '6 in 14 days', weight: 7 },
      { module: 'Staffing', entityName: 'OvertimeRecord', type: 'metric', title: 'Overtime hours trend', value: '+22% vs prior period', weight: 8 },
    ],
  },
  {
    category: 'NERIS/ePCR Risk', title: 'NERIS export rejected for missing required incident location fields', severity: 'Critical',
    summary: 'Several incident reports were rejected by NERIS because required location/geo fields were missing, blocking national submission.',
    operationalImpact: 'Compliance reporting is blocked until the affected incidents are corrected and re-exported.',
    recommendedAction: 'Complete missing location fields on the affected incidents, re-validate against NERIS codesets, and re-export.',
    timeSensitivity: 'Within 24 hours', scope: 'District', readinessImpact: 70, confidence: 92,
    affected: { integration: 'integration-neris' },
    actions: [
      { title: 'Complete missing incident location fields', type: 'Complete Missing Fields', description: 'Populate required location/geo fields on rejected incidents.' },
      { title: 'Re-validate and re-export to NERIS', type: 'Retry Sync', description: 'Run NERIS validation then re-export the corrected batch.' },
    ],
    evidence: [
      { module: 'Integrations', entityName: 'IntegrationSystem', entityId: 'integration-neris', type: 'flag', title: 'NERIS export status', value: 'Degraded — rejections present', weight: 9 },
      { module: 'RMS', entityName: 'Incident', type: 'count', title: 'Incidents missing location', value: '9 incidents', weight: 8 },
    ],
  },
  {
    category: 'Integration Risk', title: 'CAD import failed for a batch of incident records', severity: 'High',
    summary: 'The CAD connector reported failed imports for a batch of incident dispatch records, risking gaps in incident data.',
    operationalImpact: 'Missing CAD records reduce incident completeness and downstream reporting accuracy.',
    recommendedAction: 'Retry the CAD import for the affected window and review the integration error logs.',
    timeSensitivity: 'Within 24 hours', scope: 'District', readinessImpact: 55, confidence: 90,
    affected: { integration: 'integration-cad' },
    actions: [
      { title: 'Retry CAD import', type: 'Retry Sync', description: 'Re-run the CAD import for the failed window.' },
      { title: 'Review CAD error logs', type: 'Review Error Logs', description: 'Open the integration error logs for CAD.' },
    ],
    evidence: [
      { module: 'Integrations', entityName: 'IntegrationLog', type: 'flag', title: 'CAD import failures', value: 'Failed batch detected', weight: 8 },
    ],
  },
  {
    category: 'Integration Risk', title: 'GIS hydrant layer sync is stale by 48 hours', severity: 'Medium',
    summary: 'The GIS hydrant layer has not refreshed in 48 hours; preplans may reference outdated hydrant flow data.',
    operationalImpact: 'Stale hydrant data affects preplan accuracy near high-risk properties.',
    recommendedAction: 'Trigger a manual GIS hydrant layer sync and confirm the ArcGIS feature service is reachable.',
    timeSensitivity: 'This week', scope: 'District', readinessImpact: 40, confidence: 86,
    affected: { integration: 'integration-gis' },
    actions: [
      { title: 'Trigger GIS hydrant sync', type: 'Retry Sync', description: 'Run a manual GIS hydrant layer sync.' },
    ],
    evidence: [
      { module: 'Integrations', entityName: 'IntegrationDataObject', type: 'flag', title: 'Hydrant layer freshness', value: 'Stale by 48h', weight: 6 },
    ],
  },
  {
    category: 'NERIS/ePCR Risk', title: 'ePCR vendor sync delayed for linked EMS records', severity: 'High',
    summary: 'ePCR records are pending linkage beyond the expected real-time window, delaying EMS documentation completeness.',
    operationalImpact: 'Delayed ePCR linkage affects patient-care record completeness and QA.',
    recommendedAction: 'Verify mutual TLS certificate validity and retry the ePCR linkage for delayed records.',
    timeSensitivity: 'This week', scope: 'District', readinessImpact: 48, confidence: 84,
    affected: { integration: 'integration-epcr' },
    actions: [
      { title: 'Retry ePCR linkage', type: 'Retry Sync', description: 'Retry the ePCR linkage for the delayed records.' },
    ],
    evidence: [
      { module: 'Integrations', entityName: 'IntegrationSystem', entityId: 'integration-epcr', type: 'flag', title: 'ePCR status', value: 'Degraded — delayed linkage', weight: 7 },
    ],
  },
  {
    category: 'Inventory Risk', title: 'Critical EMS inventory is below reorder point', severity: 'High',
    summary: 'Critical EMS consumables at multiple stations are below their reorder points, risking unit availability.',
    operationalImpact: 'Low critical stock can take EMS units out of service if not replenished.',
    recommendedAction: 'Approve the pending reorder for critical EMS consumables and notify the Logistics Manager.',
    timeSensitivity: 'This week', scope: 'Station', readinessImpact: 58, confidence: 87,
    affected: { station: 'station-4' },
    actions: [
      { title: 'Approve critical reorder', type: 'Approve Reorder', description: 'Approve the pending reorder for low critical EMS stock.' },
      { title: 'Notify Logistics Manager', type: 'Notify', description: 'Send a notification to the Logistics Manager.' },
    ],
    evidence: [
      { module: 'Inventory', entityName: 'InventoryItem', type: 'count', title: 'Items below reorder', value: 'Critical items low', weight: 7 },
    ],
  },
  {
    category: 'Maintenance Risk', title: 'Preventive maintenance overdue on front-line apparatus', severity: 'Medium',
    summary: 'Preventive maintenance is overdue on front-line apparatus, increasing the risk of unplanned out-of-service events.',
    operationalImpact: 'Overdue PM raises the chance of mechanical failure during response.',
    recommendedAction: 'Schedule the overdue preventive maintenance and stage a reserve apparatus if needed.',
    timeSensitivity: 'This week', scope: 'Single asset/property', readinessImpact: 45, confidence: 82,
    affected: { apparatus: 'apparatus-1' },
    actions: [
      { title: 'Schedule preventive maintenance', type: 'Schedule Maintenance', description: 'Create a PM work order for the overdue apparatus.' },
      { title: 'Stage reserve apparatus', type: 'Move Reserve Apparatus', description: 'Move a reserve unit to maintain coverage.' },
    ],
    evidence: [
      { module: 'Maintenance', entityName: 'PreventiveMaintenanceSchedule', type: 'flag', title: 'PM status', value: 'Overdue', weight: 6 },
    ],
  },
  {
    category: 'Prevention Risk', title: 'High-risk occupancy inspections are trending overdue in the commercial corridor', severity: 'High',
    summary: 'Lakewood commercial-corridor inspections are trending overdue, with several high-risk occupancies requiring follow-up.',
    operationalImpact: 'Overdue high-risk inspections increase community fire risk and code-compliance exposure.',
    recommendedAction: 'Batch inspections by corridor and assign an additional prevention officer.',
    timeSensitivity: 'This week', scope: 'Battalion', readinessImpact: 52, confidence: 91,
    affected: { property: 'property-3' },
    actions: [
      { title: 'Prioritize high-risk inspections', type: 'Prioritize Inspection', description: 'Re-rank the inspection queue by occupancy risk.' },
      { title: 'Assign additional inspector', type: 'Assign Inspector', description: 'Assign a prevention officer to the corridor backlog.' },
    ],
    evidence: [
      { module: 'Prevention', entityName: 'Inspection', type: 'count', title: 'Overdue inspections', value: 'Backlog in corridor', weight: 7 },
    ],
  },
  {
    category: 'Permit/Violation Risk', title: 'Open critical violation requires corrective action follow-up', severity: 'High',
    summary: 'A critical fire-code violation remains open past its corrective-action due date at a high-risk property.',
    operationalImpact: 'Unresolved critical violations elevate community risk and legal exposure.',
    recommendedAction: 'Schedule a reinspection and confirm the corrective-action plan with the property contact.',
    timeSensitivity: 'This week', scope: 'Single asset/property', readinessImpact: 44, confidence: 85,
    affected: { property: 'property-5' },
    actions: [
      { title: 'Schedule reinspection', type: 'Schedule Reinspection', description: 'Schedule a reinspection for the violation.' },
    ],
    evidence: [
      { module: 'Prevention', entityName: 'Violation', type: 'flag', title: 'Open critical violation', value: 'Past due', weight: 7 },
    ],
  },
  {
    category: 'Training Risk', title: 'EMS refresher compliance among company officers is below target', severity: 'Medium',
    summary: 'EMS refresher completion among company officers is below the agency compliance target.',
    operationalImpact: 'Below-target training compliance risks lapses in clinical readiness.',
    recommendedAction: 'Generate a training need assessment and auto-enroll the remaining officers.',
    timeSensitivity: 'This month', scope: 'District', readinessImpact: 38, confidence: 83,
    actions: [
      { title: 'Generate training need assessment', type: 'Generate Assessment', description: 'Generate a need assessment for EMS refresher.' },
      { title: 'Auto-enroll remaining officers', type: 'Assign Course', description: 'Assign the EMS refresher course to remaining officers.' },
    ],
    evidence: [
      { module: 'LMS', entityName: 'TrainingAssignment', type: 'metric', title: 'Refresher completion', value: 'Below target', weight: 6 },
    ],
  },
  {
    category: 'Personnel Risk', title: 'Personnel readiness below threshold with high overtime', severity: 'Medium',
    summary: 'Several personnel combine below-threshold readiness scores with high overtime, signaling burnout and support needs.',
    operationalImpact: 'Low readiness plus high overtime increases performance and safety risk.',
    recommendedAction: 'Review affected personnel for support, training, and schedule relief.',
    timeSensitivity: 'This month', scope: 'Individual', readinessImpact: 36, confidence: 80,
    affected: { personnel: 'person-12' },
    actions: [
      { title: 'Review personnel support plan', type: 'Notify Supervisor', description: 'Flag affected personnel to their supervisor.' },
    ],
    evidence: [
      { module: 'Personnel', entityName: 'Personnel', entityId: 'person-12', type: 'score', title: 'Readiness score', value: 'Below threshold', weight: 6 },
    ],
  },
  {
    category: 'Incident Data Quality Risk', title: 'Incident reports missing required fields and pending QA', severity: 'Medium',
    summary: 'A cluster of incident reports is missing required fields and awaiting QA, risking reporting accuracy.',
    operationalImpact: 'Incomplete incidents reduce data quality and delay NERIS readiness.',
    recommendedAction: 'Open data quality issues and assign cleanup before export.',
    timeSensitivity: 'This week', scope: 'District', readinessImpact: 42, confidence: 84,
    actions: [
      { title: 'Open data quality issue', type: 'Open Data Quality Issue', description: 'Create data quality issues for the affected incidents.' },
      { title: 'Assign QA cleanup', type: 'Assign Cleanup', description: 'Assign QA cleanup to the records team.' },
    ],
    evidence: [
      { module: 'RMS', entityName: 'IncidentDataQualityIssue', type: 'count', title: 'Open DQ issues', value: 'Multiple open', weight: 6 },
    ],
  },
  {
    category: 'Data Quality Risk', title: 'Duplicate incident candidates need review', severity: 'Low',
    summary: 'The data warehouse flagged duplicate incident candidates that need review and merge decisions.',
    operationalImpact: 'Unresolved duplicates inflate counts and distort analytics.',
    recommendedAction: 'Review duplicate candidates and merge confirmed duplicates.',
    timeSensitivity: 'This month', scope: 'District', readinessImpact: 28, confidence: 78,
    actions: [
      { title: 'Merge duplicate records', type: 'Merge Duplicate', description: 'Review and merge confirmed duplicate incidents.' },
    ],
    evidence: [
      { module: 'Analytics', entityName: 'DuplicateRecord', type: 'count', title: 'Duplicate candidates', value: 'Pending review', weight: 5 },
    ],
  },
  {
    category: 'Asset Readiness Risk', title: 'Apparatus out of service reduces battalion coverage', severity: 'High',
    summary: 'An apparatus is out of service, reducing coverage in its battalion until restored or replaced.',
    operationalImpact: 'Out-of-service apparatus directly lowers operational availability.',
    recommendedAction: 'Move a reserve apparatus and expedite the repair.',
    timeSensitivity: 'Immediate', scope: 'Battalion', readinessImpact: 64, confidence: 89,
    affected: { apparatus: 'apparatus-1', station: 'station-4' },
    actions: [
      { title: 'Move reserve apparatus', type: 'Move Reserve Apparatus', description: 'Stage a reserve unit to maintain coverage.' },
      { title: 'Expedite repair', type: 'Schedule Maintenance', description: 'Expedite the repair work order.' },
    ],
    evidence: [
      { module: 'Assets', entityName: 'Apparatus', entityId: 'apparatus-1', type: 'flag', title: 'Apparatus status', value: 'Out of service / warning', weight: 8 },
    ],
  },
  {
    category: 'Executive Priority', title: 'District readiness pressured by Station 4 and overtime trend', severity: 'High',
    summary: 'District readiness is being pressured most by Station 4\'s combined risk and the rising B-shift overtime trend.',
    operationalImpact: 'Leadership attention to Station 4 and overtime would most improve agency readiness today.',
    recommendedAction: 'Focus today on Station 4 asset/inspection risk and overtime exposure on B-shift.',
    timeSensitivity: 'Within 24 hours', scope: 'District', readinessImpact: 75, confidence: 90,
    affected: { station: 'station-4' },
    actions: [
      { title: 'Escalate Station 4 to Battalion Chief', type: 'Escalate', description: 'Escalate the Station 4 readiness package to command.' },
    ],
    evidence: [
      { module: 'Stations', entityName: 'Station', entityId: 'station-4', type: 'score', title: 'Lowest station readiness', value: '71', weight: 8 },
      { module: 'Staffing', entityName: 'OvertimeRecord', type: 'metric', title: 'Overtime trend', value: 'Rising on B-shift', weight: 6 },
    ],
  },
];

let aiInsightSeq = 1000;
let aiEvidenceSeq = 0;
let aiActionSeq = 0;
const aiInsights: Array<Record<string, any>> = [];
const aiInsightEvidence: Array<Record<string, any>> = [];
const aiInsightActions: Array<Record<string, any>> = [];

function pushAiInsight(spec: {
  category: string; title: string; severity: string; summary: string; operationalImpact: string; recommendedAction: string;
  timeSensitivity: string; scope: string; readinessImpact: number; confidence: number; status: string; ageDays: number;
  affected?: Partial<Record<'station' | 'personnel' | 'apparatus' | 'asset' | 'property' | 'incident' | 'integration', string>>;
  actions: Array<{ title: string; type: string; description: string }>;
  evidence: Array<{ module: string; entityName: string; entityId?: string; type: string; title: string; value: string; weight: number }>;
}) {
  aiInsightSeq += 1;
  const id = `insight-${aiInsightSeq}`;
  const meta = AI_CATEGORY_META[spec.category];
  const resolved = spec.status === 'Resolved';
  const dismissed = spec.status === 'Dismissed';
  aiInsights.push({
    id,
    tenantId,
    insightNumber: `AI-${aiInsightSeq}`,
    title: spec.title,
    category: spec.category,
    severity: spec.severity,
    priority: spec.severity === 'Critical' ? 'P1' : spec.severity === 'High' ? 'P2' : spec.severity === 'Medium' ? 'P3' : 'P4',
    confidenceScore: spec.confidence,
    status: spec.status,
    sourceModulesJson: meta.sourceModules,
    dataSources: meta.sourceModules, // legacy compatibility
    affectedStationId: spec.affected?.station ?? null,
    affectedPersonnelId: spec.affected?.personnel ?? null,
    affectedApparatusId: spec.affected?.apparatus ?? null,
    affectedAssetId: spec.affected?.asset ?? null,
    affectedPropertyId: spec.affected?.property ?? null,
    affectedIncidentId: spec.affected?.incident ?? null,
    affectedIntegrationSystemId: spec.affected?.integration ?? null,
    summary: spec.summary,
    evidenceSummary: spec.evidence.map((item) => `${item.title}: ${item.value}`).join(' · '),
    operationalImpact: spec.operationalImpact,
    recommendedAction: spec.recommendedAction,
    recommendedActions: spec.actions.map((action) => action.title), // legacy compatibility
    readinessImpactScore: spec.readinessImpact,
    estimatedTimeSensitivity: spec.timeSensitivity,
    affectedScope: spec.scope,
    impactArea: meta.impactArea,
    createdAt: historicalIso(spec.ageDays),
    updatedAt: historicalIso(Math.max(0, spec.ageDays - 0.3)),
    resolvedAt: resolved ? historicalIso(Math.max(0, spec.ageDays - 1)) : null,
    dismissedAt: dismissed ? historicalIso(Math.max(0, spec.ageDays - 1)) : null,
    resolvedByUserId: resolved ? 'user-admin' : null,
    dismissedByUserId: dismissed ? 'user-admin' : null,
    isDeleted: false,
  });
  spec.evidence.forEach((item) => {
    aiEvidenceSeq += 1;
    aiInsightEvidence.push({
      id: `ai-evidence-${aiEvidenceSeq}`,
      tenantId,
      aiInsightId: id,
      sourceModule: item.module,
      entityName: item.entityName,
      entityId: item.entityId ?? null,
      evidenceType: item.type,
      evidenceTitle: item.title,
      evidenceValue: item.value,
      evidenceJson: { module: item.module, value: item.value },
      weight: item.weight,
      createdAt: historicalIso(spec.ageDays),
    });
  });
  spec.actions.forEach((action, index) => {
    aiActionSeq += 1;
    const status = resolved ? 'Completed' : index === 0 && spec.status === 'In Progress' ? 'In Progress' : 'Suggested';
    aiInsightActions.push({
      id: `ai-action-${aiActionSeq}`,
      tenantId,
      aiInsightId: id,
      actionTitle: action.title,
      actionDescription: action.description,
      actionType: action.type,
      targetModule: meta.targetModule,
      targetEntityName: Object.keys(spec.affected ?? {})[0] ?? null,
      targetEntityId: Object.values(spec.affected ?? {})[0] ?? null,
      status,
      assignedToUserId: status === 'In Progress' ? 'user-chief' : null,
      dueDate: spec.timeSensitivity === 'Immediate' ? iso(0.5) : spec.timeSensitivity === 'Within 24 hours' ? iso(1) : spec.timeSensitivity === 'This week' ? iso(5) : iso(20),
      completedAt: status === 'Completed' ? historicalIso(Math.max(0, spec.ageDays - 1)) : null,
      createdAt: historicalIso(spec.ageDays),
      updatedAt: historicalIso(Math.max(0, spec.ageDays - 0.2)),
    });
  });
}

// Seed the hand-crafted anchor insights (most are New/Acknowledged)
aiAnchorInsights.forEach((anchor, index) => {
  pushAiInsight({
    ...anchor,
    timeSensitivity: anchor.timeSensitivity, scope: anchor.scope,
    status: index % 7 === 6 ? 'Resolved' : index % 5 === 4 ? 'In Progress' : index % 3 === 2 ? 'Acknowledged' : 'New',
    ageDays: 1 + index * 0.4,
  });
});

// Generate additional cross-module insights tied to real entities to reach a rich catalog
const stationRiskTargets = stations.filter((station) => Number(station.readinessScore) < 85);
stationRiskTargets.forEach((station, index) => {
  const severity = Number(station.readinessScore) < 78 ? 'High' : 'Medium';
  pushAiInsight({
    category: 'Station Readiness Risk',
    title: `${station.name} readiness needs attention (${station.readinessScore})`,
    severity,
    summary: `${station.name} (${station.battalion}) is showing a readiness score of ${station.readinessScore} with staffing status "${station.staffingStatus}" and a staffing gap of ${station.staffingGap}.`,
    operationalImpact: `${station.name} readiness is below agency target, affecting battalion coverage confidence.`,
    recommendedAction: `Review ${station.name} staffing, training, and asset risks; close the largest contributing gap first.`,
    timeSensitivity: severity === 'High' ? 'This week' : 'This month', scope: 'Station',
    readinessImpact: 100 - Number(station.readinessScore), confidence: 79 + (index % 8),
    status: AI_STATUSES[index % AI_STATUSES.length], ageDays: 1 + index * 0.3,
    affected: { station: station.id },
    actions: [
      { title: `Review ${station.name} readiness package`, type: 'Review', description: `Open the ${station.name} 360 view and triage the top risks.` },
      { title: 'Close largest contributing gap', type: 'Adjust Coverage', description: 'Address the highest-impact contributing risk first.' },
    ],
    evidence: [
      { module: 'Stations', entityName: 'Station', entityId: station.id, type: 'score', title: 'Readiness score', value: String(station.readinessScore), weight: 7 },
      { module: 'Staffing', entityName: 'Station', entityId: station.id, type: 'flag', title: 'Staffing status', value: station.staffingStatus, weight: 5 },
      { module: 'Staffing', entityName: 'Station', entityId: station.id, type: 'count', title: 'Staffing gap', value: String(station.staffingGap), weight: 4 },
    ],
  });
});

// Personnel readiness insights tied to real personnel records
personnel.filter((person) => Number(person.readinessScore ?? 80) < 80).slice(0, 14).forEach((person, index) => {
  pushAiInsight({
    category: 'Personnel Risk',
    title: `${person.firstName ?? 'Personnel'} ${person.lastName ?? person.employeeNumber} readiness below threshold`,
    severity: Number(person.readinessScore ?? 80) < 76 ? 'Medium' : 'Low',
    summary: `${person.employeeNumber} shows a readiness score of ${person.readinessScore} and may need training, certification, or schedule support.`,
    operationalImpact: 'Individual readiness gaps can compound into crew and station readiness risk.',
    recommendedAction: `Review ${person.employeeNumber} for targeted training and supervisor follow-up.`,
    timeSensitivity: 'This month', scope: 'Individual',
    readinessImpact: 100 - Number(person.readinessScore ?? 80), confidence: 76 + (index % 10),
    status: AI_STATUSES[index % AI_STATUSES.length], ageDays: 2 + index * 0.4,
    affected: { personnel: person.id, station: person.currentStationId ?? person.stationId ?? undefined },
    actions: [
      { title: `Generate training need for ${person.employeeNumber}`, type: 'Generate Assessment', description: 'Create a targeted training need assessment.' },
      { title: 'Notify supervisor', type: 'Notify Supervisor', description: 'Flag the readiness gap to the supervisor.' },
    ],
    evidence: [
      { module: 'Personnel', entityName: 'Personnel', entityId: person.id, type: 'score', title: 'Readiness score', value: String(person.readinessScore), weight: 6 },
      { module: 'LMS', entityName: 'Personnel', entityId: person.id, type: 'flag', title: 'Training signal', value: 'Below-target completion', weight: 4 },
    ],
  });
});

// Top up to a rich catalog (>= 80 insights) with category-cycling generated insights
const fillerCategories = ['Staffing Risk', 'Training Risk', 'Asset Readiness Risk', 'Inventory Risk', 'Maintenance Risk', 'Prevention Risk', 'Permit/Violation Risk', 'Integration Risk', 'Data Quality Risk', 'Incident Data Quality Risk'];
let fillerIndex = 0;
while (aiInsights.length < 84) {
  const category = fillerCategories[fillerIndex % fillerCategories.length];
  const meta = AI_CATEGORY_META[category];
  const severity = AI_SEVERITIES[fillerIndex % AI_SEVERITIES.length];
  const station = stations[fillerIndex % stations.length];
  pushAiInsight({
    category,
    title: `${category} signal at ${station.name}`,
    severity,
    summary: `${category} detected at ${station.name} from ${meta.sourceModules.join(' + ')} signals during the latest readiness scan.`,
    operationalImpact: `${category} at ${station.name} contributes to ${meta.impactArea}.`,
    recommendedAction: `Review the ${category.toLowerCase()} at ${station.name} and apply the recommended action.`,
    timeSensitivity: AI_TIME[fillerIndex % AI_TIME.length], scope: AI_SCOPE[fillerIndex % AI_SCOPE.length],
    readinessImpact: 30 + (fillerIndex * 7) % 55, confidence: 74 + (fillerIndex % 18),
    status: AI_STATUSES[fillerIndex % AI_STATUSES.length], ageDays: 1 + (fillerIndex % 20) * 0.5,
    affected: { station: station.id },
    actions: [
      { title: `Resolve ${category.toLowerCase()} at ${station.name}`, type: 'Review', description: `Apply the recommended action for ${category}.` },
    ],
    evidence: [
      { module: meta.sourceModules[0], entityName: 'Station', entityId: station.id, type: 'signal', title: `${category} signal`, value: severity, weight: 5 },
      { module: meta.sourceModules[Math.min(1, meta.sourceModules.length - 1)], entityName: 'Station', entityId: station.id, type: 'metric', title: 'Contributing metric', value: `${30 + (fillerIndex * 7) % 55} impact`, weight: 4 },
    ],
  });
  fillerIndex += 1;
}

// Pad evidence + actions to meet rich-catalog targets
while (aiInsightEvidence.length < 260) {
  const insight = aiInsights[aiInsightEvidence.length % aiInsights.length];
  aiEvidenceSeq += 1;
  aiInsightEvidence.push({
    id: `ai-evidence-${aiEvidenceSeq}`,
    tenantId,
    aiInsightId: insight.id,
    sourceModule: (insight.sourceModulesJson as string[])[0] ?? 'Analytics',
    entityName: 'ReadinessSnapshot',
    entityId: insight.affectedStationId ?? null,
    evidenceType: 'trend',
    evidenceTitle: 'Supporting trend signal',
    evidenceValue: 'Trend consistent with detected risk',
    evidenceJson: { derived: true },
    weight: 3,
    createdAt: insight.createdAt,
  });
}
while (aiInsightActions.length < 126) {
  const insight = aiInsights[aiInsightActions.length % aiInsights.length];
  const meta = AI_CATEGORY_META[insight.category];
  aiActionSeq += 1;
  aiInsightActions.push({
    id: `ai-action-${aiActionSeq}`,
    tenantId,
    aiInsightId: insight.id,
    actionTitle: 'Notify responsible owner',
    actionDescription: `Notify the ${meta.targetModule} owner about "${insight.title}".`,
    actionType: 'Notify',
    targetModule: meta.targetModule,
    targetEntityName: 'station',
    targetEntityId: insight.affectedStationId ?? null,
    status: 'Suggested',
    assignedToUserId: null,
    dueDate: iso(7),
    completedAt: null,
    createdAt: insight.createdAt,
    updatedAt: insight.updatedAt,
  });
}

const aiRuleSpecs: Array<{ code: string; name: string; category: string; severity: string; description: string; config: Record<string, unknown> }> = [
  { code: 'CERT-EXPIRING', name: 'Expiring certification threshold', category: 'Training Risk', severity: 'High', description: 'Flags certifications expiring within the configured number of days.', config: { withinDays: 30 } },
  { code: 'CERT-EXPIRED', name: 'Expired certification', category: 'Training Risk', severity: 'Critical', description: 'Flags any expired role-required certification.', config: {} },
  { code: 'TRAIN-OVERDUE', name: 'Overdue training assignment', category: 'Training Risk', severity: 'Medium', description: 'Flags overdue training assignments past their due date.', config: { graceDays: 0 } },
  { code: 'TRAIN-NEED', name: 'High-priority training need', category: 'Training Risk', severity: 'Medium', description: 'Flags high-priority training need assessments.', config: { minPriority: 'High' } },
  { code: 'TRAINER-GAP', name: 'No qualified trainer available', category: 'Training Risk', severity: 'Medium', description: 'Flags required training with no qualified trainer available.', config: {} },
  { code: 'STAFF-MIN', name: 'Minimum station staffing', category: 'Staffing Risk', severity: 'High', description: 'Flags stations below minimum staffing.', config: { minStaffing: 1 } },
  { code: 'STAFF-OPENSHIFT', name: 'Repeated open shifts', category: 'Staffing Risk', severity: 'Medium', description: 'Flags repeated open shifts within a window.', config: { withinDays: 14, minCount: 3 } },
  { code: 'STAFF-OT', name: 'Overtime risk threshold', category: 'Staffing Risk', severity: 'High', description: 'Flags shifts/personnel exceeding the overtime risk threshold.', config: { thresholdPercent: 20 } },
  { code: 'STAFF-COVERAGE', name: 'Specialist coverage gap', category: 'Staffing Risk', severity: 'High', description: 'Flags insufficient paramedic/driver/operator/officer coverage.', config: {} },
  { code: 'STAFF-TRAINING-GAP', name: 'Training session coverage gap', category: 'Staffing Risk', severity: 'Medium', description: 'Flags training sessions that create a coverage gap.', config: {} },
  { code: 'PERS-READINESS', name: 'Minimum personnel readiness', category: 'Personnel Risk', severity: 'Medium', description: 'Flags personnel below the readiness threshold.', config: { minScore: 80 } },
  { code: 'PERS-REVIEW', name: 'Performance review overdue', category: 'Personnel Risk', severity: 'Low', description: 'Flags overdue personnel performance reviews.', config: {} },
  { code: 'PERS-QA', name: 'Repeated documentation QA issues', category: 'Personnel Risk', severity: 'Medium', description: 'Flags personnel with repeated documentation QA issues.', config: { minCount: 2 } },
  { code: 'RMS-FIELDS', name: 'Incident missing required fields', category: 'Incident Data Quality Risk', severity: 'Medium', description: 'Flags incident reports missing required fields.', config: {} },
  { code: 'RMS-QA', name: 'Incident QA rejection', category: 'Incident Data Quality Risk', severity: 'Medium', description: 'Flags QA-rejected incidents.', config: {} },
  { code: 'NERIS-READY', name: 'NERIS missing required field rule', category: 'NERIS/ePCR Risk', severity: 'High', description: 'Flags incidents not ready for NERIS export.', config: {} },
  { code: 'EPCR-DELAY', name: 'ePCR sync delay', category: 'NERIS/ePCR Risk', severity: 'High', description: 'Flags delayed ePCR linkage beyond the real-time window.', config: { maxDelayHours: 4 } },
  { code: 'ASSET-OOS', name: 'Critical asset status rule', category: 'Asset Readiness Risk', severity: 'High', description: 'Flags apparatus/assets out of service.', config: {} },
  { code: 'ASSET-PM', name: 'Preventive maintenance overdue', category: 'Maintenance Risk', severity: 'Medium', description: 'Flags overdue preventive maintenance.', config: {} },
  { code: 'INV-LOW', name: 'Critical low stock', category: 'Inventory Risk', severity: 'High', description: 'Flags critical inventory below reorder point.', config: {} },
  { code: 'INV-EXPIRED', name: 'Expired supplies', category: 'Inventory Risk', severity: 'Medium', description: 'Flags expired consumable supplies.', config: {} },
  { code: 'PREV-INSP', name: 'Overdue inspection threshold', category: 'Prevention Risk', severity: 'High', description: 'Flags overdue high-risk occupancy inspections.', config: { riskLevels: ['High', 'Critical'] } },
  { code: 'PREV-VIOLATION', name: 'Open critical violation', category: 'Permit/Violation Risk', severity: 'High', description: 'Flags open critical violations past due.', config: {} },
  { code: 'PREV-PERMIT', name: 'Permit backlog', category: 'Permit/Violation Risk', severity: 'Medium', description: 'Flags permits in backlog beyond review SLA.', config: {} },
  { code: 'PREV-PREPLAN', name: 'Preplan review overdue', category: 'Prevention Risk', severity: 'Low', description: 'Flags incomplete or review-overdue preplans.', config: {} },
  { code: 'INT-FAIL', name: 'Integration failure threshold', category: 'Integration Risk', severity: 'High', description: 'Flags failed or degraded critical integrations.', config: { minFailures: 1 } },
  { code: 'INT-STALE', name: 'Stale data object', category: 'Integration Risk', severity: 'Medium', description: 'Flags stale integration data objects.', config: { staleHours: 24 } },
  { code: 'INT-CRED', name: 'Credential expiring', category: 'Integration Risk', severity: 'Medium', description: 'Flags API credentials expiring soon.', config: { withinDays: 14 } },
  { code: 'DQ-SCORE', name: 'Data quality threshold', category: 'Data Quality Risk', severity: 'Medium', description: 'Flags modules below the data quality score threshold.', config: { minScore: 85 } },
  { code: 'DQ-DUP', name: 'Duplicate candidates', category: 'Data Quality Risk', severity: 'Low', description: 'Flags unresolved duplicate record candidates.', config: {} },
];

const aiRules = aiRuleSpecs.map((spec, index) => {
  const triggered = aiInsights.filter((insight) => insight.category === spec.category).length;
  return {
    id: `ai-rule-${index + 1}`,
    tenantId,
    ruleCode: spec.code,
    name: spec.name,
    category: spec.category,
    description: spec.description,
    severityDefault: spec.severity,
    isActive: index % 11 !== 10, // a couple inactive for realism
    configJson: spec.config,
    lastTriggeredCount: triggered,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  };
});

const aiProviderConfigs = [
  { id: 'ai-provider-local', providerName: 'Local Rule Engine', providerType: 'rule-engine', enabled: true, baseUrl: null, modelName: 'missionos-rules-v1', apiKeyConfigured: false, notes: 'Deterministic, rule-driven intelligence engine. Always available; no external dependency.' },
  { id: 'ai-provider-ollama', providerName: 'Ollama', providerType: 'ollama', enabled: false, baseUrl: 'http://localhost:11434', modelName: 'llama3.1', apiKeyConfigured: false, notes: 'Optional local LLM. Disabled by default; enable to augment rule-based summaries.' },
  { id: 'ai-provider-openai', providerName: 'OpenAI', providerType: 'openai', enabled: false, baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o-mini', apiKeyConfigured: false, notes: 'Optional cloud LLM. Disabled; requires an API key configured via environment.' },
  { id: 'ai-provider-azure', providerName: 'Azure OpenAI', providerType: 'azure-openai', enabled: false, baseUrl: 'https://your-resource.openai.azure.com', modelName: 'gpt-4o', apiKeyConfigured: false, notes: 'Optional Azure-hosted LLM. Disabled by default.' },
  { id: 'ai-provider-custom', providerName: 'Custom LLM Endpoint', providerType: 'custom', enabled: false, baseUrl: null, modelName: null, apiKeyConfigured: false, notes: 'Optional custom OpenAI-compatible endpoint placeholder.' },
].map((provider) => ({ ...provider, tenantId, createdAt: historicalIso(200), updatedAt: historicalIso(1) }));

const aiQuestionSeed = [
  'What needs attention today?',
  'Which stations are at highest readiness risk?',
  'Who needs training this week?',
  'Which apparatus affects station readiness?',
  'Which inspections should be prioritized?',
  'Which integrations are failing?',
  'What data quality issues affect reporting?',
  'Summarize Station 4 readiness.',
  'Why is training compliance down?',
  'What is the agency readiness score?',
];
const aiQuestionLogs = Array.from({ length: 32 }).map((_, index) => {
  const question = aiQuestionSeed[index % aiQuestionSeed.length];
  return {
    id: `ai-question-${index + 1}`,
    tenantId,
    userId: ['user-admin', 'user-chief', 'user-training', 'user-logistics'][index % 4],
    question,
    answer: `Based on current cross-module signals, ${question.replace('?', '').toLowerCase()} resolves to the highest-priority open insights ranked by severity, readiness impact, and time sensitivity.`,
    sourceModulesJson: ['Stations', 'Staffing', 'Assets', 'Prevention', 'Integrations'],
    confidenceScore: 78 + (index % 18),
    createdAt: historicalIso(index * 0.5 + 0.2),
  };
});

const aiReadinessSnapshots = Array.from({ length: 64 }).map((_, dayIndex) => {
  const base = 80 + Math.round(Math.sin(dayIndex / 6) * 5);
  const staffingRisk = 30 + (dayIndex * 5) % 35;
  const trainingRisk = 25 + (dayIndex * 4) % 30;
  const personnelRisk = 20 + (dayIndex * 3) % 28;
  const incidentDataRisk = 22 + (dayIndex * 6) % 26;
  const assetRisk = 28 + (dayIndex * 7) % 34;
  const preventionRisk = 26 + (dayIndex * 5) % 30;
  const integrationRisk = 24 + (dayIndex * 8) % 32;
  const dataQualityRisk = 18 + (dayIndex * 4) % 24;
  const agencyReadiness = Math.max(70, Math.min(92, base));
  const overall = Math.round((staffingRisk + trainingRisk + personnelRisk + incidentDataRisk + assetRisk + preventionRisk + integrationRisk + dataQualityRisk) / 8);
  return {
    id: `ai-readiness-snap-${dayIndex + 1}`,
    tenantId,
    snapshotDate: historicalIso(dayIndex),
    agencyReadinessScore: agencyReadiness,
    staffingRiskScore: staffingRisk,
    trainingRiskScore: trainingRisk,
    personnelRiskScore: personnelRisk,
    incidentDataRiskScore: incidentDataRisk,
    assetRiskScore: assetRisk,
    preventionRiskScore: preventionRisk,
    integrationRiskScore: integrationRisk,
    dataQualityRiskScore: dataQualityRisk,
    overallRiskLevel: overall >= 45 ? 'High' : overall >= 32 ? 'Medium' : 'Low',
    topRiskSummary: dayIndex === 0 ? 'Station 4 asset + inspection risk and B-shift overtime are the top agency risks today.' : `Day -${dayIndex}: asset and staffing risk lead the agency risk profile.`,
    createdAt: historicalIso(dayIndex),
  };
});

const supportTickets = [
  { id: 'SLA-101', tenantId, ticketNumber: 'SLA-101', title: 'NERIS validation queue latency', description: 'Validation queue latency is above threshold.', severity: 'Critical', status: 'In Progress', module: 'Integrations', requesterName: 'Integration Support', assignedTo: 'Integration Support', slaDueAt: iso(0.2), firstResponseDueAt: historicalIso(0.1), resolutionDueAt: iso(0.5), slaStatus: 'At Risk', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'SLA-102', tenantId, ticketNumber: 'SLA-102', title: 'Add Station 17 WUI preplan layer', description: 'Need WUI preplan layer for Station 17.', severity: 'High', status: 'Open', module: 'Prevention', requesterName: 'GIS Support', assignedTo: 'GIS Support', slaDueAt: iso(2), firstResponseDueAt: iso(0.5), resolutionDueAt: iso(4), slaStatus: 'On Track', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'SLA-103', tenantId, ticketNumber: 'SLA-103', title: 'Training export format request', description: 'Need CSV export format for LMS.', severity: 'Normal', status: 'Resolved', module: 'Training', requesterName: 'Customer Success', assignedTo: 'Customer Success', slaDueAt: iso(2), firstResponseDueAt: iso(1), resolutionDueAt: iso(3), slaStatus: 'On Track', createdAt: historicalIso(3), updatedAt: historicalIso(1) },
  ...Array.from({ length: 37 }, (_, index) => {
    const severity = index % 9 === 0 ? 'Critical' : index % 5 === 0 ? 'High' : index % 3 === 0 ? 'Normal' : 'Low';
    const status = index % 7 === 0 ? 'Waiting on Customer' : index % 6 === 0 ? 'In Progress' : index % 5 === 0 ? 'Assigned' : index % 4 === 0 ? 'New' : index % 2 === 0 ? 'Resolved' : 'Closed';
    const slaStatus = severity === 'Critical' && (status === 'New' || status === 'Assigned') ? 'Breached' : status === 'Resolved' || status === 'Closed' ? 'On Track' : index % 4 === 0 ? 'At Risk' : 'On Track';
    const module = index % 4 === 0 ? 'Security' : index % 4 === 1 ? 'Integrations' : index % 4 === 2 ? 'Analytics' : 'Support';
    return {
      id: `SLA-${104 + index}`,
      tenantId,
      ticketNumber: `SLA-${104 + index}`,
      title: [
        'SSO provisioning request',
        'Audit export access issue',
        'Support dashboard filter enhancement',
        'Role assignment review',
        'Data quality export discrepancy',
        'Backup status notification',
        'System status event follow-up',
      ][index % 7],
      description: 'Operational support request captured in the trust center.',
      severity,
      status,
      module,
      requesterName: ['Integration Support', 'GIS Support', 'Customer Success', 'Chief Office'][index % 4],
      assignedTo: ['Support Engineer', 'Security Analyst', 'Data Steward', 'Account Manager'][index % 4],
      slaDueAt: iso(1 + (index % 3)),
      firstResponseDueAt: iso(0.5 + (index % 2) * 0.5),
      resolutionDueAt: iso(2 + (index % 4)),
      slaStatus,
      createdAt: historicalIso(1 + index * 0.1),
      updatedAt: historicalIso(0.2),
    };
  }),
];

const accessReviews = [
  { id: 'access-review-1', tenantId, reviewName: 'Quarterly Executive Access Review', status: 'In Progress', reviewPeriodStart: historicalIso(90), reviewPeriodEnd: historicalIso(1), ownerUserId: 'user-admin', dueDate: iso(7), createdAt: historicalIso(30), updatedAt: historicalIso(1) },
  { id: 'access-review-2', tenantId, reviewName: 'Operations Role Recertification', status: 'Draft', reviewPeriodStart: historicalIso(60), reviewPeriodEnd: historicalIso(1), ownerUserId: 'user-chief', dueDate: iso(14), createdAt: historicalIso(20), updatedAt: historicalIso(1) },
  { id: 'access-review-3', tenantId, reviewName: 'Support & Integration Access Review', status: 'Overdue', reviewPeriodStart: historicalIso(120), reviewPeriodEnd: historicalIso(30), ownerUserId: 'user-system', dueDate: historicalIso(10), createdAt: historicalIso(40), updatedAt: historicalIso(1) },
  { id: 'access-review-4', tenantId, reviewName: 'Public-Safety Data Export Review', status: 'Completed', reviewPeriodStart: historicalIso(150), reviewPeriodEnd: historicalIso(60), ownerUserId: 'user-data-steward', dueDate: historicalIso(5), createdAt: historicalIso(60), updatedAt: historicalIso(1) },
  { id: 'access-review-5', tenantId, reviewName: 'Security Controls Review', status: 'In Progress', reviewPeriodStart: historicalIso(45), reviewPeriodEnd: historicalIso(1), ownerUserId: 'user-auditor', dueDate: iso(10), createdAt: historicalIso(20), updatedAt: historicalIso(1) },
];
const accessReviewItems = accessReviews.flatMap((review, index) => users.slice(0, 12).map((user, userIndex) => ({
  id: `access-review-item-${index + 1}-${userIndex + 1}`,
  tenantId,
  accessReviewId: review.id,
  userId: user.id,
  roleId: roles.find((role) => role.name === user.roleCodes[0])?.id ?? 'role-1',
  reviewerUserId: index % 2 === 0 ? 'user-admin' : 'user-chief',
  decision: userIndex % 5 === 0 ? 'Remove Access' : userIndex % 3 === 0 ? 'Modify Access' : 'Approved',
  comment: userIndex % 4 === 0 ? 'Review elevated due to sensitive access.' : 'Standard recertification result.',
  reviewedAt: index % 2 === 0 ? historicalIso(1) : null,
  createdAt: historicalIso(2),
})));

const sensitiveAccessLogs = Array.from({ length: 80 }, (_, index) => ({
  id: `sensitive-access-${index + 1}`,
  tenantId,
  userId: users[index % users.length].id,
  dataCategory: index % 4 === 0 ? 'ePCR' : index % 4 === 1 ? 'Personnel Documents' : index % 4 === 2 ? 'Performance Reviews' : 'Security Settings',
  entityName: index % 3 === 0 ? 'Incident' : index % 3 === 1 ? 'Personnel' : 'Report',
  entityId: index % 3 === 0 ? incidents[index % incidents.length].id : index % 3 === 1 ? personnel[index % personnel.length].id : `report-export-${(index % 25) + 1}`,
  accessType: index % 5 === 0 ? 'Export' : index % 3 === 0 ? 'View' : 'Download',
  reason: index % 2 === 0 ? 'Operational need' : 'Audit review',
  ipAddress: `10.0.${Math.floor(index / 8)}.${(index % 8) + 10}`,
  createdAt: historicalIso(index * 0.1),
}));

const sessionLogs = Array.from({ length: 120 }, (_, index) => ({
  id: `session-${index + 1}`,
  tenantId,
  userId: users[index % users.length].id,
  sessionId: `sess-${1000 + index}`,
  loginAt: historicalIso(index * 0.08 + 0.2),
  logoutAt: index % 5 === 0 ? null : historicalIso(index * 0.08 - 0.05),
  ipAddress: `10.1.${Math.floor(index / 12)}.${(index % 12) + 20}`,
  userAgent: index % 2 === 0 ? 'Chrome / macOS' : 'Edge / Windows',
  status: index % 9 === 0 ? 'Locked' : index % 7 === 0 ? 'Invited' : 'Active',
  createdAt: historicalIso(index * 0.08 + 0.2),
}));

const passwordPolicy = [{
  id: 'password-policy-default',
  tenantId,
  minLength: 14,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  rotationDays: 180,
  lockoutThreshold: 5,
  lockoutMinutes: 30,
  createdAt: historicalIso(120),
  updatedAt: historicalIso(1),
}];

const mfaPolicy = [{
  id: 'mfa-policy-default',
  tenantId,
  requiredForAllUsers: false,
  requiredForAdmins: true,
  allowedMethodsJson: ['TOTP', 'Push', 'FIDO2'],
  gracePeriodDays: 7,
  status: 'Implemented',
  createdAt: historicalIso(120),
  updatedAt: historicalIso(1),
}];

const ssoConfigurations = [
  { id: 'sso-entra', tenantId, providerType: 'OIDC', providerName: 'Microsoft Entra ID', status: 'Active', metadataUrl: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration', clientIdMasked: 'ENTRA-****-2419', domainsJson: ['westmetro.example'], autoProvisionUsers: true, defaultRoleId: roles.find((role) => role.name === 'Firefighter')?.id ?? 'role-1', createdAt: historicalIso(90), updatedAt: historicalIso(1) },
  { id: 'sso-saml', tenantId, providerType: 'SAML', providerName: 'SAML Placeholder', status: 'Disabled', metadataUrl: null, clientIdMasked: null, domainsJson: ['westmetro.example'], autoProvisionUsers: false, defaultRoleId: roles.find((role) => role.name === 'Read-Only Auditor')?.id ?? 'role-1', createdAt: historicalIso(90), updatedAt: historicalIso(1) },
];

const securityControls = Array.from({ length: 60 }, (_, index) => {
  const frameworks = ['NIST CSF', 'CJIS-aligned', 'HIPAA-aware', 'SOC 2-ready'];
  const statuses = ['Implemented', 'Partially Implemented', 'Planned', 'Not Applicable'];
  return {
    id: `sec-control-${index + 1}`,
    tenantId,
    controlCode: `${frameworks[index % frameworks.length].replace(/\s+/g, '-')}-${String(index + 1).padStart(2, '0')}`,
    framework: frameworks[index % frameworks.length],
    controlName: ['Access control', 'Audit logging', 'MFA enforcement', 'Backup review', 'Incident response', 'Data retention'][index % 6],
    description: 'Public-sector trust center control mapping and evidence placeholder.',
    implementationStatus: statuses[index % statuses.length],
    evidenceSummary: `Evidence packet ${index + 1} for ${frameworks[index % frameworks.length]}.`,
    ownerTeam: ['IT', 'Security', 'Operations', 'Support'][index % 4],
    lastReviewedAt: index % 4 === 0 ? historicalIso(20 + (index % 7)) : null,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  };
});

const complianceMappings = [
  { id: 'cmp-map-1', tenantId, framework: 'NIST CSF', domain: 'Identify', controlCode: 'ID.AM-1', controlTitle: 'Asset management', mappedSystemControlsJson: ['securityControls', 'auditLogs'], status: 'Mapped', notes: 'Mapped to asset and audit logging controls.', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'cmp-map-2', tenantId, framework: 'NIST CSF', domain: 'Protect', controlCode: 'PR.AC-1', controlTitle: 'Identity and access management', mappedSystemControlsJson: ['users', 'roles', 'mfaPolicy'], status: 'Mapped', notes: 'RBAC and MFA posture mapped.', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'cmp-map-3', tenantId, framework: 'NIST CSF', domain: 'Detect', controlCode: 'DE.CM-1', controlTitle: 'Monitoring', mappedSystemControlsJson: ['sessionLog', 'systemStatusEvent'], status: 'Mapped', notes: null, createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'cmp-map-4', tenantId, framework: 'CJIS-aligned', domain: 'Access Control', controlCode: '5.5.1', controlTitle: 'Least privilege', mappedSystemControlsJson: ['rbacMatrix'], status: 'Mapped', notes: 'CJIS-aligned posture placeholder.', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'cmp-map-5', tenantId, framework: 'HIPAA-aware', domain: 'Audit Controls', controlCode: '164.312(b)', controlTitle: 'Audit controls', mappedSystemControlsJson: ['sensitiveAccessLog', 'auditLog'], status: 'Mapped', notes: 'HIPAA-aware privacy posture for ePCR-linked records.', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'cmp-map-6', tenantId, framework: 'SOC 2-ready', domain: 'Security', controlCode: 'CC6.1', controlTitle: 'Logical access security', mappedSystemControlsJson: ['passwordPolicy', 'mfaPolicy', 'ssoConfiguration'], status: 'Mapped', notes: 'Operational control structure ready for external review.', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
];

const backupPolicy = [{
  id: 'backup-policy-default',
  tenantId,
  backupFrequency: 'Daily',
  retentionDays: 30,
  encryptionEnabled: true,
  lastBackupAt: historicalIso(1),
  lastRestoreTestAt: historicalIso(21),
  status: 'Healthy',
  rpoMinutes: 15,
  rtoMinutes: 240,
  createdAt: historicalIso(120),
  updatedAt: historicalIso(1),
}];

const disasterRecoveryPlan = [{
  id: 'dr-plan-default',
  tenantId,
  planName: 'MissionOS Disaster Recovery Plan',
  status: 'Active',
  rtoMinutes: 240,
  rpoMinutes: 15,
  lastTestedAt: historicalIso(21),
  ownerTeam: 'IT / Operations',
  summary: 'Tested restore, failover, and incident communication runbooks remain current.',
  createdAt: historicalIso(120),
  updatedAt: historicalIso(1),
}];

const securityIncidents = Array.from({ length: 15 }, (_, index) => ({
  id: `sec-incident-${index + 1}`,
  tenantId,
  incidentNumber: `SEC-${String(200 + index).padStart(3, '0')}`,
  title: ['Failed login spike', 'Export permission misuse', 'Integration credential rotation overdue', 'Unexpected role assignment', 'Sensitive data review escalation'][index % 5],
  severity: index % 5 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : 'Normal',
  status: index % 5 === 0 ? 'Contained' : index % 4 === 0 ? 'Investigating' : index % 3 === 0 ? 'Open' : 'Resolved',
  detectedAt: historicalIso(5 + index),
  containedAt: index % 2 === 0 ? historicalIso(4 + index) : null,
  resolvedAt: index % 3 === 0 ? historicalIso(3 + index) : null,
  ownerUserId: users[index % users.length].id,
  summary: 'Security investigation placeholder recorded in the trust center.',
  impactSummary: index % 4 === 0 ? 'Limited support operations impact.' : null,
  resolutionSummary: index % 3 === 0 ? 'Mitigated and documented.' : null,
  createdAt: historicalIso(5 + index),
  updatedAt: historicalIso(1),
}));

const vulnerabilities = Array.from({ length: 25 }, (_, index) => ({
  id: `vuln-${index + 1}`,
  tenantId,
  vulnerabilityNumber: `VULN-${String(400 + index).padStart(3, '0')}`,
  title: ['Outdated dependency', 'Misconfigured SSO', 'Expiring certificate', 'Unpatched runtime', 'Weak password policy'][index % 5],
  severity: index % 5 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : 'Normal',
  status: index % 6 === 0 ? 'In Remediation' : index % 4 === 0 ? 'Open' : index % 5 === 0 ? 'Risk Accepted' : 'Resolved',
  source: index % 2 === 0 ? 'Dependency Scan' : 'Security Review',
  affectedComponent: ['API', 'Frontend', 'Integration Hub', 'Trust Center'][index % 4],
  detectedAt: historicalIso(20 + index),
  dueDate: index % 6 === 0 ? iso(14) : iso(30),
  resolvedAt: index % 4 === 0 ? historicalIso(3) : null,
  remediationSummary: index % 4 === 0 ? 'Patched and validated.' : null,
  createdAt: historicalIso(20 + index),
  updatedAt: historicalIso(1),
}));

const slaPolicies = [
  { id: 'sla-critical', tenantId, severity: 'Critical', firstResponseMinutes: 60, resolutionMinutes: 480, escalationMinutes: 120, businessHoursOnly: false, createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'sla-high', tenantId, severity: 'High', firstResponseMinutes: 240, resolutionMinutes: 1440, escalationMinutes: 480, businessHoursOnly: false, createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'sla-normal', tenantId, severity: 'Normal', firstResponseMinutes: 480, resolutionMinutes: 4320, escalationMinutes: 1440, businessHoursOnly: true, createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'sla-low', tenantId, severity: 'Low', firstResponseMinutes: 960, resolutionMinutes: 7200, escalationMinutes: 2880, businessHoursOnly: true, createdAt: historicalIso(120), updatedAt: historicalIso(1) },
];

const escalationPaths = Array.from({ length: 12 }, (_, index) => ({
  id: `escalation-${index + 1}`,
  tenantId,
  severity: ['Critical', 'High', 'Normal', 'Low'][index % 4],
  level: index + 1,
  roleName: ['Support Analyst', 'System Admin', 'Battalion Chief', 'District Admin'][index % 4],
  contactName: ['Dana Mitchell', 'Chris Alvarez', 'Maya Chen', 'Taylor Grant'][index % 4],
  contactEmail: ['admin@westmetro.example', 'chief@westmetro.example', 'training@westmetro.example', 'auditor@westmetro.example'][index % 4],
  contactPhone: `303-555-${String(8000 + index).slice(-4)}`,
  escalationAfterMinutes: [60, 240, 480, 960][index % 4],
  createdAt: historicalIso(120),
  updatedAt: historicalIso(1),
}));

const systemStatusEvents = Array.from({ length: 20 }, (_, index) => ({
  id: `system-status-${index + 1}`,
  tenantId,
  componentName: ['API Gateway', 'Database', 'SSO', 'CAD Integration', 'RMS Integration', 'Analytics', 'Backup Jobs'][index % 7],
  status: index % 7 === 0 ? 'Degraded' : index % 5 === 0 ? 'Outage' : 'Healthy',
  title: ['Routine maintenance', 'Degraded integration response', 'Backup validation', 'SSO maintenance'][index % 4],
  description: 'System status event placeholder for operations visibility.',
  startedAt: historicalIso(2 + index * 0.5),
  resolvedAt: index % 2 === 0 ? historicalIso(1 + index * 0.2) : null,
  impactLevel: index % 7 === 0 ? 'High' : index % 5 === 0 ? 'Medium' : 'Low',
  createdAt: historicalIso(2 + index * 0.5),
  updatedAt: historicalIso(1),
}));

const accessReviewCampaigns = accessReviews.length;
void accessReviewCampaigns;

const reportDefinitionTemplates = [
  { code: 'OPS-READINESS', name: 'District Readiness Summary', category: 'Cross-module readiness', sourceModules: ['Stations', 'Personnel', 'Training', 'Assets', 'Prevention'], defaultColumnsJson: ['station', 'readinessScore', 'riskLevel'], defaultFiltersJson: { dateRange: '30d' } },
  { code: 'OPS-INCIDENTS', name: 'Weekly Incident Volume by Station', category: 'Operations / Incidents', sourceModules: ['Incidents', 'Stations'], defaultColumnsJson: ['station', 'incidentCount', 'emsPercentage'], defaultFiltersJson: { dateRange: '7d' } },
  { code: 'TRAIN-COMPLIANCE', name: 'Training Compliance by Station', category: 'Training', sourceModules: ['Training', 'Stations'], defaultColumnsJson: ['station', 'trainingCompliance', 'expiringCertifications'], defaultFiltersJson: { dateRange: '30d' } },
  { code: 'TRAIN-EXPIRING', name: 'Expiring Certifications by Role', category: 'Training', sourceModules: ['Personnel', 'Certifications'], defaultColumnsJson: ['personnel', 'rank', 'certification', 'expiryDate'], defaultFiltersJson: { dateRange: '30d' } },
  { code: 'STAFF-OVERTIME', name: 'Overtime Risk by Shift', category: 'Staffing', sourceModules: ['Staffing', 'Personnel'], defaultColumnsJson: ['station', 'shift', 'overtimeRisk'], defaultFiltersJson: { dateRange: '14d' } },
  { code: 'STAFF-COVERAGE', name: 'Staffing Coverage Trend', category: 'Staffing', sourceModules: ['Staffing'], defaultColumnsJson: ['station', 'coverageScore'], defaultFiltersJson: { dateRange: '30d' } },
  { code: 'ASSET-READY', name: 'Apparatus Out of Service Report', category: 'Assets', sourceModules: ['Assets', 'Apparatus'], defaultColumnsJson: ['unitNumber', 'station', 'status', 'nextMaintenanceDue'], defaultFiltersJson: { status: 'Out of Service' } },
  { code: 'ASSET-LOWSTOCK', name: 'Low Stock Critical Inventory', category: 'Assets', sourceModules: ['Inventory'], defaultColumnsJson: ['station', 'item', 'quantityOnHand', 'reorderPoint'], defaultFiltersJson: { readinessCriticality: 'Critical' } },
  { code: 'PREV-INSPECTIONS', name: 'Overdue Inspections by Occupancy Risk', category: 'Prevention', sourceModules: ['Prevention', 'Properties'], defaultColumnsJson: ['property', 'occupancy', 'inspectionStatus', 'riskLevel'], defaultFiltersJson: { inspectionStatus: 'Overdue' } },
  { code: 'PREV-PERMITS', name: 'Permit Backlog Report', category: 'Prevention', sourceModules: ['Prevention', 'Permits'], defaultColumnsJson: ['permitNumber', 'property', 'status', 'reviewDueDate'], defaultFiltersJson: { permitStatus: 'Under Review' } },
  { code: 'PREV-VIOLATIONS', name: 'Open Critical Violations', category: 'Prevention', sourceModules: ['Prevention'], defaultColumnsJson: ['property', 'title', 'severity', 'dueDate'], defaultFiltersJson: { severity: 'Critical' } },
  { code: 'PREV-PREPLANS', name: 'Preplans Due for Review', category: 'Prevention', sourceModules: ['Prevention'], defaultColumnsJson: ['property', 'preplanNumber', 'status', 'nextReviewDue'], defaultFiltersJson: { status: 'Review Due' } },
  { code: 'DQ-EXCEPTIONS', name: 'Data Quality Exceptions', category: 'Data Quality', sourceModules: ['All'], defaultColumnsJson: ['module', 'entityName', 'issueType', 'severity'], defaultFiltersJson: { severity: 'Critical' } },
  { code: 'INTEGRATION-FAILURES', name: 'Integration Sync Failures', category: 'Integrations', sourceModules: ['Integrations'], defaultColumnsJson: ['name', 'systemType', 'status', 'lastSyncAt'], defaultFiltersJson: { status: 'Failed' } },
  { code: 'READINESS-FORECAST', name: 'Readiness Forecast by Station', category: 'Cross-module readiness', sourceModules: ['Stations', 'Personnel', 'Training', 'Assets', 'Prevention'], defaultColumnsJson: ['station', 'readinessScore', 'forecast', 'topRisk'], defaultFiltersJson: { dateRange: '30d' } },
  { code: 'RMS-QA', name: 'Incident QA Correction Summary', category: 'Operations / Incidents', sourceModules: ['Incidents', 'RMS'], defaultColumnsJson: ['incidentNumber', 'qaStatus', 'nerisStatus', 'epcrStatus'], defaultFiltersJson: { qaStatus: 'QA Needed' } },
  { code: 'RMS-NERIS', name: 'NERIS Export Readiness', category: 'Operations / Incidents', sourceModules: ['Incidents', 'Integrations'], defaultColumnsJson: ['incidentNumber', 'nerisStatus', 'reportNumber'], defaultFiltersJson: { nerisStatus: 'Queued' } },
  { code: 'ASSET-MAINT', name: 'Maintenance Backlog Report', category: 'Assets', sourceModules: ['Assets', 'Maintenance'], defaultColumnsJson: ['unitNumber', 'maintenanceType', 'status', 'priority'], defaultFiltersJson: { status: 'Scheduled' } },
  { code: 'PREV-HYDRANT', name: 'Hydrant Inspection Issues', category: 'Prevention', sourceModules: ['Prevention'], defaultColumnsJson: ['hydrantNumber', 'status', 'nextInspectionDue'], defaultFiltersJson: { status: 'Needs Inspection' } },
  { code: 'KPI-DASH', name: 'District KPI Snapshot', category: 'Cross-module readiness', sourceModules: ['Stations', 'Personnel', 'Training', 'Assets', 'Prevention', 'RMS'], defaultColumnsJson: ['kpi', 'value', 'target'], defaultFiltersJson: { } },
];

const reportDefinitions = reportDefinitionTemplates.map((template, index) => ({
  id: `report-def-${index + 1}`,
  tenantId,
  code: template.code,
  name: template.name,
  category: template.category,
  description: `${template.name} built from ${template.sourceModules.join(', ')}.`,
  sourceModules: template.sourceModules,
  availableFieldsJson: template.defaultColumnsJson,
  defaultFiltersJson: template.defaultFiltersJson,
  defaultColumnsJson: template.defaultColumnsJson,
  supportsExport: true,
  supportsSchedule: true,
  isSystemReport: true,
  module: template.category,
  definition: {
    code: template.code,
    category: template.category,
    sourceModules: template.sourceModules,
    columns: template.defaultColumnsJson,
    filters: template.defaultFiltersJson,
  },
  createdBy: 'user-admin',
  updatedBy: 'user-admin',
  createdAt: historicalIso(90 + index),
  updatedAt: historicalIso(1),
  isDeleted: false,
}));

const savedReportTemplates = [
  'Daily Station Readiness Summary',
  'Weekly Incident Volume by Station',
  'EMS Call Percentage Trend',
  'Expiring Certifications by Role',
  'Training Compliance by Station',
  'Overtime Risk by Shift',
  'Apparatus Out of Service Report',
  'Low Stock Critical Inventory',
  'Overdue Inspections by Occupancy Risk',
  'Permit Backlog Report',
  'Open Critical Violations',
  'Preplans Due for Review',
  'Data Quality Exceptions',
  'Integration Sync Failures',
  'District KPI Snapshot',
];

const savedReports = savedReportTemplates.map((name, index) => {
  const definition = reportDefinitions[index % reportDefinitions.length];
  return {
    id: `saved-report-${index + 1}`,
    tenantId,
    name,
    description: `${name} is a shared analytics report for agency leadership.`,
    reportType: definition.category,
    category: definition.category,
    ownerUserId: index % 3 === 0 ? 'user-admin' : index % 3 === 1 ? 'user-chief' : 'user-training',
    visibility: index % 4 === 0 ? 'District' : 'Leadership',
    filtersJson: definition.defaultFiltersJson,
    columnsJson: definition.defaultColumnsJson,
    sortJson: { field: definition.defaultColumnsJson[0], direction: 'desc' },
    chartConfigJson: { type: index % 2 === 0 ? 'bar' : 'line', xField: definition.defaultColumnsJson[0], yField: definition.defaultColumnsJson[1] ?? 'count' },
    scheduleEnabled: index % 2 === 0,
    scheduleFrequency: index % 3 === 0 ? 'Daily' : index % 3 === 1 ? 'Weekly' : 'Monthly',
    lastRunAt: historicalIso(1 + (index % 7)),
    createdAt: historicalIso(60 + index),
    updatedAt: historicalIso(1),
    isDeleted: false,
    reportDefinitionId: definition.id,
  };
});

const dashboardWidgets = Array.from({ length: 20 }, (_, index) => {
  const widgetCodes = ['agency-readiness', 'incident-trend', 'station-compare', 'training-compliance', 'asset-readiness', 'prevention-risk', 'data-quality', 'duplicate-review', 'export-queue', 'integration-health'];
  const widgetTypes = ['metric', 'chart', 'table', 'risk', 'trend'];
  const sourceModules = ['Stations', 'Personnel', 'Training', 'Assets', 'Prevention', 'Incidents', 'Integrations'];
  return {
    id: `widget-${index + 1}`,
    tenantId,
    dashboardCode: index < 10 ? 'analytics-command-center' : 'executive-summary',
    widgetCode: `${widgetCodes[index % widgetCodes.length]}-${index + 1}`,
    title: `${widgetCodes[index % widgetCodes.length].replace(/-/g, ' ')} ${index + 1}`,
    widgetType: widgetTypes[index % widgetTypes.length],
    sourceModule: sourceModules[index % sourceModules.length],
    configJson: { metric: widgetCodes[index % widgetCodes.length], period: index % 3 === 0 ? '7d' : '30d' },
    positionJson: { x: index % 4, y: Math.floor(index / 4), w: 1, h: 1 },
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  };
});

const reportExports = Array.from({ length: 25 }, (_, index) => {
  const savedReport = savedReports[index % savedReports.length];
  return {
    id: `report-export-${index + 1}`,
    tenantId,
    savedReportId: savedReport.id,
    reportDefinitionId: reportDefinitions[index % reportDefinitions.length].id,
    requestedByUserId: index % 2 === 0 ? 'user-admin' : 'user-chief',
    exportFormat: index % 3 === 0 ? 'CSV' : index % 3 === 1 ? 'JSON' : 'PDF',
    status: index % 4 === 0 ? 'Queued' : index % 4 === 1 ? 'Processing' : index % 4 === 2 ? 'Completed' : 'Failed',
    fileUrl: index % 4 === 2 ? `https://files.example/export-${index + 1}.csv` : null,
    rowCount: 120 + index * 7,
    requestedAt: historicalIso(5 + index),
    completedAt: index % 4 === 2 ? historicalIso(4 + index) : null,
    errorMessage: index % 4 === 3 ? 'Export placeholder failed validation' : null,
    createdAt: historicalIso(5 + index),
  };
});

const reportScheduleStatuses = ['Active', 'Active', 'Paused', 'Active', 'Error', 'Active', 'Paused', 'Active'];
const reportScheduleDelivery = ['Email', 'Email', 'Secure Portal', 'Email', 'SFTP', 'Email', 'Secure Portal', 'Email'];
const reportSchedules = Array.from({ length: 8 }, (_, index) => {
  const savedReport = savedReports[index % savedReports.length];
  const frequency = index % 2 === 0 ? 'Daily' : index % 3 === 0 ? 'Weekly' : 'Monthly';
  const nextDays = frequency === 'Daily' ? 1 : frequency === 'Weekly' ? 7 : 30;
  return {
    id: `report-schedule-${index + 1}`,
    tenantId,
    savedReportId: savedReport.id,
    reportDefinitionId: savedReport.reportDefinitionId,
    frequency,
    deliveryMethod: reportScheduleDelivery[index],
    recipientsJson: index % 2 === 0 ? ['user-admin', 'user-chief'] : ['user-training', 'user-prevention'],
    nextRunAt: iso(Math.max(0.25, nextDays - (index % 3))),
    lastRunAt: historicalIso(1 + (index % 5)),
    status: reportScheduleStatuses[index],
    createdAt: historicalIso(20 + index),
    updatedAt: historicalIso(1),
  };
});

const analyticsKpiDefinitions = Array.from({ length: 25 }, (_, index) => {
  const codes = [
    'agency-readiness', 'station-readiness', 'incident-volume', 'ems-percentage', 'staffing-coverage',
    'overtime-risk', 'training-compliance', 'cert-risk', 'apparatus-readiness', 'maintenance-backlog',
    'inventory-shortage', 'inspection-backlog', 'permit-backlog', 'violation-severity', 'preplan-completeness',
    'integration-health', 'data-quality', 'duplicate-rate', 'rms-qa', 'neris-readiness',
    'epcr-link-rate', 'asset-availability', 'prevention-risk', 'readiness-forecast', 'response-workload',
  ];
  return {
    id: `kpi-${index + 1}`,
    tenantId,
    kpiCode: codes[index],
    name: codes[index].replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    module: index < 5 ? 'Stations' : index < 10 ? 'Assets' : index < 15 ? 'Prevention' : index < 20 ? 'Training' : 'Analytics',
    description: `KPI for ${codes[index].replace(/-/g, ' ')}`,
    calculationMethod: 'Derived from shared operational data',
    targetValue: index % 2 === 0 ? 85 : 90,
    warningThreshold: index % 2 === 0 ? 75 : 80,
    criticalThreshold: index % 2 === 0 ? 60 : 70,
    unitLabel: '%',
    isActive: true,
    createdAt: historicalIso(180),
    updatedAt: historicalIso(1),
  };
});

const dataQualityChecks = Array.from({ length: 20 }, (_, index) => {
  const titles = [
    'Missing incident station',
    'Missing incident personnel',
    'NERIS required fields missing',
    'Personnel without station',
    'Expired certifications',
    'Training assignments overdue',
    'Apparatus without station',
    'Asset without location',
    'Inventory below reorder point',
    'Property without response station',
    'Inspection overdue',
    'Permit review overdue',
    'Preplan incomplete',
    'Integration sync failed',
    'Duplicate personnel candidates',
    'Duplicate property candidates',
    'Apparatus readiness issues',
    'Hydrant inspection issues',
    'Incident QA closeout risk',
    'Analytics snapshot lag',
  ];
  const counts = [
    incidents.filter((incident) => !incident.stationId).length,
    incidents.filter((incident) => !incident.assignedTo).length,
    incidents.filter((incident) => incident.nerisStatus === 'Rejected' || incident.epcrStatus === 'Failed').length,
    personnel.filter((member) => !member.currentStationId && !member.stationId).length,
    personnelCertifications.filter((cert) => ['Expired', 'Expiring Soon'].includes(String((cert as any).status ?? ''))).length,
    personnel.filter((member) => Number(member.readinessScore ?? 0) < 75).length,
    apparatus.filter((unit) => !unit.stationId).length,
    assets.filter((asset) => !asset.stationId && !asset.apparatusId && !asset.assignedPersonnelId).length,
    inventoryItems.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
    properties.filter((property) => !property.responseStationId).length,
    inspections.filter((inspection) => ['Scheduled', 'In Progress', 'Reinspection Required'].includes(String(inspection.status ?? ''))).length,
    permits.filter((permit) => ['Submitted', 'Under Review', 'Additional Info Required', 'Expired'].includes(String(permit.status ?? ''))).length,
    preplans.filter((preplan) => ['Draft', 'Incomplete', 'Review Due'].includes(String(preplan.status ?? ''))).length,
    integrationSystems.filter((integration) => ['Degraded', 'Failed', 'Offline'].includes(String(integration.status ?? ''))).length,
    Math.ceil(personnel.length / 12),
    Math.ceil(properties.length / 15),
    apparatus.filter((unit) => ['Warning', 'Out of Service', 'Maintenance Due'].includes(String(unit.status ?? ''))).length,
    hydrants.filter((hydrant) => ['Needs Inspection', 'Out of Service'].includes(String(hydrant.status ?? ''))).length,
    incidents.filter((incident) => incident.qaStatus === 'QA Needed' || incident.narrativeComplete === false).length,
    20,
  ];
  return {
    id: `check-${index + 1}`,
    tenantId,
    checkCode: `check-${index + 1}`,
    module: index < 3 ? 'RMS' : index < 6 ? 'Training' : index < 10 ? 'Assets' : index < 14 ? 'Prevention' : 'Analytics',
    entityName: index < 3 ? 'Incident' : index < 6 ? 'Personnel' : index < 10 ? 'Asset' : index < 14 ? 'Property' : 'AnalyticsSnapshot',
    title: titles[index],
    description: `${titles[index]} detected across shared operational data.`,
    severity: index % 4 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : index % 2 === 0 ? 'Normal' : 'Low',
    status: 'Active',
    affectedRecordCount: counts[index],
    lastRunAt: historicalIso(1),
    resultsJson: { count: counts[index], checkedAt: historicalIso(1) },
    createdAt: historicalIso(120),
    updatedAt: historicalIso(1),
  };
});

const dataQualityIssues = Array.from({ length: 80 }, (_, index) => {
  const issueTypes = ['Missing field', 'Overdue record', 'Duplicate candidate', 'Sync failure', 'Invalid status', 'Incomplete packet'];
  const sources = [
    { module: 'RMS', entityName: 'Incident', records: incidents },
    { module: 'Training', entityName: 'PersonnelCertification', records: personnelCertifications },
    { module: 'Assets', entityName: 'InventoryItem', records: inventoryItems },
    { module: 'Prevention', entityName: 'Inspection', records: inspections },
    { module: 'Integrations', entityName: 'IntegrationSystem', records: integrationSystems },
  ];
  const source = sources[index % sources.length];
  const record = source.records[index % source.records.length];
  return {
    id: `issue-${index + 1}`,
    tenantId,
    checkId: dataQualityChecks[index % dataQualityChecks.length].id,
    module: source.module,
    entityName: source.entityName,
    entityId: record.id,
    issueType: issueTypes[index % issueTypes.length],
    severity: index % 5 === 0 ? 'Critical' : index % 3 === 0 ? 'High' : 'Normal',
    title: `${issueTypes[index % issueTypes.length]} on ${source.entityName.toLowerCase()}`,
    description: `Analytics sweep detected an ${issueTypes[index % issueTypes.length].toLowerCase()} for ${source.entityName}.`,
    recommendedFix: 'Review the shared master record and resolve the workflow issue.',
    status: index % 4 === 0 ? 'Resolved' : 'Open',
    detectedAt: historicalIso(1),
    resolvedAt: index % 4 === 0 ? historicalIso(0.4) : null,
    resolvedByUserId: index % 4 === 0 ? 'user-admin' : null,
  };
});

const duplicateRecordCandidates = Array.from({ length: 25 }, (_, index) => {
  const moduleNames = ['Personnel', 'Prevention', 'Assets', 'RMS'];
  const primarySets = [personnel, properties, assets, incidents];
  const primarySet = primarySets[index % primarySets.length];
  const duplicateSet = primarySets[(index + 1) % primarySets.length];
  const primary = primarySet[index % primarySet.length];
  const duplicate = duplicateSet[(index + 2) % duplicateSet.length];
  return {
    id: `dup-${index + 1}`,
    tenantId,
    module: moduleNames[index % moduleNames.length],
    entityName: moduleNames[index % moduleNames.length] === 'RMS' ? 'Incident' : moduleNames[index % moduleNames.length] === 'Assets' ? 'Asset' : moduleNames[index % moduleNames.length] === 'Prevention' ? 'Property' : 'Personnel',
    primaryEntityId: primary.id,
    duplicateEntityId: duplicate.id,
    matchScore: 74 + (index % 18),
    matchReason: 'High similarity in key identity fields and shared context',
    status: index % 3 === 0 ? 'Open' : index % 3 === 1 ? 'Reviewed' : 'Dismissed',
    reviewedByUserId: index % 3 === 0 ? null : 'user-admin',
    reviewedAt: index % 3 === 0 ? null : historicalIso(1),
    createdAt: historicalIso(1),
  };
});

const analyticsSnapshots = [
  ...stations.flatMap((station, index) =>
    ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'].map((module, moduleIndex) => {
      const baseScore = 62 + ((index * 6 + moduleIndex * 7) % 34);
      return {
        id: `analytics-station-${station.id}-${module.toLowerCase()}`,
        tenantId,
        snapshotDate: historicalIso((index + moduleIndex) % 30),
        snapshotType: 'Station',
        stationId: station.id,
        personnelId: null,
        module,
        metricsJson: {
          readinessScore: baseScore,
          incidentCount: incidents.filter((incident) => incident.stationId === station.id).length,
          staffingCoverage: Math.max(60, 100 - Number(station.staffingGap ?? 0) * 10),
          maintenanceBacklog: maintenanceEvents.filter((event) => apparatus.some((unit) => unit.id === event.apparatusId && unit.stationId === station.id)).length,
          inventoryRisk: inventoryItems.filter((item) => item.stationId === station.id && Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
        },
        riskLevel: baseScore >= 90 ? 'Ready' : baseScore >= 75 ? 'Watch' : baseScore >= 60 ? 'At Risk' : 'Critical',
        createdAt: historicalIso(1),
      };
    })
  ),
  ...personnel.slice(0, 20).map((member, index) => ({
    id: `analytics-personnel-${member.id}`,
    tenantId,
    snapshotDate: historicalIso(index + 1),
    snapshotType: 'Personnel',
    stationId: member.currentStationId,
    personnelId: member.id,
    module: 'Personnel',
    metricsJson: {
      overallReadinessScore: member.readinessScore,
      trainingScore: 76 + (index % 10),
      certificationScore: member.expiringCerts > 0 ? 68 + (index % 8) : 88 + (index % 6),
    },
    riskLevel: member.readinessScore >= 90 ? 'Ready' : member.readinessScore >= 75 ? 'Watch' : member.readinessScore >= 60 ? 'At Risk' : 'Critical',
    createdAt: historicalIso(1),
  })),
].slice(0, 200);

while (analyticsSnapshots.length < 200) {
  const index = analyticsSnapshots.length;
  const station = stations[index % stations.length];
  const person = personnel[index % personnel.length];
  const module = ['Incidents', 'Training', 'Staffing', 'Personnel', 'Assets', 'Prevention', 'Integrations'][index % 7];
  const score = 60 + (index % 35);
  analyticsSnapshots.push({
    id: `analytics-extra-${index + 1}`,
    tenantId,
    snapshotDate: historicalIso((index % 30) + 1),
    snapshotType: index % 2 === 0 ? 'Station' : 'Personnel',
    stationId: index % 2 === 0 ? station.id : person.currentStationId,
    personnelId: index % 2 === 0 ? null : person.id,
    module,
    metricsJson: {
      readinessScore: score,
      overallReadinessScore: score,
      incidentCount: incidents.filter((incident) => incident.stationId === station.id).length,
      staffingCoverage: Math.max(60, 100 - Number(station.staffingGap ?? 0) * 10),
      maintenanceBacklog: maintenanceEvents.filter((event) => apparatus.some((unit) => unit.id === event.apparatusId && unit.stationId === station.id)).length,
      inventoryRisk: inventoryItems.filter((item) => item.stationId === station.id && Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length,
    },
    riskLevel: score >= 90 ? 'Ready' : score >= 75 ? 'Watch' : score >= 60 ? 'At Risk' : 'Critical',
    createdAt: historicalIso(1),
  });
}

const personnelPerformanceReviews = [
  { id: 'review-1', tenantId, personnelId: 'person-1', reviewPeriod: '2026-Q2', rating: 5, notes: 'Excellent QA accuracy and strong coaching presence for ePCR completion.', reviewerName: 'Chris Alvarez', createdAt: historicalIso(30) },
  { id: 'review-2', tenantId, personnelId: 'person-2', reviewPeriod: '2026-Q2', rating: 4, notes: 'Strong engineer performance; needs periodic apparatus refresher support.', reviewerName: 'Maya Chen', createdAt: historicalIso(30) },
  { id: 'review-3', tenantId, personnelId: 'person-4', reviewPeriod: '2026-Q2', rating: 3, notes: 'Leadership is solid but QA closeout timing needs improvement.', reviewerName: 'Chris Alvarez', createdAt: historicalIso(30) },
  { id: 'review-4', tenantId, personnelId: 'person-5', reviewPeriod: '2026-Q2', rating: 4, notes: 'Reliable HazMat resource with good instructor potential.', reviewerName: 'Maya Chen', createdAt: historicalIso(30) },
  { id: 'review-5', tenantId, personnelId: 'person-8', reviewPeriod: '2026-Q2', rating: 2, notes: 'Repeated report completion corrections and missed checklist items.', reviewerName: 'Jordan Fields', createdAt: historicalIso(30) },
  { id: 'review-6', tenantId, personnelId: 'person-9', reviewPeriod: '2026-Q2', rating: 4, notes: 'Strong officer development trajectory and good station leadership.', reviewerName: 'Chris Alvarez', createdAt: historicalIso(30) },
  { id: 'review-7', tenantId, personnelId: 'person-12', reviewPeriod: '2026-Q2', rating: 3, notes: 'Training attendance is inconsistent during high call-volume periods.', reviewerName: 'Maya Chen', createdAt: historicalIso(30) },
  { id: 'review-8', tenantId, personnelId: 'person-17', reviewPeriod: '2026-Q2', rating: 5, notes: 'Excellent WUI readiness and practical field instruction skill.', reviewerName: 'Jordan Fields', createdAt: historicalIso(30) },
  { id: 'review-9', tenantId, personnelId: 'person-49', reviewPeriod: '2026-Q2', rating: 4, notes: 'Prevention work is strong, but inspection backlog support is needed.', reviewerName: 'Jordan Fields', createdAt: historicalIso(30) },
  { id: 'review-10', tenantId, personnelId: 'person-57', reviewPeriod: '2026-Q2', rating: 3, notes: 'Needs additional prevention documentation workflow training.', reviewerName: 'Jordan Fields', createdAt: historicalIso(30) },
].map((review) => ({ ...review, updatedAt: review.createdAt }));

const personnelGoals = [
  { id: 'goal-1', tenantId, personnelId: 'person-1', title: 'Maintain ePCR QA accuracy above 95%', description: 'Keep documentation quality strong and coach newer members.', category: 'Performance', targetDate: iso(90), status: 'Open', progressPercent: 72, createdBy: 'user-chief', createdAt: historicalIso(20), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'goal-2', tenantId, personnelId: 'person-2', title: 'Complete Driver Operator refresh', description: 'Close the apparatus readiness gap before summer deployment.', category: 'Training', targetDate: iso(30), status: 'Open', progressPercent: 45, createdBy: 'user-training', createdAt: historicalIso(18), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'goal-3', tenantId, personnelId: 'person-9', title: 'Lead station coaching on report completion', description: 'Support crew improvement on closing reports on time.', category: 'Leadership', targetDate: iso(60), status: 'Open', progressPercent: 60, createdBy: 'user-chief', createdAt: historicalIso(16), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'goal-4', tenantId, personnelId: 'person-17', title: 'Support WUI drill mentor role', description: 'Formalize advanced field instruction and seasonal readiness.', category: 'Development', targetDate: iso(120), status: 'In Progress', progressPercent: 80, createdBy: 'user-training', createdAt: historicalIso(25), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'goal-5', tenantId, personnelId: 'person-49', title: 'Reduce inspection backlog by 20%', description: 'Clear commercial inspections and improve prevention coverage.', category: 'Prevention', targetDate: iso(45), status: 'Open', progressPercent: 52, createdBy: 'user-prevention', createdAt: historicalIso(12), updatedAt: historicalIso(1), isDeleted: false },
  { id: 'goal-6', tenantId, personnelId: 'person-57', title: 'Improve prevention documentation quality', description: 'Decrease error rate and closeout delays on inspection packets.', category: 'Performance', targetDate: iso(75), status: 'Open', progressPercent: 38, createdBy: 'user-prevention', createdAt: historicalIso(14), updatedAt: historicalIso(1), isDeleted: false },
];

const personnelNotes = [
  { id: 'note-p1', tenantId, personnelId: 'person-1', noteType: 'Commendation', visibility: 'Supervisor', title: 'Excellent QA mentor', body: 'Frequently coaches peers on ePCR completion and documentation accuracy.', createdBy: 'user-chief', createdAt: historicalIso(14) },
  { id: 'note-p2', tenantId, personnelId: 'person-2', noteType: 'Development', visibility: 'Supervisor', title: 'Needs refresher', body: 'Schedule driver refresher before next apparatus rotation.', createdBy: 'user-chief', createdAt: historicalIso(12) },
  { id: 'note-p3', tenantId, personnelId: 'person-8', noteType: 'Corrective', visibility: 'Supervisor', title: 'Report quality issue', body: 'Repeat corrections on incident closure and narrative fields.', createdBy: 'user-training', createdAt: historicalIso(10) },
  { id: 'note-p4', tenantId, personnelId: 'person-17', noteType: 'Commendation', visibility: 'District', title: 'Field instruction leader', body: 'Strong WUI instructor candidate with excellent field credibility.', createdBy: 'user-training', createdAt: historicalIso(9) },
  { id: 'note-p5', tenantId, personnelId: 'person-49', noteType: 'Development', visibility: 'Supervisor', title: 'Inspection backlog support', body: 'Needs additional time support to reduce prevention backlog.', createdBy: 'user-prevention', createdAt: historicalIso(8) },
  { id: 'note-p6', tenantId, personnelId: 'person-57', noteType: 'Corrective', visibility: 'Supervisor', title: 'Documentation workflow coaching', body: 'Needs focused guidance on inspection packet completion.', createdBy: 'user-prevention', createdAt: historicalIso(7) },
];

const personnelReadinessSnapshots = personnel.slice(0, 20).map((member, index) => ({
  id: `snapshot-${index + 1}`,
  tenantId,
  personnelId: member.id,
  snapshotDate: historicalIso(index + 1),
  trainingScore: 78 + (index % 8),
  certificationScore: member.expiringCerts > 0 ? 70 + (index % 6) : 88 + (index % 8),
  staffingReliabilityScore: member.status === 'Leave' ? 62 : 84 + (index % 7),
  incidentDocumentationScore: 74 + (index % 10),
  performanceScore: 76 + (index % 9),
  overtimeRiskScore: 82 - (index % 8),
  overallReadinessScore: member.readinessScore,
  riskLevel: member.readinessScore >= 90 ? 'Ready' : member.readinessScore >= 75 ? 'Watch' : member.readinessScore >= 60 ? 'At Risk' : 'Critical',
  evidenceSummary: `Readiness snapshot based on training, certifications, staffing, incident documentation, and performance signals for ${member.name}.`,
  createdAt: historicalIso(index + 1),
  updatedAt: historicalIso(1),
}));

const overtimeRecords = personnel.filter((member, index) => index % 9 === 0).map((member, index) => ({
  id: `overtime-${index + 1}`,
  tenantId,
  personnelId: member.id,
  hours: String(6 + (index % 12)),
  reason: index % 2 === 0 ? 'Backfill coverage' : 'Training coverage',
  date: historicalIso(index + 2),
  createdAt: historicalIso(index + 2),
  updatedAt: historicalIso(1),
}));

const availabilityRecords = personnel.filter((member, index) => index % 11 === 0).map((member, index) => ({
  id: `availability-${index + 1}`,
  tenantId,
  personnelId: member.id,
  date: iso(index + 1),
  status: index % 3 === 0 ? 'Unavailable' : 'Available',
  notes: index % 3 === 0 ? 'Scheduled leave' : 'Available for relief assignment',
}));

const courseCategories = [
  { id: 'category-ems', tenantId, name: 'EMS', description: 'Patient care, documentation, and transport readiness', createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'category-fire', tenantId, name: 'Fire Operations', description: 'Suppression and incident response skills', createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'category-command', tenantId, name: 'Command', description: 'Officer and leadership development', createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'category-prevention', tenantId, name: 'Prevention', description: 'Inspection and risk reduction skills', createdAt: historicalIso(200), updatedAt: historicalIso(1) },
  { id: 'category-logistics', tenantId, name: 'Logistics', description: 'Apparatus and equipment readiness', createdAt: historicalIso(200), updatedAt: historicalIso(1) },
];

const courses = [
  {
    id: 'course-ems-doc',
    tenantId,
    title: 'EMS Documentation Accuracy Refresher',
    code: 'RMS-EMS-DOC',
    category: 'EMS',
    description: 'Reduce missing patient care fields and improve RMS/ePCR consistency.',
    deliveryType: 'Blended',
    durationHours: 2,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain', 'Battalion Chief'],
    requiredForRoles: ['Firefighter', 'Company Officer', 'Battalion Chief'],
    requiredCertifications: ['EMT', 'CPR/BLS'],
    relatedIncidentTypes: ['EMS - Cardiac', 'EMS - Fall Injury', 'Vehicle Accident'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: ['High-risk occupancies'],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-driver',
    tenantId,
    title: 'Driver Operator Refresher',
    code: 'OPS-DRV-REF',
    category: 'Fire Operations',
    description: 'Review apparatus operation, road safety, and maintenance awareness.',
    deliveryType: 'Practical',
    durationHours: 3,
    requiredForRanks: ['Engineer', 'Captain'],
    requiredForRoles: ['Company Officer', 'Battalion Chief'],
    requiredCertifications: ['Driver Operator'],
    relatedIncidentTypes: ['Vehicle Accident', 'Structure Alarm'],
    relatedAssets: ['Engine 4', 'Engine 9', 'Medic 4'],
    relatedPreventionAreas: ['Commercial corridor'],
    complianceCriticality: 'High',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-hazmat',
    tenantId,
    title: 'HazMat Operations Renewal',
    code: 'OPS-HM-REN',
    category: 'Fire Operations',
    description: 'Maintain hazardous materials operations readiness.',
    deliveryType: 'Classroom',
    durationHours: 2.5,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant'],
    requiredForRoles: ['Company Officer', 'Battalion Chief'],
    requiredCertifications: ['HazMat Operations'],
    relatedIncidentTypes: ['HazMat', 'Fuel Spill'],
    relatedAssets: ['Engine 4', 'Brush 17'],
    relatedPreventionAreas: ['Industrial'],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-officer',
    tenantId,
    title: 'Officer I Leadership',
    code: 'CMD-OFFICER-1',
    category: 'Command',
    description: 'Incident command, QA expectations, and crew leadership.',
    deliveryType: 'Hybrid',
    durationHours: 4,
    requiredForRanks: ['Lieutenant', 'Captain', 'Battalion Chief'],
    requiredForRoles: ['Company Officer', 'Battalion Chief'],
    requiredCertifications: ['Officer I'],
    relatedIncidentTypes: ['Structure Fire', 'Vehicle Accident', 'EMS - Cardiac'],
    relatedAssets: ['Engine 4', 'Engine 9'],
    relatedPreventionAreas: ['Commercial corridor'],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-neris',
    tenantId,
    title: 'NERIS / RMS Report Completion',
    code: 'RMS-NERIS-100',
    category: 'EMS',
    description: 'Improve incident report completeness and export readiness.',
    deliveryType: 'Classroom',
    durationHours: 1.5,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain'],
    requiredForRoles: ['Firefighter', 'Company Officer', 'Battalion Chief'],
    requiredCertifications: ['EMT'],
    relatedIncidentTypes: ['EMS - Cardiac', 'EMS - Fall Injury', 'Structure Alarm'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: ['Commercial corridor', 'High-risk occupancy'],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-ff1',
    tenantId,
    title: 'Firefighter I Refresher',
    code: 'FIRE-FF1-REF',
    category: 'Fire Operations',
    description: 'Review core firefighter skills, hose deployment, and response fundamentals.',
    deliveryType: 'Practical',
    durationHours: 2.5,
    requiredForRanks: ['Firefighter'],
    requiredForRoles: ['Firefighter'],
    requiredCertifications: ['Firefighter I'],
    relatedIncidentTypes: ['Structure Fire', 'Vehicle Accident', 'Wildland Interface Check'],
    relatedAssets: ['Engine 4', 'Engine 9'],
    relatedPreventionAreas: ['Commercial corridor'],
    complianceCriticality: 'High',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-ff2',
    tenantId,
    title: 'Firefighter II Refresher',
    code: 'FIRE-FF2-REF',
    category: 'Fire Operations',
    description: 'Advanced fireground tactics, command support, and scene safety review.',
    deliveryType: 'Practical',
    durationHours: 3,
    requiredForRanks: ['Engineer', 'Lieutenant'],
    requiredForRoles: ['Company Officer'],
    requiredCertifications: ['Firefighter II'],
    relatedIncidentTypes: ['Structure Fire', 'HazMat', 'Vehicle Accident'],
    relatedAssets: ['Engine 4', 'Brush 17'],
    relatedPreventionAreas: ['Industrial', 'WUI Zone'],
    complianceCriticality: 'High',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-paramedic',
    tenantId,
    title: 'Paramedic Renewal',
    code: 'EMS-PARAMEDIC-REN',
    category: 'EMS',
    description: 'Maintain advanced EMS credential readiness and patient care standards.',
    deliveryType: 'Classroom',
    durationHours: 4,
    requiredForRanks: ['Lieutenant', 'Captain'],
    requiredForRoles: ['Company Officer'],
    requiredCertifications: ['Paramedic'],
    relatedIncidentTypes: ['EMS - Cardiac', 'EMS - Fall Injury', 'Vehicle Accident'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: [],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-neris-basics',
    tenantId,
    title: 'NERIS Report Completion Basics',
    code: 'RMS-NERIS-BASIC',
    category: 'EMS',
    description: 'Foundational NERIS and ePCR data quality expectations for all report writers.',
    deliveryType: 'Online',
    durationHours: 1,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain'],
    requiredForRoles: ['Firefighter', 'Company Officer', 'Battalion Chief'],
    requiredCertifications: ['EMT'],
    relatedIncidentTypes: ['EMS - Cardiac', 'EMS - Fall Injury', 'Structure Alarm'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: [],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-wui',
    tenantId,
    title: 'Wildland Interface Readiness',
    code: 'OPS-WUI-01',
    category: 'Fire Operations',
    description: 'Wildland deployment, interface tactics, and apparatus prep.',
    deliveryType: 'Practical',
    durationHours: 3,
    requiredForRanks: ['Firefighter', 'Engineer'],
    requiredForRoles: ['Firefighter', 'Company Officer'],
    requiredCertifications: ['Wildland Firefighter'],
    relatedIncidentTypes: ['Wildland Interface Check'],
    relatedAssets: ['Brush 17'],
    relatedPreventionAreas: ['WUI Zone', 'WUI Foothills'],
    complianceCriticality: 'High',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-prevention',
    tenantId,
    title: 'Commercial Occupancy Inspection Safety',
    code: 'PREV-COMM-01',
    category: 'Prevention',
    description: 'Inspection safety, documentation, and high-risk occupancy follow-up.',
    deliveryType: 'Classroom',
    durationHours: 2,
    requiredForRanks: ['Prevention Officer', 'Captain', 'Battalion Chief'],
    requiredForRoles: ['Prevention Officer', 'Battalion Chief'],
    requiredCertifications: ['Inspector I'],
    relatedIncidentTypes: ['Inspection', 'Permit Review'],
    relatedAssets: [],
    relatedPreventionAreas: ['Commercial corridor', 'Industrial'],
    complianceCriticality: 'High',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-acls',
    tenantId,
    title: 'ACLS Renewal',
    code: 'EMS-ACLS-01',
    category: 'EMS',
    description: 'Advanced cardiac life support renewal for EMS crews.',
    deliveryType: 'Classroom',
    durationHours: 4,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant'],
    requiredForRoles: ['Firefighter', 'Company Officer'],
    requiredCertifications: ['ACLS'],
    relatedIncidentTypes: ['EMS - Cardiac'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: [],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
  {
    id: 'course-cpr',
    tenantId,
    title: 'CPR/BLS Renewal',
    code: 'EMS-CPR-01',
    category: 'EMS',
    description: 'Foundational patient-care refresher for all response members.',
    deliveryType: 'Online',
    durationHours: 1,
    requiredForRanks: ['Firefighter', 'Engineer', 'Lieutenant', 'Captain'],
    requiredForRoles: ['Firefighter', 'Company Officer', 'Battalion Chief'],
    requiredCertifications: ['CPR/BLS'],
    relatedIncidentTypes: ['EMS - Cardiac', 'EMS - Fall Injury'],
    relatedAssets: ['Medic 4', 'Medic 2'],
    relatedPreventionAreas: [],
    complianceCriticality: 'Critical',
    isActive: true,
    createdAt: historicalIso(200),
    updatedAt: historicalIso(1),
  },
];

const courseSessions = [
  { id: 'session-1', tenantId, courseId: 'course-ems-doc', trainerPersonnelId: 'person-9', stationId: stations[3].id, startDateTime: iso(2), endDateTime: iso(2.08), capacity: 12, deliveryLocation: 'Station 4 classroom', status: 'Scheduled', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'session-2', tenantId, courseId: 'course-driver', trainerPersonnelId: 'person-5', stationId: stations[8].id, startDateTime: iso(4), endDateTime: iso(4.12), capacity: 10, deliveryLocation: 'Station 9 bay', status: 'Scheduled', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'session-3', tenantId, courseId: 'course-wui', trainerPersonnelId: 'person-17', stationId: stations[16].id, startDateTime: historicalIso(1), endDateTime: historicalIso(0.8), capacity: 8, deliveryLocation: 'Foothills drill ground', status: 'Completed', createdAt: historicalIso(3), updatedAt: historicalIso(1) },
  { id: 'session-4', tenantId, courseId: 'course-neris', trainerPersonnelId: 'person-1', stationId: stations[1].id, startDateTime: iso(1), endDateTime: iso(1.06), capacity: 14, deliveryLocation: 'Training center', status: 'Scheduled', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'session-5', tenantId, courseId: 'course-hazmat', trainerPersonnelId: 'person-12', stationId: stations[5].id, startDateTime: iso(6), endDateTime: iso(6.1), capacity: 10, deliveryLocation: 'Station 6 classroom', status: 'Scheduled', createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'session-6', tenantId, courseId: 'course-prevention', trainerPersonnelId: 'person-49', stationId: stations[0].id, startDateTime: historicalIso(2), endDateTime: historicalIso(1.8), capacity: 8, deliveryLocation: 'Prevention conference room', status: 'Cancelled', createdAt: historicalIso(4), updatedAt: historicalIso(1) },
];

const trainingNeedAssessments = [
  { id: 'need-1', tenantId, title: 'EMS Documentation QA Refresher', needType: 'QA', sourceType: 'Incident QA', sourceEntityId: 'incident-1', stationId: stations[3].id, requiredCourseId: 'course-ems-doc', severity: 'Critical', priority: '1', description: 'Repeated QA corrections on EMS reports require documentation retraining.', evidenceSummary: 'Incident QA corrections and incomplete narrative fields on Station 4 responses.', recommendedAction: 'Assign officers and paramedics to documentation refresher this week.', status: 'Open', readinessImpact: 8, affectedPersonnel: ['person-1', 'person-2', 'person-4'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-2', tenantId, title: 'Driver Operator Refresher', needType: 'Coverage', sourceType: 'Staffing', sourceEntityId: 'station-4', stationId: stations[3].id, requiredCourseId: 'course-driver', severity: 'High', priority: '1', description: 'Limited qualified apparatus operators at Station 4 and Station 9 reduce coverage.', evidenceSummary: 'Coverage gaps and maintenance-sensitive apparatus assignments.', recommendedAction: 'Train backfill operators before next rotation change.', status: 'Open', readinessImpact: 7, affectedPersonnel: ['person-2', 'person-10', 'person-18'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-3', tenantId, title: 'HazMat Operations Renewal', needType: 'Certification', sourceType: 'Certification', sourceEntityId: 'cert-hazmat', stationId: null, requiredCertificationId: 'cert-hazmat', severity: 'High', priority: '1', description: 'HazMat qualifications are nearing expiration across multiple stations.', evidenceSummary: 'Several personnel have expiring HazMat certifications within the next 45 days.', recommendedAction: 'Schedule renewal and verify skill maintenance.', status: 'Open', readinessImpact: 6, affectedPersonnel: ['person-5', 'person-13', 'person-21'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-4', tenantId, title: 'Wildland Interface Readiness', needType: 'Risk', sourceType: 'Prevention', sourceEntityId: 'property-18', stationId: stations[16].id, requiredCourseId: 'course-wui', severity: 'High', priority: '2', description: 'WUI deployment skill refresh needed for stations assigned to foothills risk areas.', evidenceSummary: 'WUI response area exposure and inspection backlog in foothills zone.', recommendedAction: 'Run WUI refresher before peak wind season.', status: 'Open', readinessImpact: 9, affectedPersonnel: ['person-17', 'person-18', 'person-19'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-5', tenantId, title: 'NERIS/RMS Report Completion', needType: 'Compliance', sourceType: 'Incident QA', sourceEntityId: 'incident-5', stationId: stations[7].id, requiredCourseId: 'course-neris', severity: 'Critical', priority: '1', description: 'Late and rejected export-ready reports require report-completion training.', evidenceSummary: 'NERIS rejection patterns and incomplete report packets.', recommendedAction: 'Require report completion training for officers and EMS crews.', status: 'Open', readinessImpact: 8, affectedPersonnel: ['person-8', 'person-9', 'person-10'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-6', tenantId, title: 'Officer I Leadership Renewal', needType: 'Role', sourceType: 'Performance', sourceEntityId: 'person-4', stationId: stations[3].id, requiredCourseId: 'course-officer', severity: 'High', priority: '2', description: 'Officer development needed to improve QA closeout and supervision.', evidenceSummary: 'Leadership notes and station coverage pressure on B shift.', recommendedAction: 'Enroll lieutenants and captains in officer leadership module.', status: 'Open', readinessImpact: 5, affectedPersonnel: ['person-4', 'person-12', 'person-20'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-7', tenantId, title: 'Commercial Occupancy Inspection Safety', needType: 'Prevention', sourceType: 'Prevention', sourceEntityId: 'property-1', stationId: stations[0].id, requiredCourseId: 'course-prevention', severity: 'Moderate', priority: '3', description: 'Inspection backlog and high-risk occupancy mix require prevention refresher.', evidenceSummary: 'Commercial corridor backlog and rising violation counts.', recommendedAction: 'Assign prevention safety refresher to inspection team.', status: 'Open', readinessImpact: 4, affectedPersonnel: ['person-49', 'person-57'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-8', tenantId, title: 'CPR/BLS Renewal Required', needType: 'Certification', sourceType: 'Certification', sourceEntityId: 'cert-cprbls', stationId: null, requiredCertificationId: 'cert-cprbls', severity: 'Critical', priority: '1', description: 'CPR/BLS renewals are within the next 30 days for multiple response members.', evidenceSummary: 'Expiration horizon shows numerous near-term CPR/BLS renewals.', recommendedAction: 'Schedule recurring renewal blocks across all platoons.', status: 'Open', readinessImpact: 7, affectedPersonnel: ['person-1', 'person-2', 'person-5', 'person-8'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-9', tenantId, title: 'ACLS Renewal', needType: 'Certification', sourceType: 'Certification', sourceEntityId: 'cert-acls', stationId: null, requiredCertificationId: 'cert-acls', severity: 'High', priority: '2', description: 'ACLS-ready staff need renewal to maintain advanced EMS coverage.', evidenceSummary: 'Advanced cardiac care coverage depends on timely renewal.', recommendedAction: 'Coordinate ACLS renewal with station coverage windows.', status: 'Open', readinessImpact: 6, affectedPersonnel: ['person-1', 'person-9', 'person-17'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'need-10', tenantId, title: 'Apparatus Safety & Maintenance Awareness', needType: 'Asset', sourceType: 'Assets', sourceEntityId: 'apparatus-1', stationId: stations[3].id, requiredCourseId: 'course-driver', severity: 'Moderate', priority: '3', description: 'Maintenance warning on Medic 4 indicates apparatus safety refresher need.', evidenceSummary: 'Brake inspection warnings and operator refresh needs align.', recommendedAction: 'Pair maintenance awareness with driver refresher.', status: 'Open', readinessImpact: 4, affectedPersonnel: ['person-2', 'person-10'], createdAt: historicalIso(1), updatedAt: historicalIso(1) },
];

const traineeRecommendations = [
  { id: 'trainee-1', tenantId, trainingNeedAssessmentId: 'need-1', courseId: 'course-ems-doc', personnelId: 'person-1', suitabilityScore: 96, gapReason: 'QA corrections and officer role', urgencyScore: 95, readinessImpactScore: 8, stationCoverageImpact: 'Low - can attend off-shift', createdAt: historicalIso(1) },
  { id: 'trainee-2', tenantId, trainingNeedAssessmentId: 'need-1', courseId: 'course-ems-doc', personnelId: 'person-4', suitabilityScore: 91, gapReason: 'Company officer with EMS documentation issues', urgencyScore: 90, readinessImpactScore: 7, stationCoverageImpact: 'Medium - coordinate with B shift', createdAt: historicalIso(1) },
  { id: 'trainee-3', tenantId, trainingNeedAssessmentId: 'need-2', courseId: 'course-driver', personnelId: 'person-2', suitabilityScore: 94, gapReason: 'Engineer and apparatus operator role', urgencyScore: 88, readinessImpactScore: 8, stationCoverageImpact: 'Low - rostered backup available', createdAt: historicalIso(1) },
  { id: 'trainee-4', tenantId, trainingNeedAssessmentId: 'need-2', courseId: 'course-driver', personnelId: 'person-10', suitabilityScore: 89, gapReason: 'Station 9 coverage pressure', urgencyScore: 85, readinessImpactScore: 7, stationCoverageImpact: 'Medium - schedule with relief', createdAt: historicalIso(1) },
  { id: 'trainee-5', tenantId, trainingNeedAssessmentId: 'need-3', courseId: 'course-hazmat', personnelId: 'person-5', suitabilityScore: 93, gapReason: 'HazMat renewal nearing expiry', urgencyScore: 90, readinessImpactScore: 6, stationCoverageImpact: 'Low - off-shift training', createdAt: historicalIso(1) },
  { id: 'trainee-6', tenantId, trainingNeedAssessmentId: 'need-4', courseId: 'course-wui', personnelId: 'person-17', suitabilityScore: 98, gapReason: 'Foothills station and WUI response area', urgencyScore: 92, readinessImpactScore: 9, stationCoverageImpact: 'Medium - deploy during low call volume', createdAt: historicalIso(1) },
  { id: 'trainee-7', tenantId, trainingNeedAssessmentId: 'need-5', courseId: 'course-neris', personnelId: 'person-8', suitabilityScore: 95, gapReason: 'Repeated report completion issues', urgencyScore: 97, readinessImpactScore: 8, stationCoverageImpact: 'Low - short duration session', createdAt: historicalIso(1) },
  { id: 'trainee-8', tenantId, trainingNeedAssessmentId: 'need-5', courseId: 'course-neris', personnelId: 'person-9', suitabilityScore: 89, gapReason: 'Officer oversight role', urgencyScore: 88, readinessImpactScore: 7, stationCoverageImpact: 'Medium - schedule by platoon', createdAt: historicalIso(1) },
  { id: 'trainee-9', tenantId, trainingNeedAssessmentId: 'need-6', courseId: 'course-officer', personnelId: 'person-12', suitabilityScore: 90, gapReason: 'Leadership development need', urgencyScore: 87, readinessImpactScore: 5, stationCoverageImpact: 'Medium - plan around duty cycle', createdAt: historicalIso(1) },
  { id: 'trainee-10', tenantId, trainingNeedAssessmentId: 'need-7', courseId: 'course-prevention', personnelId: 'person-49', suitabilityScore: 96, gapReason: 'Prevention officer assigned to commercial backlog', urgencyScore: 80, readinessImpactScore: 4, stationCoverageImpact: 'Low - office-based session preferred', createdAt: historicalIso(1) },
];

const trainerRecommendations = [
  { id: 'trainer-1', tenantId, trainingNeedAssessmentId: 'need-1', courseId: 'course-ems-doc', trainerPersonnelId: 'person-1', suitabilityScore: 96, reasonSummary: 'Captain with strong QA accuracy and EMS field credibility.', availabilityScore: 88, expertiseScore: 97, performanceScore: 94, workloadScore: 82, createdAt: historicalIso(1) },
  { id: 'trainer-2', tenantId, trainingNeedAssessmentId: 'need-2', courseId: 'course-driver', trainerPersonnelId: 'person-5', suitabilityScore: 92, reasonSummary: 'Engineer with apparatus operation experience and good training history.', availabilityScore: 84, expertiseScore: 95, performanceScore: 90, workloadScore: 85, createdAt: historicalIso(1) },
  { id: 'trainer-3', tenantId, trainingNeedAssessmentId: 'need-4', courseId: 'course-wui', trainerPersonnelId: 'person-17', suitabilityScore: 98, reasonSummary: 'Foothills veteran with WUI response experience and station familiarity.', availabilityScore: 80, expertiseScore: 98, performanceScore: 93, workloadScore: 86, createdAt: historicalIso(1) },
  { id: 'trainer-4', tenantId, trainingNeedAssessmentId: 'need-5', courseId: 'course-neris', trainerPersonnelId: 'person-1', suitabilityScore: 95, reasonSummary: 'Officer who can coach report quality and QA expectations.', availabilityScore: 87, expertiseScore: 96, performanceScore: 95, workloadScore: 83, createdAt: historicalIso(1) },
];

const trainingAssignments = [
  { id: 'ta-1', tenantId, courseId: 'course-ems-doc', sessionId: 'session-1', personnelId: 'person-1', assignedBy: 'user-training', assignmentReason: 'QA corrections', priority: 'High', dueDate: iso(7), status: 'Assigned', completedAt: null, score: null, createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'ta-2', tenantId, courseId: 'course-driver', sessionId: 'session-2', personnelId: 'person-2', assignedBy: 'user-training', assignmentReason: 'Coverage gap', priority: 'High', dueDate: iso(10), status: 'Assigned', completedAt: null, score: null, createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'ta-3', tenantId, courseId: 'course-wui', sessionId: 'session-3', personnelId: 'person-17', assignedBy: 'user-training', assignmentReason: 'WUI readiness', priority: 'Medium', dueDate: historicalIso(1), status: 'Completed', completedAt: historicalIso(1), score: 94, createdAt: historicalIso(3), updatedAt: historicalIso(1) },
  { id: 'ta-4', tenantId, courseId: 'course-neris', sessionId: 'session-4', personnelId: 'person-8', assignedBy: 'user-training', assignmentReason: 'NERIS readiness', priority: 'High', dueDate: iso(5), status: 'Assigned', completedAt: null, score: null, createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'ta-5', tenantId, courseId: 'course-hazmat', sessionId: 'session-5', personnelId: 'person-5', assignedBy: 'user-training', assignmentReason: 'Renewal', priority: 'High', dueDate: iso(14), status: 'Assigned', completedAt: null, score: null, createdAt: historicalIso(1), updatedAt: historicalIso(1) },
  { id: 'ta-6', tenantId, courseId: 'course-prevention', sessionId: 'session-6', personnelId: 'person-49', assignedBy: 'user-prevention', assignmentReason: 'Inspection backlog', priority: 'Medium', dueDate: null, status: 'Missed', completedAt: null, score: 62, createdAt: historicalIso(4), updatedAt: historicalIso(1) },
];

const trainingAttendance = [
  { id: 'att-1', tenantId, sessionId: 'session-3', personnelId: 'person-17', attendanceStatus: 'Completed', checkInTime: historicalIso(1), checkOutTime: historicalIso(0.9), participationScore: 94, instructorNotes: 'Strong participation and practical skill.', createdAt: historicalIso(3), updatedAt: historicalIso(1) },
  { id: 'att-2', tenantId, sessionId: 'session-3', personnelId: 'person-18', attendanceStatus: 'Attended', checkInTime: historicalIso(1), checkOutTime: historicalIso(0.9), participationScore: 88, instructorNotes: 'Good grasp of hose deployment.', createdAt: historicalIso(3), updatedAt: historicalIso(1) },
  { id: 'att-3', tenantId, sessionId: 'session-6', personnelId: 'person-49', attendanceStatus: 'Missed', checkInTime: null, checkOutTime: null, participationScore: 0, instructorNotes: 'Conflict with inspection fieldwork.', createdAt: historicalIso(4), updatedAt: historicalIso(1) },
  { id: 'att-4', tenantId, sessionId: 'session-1', personnelId: 'person-1', attendanceStatus: 'Assigned', checkInTime: null, checkOutTime: null, participationScore: null, instructorNotes: null, createdAt: historicalIso(1), updatedAt: historicalIso(1) },
];

const trainingOutcomes = [
  { id: 'outcome-1', tenantId, assignmentId: 'ta-3', personnelId: 'person-17', courseId: 'course-wui', preAssessmentScore: 76, postAssessmentScore: 94, passed: true, improvementScore: 18, instructorFeedback: 'Excellent situational awareness.', readinessImpact: 9, createdAt: historicalIso(1) },
  { id: 'outcome-2', tenantId, assignmentId: 'ta-6', personnelId: 'person-49', courseId: 'course-prevention', preAssessmentScore: 68, postAssessmentScore: 62, passed: false, improvementScore: -6, instructorFeedback: 'Needs repeat coaching on documentation.', readinessImpact: 4, createdAt: historicalIso(1) },
];

const extraCourseSessions = Array.from({ length: 18 }, (_, index) => {
  const course = courses[index % courses.length];
  const station = stations[index % stations.length];
  const trainer = personnel[(index * 3) % personnel.length];
  const offset = 8 + index;
  return {
    id: `session-extra-${index + 1}`,
    tenantId,
    courseId: course.id,
    trainerPersonnelId: trainer.id,
    stationId: station.id,
    startDateTime: iso(offset),
    endDateTime: iso(offset + 0.12),
    capacity: 8 + (index % 8),
    deliveryLocation: `${station.name} training room`,
    status: index % 5 === 0 ? 'Cancelled' : index % 4 === 0 ? 'Completed' : 'Scheduled',
    createdAt: historicalIso(2),
    updatedAt: historicalIso(1),
  };
});

const allCourseSessions = [...courseSessions, ...extraCourseSessions];

const extraTrainingAssignments = Array.from({ length: 96 }, (_, index) => {
  const personnelRecord = personnel[index % personnel.length];
  const course = courses[index % courses.length];
  const session = allCourseSessions[index % allCourseSessions.length];
  const statusCycle = ['Assigned', 'In Progress', 'Completed', 'Needs Remediation', 'Overdue'];
  const status = statusCycle[index % statusCycle.length];
  return {
    id: `ta-extra-${index + 1}`,
    tenantId,
    courseId: course.id,
    sessionId: session.id,
    personnelId: personnelRecord.id,
    assignedBy: index % 2 === 0 ? 'user-training' : 'user-chief',
    assignmentReason: course.title,
    priority: index % 5 === 0 ? 'High' : index % 3 === 0 ? 'Medium' : 'Low',
    dueDate: iso(3 + (index % 30)),
    status,
    completedAt: status === 'Completed' ? historicalIso(index % 12) : null,
    score: status === 'Completed' ? 86 + (index % 12) : null,
    createdAt: historicalIso(5),
    updatedAt: historicalIso(1),
  };
});

const allTrainingAssignments = [...trainingAssignments, ...extraTrainingAssignments];

const extraTrainingAttendance = allCourseSessions.slice(0, 20).flatMap((session, index) => {
  const roster = personnel.slice(index, index + 6);
  return roster.map((person, rosterIndex) => {
    const statuses = ['Attended', 'Completed', 'Excused', 'Missed', 'Needs Remediation'];
    const status = statuses[(index + rosterIndex) % statuses.length];
    return {
      id: `att-extra-${index + 1}-${rosterIndex + 1}`,
      tenantId,
      sessionId: session.id,
      personnelId: person.id,
      attendanceStatus: status,
      checkInTime: status === 'Missed' ? null : historicalIso(1),
      checkOutTime: status === 'Missed' ? null : historicalIso(0.95),
      participationScore: status === 'Completed' ? 92 - rosterIndex : status === 'Attended' ? 84 - rosterIndex : null,
      instructorNotes: status === 'Missed' ? 'Required makeup session' : `Session participation ${status.toLowerCase()}`,
      createdAt: historicalIso(4),
      updatedAt: historicalIso(1),
    };
  });
});

const allTrainingAttendance = [...trainingAttendance, ...extraTrainingAttendance];

const highPriorityNeedIds = ['need-1', 'need-2', 'need-3', 'need-4', 'need-5'];
const extraTrainerRecommendations = highPriorityNeedIds.flatMap((needId, needIndex) => {
  const courseId = trainingNeedAssessments.find((need) => need.id === needId)?.requiredCourseId ?? courses[0].id;
  const trainerPool = [personnel[(needIndex * 3) % personnel.length], personnel[(needIndex * 3 + 5) % personnel.length], personnel[(needIndex * 3 + 11) % personnel.length]];
  return trainerPool.map((trainer, trainerIndex) => ({
    id: `trainer-extra-${needIndex + 1}-${trainerIndex + 1}`,
    tenantId,
    trainingNeedAssessmentId: needId,
    courseId,
    trainerPersonnelId: trainer.id,
    suitabilityScore: 88 - trainerIndex * 3 + needIndex,
    reasonSummary: `${trainer.rank} ${trainer.name} has matching experience and strong agency familiarity.`,
    availabilityScore: 78 - trainerIndex * 4,
    expertiseScore: 90 - trainerIndex * 2,
    performanceScore: 88 - trainerIndex * 2,
    workloadScore: 80 - trainerIndex * 2,
    createdAt: historicalIso(1),
  }));
});

const extraTraineeRecommendations = highPriorityNeedIds.flatMap((needId, needIndex) => {
  const need = trainingNeedAssessments.find((item) => item.id === needId);
  const courseId = need?.requiredCourseId ?? courses[0].id;
  const basePersonnel = personnel.slice(needIndex * 10, needIndex * 10 + 10);
  return basePersonnel.map((person, personIndex) => ({
    id: `trainee-extra-${needIndex + 1}-${personIndex + 1}`,
    tenantId,
    trainingNeedAssessmentId: needId,
    courseId,
    personnelId: person.id,
    suitabilityScore: 85 + ((needIndex + personIndex) % 10),
    gapReason: `${person.rank} at ${person.station} needs ${(need?.title ?? 'training support').toLowerCase()}`,
    urgencyScore: 70 + ((needIndex + personIndex) % 20),
    readinessImpactScore: need?.readinessImpact ?? 5,
    stationCoverageImpact: personIndex % 2 === 0 ? 'Low - can attend off-shift' : 'Moderate - schedule around staffing window',
    createdAt: historicalIso(1),
  }));
});

const allTrainerRecommendations = [...trainerRecommendations, ...extraTrainerRecommendations];
const allTraineeRecommendations = [...traineeRecommendations, ...extraTraineeRecommendations];

const instructorProfiles = [
  { id: 'instructor-1', tenantId, personnelId: 'person-1', bio: 'EMS documentation and QA lead.', specialties: ['EMS Documentation', 'QA'], certifications: ['Paramedic', 'Officer I', 'EMS Instructor'], teachingHistory: 42, availability: 'Medium', workloadRisk: 'Low', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'instructor-2', tenantId, personnelId: 'person-5', bio: 'Driver operator and apparatus safety specialist.', specialties: ['Driver Operator', 'Apparatus Safety'], certifications: ['Driver Operator', 'Firefighter II'], teachingHistory: 31, availability: 'High', workloadRisk: 'Low', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'instructor-3', tenantId, personnelId: 'person-17', bio: 'Wildland and WUI response instructor.', specialties: ['Wildland', 'WUI'], certifications: ['Wildland Firefighter'], teachingHistory: 28, availability: 'Medium', workloadRisk: 'Low', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
  { id: 'instructor-4', tenantId, personnelId: 'person-49', bio: 'Prevention and inspection training support.', specialties: ['Prevention', 'Inspection'], certifications: ['Inspector I'], teachingHistory: 24, availability: 'High', workloadRisk: 'Medium', createdAt: historicalIso(120), updatedAt: historicalIso(1) },
];

const certificationRenewals = [
  { id: 'renewal-1', tenantId, personnelId: 'person-1', certificationId: 'cert-paramedic', renewalDate: historicalIso(2), newExpiryDate: iso(720), status: 'Completed', completedBy: 'user-training', notes: 'Renewal completed during station refresher.', createdAt: historicalIso(2), updatedAt: historicalIso(1) },
  { id: 'renewal-2', tenantId, personnelId: 'person-5', certificationId: 'cert-driver', renewalDate: historicalIso(4), newExpiryDate: iso(720), status: 'Completed', completedBy: 'user-training', notes: 'Operator renewal documented.', createdAt: historicalIso(4), updatedAt: historicalIso(1) },
  { id: 'renewal-3', tenantId, personnelId: 'person-17', certificationId: 'cert-wildland', renewalDate: historicalIso(5), newExpiryDate: iso(720), status: 'Completed', completedBy: 'user-training', notes: 'WUI renewal after drill exercise.', createdAt: historicalIso(5), updatedAt: historicalIso(1) },
];

export const seedData = {
  tenant: [{ id: tenantId, code: 'WMFPD', name: 'West Metro Fire Protection District', timezone: 'America/Denver', createdAt: historicalIso(1200), updatedAt: historicalIso(1), isDeleted: false }],
  battalion: battalions,
  permission: permissions,
  role: roles,
  user: users,
  userRole: users.flatMap((user) => user.roleCodes.map((roleCode) => ({ userId: user.id, roleId: roles.find((role) => role.name === roleCode)?.id ?? 'role-1', createdAt: historicalIso(500) }))),
  rolePermission: roles.flatMap((role) => role.permissionCodes.map((permissionCode) => ({ roleId: role.id, permissionId: permissions.find((permission) => permission.code === permissionCode)?.id ?? 'perm-core.view', createdAt: historicalIso(500) }))),
  accessReview: accessReviews,
  accessReviewItem: accessReviewItems,
  sensitiveDataAccessLog: sensitiveAccessLogs,
  sessionLog: sessionLogs,
  passwordPolicy,
  mfaPolicy,
  ssoConfiguration: ssoConfigurations,
  securityControl: securityControls,
  complianceFrameworkMapping: complianceMappings,
  backupPolicy,
  disasterRecoveryPlan,
  securityIncident: securityIncidents,
  vulnerabilityRecord: vulnerabilities,
  slaPolicy: slaPolicies,
  escalationPath: escalationPaths,
  systemStatusEvent: systemStatusEvents,
  station: stations,
  personnel,
  rank: [
    { id: 'rank-firefighter', tenantId, code: 'FF', name: 'Firefighter', sortOrder: 1, level: 1, category: 'Operations', isOfficerRank: false, isCommandRank: false, createdAt: historicalIso(900), updatedAt: historicalIso(1), isDeleted: false },
    { id: 'rank-engineer', tenantId, code: 'ENG', name: 'Engineer', sortOrder: 2, level: 2, category: 'Operations', isOfficerRank: false, isCommandRank: false, createdAt: historicalIso(900), updatedAt: historicalIso(1), isDeleted: false },
    { id: 'rank-lieutenant', tenantId, code: 'LT', name: 'Lieutenant', sortOrder: 3, level: 3, category: 'Officer', isOfficerRank: true, isCommandRank: false, createdAt: historicalIso(900), updatedAt: historicalIso(1), isDeleted: false },
    { id: 'rank-captain', tenantId, code: 'CAPT', name: 'Captain', sortOrder: 4, level: 4, category: 'Officer', isOfficerRank: true, isCommandRank: false, createdAt: historicalIso(900), updatedAt: historicalIso(1), isDeleted: false },
    { id: 'rank-battalion-chief', tenantId, code: 'BC', name: 'Battalion Chief', sortOrder: 5, level: 5, category: 'Command', isOfficerRank: true, isCommandRank: true, createdAt: historicalIso(900), updatedAt: historicalIso(1), isDeleted: false },
  ],
  certification: certifications,
  personnelCertification: personnelCertifications,
  personnelAssignment: personnelAssignments,
  personnelAssignmentHistory: personnelAssignments.map((assignment, index) => ({
    ...assignment,
    id: `assignment-history-${index + 1}`,
    shiftPlatoonId: assignment.platoonCode,
    rankId: personnel[index]?.rank === 'Firefighter' ? 'rank-firefighter' : personnel[index]?.rank === 'Engineer' ? 'rank-engineer' : personnel[index]?.rank === 'Lieutenant' ? 'rank-lieutenant' : personnel[index]?.rank === 'Captain' ? 'rank-captain' : 'rank-battalion-chief',
    reason: index % 5 === 0 ? 'Rotation change' : 'Standard assignment history',
  })),
  personnelDocument: personnelDocuments,
  apparatusType: apparatusTypes,
  apparatus,
  asset: assets,
  equipmentCategory: equipmentCategories,
  inventoryItem: inventoryItems,
  inventoryTransaction: inventoryTransactions,
  maintenanceEvent: maintenanceEvents,
  preventiveMaintenanceSchedule: preventiveMaintenanceSchedules,
  vendor: vendors,
  purchaseReorderRecommendation: purchaseReorderRecommendations,
  assetReadinessSnapshot: assetReadinessSnapshots,
  property: properties,
  inspection: inspections,
  incident: incidents,
  incidentUnit: incidentUnits,
  incidentPersonnel,
  nerisMapping: nerisMappings,
  integrationSystem: integrationSystems,
  integrationLog: integrationLogs,
  integrationEndpoint: integrationEndpoints,
  integrationError: integrationErrors,
  integrationRetryJob: integrationRetryJobs,
  webhookSubscription: webhookSubscriptions,
  apiCredential: apiCredentials,
  integrationHealthSnapshot: integrationHealthSnapshots,
  integrationDataObject: integrationDataObjects,
  notification: notifications,
  auditLog: [...auditLogs, ...generatedAuditLogs],
  aiInsight: aiInsights,
  aiInsightEvidence: aiInsightEvidence,
  aiRule: aiRules,
  aiProviderConfig: aiProviderConfigs,
  aiReadinessSnapshot: aiReadinessSnapshots,
  supportTicket: supportTickets,
  reportDefinition: reportDefinitions,
  personnelPerformanceReview: personnelPerformanceReviews,
  personnelGoal: personnelGoals,
  personnelNote: personnelNotes,
  personnelReadinessSnapshot: personnelReadinessSnapshots,
  certificationRenewal: certificationRenewals,
  aiQuestionLog: aiQuestionLogs,
  courseCategory: courseCategories,
  course: courses,
  courseSession: allCourseSessions,
  trainingNeedAssessment: trainingNeedAssessments,
  trainerRecommendation: allTrainerRecommendations,
  traineeRecommendation: allTraineeRecommendations,
  trainingAssignment: allTrainingAssignments,
  trainingAttendance: allTrainingAttendance,
  trainingOutcome: trainingOutcomes,
  instructorProfile: instructorProfiles,
  shift: [] as Array<Record<string, unknown>>,
  shiftAssignment: [] as Array<Record<string, unknown>>,
  staffingRule: [] as Array<Record<string, unknown>>,
  openShift: [] as Array<Record<string, unknown>>,
  shiftTradeRequest: [] as Array<Record<string, unknown>>,
  leaveRequest: [] as Array<Record<string, unknown>>,
  overtimeRecord: overtimeRecords,
  availabilityRecord: availabilityRecords,
  incidentTimelineEvent: incidentTimelineEvents,
  incidentNarrative: incidentNarratives,
  incidentQaReview: incidentQaReviews,
  incidentAttachment: incidentAttachments,
  epcrLink: epcrLinks,
  nerisExportLog: nerisExportLogs,
  cadImportLog: cadImportLogs,
  incidentDataQualityIssue: incidentDataQualityIssues,
  incidentDuplicateCandidate: incidentDuplicateCandidates,
  occupancy: occupancies,
  inspectionChecklistItem: inspectionChecklistItems,
  violation: violations,
  correctiveAction: correctiveActions,
  permit: permits,
  permitReview: permitReviews,
  preplan: preplans,
  preplanAttachment: preplanAttachments,
  hydrant: hydrants,
  hazard: hazards,
  preventionContact: preventionContacts,
  preventionDocument: preventionDocuments,
  preventionRiskSnapshot: preventionRiskSnapshots,
  savedReport: savedReports,
  reportExport: reportExports,
  reportSchedule: reportSchedules,
  dashboardWidget: dashboardWidgets,
  dataQualityCheck: dataQualityChecks,
  dataQualityIssue: dataQualityIssues,
  duplicateRecordCandidate: duplicateRecordCandidates,
  duplicateRecord: [] as Array<Record<string, unknown>>,
  analyticsSnapshot: analyticsSnapshots,
  analyticsKpiDefinition: analyticsKpiDefinitions,
  fieldMapping: integrationFieldMappings,
  apiEndpointExample: integrationEndpoints,
  aiInsightAction: aiInsightActions,
  escalationLog: [] as Array<Record<string, unknown>>,
  knowledgeBaseArticle: [] as Array<Record<string, unknown>>,
  accessReviewLog: [] as Array<Record<string, unknown>>,
};
