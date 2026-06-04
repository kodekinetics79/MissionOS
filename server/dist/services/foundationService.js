"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPagination = getPagination;
exports.listUsers = listUsers;
exports.listTenants = listTenants;
exports.listRoles = listRoles;
exports.listPermissions = listPermissions;
exports.getRbacMatrix = getRbacMatrix;
exports.listStations = listStations;
exports.getStationSummary = getStationSummary;
exports.listPersonnel = listPersonnel;
exports.getPersonnelSummary = getPersonnelSummary;
exports.listPersonnelCertifications = listPersonnelCertifications;
exports.listExpiringPersonnelCertifications = listExpiringPersonnelCertifications;
exports.listCertifications = listCertifications;
exports.listApparatus = listApparatus;
exports.listAssets = listAssets;
exports.listInventory = listInventory;
exports.listProperties = listProperties;
exports.listNotifications = listNotifications;
exports.markNotificationRead = markNotificationRead;
exports.listAuditLogs = listAuditLogs;
exports.getRmsSummary = getRmsSummary;
exports.listRmsRecords = listRmsRecords;
exports.listNerisQueue = listNerisQueue;
exports.listEpcrQueue = listEpcrQueue;
exports.searchPlatform = searchPlatform;
exports.getPlatformSummary = getPlatformSummary;
const prisma_js_1 = require("../utils/prisma.js");
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveSkip = (page, take) => (page - 1) * take;
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
function getPagination(query) {
    const page = resolvePage(query.page);
    const take = resolveTake(query.take ?? query.limit);
    return { page, take, skip: resolveSkip(page, take) };
}
async function listUsers(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.user.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.user.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listTenants() {
    return prisma_js_1.prisma.tenant.findMany({ orderBy: { name: 'asc' } });
}
async function listRoles(tenantId) {
    return prisma_js_1.prisma.role.findMany({
        where: { OR: [{ tenantId }, { tenantId: null }] },
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: 'asc' },
    });
}
async function listPermissions() {
    return prisma_js_1.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
}
async function getRbacMatrix(tenantId) {
    const [roles, permissions] = await Promise.all([listRoles(tenantId), listPermissions()]);
    return {
        roles,
        permissions,
        matrix: roles.map((role) => ({
            roleId: role.id,
            permissions: role.permissions.map((link) => link.permission.code),
        })),
    };
}
async function listStations(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.station.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ number: 'asc' }, { name: 'asc' }] }),
        prisma_js_1.prisma.station.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getStationSummary(tenantId, stationId) {
    const [station, personnelCount, apparatusCount, inventoryCount, inspections, certifications, incidents] = await Promise.all([
        prisma_js_1.prisma.station.findFirst({ where: { id: stationId, tenantId } }),
        prisma_js_1.prisma.personnel.count({ where: { tenantId, stationId } }),
        prisma_js_1.prisma.apparatus.count({ where: { tenantId, stationId } }),
        prisma_js_1.prisma.inventoryItem.count({ where: { tenantId, stationId } }),
        prisma_js_1.prisma.inspection.findMany({ where: { tenantId, stationId } }),
        prisma_js_1.prisma.personnelCertification.count({ where: { tenantId, personnel: { is: { stationId } }, OR: [{ expiryDate: { lte: new Date(Date.now() + 30 * 86400000).toISOString() } }, { expiresAt: { lt: new Date(Date.now() + 30 * 86400000) } }] } }),
        prisma_js_1.prisma.incident.findMany({ where: { tenantId, stationId } }),
    ]);
    const openInspections = inspections.filter((inspection) => ['SCHEDULED', 'IN_PROGRESS', 'REINSPECTION_REQUIRED', 'OVERDUE', 'OPEN', 'IN_REVIEW'].includes(statusCode(inspection.status))).length;
    return {
        station,
        personnelCount,
        apparatusCount,
        inventoryCount,
        openInspections,
        expiringCertifications: certifications,
        incidentCount: incidents.length,
        qaNeededIncidents: incidents.filter((incident) => incident.qaStatus === 'QA Needed' || incident.status === 'QA Needed').length,
        nerisRejected: incidents.filter((incident) => incident.nerisStatus === 'Rejected').length,
    };
}
async function listPersonnel(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.personnel.findMany({
            where,
            take,
            skip: resolveSkip(page, take),
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            include: { certifications: true, documents: true },
        }),
        prisma_js_1.prisma.personnel.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getPersonnelSummary(tenantId, personnelId) {
    const [personnel, assignments, certifications, documents, incidentLinks] = await Promise.all([
        prisma_js_1.prisma.personnel.findFirst({ where: { id: personnelId, tenantId }, include: { certifications: true, documents: true } }),
        prisma_js_1.prisma.personnelAssignment.findMany({ where: { tenantId, personnelId } }),
        prisma_js_1.prisma.personnelCertification.findMany({ where: { tenantId, personnelId } }),
        prisma_js_1.prisma.personnelDocument.findMany({ where: { tenantId, personnelId } }),
        prisma_js_1.prisma.incidentPersonnel.findMany({ where: { tenantId, personnelId } }),
    ]);
    return {
        personnel,
        assignments,
        certifications,
        documents,
        readinessScore: personnel?.readinessScore ?? 0,
        incidentCount: incidentLinks.length,
        recentIncidentLinks: incidentLinks.slice(0, 5),
    };
}
async function listPersonnelCertifications(tenantId, personnelId) {
    return prisma_js_1.prisma.personnelCertification.findMany({
        where: { tenantId, personnelId },
        include: { certification: true },
        orderBy: [{ expiryDate: 'asc' }, { issueDate: 'desc' }],
    });
}
async function listExpiringPersonnelCertifications(tenantId) {
    const horizon = new Date(Date.now() + 30 * 86400000);
    return prisma_js_1.prisma.personnelCertification.findMany({
        where: {
            tenantId,
            OR: [{ expiryDate: { lte: horizon.toISOString() } }, { expiresAt: { lte: horizon } }],
        },
        include: {
            certification: true,
            personnel: true,
        },
        orderBy: { expiresAt: 'asc' },
    });
}
async function listCertifications(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.certification.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { name: 'asc' } }),
        prisma_js_1.prisma.certification.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listApparatus(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.apparatus.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ stationId: 'asc' }, { unitNumber: 'asc' }] }),
        prisma_js_1.prisma.apparatus.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listAssets(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.asset.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.asset.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listInventory(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.inventoryItem.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ stationId: 'asc' }, { name: 'asc' }] }),
        prisma_js_1.prisma.inventoryItem.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listProperties(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.property.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { name: 'asc' } }),
        prisma_js_1.prisma.property.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listNotifications(tenantId, userId) {
    const userScope = userId ? [{ userId }, { userId: null }] : [{ userId: null }];
    return prisma_js_1.prisma.notification.findMany({
        where: { tenantId, OR: userScope },
        orderBy: { createdAt: 'desc' },
    });
}
async function markNotificationRead(tenantId, notificationId, userId) {
    const userScope = userId ? [{ userId }, { userId: null }] : [{ userId: null }];
    return prisma_js_1.prisma.notification.updateMany({
        where: { id: notificationId, tenantId, OR: userScope },
        data: { isRead: true },
    });
}
async function listAuditLogs(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.auditLog.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.auditLog.count({ where }),
    ]);
    return { items, page, take, total };
}
async function getRmsSummary(tenantId) {
    const [records, integrationLogs] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.integrationLog.findMany({ where: { tenantId } }),
    ]);
    const nerisQueued = records.filter((record) => ['Queued', 'Rejected'].includes(record.nerisStatus)).length;
    const epcrLinked = records.filter((record) => ['Linked', 'Transmitted'].includes(record.epcrStatus)).length;
    return {
        incidentCount: records.length,
        openRecords: records.filter((record) => ['Draft', 'Submitted', 'QA Needed'].includes(record.status)).length,
        qaNeeded: records.filter((record) => record.qaStatus === 'QA Needed').length,
        nerisQueued,
        nerisRejected: records.filter((record) => record.nerisStatus === 'Rejected').length,
        epcrLinked,
        epcrFailed: records.filter((record) => record.epcrStatus === 'Failed').length,
        averageTurnaroundMinutes: records.length ? Math.round(records.reduce((total, record) => total + Number(record.turnaroundMinutes ?? 18), 0) / records.length) : 0,
        draftExports: integrationLogs.filter((log) => String(log.status).toLowerCase() !== 'success').length,
    };
}
async function listRmsRecords(tenantId, page = 1, take = 50) {
    const where = { tenantId };
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
        prisma_js_1.prisma.incident.count({ where }),
    ]);
    return { items, page, take, total };
}
async function listNerisQueue(tenantId, page = 1, take = 50) {
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where: { tenantId, nerisStatus: { in: ['Queued', 'Rejected', 'Validated'] } }, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
        prisma_js_1.prisma.incident.count({ where: { tenantId, nerisStatus: { in: ['Queued', 'Rejected', 'Validated'] } } }),
    ]);
    return { items, page, take, total };
}
async function listEpcrQueue(tenantId, page = 1, take = 50) {
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where: { tenantId, epcrStatus: { in: ['Pending', 'Linked', 'Transmitted', 'Failed'] } }, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
        prisma_js_1.prisma.incident.count({ where: { tenantId, epcrStatus: { in: ['Pending', 'Linked', 'Transmitted', 'Failed'] } } }),
    ]);
    return { items, page, take, total };
}
async function searchPlatform(tenantId, query) {
    const search = query.trim();
    if (!search) {
        return { query: '', total: 0, groups: [] };
    }
    const [stations, personnel, properties, apparatus, assets, integrations, incidents, supportTickets] = await Promise.all([
        prisma_js_1.prisma.station.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId, OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { employeeNumber: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.property.findMany({ where: { tenantId, name: { contains: search, mode: 'insensitive' } }, take: 10 }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId, OR: [{ unitNumber: { contains: search, mode: 'insensitive' } }, { apparatusType: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.asset.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { assetTag: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.integrationSystem.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { systemType: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.incident.findMany({ where: { tenantId, OR: [{ incidentNumber: { contains: search, mode: 'insensitive' } }, { incidentType: { contains: search, mode: 'insensitive' } }, { location: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
        prisma_js_1.prisma.supportTicket.findMany({ where: { tenantId, OR: [{ title: { contains: search, mode: 'insensitive' } }, { ticketNumber: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    ]);
    const groups = [
        {
            entity: 'Station',
            label: 'Stations',
            items: stations.map((station) => ({ id: station.id, entity: 'Station', title: station.name, subtitle: station.city, module: 'Organization', status: station.staffingStatus ?? station.readinessScore?.toString(), href: `/stations/${station.id}` })),
        },
        {
            entity: 'Personnel',
            label: 'Personnel',
            items: personnel.map((person) => ({ id: person.id, entity: 'Personnel', title: `${person.firstName} ${person.lastName}`, subtitle: person.rank, module: 'Personnel', status: person.status, href: `/personnel/${person.id}` })),
        },
        {
            entity: 'Property',
            label: 'Properties',
            items: properties.map((property) => ({ id: property.id, entity: 'Property', title: property.name, subtitle: property.address, module: 'Prevention', status: property.riskLevel, href: `/properties/${property.id}` })),
        },
        {
            entity: 'Apparatus',
            label: 'Apparatus',
            items: apparatus.map((unit) => ({ id: unit.id, entity: 'Apparatus', title: unit.unitNumber, subtitle: unit.apparatusType, module: 'Assets', status: unit.status, href: `/apparatus/${unit.id}` })),
        },
        {
            entity: 'Asset',
            label: 'Assets',
            items: assets.map((asset) => ({ id: asset.id, entity: 'Asset', title: asset.name, subtitle: asset.assetTag, module: 'Assets', status: asset.status, href: `/assets/${asset.id}` })),
        },
        {
            entity: 'Integration',
            label: 'Integrations',
            items: integrations.map((integration) => ({ id: integration.id, entity: 'Integration', title: integration.name, subtitle: integration.systemType, module: 'Integrations', status: integration.status, href: `/integrations/${integration.id}` })),
        },
        {
            entity: 'Support Ticket',
            label: 'Support Tickets',
            items: supportTickets.map((ticket) => ({ id: ticket.id, entity: 'Support Ticket', title: ticket.title, subtitle: ticket.ticketNumber, module: 'Support', status: ticket.status, href: `/support/tickets/${ticket.id}` })),
        },
        {
            entity: 'Incident',
            label: 'Incidents',
            items: incidents.map((incident) => ({ id: incident.id, entity: 'Incident', title: incident.incidentNumber, subtitle: incident.incidentType, module: 'RMS', status: incident.status, href: `/incidents/${incident.id}` })),
        },
    ].filter((group) => group.items.length > 0);
    return {
        query: search,
        total: groups.reduce((count, group) => count + group.items.length, 0),
        groups,
    };
}
async function getPlatformSummary(tenantId) {
    const [stations, personnel, apparatus, properties, notifications, integrations, certifications] = await Promise.all([
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.property.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId, isRead: false } }),
        prisma_js_1.prisma.integrationSystem.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnelCertification.findMany({ where: { tenantId, OR: [{ expiryDate: { lte: new Date(Date.now() + 30 * 86400000).toISOString() } }, { expiresAt: { lte: new Date(Date.now() + 30 * 86400000) } }] } }),
    ]);
    return {
        tenant: await prisma_js_1.prisma.tenant.findFirst({ where: { id: tenantId } }),
        stationCount: stations.length,
        personnelCount: personnel.length,
        apparatusCount: apparatus.length,
        propertyCount: properties.length,
        notificationCount: notifications.length,
        openAlerts: notifications.length,
        integrationHealth: {
            healthy: integrations.filter((integration) => statusCode(integration.status) === 'HEALTHY').length,
            degraded: integrations.filter((integration) => statusCode(integration.status) === 'DEGRADED').length,
            failed: integrations.filter((integration) => statusCode(integration.status) === 'FAILED').length,
        },
        readiness: {
            agencyAverage: Math.round(stations.reduce((total, station) => total + station.readinessScore, 0) / Math.max(stations.length, 1)),
            criticalStations: stations.filter((station) => station.readinessScore < 80).length,
            expiringCertifications: certifications.length,
            openStaffingGaps: stations.filter((station) => statusCode(station.staffingStatus) !== 'COVERED').length,
        },
        personnelReadiness: {
            ready: personnel.filter((member) => (member.readinessScore ?? 0) >= 90).length,
            watch: personnel.filter((member) => (member.readinessScore ?? 0) >= 75 && (member.readinessScore ?? 0) < 90).length,
            atRisk: personnel.filter((member) => (member.readinessScore ?? 0) >= 60 && (member.readinessScore ?? 0) < 75).length,
            critical: personnel.filter((member) => (member.readinessScore ?? 0) < 60).length,
            average: personnel.length ? Math.round(personnel.reduce((sum, member) => sum + Number(member.readinessScore ?? 0), 0) / personnel.length) : 0,
        },
    };
}
