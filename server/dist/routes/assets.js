"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_js_1 = require("../utils/asyncHandler.js");
const apiResponse_js_1 = require("../utils/apiResponse.js");
const auth_js_1 = require("../middleware/auth.js");
const foundationService_js_1 = require("../services/foundationService.js");
const assetLogisticsService_js_1 = require("../services/assetLogisticsService.js");
const router = (0, express_1.Router)();
const readFilter = (query, key) => {
    const value = query[key];
    return typeof value === 'string' && value.trim() ? value : undefined;
};
router.get('/assets/command-center', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getAssetCommandCenter)(req.user.tenantId), 'Asset command center')));
router.get('/assets/readiness', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getAssetCommandCenter)(req.user.tenantId), 'Asset readiness')));
router.get('/assets/risks', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getAssetRisks)(req.user.tenantId), 'Asset risks')));
router.get('/apparatus', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const items = await (0, assetLogisticsService_js_1.listApparatus)(req.user.tenantId, page, take, {
        stationId: readFilter(req.query, 'stationId'),
        apparatusType: readFilter(req.query, 'apparatusType'),
        status: readFilter(req.query, 'status'),
        readinessRisk: readFilter(req.query, 'readinessRisk'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    });
    (0, apiResponse_js_1.ok)(res, items, 'Apparatus');
}));
router.post('/apparatus', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createApparatus)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Apparatus created')));
router.get('/apparatus/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getApparatusDetail)(req.user.tenantId, String(req.params.id)), 'Apparatus detail')));
router.put('/apparatus/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.updateApparatus)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Apparatus updated')));
router.get('/apparatus/:id/360', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getApparatus360)(req.user.tenantId, String(req.params.id)), 'Apparatus 360')));
router.get('/apparatus/:id/maintenance', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listApparatusMaintenance)(req.user.tenantId, String(req.params.id)), 'Apparatus maintenance')));
router.get('/apparatus/:id/inventory', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listApparatusInventory)(req.user.tenantId, String(req.params.id)), 'Apparatus inventory')));
router.get('/apparatus/:id/readiness', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('apparatus.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getApparatusReadiness)(req.user.tenantId, String(req.params.id)), 'Apparatus readiness')));
router.get('/assets', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const items = await (0, assetLogisticsService_js_1.listAssets)(req.user.tenantId, page, take, {
        stationId: readFilter(req.query, 'stationId'),
        apparatusType: readFilter(req.query, 'apparatusType'),
        status: readFilter(req.query, 'status'),
        readinessRisk: readFilter(req.query, 'readinessRisk'),
        category: readFilter(req.query, 'category'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    });
    (0, apiResponse_js_1.ok)(res, items, 'Assets');
}));
router.post('/assets', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createAsset)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Asset created')));
router.get('/assets/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getAssetDetail)(req.user.tenantId, String(req.params.id)), 'Asset detail')));
router.put('/assets/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.updateAsset)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Asset updated')));
router.get('/assets/:id/history', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('assets.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getAssetHistory)(req.user.tenantId, String(req.params.id)), 'Asset history')));
router.get('/inventory', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    const items = await (0, assetLogisticsService_js_1.listInventory)(req.user.tenantId, page, take, {
        stationId: readFilter(req.query, 'stationId'),
        category: readFilter(req.query, 'category'),
        status: readFilter(req.query, 'status'),
        search: readFilter(req.query, 'search') ?? readFilter(req.query, 'q'),
    });
    (0, apiResponse_js_1.ok)(res, items, 'Inventory');
}));
router.post('/inventory', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createInventory)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Inventory item created')));
router.get('/inventory/low-stock', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listLowStockInventory)(req.user.tenantId), 'Low stock items')));
router.get('/inventory/expiring', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listExpiringInventory)(req.user.tenantId), 'Expiring items')));
router.get('/inventory/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listInventory)(req.user.tenantId, 1, 500).then((result) => result.items.find((item) => item.id === req.params.id) ?? null), 'Inventory detail')));
router.put('/inventory/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.updateInventory)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Inventory updated')));
router.post('/inventory/transactions', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createInventoryTransaction)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Inventory transaction created')));
router.get('/inventory/transactions', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listInventoryTransactions)(req.user.tenantId, page, take), 'Inventory transactions');
}));
router.get('/maintenance-events', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listMaintenanceEvents)(req.user.tenantId, page, take), 'Maintenance events');
}));
router.post('/maintenance-events', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createMaintenanceEvent)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Maintenance event created')));
router.get('/maintenance-events/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getMaintenanceEvent)(req.user.tenantId, String(req.params.id)), 'Maintenance event')));
router.put('/maintenance-events/:id', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.updateMaintenanceEvent)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Maintenance event updated')));
router.post('/maintenance-events/:id/schedule', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.scheduleMaintenanceEvent)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Maintenance scheduled')));
router.post('/maintenance-events/:id/start', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.startMaintenanceEvent)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Maintenance started')));
router.post('/maintenance-events/:id/complete', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.completeMaintenanceEvent)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Maintenance completed')));
router.post('/maintenance-events/:id/defer', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.deferMaintenanceEvent)(req.user.tenantId, String(req.params.id), req.user.userId, req.body ?? {}), 'Maintenance deferred')));
router.get('/preventive-maintenance', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listPreventiveMaintenance)(req.user.tenantId, page, take), 'Preventive maintenance');
}));
router.post('/preventive-maintenance', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createPreventiveMaintenance)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Preventive maintenance created')));
router.get('/preventive-maintenance/due', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listDuePreventiveMaintenance)(req.user.tenantId), 'Preventive maintenance due')));
router.post('/preventive-maintenance/:id/complete', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('maintenance.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.completePreventiveMaintenance)(req.user.tenantId, String(req.params.id), req.user.userId), 'Preventive maintenance completed')));
router.get('/vendors', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('vendors.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listVendors)(req.user.tenantId, page, take), 'Vendors');
}));
router.post('/vendors', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('vendors.manage'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.created)(res, await (0, assetLogisticsService_js_1.createVendor)(req.user.tenantId, req.user.userId, req.body ?? {}), 'Vendor created')));
router.get('/reorder-recommendations', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('inventory.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => {
    const { page, take } = (0, foundationService_js_1.getPagination)(req.query);
    (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listReorderRecommendations)(req.user.tenantId, page, take), 'Reorder recommendations');
}));
router.post('/reorder-recommendations/:id/approve', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('reorder.approve'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.approveReorderRecommendation)(req.user.tenantId, String(req.params.id), req.user.userId), 'Reorder approved')));
router.post('/reorder-recommendations/:id/reject', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('reorder.approve'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.rejectReorderRecommendation)(req.user.tenantId, String(req.params.id), req.user.userId), 'Reorder rejected')));
router.get('/stations/:id/assets', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('stations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.listStationAssets)(req.user.tenantId, String(req.params.id)), 'Station assets')));
router.get('/stations/:id/asset-readiness', auth_js_1.authRequired, (0, auth_js_1.requirePermission)('stations.view'), (0, asyncHandler_js_1.asyncHandler)(async (req, res) => (0, apiResponse_js_1.ok)(res, await (0, assetLogisticsService_js_1.getStationAssetSummary)(req.user.tenantId, String(req.params.id)), 'Station asset readiness')));
exports.default = router;
