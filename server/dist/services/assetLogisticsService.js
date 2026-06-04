"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAssetCommandCenter = getAssetCommandCenter;
exports.getAssetRisks = getAssetRisks;
exports.listApparatus = listApparatus;
exports.getApparatusDetail = getApparatusDetail;
exports.listAssets = listAssets;
exports.getAssetDetail = getAssetDetail;
exports.createAsset = createAsset;
exports.updateAsset = updateAsset;
exports.getAssetHistory = getAssetHistory;
exports.listInventory = listInventory;
exports.listLowStockInventory = listLowStockInventory;
exports.listExpiringInventory = listExpiringInventory;
exports.listInventoryTransactions = listInventoryTransactions;
exports.createInventoryTransaction = createInventoryTransaction;
exports.createInventory = createInventory;
exports.updateInventory = updateInventory;
exports.listMaintenanceEvents = listMaintenanceEvents;
exports.getMaintenanceEvent = getMaintenanceEvent;
exports.createMaintenanceEvent = createMaintenanceEvent;
exports.updateMaintenanceEvent = updateMaintenanceEvent;
exports.scheduleMaintenanceEvent = scheduleMaintenanceEvent;
exports.startMaintenanceEvent = startMaintenanceEvent;
exports.completeMaintenanceEvent = completeMaintenanceEvent;
exports.deferMaintenanceEvent = deferMaintenanceEvent;
exports.listPreventiveMaintenance = listPreventiveMaintenance;
exports.listDuePreventiveMaintenance = listDuePreventiveMaintenance;
exports.completePreventiveMaintenance = completePreventiveMaintenance;
exports.createPreventiveMaintenance = createPreventiveMaintenance;
exports.listVendors = listVendors;
exports.createVendor = createVendor;
exports.listReorderRecommendations = listReorderRecommendations;
exports.approveReorderRecommendation = approveReorderRecommendation;
exports.rejectReorderRecommendation = rejectReorderRecommendation;
exports.createApparatus = createApparatus;
exports.updateApparatus = updateApparatus;
exports.getApparatusReadiness = getApparatusReadiness;
exports.getStationAssetSummary = getStationAssetSummary;
exports.listStationAssets = listStationAssets;
exports.listApparatusMaintenance = listApparatusMaintenance;
exports.listApparatusInventory = listApparatusInventory;
exports.listApparatus360 = listApparatus360;
exports.getApparatus360 = getApparatus360;
const prisma_js_1 = require("../utils/prisma.js");
const dayMs = 86_400_000;
const nowIso = () => new Date().toISOString();
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolveSkip = (page, take) => (page - 1) * take;
const percent = (value) => Math.max(0, Math.min(100, Math.round(value)));
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
const lower = (value) => String(value ?? '').toLowerCase();
function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function daysUntil(value) {
    if (!value)
        return null;
    const diff = new Date(value).getTime() - Date.now();
    return Math.round(diff / dayMs);
}
function riskLevel(score) {
    if (score >= 90)
        return 'Ready';
    if (score >= 75)
        return 'Watch';
    if (score >= 60)
        return 'At Risk';
    return 'Critical';
}
function apparatusStatusScore(status) {
    const code = statusCode(status);
    if (code === 'READY')
        return 100;
    if (code === 'WARNING')
        return 80;
    if (code === 'MAINTENANCE_DUE')
        return 60;
    if (code === 'OUT_OF_SERVICE')
        return 35;
    if (code === 'RETIRED')
        return 0;
    return 75;
}
function maintenanceScore(apparatus, maintenance) {
    const dueDays = daysUntil(apparatus.nextMaintenanceDue ?? apparatus.nextMaintenanceAt ?? null);
    const openEvents = maintenance.filter((event) => !['COMPLETED', 'CANCELLED'].includes(statusCode(event.status)));
    const overduePenalty = dueDays != null && dueDays < 0 ? Math.min(25, Math.abs(dueDays) * 3) : 0;
    const openPenalty = openEvents.reduce((total, event) => total + (statusCode(event.priority) === 'CRITICAL' ? 12 : statusCode(event.priority) === 'HIGH' ? 8 : 4), 0);
    return percent(100 - overduePenalty - openPenalty);
}
function inspectionScore(apparatus) {
    const daysSinceInspection = daysUntil(apparatus.lastInspectionDate ?? apparatus.lastInspectionAt ?? null);
    if (daysSinceInspection == null)
        return 70;
    if (daysSinceInspection <= 14)
        return 100;
    if (daysSinceInspection <= 30)
        return 90;
    if (daysSinceInspection <= 60)
        return 75;
    return 55;
}
function inventorySupportScore(inventoryItems) {
    if (!inventoryItems.length)
        return 55;
    const criticalIssues = inventoryItems.filter((item) => ['LOW STOCK', 'OUT OF STOCK', 'EXPIRED'].includes(statusCode(item.status))).length;
    const expiringIssues = inventoryItems.filter((item) => statusCode(item.status) === 'EXPIRING_SOON').length;
    return percent(100 - criticalIssues * 18 - expiringIssues * 8 + Math.min(15, inventoryItems.length * 2));
}
function equipmentCompletenessScore(assets) {
    if (!assets.length)
        return 60;
    const criticalMissing = assets.filter((asset) => ['OUT_OF_SERVICE', 'MAINTENANCE_DUE', 'WARNING'].includes(statusCode(asset.status))).length;
    return percent(100 - criticalMissing * 12 + Math.min(10, assets.length));
}
function apparatusReadinessScore(apparatus, relatedAssets, relatedInventory, relatedMaintenance) {
    const statusScore = apparatusStatusScore(apparatus.status);
    const maintenance = maintenanceScore(apparatus, relatedMaintenance);
    const inspection = inspectionScore(apparatus);
    const equipment = equipmentCompletenessScore(relatedAssets);
    const inventory = inventorySupportScore(relatedInventory);
    return percent(statusScore * 0.35 + maintenance * 0.25 + inspection * 0.15 + equipment * 0.15 + inventory * 0.1);
}
function stationAssetReadinessScore(apparatusScores, criticalEquipmentCount, inventoryHealth, maintenanceBacklog) {
    const apparatusAvailability = apparatusScores.length ? apparatusScores.reduce((sum, score) => sum + score, 0) / apparatusScores.length : 60;
    const criticalEquipmentAvailability = percent(100 - criticalEquipmentCount * 12);
    const maintenanceBacklogScore = percent(100 - maintenanceBacklog * 8);
    return percent(apparatusAvailability * 0.35 + criticalEquipmentAvailability * 0.25 + inventoryHealth * 0.2 + maintenanceBacklogScore * 0.2);
}
async function writeAudit(tenantId, userId, action, entityName, entityId, before, after) {
    await prisma_js_1.prisma.auditLog.create({
        data: {
            tenantId,
            userId: userId ?? null,
            action,
            entityName,
            entityId: entityId ?? null,
            before: before ?? undefined,
            after: after ?? undefined,
            createdAt: nowIso(),
        },
    });
}
async function createNotification(tenantId, title, message, personnelId) {
    await prisma_js_1.prisma.notification.create({
        data: {
            tenantId,
            personnelId: personnelId ?? null,
            title,
            message,
            notificationType: 'asset.readiness',
            isRead: false,
            createdAt: nowIso(),
        },
    });
}
async function createInsight(tenantId, title, summary, severity, recommendedActions) {
    await prisma_js_1.prisma.aiInsight.create({
        data: {
            tenantId,
            category: 'Asset Readiness',
            title,
            summary,
            severity,
            confidenceScore: 0.84,
            dataSources: ['Assets', 'Inventory', 'Maintenance', 'Station 360'],
            recommendedActions,
            status: 'Open',
            createdAt: nowIso(),
        },
    });
}
async function assetContext(tenantId) {
    const [stations, apparatusTypes, apparatus, assets, inventoryItems, inventoryTransactions, maintenanceEvents, schedules, vendors, reorderRecommendations, snapshots, incidents, incidentUnits, incidentPersonnel, notifications, insights] = (await Promise.all([
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatusType.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.asset.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.inventoryItem.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.inventoryTransaction.findMany({ where: { tenantId }, orderBy: { transactionDate: 'desc' } }),
        prisma_js_1.prisma.maintenanceEvent.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.preventiveMaintenanceSchedule.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.vendor.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.purchaseReorderRecommendation.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.assetReadinessSnapshot.findMany({ where: { tenantId, isDeleted: false } }),
        prisma_js_1.prisma.incident.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incidentUnit.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incidentPersonnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
        prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]));
    const stationById = new Map(stations.map((station) => [station.id, station]));
    const apparatusById = new Map(apparatus.map((unit) => [unit.id, unit]));
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
    const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
    const maintenanceByApparatus = new Map();
    const maintenanceByAsset = new Map();
    for (const event of maintenanceEvents) {
        if (event.apparatusId)
            maintenanceByApparatus.set(event.apparatusId, [...(maintenanceByApparatus.get(event.apparatusId) ?? []), event]);
        if (event.assetId)
            maintenanceByAsset.set(event.assetId, [...(maintenanceByAsset.get(event.assetId) ?? []), event]);
    }
    const inventoryByApparatus = new Map();
    const inventoryByStation = new Map();
    for (const item of inventoryItems) {
        if (item.apparatusId)
            inventoryByApparatus.set(item.apparatusId, [...(inventoryByApparatus.get(item.apparatusId) ?? []), item]);
        if (item.stationId)
            inventoryByStation.set(item.stationId, [...(inventoryByStation.get(item.stationId) ?? []), item]);
    }
    const assetsByStation = new Map();
    const assetsByApparatus = new Map();
    for (const asset of assets) {
        if (asset.stationId)
            assetsByStation.set(asset.stationId, [...(assetsByStation.get(asset.stationId) ?? []), asset]);
        if (asset.apparatusId)
            assetsByApparatus.set(asset.apparatusId, [...(assetsByApparatus.get(asset.apparatusId) ?? []), asset]);
    }
    const incidentsByStation = new Map();
    for (const incident of incidents) {
        if (incident.stationId)
            incidentsByStation.set(incident.stationId, [...(incidentsByStation.get(incident.stationId) ?? []), incident]);
    }
    return {
        stations,
        apparatusTypes,
        apparatus,
        assets,
        inventoryItems,
        inventoryTransactions,
        maintenanceEvents,
        schedules,
        vendors,
        reorderRecommendations,
        snapshots,
        incidents,
        incidentUnits,
        incidentPersonnel,
        notifications,
        insights,
        stationById,
        apparatusById,
        assetById,
        vendorById,
        inventoryById,
        maintenanceByApparatus,
        maintenanceByAsset,
        inventoryByApparatus,
        inventoryByStation,
        assetsByStation,
        assetsByApparatus,
        incidentsByStation,
    };
}
function filterBySearch(rows, search, fields = []) {
    const query = search?.trim().toLowerCase();
    if (!query)
        return rows;
    return rows.filter((row) => fields.some((field) => String(row[field] ?? '').toLowerCase().includes(query)));
}
function paginateRows(rows, page, take) {
    return {
        items: rows.slice(resolveSkip(page, take), resolveSkip(page, take) + take),
        page,
        take,
        total: rows.length,
    };
}
function enrichApparatus(apparatus, ctx) {
    const assets = ctx.assetsByApparatus.get(apparatus.id) ?? [];
    const inventoryItems = ctx.inventoryByApparatus.get(apparatus.id) ?? [];
    const maintenance = ctx.maintenanceByApparatus.get(apparatus.id) ?? [];
    const preventiveSchedules = ctx.schedules.filter((schedule) => schedule.apparatusId === apparatus.id);
    const readinessScore = apparatusReadinessScore(apparatus, assets, inventoryItems, maintenance);
    const station = apparatus.stationId ? ctx.stationById.get(apparatus.stationId) ?? null : null;
    return {
        ...apparatus,
        station,
        assignedAssets: assets,
        inventoryItems,
        maintenanceEvents: maintenance,
        preventiveSchedules,
        readinessScore,
        riskLevel: riskLevel(readinessScore),
        status: apparatus.status ?? (readinessScore >= 90 ? 'Ready' : readinessScore >= 75 ? 'Warning' : readinessScore >= 60 ? 'Maintenance Due' : 'Out of Service'),
    };
}
function enrichAsset(asset, ctx) {
    const station = asset.stationId ? ctx.stationById.get(asset.stationId) ?? null : null;
    const apparatus = asset.apparatusId ? ctx.apparatusById.get(asset.apparatusId) ?? null : null;
    const maintenance = ctx.maintenanceByAsset.get(asset.id) ?? [];
    return {
        ...asset,
        station,
        apparatus,
        maintenanceEvents: maintenance,
        readinessScore: asset.readinessImpact ?? 0,
        riskLevel: riskLevel(100 - (asset.readinessImpact ?? 0)),
    };
}
function enrichInventory(item, ctx) {
    const station = item.stationId ? ctx.stationById.get(item.stationId) ?? null : null;
    const apparatus = item.apparatusId ? ctx.apparatusById.get(item.apparatusId) ?? null : null;
    const expiryDays = daysUntil(item.expirationDate ?? item.expiresAt ?? null);
    const status = item.status ?? (item.quantityOnHand <= item.reorderPoint ? 'Low Stock' : expiryDays != null && expiryDays <= 14 ? 'Expiring Soon' : 'In Stock');
    return {
        ...item,
        station,
        apparatus,
        status,
        daysUntilExpiry: expiryDays,
    };
}
async function getAssetCommandCenter(tenantId) {
    const ctx = await assetContext(tenantId);
    const apparatus = ctx.apparatus.map((unit) => enrichApparatus(unit, ctx));
    const assets = ctx.assets.map((asset) => enrichAsset(asset, ctx));
    const inventory = ctx.inventoryItems.map((item) => enrichInventory(item, ctx));
    const maintenanceOpen = ctx.maintenanceEvents.filter((event) => !['COMPLETED', 'CANCELLED'].includes(statusCode(event.status)));
    const lowStock = inventory.filter((item) => ['LOW STOCK', 'OUT OF STOCK'].includes(statusCode(item.status)));
    const expiring = inventory.filter((item) => ['EXPIRING SOON', 'EXPIRED'].includes(statusCode(item.status)) || (item.daysUntilExpiry != null && item.daysUntilExpiry <= 30));
    const apparatusReady = apparatus.filter((unit) => riskLevel(unit.readinessScore) === 'Ready').length;
    const warningCount = apparatus.filter((unit) => riskLevel(unit.readinessScore) === 'Watch').length;
    const outOfServiceCount = apparatus.filter((unit) => riskLevel(unit.readinessScore) === 'Critical' || statusCode(unit.status) === 'OUT_OF_SERVICE').length;
    const maintenanceDue = maintenanceOpen.filter((event) => ['HIGH', 'CRITICAL'].includes(statusCode(event.priority)) || (event.scheduledDate && daysUntil(event.scheduledDate) != null && daysUntil(event.scheduledDate) <= 7)).length;
    const overdueMaintenance = maintenanceOpen.filter((event) => event.scheduledDate && daysUntil(event.scheduledDate) != null && daysUntil(event.scheduledDate) < 0).length;
    const criticalApparatus = apparatus.filter((unit) => unit.readinessScore < 75).slice(0, 8);
    const stationSummaries = ctx.stations.map((station) => {
        const stationApparatus = apparatus.filter((unit) => unit.stationId === station.id);
        const stationAssets = assets.filter((asset) => asset.stationId === station.id);
        const stationInventory = inventory.filter((item) => item.stationId === station.id);
        const stationMaintenance = maintenanceOpen.filter((event) => {
            const apparatusUnit = event.apparatusId ? ctx.apparatusById.get(event.apparatusId) : null;
            const assetRecord = event.assetId ? ctx.assetById.get(event.assetId) : null;
            return apparatusUnit?.stationId === station.id || assetRecord?.stationId === station.id;
        });
        const score = stationAssetReadinessScore(stationApparatus.map((unit) => unit.readinessScore ?? 0), stationAssets.filter((asset) => ['WARNING', 'OUT_OF_SERVICE', 'MAINTENANCE_DUE'].includes(statusCode(asset.status))).length, percent(100 - lowStock.filter((item) => item.stationId === station.id).length * 20 - expiring.filter((item) => item.stationId === station.id).length * 10), stationMaintenance.length);
        return {
            station,
            assetReadinessScore: score,
            riskLevel: riskLevel(score),
            apparatusCount: stationApparatus.length,
            lowStockCount: stationInventory.filter((item) => ['LOW STOCK', 'OUT OF STOCK'].includes(statusCode(item.status))).length,
            maintenanceBacklog: stationMaintenance.length,
        };
    }).sort((left, right) => right.assetReadinessScore - left.assetReadinessScore);
    const readinessScore = percent(stationSummaries.reduce((sum, row) => sum + row.assetReadinessScore, 0) / Math.max(stationSummaries.length, 1));
    const recentActivity = [
        ...ctx.maintenanceEvents.slice(0, 6).map((event) => ({ type: 'Maintenance', id: event.id, title: event.title, createdAt: event.updatedAt ?? event.createdAt ?? event.reportedDate })),
        ...ctx.inventoryTransactions.slice(0, 6).map((transaction) => ({ type: 'Inventory', id: transaction.id, title: `${transaction.transactionType} · ${transaction.quantity}`, createdAt: transaction.createdAt })),
        ...ctx.notifications.slice(0, 4).map((notification) => ({ type: 'Notification', id: notification.id, title: notification.title, createdAt: notification.createdAt })),
    ].sort((left, right) => new Date(String(right.createdAt ?? 0)).getTime() - new Date(String(left.createdAt ?? 0)).getTime()).slice(0, 12);
    return {
        overallAssetReadinessScore: readinessScore,
        riskLevel: riskLevel(readinessScore),
        apparatusReady,
        apparatusWarning: warningCount,
        apparatusOutOfService: outOfServiceCount,
        maintenanceDueThisWeek: maintenanceDue,
        overdueMaintenance,
        criticalLowStock: lowStock.length,
        expiringSupplies: expiring.length,
        stationReadinessImpact: stationSummaries.slice(0, 5),
        highRiskApparatus: criticalApparatus,
        recentMaintenanceActivity: recentActivity,
        reorderRecommendations: ctx.reorderRecommendations.slice(0, 10).map((rec) => ({
            ...rec,
            inventoryItem: ctx.inventoryById.get(rec.inventoryItemId) ?? null,
            vendor: rec.vendorId ? ctx.vendorById.get(rec.vendorId) ?? null : null,
        })),
        aiInsights: ctx.insights.filter((insight) => lower(insight.category).includes('asset')).slice(0, 5),
        notifications: ctx.notifications.slice(0, 6),
    };
}
async function getAssetRisks(tenantId) {
    const summary = await getAssetCommandCenter(tenantId);
    const risks = [
        ...summary.highRiskApparatus.map((apparatus) => ({
            id: `risk-apparatus-${apparatus.id}`,
            title: `${apparatus.unitNumber} readiness reduced`,
            source: 'Apparatus readiness',
            station: apparatus.station?.name ?? 'Unassigned',
            subject: apparatus.unitNumber,
            severity: apparatus.readinessScore < 60 ? 'Critical' : 'High',
            evidenceSummary: `Readiness score ${apparatus.readinessScore} with ${apparatus.maintenanceEvents?.length ?? 0} maintenance item(s).`,
            readinessImpact: 100 - apparatus.readinessScore,
            recommendedAction: 'Schedule maintenance and verify support inventory.',
            status: 'Open',
        })),
        ...summary.reorderRecommendations.slice(0, 5).map((recommendation) => ({
            id: `risk-reorder-${recommendation.id}`,
            title: `Reorder needed for ${recommendation.inventoryItem?.name ?? 'inventory item'}`,
            source: 'Inventory',
            station: recommendation.inventoryItem?.station?.name ?? 'District',
            subject: recommendation.inventoryItem?.name ?? recommendation.id,
            severity: recommendation.priority,
            evidenceSummary: recommendation.reason,
            readinessImpact: 10,
            recommendedAction: 'Approve reorder recommendation.',
            status: recommendation.status,
        })),
    ];
    return risks;
}
async function listApparatus(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await assetContext(tenantId);
    let rows = ctx.apparatus.map((unit) => enrichApparatus(unit, ctx));
    rows = filterBySearch(rows, filters.search, ['unitNumber', 'callSign', 'apparatusType', 'make', 'model', 'notes']);
    if (filters.stationId)
        rows = rows.filter((row) => row.stationId === filters.stationId);
    if (filters.apparatusType)
        rows = rows.filter((row) => lower(row.apparatusType).includes(lower(filters.apparatusType)));
    if (filters.status)
        rows = rows.filter((row) => statusCode(row.status) === statusCode(filters.status));
    if (filters.readinessRisk)
        rows = rows.filter((row) => riskLevel(row.readinessScore) === filters.readinessRisk || statusCode(row.riskLevel) === statusCode(filters.readinessRisk));
    return paginateRows(rows.sort((left, right) => Number(right.readinessScore ?? 0) - Number(left.readinessScore ?? 0)), page, take);
}
async function getApparatusDetail(tenantId, apparatusId) {
    const ctx = await assetContext(tenantId);
    const apparatus = ctx.apparatusById.get(apparatusId);
    if (!apparatus)
        return null;
    const detail = enrichApparatus(apparatus, ctx);
    const incidents = ctx.incidentUnits.filter((unit) => unit.apparatusId === apparatusId).map((unit) => ({
        ...unit,
        incident: ctx.incidents.find((incident) => incident.id === unit.incidentId) ?? null,
    }));
    return {
        ...detail,
        apparatusTypeRef: ctx.apparatusTypes.find((type) => type.id === apparatus.apparatusTypeId) ?? null,
        incidents,
        aiInsight: ctx.insights.find((insight) => lower(insight.title).includes(lower(apparatus.unitNumber))) ?? ctx.insights.find((insight) => lower(insight.category).includes('asset')) ?? null,
        station: ctx.stations.find((station) => station.id === apparatus.stationId) ?? null,
        stationSummary: ctx.stations.find((station) => station.id === apparatus.stationId) ?? null,
    };
}
async function listAssets(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await assetContext(tenantId);
    let rows = ctx.assets.map((asset) => enrichAsset(asset, ctx));
    rows = filterBySearch(rows, filters.search, ['assetTag', 'name', 'category', 'subcategory', 'serialNumber', 'manufacturer', 'model']);
    if (filters.stationId)
        rows = rows.filter((row) => row.stationId === filters.stationId);
    if (filters.apparatusType)
        rows = rows.filter((row) => lower(row.category).includes(lower(filters.apparatusType)));
    if (filters.status)
        rows = rows.filter((row) => statusCode(row.status) === statusCode(filters.status));
    if (filters.readinessRisk)
        rows = rows.filter((row) => riskLevel(row.readinessScore ?? 100 - asNumber(row.readinessImpact, 0)) === filters.readinessRisk);
    return paginateRows(rows.sort((left, right) => Number(right.readinessImpact ?? 0) - Number(left.readinessImpact ?? 0)), page, take);
}
async function getAssetDetail(tenantId, assetId) {
    const ctx = await assetContext(tenantId);
    const asset = ctx.assetById.get(assetId);
    if (!asset)
        return null;
    return {
        ...enrichAsset(asset, ctx),
        history: ctx.maintenanceEvents.filter((event) => event.assetId === assetId),
        readinessSnapshot: ctx.snapshots.find((snapshot) => snapshot.apparatusId === asset.apparatusId || snapshot.stationId === asset.stationId) ?? null,
    };
}
async function createAsset(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.asset.create({
        data: {
            tenantId,
            assetTag: String(payload.assetTag),
            name: String(payload.name),
            category: String(payload.category ?? 'Equipment'),
            subcategory: payload.subcategory ?? null,
            serialNumber: payload.serialNumber ?? null,
            manufacturer: payload.manufacturer ?? null,
            model: payload.model ?? null,
            purchaseDate: payload.purchaseDate ?? null,
            warrantyExpiryDate: payload.warrantyExpiryDate ?? null,
            usefulLifeMonths: payload.usefulLifeMonths ?? null,
            status: payload.status ?? 'READY',
            condition: payload.condition ?? 'Good',
            stationId: payload.stationId ?? null,
            apparatusId: payload.apparatusId ?? null,
            assignedPersonnelId: payload.assignedPersonnelId ?? null,
            locationType: payload.locationType ?? 'Station',
            locationDescription: payload.locationDescription ?? null,
            readinessImpact: asNumber(payload.readinessImpact, 0),
            replacementCost: payload.replacementCost ?? null,
            notes: payload.notes ?? null,
            createdBy: userId,
            updatedBy: userId,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'ASSET_CREATE', 'Asset', created.id, null, created);
    return created;
}
async function updateAsset(tenantId, id, userId, payload) {
    const current = await prisma_js_1.prisma.asset.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.asset.update({ where: { id }, data: { ...payload, updatedBy: userId, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'ASSET_UPDATE', 'Asset', id, current, updated);
    return updated;
}
async function getAssetHistory(tenantId, assetId) {
    const ctx = await assetContext(tenantId);
    return [
        ...ctx.maintenanceEvents.filter((event) => event.assetId === assetId).map((event) => ({ type: 'Maintenance', ...event })),
        ...ctx.inventoryTransactions.filter((transaction) => transaction.referenceId === assetId).map((transaction) => ({ type: 'Inventory', ...transaction })),
    ].sort((left, right) => new Date(String(right.createdAt ?? right.transactionDate ?? 0)).getTime() - new Date(String(left.createdAt ?? left.transactionDate ?? 0)).getTime());
}
async function listInventory(tenantId, page = 1, take = 50, filters = {}) {
    const ctx = await assetContext(tenantId);
    let rows = ctx.inventoryItems.map((item) => enrichInventory(item, ctx));
    rows = filterBySearch(rows, filters.search, ['sku', 'name', 'category', 'lotNumber']);
    if (filters.stationId)
        rows = rows.filter((row) => row.stationId === filters.stationId);
    if (filters.category)
        rows = rows.filter((row) => lower(row.category).includes(lower(filters.category)));
    if (filters.status)
        rows = rows.filter((row) => statusCode(row.status) === statusCode(filters.status));
    return paginateRows(rows.sort((left, right) => Number(left.reorderPoint ?? 0) - Number(right.reorderPoint ?? 0)), page, take);
}
async function listLowStockInventory(tenantId) {
    const all = await listInventory(tenantId, 1, 500);
    return all.items.filter((item) => ['LOW STOCK', 'OUT OF STOCK'].includes(statusCode(item.status)) || Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0));
}
async function listExpiringInventory(tenantId) {
    const all = await listInventory(tenantId, 1, 500);
    return all.items.filter((item) => {
        const days = daysUntil(item.expirationDate ?? item.expiresAt ?? null);
        return days != null && days <= 30;
    });
}
async function inventoryTransactionImpact(tenantId, itemId, quantityDelta) {
    const item = await prisma_js_1.prisma.inventoryItem.findFirst({ where: { tenantId, id: itemId } });
    if (!item)
        return null;
    const updated = await prisma_js_1.prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
            quantityOnHand: Math.max(0, Number(item.quantityOnHand ?? item.quantity ?? 0) + quantityDelta),
            status: Math.max(0, Number(item.quantityOnHand ?? item.quantity ?? 0) + quantityDelta) <= Number(item.reorderPoint ?? 0)
                ? 'Low Stock'
                : item.expirationDate && daysUntil(item.expirationDate) != null && daysUntil(item.expirationDate) <= 30
                    ? 'Expiring Soon'
                    : 'In Stock',
            updatedAt: nowIso(),
        },
    });
    return updated;
}
async function listInventoryTransactions(tenantId, page = 1, take = 50) {
    const rows = await prisma_js_1.prisma.inventoryTransaction.findMany({ where: { tenantId }, orderBy: { transactionDate: 'desc' } });
    return paginateRows(rows, page, take);
}
async function createInventoryTransaction(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.inventoryTransaction.create({
        data: {
            tenantId,
            inventoryItemId: String(payload.inventoryItemId),
            transactionType: String(payload.transactionType ?? 'Adjust'),
            quantity: asNumber(payload.quantity, 0),
            fromStationId: payload.fromStationId ?? null,
            toStationId: payload.toStationId ?? null,
            apparatusId: payload.apparatusId ?? null,
            performedByPersonnelId: payload.performedByPersonnelId ?? null,
            reason: payload.reason ?? null,
            referenceType: payload.referenceType ?? null,
            referenceId: payload.referenceId ?? null,
            transactionDate: payload.transactionDate ?? nowIso(),
            createdAt: nowIso(),
        },
    });
    const delta = ['issue', 'consume', 'dispose'].includes(lower(payload.transactionType)) ? -asNumber(payload.quantity, 0) : asNumber(payload.quantity, 0);
    const item = await inventoryTransactionImpact(tenantId, String(payload.inventoryItemId), delta);
    await writeAudit(tenantId, userId, 'INVENTORY_TRANSACTION_CREATE', 'InventoryTransaction', created.id, null, created);
    if (item && Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)) {
        await createNotification(tenantId, 'Inventory low stock alert', `${item.name} has fallen below reorder point.`, null);
        await createInsight(tenantId, `${item.name} low stock`, `${item.name} at ${item.stationId ?? 'agency'} is below reorder threshold.`, 'High', ['Approve reorder recommendation', 'Review station inventory']);
    }
    return created;
}
async function createInventory(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.inventoryItem.create({
        data: {
            tenantId,
            stationId: payload.stationId ?? null,
            apparatusId: payload.apparatusId ?? null,
            vendorId: payload.vendorId ?? null,
            sku: String(payload.sku),
            name: String(payload.name),
            category: String(payload.category ?? 'General'),
            unitOfMeasure: String(payload.unitOfMeasure ?? 'each'),
            quantityOnHand: asNumber(payload.quantityOnHand ?? payload.quantity, 0),
            reorderPoint: asNumber(payload.reorderPoint, 0),
            reorderQuantity: payload.reorderQuantity ?? null,
            maxStockLevel: payload.maxStockLevel ?? null,
            expirationDate: payload.expirationDate ?? null,
            lotNumber: payload.lotNumber ?? null,
            readinessCriticality: payload.readinessCriticality ?? 'Normal',
            status: payload.status ?? 'In Stock',
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'INVENTORY_CREATE', 'InventoryItem', created.id, null, created);
    return created;
}
async function updateInventory(tenantId, id, userId, payload) {
    const current = await prisma_js_1.prisma.inventoryItem.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.inventoryItem.update({
        where: { id },
        data: { ...payload, updatedAt: nowIso() },
    });
    await writeAudit(tenantId, userId, 'INVENTORY_UPDATE', 'InventoryItem', id, current, updated);
    return updated;
}
async function listMaintenanceEvents(tenantId, page = 1, take = 50) {
    const rows = await prisma_js_1.prisma.maintenanceEvent.findMany({ where: { tenantId }, orderBy: [{ priority: 'asc' }, { reportedDate: 'desc' }] });
    return paginateRows(rows, page, take);
}
async function getMaintenanceEvent(tenantId, id) {
    return prisma_js_1.prisma.maintenanceEvent.findFirst({ where: { tenantId, id } });
}
async function updateMaintenanceStatus(tenantId, id, userId, status, extra = {}) {
    const current = await prisma_js_1.prisma.maintenanceEvent.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.maintenanceEvent.update({ where: { id }, data: { ...current, ...extra, status, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, `MAINTENANCE_${statusCode(status)}`, 'MaintenanceEvent', id, current, updated);
    if (statusCode(status) === 'REPORTED' || statusCode(status) === 'SCHEDULED' || statusCode(status) === 'IN_PROGRESS') {
        await createNotification(tenantId, 'Maintenance action required', `${updated.title} is now ${status.toLowerCase()}.`, null);
    }
    if (statusCode(status) === 'COMPLETED') {
        await createNotification(tenantId, 'Maintenance completed', `${updated.title} has been completed.`, null);
    }
    return updated;
}
async function createMaintenanceEvent(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.maintenanceEvent.create({
        data: {
            tenantId,
            apparatusId: payload.apparatusId ?? null,
            assetId: payload.assetId ?? null,
            title: String(payload.title),
            description: payload.description ?? null,
            maintenanceType: payload.maintenanceType ?? null,
            status: payload.status ?? 'Reported',
            priority: payload.priority ?? 'Normal',
            reportedByPersonnelId: payload.reportedByPersonnelId ?? null,
            assignedToPersonnelId: payload.assignedToPersonnelId ?? null,
            vendorId: payload.vendorId ?? null,
            reportedDate: payload.reportedDate ?? nowIso(),
            scheduledDate: payload.scheduledDate ?? null,
            startedDate: payload.startedDate ?? null,
            completedDate: payload.completedDate ?? null,
            estimatedCost: payload.estimatedCost ?? null,
            actualCost: payload.actualCost ?? null,
            downtimeHours: payload.downtimeHours ?? null,
            resolutionNotes: payload.resolutionNotes ?? null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'MAINTENANCE_CREATE', 'MaintenanceEvent', created.id, null, created);
    if (statusCode(created.priority) === 'CRITICAL' || statusCode(created.status) === 'OUT_OF_SERVICE') {
        await createNotification(tenantId, 'Critical maintenance reported', created.title, null);
        await createInsight(tenantId, `Critical maintenance: ${created.title}`, `${created.title} needs immediate attention.`, 'Critical', ['Schedule repair', 'Review operational coverage']);
    }
    return created;
}
async function updateMaintenanceEvent(tenantId, id, userId, payload) {
    const current = await prisma_js_1.prisma.maintenanceEvent.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.maintenanceEvent.update({ where: { id }, data: { ...payload, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'MAINTENANCE_UPDATE', 'MaintenanceEvent', id, current, updated);
    return updated;
}
async function scheduleMaintenanceEvent(tenantId, id, userId, payload) {
    return updateMaintenanceStatus(tenantId, id, userId, 'Scheduled', { scheduledDate: payload.scheduledDate ?? nowIso(), assignedToPersonnelId: payload.assignedToPersonnelId ?? null, vendorId: payload.vendorId ?? null });
}
async function startMaintenanceEvent(tenantId, id, userId, payload) {
    return updateMaintenanceStatus(tenantId, id, userId, 'In Progress', { startedDate: payload.startedDate ?? nowIso(), assignedToPersonnelId: payload.assignedToPersonnelId ?? null });
}
async function completeMaintenanceEvent(tenantId, id, userId, payload) {
    return updateMaintenanceStatus(tenantId, id, userId, 'Completed', { completedDate: payload.completedDate ?? nowIso(), resolutionNotes: payload.resolutionNotes ?? null, actualCost: payload.actualCost ?? null, downtimeHours: payload.downtimeHours ?? null });
}
async function deferMaintenanceEvent(tenantId, id, userId, payload) {
    return updateMaintenanceStatus(tenantId, id, userId, 'Deferred', { scheduledDate: payload.scheduledDate ?? null, resolutionNotes: payload.resolutionNotes ?? null });
}
async function listPreventiveMaintenance(tenantId, page = 1, take = 50) {
    const rows = await prisma_js_1.prisma.preventiveMaintenanceSchedule.findMany({ where: { tenantId }, orderBy: { nextDueDate: 'asc' } });
    return paginateRows(rows, page, take);
}
async function listDuePreventiveMaintenance(tenantId) {
    const rows = await prisma_js_1.prisma.preventiveMaintenanceSchedule.findMany({ where: { tenantId } });
    return rows.filter((row) => daysUntil(row.nextDueDate) != null && daysUntil(row.nextDueDate) <= 30);
}
async function completePreventiveMaintenance(tenantId, id, userId) {
    const current = await prisma_js_1.prisma.preventiveMaintenanceSchedule.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.preventiveMaintenanceSchedule.update({
        where: { id },
        data: { lastCompletedDate: nowIso(), nextDueDate: new Date(Date.now() + Number(current.frequencyValue ?? 30) * dayMs).toISOString(), status: 'Completed', updatedAt: nowIso() },
    });
    await writeAudit(tenantId, userId, 'PREVENTIVE_MAINTENANCE_COMPLETE', 'PreventiveMaintenanceSchedule', id, current, updated);
    await createNotification(tenantId, 'Preventive maintenance completed', `${current.maintenanceName} was marked complete.`, null);
    return updated;
}
async function createPreventiveMaintenance(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.preventiveMaintenanceSchedule.create({
        data: {
            tenantId,
            apparatusId: payload.apparatusId ?? null,
            assetId: payload.assetId ?? null,
            maintenanceName: String(payload.maintenanceName),
            frequencyType: String(payload.frequencyType ?? 'Days'),
            frequencyValue: asNumber(payload.frequencyValue, 30),
            lastCompletedDate: payload.lastCompletedDate ?? null,
            nextDueDate: payload.nextDueDate ?? nowIso(),
            status: payload.status ?? 'Scheduled',
            assignedToPersonnelId: payload.assignedToPersonnelId ?? null,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'PREVENTIVE_MAINTENANCE_CREATE', 'PreventiveMaintenanceSchedule', created.id, null, created);
    return created;
}
async function listVendors(tenantId, page = 1, take = 50) {
    const rows = await prisma_js_1.prisma.vendor.findMany({ where: { tenantId, isDeleted: false }, orderBy: [{ preferredVendor: 'desc' }, { name: 'asc' }] });
    return paginateRows(rows, page, take);
}
async function createVendor(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.vendor.create({
        data: {
            tenantId,
            name: String(payload.name),
            vendorType: String(payload.vendorType ?? 'Service'),
            contactName: payload.contactName ?? null,
            email: payload.email ?? null,
            phone: payload.phone ?? null,
            address: payload.address ?? null,
            serviceCategories: payload.serviceCategories ?? [],
            preferredVendor: Boolean(payload.preferredVendor),
            status: payload.status ?? 'Active',
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'VENDOR_CREATE', 'Vendor', created.id, null, created);
    return created;
}
async function listReorderRecommendations(tenantId, page = 1, take = 50) {
    const rows = await prisma_js_1.prisma.purchaseReorderRecommendation.findMany({ where: { tenantId, isDeleted: false }, orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }] });
    return paginateRows(rows, page, take);
}
async function approveReorderRecommendation(tenantId, id, userId) {
    const current = await prisma_js_1.prisma.purchaseReorderRecommendation.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.purchaseReorderRecommendation.update({ where: { id }, data: { status: 'Approved', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'REORDER_APPROVE', 'PurchaseReorderRecommendation', id, current, updated);
    await createNotification(tenantId, 'Reorder approved', `${current.reason}`, null);
    return updated;
}
async function rejectReorderRecommendation(tenantId, id, userId) {
    const current = await prisma_js_1.prisma.purchaseReorderRecommendation.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.purchaseReorderRecommendation.update({ where: { id }, data: { status: 'Rejected', updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'REORDER_REJECT', 'PurchaseReorderRecommendation', id, current, updated);
    return updated;
}
async function createApparatus(tenantId, userId, payload) {
    const created = await prisma_js_1.prisma.apparatus.create({
        data: {
            tenantId,
            stationId: payload.stationId ?? null,
            apparatusTypeId: payload.apparatusTypeId ?? null,
            unitNumber: String(payload.unitNumber),
            callSign: payload.callSign ?? null,
            apparatusType: String(payload.apparatusType ?? 'Engine'),
            make: payload.make ?? null,
            model: payload.model ?? null,
            year: payload.year ?? null,
            vin: payload.vin ?? null,
            licensePlate: payload.licensePlate ?? null,
            mileage: payload.mileage ?? null,
            engineHours: payload.engineHours ?? null,
            status: payload.status ?? 'READY',
            readinessScore: asNumber(payload.readinessScore, 90),
            lastInspectionDate: payload.lastInspectionDate ?? null,
            nextInspectionDue: payload.nextInspectionDue ?? null,
            lastMaintenanceDate: payload.lastMaintenanceDate ?? null,
            nextMaintenanceDue: payload.nextMaintenanceDue ?? null,
            assignedCrewShift: payload.assignedCrewShift ?? null,
            notes: payload.notes ?? null,
            createdBy: userId,
            updatedBy: userId,
            createdAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAudit(tenantId, userId, 'APPARATUS_CREATE', 'Apparatus', created.id, null, created);
    return created;
}
async function updateApparatus(tenantId, id, userId, payload) {
    const current = await prisma_js_1.prisma.apparatus.findFirst({ where: { tenantId, id } });
    if (!current)
        return null;
    const updated = await prisma_js_1.prisma.apparatus.update({ where: { id }, data: { ...payload, updatedBy: userId, updatedAt: nowIso() } });
    await writeAudit(tenantId, userId, 'APPARATUS_UPDATE', 'Apparatus', id, current, updated);
    return updated;
}
async function getApparatusReadiness(tenantId, apparatusId) {
    const detail = await getApparatusDetail(tenantId, apparatusId);
    if (!detail)
        return null;
    return {
        apparatus: detail,
        readinessScore: detail.readinessScore,
        riskLevel: detail.riskLevel,
        maintenanceOpen: detail.maintenanceEvents.filter((event) => !['COMPLETED', 'CANCELLED'].includes(statusCode(event.status))).length,
        criticalIssues: detail.inventoryItems.filter((item) => ['LOW STOCK', 'OUT OF STOCK', 'EXPIRED'].includes(statusCode(item.status))).length,
    };
}
async function getStationAssetSummary(tenantId, stationId) {
    const summary = await getAssetCommandCenter(tenantId);
    return summary.stationReadinessImpact.find((item) => item.station?.id === stationId) ?? null;
}
async function listStationAssets(tenantId, stationId) {
    const ctx = await assetContext(tenantId);
    return {
        apparatus: ctx.apparatus.filter((unit) => unit.stationId === stationId).map((unit) => enrichApparatus(unit, ctx)),
        assets: ctx.assets.filter((asset) => asset.stationId === stationId).map((asset) => enrichAsset(asset, ctx)),
        inventory: ctx.inventoryItems.filter((item) => item.stationId === stationId).map((item) => enrichInventory(item, ctx)),
        maintenance: ctx.maintenanceEvents.filter((event) => {
            const apparatus = event.apparatusId ? ctx.apparatusById.get(event.apparatusId) : null;
            const asset = event.assetId ? ctx.assetById.get(event.assetId) : null;
            return apparatus?.stationId === stationId || asset?.stationId === stationId;
        }),
        readiness: await getStationAssetSummary(tenantId, stationId),
    };
}
async function listApparatusMaintenance(tenantId, apparatusId) {
    const ctx = await assetContext(tenantId);
    return ctx.maintenanceByApparatus.get(apparatusId) ?? [];
}
async function listApparatusInventory(tenantId, apparatusId) {
    const ctx = await assetContext(tenantId);
    return ctx.inventoryByApparatus.get(apparatusId) ?? [];
}
async function listApparatus360(tenantId, apparatusId) {
    const detail = await getApparatusDetail(tenantId, apparatusId);
    if (!detail)
        return null;
    return {
        ...detail,
        maintenanceHistory: detail.maintenanceEvents,
        inventory: detail.inventoryItems,
        assets: detail.assignedAssets,
        readiness: await getApparatusReadiness(tenantId, apparatusId),
    };
}
async function getApparatus360(tenantId, apparatusId) {
    return listApparatus360(tenantId, apparatusId);
}
