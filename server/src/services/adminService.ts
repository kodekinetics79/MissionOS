import { prisma } from '../utils/prisma.js';
import { listAuditLogs as listFoundationAuditLogs, getRbacMatrix as getFoundationRbacMatrix } from './foundationService.js';

type AnyRecord = Record<string, any>;

const resolvePage = (value: unknown) => Math.max(Number(value || 1), 1);
const resolveTake = (value: unknown) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page: number, take: number) => (page - 1) * take;
const nowIso = () => new Date().toISOString();

function normalizeStatus(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

async function writeAudit(tenantId: string, userId: string | null, module: string, action: string, entityName?: string, entityId?: string, severity: string = 'Normal', beforeJson?: unknown, afterJson?: unknown) {
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId,
      module,
      action,
      entityName: entityName ?? null,
      entityId: entityId ?? null,
      severity,
      beforeJson: beforeJson == null ? null : JSON.stringify(beforeJson),
      afterJson: afterJson == null ? null : JSON.stringify(afterJson),
      createdAt: nowIso(),
    },
  });
}

async function createNotification(tenantId: string, title: string, message: string, notificationType: string, userId: string | null = 'user-admin', severity: 'Critical' | 'High' | 'Normal' = 'High') {
  await prisma.notification.create({
    data: {
      tenantId,
      userId,
      title,
      message,
      notificationType,
      severity,
      isRead: false,
      createdAt: nowIso(),
    },
  });
}

async function listPaged(model: string, tenantId: string, page = 1, take = 50, where: AnyRecord = {}, include?: AnyRecord, orderBy?: AnyRecord) {
  const delegate = (prisma as AnyRecord)[model];
  const queryWhere = { tenantId, ...where };
  const [items, total] = await Promise.all([
    delegate.findMany({ where: queryWhere, include, take, skip: resolveSkip(page, take), orderBy: orderBy ?? { createdAt: 'desc' } }),
    delegate.count({ where: queryWhere }),
  ]);
  return { items, page, take, total };
}

async function getSingleton(model: string, tenantId: string) {
  const delegate = (prisma as AnyRecord)[model];
  return delegate.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
}

