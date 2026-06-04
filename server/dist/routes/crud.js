"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crudRouter = crudRouter;
const express_1 = require("express");
const prisma_js_1 = require("../utils/prisma.js");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const safeTake = (value) => Math.min(Number(value || 50), 100);
function crudRouter(delegateName, permissionPrefix) {
    const router = (0, express_1.Router)();
    router.use(auth_js_1.authRequired);
    const delegate = prisma_js_1.prisma[delegateName];
    router.get('/', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
        const page = Math.max(Number(req.query.page || 1), 1);
        const take = safeTake(req.query.take);
        const skip = (page - 1) * take;
        const where = req.user?.tenantId ? { tenantId: req.user.tenantId } : {};
        const [items, total] = await Promise.all([delegate.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }).catch(() => delegate.findMany({ where, take, skip })), delegate.count({ where }).catch(() => 0)]);
        (0, apiResponse_js_1.ok)(res, { items, page, take, total }, `${permissionPrefix} list`);
    }));
    router.get('/:id', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
        const where = { id: req.params.id };
        const item = await delegate.findFirst({ where: { ...where, tenantId: req.user?.tenantId } }).catch(() => delegate.findUnique({ where }));
        (0, apiResponse_js_1.ok)(res, item, `${permissionPrefix} detail`);
    }));
    router.post('/', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
        const data = { ...req.body, tenantId: req.user?.tenantId };
        const item = await delegate.create({ data });
        (0, apiResponse_js_1.created)(res, item, `${permissionPrefix} created`);
    }));
    router.put('/:id', (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
        const item = await delegate.update({ where: { id: req.params.id }, data: req.body });
        (0, apiResponse_js_1.ok)(res, item, `${permissionPrefix} updated`);
    }));
    return router;
}
