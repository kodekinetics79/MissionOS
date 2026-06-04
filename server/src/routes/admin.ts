import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import {
  accessReviewService,
  auditLogService,
  backupPolicyService,
  complianceMappingService,
  disasterRecoveryService,
  escalationService,
  mfaPolicyService,
  passwordPolicyService,
  permissionService,
  rbacMatrixService,
  roleService,
  securityControlService,
  securityIncidentService,
  ssoConfigurationService,
  tenantAdminService,
  trustCenterSummaryService,
  userAdminService,
  vulnerabilityService,
} from '../services/adminService.js';
import { prisma } from '../utils/prisma.js';

const router = Router();
router.use(authRequired);

const readString = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined);
const nowIso = () => new Date().toISOString();

router.get('/trust-center', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await trustCenterSummaryService.getSummary(req.user!.tenantId), 'Trust center')));
router.get('/security-summary', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await trustCenterSummaryService.getSummary(req.user!.tenantId), 'Security summary')));
router.get('/compliance-summary', requirePermission('admin.compliance.view'), asyncHandler(async (req, res) => ok(res, await trustCenterSummaryService.getSummary(req.user!.tenantId), 'Compliance summary')));
router.get('/sla-summary', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, await trustCenterSummaryService.getSummary(req.user!.tenantId), 'SLA summary')));

// Multi-tenant module configuration (tenant-scoped, persisted via the store).
router.get('/tenant-config', requirePermission('admin.security.view'), asyncHandler(async (req, res) => {
  const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : req.user!.tenantId;
  const rows = await prisma.tenantModuleConfig.findMany({ where: { id: `modules-${tenantId}` } });
  ok(res, { tenantId, modules: rows[0]?.modules ?? null }, 'Tenant module configuration');
}));
router.post('/tenant-config', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => {
  const tenantId = String((req.body ?? {}).tenantId ?? req.user!.tenantId);
  const modules = (req.body ?? {}).modules ?? {};
  const saved = await prisma.tenantModuleConfig.create({ data: { id: `modules-${tenantId}`, tenantId, modules } });
  await prisma.auditLog.create({ data: { tenantId: req.user!.tenantId, userId: req.user!.userId ?? null, action: 'TENANT_MODULE_CONFIG_SAVED', entityName: 'TenantModuleConfig', entityId: tenantId, before: null as any, after: { modules } as any, createdAt: new Date().toISOString() as any } });
  ok(res, { tenantId, modules: saved.modules, message: 'Tenant module configuration saved.' }, 'Tenant module configuration saved');
}));

router.get('/tenant', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await tenantAdminService.getTenant(req.user!.tenantId), 'Tenant')));
router.put('/tenant', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await tenantAdminService.updateTenant(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Tenant updated')));

router.get('/users', requirePermission('admin.users.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const data = await userAdminService.list(req.user!.tenantId, page, take, {
    search: readString(req.query.search ?? req.query.q),
    roleId: readString(req.query.roleId),
    status: readString(req.query.status),
    mfa: readString(req.query.mfa),
    ssoProvider: readString(req.query.ssoProvider),
  });
  ok(res, data, 'Users');
}));
router.post('/users', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => created(res, await userAdminService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'User created')));
router.get('/users/:id', requirePermission('admin.users.view'), asyncHandler(async (req, res) => ok(res, await userAdminService.get(req.user!.tenantId, String(req.params.id)), 'User')));
router.put('/users/:id', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.update(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'User updated')));
router.post('/users/:id/disable', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.setStatus(req.user!.tenantId, String(req.params.id), req.user!.userId, 'Disabled'), 'User disabled')));
router.post('/users/:id/enable', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.setStatus(req.user!.tenantId, String(req.params.id), req.user!.userId, 'Active'), 'User enabled')));
router.post('/users/:id/lock', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.setStatus(req.user!.tenantId, String(req.params.id), req.user!.userId, 'Locked'), 'User locked')));
router.post('/users/:id/unlock', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.setStatus(req.user!.tenantId, String(req.params.id), req.user!.userId, 'Active'), 'User unlocked')));
router.post('/users/:id/roles', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.assignRoles(req.user!.tenantId, String(req.params.id), req.user!.userId, Array.isArray(req.body?.roleIds) ? req.body.roleIds : []), 'Roles assigned')));
router.delete('/users/:id/roles/:roleId', requirePermission('admin.users.manage'), asyncHandler(async (req, res) => ok(res, await userAdminService.removeRole(req.user!.tenantId, String(req.params.id), String(req.params.roleId), req.user!.userId), 'Role removed')));

