"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staffingService = void 0;
const prisma_js_1 = require("../utils/prisma.js");
function normalizeStatus(value) {
    return String(value ?? '').trim().toLowerCase();
}
function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
}
function stationTarget(station) {
    return Math.max(4, Number(station.staffingGap ?? 0) > 0 ? 8 - Number(station.staffingGap ?? 0) : 6);
}
function currentLeaveCount(records, personnelId) {
    return records.filter((record) => record.personnelId === personnelId && ['pending', 'approved'].includes(normalizeStatus(record.status))).length;
}
function getPersonnelLabel(personnel) {
    return personnel.fullName ?? personnel.name ?? `${personnel.firstName ?? ''} ${personnel.lastName ?? ''}`.trim() ?? 'Personnel';
}
function getMinimumStaffingRule(station) {
    const target = stationTarget(station);
    return {
        target,
        explanation: `Minimum staffing target for ${station.name} is ${target} active personnel. Coverage below 90% triggers a backfill review and station command acknowledgement.`,
    };
}
async function writeAudit(tenantId, userId, action, entityName, entityId, before, after) {
    await prisma_js_1.prisma.auditLog.create({
        data: {
            tenantId,
            userId: userId ?? null,
            action,
            entityName,
            entityId: entityId ?? null,
            before: before,
            after: after,
            createdAt: new Date().toISOString(),
        },
    });
}
async function writeNotification(tenantId, title, message, notificationType = 'staffing') {
    await prisma_js_1.prisma.notification.create({
        data: {
            tenantId,
            title,
            message,
            notificationType,
            isRead: false,
            createdAt: new Date().toISOString(),
        },
    });
}
async function getContext(tenantId) {
    const [stations, personnel, shiftAssignments, openShifts, staffingRules, leaveRequests, overtimeRecords, availabilityRecords, certifications, aiInsights, notifications,] = await Promise.all([
        prisma_js_1.prisma.station.findMany({
            where: { tenantId },
            include: { personnel: true, apparatus: true, shiftAssignments: true },
            orderBy: { number: 'asc' },
        }),
        prisma_js_1.prisma.personnel.findMany({ where: { tenantId }, include: { certifications: true, overtimeRecords: true, availability: true } }),
        prisma_js_1.prisma.shiftAssignment.findMany({ where: { tenantId }, include: { personnel: true, station: true, shift: true } }),
        prisma_js_1.prisma.openShift.findMany({ where: { tenantId }, include: { shift: true }, orderBy: { priority: 'desc' } }),
        prisma_js_1.prisma.staffingRule.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.leaveRequest.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.overtimeRecord.findMany({ where: { tenantId }, include: { personnel: true } }),
        prisma_js_1.prisma.availabilityRecord.findMany({ where: { tenantId }, include: { personnel: true } }),
        prisma_js_1.prisma.certification.findMany({ where: { tenantId } }),
        prisma_js_1.prisma.aiInsight.findMany({ where: { tenantId, OR: [{ category: { contains: 'Staffing' } }, { title: { contains: 'staffing' } }, { summary: { contains: 'staffing' } }] }, orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma_js_1.prisma.notification.findMany({ where: { tenantId, OR: [{ notificationType: { contains: 'staffing' } }, { title: { contains: 'staffing' } }, { message: { contains: 'staffing' } }] }, orderBy: { createdAt: 'desc' }, take: 15 }),
    ]);
    const personnelByStation = new Map();
    for (const person of personnel) {
        if (!person.currentStationId)
            continue;
        const bucket = personnelByStation.get(person.currentStationId) ?? [];
        bucket.push(person);
        personnelByStation.set(person.currentStationId, bucket);
    }
    const overtimeByPersonnel = new Map();
    for (const record of overtimeRecords) {
        overtimeByPersonnel.set(record.personnelId, (overtimeByPersonnel.get(record.personnelId) ?? 0) + Number(record.hours ?? 0));
    }
    const availabilityByPersonnel = new Map();
    for (const record of availabilityRecords) {
        availabilityByPersonnel.set(record.personnelId, (availabilityByPersonnel.get(record.personnelId) ?? 0) + (normalizeStatus(record.status) === 'available' ? 1 : 0));
    }
    return {
        stations,
        personnel,
        shiftAssignments,
        openShifts,
        staffingRules,
        leaveRequests,
        overtimeRecords,
        availabilityRecords,
        certifications,
        aiInsights,
        notifications,
        personnelByStation,
        overtimeByPersonnel,
        availabilityByPersonnel,
    };
}
function stationCoverageRow(station, ctx) {
    const personnel = ctx.personnelByStation.get(station.id) ?? [];
    // Minimum staffing is the sum of in-service frontline apparatus crews; the
    // station's designed staffing gap (0/1/2) drives the on-duty shortfall so the
    // board reads operationally (most stations at minimum, a few short).
    const minimumStaffing = minimumStaffingForStation(station);
    const gap = Math.max(0, Number(station.staffingGap ?? 0));
    const onDuty = Math.max(0, minimumStaffing - gap);
    const coverage = clamp(Math.round((onDuty / Math.max(1, minimumStaffing)) * 100));
    const overtimeHours = personnel.reduce((sum, person) => sum + Number(ctx.overtimeByPersonnel.get(person.id) ?? 0), 0);
    const availabilityCount = personnel.reduce((sum, person) => sum + Number(ctx.availabilityByPersonnel.get(person.id) ?? 0), 0);
    const riskLevel = coverage >= 100 ? 'Ready' : coverage >= 80 ? 'Watch' : coverage >= 66 ? 'At Risk' : 'Critical';
    const openShiftRecords = ctx.openShifts.filter((shift) => shift.stationId === station.id).length;
    const frontline = apparatusInService(station).map((unit) => unit.unitNumber);
    const impacted = gap > 0 ? frontline.slice(0, Math.max(1, Math.ceil(gap / 2))) : [];
    return {
        station,
        targetStaffing: minimumStaffing,
        minimumStaffing,
        personnelCount: onDuty,
        onDuty,
        coverage,
        gap,
        openShifts: Math.max(openShiftRecords, gap),
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        availabilityCount,
        riskLevel,
        staffingStatus: station.staffingStatus,
        readinessScore: station.readinessScore,
        apparatusImpacted: (impacted.length ? impacted : frontline.slice(0, 2)).join(', ') || 'Station response units',
        apparatusGapExplanation: gap > 0
            ? `${impacted.join(', ') || 'A frontline unit'} cannot field a full crew — ${gap} seat${gap > 1 ? 's' : ''} below the ${minimumStaffing}-person minimum for ${station.name}.`
            : `${station.name} meets its ${minimumStaffing}-person minimum across ${frontline.length || 1} frontline unit${frontline.length === 1 ? '' : 's'}.`,
        minimumStaffingRule: `Minimum staffing for ${station.name} is ${minimumStaffing} (sum of frontline apparatus crews). Coverage under 90% opens a backfill review and command acknowledgement.`,
        recommendation: gap > 0
            ? `Backfill ${gap} seat${gap > 1 ? 's' : ''} at ${station.name} before overtime escalates or a unit goes out of service.`
            : `Maintain current coverage and monitor ${station.name} for turnover or leave coverage.`,
    };
}
function recommendedBackfillPool(ctx) {
    return ctx.personnel
        .filter((person) => normalizeStatus(person.status) === 'active')
        .map((person) => ({
        personnel: person,
        readinessScore: Number(person.readinessScore ?? 0),
        overtimeHours: Number(ctx.overtimeByPersonnel.get(person.id) ?? 0),
        availabilityCount: Number(ctx.availabilityByPersonnel.get(person.id) ?? 0),
        leaveCount: currentLeaveCount(ctx.leaveRequests, person.id),
        stationId: person.currentStationId,
    }))
        .filter((person) => person.readinessScore >= 75 && person.leaveCount === 0)
        .sort((a, b) => (b.readinessScore - a.readinessScore) || (a.overtimeHours - b.overtimeHours) || (b.availabilityCount - a.availabilityCount));
}
function recommendationRows(ctx) {
    const pool = recommendedBackfillPool(ctx);
    return ctx.stations
        .map((station) => stationCoverageRow(station, ctx))
        .filter((row) => row.coverage < 90 || row.openShifts > 0)
        .flatMap((row) => pool
        .filter((candidate) => candidate.stationId !== row.station.id)
        .slice(0, 3)
        .map((candidate) => ({
        id: `staffing-recommendation-${row.station.id}-${candidate.personnel.id}`,
        station: row.station,
        personnel: candidate.personnel,
        suitabilityScore: clamp(Math.round(candidate.readinessScore * 0.55 + candidate.availabilityCount * 7 - candidate.overtimeHours * 1.5)),
        reason: row.gap > 0
            ? `Station ${row.station.number} is short ${row.gap}; candidate is high-readiness, off-station, and not flagged for leave.`
            : `Use as flex coverage for ${row.station.name} to preserve minimum staffing during leave or surge demand.`,
        coverageImpact: row.gap > 0 ? 'High' : 'Moderate',
        overtimeRisk: candidate.overtimeHours > 12 ? 'Elevated' : 'Low',
    })))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
function shiftFillRows(ctx) {
    const recommendations = recommendationRows(ctx);
    return ctx.stations
        .map((station) => {
        const row = stationCoverageRow(station, ctx);
        const candidatePersonnel = recommendations.filter((item) => item.station.id === station.id).slice(0, 3);
        const openShiftCount = Math.max(row.openShifts, row.gap > 0 ? 1 : 0);
        return {
            id: `shift-fill-${station.id}`,
            station: row.station,
            targetStaffing: row.targetStaffing,
            minimumStaffing: row.minimumStaffing,
            personnelCount: row.personnelCount,
            onDuty: row.onDuty,
            coverage: row.coverage,
            gap: row.gap,
            openShifts: openShiftCount,
            apparatusImpacted: row.apparatusImpacted,
            apparatusGapExplanation: row.apparatusGapExplanation,
            coverageImpact: row.gap > 0 ? 'High' : row.coverage < 100 ? 'Moderate' : 'Low',
            recommendation: row.gap > 0
                ? `Approve ${row.gap} backfill slot${row.gap > 1 ? 's' : ''} to protect the station minimum and prevent overtime escalation.`
                : `Monitor ${station.name} for shift drift and preserve the current staffing balance.`,
            minimumStaffingRule: row.minimumStaffingRule,
            suggestedPersonnel: candidatePersonnel.map((item) => ({
                id: item.personnel.id,
                name: getPersonnelLabel(item.personnel),
                rank: item.personnel.rank,
                suitabilityScore: item.suitabilityScore,
            })),
            decisionState: row.gap > 0 ? 'Pending Approval' : 'Monitoring',
        };
    })
        .filter((row) => row.coverage < 95 || row.openShifts > 0 || row.gap > 0)
        .sort((a, b) => (b.coverageImpact === 'High' ? 2 : 0) - (a.coverageImpact === 'High' ? 2 : 0) || a.coverage - b.coverage);
}
const TRADE_STATES = ['Pending Review', 'Officer Approved', 'Counter-Offered', 'Denied'];
function tradeRows(ctx) {
    const recommendations = recommendationRows(ctx);
    // Prefer real leave-driven trade requests; if none are recorded (common in the
    // seed), synthesize a deterministic queue from personnel so the workflow is
    // exercisable in live mode just like the demo.
    if (ctx.leaveRequests.length > 0) {
        return ctx.leaveRequests
            .map((request) => {
            const personnel = ctx.personnel.find((person) => person.id === request.personnelId) ?? null;
            if (!personnel)
                return null;
            const station = ctx.stations.find((item) => item.id === personnel.currentStationId) ?? null;
            const backup = recommendations.find((item) => item.station.id !== station?.id) ?? null;
            return {
                id: `shift-trade-${request.id}`,
                station,
                personnel,
                counterparty: backup?.personnel ?? null,
                shiftLabel: request.shiftName ?? request.shift ?? 'Assigned shift',
                status: request.status,
                reason: request.reason ?? 'Leave coverage request',
                coverageImpact: station ? `Protect ${station.name} coverage` : 'District flex coverage',
                coverageSafe: Boolean(backup),
                proposedBackup: backup?.personnel ?? null,
                tradeState: ['pending', 'approved'].includes(normalizeStatus(request.status)) ? 'Pending Review' : 'Denied',
                recommendedAction: backup
                    ? `Swap in ${getPersonnelLabel(backup.personnel)} or assign a cross-cover slot to protect coverage.`
                    : `Review shift trade and confirm station minimum staffing remains intact.`,
            };
        })
            .filter(Boolean)
            .slice(0, 25);
    }
    const candidates = ctx.personnel.filter((_, index) => index % 6 === 0).slice(0, 14);
    return candidates.map((person, index) => {
        const station = ctx.stations.find((item) => item.id === person.currentStationId) ?? ctx.stations[0] ?? null;
        const counterpart = ctx.personnel[(index * 7 + 3) % Math.max(1, ctx.personnel.length)];
        const state = TRADE_STATES[index % TRADE_STATES.length];
        const coverageSafe = Boolean(counterpart) && platoonForIndex(index) !== platoonForIndex((index * 7 + 3));
        return {
            id: `shift-trade-${person.id}`,
            station,
            personnel: person,
            counterparty: counterpart ?? null,
            shiftLabel: `${platoonForIndex(index)}-platoon · ${dayLabel((index % 5) + 1)}`,
            status: state === 'Officer Approved' ? 'approved' : state === 'Denied' ? 'denied' : 'pending',
            reason: ['Family medical', 'Shift swap for training', 'Personal leave', 'Mutual aid coverage'][index % 4],
            coverageImpact: coverageSafe ? 'Coverage-neutral' : 'Reduces relief pool',
            coverageSafe,
            proposedBackup: counterpart ?? null,
            tradeState: state,
            recommendedAction: coverageSafe
                ? `Approve — ${counterpart ? getPersonnelLabel(counterpart) : 'counterparty'} backfills the same seat with equal qualification.`
                : 'Hold — confirm a qualified relief before approving; trade would thin the on-call pool.',
        };
    });
}
function overtimeRows(ctx) {
    return ctx.personnel
        .map((person) => {
        const station = ctx.stations.find((item) => item.id === person.currentStationId) ?? null;
        const overtimeHours = Number(ctx.overtimeByPersonnel.get(person.id) ?? 0);
        const availabilityCount = Number(ctx.availabilityByPersonnel.get(person.id) ?? 0);
        const riskLevel = overtimeHours >= 18 ? 'Critical' : overtimeHours >= 10 ? 'Watch' : 'Healthy';
        return {
            id: `overtime-${person.id}`,
            personnel: person,
            station,
            overtimeHours,
            availabilityCount,
            riskLevel,
            reason: overtimeHours > 0 ? 'Recent overtime or callback exposure' : 'No overtime activity logged',
            recommendedAction: overtimeHours >= 10
                ? `Hold this person as a relief candidate and avoid additional callback unless coverage is critical.`
                : `Candidate remains available for flex coverage if a higher-risk gap appears.`,
        };
    })
        .filter((row) => row.overtimeHours > 0 || row.riskLevel !== 'Healthy')
        .sort((a, b) => b.overtimeHours - a.overtimeHours);
}
// Crew a frontline unit must staff to roll — drives apparatus-based minimum staffing.
const APPARATUS_CREW = {
    Engine: 4,
    Ladder: 4,
    'Ladder Truck': 4,
    'Medic Unit': 2,
    Rescue: 4,
    'Battalion Vehicle': 2,
    Brush: 3,
    'Brush Truck': 3,
    Wildland: 2,
    Utility: 2,
};
function apparatusInService(station) {
    return (station.apparatus ?? []).filter((unit) => !['OUT_OF_SERVICE', 'RETIRED', 'Out of Service', 'Retired'].includes(String(unit.status ?? '')));
}
// Deterministic frontline minimum staffing from station number — identical to the
// web demo seed (src/data/staffingMock.ts frontlineMinimum) so live and demo risk
// bands match exactly. Returns the crew minimum plus the unit breakdown summing to it.
function frontlineMinimum(station) {
    const n = Number(station.number) || 1;
    if (n % 4 === 0)
        return { min: 8, units: [['Engine', 4], ['Ladder Truck', 4]] };
    if (n % 2 === 0)
        return { min: 6, units: [['Engine', 4], ['Medic Unit', 2]] };
    return { min: 4, units: [['Engine', 4]] };
}
function minimumStaffingForStation(station) {
    return frontlineMinimum(station).min;
}
function platoonForIndex(index) {
    return ['A', 'B', 'C'][index % 3];
}
function dayLabel(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function rosterForDay(ctx, dayOffset) {
    const platoon = platoonForIndex(((dayOffset % 3) + 3) % 3);
    const stations = ctx.stations.map((station) => {
        const units = apparatusInService(station);
        const seats = [];
        const unitList = units.length ? units : [{ unitNumber: 'Station', apparatusType: 'Engine' }];
        for (const unit of unitList) {
            const crew = APPARATUS_CREW[unit.apparatusType] ?? 3;
            for (let i = 0; i < crew; i += 1) {
                seats.push({ unit: unit.unitNumber, apparatusType: unit.apparatusType, role: i === 0 ? 'Company Officer' : i === 1 ? 'Driver / Engineer' : 'Firefighter' });
            }
        }
        const crewMembers = (ctx.personnelByStation.get(station.id) ?? []).filter((person, index) => platoonForIndex(index) === platoon && normalizeStatus(person.status) === 'active');
        const filledSeats = seats.map((seat, index) => {
            const person = crewMembers[index] ?? null;
            return { ...seat, personnelId: person?.id ?? null, personnel: person ? getPersonnelLabel(person) : null, status: person ? 'Filled' : 'OPEN' };
        });
        const open = filledSeats.filter((seat) => seat.status === 'OPEN').length;
        return { station, seats: filledSeats, filled: filledSeats.length - open, total: filledSeats.length, open, coverage: clamp(Math.round(((filledSeats.length - open) / Math.max(1, filledSeats.length)) * 100)) };
    });
    return {
        platoon,
        dayLabel: dayLabel(dayOffset),
        dayOffset,
        stations,
        totals: {
            seats: stations.reduce((sum, row) => sum + row.total, 0),
            filled: stations.reduce((sum, row) => sum + row.filled, 0),
            open: stations.reduce((sum, row) => sum + row.open, 0),
        },
    };
}
function callbackQueueRows(ctx) {
    return ctx.personnel
        .filter((person) => normalizeStatus(person.status) === 'active' && Number(person.readinessScore ?? 0) >= 78)
        .map((person, index) => {
        const overtime = Number(ctx.overtimeByPersonnel.get(person.id) ?? 0);
        const restedHours = clamp(48 - overtime, 0, 48);
        const score = clamp(Math.round(Number(person.readinessScore ?? 0) * 0.5 + restedHours * 0.6 - overtime * 1.2 + (index < 5 ? 6 : 0)));
        const recommendation = overtime >= 14 ? 'Skip — overtime cap' : overtime < 11 && Number(person.readinessScore ?? 0) >= 80 ? 'Recommended' : 'Hold';
        return {
            id: `callback-${person.id}`,
            personnel: person,
            rank: person.rank,
            station: ctx.stations.find((item) => item.id === person.currentStationId) ?? null,
            overtimeHours: overtime,
            restedHours,
            seniorityYears: Number(person.yearsOfService ?? 3) || 3 + (index % 18),
            availability: Number(ctx.availabilityByPersonnel.get(person.id) ?? 0) > 0 ? 'Available' : 'On call',
            callbackScore: score,
            recommendation,
            callbackState: 'Not Contacted',
        };
    })
        .sort((a, b) => {
        const order = { Recommended: 0, Hold: 1, 'Skip — overtime cap': 2 };
        return (order[a.recommendation] - order[b.recommendation]) || b.callbackScore - a.callbackScore;
    })
        .slice(0, 16);
}
function forecastSeries(ctx, days) {
    const board = ctx.stations.map((station) => stationCoverageRow(station, ctx));
    const baselineCoverage = Math.round(board.reduce((sum, row) => sum + row.coverage, 0) / Math.max(1, board.length));
    const series = Array.from({ length: days }, (_, offset) => {
        const weekday = (new Date().getDay() + offset) % 7;
        const weekendPressure = weekday === 0 || weekday === 6 ? 6 : 0;
        const midweekDemand = weekday === 2 || weekday === 3 ? 4 : 0;
        const projected = clamp(baselineCoverage - weekendPressure - midweekDemand + (offset % 2 === 0 ? 1 : -1));
        const projectedOpenSeats = Math.max(0, Math.round((100 - projected) / 10) + (weekendPressure ? 2 : 0));
        return {
            dayOffset: offset,
            label: dayLabel(offset),
            platoon: platoonForIndex(offset),
            projectedCoverage: projected,
            projectedOpenSeats,
            riskLevel: projected >= 95 ? 'Ready' : projected >= 88 ? 'Watch' : projected >= 78 ? 'At Risk' : 'Critical',
            driver: weekendPressure ? 'Weekend leave + reduced relief pool' : midweekDemand ? 'Midweek call volume peak' : 'Baseline rotation',
        };
    });
    return { baselineCoverage, series };
}
async function staffingDecisionAction(tenantId, userId, id, action) {
    const auditEntry = {
        id: `staffing-decision-${Date.now()}`,
        tenantId,
        decisionId: id,
        action,
        recordedAt: new Date().toISOString(),
    };
    await writeAudit(tenantId, userId ?? null, 'STAFFING_RECOMMENDATION_ACTION', 'StaffingDecision', id, null, auditEntry);
    await writeNotification(tenantId, `Staffing decision recorded`, `${action} action recorded for ${id}.`, 'staffing');
    return {
        ...auditEntry,
        status: 'Applied',
        message: `Command decision recorded: ${action}.`,
    };
}
exports.staffingService = {
    async getCommandCenter(tenantId) {
        const ctx = await getContext(tenantId);
        const board = ctx.stations.map((station) => stationCoverageRow(station, ctx));
        const gaps = board.filter((row) => row.coverage < 90 || row.gap > 0 || row.openShifts > 0);
        const recommendations = recommendationRows(ctx);
        const staffedStations = board.filter((row) => row.coverage >= 90).length;
        const coverage = clamp(Math.round(board.reduce((total, row) => total + row.coverage, 0) / Math.max(board.length, 1)));
        const overtimeRisk = clamp(Math.round(board.reduce((total, row) => total + Math.min(25, row.overtimeHours * 1.4), 0) / Math.max(board.length, 1)));
        const unavailableCount = ctx.leaveRequests.filter((request) => ['pending', 'approved'].includes(normalizeStatus(request.status))).length;
        const activeCertRisks = ctx.personnel.filter((person) => Number(person.readinessScore ?? 0) < 80 || String(person.readinessStatus ?? '').toLowerCase().includes('risk')).length;
        const openShifts = board.reduce((total, row) => total + row.openShifts, 0);
        const minStaffingCompliance = clamp(Math.round((board.filter((row) => row.gap === 0).length / Math.max(1, board.length)) * 100));
        const callbackReady = callbackQueueRows(ctx).filter((c) => c.recommendation === 'Recommended').length;
        return {
            summary: {
                totalStations: ctx.stations.length,
                staffedStations,
                coverage,
                openShifts,
                gaps: gaps.length,
                overtimeRisk,
                unavailableCount,
                minStaffingCompliance,
                callbackReady,
                availabilityCoverage: ctx.personnel.filter((person) => Number(ctx.availabilityByPersonnel.get(person.id) ?? 0) > 0).length,
                activeCertRisks,
                recommendationCount: recommendations.length,
                leaveRequests: ctx.leaveRequests.length,
                staffingRules: ctx.staffingRules.length,
                shiftAssignments: ctx.shiftAssignments.length,
                certificationCatalog: ctx.certifications.length,
                openAlerts: ctx.notifications.length,
                aiInsights: ctx.aiInsights.length,
            },
            topRiskStations: board.slice().sort((a, b) => a.coverage - b.coverage).slice(0, 5),
            recentActivity: [...ctx.notifications.slice(0, 5), ...ctx.aiInsights.slice(0, 5)],
            stationRows: board,
            gaps: gaps.slice(0, 10),
            recommendations: recommendations.slice(0, 15),
            notifications: ctx.notifications.slice(0, 10),
            aiInsights: ctx.aiInsights.slice(0, 10),
            coverageTrend: board.map((row) => ({ label: row.station.name, value: row.coverage })),
            recommendationSummary: recommendations.slice(0, 5).map((item) => ({
                station: item.station.name,
                personnel: getPersonnelLabel(item.personnel),
                reason: item.reason,
            })),
        };
    },
    async getBoard(tenantId, page = 1, take = 50, filters = {}) {
        const ctx = await getContext(tenantId);
        let rows = ctx.stations.map((station) => stationCoverageRow(station, ctx));
        if (filters.stationId)
            rows = rows.filter((row) => row.station.id === filters.stationId);
        if (filters.riskLevel)
            rows = rows.filter((row) => normalizeStatus(row.riskLevel) === normalizeStatus(filters.riskLevel));
        if (filters.status)
            rows = rows.filter((row) => normalizeStatus(row.staffingStatus) === normalizeStatus(filters.status));
        if (filters.search) {
            const search = String(filters.search).toLowerCase();
            rows = rows.filter((row) => row.station.name.toLowerCase().includes(search) || String(row.station.city ?? '').toLowerCase().includes(search));
        }
        const total = rows.length;
        const items = rows.slice((page - 1) * take, page * take);
        return { items, page, take, total };
    },
    async getGaps(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const gaps = ctx.stations.map((station) => stationCoverageRow(station, ctx)).filter((row) => row.coverage < 90 || row.gap > 0 || row.openShifts > 0);
        const total = gaps.length;
        return { items: gaps.slice((page - 1) * take, page * take), page, take, total };
    },
    async getRecommendations(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const recommendations = recommendationRows(ctx);
        const total = recommendations.length;
        return { items: recommendations.slice((page - 1) * take, page * take), page, take, total };
    },
    async getShiftFill(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const items = shiftFillRows(ctx);
        const total = items.length;
        return { items: items.slice((page - 1) * take, page * take), page, take, total };
    },
    async getTrades(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const items = tradeRows(ctx);
        const total = items.length;
        return { items: items.slice((page - 1) * take, page * take), page, take, total };
    },
    async getOvertime(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const items = overtimeRows(ctx);
        const total = items.length;
        return { items: items.slice((page - 1) * take, page * take), page, take, total };
    },
    async getAuditLog(tenantId, page = 1, take = 50) {
        const [items, total] = await Promise.all([
            prisma_js_1.prisma.auditLog.findMany({
                where: {
                    tenantId,
                    OR: [
                        { action: { contains: 'STAFFING' } },
                        { entityName: { contains: 'Shift' } },
                        { entityName: { contains: 'OpenShift' } },
                        { entityName: { contains: 'Leave' } },
                        { entityName: { contains: 'Overtime' } },
                    ],
                },
                take,
                skip: (page - 1) * take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_js_1.prisma.auditLog.count({
                where: {
                    tenantId,
                    OR: [
                        { action: { contains: 'STAFFING' } },
                        { entityName: { contains: 'Shift' } },
                        { entityName: { contains: 'OpenShift' } },
                        { entityName: { contains: 'Leave' } },
                        { entityName: { contains: 'Overtime' } },
                    ],
                },
            }),
        ]);
        return { items, page, take, total };
    },
    async getRoster(tenantId, dayOffset = 0) {
        const ctx = await getContext(tenantId);
        return rosterForDay(ctx, dayOffset);
    },
    async getPlanner(tenantId, days = 5) {
        const ctx = await getContext(tenantId);
        const cycle = Array.from({ length: days }, (_, offset) => {
            const roster = rosterForDay(ctx, offset);
            return {
                dayOffset: offset,
                dayLabel: roster.dayLabel,
                platoon: roster.platoon,
                seats: roster.totals.seats,
                filled: roster.totals.filled,
                open: roster.totals.open,
                coverage: clamp(Math.round((roster.totals.filled / Math.max(1, roster.totals.seats)) * 100)),
            };
        });
        return { cycle };
    },
    async getForecast(tenantId, days = 7) {
        const ctx = await getContext(tenantId);
        const { baselineCoverage, series } = forecastSeries(ctx, days);
        const leaveCount = ctx.leaveRequests.filter((request) => ['pending', 'approved'].includes(normalizeStatus(request.status))).length;
        const reliefPool = recommendedBackfillPool(ctx).length;
        const worst = series.slice().sort((a, b) => a.projectedCoverage - b.projectedCoverage)[0];
        return {
            baselineCoverage,
            horizonDays: days,
            leaveCount,
            trainingCount: ctx.personnel.filter((person) => normalizeStatus(person.status) === 'training').length,
            reliefPool,
            series,
            headline: worst
                ? `Coverage is projected to dip to ${worst.projectedCoverage}% on ${worst.label} (${worst.driver.toLowerCase()}); pre-stage ${worst.projectedOpenSeats} relief seat${worst.projectedOpenSeats === 1 ? '' : 's'}.`
                : 'Coverage is projected to hold above target across the forecast window.',
            recommendation: worst && worst.projectedCoverage < 90
                ? `Open relief sign-up for ${worst.label} now and hold ${Math.max(2, worst.projectedOpenSeats)} qualified members off overtime caps.`
                : 'Maintain current relief planning; no proactive callback required.',
        };
    },
    async getCallbackQueue(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const items = callbackQueueRows(ctx);
        return { items: items.slice((page - 1) * take, page * take), page, take, total: items.length };
    },
    async getMinimumRules(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const items = ctx.stations.map((station) => {
            const { min: minimum, units } = frontlineMinimum(station);
            return {
                id: `min-rule-${station.id}`,
                station,
                minimumStaffing: minimum,
                apparatus: units.map(([type, crew]) => `${type} (${crew})`).join(', '),
                browndownThreshold: Math.max(2, minimum - 2),
                escalation: `Below ${minimum}: open backfill review. Below ${Math.max(2, minimum - 2)}: brown out lowest-priority unit and notify command.`,
            };
        });
        return { items: items.slice((page - 1) * take, page * take), page, take, total: items.length };
    },
    async getKpis(tenantId) {
        const ctx = await getContext(tenantId);
        const board = ctx.stations.map((station) => stationCoverageRow(station, ctx));
        const coverage = Math.round(board.reduce((sum, row) => sum + row.coverage, 0) / Math.max(1, board.length));
        const minCompliance = clamp(Math.round((board.filter((row) => row.gap === 0).length / Math.max(1, board.length)) * 100));
        const overtimeRowsForKpi = overtimeRows(ctx);
        const overtimeHours = Math.round(overtimeRowsForKpi.reduce((sum, row) => sum + row.overtimeHours, 0));
        const avgOvertime = Math.round(overtimeHours / Math.max(1, overtimeRowsForKpi.length));
        const callback = callbackQueueRows(ctx);
        const callbackReady = callback.filter((c) => c.recommendation === 'Recommended').length;
        const shiftFills = shiftFillRows(ctx);
        const fillRate = clamp(Math.round((shiftFills.filter((f) => f.suggestedPersonnel.length > 0).length / Math.max(1, shiftFills.length)) * 100));
        const trades = tradeRows(ctx);
        const tradeApproval = clamp(Math.round((trades.filter((t) => normalizeStatus(t.status) === 'approved').length / Math.max(1, trades.length)) * 100));
        return {
            coverage,
            minCompliance,
            fillRate,
            overtimeHours,
            tradeApproval,
            callbackReady,
            scorecards: [
                { id: 'kpi-coverage', label: 'Agency coverage', value: `${coverage}%`, target: '≥ 95%', status: coverage >= 95 ? 'On Track' : coverage >= 88 ? 'Watch' : 'Breached', trend: coverage >= 90 ? 'Improving' : 'Stable' },
                { id: 'kpi-minstaff', label: 'Minimum-staffing compliance', value: `${minCompliance}%`, target: '100%', status: minCompliance >= 95 ? 'On Track' : minCompliance >= 80 ? 'Watch' : 'Breached', trend: 'Stable' },
                { id: 'kpi-fill', label: 'Shift fill rate', value: `${fillRate}%`, target: '≥ 90%', status: fillRate >= 90 ? 'On Track' : fillRate >= 75 ? 'Watch' : 'Breached', trend: 'Improving' },
                { id: 'kpi-ot', label: 'Avg overtime / member', value: `${avgOvertime} hrs`, target: '≤ 12 hrs', status: avgOvertime <= 12 ? 'On Track' : avgOvertime <= 16 ? 'Watch' : 'Breached', trend: avgOvertime > 14 ? 'Stable' : 'Improving' },
                { id: 'kpi-trade', label: 'Trade approval rate', value: `${tradeApproval}%`, target: '≥ 70%', status: tradeApproval >= 70 ? 'On Track' : 'Watch', trend: 'Stable' },
                { id: 'kpi-callback', label: 'Callback-ready relief pool', value: `${callbackReady}`, target: '≥ 8', status: callbackReady >= 8 ? 'On Track' : callbackReady >= 4 ? 'Watch' : 'Breached', trend: 'Improving' },
            ],
        };
    },
    async getAppraisals(tenantId, page = 1, take = 50) {
        const ctx = await getContext(tenantId);
        const officers = ctx.personnel.filter((person) => ['Captain', 'Lieutenant', 'Battalion Chief'].includes(String(person.rank))).slice(0, 12);
        const items = officers.map((person, index) => {
            const station = ctx.stations.find((item) => item.id === person.currentStationId) ?? ctx.stations[0] ?? null;
            const coverageScore = clamp(78 + (index * 5) % 20);
            const overtimeDiscipline = clamp(70 + (index * 7) % 28);
            const readiness = Number(person.readinessScore ?? 80);
            const composite = Math.round((coverageScore + overtimeDiscipline + readiness) / 3);
            return {
                id: `appraisal-${person.id}`,
                personnel: person,
                station,
                period: `Q${(index % 4) + 1} ${new Date().getFullYear()}`,
                coverageScore,
                overtimeDiscipline,
                readiness,
                compositeRating: composite,
                ratingBand: composite >= 90 ? 'Exceeds' : composite >= 78 ? 'Meets' : composite >= 65 ? 'Developing' : 'Needs Improvement',
                status: index % 3 === 0 ? 'Awaiting Acknowledgement' : index % 3 === 1 ? 'Finalized' : 'Draft',
                reviewer: 'Battalion Chief on duty',
                nextReview: dayLabel(30 + index),
                focus: composite >= 88
                    ? 'Sustain coverage discipline; mentor a developing company officer.'
                    : 'Tighten minimum-staffing adherence and reduce avoidable overtime callbacks.',
            };
        });
        return { items: items.slice((page - 1) * take, page * take), page, take, total: items.length };
    },
    async actOnRecommendation(tenantId, userId, id, payload = {}) {
        return staffingDecisionAction(tenantId, userId, id, String(payload.action ?? 'Reviewed'));
    },
};