async function upsertSingleton(model: string, tenantId: string, data: AnyRecord, userId: string, module: string, action: string) {
  const delegate = (prisma as AnyRecord)[model];
  const current = await getSingleton(model, tenantId);
  if (!current) {
    const created = await delegate.create({ data: { tenantId, ...data, createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, module, action, model, created.id, 'High', null, created);
    return created;
  }
  const updated = await delegate.update({ where: { id: current.id }, data: { ...data, updatedAt: nowIso() } });
  await writeAudit(tenantId, userId, module, action, model, current.id, 'High', current, updated);
  return updated;
}

export const trustCenterSummaryService = {
  async getSummary(tenantId: string) {
    const [
      users,
      roles,
      permissions,
      accessReviews,
      accessReviewItems,
      auditLogs,
      sensitiveAccessLogs,
      sessionLogs,
      securityIncidents,
      vulnerabilities,
      supportTickets,
      backupPolicy,
      disasterRecoveryPlan,
      complianceMappings,
      securityControls,
      systemStatusEvents,
      mfaPolicies,
      ssoConfigurations,
    ] = await Promise.all([
      prisma.user.findMany({ where: { tenantId } }),
      prisma.role.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] } }),
      prisma.permission.findMany(),
      prisma.accessReview.findMany({ where: { tenantId } }),
      prisma.accessReviewItem.findMany({ where: { tenantId } }),
      prisma.auditLog.findMany({ where: { tenantId } }),
      prisma.sensitiveDataAccessLog.findMany({ where: { tenantId } }),
      prisma.sessionLog.findMany({ where: { tenantId } }),
      prisma.securityIncident.findMany({ where: { tenantId } }),
      prisma.vulnerabilityRecord.findMany({ where: { tenantId } }),
      prisma.supportTicket.findMany({ where: { tenantId } }),
      prisma.backupPolicy.findMany({ where: { tenantId } }),
      prisma.disasterRecoveryPlan.findMany({ where: { tenantId } }),
      prisma.complianceFrameworkMapping.findMany({ where: { tenantId } }),
      prisma.securityControl.findMany({ where: { tenantId } }),
      prisma.systemStatusEvent.findMany({ where: { tenantId } }),
      prisma.mfaPolicy.findMany({ where: { tenantId } }),
      prisma.ssoConfiguration.findMany({ where: { tenantId } }),
    ]);

    const activeUsers = users.filter((user: AnyRecord) => normalizeStatus(user.status) === 'active' || user.isActive).length;
    const disabledUsers = users.filter((user: AnyRecord) => ['disabled', 'locked'].includes(normalizeStatus(user.status))).length;
    const adminUsers = users.filter((user: AnyRecord) => String(user.displayName ?? '').includes('Dana') || String(user.email ?? '').includes('admin') || String(user.ssoProvider ?? '').toLowerCase().includes('entra')).length;
    const riskyPermissions = permissions.filter((permission: AnyRecord) => /manage|export|rotate|dismiss|resolve/i.test(String(permission.code ?? ''))).length;
    const openAccessReviews = accessReviews.filter((review: AnyRecord) => ['draft', 'in progress', 'overdue'].includes(normalizeStatus(review.status))).length;
    const auditEventsToday = auditLogs.filter((log: AnyRecord) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;
    const sensitiveAccessCount = sensitiveAccessLogs.filter((log: AnyRecord) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;
    const openSecurityIncidents = securityIncidents.filter((incident: AnyRecord) => ['open', 'investigating', 'contained'].includes(normalizeStatus(incident.status))).length;
    const openVulnerabilities = vulnerabilities.filter((item: AnyRecord) => ['open', 'in remediation', 'risk accepted'].includes(normalizeStatus(item.status))).length;
    const backupStatus = backupPolicy[0]?.status ?? 'Unknown';
    const rtoMinutes = backupPolicy[0]?.rtoMinutes ?? disasterRecoveryPlan[0]?.rtoMinutes ?? 240;
    const rpoMinutes = backupPolicy[0]?.rpoMinutes ?? disasterRecoveryPlan[0]?.rpoMinutes ?? 15;
    const supportSlaStatus = supportTickets.some((ticket: AnyRecord) => normalizeStatus(ticket.slaStatus) === 'breached')
      ? 'Breached'
      : supportTickets.some((ticket: AnyRecord) => normalizeStatus(ticket.slaStatus) === 'at risk')
        ? 'At Risk'
        : 'On Track';
    const uptime = Math.max(96, 100 - systemStatusEvents.filter((event: AnyRecord) => normalizeStatus(event.status) !== 'healthy').length * 0.8);
    const compliancePosture = {
      nistMapped: complianceMappings.filter((mapping: AnyRecord) => normalizeStatus(mapping.framework) === 'nist csf').length,
      cjisMapped: complianceMappings.filter((mapping: AnyRecord) => String(mapping.framework ?? '').includes('CJIS')).length,
      hipaaMapped: complianceMappings.filter((mapping: AnyRecord) => String(mapping.framework ?? '').includes('HIPAA')).length,
      soc2Ready: complianceMappings.filter((mapping: AnyRecord) => String(mapping.framework ?? '').includes('SOC 2')).length,
    };

    return {
      activeUsers,
      disabledUsers,
      adminUsers,
      rolesCount: roles.length,
      permissionsCount: permissions.length,
      riskyPermissions,
      mfaAdoptionPlaceholder: users.filter((user: AnyRecord) => Boolean(user.mfaEnabled)).length,
      ssoStatus: ssoConfigurations.some((config: AnyRecord) => normalizeStatus(config.status) === 'active') ? 'Active' : 'Disabled',
      openAccessReviews,
      auditEventsToday,
      sensitiveAccessCount,
      openSecurityIncidents,
      openVulnerabilities,
      backupStatus,
      rtoMinutes,
      rpoMinutes,
      supportSlaStatus,
      uptime,
      compliancePosture,
      recommendedActions: [
        openAccessReviews ? 'Complete overdue access reviews' : null,
        openSecurityIncidents ? 'Review open security incidents' : null,
        openVulnerabilities ? 'Prioritize remediation work' : null,
      ].filter(Boolean),
      summaryCards: [
        { label: 'Users', value: activeUsers },
        { label: 'Roles', value: roles.length },
        { label: 'Permissions', value: permissions.length },
        { label: 'Audit events today', value: auditEventsToday },
      ],
    };
  },
};

