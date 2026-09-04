import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { created, ok } from '../utils/apiResponse.js';
import { authRequired, requirePermission } from '../middleware/auth.js';
import { getPagination } from '../services/foundationService.js';
import {
  approveReorderRecommendation,
  completeMaintenanceEvent,
  completePreventiveMaintenance,
  createApparatus,
  createAsset,
  createInventory,
  createInventoryTransaction,
  createMaintenanceEvent,
  createPreventiveMaintenance,
  createVendor,
  deferMaintenanceEvent,
  getApparatus360,
  getApparatusDetail,
  getApparatusReadiness,
  getAssetCommandCenter,
  getAssetDetail,
  getAssetHistory,
  getAssetRisks,
  getMaintenanceEvent,
  getStationAssetSummary,
  listApparatus,
  listApparatusInventory,
  listApparatusMaintenance,
  listAssets,
  listDuePreventiveMaintenance,
  listExpiringInventory,
  listLowStockInventory,
  listInventory,
  listInventoryTransactions,
  listMaintenanceEvents,
  listPreventiveMaintenance,
  listReorderRecommendations,
  listStationAssets,
  listVendors,
  rejectReorderRecommendation,
  scheduleMaintenanceEvent,
  startMaintenanceEvent,
  updateApparatus,
  updateAsset,
  updateInventory,
  updateMaintenanceEvent,
} from '../services/assetLogisticsService.js';

const router = Router();

const readFilter = (query: Record<string, unknown>, key: string) => {
  const value = query[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
};

router.get('/assets/command-center', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => ok(res, await getAssetCommandCenter(req.user!.tenantId), 'Asset command center')));
router.get('/assets/readiness', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => ok(res, await getAssetCommandCenter(req.user!.tenantId), 'Asset readiness')));
router.get('/assets/risks', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => ok(res, await getAssetRisks(req.user!.tenantId), 'Asset risks')));

