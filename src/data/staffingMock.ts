// Deterministic operational staffing dataset.
//
// This module derives a coherent, command-ready staffing picture from the shared
// personnel / station / apparatus demo records so the Staffing module behaves like
// an operating system (roster, planner, forecaster, trades, overtime callback,
// KPIs / appraisals) rather than a static dashboard. Everything is computed the
// same way every render so the workflow is stable and demo-safe when the live API
// is unreachable.

import { demoApparatus, demoPersonnel, demoStations } from './platformMock';

type AnyRecord = Record<string, any>;

const PLATOONS = ['A', 'B', 'C'] as const;
export type PlatoonCode = (typeof PLATOONS)[number];

// Crew a frontline unit must staff to roll. Drives minimum-staffing math and the
// apparatus/station gap explanation.
const APPARATUS_CREW: Record<string, number> = {
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

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function isActive(person: AnyRecord) {
  return String(person.status ?? '').toLowerCase() === 'active';
}

function personLabel(person: AnyRecord) {
  return person.name ?? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() ?? 'Personnel';
}

function dayLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function shiftRotationForDay(offset: number): PlatoonCode {
  // Classic 48/96-style rotation approximated as a daily A/B/C cycle.
  return PLATOONS[((offset % 3) + 3) % 3];
}

// ---------------------------------------------------------------------------
// Core context (computed once per module load).
// ---------------------------------------------------------------------------

const personnelByStation = new Map<string, AnyRecord[]>();
for (const person of demoPersonnel) {
  if (!person.currentStationId) continue;
  const bucket = personnelByStation.get(person.currentStationId) ?? [];
  bucket.push(person);
  personnelByStation.set(person.currentStationId, bucket);
}

const apparatusByStation = new Map<string, AnyRecord[]>();
for (const unit of demoApparatus) {
  if (!unit.stationId) continue;
  const bucket = apparatusByStation.get(unit.stationId) ?? [];
  bucket.push(unit);
  apparatusByStation.set(unit.stationId, bucket);
}

function stationApparatus(stationId: string) {
  return apparatusByStation.get(stationId) ?? [];
}

// Deterministic frontline minimum staffing, derived from station number so it is
// IDENTICAL in the web demo seed and the backend seed (both number stations 1..N
// the same way). Returns the crew minimum plus the unit breakdown that sums to it
// — the "sum of frontline apparatus crews" rule, made seed-stable.
export function frontlineMinimum(station: AnyRecord): { min: number; units: Array<[string, number]> } {
  const n = Number(station.number) || 1;
  if (n % 4 === 0) return { min: 8, units: [['Engine', 4], ['Ladder Truck', 4]] };
  if (n % 2 === 0) return { min: 6, units: [['Engine', 4], ['Medic Unit', 2]] };
  return { min: 4, units: [['Engine', 4]] };
}

function stationMinimumStaffing(station: AnyRecord) {
  return frontlineMinimum(station).min;
}

function overtimeHoursFor(person: AnyRecord) {
  return Number(person.performanceSummary?.overtimeHours ?? 0);
}

export function stationCoverage(station: AnyRecord): AnyRecord {
  const roster = personnelByStation.get(station.id) ?? [];
  const minimumStaffing = stationMinimumStaffing(station);
  // The station's designed staffing gap (0/1/2) drives the open-seat picture so the
  // board reads operationally — most stations at minimum, a few short.
  const gap = Math.max(0, Number(station.staffingGap ?? 0));
  const onDuty = Math.max(0, minimumStaffing - gap);
  const target = minimumStaffing;
  const assigned = onDuty;
  const coverage = clamp(Math.round((onDuty / minimumStaffing) * 100));
  const openShifts = gap;
  const overtimeHours = Math.round(roster.reduce((sum, person) => sum + overtimeHoursFor(person), 0) * 10) / 10;
  const riskLevel = coverage >= 100 ? 'Ready' : coverage >= 80 ? 'Watch' : coverage >= 66 ? 'At Risk' : 'Critical';
  const frontline = stationApparatus(station.id)
    .filter((unit) => String(unit.status ?? '') !== 'Out of Service')
    .map((unit) => unit.unitNumber);
  const impactedApparatus = gap > 0 ? frontline.slice(0, Math.max(1, Math.ceil(gap / 2))) : [];
  return {
    station,
    minimumStaffing,
    targetStaffing: target,
    onDuty,
    assigned,
    gap,
    coverage,
    openShifts,
    overtimeHours,
    riskLevel,
    apparatusImpacted: impactedApparatus.length ? impactedApparatus.join(', ') : frontline.slice(0, 2).join(', ') || 'Station response units',
    apparatusGapExplanation: gap > 0
      ? `${impactedApparatus.join(', ') || 'A frontline unit'} cannot field a full crew — ${gap} seat${gap > 1 ? 's' : ''} below the ${minimumStaffing}-person minimum for ${station.name}.`
      : `${station.name} meets its ${minimumStaffing}-person minimum across ${frontline.length || 1} frontline unit${frontline.length === 1 ? '' : 's'}.`,
    minimumStaffingRule: `Minimum staffing for ${station.name} is ${minimumStaffing} (sum of frontline apparatus crews). Coverage under 90% opens a backfill review and command acknowledgement.`,
    recommendation: gap > 0
      ? `Backfill ${gap} seat${gap > 1 ? 's' : ''} at ${station.name} before overtime escalates or a unit goes out of service.`
      : `Hold current coverage at ${station.name} and monitor for leave or trade pressure.`,
  };
}

export function coverageBoard(): AnyRecord[] {
  return demoStations.map(stationCoverage).sort((a, b) => a.coverage - b.coverage);
}

// ---------------------------------------------------------------------------
// Backfill recommendation pool.
// ---------------------------------------------------------------------------

function backfillPool() {
  return demoPersonnel
    .filter((person) => isActive(person) && Number(person.readinessScore ?? 0) >= 78)
    .map((person) => ({
      person,
      readiness: Number(person.readinessScore ?? 0),
      overtime: overtimeHoursFor(person),
      rank: person.rank,
      stationId: person.currentStationId,
      platoon: person.platoon,
    }))
    .sort((a, b) => b.readiness - a.readiness || a.overtime - b.overtime);
}

export function recommendationRows(): AnyRecord[] {
  const pool = backfillPool();
  return coverageBoard()
    .filter((row) => row.coverage < 100 || row.openShifts > 0)
    .flatMap((row) => {
      const candidates = pool.filter((candidate) => candidate.stationId !== row.station.id).slice(0, 3);
      return candidates.map((candidate, index) => ({
        id: `staffing-recommendation-${row.station.id}-${candidate.person.id}`,
        station: row.station,
        personnel: candidate.person,
        suitabilityScore: clamp(Math.round(candidate.readiness * 0.6 + (20 - Math.min(20, candidate.overtime)) - index * 4)),
        reason: row.gap > 0
          ? `${row.station.name} is short ${row.gap}; ${personLabel(candidate.person)} (${candidate.rank}) is high-readiness, off-station, and under overtime caps.`
          : `Pre-stage ${personLabel(candidate.person)} as flex cover for ${row.station.name} to protect the minimum during leave or surge.`,
        coverageImpact: row.gap > 0 ? 'High' : 'Moderate',
        overtimeRisk: candidate.overtime > 12 ? 'Elevated' : 'Low',
        decisionState: 'Pending Approval',
      }));
    })
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

export function shiftFillRows(): AnyRecord[] {
  const recommendations = recommendationRows();
  return coverageBoard()
    .filter((row) => row.coverage < 100 || row.openShifts > 0 || row.gap > 0)
    .map((row) => {
      const suggested = recommendations.filter((item) => item.station.id === row.station.id).slice(0, 3);
      return {
        id: `shift-fill-${row.station.id}`,
        station: row.station,
        minimumStaffing: row.minimumStaffing,
        onDuty: row.onDuty,
        coverage: row.coverage,
        gap: row.gap,
        openShifts: Math.max(row.openShifts, row.gap),
        apparatusImpacted: row.apparatusImpacted,
        coverageImpact: row.coverageImpact,
        minimumStaffingRule: row.minimumStaffingRule,
        apparatusGapExplanation: row.apparatusGapExplanation,
        recommendation: row.recommendation,
        decisionState: row.gap > 0 ? 'Pending Approval' : 'Monitoring',
        suggestedPersonnel: suggested.map((item) => ({
          id: item.personnel.id,
          name: personLabel(item.personnel),
          rank: item.personnel.rank,
          suitabilityScore: item.suitabilityScore,
        })),
      };
    })
    .sort((a, b) => (b.gap - a.gap) || a.coverage - b.coverage);
}

// ---------------------------------------------------------------------------
// Roster & planner.
// ---------------------------------------------------------------------------

function seatPlanForStation(stationId: string) {
  // One seat per crew slot per frontline apparatus.
  const units = stationApparatus(stationId).filter((unit) => String(unit.status ?? '') !== 'Out of Service');
  const seats: Array<{ unit: string; apparatusType: string; role: string }> = [];
  for (const unit of units) {
    const crew = APPARATUS_CREW[unit.apparatusType] ?? 3;
    for (let i = 0; i < crew; i += 1) {
      seats.push({
        unit: unit.unitNumber,
        apparatusType: unit.apparatusType,
        role: i === 0 ? 'Company Officer' : i === 1 ? 'Driver / Engineer' : 'Firefighter',
      });
    }
  }
  if (!seats.length) {
    seats.push({ unit: 'Station', apparatusType: 'Engine', role: 'Company Officer' }, { unit: 'Station', apparatusType: 'Engine', role: 'Firefighter' });
  }
  return seats;
}

const activeRoster = demoPersonnel.filter(isActive);

export function rosterForDay(dayOffset = 0): AnyRecord {
  const platoon = shiftRotationForDay(dayOffset);
  let crewCursor = dayOffset * 7;
  const stations = demoStations.map((station) => {
    const seats = seatPlanForStation(station.id);
    // Open seats track the station's designed gap; the rest are filled from the
    // active roster so the on-duty roster reads as staffed with targeted holes.
    const openCount = Math.min(seats.length, Math.max(0, Number(station.staffingGap ?? 0)));
    const homeCrew = (personnelByStation.get(station.id) ?? []).filter(isActive);
    const filledSeats = seats.map((seat, index) => {
      if (index >= seats.length - openCount) {
        return { ...seat, personnelId: null, personnel: null, status: 'OPEN' };
      }
      const person = homeCrew[index] ?? activeRoster[crewCursor++ % activeRoster.length];
      return {
        ...seat,
        personnelId: person?.id ?? null,
        personnel: person ? personLabel(person) : null,
        status: 'Filled',
      };
    });
    return {
      station,
      seats: filledSeats,
      filled: filledSeats.length - openCount,
      total: filledSeats.length,
      open: openCount,
      coverage: clamp(Math.round(((filledSeats.length - openCount) / Math.max(1, filledSeats.length)) * 100)),
    };
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

export function shiftPlanner(days = 5): AnyRecord {
  const cycle = Array.from({ length: days }, (_, offset) => {
    const roster = rosterForDay(offset);
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
}

// ---------------------------------------------------------------------------
// Staff forecaster.
// ---------------------------------------------------------------------------

export function staffForecast(days = 7): AnyRecord {
  const board = coverageBoard();
  const baselineCoverage = Math.round(board.reduce((sum, row) => sum + row.coverage, 0) / Math.max(1, board.length));
  const leaveCount = demoPersonnel.filter((person) => String(person.status ?? '').toLowerCase() === 'leave').length;
  const trainingCount = demoPersonnel.filter((person) => String(person.status ?? '').toLowerCase() === 'training').length;

  const series = Array.from({ length: days }, (_, offset) => {
    // Predictable seasonality: midweek demand peak + weekend leave pressure.
    const platoon = shiftRotationForDay(offset);
    const weekday = (new Date().getDay() + offset) % 7;
    const weekendPressure = weekday === 0 || weekday === 6 ? 6 : 0;
    const midweekDemand = weekday === 2 || weekday === 3 ? 4 : 0;
    const projected = clamp(baselineCoverage - weekendPressure - midweekDemand + (offset % 2 === 0 ? 1 : -1));
    const projectedOpenSeats = Math.max(0, Math.round((100 - projected) / 10) + (weekendPressure ? 2 : 0));
    return {
      dayOffset: offset,
      label: dayLabel(offset),
      platoon,
      projectedCoverage: projected,
      projectedOpenSeats,
      riskLevel: projected >= 95 ? 'Ready' : projected >= 88 ? 'Watch' : projected >= 78 ? 'At Risk' : 'Critical',
      driver: weekendPressure ? 'Weekend leave + reduced relief pool' : midweekDemand ? 'Midweek call volume peak' : 'Baseline rotation',
    };
  });

  const worst = series.slice().sort((a, b) => a.projectedCoverage - b.projectedCoverage)[0];
  return {
    baselineCoverage,
    horizonDays: days,
    leaveCount,
    trainingCount,
    reliefPool: backfillPool().length,
    series,
    headline: worst
      ? `Coverage is projected to dip to ${worst.projectedCoverage}% on ${worst.label} (${worst.driver.toLowerCase()}); pre-stage ${worst.projectedOpenSeats} relief seat${worst.projectedOpenSeats === 1 ? '' : 's'}.`
      : 'Coverage is projected to hold above target across the forecast window.',
    recommendation: worst && worst.projectedCoverage < 90
      ? `Open relief sign-up for ${worst.label} now and hold ${Math.max(2, worst.projectedOpenSeats)} qualified members off overtime caps.`
      : 'Maintain current relief planning; no proactive callback required.',
  };
}

// ---------------------------------------------------------------------------
// Shift trade workflow.
// ---------------------------------------------------------------------------

const TRADE_STATES = ['Pending Review', 'Officer Approved', 'Counter-Offered', 'Denied'] as const;

export function tradeRows(): AnyRecord[] {
  const candidates = demoPersonnel.filter((person, index) => index % 6 === 0).slice(0, 14);
  return candidates.map((person, index) => {
    const station = demoStations.find((item) => item.id === person.currentStationId) ?? demoStations[0];
    const counterpart = demoPersonnel[(index * 7 + 3) % demoPersonnel.length];
    const state = TRADE_STATES[index % TRADE_STATES.length];
    const coverageSafe = counterpart && counterpart.platoon !== person.platoon;
    return {
      id: `shift-trade-${person.id}`,
      personnel: person,
      counterparty: counterpart,
      station,
      shiftLabel: `${PLATOONS[index % 3]}-platoon · ${dayLabel((index % 5) + 1)}`,
      reason: ['Family medical', 'Shift swap for training', 'Personal leave', 'Mutual aid coverage'][index % 4],
      coverageImpact: coverageSafe ? 'Coverage-neutral' : 'Reduces relief pool',
      coverageSafe,
      tradeState: state,
      requestedAt: dayLabel(-(index % 4) - 1),
      recommendedAction: coverageSafe
        ? `Approve — ${personLabel(counterpart)} backfills the same seat with equal qualification.`
        : `Hold — confirm a qualified relief before approving; trade would thin the on-call pool.`,
    };
  });
}

// ---------------------------------------------------------------------------
// Overtime + callback recommendation workflow.
// ---------------------------------------------------------------------------

export function overtimeRows(): AnyRecord[] {
  return demoPersonnel
    .map((person) => {
      const station = demoStations.find((item) => item.id === person.currentStationId) ?? null;
      const overtimeHours = overtimeHoursFor(person);
      const riskLevel = overtimeHours >= 16 ? 'Critical' : overtimeHours >= 10 ? 'Watch' : 'Healthy';
      return {
        id: `overtime-${person.id}`,
        personnel: person,
        station,
        overtimeHours,
        availabilityCount: Number(person.performanceSummary?.attendanceRate ?? 0) > 90 ? 2 : 1,
        riskLevel,
        recommendedAction: overtimeHours >= 12
          ? 'Rest required — hold off callback unless coverage is critical.'
          : 'Eligible for callback if a qualified gap opens.',
      };
    })
    .filter((row) => row.overtimeHours > 0)
    .sort((a, b) => b.overtimeHours - a.overtimeHours);
}

// Ranked callback queue for a specific open seat (agency-wide). The ranking
// favors rested, qualified, low-overtime, available members — the core of an
// overtime callback recommendation workflow.
export function callbackQueue(): AnyRecord[] {
  return backfillPool()
    .map((candidate, index) => {
      const overtime = candidate.overtime;
      const restedHours = clamp(48 - overtime, 0, 48);
      const score = clamp(Math.round(candidate.readiness * 0.5 + restedHours * 0.6 - overtime * 1.2 + (index < 5 ? 6 : 0)));
      const recommendation = overtime >= 14 ? 'Skip — overtime cap' : overtime < 11 && candidate.readiness >= 80 ? 'Recommended' : 'Hold';
      return {
        id: `callback-${candidate.person.id}`,
        personnel: candidate.person,
        rank: candidate.rank,
        station: demoStations.find((item) => item.id === candidate.stationId) ?? null,
        overtimeHours: overtime,
        restedHours,
        seniorityYears: 3 + (index % 18),
        availability: index % 4 === 0 ? 'On call' : 'Available',
        callbackScore: score,
        recommendation,
        callbackState: 'Not Contacted',
      };
    })
    .filter((row) => row.recommendation !== 'Skip — overtime cap' || row.overtimeHours >= 14)
    .sort((a, b) => {
      const order: Record<string, number> = { Recommended: 0, Hold: 1, 'Skip — overtime cap': 2 };
      return (order[a.recommendation] - order[b.recommendation]) || b.callbackScore - a.callbackScore;
    })
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Minimum staffing rules.
// ---------------------------------------------------------------------------

export function minimumStaffingRules(): AnyRecord[] {
  return demoStations.map((station) => {
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
}

// ---------------------------------------------------------------------------
// KPI management + appraisal mechanism.
// ---------------------------------------------------------------------------

export function staffingKpis(): AnyRecord {
  const board = coverageBoard();
  const coverage = Math.round(board.reduce((sum, row) => sum + row.coverage, 0) / Math.max(1, board.length));
  const compliant = board.filter((row) => row.gap === 0).length;
  const minCompliance = clamp(Math.round((compliant / Math.max(1, board.length)) * 100));
  const trades = tradeRows();
  const tradeApproval = clamp(Math.round((trades.filter((t) => t.tradeState === 'Officer Approved').length / Math.max(1, trades.length)) * 100));
  const overtime = overtimeRows();
  const overtimeHours = Math.round(overtime.reduce((sum, row) => sum + row.overtimeHours, 0));
  const avgOvertime = Math.round(overtimeHours / Math.max(1, overtime.length));
  const callback = callbackQueue();
  const callbackReady = callback.filter((c) => c.recommendation === 'Recommended').length;
  const shiftFills = shiftFillRows();
  const fillRate = clamp(Math.round((shiftFills.filter((f) => f.suggestedPersonnel.length > 0).length / Math.max(1, shiftFills.length)) * 100));

  const scorecards = [
    { id: 'kpi-coverage', label: 'Agency coverage', value: `${coverage}%`, target: '≥ 95%', status: coverage >= 95 ? 'On Track' : coverage >= 88 ? 'Watch' : 'Breached', trend: coverage >= 90 ? 'Improving' : 'Stable' },
    { id: 'kpi-minstaff', label: 'Minimum-staffing compliance', value: `${minCompliance}%`, target: '100%', status: minCompliance >= 95 ? 'On Track' : minCompliance >= 80 ? 'Watch' : 'Breached', trend: 'Stable' },
    { id: 'kpi-fill', label: 'Shift fill rate', value: `${fillRate}%`, target: '≥ 90%', status: fillRate >= 90 ? 'On Track' : fillRate >= 75 ? 'Watch' : 'Breached', trend: 'Improving' },
    { id: 'kpi-ot', label: 'Avg overtime / member', value: `${avgOvertime} hrs`, target: '≤ 12 hrs', status: avgOvertime <= 12 ? 'On Track' : avgOvertime <= 16 ? 'Watch' : 'Breached', trend: avgOvertime > 14 ? 'Stable' : 'Improving' },
    { id: 'kpi-trade', label: 'Trade approval rate', value: `${tradeApproval}%`, target: '≥ 70%', status: tradeApproval >= 70 ? 'On Track' : 'Watch', trend: 'Stable' },
    { id: 'kpi-callback', label: 'Callback-ready relief pool', value: `${callbackReady}`, target: '≥ 8', status: callbackReady >= 8 ? 'On Track' : callbackReady >= 4 ? 'Watch' : 'Breached', trend: 'Improving' },
  ];

  return { coverage, minCompliance, fillRate, overtimeHours, tradeApproval, callbackReady, scorecards };
}

// Officer / company appraisal records tied to staffing KPIs.
export function appraisalRows(): AnyRecord[] {
  const officers = demoPersonnel.filter((person) => ['Captain', 'Lieutenant', 'Battalion Chief'].includes(String(person.rank))).slice(0, 12);
  return officers.map((person, index) => {
    const station = demoStations.find((item) => item.id === person.currentStationId) ?? demoStations[0];
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
}

// ---------------------------------------------------------------------------
// Command center summary (demo fallback).
// ---------------------------------------------------------------------------

export function commandCenterSummary(): AnyRecord {
  const board = coverageBoard();
  const gaps = board.filter((row) => row.gap > 0 || row.coverage < 90 || row.openShifts > 0);
  const recommendations = recommendationRows();
  const coverage = Math.round(board.reduce((sum, row) => sum + row.coverage, 0) / Math.max(1, board.length));
  const overtime = overtimeRows();
  return {
    summary: {
      totalStations: board.length,
      staffedStations: board.filter((row) => row.coverage >= 90).length,
      coverage,
      openShifts: board.reduce((sum, row) => sum + row.openShifts, 0),
      gaps: gaps.length,
      overtimeRisk: clamp(Math.round(overtime.reduce((sum, row) => sum + Math.min(25, row.overtimeHours * 1.4), 0) / Math.max(1, overtime.length))),
      unavailableCount: demoPersonnel.filter((person) => String(person.status ?? '').toLowerCase() !== 'active').length,
      recommendationCount: recommendations.length,
      callbackReady: callbackQueue().filter((c) => c.recommendation === 'Recommended').length,
      minStaffingCompliance: clamp(Math.round((board.filter((row) => row.gap === 0).length / Math.max(1, board.length)) * 100)),
      aiInsights: 4,
    },
    topRiskStations: board.slice(0, 5),
    board,
    gaps: gaps.slice(0, 10),
    recommendations: recommendations.slice(0, 15),
  };
}
