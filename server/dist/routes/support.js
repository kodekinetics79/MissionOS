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
router.get('/tickets', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const filters = {
        status: typeof req.query.status === 'string' ? req.query.status : undefined,
        severity: typeof req.query.severity === 'string' ? req.query.severity : undefined,
        module: typeof req.query.module === 'string' ? req.query.module : undefined,
    };
    (0, apiResponse_js_1.ok)(res, await adminService_js_1.supportTicketService.list(req.user.tenantId, page, take, filters), 'Support tickets');
}));
router.post('/tickets', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.supportTicketService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'Support ticket created')));
router.get('/tickets/:id', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await prisma_js_1.prisma.supportTicket.findFirst({ where: { tenantId: req.user.tenantId, id: String(req.params.id) } }), 'Support ticket')));
router.put('/tickets/:id', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.supportTicketService.update(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'Support ticket updated')));
router.post('/tickets/:id/assign', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.supportTicketService.assign(req.user.tenantId, req.user.userId, String(req.params.id), String(req.body?.assignedToUserId ?? req.user.userId)), 'Support ticket assigned')));
router.post('/tickets/:id/resolve', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.supportTicketService.resolve(req.user.tenantId, req.user.userId, String(req.params.id)), 'Support ticket resolved')));
router.get('/sla-policies', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.slaService.list(req.user.tenantId) }, 'SLA policies')));
router.put('/sla-policies/:id', (0, auth_js_1.requirePermission)('support.sla.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await adminService_js_1.slaService.update(req.user.tenantId, req.user.userId, String(req.params.id), req.body ?? {}), 'SLA policy updated')));
router.get('/escalation-paths', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.escalationService.list(req.user.tenantId) }, 'Escalation paths')));
router.get('/system-status', (0, auth_js_1.requirePermission)('support.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, { items: await adminService_js_1.systemStatusService.list(req.user.tenantId) }, 'System status')));
router.post('/system-status', (0, auth_js_1.requirePermission)('support.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await adminService_js_1.systemStatusService.create(req.user.tenantId, req.user.userId, req.body ?? {}), 'System status event created')));
exports.default = router;
