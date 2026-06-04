import { prisma } from '../utils/prisma.js';

const resolveTake = (value: unknown) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolvePage = (value: unknown) => Math.max(Number(value || 1), 1);
const resolveSkip = (page: number, take: number) => (page - 1) * take;
const statusCode = (value: unknown) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();

export function getPagination(query: Record<string, unknown>) {
  const page = resolvePage(query.page);
  const take = resolveTake(query.take ?? query.limit);
  return { page, take, skip: resolveSkip(page, take) };
}

export async function listUsers(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listTenants() {
  return prisma.tenant.findMany({ orderBy: { name: 'asc' } });
}

export async function listRoles(tenantId: string) {
  return prisma.role.findMany({
    where: { OR: [{ tenantId }, { tenantId: null }] },
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
}

export async function getRbacMatrix(tenantId: string) {
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

export async function listStations(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.station.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ number: 'asc' }, { name: 'asc' }] }),
    prisma.station.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getStationSummary(tenantId: string, stationId: string) {
  const [station, personnelCount, apparatusCount, inventoryCount, inspections, certifications, incidents] = await Promise.all([
    prisma.station.findFirst({ where: { id: stationId, tenantId } }),
    prisma.personnel.count({ where: { tenantId, stationId } }),
    prisma.apparatus.count({ where: { tenantId, stationId } }),
    prisma.inventoryItem.count({ where: { tenantId, stationId } }),
    prisma.inspection.findMany({ where: { tenantId, stationId } }),
    prisma.personnelCertification.count({ where: { tenantId, personnel: { is: { stationId } }, OR: [{ expiryDate: { lte: new Date(Date.now() + 30 * 86400000).toISOString() } }, { expiresAt: { lt: new Date(Date.now() + 30 * 86400000) } }] } }),
    prisma.incident.findMany({ where: { tenantId, stationId } }),
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

export async function listPersonnel(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.personnel.findMany({
      where,
      take,
      skip: resolveSkip(page, take),
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: { certifications: true, documents: true },
    }),
    prisma.personnel.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getPersonnelSummary(tenantId: string, personnelId: string) {
  const [personnel, assignments, certifications, documents, incidentLinks] = await Promise.all([
    prisma.personnel.findFirst({ where: { id: personnelId, tenantId }, include: { certifications: true, documents: true } }),
    prisma.personnelAssignment.findMany({ where: { tenantId, personnelId } }),
    prisma.personnelCertification.findMany({ where: { tenantId, personnelId } }),
    prisma.personnelDocument.findMany({ where: { tenantId, personnelId } }),
    prisma.incidentPersonnel.findMany({ where: { tenantId, personnelId } }),
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

export async function listPersonnelCertifications(tenantId: string, personnelId: string) {
  return prisma.personnelCertification.findMany({
    where: { tenantId, personnelId },
    include: { certification: true },
    orderBy: [{ expiryDate: 'asc' }, { issueDate: 'desc' }],
  });
}

export async function listExpiringPersonnelCertifications(tenantId: string) {
  const horizon = new Date(Date.now() + 30 * 86400000);
  return prisma.personnelCertification.findMany({
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

export async function listCertifications(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.certification.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { name: 'asc' } }),
    prisma.certification.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listApparatus(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.apparatus.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ stationId: 'asc' }, { unitNumber: 'asc' }] }),
    prisma.apparatus.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listAssets(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.asset.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
    prisma.asset.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listInventory(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({ where, take, skip: resolveSkip(page, take), orderBy: [{ stationId: 'asc' }, { name: 'asc' }] }),
    prisma.inventoryItem.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listProperties(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.property.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { name: 'asc' } }),
    prisma.property.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listNotifications(tenantId: string, userId?: string) {
  const userScope = userId ? [{ userId }, { userId: null }] : [{ userId: null }];
  return prisma.notification.findMany({
    where: { tenantId, OR: userScope },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationRead(tenantId: string, notificationId: string, userId?: string) {
  const userScope = userId ? [{ userId }, { userId: null }] : [{ userId: null }];
  return prisma.notification.updateMany({
    where: { id: notificationId, tenantId, OR: userScope },
    data: { isRead: true },
  });
}

export async function listAuditLogs(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { createdAt: 'desc' } }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function getRmsSummary(tenantId: string) {
  const [records, integrationLogs] = await Promise.all([
    prisma.incident.findMany({ where: { tenantId } }),
    prisma.integrationLog.findMany({ where: { tenantId } }),
  ]);

  const nerisQueued = records.filter((record: any) => ['Queued', 'Rejected'].includes(record.nerisStatus)).length;
  const epcrLinked = records.filter((record: any) => ['Linked', 'Transmitted'].includes(record.epcrStatus)).length;

  return {
    incidentCount: records.length,
    openRecords: records.filter((record: any) => ['Draft', 'Submitted', 'QA Needed'].includes(record.status)).length,
    qaNeeded: records.filter((record: any) => record.qaStatus === 'QA Needed').length,
    nerisQueued,
    nerisRejected: records.filter((record: any) => record.nerisStatus === 'Rejected').length,
    epcrLinked,
    epcrFailed: records.filter((record: any) => record.epcrStatus === 'Failed').length,
    averageTurnaroundMinutes: records.length ? Math.round(records.reduce((total: number, record: any) => total + Number(record.turnaroundMinutes ?? 18), 0) / records.length) : 0,
    draftExports: integrationLogs.filter((log: any) => String(log.status).toLowerCase() !== 'success').length,
  };
}

export async function listRmsRecords(tenantId: string, page = 1, take = 50) {
  const where = { tenantId };
  const [items, total] = await Promise.all([
    prisma.incident.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
    prisma.incident.count({ where }),
  ]);
  return { items, page, take, total };
}

export async function listNerisQueue(tenantId: string, page = 1, take = 50) {
  const [items, total] = await Promise.all([
    prisma.incident.findMany({ where: { tenantId, nerisStatus: { in: ['Queued', 'Rejected', 'Validated'] } }, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
    prisma.incident.count({ where: { tenantId, nerisStatus: { in: ['Queued', 'Rejected', 'Validated'] } } }),
  ]);
  return { items, page, take, total };
}

export async function listEpcrQueue(tenantId: string, page = 1, take = 50) {
  const [items, total] = await Promise.all([
    prisma.incident.findMany({ where: { tenantId, epcrStatus: { in: ['Pending', 'Linked', 'Transmitted', 'Failed'] } }, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
    prisma.incident.count({ where: { tenantId, epcrStatus: { in: ['Pending', 'Linked', 'Transmitted', 'Failed'] } } }),
  ]);
  return { items, page, take, total };
}

export async function searchPlatform(tenantId: string, query: string) {
  const search = query.trim();
  if (!search) {
    return { query: '', total: 0, groups: [] };
  }

  const [stations, personnel, properties, apparatus, assets, integrations, incidents, supportTickets] = await Promise.all([
    prisma.station.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.personnel.findMany({ where: { tenantId, OR: [{ firstName: { contains: search, mode: 'insensitive' } }, { lastName: { contains: search, mode: 'insensitive' } }, { employeeNumber: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.property.findMany({ where: { tenantId, name: { contains: search, mode: 'insensitive' } }, take: 10 }),
    prisma.apparatus.findMany({ where: { tenantId, OR: [{ unitNumber: { contains: search, mode: 'insensitive' } }, { apparatusType: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.asset.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { assetTag: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.integrationSystem.findMany({ where: { tenantId, OR: [{ name: { contains: search, mode: 'insensitive' } }, { systemType: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.incident.findMany({ where: { tenantId, OR: [{ incidentNumber: { contains: search, mode: 'insensitive' } }, { incidentType: { contains: search, mode: 'insensitive' } }, { location: { contains: search, mode: 'insensitive' } }, { city: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
    prisma.supportTicket.findMany({ where: { tenantId, OR: [{ title: { contains: search, mode: 'insensitive' } }, { ticketNumber: { contains: search, mode: 'insensitive' } }] }, take: 10 }),
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

export async function getPlatformSummary(tenantId: string) {
  const [stations, personnel, apparatus, properties, notifications, integrations, certifications] = await Promise.all([
    prisma.station.findMany({ where: { tenantId } }),
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.apparatus.findMany({ where: { tenantId } }),
    prisma.property.findMany({ where: { tenantId } }),
    prisma.notification.findMany({ where: { tenantId, isRead: false } }),
    prisma.integrationSystem.findMany({ where: { tenantId } }),
    prisma.personnelCertification.findMany({ where: { tenantId, OR: [{ expiryDate: { lte: new Date(Date.now() + 30 * 86400000).toISOString() } }, { expiresAt: { lte: new Date(Date.now() + 30 * 86400000) } }] } }),
  ]);

  return {
    tenant: await prisma.tenant.findFirst({ where: { id: tenantId } }),
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
