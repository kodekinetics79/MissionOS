"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentDuplicateDetectionService = exports.incidentDataQualityService = exports.cadImportService = exports.epcrLinkService = exports.nerisExportService = exports.nerisMappingService = exports.incidentAttachmentService = exports.incidentNarrativeService = exports.incidentTimelineService = exports.incidentQaService = exports.incidentWorkflowService = exports.incidentService = void 0;
exports.listIncidents = listIncidents;
exports.getIncidentDetail = getIncidentDetail;
exports.createIncident = createIncident;
exports.updateIncident = updateIncident;
exports.submitIncident = submitIncident;
exports.approveIncidentQa = approveIncidentQa;
exports.returnIncidentQa = returnIncidentQa;
exports.closeIncident = closeIncident;
exports.listIncidentTimeline = listIncidentTimeline;
exports.addIncidentTimelineEvent = addIncidentTimelineEvent;
exports.listIncidentNarratives = listIncidentNarratives;
exports.addIncidentNarrative = addIncidentNarrative;
exports.listIncidentAttachments = listIncidentAttachments;
exports.scanIncidentDataQuality = scanIncidentDataQuality;
exports.listIncidentDataQualityIssues = listIncidentDataQualityIssues;
exports.listIncidentDuplicateCandidates = listIncidentDuplicateCandidates;
exports.listNerisMappings = listNerisMappings;
exports.updateNerisMapping = updateNerisMapping;
exports.getNerisExportPreview = getNerisExportPreview;
exports.exportIncidentToNeris = exportIncidentToNeris;
exports.listEpcrLinks = listEpcrLinks;
exports.createEpcrLink = createEpcrLink;
exports.listCadImportLogs = listCadImportLogs;
exports.getIncidentCommandCenter = getIncidentCommandCenter;
const prisma_js_1 = require("../utils/prisma.js");
const resolveTake = (value) => Math.min(Math.max(Number(value || 50), 1), 100);
const resolvePage = (value) => Math.max(Number(value || 1), 1);
const resolveSkip = (page, take) => (page - 1) * take;
const nowIso = () => new Date().toISOString();
const toDate = (value) => (value ? new Date(value).toISOString() : null);
const secondsFromNow = (seconds) => new Date(Date.now() + seconds * 1000).toISOString();
const statusCode = (value) => String(value ?? '').replace(/\s+/g, '_').toUpperCase();
function incidentStatus(value) {
    return String(value ?? 'Draft').replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || 'Draft';
}
function buildIncidentNumber(tenantId, count) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `WM-${stamp}-${String(count + 1).padStart(4, '0')}`;
}
async function writeAuditLog(tenantId, userId, action, entityName, entityId, before, after) {
    await prisma_js_1.prisma.auditLog.create({
        data: {
            tenantId,
            userId,
            action,
            entityName,
            entityId: entityId ?? null,
            before: before ?? null,
            after: after ?? null,
            ipAddress: null,
        },
    });
}
async function writeNotification(tenantId, userId, title, message, notificationType) {
    await prisma_js_1.prisma.notification.create({
        data: { tenantId, userId: userId ?? null, title, message, notificationType, isRead: false },
    });
}
async function writeInsight(tenantId, category, title, summary, severity, dataSources, recommendedActions) {
    await prisma_js_1.prisma.aiInsight.create({
        data: {
            tenantId,
            category,
            title,
            summary,
            severity,
            confidenceScore: 88,
            dataSources,
            recommendedActions,
            status: 'Open',
        },
    });
}
async function loadIncidentContext(tenantId) {
    const [incidents, stations, battalions, personnel, apparatus, incidentUnits, incidentPersonnel, mappings, timelineEvents, narratives, qaReviews, attachments, epcrLinks, nerisLogs, cadLogs, dataQualityIssues, duplicateCandidates, notifications, aiInsights,] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where: { tenantId }, orderBy: { updatedAt: 'desc' } }),
        prisma_js_1.prisma.station.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.battalion.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.apparatus.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incidentUnit.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incidentPersonnel.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.nerisMapping.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.incidentTimelineEvent.findMany({ where: { tenantId }, orderBy: { eventTime: 'desc' } }),
        prisma_js_1.prisma.incidentNarrative.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.incidentQaReview.findMany({ where: { tenantId }, orderBy: { reviewedAt: 'desc' } }),
        prisma_js_1.prisma.incidentAttachment.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.epcrLink.findMany({ where: { tenantId }, orderBy: { lastSyncedAt: 'desc' } }),
        prisma_js_1.prisma.nerisExportLog.findMany({ where: { tenantId }, orderBy: { exportedAt: 'desc' } }),
        prisma_js_1.prisma.cadImportLog.findMany({ where: { tenantId }, orderBy: { importedAt: 'desc' } }),
        prisma_js_1.prisma.incidentDataQualityIssue.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.incidentDuplicateCandidate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId } }),
    ]);
    const stationMap = new Map(stations.map((station) => [station.id, station]));
    const battalionMap = new Map(battalions.map((battalion) => [battalion.id, battalion]));
    const personnelMap = new Map(personnel.map((member) => [member.id, member]));
    const apparatusMap = new Map(apparatus.map((unit) => [unit.id, unit]));
    const enrichIncident = (incident) => {
        const station = stationMap.get(incident.stationId) ?? null;
        const battalion = station?.battalionId ? battalionMap.get(station.battalionId) : null;
        const units = incidentUnits
            .filter((unit) => unit.incidentId === incident.id)
            .map((unit) => ({
            ...unit,
            apparatus: unit.apparatusId ? apparatusMap.get(unit.apparatusId) ?? null : null,
        }))
            .slice(0, 6);
        const incidentPersonnelRows = incidentPersonnel.filter((member) => member.incidentId === incident.id);
        const timeline = timelineEvents.filter((event) => event.incidentId === incident.id);
        return {
            ...incident,
            station: station?.name ?? incident.station ?? station?.number?.toString() ?? null,
            stationName: station?.name ?? null,
            battalion: battalion?.name ?? station?.battalion ?? null,
            battalionName: battalion?.name ?? null,
            unitsDetailed: units,
            personnelDetailed: incidentPersonnelRows.map((member) => ({
                ...member,
                personnel: personnelMap.get(member.personnelId) ?? null,
            })),
            timeline,
            narratives: narratives.filter((item) => item.incidentId === incident.id),
            qaReviews: qaReviews.filter((item) => item.incidentId === incident.id),
            attachments: attachments.filter((item) => item.incidentId === incident.id),
            epcrLinks: epcrLinks.filter((item) => item.incidentId === incident.id),
            nerisExports: nerisLogs.filter((item) => item.incidentId === incident.id),
            dataQualityIssues: dataQualityIssues.filter((item) => item.incidentId === incident.id),
            duplicateCandidates: duplicateCandidates.filter((item) => item.incidentId === incident.id),
        };
    };
    return {
        incidents,
        stations,
        battalions,
        personnel,
        apparatus,
        incidentUnits,
        incidentPersonnel,
        mappings,
        timelineEvents,
        narratives,
        qaReviews,
        attachments,
        epcrLinks,
        nerisLogs,
        cadLogs,
        dataQualityIssues,
        duplicateCandidates,
        notifications,
        aiInsights,
        enrichIncident,
    };
}
function summarizeWorkload(incident) {
    const readinessPenalty = [
        incident.status === 'Draft' ? 2 : 0,
        incident.qaStatus === 'QA Needed' ? 3 : 0,
        !incident.narrativeComplete ? 2 : 0,
        !incident.attachmentsComplete ? 2 : 0,
        incident.nerisStatus === 'Rejected' ? 4 : 0,
        incident.epcrStatus === 'Failed' ? 4 : 0,
    ].reduce((sum, value) => sum + value, 0);
    return Math.max(0, 100 - readinessPenalty * 10);
}
async function listIncidents(tenantId, page = 1, take = 50, filters = {}) {
    const where = { tenantId };
    if (filters.status)
        where.status = String(filters.status);
    if (filters.stationId)
        where.stationId = String(filters.stationId);
    if (filters.qaStatus)
        where.qaStatus = String(filters.qaStatus);
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.incident.findMany({ where, take, skip: resolveSkip(page, take), orderBy: { updatedAt: 'desc' } }),
        prisma_js_1.prisma.incident.count({ where }),
    ]);
    const [stations] = await Promise.all([prisma_js_1.prisma.station.findMany({ where: { tenantId } })]);
    const stationMap = new Map(stations.map((station) => [station.id, station]));
    return {
        items: items.map((incident) => ({
            ...incident,
            station: stationMap.get(incident.stationId)?.name ?? incident.station ?? null,
            battalion: stationMap.get(incident.stationId)?.battalion ?? null,
            readinessImpact: summarizeWorkload(incident),
        })),
        page,
        take,
        total,
    };
}
async function getIncidentDetail(tenantId, incidentId) {
    const context = await loadIncidentContext(tenantId);
    const incident = context.incidents.find((item) => item.id === incidentId) ?? null;
    if (!incident)
        return null;
    const enriched = context.enrichIncident(incident);
    const station = context.stations.find((item) => item.id === incident.stationId) ?? null;
    const battalion = station?.battalionId ? (context.battalions.find((item) => item.id === station.battalionId) ?? null) : null;
    return {
        ...enriched,
        station,
        battalion,
        readinessImpact: summarizeWorkload(incident),
        riskWarnings: incidentWarnings(enriched),
    };
}
function incidentWarnings(incident) {
    const warnings = [];
    if (!incident.narrativeComplete)
        warnings.push('Narrative incomplete');
    if (!incident.attachmentsComplete)
        warnings.push('Attachments missing');
    if (incident.qaStatus === 'QA Needed')
        warnings.push('QA review required');
    if (incident.nerisStatus === 'Rejected')
        warnings.push('NERIS export rejected');
    if (incident.epcrStatus === 'Failed')
        warnings.push('ePCR exchange failed');
    return warnings;
}
async function createIncident(tenantId, userId, data) {
    const count = await prisma_js_1.prisma.incident.count({ where: { tenantId } });
    const payload = {
        tenantId,
        incidentNumber: String(data.incidentNumber ?? buildIncidentNumber(tenantId, count)),
        incidentType: String(data.incidentType ?? 'Incident'),
        recordType: String(data.recordType ?? 'Incident Report'),
        reportNumber: String(data.reportNumber ?? `RPT-${buildIncidentNumber(tenantId, count)}`),
        patientCount: Number(data.patientCount ?? 0),
        assignedTo: String(data.assignedTo ?? 'Unassigned'),
        stationId: data.stationId ? String(data.stationId) : null,
        location: String(data.location ?? ''),
        city: String(data.city ?? ''),
        source: String(data.source ?? 'Manual Entry'),
        status: incidentStatus(data.status ?? 'Draft'),
        qaStatus: String(data.qaStatus ?? 'Open'),
        nerisStatus: String(data.nerisStatus ?? 'Ready'),
        epcrStatus: String(data.epcrStatus ?? 'Not Required'),
        nerisReady: Boolean(data.nerisReady ?? false),
        epcrLinked: Boolean(data.epcrLinked ?? false),
        narrativeComplete: Boolean(data.narrativeComplete ?? false),
        attachmentsComplete: Boolean(data.attachmentsComplete ?? false),
        dispatchAt: data.dispatchAt ? String(data.dispatchAt) : null,
        arrivalAt: data.arrivalAt ? String(data.arrivalAt) : null,
        clearedAt: data.clearedAt ? String(data.clearedAt) : null,
        lastUpdatedAt: nowIso(),
        turnaroundMinutes: Number(data.turnaroundMinutes ?? 0),
        createdAt: nowIso(),
        updatedAt: nowIso(),
    };
    const incident = await prisma_js_1.prisma.incident.create({ data: payload });
    await writeAuditLog(tenantId, userId, 'Created incident', 'Incident', incident.id, null, incident);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} created`, 'The record is ready for workflow and QA review.', 'incident.created');
    return getIncidentDetail(tenantId, incident.id);
}
async function updateIncident(tenantId, userId, incidentId, data) {
    const before = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!before)
        return null;
    const incident = await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            ...data,
            stationId: data.stationId === undefined ? before.stationId : data.stationId ? String(data.stationId) : null,
            status: data.status ? incidentStatus(data.status) : before.status,
            qaStatus: data.qaStatus ? String(data.qaStatus) : before.qaStatus,
            updatedAt: nowIso(),
            lastUpdatedAt: nowIso(),
        },
    });
    await writeAuditLog(tenantId, userId, 'Updated incident', 'Incident', incident.id, before, incident);
    return getIncidentDetail(tenantId, incident.id);
}
async function submitIncident(tenantId, userId, incidentId) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return null;
    const updated = await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'Submitted',
            qaStatus: 'QA Needed',
            lastUpdatedAt: nowIso(),
            updatedAt: nowIso(),
            nerisReady: Boolean(incident.nerisReady),
        },
    });
    const issues = await scanIncidentDataQuality(tenantId, incidentId);
    await writeAuditLog(tenantId, userId, 'Submitted incident for QA', 'Incident', incidentId, incident, updated);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} submitted`, `${issues.length} data quality issue(s) flagged for review.`, 'incident.qa');
    if (issues.length) {
        await writeInsight(tenantId, 'Incident QA', `Incident ${incident.incidentNumber} needs QA attention`, `${issues.length} issue(s) surfaced during submission review.`, 'Warning', ['Incidents', 'Data Quality', 'AI Advisor'], ['Review data quality issues', 'Approve or return for correction']);
    }
    return getIncidentDetail(tenantId, incidentId);
}
async function approveIncidentQa(tenantId, userId, incidentId, notes) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return null;
    const updated = await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'Approved',
            qaStatus: 'Passed',
            qaReviewedAt: nowIso(),
            lastUpdatedAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.incidentQaReview.create({
        data: { tenantId, incidentId, reviewerName: userId ?? 'System', status: 'Approved', notes: notes ?? 'QA approved', reviewedAt: nowIso(), createdAt: nowIso() },
    });
    await writeAuditLog(tenantId, userId, 'Approved incident QA', 'Incident', incidentId, incident, updated);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} approved`, 'The report cleared QA and is ready to close or export.', 'incident.qa.approved');
    return getIncidentDetail(tenantId, incidentId);
}
async function returnIncidentQa(tenantId, userId, incidentId, notes) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return null;
    const updated = await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'QA Needed',
            qaStatus: 'Returned',
            qaReviewedAt: nowIso(),
            lastUpdatedAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.incidentQaReview.create({
        data: { tenantId, incidentId, reviewerName: userId ?? 'System', status: 'Returned', notes: notes ?? 'Returned for correction', reviewedAt: nowIso(), createdAt: nowIso() },
    });
    await prisma_js_1.prisma.incidentDataQualityIssue.createMany({
        data: [
            {
                tenantId,
                incidentId,
                category: 'QA Return',
                severity: 'High',
                status: 'Open',
                fieldName: 'report',
                issueDescription: notes ?? 'QA return requested',
                resolutionNotes: null,
                createdAt: nowIso(),
                updatedAt: nowIso(),
            },
        ],
    });
    await writeAuditLog(tenantId, userId, 'Returned incident from QA', 'Incident', incidentId, incident, updated);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} returned`, 'QA corrections are required before export.', 'incident.qa.returned');
    return getIncidentDetail(tenantId, incidentId);
}
async function closeIncident(tenantId, userId, incidentId) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return null;
    const updated = await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            status: 'Closed',
            qaStatus: 'Passed',
            clearedAt: incident.clearedAt ?? nowIso(),
            lastUpdatedAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await writeAuditLog(tenantId, userId, 'Closed incident', 'Incident', incidentId, incident, updated);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} closed`, 'The record is closed and retained for export/readiness analysis.', 'incident.closed');
    return getIncidentDetail(tenantId, incidentId);
}
async function listIncidentTimeline(tenantId, incidentId) {
    return prisma_js_1.prisma.incidentTimelineEvent.findMany({ where: { tenantId, incidentId }, orderBy: { eventTime: 'asc' } });
}
async function addIncidentTimelineEvent(tenantId, userId, incidentId, data) {
    const event = await prisma_js_1.prisma.incidentTimelineEvent.create({
        data: {
            tenantId,
            incidentId,
            eventTime: data.eventTime ? String(data.eventTime) : nowIso(),
            eventType: String(data.eventType ?? 'Update'),
            notes: data.notes ? String(data.notes) : null,
            createdAt: nowIso(),
        },
    });
    await writeAuditLog(tenantId, userId, 'Added incident timeline event', 'IncidentTimelineEvent', event.id, null, event);
    return event;
}
async function listIncidentNarratives(tenantId, incidentId) {
    return prisma_js_1.prisma.incidentNarrative.findMany({ where: { tenantId, incidentId }, orderBy: { createdAt: 'asc' } });
}
async function addIncidentNarrative(tenantId, userId, incidentId, data) {
    const narrative = await prisma_js_1.prisma.incidentNarrative.create({
        data: {
            tenantId,
            incidentId,
            authorName: String(data.authorName ?? 'Duty Officer'),
            narrative: String(data.narrative ?? ''),
            createdAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.incident.update({ where: { id: incidentId }, data: { narrativeComplete: true, lastUpdatedAt: nowIso(), updatedAt: nowIso() } });
    await writeAuditLog(tenantId, userId, 'Added incident narrative', 'IncidentNarrative', narrative.id, null, narrative);
    return narrative;
}
async function listIncidentAttachments(tenantId, incidentId) {
    return prisma_js_1.prisma.incidentAttachment.findMany({ where: { tenantId, incidentId }, orderBy: { createdAt: 'asc' } });
}
async function scanIncidentDataQuality(tenantId, incidentId) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return [];
    const issues = [];
    if (!incident.location) {
        issues.push({ tenantId, incidentId, category: 'Location', severity: 'High', status: 'Open', fieldName: 'location', issueDescription: 'Missing incident location', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (!incident.incidentType) {
        issues.push({ tenantId, incidentId, category: 'Classification', severity: 'High', status: 'Open', fieldName: 'incidentType', issueDescription: 'Missing incident type classification', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (incident.status !== 'Draft' && !incident.narrativeComplete) {
        issues.push({ tenantId, incidentId, category: 'Narrative', severity: 'Normal', status: 'Open', fieldName: 'narrative', issueDescription: 'Narrative is incomplete for a submitted record', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (incident.recordType === 'EMS Run' && !incident.epcrLinked) {
        issues.push({ tenantId, incidentId, category: 'ePCR', severity: 'Critical', status: 'Open', fieldName: 'epcrLinked', issueDescription: 'EMS record is not linked to ePCR', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (incident.status === 'Submitted' && !incident.nerisReady) {
        issues.push({ tenantId, incidentId, category: 'NERIS', severity: 'Critical', status: 'Open', fieldName: 'nerisReady', issueDescription: 'Incident is not export-ready for NERIS', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    if (incident.duplicateFlag) {
        issues.push({ tenantId, incidentId, category: 'Duplicate', severity: 'High', status: 'Open', fieldName: 'incidentNumber', issueDescription: 'Potential duplicate incident detected', resolutionNotes: null, createdAt: nowIso(), updatedAt: nowIso() });
    }
    return issues;
}
async function listIncidentDataQualityIssues(tenantId, incidentId) {
    const persisted = await prisma_js_1.prisma.incidentDataQualityIssue.findMany({
        where: incidentId ? { tenantId, incidentId } : { tenantId },
        orderBy: { createdAt: 'desc' },
    });
    if (!incidentId)
        return persisted;
    const derived = await scanIncidentDataQuality(tenantId, incidentId);
    return [...persisted, ...derived];
}
async function listIncidentDuplicateCandidates(tenantId) {
    return prisma_js_1.prisma.incidentDuplicateCandidate.findMany({ where: { tenantId }, orderBy: { confidence: 'desc' } });
}
async function listNerisMappings(tenantId) {
    const mappings = await prisma_js_1.prisma.nerisMapping.findMany({ where: { tenantId }, orderBy: { nerisField: 'asc' } });
    return mappings.map((mapping) => ({
        ...mapping,
        exportReadiness: Number(mapping.exportReadiness ?? 90),
        lastExportedAt: mapping.lastExportedAt ?? null,
    }));
}
async function updateNerisMapping(tenantId, userId, mappingId, data) {
    const before = await prisma_js_1.prisma.nerisMapping.findFirst({ where: { id: mappingId, tenantId } });
    if (!before)
        return null;
    const updated = await prisma_js_1.prisma.nerisMapping.update({
        where: { id: mappingId },
        data: {
            ...data,
            updatedAt: nowIso(),
            exportReadiness: data.exportReadiness ? Number(data.exportReadiness) : before.exportReadiness,
        },
    });
    await writeAuditLog(tenantId, userId, 'Updated NERIS mapping', 'NerisMapping', mappingId, before, updated);
    return updated;
}
async function getNerisExportPreview(tenantId, incidentId) {
    const context = await loadIncidentContext(tenantId);
    const incident = context.incidents.find((item) => item.id === incidentId) ?? null;
    if (!incident)
        return null;
    const activeMappings = context.mappings.filter((mapping) => mapping.isActive !== false);
    const previewRows = activeMappings.map((mapping) => ({
        internalField: mapping.internalField,
        nerisField: mapping.nerisField,
        required: Boolean(mapping.required),
        validationStatus: mapping.validationStatus ?? (incident[mapping.internalField] ? 'Valid' : 'Missing'),
        value: incident[mapping.internalField] ?? null,
        exportReady: Boolean(incident[mapping.internalField] || !mapping.required),
        lastExportedAt: mapping.lastExportedAt ?? null,
    }));
    return {
        incident: context.enrichIncident(incident),
        ready: previewRows.every((row) => row.exportReady),
        warnings: incidentWarnings(incident),
        mappings: previewRows,
        lastExportedAt: context.nerisLogs.find((log) => log.incidentId === incident.id)?.exportedAt ?? null,
    };
}
async function exportIncidentToNeris(tenantId, userId, incidentId) {
    const incident = await prisma_js_1.prisma.incident.findFirst({ where: { id: incidentId, tenantId } });
    if (!incident)
        return null;
    const preview = await getNerisExportPreview(tenantId, incidentId);
    const status = preview?.ready ? 'Success' : 'Rejected';
    const log = await prisma_js_1.prisma.nerisExportLog.create({
        data: {
            tenantId,
            incidentId,
            status,
            payload: preview,
            exportedAt: nowIso(),
            createdAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.incident.update({
        where: { id: incidentId },
        data: {
            nerisStatus: status === 'Success' ? 'Transmitted' : 'Rejected',
            status: status === 'Success' ? 'Exported' : incident.status,
            nerisReady: Boolean(preview?.ready),
            lastUpdatedAt: nowIso(),
            updatedAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.nerisMapping.updateMany({ where: { tenantId }, data: { lastExportedAt: nowIso(), validationStatus: status === 'Success' ? 'Valid' : 'Warning', exportReadiness: preview?.ready ? 100 : 82 } });
    await writeAuditLog(tenantId, userId, 'Exported incident to NERIS', 'Incident', incidentId, incident, log);
    await writeNotification(tenantId, userId, `Incident ${incident.incidentNumber} ${status === 'Success' ? 'exported' : 'blocked'}`, status === 'Success' ? 'NERIS export completed successfully.' : 'NERIS export blocked by validation warnings.', 'incident.neris');
    return log;
}
async function listEpcrLinks(tenantId) {
    return prisma_js_1.prisma.epcrLink.findMany({ where: { tenantId }, orderBy: { lastSyncedAt: 'desc' } });
}
async function createEpcrLink(tenantId, userId, data) {
    const link = await prisma_js_1.prisma.epcrLink.create({
        data: {
            tenantId,
            incidentId: String(data.incidentId),
            externalEpcrId: String(data.externalEpcrId ?? `EPCR-${Date.now()}`),
            vendorName: String(data.vendorName ?? 'Unknown'),
            syncStatus: String(data.syncStatus ?? 'Linked'),
            accessRestricted: data.accessRestricted === undefined ? true : Boolean(data.accessRestricted),
            hipaaWarning: data.hipaaWarning === undefined ? true : Boolean(data.hipaaWarning),
            sensitiveAccessLogCount: Number(data.sensitiveAccessLogCount ?? 0),
            lastAccessedAt: data.lastAccessedAt ? String(data.lastAccessedAt) : nowIso(),
            lastSyncedAt: nowIso(),
        },
    });
    await prisma_js_1.prisma.incident.update({ where: { id: String(data.incidentId) }, data: { epcrLinked: true, epcrStatus: 'Linked', lastUpdatedAt: nowIso(), updatedAt: nowIso() } });
    await writeAuditLog(tenantId, userId, 'Linked ePCR record', 'EpcrLink', link.id, null, link);
    await writeNotification(tenantId, userId, 'ePCR linkage created', 'Linked record is restricted and HIPAA-aware.', 'incident.epcr');
    return link;
}
async function listCadImportLogs(tenantId) {
    return prisma_js_1.prisma.cadImportLog.findMany({ where: { tenantId }, orderBy: { importedAt: 'desc' } });
}
async function getIncidentCommandCenter(tenantId) {
    const context = await loadIncidentContext(tenantId);
    const incidents = context.incidents.map((incident) => context.enrichIncident(incident));
    const summary = {
        totalIncidents: incidents.length,
        draft: incidents.filter((incident) => statusCode(incident.status) === 'DRAFT').length,
        submitted: incidents.filter((incident) => statusCode(incident.status) === 'SUBMITTED').length,
        qaNeeded: incidents.filter((incident) => statusCode(incident.status) === 'QA_NEEDED' || incident.qaStatus === 'QA Needed').length,
        approved: incidents.filter((incident) => statusCode(incident.status) === 'APPROVED').length,
        closed: incidents.filter((incident) => statusCode(incident.status) === 'CLOSED').length,
        exported: incidents.filter((incident) => statusCode(incident.status) === 'EXPORTED').length,
        nerisReady: incidents.filter((incident) => Boolean(incident.nerisReady)).length,
        epcrLinked: incidents.filter((incident) => Boolean(incident.epcrLinked)).length,
        openDataQualityIssues: context.dataQualityIssues.filter((issue) => issue.status !== 'Resolved').length,
        duplicateCandidates: context.duplicateCandidates.filter((item) => item.status !== 'Resolved').length,
    };
    return {
        summary,
        incidents,
        qaQueue: incidents.filter((incident) => incident.status === 'Submitted' || incident.qaStatus === 'QA Needed' || incident.qaStatus === 'Returned'),
        nerisReady: incidents.filter((incident) => incident.nerisReady || incident.nerisStatus === 'Queued'),
        epcrQueue: incidents.filter((incident) => incident.recordType === 'EMS Run' || incident.epcrStatus === 'Pending' || incident.epcrStatus === 'Failed'),
        dataQualityIssues: context.dataQualityIssues,
        duplicateCandidates: context.duplicateCandidates,
        notifications: context.notifications.filter((notification) => String(notification.notificationType).startsWith('incident.')),
        aiInsights: context.aiInsights.filter((insight) => String(insight.category).toLowerCase().includes('incident') || String(insight.title).toLowerCase().includes('incident')),
        readinessForecast: Math.max(65, Math.min(97, Math.round((summary.approved + summary.closed + summary.exported) / Math.max(summary.totalIncidents, 1) * 100))),
    };
}
exports.incidentService = {
    getIncidentCommandCenter,
    listIncidents,
    getIncidentDetail,
    createIncident,
    updateIncident,
    submitIncident,
    closeIncident,
};
exports.incidentWorkflowService = {
    createIncident,
    updateIncident,
    submitIncident,
    approveIncidentQa,
    returnIncidentQa,
    closeIncident,
};
exports.incidentQaService = {
    approveIncidentQa,
    returnIncidentQa,
    listIncidentDataQualityIssues,
};
exports.incidentTimelineService = {
    listIncidentTimeline,
    addIncidentTimelineEvent,
};
exports.incidentNarrativeService = {
    listIncidentNarratives,
    addIncidentNarrative,
};
exports.incidentAttachmentService = {
    listIncidentAttachments,
};
exports.nerisMappingService = {
    listNerisMappings,
    updateNerisMapping,
};
exports.nerisExportService = {
    getNerisExportPreview,
    exportIncidentToNeris,
};
exports.epcrLinkService = {
    listEpcrLinks,
    createEpcrLink,
};
exports.cadImportService = {
    listCadImportLogs,
};
exports.incidentDataQualityService = {
    listIncidentDataQualityIssues,
    scanIncidentDataQuality,
};
exports.incidentDuplicateDetectionService = {
    listIncidentDuplicateCandidates,
};
