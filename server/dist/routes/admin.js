"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const adminService_js_1 = require("../services/adminService.js");
const prisma_js_1 = require("../utils/prisma.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.authRequired);
const readString = (value) => (typeof value === 'string' && value.trim() ? value : undefined);
const nowIso = () => new Date().toISOString();
router.get('/trust-center', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.trustCenterSummaryService.getSummary(req.user.tenantId), 'Trust center')));
router.get('/security-summary', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.trustCenterSummaryService.getSummary(req.user.tenantId), 'Security summary')));
router.get('/compliance-summary', (0, auth_js_1.requirePermission)('admin.compliance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.trustCenterSummaryService.getSummary(req.user.tenantId), 'Compliance summary')));
router.get('/sla-summary', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.trustCenterSummaryService.getSummary(req.user.tenantId), 'SLA summary')));
// Multi-tenant module configuration (tenant-scoped, persisted via the store).
router.get('/tenant-config', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : req.user.tenantId;
    const rows = await prisma_js_1.prisma.tenantModuleConfig.findMany({ where: { id: `modules-${tenantId}` } });
    (0, apiResponse_js_1.ok)(res, { tenantId, modules: rows[0]?.modules ?? null }, 'Tenant module configuration');
}));
router.post('/tenant-config', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const tenantId = String((req.body ?? {}).tenantId ?? req.user.tenantId);
    const modules = (req.body ?? {}).modules ?? {};
    const saved = await prisma_js_1.prisma.tenantModuleConfig.create({ data: { id: `modules-${tenantId}`, tenantId, modules } });
    await prisma_js_1.prisma.auditLog.create({ data: { tenantId: req.user.tenantId, userId: req.user.userId ?? null, action: 'TENANT_MODULE_CONFIG_SAVED', entityName: 'TenantModuleConfig', entityId: tenantId, before: null, after: { modules }, createdAt: new Date().toISOString() } });
    (0, apiResponse_js_1.ok)(res, { tenantId, modules: saved.modules, message: 'Tenant module configuration saved.' }, 'Tenant module configuration saved');
}));
router.get('/tenant', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.tenantAdminService.getTenant(req.user.tenantId), 'Tenant')));
router.put('/tenant', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.tenantAdminService.updateTenant(req.user.tenantId, req.user.userId, req.body ?? {}), 'Tenant updated')));
router.get('/users', (0, auth_js_1.requirePermission)('admin.users.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const data = await adminService_js_1.userAdminService.list(req.user.tenantId, page, take, {
        search: readString(req.query.search ?? req.query.q),
        roleId: readString(req.query.roleId),
        status: readString(req.query.status),
        mfa: readString(req.query.mfa),
        ssoProvider: readString(req.query.ssoProvider),
    });
    (0, apiResponse_js_1.ok)(res, data, 'Users');
}));
router.post('/users', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.userAdminService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'User created')));
router.get('/users/:id', (0, auth_js_1.requirePermission)('admin.users.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.get(req.user.tenantId, String(req.params.id)), 'User')));
router.put('/users/:id', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.update(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'User updated')));
router.post('/users/:id/disable', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.setStatus(req.user.tenantId, String(req.params.id), req.user.userId, 'Disabled'), 'User disabled')));
router.post('/users/:id/enable', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.setStatus(req.user.tenantId, String(req.params.id), req.user.userId, 'Active'), 'User enabled')));
router.post('/users/:id/lock', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.setStatus(req.user.tenantId, String(req.params.id), req.user.userId, 'Locked'), 'User locked')));
router.post('/users/:id/unlock', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.setStatus(req.user.tenantId, String(req.params.id), req.user.userId, 'Active'), 'User unlocked')));
router.post('/users/:id/roles', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.assignRoles(req.user.tenantId, String(req.params.id), req.user.userId, Array.isArray(req.body?.roleIds) ? req.body.roleIds : []), 'Roles assigned')));
router.delete('/users/:id/roles/:roleId', (0, auth_js_1.requirePermission)('admin.users.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.userAdminService.removeRole(req.user.tenantId, String(req.params.id), String(req.params.roleId), req.user.userId), 'Role removed')));
router.get('/roles', (0, auth_js_1.requirePermission)('admin.roles.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.roleService.list(req.user.tenantId), page: 1, take: 50, total: 1 }, 'Roles')));
router.post('/roles', (0, auth_js_1.requirePermission)('admin.roles.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.roleService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'Role created')));
router.get('/roles/:id', (0, auth_js_1.requirePermission)('admin.roles.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.roleService.get(req.user.tenantId, String(req.params.id)), 'Role')));
router.put('/roles/:id', (0, auth_js_1.requirePermission)('admin.roles.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.roleService.update(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Role updated')));
router.post('/roles/:id/permissions', (0, auth_js_1.requirePermission)('admin.roles.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.roleService.addPermission(req.user.tenantId, String(req.params.id), String(req.body?.permissionId), req.user.userId), 'Permission granted')));
router.delete('/roles/:id/permissions/:permissionId', (0, auth_js_1.requirePermission)('admin.roles.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.roleService.removePermission(req.user.tenantId, String(req.params.id), String(req.params.permissionId), req.user.userId), 'Permission removed')));
router.get('/permissions', (0, auth_js_1.requirePermission)('admin.permissions.view'), (0, asyncHandler_js_1.asyncHandler)(async (_req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.permissionService.list() }, 'Permissions')));
router.get('/rbac-matrix', (0, auth_js_1.requirePermission)('admin.permissions.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.rbacMatrixService.getMatrix(req.user.tenantId), 'RBAC matrix')));
router.get('/access-reviews', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.accessReviewService.list(req.user.tenantId) }, 'Access reviews')));
router.post('/access-reviews', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.accessReviewService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'Access review created')));
router.get('/access-reviews/:id', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.accessReviewService.get(req.user.tenantId, String(req.params.id)), 'Access review')));
router.post('/access-reviews/:id/start', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.accessReviewService.start(req.user.tenantId, String(req.params.id), req.user.userId), 'Access review started')));
router.post('/access-reviews/:id/complete', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.accessReviewService.complete(req.user.tenantId, String(req.params.id), req.user.userId), 'Access review completed')));
router.put('/access-reviews/:id/items/:itemId', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.accessReviewService.updateItem(req.user.tenantId, String(req.params.id), String(req.params.itemId), req.user.userId, req.body ?? {}), 'Access review item updated')));
router.get('/audit-logs', (0, auth_js_1.requirePermission)('admin.audit.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await adminService_js_1.auditLogService.list(req.user.tenantId, page, take), 'Audit logs');
}));
router.get('/sensitive-access-logs', (0, auth_js_1.requirePermission)('admin.audit.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await adminService_js_1.auditLogService.sensitive(req.user.tenantId, page, take), 'Sensitive access logs');
}));
router.get('/session-logs', (0, auth_js_1.requirePermission)('admin.audit.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await adminService_js_1.auditLogService.sessions(req.user.tenantId, page, take), 'Session logs');
}));
router.get('/password-policy', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.passwordPolicyService.get(req.user.tenantId), 'Password policy')));
router.put('/password-policy', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.passwordPolicyService.update(req.user.tenantId, req.user.userId, req.body ?? {}), 'Password policy updated')));
router.get('/mfa-policy', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.mfaPolicyService.get(req.user.tenantId), 'MFA policy')));
router.put('/mfa-policy', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.mfaPolicyService.update(req.user.tenantId, req.user.userId, req.body ?? {}), 'MFA policy updated')));
router.get('/sso', (0, auth_js_1.requirePermission)('admin.security.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.ssoConfigurationService.list(req.user.tenantId) }, 'SSO configuration')));
router.put('/sso', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.ssoConfigurationService.update(req.user.tenantId, req.user.userId, String(req.body?.id ?? 'sso-entra'), req.body ?? {}), 'SSO updated')));
router.post('/sso/test', (0, auth_js_1.requirePermission)('admin.security.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.ssoConfigurationService.test(req.user.tenantId, req.user.userId, String(req.body?.id ?? 'sso-entra')), 'SSO test complete')));
router.get('/security-controls', (0, auth_js_1.requirePermission)('admin.compliance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.securityControlService.list(req.user.tenantId) }, 'Security controls')));
router.put('/security-controls/:id', (0, auth_js_1.requirePermission)('admin.compliance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.securityControlService.update(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Security control updated')));
router.get('/compliance-mapping', (0, auth_js_1.requirePermission)('admin.compliance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.complianceMappingService.list(req.user.tenantId) }, 'Compliance mapping')));
router.get('/compliance-mapping/:framework', (0, auth_js_1.requirePermission)('admin.compliance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.complianceMappingService.list(req.user.tenantId, String(req.params.framework)) }, 'Compliance mapping')));
router.get('/backup-policy', (0, auth_js_1.requirePermission)('admin.backup.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.backupPolicyService.get(req.user.tenantId), 'Backup policy')));
router.put('/backup-policy', (0, auth_js_1.requirePermission)('admin.backup.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.backupPolicyService.update(req.user.tenantId, req.user.userId, req.body ?? {}), 'Backup policy updated')));
router.get('/dr-plan', (0, auth_js_1.requirePermission)('admin.backup.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.disasterRecoveryService.get(req.user.tenantId), 'DR plan')));
router.put('/dr-plan', (0, auth_js_1.requirePermission)('admin.backup.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.disasterRecoveryService.update(req.user.tenantId, req.user.userId, req.body ?? {}), 'DR plan updated')));
router.post('/dr-plan/test-placeholder', (0, auth_js_1.requirePermission)('admin.backup.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.disasterRecoveryService.testPlaceholder(req.user.tenantId, req.user.userId), 'DR test queued')));
router.get('/security-incidents', (0, auth_js_1.requirePermission)('admin.incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.securityIncidentService.list(req.user.tenantId) }, 'Security incidents')));
router.post('/security-incidents', (0, auth_js_1.requirePermission)('admin.incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.securityIncidentService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'Security incident created')));
router.put('/security-incidents/:id', (0, auth_js_1.requirePermission)('admin.incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.securityIncidentService.update(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Security incident updated')));
router.post('/security-incidents/:id/contain', (0, auth_js_1.requirePermission)('admin.incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.securityIncidentService.contain(req.user.tenantId, req.user.userId, String(req.params.id)), 'Security incident contained')));
router.post('/security-incidents/:id/resolve', (0, auth_js_1.requirePermission)('admin.incidents.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.securityIncidentService.resolve(req.user.tenantId, req.user.userId, String(req.params.id)), 'Security incident resolved')));
router.get('/vulnerabilities', (0, auth_js_1.requirePermission)('admin.vulnerabilities.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.vulnerabilityService.list(req.user.tenantId) }, 'Vulnerabilities')));
router.post('/vulnerabilities', (0, auth_js_1.requirePermission)('admin.vulnerabilities.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.vulnerabilityService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'Vulnerability created')));
router.put('/vulnerabilities/:id', (0, auth_js_1.requirePermission)('admin.vulnerabilities.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.vulnerabilityService.update(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Vulnerability updated')));
router.post('/vulnerabilities/:id/resolve', (0, auth_js_1.requirePermission)('admin.vulnerabilities.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.vulnerabilityService.resolve(req.user.tenantId, req.user.userId, String(req.params.id)), 'Vulnerability resolved')));
router.get('/support-queue', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await prisma_js_1.prisma.supportTicket.findMany({ where: { tenantId: req.user.tenantId }, take, skip: (page - 1) * take, orderBy: { createdAt: 'desc' } }), 'Support queue');
}));
router.get('/escalation-paths', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.escalationService.list(req.user.tenantId) }, 'Escalation paths')));
router.get('/system-status', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await prisma_js_1.prisma.systemStatusEvent.findMany({ where: { tenantId: req.user.tenantId }, orderBy: { startedAt: 'desc' } }) }, 'System status')));
router.post('/system-status', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await prisma_js_1.prisma.systemStatusEvent.create({ data: { tenantId: req.user.tenantId, ...req.body, createdAt: nowIso(), updatedAt: nowIso() } }), 'System status event created')));
exports.default = router;