router.get('/roles', requirePermission('admin.roles.view'), asyncHandler(async (req, res) => ok(res, { items: await roleService.list(req.user!.tenantId), page: 1, take: 50, total: 1 }, 'Roles')));
router.post('/roles', requirePermission('admin.roles.manage'), asyncHandler(async (req, res) => created(res, await roleService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Role created')));
router.get('/roles/:id', requirePermission('admin.roles.view'), asyncHandler(async (req, res) => ok(res, await roleService.get(req.user!.tenantId, String(req.params.id)), 'Role')));
router.put('/roles/:id', requirePermission('admin.roles.manage'), asyncHandler(async (req, res) => ok(res, await roleService.update(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Role updated')));
router.post('/roles/:id/permissions', requirePermission('admin.roles.manage'), asyncHandler(async (req, res) => ok(res, await roleService.addPermission(req.user!.tenantId, String(req.params.id), String(req.body?.permissionId), req.user!.userId), 'Permission granted')));
router.delete('/roles/:id/permissions/:permissionId', requirePermission('admin.roles.manage'), asyncHandler(async (req, res) => ok(res, await roleService.removePermission(req.user!.tenantId, String(req.params.id), String(req.params.permissionId), req.user!.userId), 'Permission removed')));

router.get('/permissions', requirePermission('admin.permissions.view'), asyncHandler(async (_req, res) => ok(res, { items: await permissionService.list() }, 'Permissions')));
router.get('/rbac-matrix', requirePermission('admin.permissions.view'), asyncHandler(async (req, res) => ok(res, await rbacMatrixService.getMatrix(req.user!.tenantId), 'RBAC matrix')));

router.get('/access-reviews', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, { items: await accessReviewService.list(req.user!.tenantId) }, 'Access reviews')));
router.post('/access-reviews', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => created(res, await accessReviewService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Access review created')));
router.get('/access-reviews/:id', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await accessReviewService.get(req.user!.tenantId, String(req.params.id)), 'Access review')));
router.post('/access-reviews/:id/start', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await accessReviewService.start(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Access review started')));
router.post('/access-reviews/:id/complete', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await accessReviewService.complete(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Access review completed')));
router.put('/access-reviews/:id/items/:itemId', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await accessReviewService.updateItem(req.user!.tenantId, String(req.params.id), String(req.params.itemId), req.user!.userId, req.body ?? {}), 'Access review item updated')));

router.get('/audit-logs', requirePermission('admin.audit.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await auditLogService.list(req.user!.tenantId, page, take), 'Audit logs');
}));
router.get('/sensitive-access-logs', requirePermission('admin.audit.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await auditLogService.sensitive(req.user!.tenantId, page, take), 'Sensitive access logs');
}));
router.get('/session-logs', requirePermission('admin.audit.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await auditLogService.sessions(req.user!.tenantId, page, take), 'Session logs');
}));

router.get('/password-policy', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await passwordPolicyService.get(req.user!.tenantId), 'Password policy')));
router.put('/password-policy', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await passwordPolicyService.update(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Password policy updated')));
router.get('/mfa-policy', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, await mfaPolicyService.get(req.user!.tenantId), 'MFA policy')));
router.put('/mfa-policy', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await mfaPolicyService.update(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'MFA policy updated')));
router.get('/sso', requirePermission('admin.security.view'), asyncHandler(async (req, res) => ok(res, { items: await ssoConfigurationService.list(req.user!.tenantId) }, 'SSO configuration')));
router.put('/sso', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await ssoConfigurationService.update(req.user!.tenantId, req.user!.userId, String(req.body?.id ?? 'sso-entra'), req.body ?? {}), 'SSO updated')));
router.post('/sso/test', requirePermission('admin.security.manage'), asyncHandler(async (req, res) => ok(res, await ssoConfigurationService.test(req.user!.tenantId, req.user!.userId, String(req.body?.id ?? 'sso-entra')), 'SSO test complete')));