router.get('/apparatus', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const items = await listApparatus(req.user!.tenantId, page, take, {
    stationId: readFilter(req.query as Record<string, unknown>, 'stationId'),
    apparatusType: readFilter(req.query as Record<string, unknown>, 'apparatusType'),
    status: readFilter(req.query as Record<string, unknown>, 'status'),
    readinessRisk: readFilter(req.query as Record<string, unknown>, 'readinessRisk'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  });
  ok(res, items, 'Apparatus');
}));
router.post('/apparatus', authRequired, requirePermission('apparatus.manage'), asyncHandler(async (req, res) => created(res, await createApparatus(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Apparatus created')));
router.get('/apparatus/:id', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => ok(res, await getApparatusDetail(req.user!.tenantId, String(req.params.id)), 'Apparatus detail')));
router.put('/apparatus/:id', authRequired, requirePermission('apparatus.manage'), asyncHandler(async (req, res) => ok(res, await updateApparatus(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Apparatus updated')));
router.get('/apparatus/:id/360', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => ok(res, await getApparatus360(req.user!.tenantId, String(req.params.id)), 'Apparatus 360')));
router.get('/apparatus/:id/maintenance', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => ok(res, await listApparatusMaintenance(req.user!.tenantId, String(req.params.id)), 'Apparatus maintenance')));
router.get('/apparatus/:id/inventory', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => ok(res, await listApparatusInventory(req.user!.tenantId, String(req.params.id)), 'Apparatus inventory')));
router.get('/apparatus/:id/readiness', authRequired, requirePermission('apparatus.view'), asyncHandler(async (req, res) => ok(res, await getApparatusReadiness(req.user!.tenantId, String(req.params.id)), 'Apparatus readiness')));

router.get('/assets', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const items = await listAssets(req.user!.tenantId, page, take, {
    stationId: readFilter(req.query as Record<string, unknown>, 'stationId'),
    apparatusType: readFilter(req.query as Record<string, unknown>, 'apparatusType'),
    status: readFilter(req.query as Record<string, unknown>, 'status'),
    readinessRisk: readFilter(req.query as Record<string, unknown>, 'readinessRisk'),
    category: readFilter(req.query as Record<string, unknown>, 'category'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  });
  ok(res, items, 'Assets');
}));
router.post('/assets', authRequired, requirePermission('assets.manage'), asyncHandler(async (req, res) => created(res, await createAsset(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Asset created')));
router.get('/assets/:id', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => ok(res, await getAssetDetail(req.user!.tenantId, String(req.params.id)), 'Asset detail')));
router.put('/assets/:id', authRequired, requirePermission('assets.manage'), asyncHandler(async (req, res) => ok(res, await updateAsset(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Asset updated')));
router.get('/assets/:id/history', authRequired, requirePermission('assets.view'), asyncHandler(async (req, res) => ok(res, await getAssetHistory(req.user!.tenantId, String(req.params.id)), 'Asset history')));

router.get('/inventory', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  const items = await listInventory(req.user!.tenantId, page, take, {
    stationId: readFilter(req.query as Record<string, unknown>, 'stationId'),
    category: readFilter(req.query as Record<string, unknown>, 'category'),
    status: readFilter(req.query as Record<string, unknown>, 'status'),
    search: readFilter(req.query as Record<string, unknown>, 'search') ?? readFilter(req.query as Record<string, unknown>, 'q'),
  });
  ok(res, items, 'Inventory');
}));
router.post('/inventory', authRequired, requirePermission('inventory.manage'), asyncHandler(async (req, res) => created(res, await createInventory(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Inventory item created')));
router.get('/inventory/low-stock', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => ok(res, await listLowStockInventory(req.user!.tenantId), 'Low stock items')));
router.get('/inventory/expiring', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => ok(res, await listExpiringInventory(req.user!.tenantId), 'Expiring items')));
// Collection routes must precede /inventory/:id or the keyword is interpreted as an id.
router.post('/inventory/transactions', authRequired, requirePermission('inventory.manage'), asyncHandler(async (req, res) => created(res, await createInventoryTransaction(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Inventory transaction created')));
router.get('/inventory/transactions', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listInventoryTransactions(req.user!.tenantId, page, take), 'Inventory transactions');
}));
router.get('/inventory/:id', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => ok(res, await listInventory(req.user!.tenantId, 1, 500).then((result) => result.items.find((item: any) => item.id === req.params.id) ?? null), 'Inventory detail')));
router.put('/inventory/:id', authRequired, requirePermission('inventory.manage'), asyncHandler(async (req, res) => ok(res, await updateInventory(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Inventory updated')));

router.get('/maintenance-events', authRequired, requirePermission('maintenance.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listMaintenanceEvents(req.user!.tenantId, page, take), 'Maintenance events');
}));
router.post('/maintenance-events', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => created(res, await createMaintenanceEvent(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Maintenance event created')));
router.get('/maintenance-events/:id', authRequired, requirePermission('maintenance.view'), asyncHandler(async (req, res) => ok(res, await getMaintenanceEvent(req.user!.tenantId, String(req.params.id)), 'Maintenance event')));
router.put('/maintenance-events/:id', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await updateMaintenanceEvent(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Maintenance event updated')));
router.post('/maintenance-events/:id/schedule', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await scheduleMaintenanceEvent(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Maintenance scheduled')));
router.post('/maintenance-events/:id/start', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await startMaintenanceEvent(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Maintenance started')));
router.post('/maintenance-events/:id/complete', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await completeMaintenanceEvent(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Maintenance completed')));
router.post('/maintenance-events/:id/defer', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await deferMaintenanceEvent(req.user!.tenantId, String(req.params.id), req.user!.userId, req.body ?? {}), 'Maintenance deferred')));

router.get('/preventive-maintenance', authRequired, requirePermission('maintenance.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listPreventiveMaintenance(req.user!.tenantId, page, take), 'Preventive maintenance');
}));
router.post('/preventive-maintenance', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => created(res, await createPreventiveMaintenance(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Preventive maintenance created')));
router.get('/preventive-maintenance/due', authRequired, requirePermission('maintenance.view'), asyncHandler(async (req, res) => ok(res, await listDuePreventiveMaintenance(req.user!.tenantId), 'Preventive maintenance due')));
router.post('/preventive-maintenance/:id/complete', authRequired, requirePermission('maintenance.manage'), asyncHandler(async (req, res) => ok(res, await completePreventiveMaintenance(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Preventive maintenance completed')));

router.get('/vendors', authRequired, requirePermission('vendors.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listVendors(req.user!.tenantId, page, take), 'Vendors');
}));
router.post('/vendors', authRequired, requirePermission('vendors.manage'), asyncHandler(async (req, res) => created(res, await createVendor(req.user!.tenantId, req.user!.userId, req.body ?? {}), 'Vendor created')));

router.get('/reorder-recommendations', authRequired, requirePermission('inventory.view'), asyncHandler(async (req, res) => {
  const { page, take } = getPagination(req.query as Record<string, unknown>);
  ok(res, await listReorderRecommendations(req.user!.tenantId, page, take), 'Reorder recommendations');
}));
router.post('/reorder-recommendations/:id/approve', authRequired, requirePermission('reorder.approve'), asyncHandler(async (req, res) => ok(res, await approveReorderRecommendation(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Reorder approved')));
router.post('/reorder-recommendations/:id/reject', authRequired, requirePermission('reorder.approve'), asyncHandler(async (req, res) => ok(res, await rejectReorderRecommendation(req.user!.tenantId, String(req.params.id), req.user!.userId), 'Reorder rejected')));

router.get('/stations/:id/assets', authRequired, requirePermission('stations.view'), asyncHandler(async (req, res) => ok(res, await listStationAssets(req.user!.tenantId, String(req.params.id)), 'Station assets')));
router.get('/stations/:id/asset-readiness', authRequired, requirePermission('stations.view'), asyncHandler(async (req, res) => ok(res, await getStationAssetSummary(req.user!.tenantId, String(req.params.id)), 'Station asset readiness')));

export default router;
