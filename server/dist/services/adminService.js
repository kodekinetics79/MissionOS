"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemStatusService = exports.escalationService = exports.slaService = exports.supportTicketService = exports.vulnerabilityService = exports.securityIncidentService = exports.disasterRecoveryService = exports.backupPolicyService = exports.complianceMappingService = exports.securityControlService = exports.ssoConfigurationService = exports.mfaPolicyService = exports.passwordPolicyService = exports.auditLogService = exports.accessReviewService = exports.rbacMatrixService = exports.permissionService = exports.roleService = exports.userAdminService = exports.tenantAdminService = exports.trustCenterSummaryService = void 0;
const prisma_js_1 = require("../utils/prisma.js");
const foundationService_js_1 = require("./foundationService.js");
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page, take) => (page - 1) * take;
const nowIso = () => new Date().toISOString();
function normalizeStatus(value) {
    return String(value ?? '').trim().toLowerCase();
}
async function writeAudit(tenantId, userId, module, action, entityName, entityId, severity = 'Normal', beforeJson, afterJson) {
    await prisma_js_1.prisma.auditLog.create({
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
async function createNotification(tenantId, title, message, notificationType, userId = 'user-admin', severity = 'High') {
    await prisma_js_1.prisma.notification.create({
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
async function listPaged(model, tenantId, page = 1, take = 50, where = {}, include, orderBy) {
    const delegate = prisma_js_1.prisma[model];
    const queryWhere = { tenantId, ...where };
    const [items, total] = await Promise.all([
        delegate.findMany({ where: queryWhere, include, take, skip: resolveSkip(page, take), orderBy: orderBy ?? { createdAt: 'desc' } }),
        delegate.count({ where: queryWhere }),
    ]);
    return { items, page, take, total };
}
async function getSingleton(model, tenantId) {
    const delegate = prisma_js_1.prisma[model];
    return delegate.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
}
async function upsertSingleton(model, tenantId, data, userId, module, action) {
    const delegate = prisma_js_1.prisma[model];
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
exports.trustCenterSummaryService = {
    async getSummary(tenantId) {
        const [users, roles, permissions, accessReviews, accessReviewItems, auditLogs, sensitiveAccessLogs, sessionLogs, securityIncidents, vulnerabilities, supportTickets, backupPolicy, disasterRecoveryPlan, complianceMappings, securityControls, systemStatusEvents, mfaPolicies, ssoConfigurations,] = await Promise.all([
            prisma_js_1.prisma.user.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.role.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] } }),
            prisma_js_1.prisma.permission.findMany(),
            prisma_js_1.prisma.accessReview.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.accessReviewItem.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.auditLog.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.sensitiveDataAccessLog.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.sessionLog.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.securityIncident.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.vulnerabilityRecord.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.supportTicket.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.backupPolicy.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.disasterRecoveryPlan.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.complianceFrameworkMapping.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.securityControl.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.systemStatusEvent.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.mfaPolicy.findMany({ where: { tenantId } }),
            prisma_js_1.prisma.ssoConfiguration.findMany({ where: { tenantId } }),
        ]);
        const activeUsers = users.filter((user) => normalizeStatus(user.status) === 'active' || user.isActive).length;
        const disabledUsers = users.filter((user) => ['disabled', 'locked'].includes(normalizeStatus(user.status))).length;
        const adminUsers = users.filter((user) => String(user.displayName ?? '').includes('Dana') || String(user.email ?? '').includes('admin') || String(user.ssoProvider ?? '').toLowerCase().includes('entra')).length;
        const riskyPermissions = permissions.filter((permission) => /manage|export|rotate|dismiss|resolve/i.test(String(permission.code ?? ''))).length;
        const openAccessReviews = accessReviews.filter((review) => ['draft', 'in progress', 'overdue'].includes(normalizeStatus(review.status))).length;
        const auditEventsToday = auditLogs.filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;
        const sensitiveAccessCount = sensitiveAccessLogs.filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;
        const openSecurityIncidents = securityIncidents.filter((incident) => ['open', 'investigating', 'contained'].includes(normalizeStatus(incident.status))).length;
        const openVulnerabilities = vulnerabilities.filter((item) => ['open', 'in remediation', 'risk accepted'].includes(normalizeStatus(item.status))).length;
        const backupStatus = backupPolicy[0]?.status ?? 'Unknown';
        const rtoMinutes = backupPolicy[0]?.rtoMinutes ?? disasterRecoveryPlan[0]?.rtoMinutes ?? 240;
        const rpoMinutes = backupPolicy[0]?.rpoMinutes ?? disasterRecoveryPlan[0]?.rpoMinutes ?? 15;
        const supportSlaStatus = supportTickets.some((ticket) => normalizeStatus(ticket.slaStatus) === 'breached')
            ? 'Breached'
            : supportTickets.some((ticket) => normalizeStatus(ticket.slaStatus) === 'at risk')
                ? 'At Risk'
                : 'On Track';
        const uptime = Math.max(96, 100 - systemStatusEvents.filter((event) => normalizeStatus(event.status) !== 'healthy').length * 0.8);
        const compliancePosture = {
            nistMapped: complianceMappings.filter((mapping) => normalizeStatus(mapping.framework) === 'nist csf').length,
            cjisMapped: complianceMappings.filter((mapping) => String(mapping.framework ?? '').includes('CJIS')).length,
            hipaaMapped: complianceMappings.filter((mapping) => String(mapping.framework ?? '').includes('HIPAA')).length,
            soc2Ready: complianceMappings.filter((mapping) => String(mapping.framework ?? '').includes('SOC 2')).length,
        };
        return {
            activeUsers,
            disabledUsers,
            adminUsers,
            rolesCount: roles.length,
            permissionsCount: permissions.length,
            riskyPermissions,
            mfaAdoptionPlaceholder: users.filter((user) => Boolean(user.mfaEnabled)).length,
            ssoStatus: ssoConfigurations.some((config) => normalizeStatus(config.status) === 'active') ? 'Active' : 'Disabled',
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
exports.tenantAdminService = {
    async getTenant(tenantId) {
        return prisma_js_1.prisma.tenant.findFirst({ where: { id: tenantId } });
    },
    async updateTenant(tenantId, userId, data) {
        const current = await prisma_js_1.prisma.tenant.findFirst({ where: { id: tenantId } });
        const updated = current
            ? await prisma_js_1.prisma.tenant.update({ where: { id: tenantId }, data: { ...data, updatedAt: nowIso() } })
            : await prisma_js_1.prisma.tenant.create({ data: { id: tenantId, ...data, createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated tenant', 'Tenant', tenantId, 'High', current, updated);
        return updated;
    },
};
exports.userAdminService = {
    async list(tenantId, page = 1, take = 50, filters = {}) {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.mfa === 'true')
            where.mfaEnabled = true;
        if (filters.mfa === 'false')
            where.mfaEnabled = false;
        if (filters.ssoProvider)
            where.ssoProvider = filters.ssoProvider;
        if (filters.roleId)
            where.roles = { some: { roleId: filters.roleId } };
        if (filters.search) {
            where.OR = [
                { email: { contains: filters.search, mode: 'insensitive' } },
                { displayName: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        return listPaged('user', tenantId, page, take, where, { personnel: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }, { createdAt: 'desc' });
    },
    async get(tenantId, id) {
        return prisma_js_1.prisma.user.findFirst({ where: { tenantId, id }, include: { personnel: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } });
    },
    async create(tenantId, userId, data) {
        const created = await prisma_js_1.prisma.user.create({
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
            await prisma_js_1.prisma.userRole.create({ data: { tenantId, userId: created.id, roleId, assignedByUserId: userId, assignedAt: nowIso() } });
        }
        await writeAudit(tenantId, userId, 'Admin', 'Created user', 'User', created.id, 'High', null, created);
        return created;
    },
    async update(tenantId, id, userId, data) {
        const current = await prisma_js_1.prisma.user.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.user.update({
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
    async setStatus(tenantId, id, userId, status) {
        const current = await prisma_js_1.prisma.user.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.user.update({ where: { id }, data: { status, isActive: normalizeStatus(status) === 'active', updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', `Set user ${status}`, 'User', id, 'High', current, updated);
        return updated;
    },
    async assignRoles(tenantId, id, userId, roleIds) {
        await prisma_js_1.prisma.userRole.deleteMany({ where: { tenantId, userId: id } });
        for (const roleId of roleIds) {
            await prisma_js_1.prisma.userRole.create({ data: { tenantId, userId: id, roleId, assignedByUserId: userId, assignedAt: nowIso() } });
        }
        await writeAudit(tenantId, userId, 'Admin', 'Assigned roles', 'User', id, 'High', null, { roleIds });
        return exports.userAdminService.get(tenantId, id);
    },
    async removeRole(tenantId, id, roleId, userId) {
        await prisma_js_1.prisma.userRole.deleteMany({ where: { tenantId, userId: id, roleId } });
        await writeAudit(tenantId, userId, 'Admin', 'Removed role', 'User', id, 'High', null, { roleId });
        return exports.userAdminService.get(tenantId, id);
    },
};
exports.roleService = {
    async list(tenantId) {
        return prisma_js_1.prisma.role.findMany({ where: { OR: [{ tenantId }, { tenantId: null }] }, include: { permissions: { include: { permission: true } } }, orderBy: { name: 'asc' } });
    },
    async get(tenantId, id) {
        return prisma_js_1.prisma.role.findFirst({ where: { id, OR: [{ tenantId }, { tenantId: null }] }, include: { permissions: { include: { permission: true } } } });
    },
    async create(tenantId, userId, data) {
        const created = await prisma_js_1.prisma.role.create({ data: { tenantId, name: data.name, code: data.code ?? String(data.name ?? '').toLowerCase().replace(/\s+/g, '-'), description: data.description ?? null, roleType: data.roleType ?? 'Custom', isSystemRole: Boolean(data.isSystemRole), createdAt: nowIso(), updatedAt: nowIso(), isDeleted: false } });
        await writeAudit(tenantId, userId, 'Admin', 'Created role', 'Role', created.id, 'High', null, created);
        return created;
    },
    async update(tenantId, id, userId, data) {
        const current = await prisma_js_1.prisma.role.findFirst({ where: { id, OR: [{ tenantId }, { tenantId: null }] } });
        const updated = await prisma_js_1.prisma.role.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated role', 'Role', id, 'High', current, updated);
        return updated;
    },
    async addPermission(tenantId, roleId, permissionId, userId) {
        await prisma_js_1.prisma.rolePermission.create({ data: { tenantId, roleId, permissionId, grantedByUserId: userId, grantedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Granted permission', 'Role', roleId, 'High', null, { permissionId });
        return exports.roleService.get(tenantId, roleId);
    },
    async removePermission(tenantId, roleId, permissionId, userId) {
        await prisma_js_1.prisma.rolePermission.deleteMany({ where: { tenantId, roleId, permissionId } });
        await writeAudit(tenantId, userId, 'Admin', 'Removed permission', 'Role', roleId, 'High', null, { permissionId });
        return exports.roleService.get(tenantId, roleId);
    },
};
exports.permissionService = {
    async list() {
        return prisma_js_1.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
    },
};
exports.rbacMatrixService = {
    async getMatrix(tenantId) {
        return (0, foundationService_js_1.getRbacMatrix)(tenantId);
    },
};
exports.accessReviewService = {
    async list(tenantId) {
        return prisma_js_1.prisma.accessReview.findMany({ where: { tenantId }, orderBy: { dueDate: 'asc' } });
    },
    async get(tenantId, id) {
        const review = await prisma_js_1.prisma.accessReview.findFirst({ where: { tenantId, id } });
        const items = await prisma_js_1.prisma.accessReviewItem.findMany({ where: { tenantId, accessReviewId: id }, include: { user: true, role: true } });
        return { ...review, items };
    },
    async create(tenantId, userId, data) {
        const created = await prisma_js_1.prisma.accessReview.create({ data: { tenantId, reviewName: data.reviewName, status: data.status ?? 'Draft', reviewPeriodStart: data.reviewPeriodStart ?? nowIso(), reviewPeriodEnd: data.reviewPeriodEnd ?? nowIso(), ownerUserId: data.ownerUserId ?? userId, dueDate: data.dueDate ?? nowIso(), createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Created access review', 'AccessReview', created.id, 'High', null, created);
        return created;
    },
    async start(tenantId, id, userId) {
        const current = await prisma_js_1.prisma.accessReview.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.accessReview.update({ where: { id }, data: { status: 'In Progress', updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Started access review', 'AccessReview', id, 'High', current, updated);
        return updated;
    },
    async complete(tenantId, id, userId) {
        const current = await prisma_js_1.prisma.accessReview.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.accessReview.update({ where: { id }, data: { status: 'Completed', updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Completed access review', 'AccessReview', id, 'High', current, updated);
        return updated;
    },
    async updateItem(tenantId, reviewId, itemId, userId, data) {
        const current = await prisma_js_1.prisma.accessReviewItem.findFirst({ where: { tenantId, id: itemId, accessReviewId: reviewId } });
        const updated = await prisma_js_1.prisma.accessReviewItem.update({ where: { id: itemId }, data: { ...data, reviewerUserId: userId, reviewedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Reviewed access item', 'AccessReviewItem', itemId, 'High', current, updated);
        return updated;
    },
};
exports.auditLogService = {
    list: foundationService_js_1.listAuditLogs,
    sensitive: async (tenantId, page = 1, take = 50) => listPaged('sensitiveDataAccessLog', tenantId, page, take, {}, { user: true }),
    sessions: async (tenantId, page = 1, take = 50) => listPaged('sessionLog', tenantId, page, take, {}, { user: true }, { loginAt: 'desc' }),
};
exports.passwordPolicyService = {
    get: (tenantId) => getSingleton('passwordPolicy', tenantId),
    update: (tenantId, userId, data) => upsertSingleton('passwordPolicy', tenantId, data, userId, 'Admin', 'Updated password policy'),
};
exports.mfaPolicyService = {
    get: (tenantId) => getSingleton('mfaPolicy', tenantId),
    update: (tenantId, userId, data) => upsertSingleton('mfaPolicy', tenantId, data, userId, 'Admin', 'Updated MFA policy'),
};
exports.ssoConfigurationService = {
    list: (tenantId) => prisma_js_1.prisma.ssoConfiguration.findMany({ where: { tenantId }, orderBy: { providerName: 'asc' } }),
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.ssoConfiguration.findFirst({ where: { tenantId, id } });
        const updated = current
            ? await prisma_js_1.prisma.ssoConfiguration.update({ where: { id }, data: { ...data, updatedAt: nowIso() } })
            : await prisma_js_1.prisma.ssoConfiguration.create({ data: { tenantId, id, ...data, createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated SSO configuration', 'SsoConfiguration', id, 'High', current, updated);
        return updated;
    },
    test: async (tenantId, userId, id) => {
        const config = await prisma_js_1.prisma.ssoConfiguration.findFirst({ where: { tenantId, id } });
        await writeAudit(tenantId, userId, 'Admin', 'Tested SSO configuration', 'SsoConfiguration', id, 'Normal', null, config);
        return { status: 'Success', providerName: config?.providerName ?? 'Unknown', testedAt: nowIso(), message: 'SSO placeholder test passed.' };
    },
};
exports.securityControlService = {
    list: (tenantId) => prisma_js_1.prisma.securityControl.findMany({ where: { tenantId }, orderBy: [{ framework: 'asc' }, { controlCode: 'asc' }] }),
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.securityControl.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.securityControl.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated security control', 'SecurityControl', id, 'Normal', current, updated);
        return updated;
    },
};
exports.complianceMappingService = {
    list: (tenantId, framework) => prisma_js_1.prisma.complianceFrameworkMapping.findMany({ where: { tenantId, ...(framework ? { framework } : {}) }, orderBy: [{ framework: 'asc' }, { domain: 'asc' }] }),
};
exports.backupPolicyService = {
    get: (tenantId) => getSingleton('backupPolicy', tenantId),
    update: (tenantId, userId, data) => upsertSingleton('backupPolicy', tenantId, data, userId, 'Admin', 'Updated backup policy'),
};
exports.disasterRecoveryService = {
    get: (tenantId) => getSingleton('disasterRecoveryPlan', tenantId),
    update: (tenantId, userId, data) => upsertSingleton('disasterRecoveryPlan', tenantId, data, userId, 'Admin', 'Updated disaster recovery plan'),
    testPlaceholder: async (tenantId, userId) => {
        await writeAudit(tenantId, userId, 'Admin', 'Triggered DR test placeholder', 'DisasterRecoveryPlan', null, 'Normal', null, { testedAt: nowIso() });
        return { status: 'Queued', testedAt: nowIso(), message: 'DR test placeholder queued.' };
    },
};
exports.securityIncidentService = {
    list: (tenantId) => prisma_js_1.prisma.securityIncident.findMany({ where: { tenantId }, orderBy: { detectedAt: 'desc' } }),
    create: async (tenantId, userId, data) => {
        const created = await prisma_js_1.prisma.securityIncident.create({ data: { tenantId, incidentNumber: data.incidentNumber ?? `SEC-${Date.now()}`, title: data.title, severity: data.severity ?? 'Normal', status: data.status ?? 'Open', detectedAt: data.detectedAt ?? nowIso(), containedAt: data.containedAt ?? null, resolvedAt: data.resolvedAt ?? null, ownerUserId: data.ownerUserId ?? userId, summary: data.summary ?? '', impactSummary: data.impactSummary ?? null, resolutionSummary: data.resolutionSummary ?? null, createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Created security incident', 'SecurityIncident', created.id, 'High', null, created);
        await createNotification(tenantId, `Security incident: ${created.title}`, 'A security incident was created and requires review.', 'security.incident', 'user-admin', 'Critical');
        return created;
    },
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.securityIncident.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.securityIncident.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated security incident', 'SecurityIncident', id, 'High', current, updated);
        return updated;
    },
    contain: async (tenantId, userId, id) => {
        const current = await prisma_js_1.prisma.securityIncident.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.securityIncident.update({ where: { id }, data: { status: 'Contained', containedAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Contained security incident', 'SecurityIncident', id, 'High', current, updated);
        return updated;
    },
    resolve: async (tenantId, userId, id) => {
        const current = await prisma_js_1.prisma.securityIncident.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.securityIncident.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Resolved security incident', 'SecurityIncident', id, 'Normal', current, updated);
        return updated;
    },
};
exports.vulnerabilityService = {
    list: (tenantId) => prisma_js_1.prisma.vulnerabilityRecord.findMany({ where: { tenantId }, orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }] }),
    create: async (tenantId, userId, data) => {
        const created = await prisma_js_1.prisma.vulnerabilityRecord.create({ data: { tenantId, vulnerabilityNumber: data.vulnerabilityNumber ?? `VULN-${Date.now()}`, title: data.title, severity: data.severity ?? 'Normal', status: data.status ?? 'Open', source: data.source ?? 'Manual', affectedComponent: data.affectedComponent ?? 'Unknown', detectedAt: data.detectedAt ?? nowIso(), dueDate: data.dueDate ?? null, resolvedAt: data.resolvedAt ?? null, remediationSummary: data.remediationSummary ?? null, createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Created vulnerability', 'VulnerabilityRecord', created.id, 'High', null, created);
        return created;
    },
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.vulnerabilityRecord.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.vulnerabilityRecord.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Updated vulnerability', 'VulnerabilityRecord', id, 'High', current, updated);
        return updated;
    },
    resolve: async (tenantId, userId, id) => {
        const current = await prisma_js_1.prisma.vulnerabilityRecord.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.vulnerabilityRecord.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Admin', 'Resolved vulnerability', 'VulnerabilityRecord', id, 'Normal', current, updated);
        return updated;
    },
};
exports.supportTicketService = {
    list: (tenantId, page = 1, take = 50, filters = {}) => {
        const where = { tenantId };
        if (filters.status)
            where.status = filters.status;
        if (filters.severity)
            where.severity = filters.severity;
        if (filters.module)
            where.module = filters.module;
        return listPaged('supportTicket', tenantId, page, take, where, undefined, { createdAt: 'desc' });
    },
    create: async (tenantId, userId, data) => {
        const created = await prisma_js_1.prisma.supportTicket.create({
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
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.supportTicket.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.supportTicket.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Support', 'Updated support ticket', 'SupportTicket', id, 'Normal', current, updated);
        return updated;
    },
    assign: async (tenantId, userId, id, assignee) => {
        const current = await prisma_js_1.prisma.supportTicket.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.supportTicket.update({ where: { id }, data: { assignedToUserId: assignee, status: 'Assigned', updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Support', 'Assigned support ticket', 'SupportTicket', id, 'Normal', current, updated);
        return updated;
    },
    resolve: async (tenantId, userId, id) => {
        const current = await prisma_js_1.prisma.supportTicket.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.supportTicket.update({ where: { id }, data: { status: 'Resolved', resolvedAt: nowIso(), slaStatus: 'On Track', updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Support', 'Resolved support ticket', 'SupportTicket', id, 'Normal', current, updated);
        return updated;
    },
};
exports.slaService = {
    list: (tenantId) => prisma_js_1.prisma.slaPolicy.findMany({ where: { tenantId }, orderBy: { severity: 'asc' } }),
    update: async (tenantId, userId, id, data) => {
        const current = await prisma_js_1.prisma.slaPolicy.findFirst({ where: { tenantId, id } });
        const updated = await prisma_js_1.prisma.slaPolicy.update({ where: { id }, data: { ...data, updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Support', 'Updated SLA policy', 'SlaPolicy', id, 'Normal', current, updated);
        return updated;
    },
};
exports.escalationService = {
    list: (tenantId) => prisma_js_1.prisma.escalationPath.findMany({ where: { tenantId }, orderBy: [{ severity: 'asc' }, { level: 'asc' }] }),
};
exports.systemStatusService = {
    list: (tenantId) => prisma_js_1.prisma.systemStatusEvent.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' } }),
    create: async (tenantId, userId, data) => {
        const created = await prisma_js_1.prisma.systemStatusEvent.create({ data: { tenantId, componentName: data.componentName, status: data.status ?? 'Healthy', title: data.title, description: data.description ?? '', startedAt: data.startedAt ?? nowIso(), resolvedAt: data.resolvedAt ?? null, impactLevel: data.impactLevel ?? 'Low', createdAt: nowIso(), updatedAt: nowIso() } });
        await writeAudit(tenantId, userId, 'Support', 'Created system status event', 'SystemStatusEvent', created.id, 'Normal', null, created);
        return created;
    },
};