router.get('/security-controls', requirePermission('admin.compliance.view'), asyncHandler(async (req, res) => ok(res, { items: await securityControlService.list(req.user!.tenantId) }, 'Security controls')));
router.put('/security-controls/:id', requirePermission('admin.compliance.manage'), asyncHandler(async (req, res) => ok(res, await securityControlService.update(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Security control updated')));
router.get('/compliance-mapping', requirePermission('admin.compliance.view'), asyncHandler(async (req, res) => ok(res, { items: await complianceMappingService.list(req.user!.tenantId) }, 'Compliance mapping')));
router.get('/compliance-mapping/:framework', requirePermission('admin.compliance.view'), asyncHandler(async (req, res) => ok(res, { items: await complianceMappingService.list(req.user!.tenantId, String(req.params.framework)) }, 'Compliance mapping')));

router.get('/backup-policy', requirePermission('admin.backup.view'), asyncHandler(async (req, res) => ok(res, await backupPolicyService.get(req.user!.tenantId), 'Backup policy')));
router.put('/backup-policy', requirePermission('admin.backup.manage'), asyncHandler(async (req, res) => ok(res, await backupPolicyService.update(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Backup policy updated')));
router.get('/dr-plan', requirePermission('admin.backup.view'), asyncHandler(async (req, res) => ok(res, await disasterRecoveryService.get(req.user!.tenantId), 'DR plan')));
router.put('/dr-plan', requirePermission('admin.backup.manage'), asyncHandler(async (req, res) => ok(res, await disasterRecoveryService.update(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'DR plan updated')));
router.post('/dr-plan/test-placeholder', requirePermission('admin.backup.manage'), asyncHandler(async (req, res) => ok(res, await disasterRecoveryService.testPlaceholder(req.user!.tenantId, req.user!.userId), 'DR test queued')));

router.get('/security-incidents', requirePermission('admin.incidents.manage'), asyncHandler(async (req, res) => ok(res, { items: await securityIncidentService.list(req.user!.tenantId) }, 'Security incidents')));
router.post('/security-incidents', requirePermission('admin.incidents.manage'), asyncHandler(async (req, res) => created(res, await securityIncidentService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Security incident created')));
router.put('/security-incidents/:id', requirePermission('admin.incidents.manage'), asyncHandler(async (req, res) => ok(res, await securityIncidentService.update(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Security incident updated')));
router.post('/security-incidents/:id/contain', requirePermission('admin.incidents.manage'), asyncHandler(async (req, res) => ok(res, await securityIncidentService.contain(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Security incident contained')));
router.post('/security-incidents/:id/resolve', requirePermission('admin.incidents.manage'), asyncHandler(async (req, res) => ok(res, await securityIncidentService.resolve(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Security incident resolved')));

router.get('/vulnerabilities', requirePermission('admin.vulnerabilities.manage'), asyncHandler(async (req, res) => ok(res, { items: await vulnerabilityService.list(req.user!.tenantId) }, 'Vulnerabilities')));
router.post('/vulnerabilities', requirePermission('admin.vulnerabilities.manage'), asyncHandler(async (req, res) => created(res, await vulnerabilityService.create(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Vulnerability created')));
router.put('/vulnerabilities/:id', requirePermission('admin.vulnerabilities.manage'), asyncHandler(async (req, res) => ok(res, await vulnerabilityService.update(req.user!.tenantId, req.user!.userId, String(req.params.id), req.body ?? {}), 'Vulnerability updated')));
router.post('/vulnerabilities/:id/resolve', requirePermission('admin.vulnerabilities.manage'), asyncHandler(async (req, res) => ok(res, await vulnerabilityService.resolve(req.user!.tenantId, req.user!.userId, String(req.params.id)), 'Vulnerability resolved')));

router.get('/support-queue', requirePermission('support.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await prisma.supportTicket.findMany({ where: { tenantId: req.user!.tenantId }, take, skip: (page - 1) * take, orderBy: { createdAt: 'desc' } }), 'Support queue');
}));

router.get('/escalation-paths', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, { items: await escalationService.list(req.user!.tenantId) }, 'Escalation paths')));
router.get('/system-status', requirePermission('support.view'), asyncHandler(async (req, res) => ok(res, { items: await prisma.systemStatusEvent.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { startedAt: 'desc' } }) }, 'System status')));
router.post('/system-status', requirePermission('support.manage'), asyncHandler(async (req, res) => created(res, await prisma.systemStatusEvent.create({ data: { tenantId: req.user!.tenantId, ...req.body, createdAt: nowIso(), updatedAt: nowIso() } }), 'System status event created')));

export default router;