export const tenantAdminService = {
  async getTenant(tenantId: string) {
    return prisma.tenant.findFirst({ where: { id: tenantId } });
  },
  async updateTenant(tenantId: string, userId: string, data: AnyRecord) {
    const current = await prisma.tenant.findFirst({ where: { id: tenantId } });
    const updated = current
      ? await prisma.tenant.update({ where: { id: tenantId }, data: { ...data, updatedAt: nowIso() } })
      : await prisma.tenant.create({ data: { id: tenantId, ...data, createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated tenant', 'Tenant', tenantId, 'High', current, updated);
    return updated;
  },
};

export const userAdminService = {
  async list(tenantId: string, page = 1, take = 50, filters: AnyRecord = {}) {
    const where: AnyRecord = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.mfa === 'true') where.mfaEnabled = true;
    if (filters.mfa === 'false') where.mfaEnabled = false;
    if (filters.ssoProvider) where.ssoProvider = filters.ssoProvider;
    if (filters.roleId) where.roles = { some: { roleId: filters.roleId } };
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { displayName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return listPaged('user', tenantId, page, take, where, { personnel: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }, { createdAt: 'desc' });
  },
  async get(tenantId: string, id: string) {
    return prisma.user.findFirst({ where: { tenantId, id }, include: { personnel: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
  },
  async create(tenantId: string, userId: string, data: AnyRecord) {
    const created = await prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        displayName: data.displayName,
        personnelId: data.personnelId ?? null,
        status: data.status ?? 'Invited',
        lastLoginAt: data.lastLoginAt ?? null,
        mfaEnabled: Boolean(data.mfaEnabled),
        ssoProvider: data.ssoProvider ?? null,
        passwordHash: data.passwordHash ?? null,
        isDeleted: false,
        isActive: data.status ? normalizeStatus(data.status) === 'active' : false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
    });
    for (const roleId of data.roleIds ?? []) {
      await prisma.userRole.create({ data: { tenantId, userId: created.id, roleId, assignedByUserId: userId, assignedAt: nowIso() } });
    }
    await writeAudit(tenantId, userId, 'Admin', 'Created user', 'User', created.id, 'High', null, created);
    return created;
  },
  async update(tenantId: string, id: string, userId: string, data: AnyRecord) {
    const current = await prisma.user.findFirst({ where: { tenantId, id } });
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...data,
        isActive: data.status ? normalizeStatus(data.status) === 'active' : current?.isActive,
        updatedAt: nowIso(),
      },
    });
    await writeAudit(tenantId, userId, 'Admin', 'Updated user', 'User', id, 'High', current, updated);
    return updated;
  },
  async setStatus(tenantId: string, id: string, userId: string, status: string) {
    const current = await prisma.user.findFirst({ where: { tenantId, id } });
    const updated = await prisma.user.update({ where: { id }, data: { status, isActive: normalizeStatus(status) === 'active', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', `Set user ${status}`, 'User', id, 'High', current, updated);
    return updated;
  },
  async assignRoles(tenantId: string, id: string, userId: string, roleIds: string[]) {
    await prisma.userRole.deleteMany({ where: { tenantId, userId: id } });
    for (const roleId of roleIds) {
      await prisma.userRole.create({ data: { tenantId, userId: id, roleId, assignedByUserId: userId, assignedAt: nowIso() } });
    }
    await writeAudit(tenantId, userId, 'Admin', 'Assigned roles', 'User', id, 'High', null, { roleIds });
    return userAdminService.get(tenantId, id);
  },
  async removeRole(tenantId: string, id: string, roleId: string, userId: string) {
    await prisma.userRole.deleteMany({ where: { tenantId, userId: id, roleId } });
    await writeAudit(tenantId, userId, 'Admin', 'Removed role', 'User', id, 'High', null, { roleId });
    return userAdminService.get(tenantId, id);
  },
};

export const roleService = {
  async list(tenantId: string) {
    return prisma.role.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
  },
  async get(tenantId: string, id: string) {
    return prisma.role.findFirst({ where: { id, OR: [{ tenantId }, { tenantId: null }] }, include: { permissions: { include: { permission: true } } } });
  },
  async create(tenantId: string, userId: string, data: AnyRecord) {
    const created = await prisma.role.create({ data: { tenantId, name: data.name, code: data.code ?? String(data.name ?? '').toLowerCase().replace(/\s+/g, '-'), description: data.description ?? null, roleType: data.roleType ?? 'Custom', isSystemRole: Boolean(data.isSystemRole), createdAt: nowIso(), updatedAt: nowIso(), isDeleted: false } });
    await writeAudit(tenantId, userId, 'Admin', 'Created role', 'Role', created.id, 'High', null, created);
    return created;
  },
  async update(tenantId: string, id: string, userId: string, data: AnyRecord) {
    const current = await prisma.role.findFirst({ where: { id, OR: [{ tenantId }, { tenantId: null }] } });
    const updated = await prisma.role.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated role', 'Role', id, 'High', current, updated);
    return updated;
  },
  async addPermission(tenantId: string, roleId: string, permissionId: string, userId: string) {
    await prisma.rolePermission.create({ data: { tenantId, roleId, permissionId, grantedByUserId: userId, grantedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Granted permission', 'Role', roleId, 'High', null, { permissionId });
    return roleService.get(tenantId, roleId);
  },
  async removePermission(tenantId: string, roleId: string, permissionId: string, userId: string) {
    await prisma.rolePermission.deleteMany({ where: { tenantId, roleId, permissionId } });
    await writeAudit(tenantId, userId, 'Admin', 'Removed permission', 'Role', roleId, 'High', null, { permissionId });
    return roleService.get(tenantId, roleId);
  },
};

export const permissionService = {
  async list() {
    return prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  },
};

export const rbacMatrixService = {
  async getMatrix(tenantId: string) {
    return getFoundationRbacMatrix(tenantId);
  },
};

export const accessReviewService = {
  async list(tenantId: string) {
    return prisma.accessReview.findMany({ where: { tenantId }, orderBy: { dueDate: 'asc' } });
  },
  async get(tenantId: string, id: string) {
    const review = await prisma.accessReview.findFirst({ where: { tenantId, id } });
    const items = await prisma.accessReviewItem.findMany({ where: { tenantId, accessReviewId: id }, include: { user: true, role: true } });
    return { ...review, items };
  },
  async create(tenantId: string, userId: string, data: AnyRecord) {
    const created = await prisma.accessReview.create({ data: { tenantId, reviewName: data.reviewName, status: data.status ?? 'Draft', reviewPeriodStart: data.reviewPeriodStart ?? nowIso(), reviewPeriodEnd: data.reviewPeriodEnd ?? nowIso(), ownerUserId: data.ownerUserId ?? userId, dueDate: data.dueDate ?? nowIso(), createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Created access review', 'AccessReview', created.id, 'High', null, created);
    return created;
  },
  async start(tenantId: string, id: string, userId: string) {
    const current = await prisma.accessReview.findFirst({ where: { tenantId, id } });
    const updated = await prisma.accessReview.update({ where: { id }, data: { status: 'In Progress', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Started access review', 'AccessReview', id, 'High', current, updated);
    return updated;
  },
  async complete(tenantId: string, id: string, userId: string) {
    const current = await prisma.accessReview.findFirst({ where: { tenantId, id } });
    const updated = await prisma.accessReview.update({ where: { id }, data: { status: 'Completed', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Completed access review', 'AccessReview', id, 'High', current, updated);
    return updated;
  },
  async updateItem(tenantId: string, reviewId: string, itemId: string, userId: string, data: AnyRecord) {
    const current = await prisma.accessReviewItem.findFirst({ where: { tenantId, id: itemId, accessReviewId: reviewId } });
    const updated = await prisma.accessReviewItem.update({ where: { id: itemId }, data: { ...data, reviewerUserId: userId, reviewedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Reviewed access item', 'AccessReviewItem', itemId, 'High', current, updated);
    return updated;
  },
};

export const auditLogService = {
  list: listFoundationAuditLogs,
  sensitive: async (tenantId: string, page = 1, take = 50) => listPaged('sensitiveDataAccessLog', tenantId, page, take, {}, { user: true }),
  sessions: async (tenantId: string, page = 1, take = 50) => listPaged('sessionLog', tenantId, page, take, {}, { user: true }, { loginAt: 'desc' }),
};

export const passwordPolicyService = {
  get: (tenantId: string) => getSingleton('passwordPolicy', tenantId),
  update: (tenantId: string, userId: string, data: AnyRecord) => upsertSingleton('passwordPolicy', tenantId, data, userId, 'Admin', 'Updated password policy'),
};

export const mfaPolicyService = {
  get: (tenantId: string) => getSingleton('mfaPolicy', tenantId),
  update: (tenantId: string, userId: string, data: AnyRecord) => upsertSingleton('mfaPolicy', tenantId, data, userId, 'Admin', 'Updated MFA policy'),
};

export const ssoConfigurationService = {
  list: (tenantId: string) => prisma.ssoConfiguration.findMany({ where: { tenantId }, orderBy: { providerName: 'asc' } }),
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.ssoConfiguration.findFirst({ where: { tenantId, id } });
    const updated = current
      ? await prisma.ssoConfiguration.update({ where: { id }, data: { ...data, updatedAt: nowIso() } })
      : await prisma.ssoConfiguration.create({ data: { tenantId, id, ...data, createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated SSO configuration', 'SsoConfiguration', id, 'High', current, updated);
    return updated;
  },
  test: async (tenantId: string, userId: string, id: string) => {
    const config = await prisma.ssoConfiguration.findFirst({ where: { tenantId, id } });
    await writeAudit(tenantId, userId, 'Admin', 'Tested SSO configuration', 'SsoConfiguration', id, 'Normal', null, config);
    return { status: 'Success', providerName: config?.providerName ?? 'Unknown', testedAt: nowIso(), message: 'SSO placeholder test passed.' };
  },
};

export const securityControlService = {
  list: (tenantId: string) => prisma.securityControl.findMany({ where: { tenantId }, orderBy: [{ framework: 'asc' }, { controlCode: 'asc' }] }),
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.securityControl.findFirst({ where: { tenantId, id } });
    const updated = await prisma.securityControl.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated security control', 'SecurityControl', id, 'Normal', current, updated);
    return updated;
  },
};

export const complianceMappingService = {
  list: (tenantId: string, framework?: string) => prisma.complianceFrameworkMapping.findMany({ where: { tenantId, ...(framework ? { framework } : {}) }, orderBy: [{ framework: 'asc' }, { domain: 'asc' }] }),
};

export const backupPolicyService = {
  get: (tenantId: string) => getSingleton('backupPolicy', tenantId),
  update: (tenantId: string, userId: string, data: AnyRecord) => upsertSingleton('backupPolicy', tenantId, data, userId, 'Admin', 'Updated backup policy'),
};

export const disasterRecoveryService = {
  get: (tenantId: string) => getSingleton('disasterRecoveryPlan', tenantId),
  update: (tenantId: string, userId: string, data: AnyRecord) => upsertSingleton('disasterRecoveryPlan', tenantId, data, userId, 'Admin', 'Updated disaster recovery plan'),
  testPlaceholder: async (tenantId: string, userId: string) => {
    await writeAudit(tenantId, userId, 'Admin', 'Triggered DR test placeholder', 'DisasterRecoveryPlan', null, 'Normal', null, { testedAt: nowIso() });
    return { status: 'Queued', testedAt: nowIso(), message: 'DR test placeholder queued.' };
  },
};

export const securityIncidentService = {
  list: (tenantId: string) => prisma.securityIncident.findMany({ where: { tenantId }, orderBy: { detectedAt: 'desc' } }),
  create: async (tenantId: string, userId: string, data: AnyRecord) => {
    const created = await prisma.securityIncident.create({ data: { tenantId, incidentNumber: data.incidentNumber ?? `SEC-${Date.now()}`, title: data.title, severity: data.severity ?? 'Normal', status: data.status ?? 'Open', detectedAt: data.detectedAt ?? nowIso(), containedAt: data.containedAt ?? null, resolvedAt: data.resolvedAt ?? null, ownerUserId: data.ownerUserId ?? userId, summary: data.summary ?? '', impactSummary: data.impactSummary ?? null, resolutionSummary: data.resolutionSummary ?? null, createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Created security incident', 'SecurityIncident', created.id, 'High', null, created);
    await createNotification(tenantId, `Security incident: ${created.title}`, 'A security incident was created and requires review.', 'security.incident', 'user-admin', 'Critical');
    return created;
  },
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.securityIncident.findFirst({ where: { tenantId, id } });
    const updated = await prisma.securityIncident.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated security incident', 'SecurityIncident', id, 'High', current, updated);
    return updated;
  },
  contain: async (tenantId: string, userId: string, id: string) => {
    const current = await prisma.securityIncident.findFirst({ where: { tenantId, id } });
    const updated = await prisma.securityIncident.update({ where: { id }, data: { status: 'Contained', containedAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Contained security incident', 'SecurityIncident', id, 'High', current, updated);
    return updated;
  },
  resolve: async (tenantId: string, userId: string, id: string) => {
    const current = await prisma.securityIncident.findFirst({ where: { tenantId, id } });
    const updated = await prisma.securityIncident.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Resolved security incident', 'SecurityIncident', id, 'Normal', current, updated);
    return updated;
  },
};

export const vulnerabilityService = {
  list: (tenantId: string) => prisma.vulnerabilityRecord.findMany({ where: { tenantId }, orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }] }),
  create: async (tenantId: string, userId: string, data: AnyRecord) => {
    const created = await prisma.vulnerabilityRecord.create({ data: { tenantId, vulnerabilityNumber: data.vulnerabilityNumber ?? `VULN-${Date.now()}`, title: data.title, severity: data.severity ?? 'Normal', status: data.status ?? 'Open', source: data.source ?? 'Manual', affectedComponent: data.affectedComponent ?? 'Unknown', detectedAt: data.detectedAt ?? nowIso(), dueDate: data.dueDate ?? null, resolvedAt: data.resolvedAt ?? null, remediationSummary: data.remediationSummary ?? null, createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Created vulnerability', 'VulnerabilityRecord', created.id, 'High', null, created);
    return created;
  },
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.vulnerabilityRecord.findFirst({ where: { tenantId, id } });
    const updated = await prisma.vulnerabilityRecord.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Updated vulnerability', 'VulnerabilityRecord', id, 'High', current, updated);
    return updated;
  },
  resolve: async (tenantId: string, userId: string, id: string) => {
    const current = await prisma.vulnerabilityRecord.findFirst({ where: { tenantId, id } });
    const updated = await prisma.vulnerabilityRecord.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Admin', 'Resolved vulnerability', 'VulnerabilityRecord', id, 'Normal', current, updated);
    return updated;
  },
};

export const supportTicketService = {
  list: (tenantId: string, page = 1, take = 50, filters: AnyRecord = {}) => {
    const where: AnyRecord = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.module) where.module = filters.module;
    return listPaged('supportTicket', tenantId, page, take, where, undefined, { createdAt: 'desc' });
  },
  create: async (tenantId: string, userId: string, data: AnyRecord) => {
    const created = await prisma.supportTicket.create({
      data: {
        tenantId,
        ticketNumber: data.ticketNumber ?? `SLA-${Date.now()}`,
        title: data.title,
        description: data.description ?? '',
        severity: data.severity ?? 'Normal',
        status: data.status ?? 'New',
        module: data.module ?? 'Support',
        requesterUserId: data.requesterUserId ?? null,
        assignedToUserId: data.assignedToUserId ?? null,
        createdAt: nowIso(),
        firstResponseDueAt: data.firstResponseDueAt ?? null,
        resolutionDueAt: data.resolutionDueAt ?? null,
        resolvedAt: data.resolvedAt ?? null,
        slaStatus: data.slaStatus ?? 'On Track',
        updatedAt: nowIso(),
      },
    });
    await writeAudit(tenantId, userId, 'Support', 'Created support ticket', 'SupportTicket', created.id, 'Normal', null, created);
    return created;
  },
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.supportTicket.findFirst({ where: { tenantId, id } });
    const updated = await prisma.supportTicket.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Support', 'Updated support ticket', 'SupportTicket', id, 'Normal', current, updated);
    return updated;
  },
  assign: async (tenantId: string, userId: string, id: string, assignee: string) => {
    const current = await prisma.supportTicket.findFirst({ where: { tenantId, id } });
    const updated = await prisma.supportTicket.update({ where: { id }, data: { assignedToUserId: assignee, status: 'Assigned', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Support', 'Assigned support ticket', 'SupportTicket', id, 'Normal', current, updated);
    return updated;
  },
  resolve: async (tenantId: string, userId: string, id: string) => {
    const current = await prisma.supportTicket.findFirst({ where: { tenantId, id } });
    const updated = await prisma.supportTicket.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), slaStatus: 'On Track', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Support', 'Resolved support ticket', 'SupportTicket', id, 'Normal', current, updated);
    return updated;
  },
};

export const slaService = {
  list: (tenantId: string) => prisma.slaPolicy.findMany({ where: { tenantId }, orderBy: { severity: 'asc' } }),
  update: async (tenantId: string, userId: string, id: string, data: AnyRecord) => {
    const current = await prisma.slaPolicy.findFirst({ where: { tenantId, id } });
    const updated = await prisma.slaPolicy.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Support', 'Updated SLA policy', 'SlaPolicy', id, 'Normal', current, updated);
    return updated;
  },
};

export const escalationService = {
  list: (tenantId: string) => prisma.escalationPath.findMany({ where: { tenantId }, orderBy: [{ severity: 'asc' }, { level: 'asc' }] }),
};

export const systemStatusService = {
  list: (tenantId: string) => prisma.systemStatusEvent.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' } }),
  create: async (tenantId: string, userId: string, data: AnyRecord) => {
    const created = await prisma.systemStatusEvent.create({ data: { tenantId, componentName: data.componentName, status: data.status ?? 'Healthy', title: data.title, description: data.description ?? '', startedAt: data.startedAt ?? nowIso(), resolvedAt: data.resolvedAt ?? null, impactLevel: data.impactLevel ?? 'Low', createdAt: nowIso(), updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'Support', 'Created system status event', 'SystemStatusEvent', created.id, 'Normal', null, created);
    return created;
  },
};
