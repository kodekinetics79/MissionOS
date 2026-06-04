// Workforce Performance & Planning — deterministic operational dataset.
//
// Derives a coherent KPI / scorecard / appraisal / forecasting / requisition
// picture from the shared personnel and station demo records, reusing the
// staffing forecast so the new module stays consistent with Staffing & the rest
// of the platform. Demo-safe: identical output every render when the live API is
// unreachable.

import { demoPersonnel, demoStations } from './platformMock';
import { staffForecast, coverageBoard, callbackQueue } from './staffingMock';

type AnyRecord = Record<string, any>;

export const KPI_CATEGORIES = ['Operations', 'Training', 'EMS', 'Prevention', 'Staffing', 'Assets', 'Personnel', 'Leadership'] as const;
export type KpiCategory = (typeof KPI_CATEGORIES)[number];

const ASSIGNMENT_LEVELS = ['Department', 'Station', 'Shift/Platoon', 'Unit', 'Personnel', 'Role'] as const;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

// Map a value + thresholds to a Green/Yellow/Red/Critical band.
export function scoreBand(value: number, t: { green: number; yellow: number; red: number }) {
  if (value >= t.green) return 'Green';
  if (value >= t.yellow) return 'Yellow';
  if (value >= t.red) return 'Red';
  return 'Critical';
}

const bandStatus: Record<string, string> = { Green: 'Healthy', Yellow: 'Warning', Red: 'At Risk', Critical: 'Critical' };
export function bandToStatus(band: string) {
  return bandStatus[band] ?? 'Watch';
}

// ---------------------------------------------------------------------------
// 1. KPI library + builder metadata.
// ---------------------------------------------------------------------------

interface KpiSeed {
  name: string;
  category: KpiCategory;
  formula: string;
  source: string;
  unit: string;
  weighting: number;
  assignment: (typeof ASSIGNMENT_LEVELS)[number];
  thresholds: { green: number; yellow: number; red: number };
  value: number;
}

const KPI_SEED: KpiSeed[] = [
  { name: 'Turnout Time Compliance', category: 'Operations', formula: '% incidents with turnout ≤ 90s', source: 'RMS / CAD', unit: '%', weighting: 5, assignment: 'Station', thresholds: { green: 90, yellow: 80, red: 70 }, value: 86 },
  { name: 'Response Time 90th Percentile', category: 'Operations', formula: 'P90 dispatch→arrival (min)', source: 'RMS / CAD', unit: 'pts', weighting: 5, assignment: 'Department', thresholds: { green: 88, yellow: 78, red: 68 }, value: 82 },
  { name: 'Training Hour Compliance', category: 'Training', formula: 'completed ÷ required training hrs', source: 'LMS', unit: '%', weighting: 4, assignment: 'Personnel', thresholds: { green: 95, yellow: 85, red: 75 }, value: 88 },
  { name: 'Drill Participation', category: 'Training', formula: '% required drills attended', source: 'LMS', unit: '%', weighting: 3, assignment: 'Shift/Platoon', thresholds: { green: 92, yellow: 82, red: 72 }, value: 79 },
  { name: 'ePCR Documentation Accuracy', category: 'EMS', formula: '% ePCR complete & QA-passed', source: 'ePCR / RMS', unit: '%', weighting: 5, assignment: 'Personnel', thresholds: { green: 94, yellow: 86, red: 78 }, value: 84 },
  { name: 'Protocol Adherence', category: 'EMS', formula: '% patient contacts within protocol', source: 'ePCR QA', unit: '%', weighting: 4, assignment: 'Personnel', thresholds: { green: 95, yellow: 88, red: 80 }, value: 91 },
  { name: 'Inspection Completion Rate', category: 'Prevention', formula: 'completed ÷ scheduled inspections', source: 'Prevention', unit: '%', weighting: 3, assignment: 'Unit', thresholds: { green: 90, yellow: 80, red: 70 }, value: 76 },
  { name: 'Minimum Staffing Compliance', category: 'Staffing', formula: 'shifts at/above station minimum', source: 'Staffing', unit: '%', weighting: 5, assignment: 'Station', thresholds: { green: 95, yellow: 85, red: 70 }, value: 71 },
  { name: 'Overtime Burn Discipline', category: 'Staffing', formula: 'inverse of avg OT / member', source: 'Staffing', unit: 'pts', weighting: 4, assignment: 'Shift/Platoon', thresholds: { green: 88, yellow: 78, red: 66 }, value: 74 },
  { name: 'Apparatus Readiness', category: 'Assets', formula: 'avg apparatus readiness score', source: 'Assets', unit: '%', weighting: 4, assignment: 'Unit', thresholds: { green: 92, yellow: 84, red: 74 }, value: 89 },
  { name: 'Certification Currency', category: 'Personnel', formula: '% certs valid (not expiring ≤30d)', source: 'Certifications', unit: '%', weighting: 4, assignment: 'Personnel', thresholds: { green: 95, yellow: 88, red: 80 }, value: 87 },
  { name: 'Attendance Reliability', category: 'Personnel', formula: '% scheduled shifts worked', source: 'Staffing', unit: '%', weighting: 3, assignment: 'Personnel', thresholds: { green: 96, yellow: 90, red: 84 }, value: 93 },
  { name: 'Company Officer Coverage Discipline', category: 'Leadership', formula: 'station coverage held by officer', source: 'Staffing', unit: 'pts', weighting: 4, assignment: 'Role', thresholds: { green: 90, yellow: 80, red: 70 }, value: 83 },
  { name: 'Crew Readiness Index', category: 'Leadership', formula: 'avg crew readiness under officer', source: 'Readiness', unit: 'pts', weighting: 4, assignment: 'Role', thresholds: { green: 90, yellow: 82, red: 72 }, value: 85 },
];

export function kpiLibrary(): AnyRecord[] {
  return KPI_SEED.map((seed, index) => {
    const band = scoreBand(seed.value, seed.thresholds);
    const previous = clamp(seed.value + ((index % 3) - 1) * 4 - 2);
    return {
      id: `kpi-${index + 1}`,
      ...seed,
      band,
      status: bandToStatus(band),
      previousValue: previous,
      improvement: Math.round((seed.value - previous) * 10) / 10,
      thresholdLabel: `≥${seed.thresholds.green} green · ≥${seed.thresholds.yellow} yellow · ≥${seed.thresholds.red} red`,
    };
  });
}

export function kpiCategorySummary(): AnyRecord[] {
  const lib = kpiLibrary();
  return KPI_CATEGORIES.map((category) => {
    const items = lib.filter((kpi) => kpi.category === category);
    const avg = Math.round(items.reduce((sum, kpi) => sum + kpi.value, 0) / Math.max(1, items.length));
    return {
      category,
      kpiCount: items.length,
      averageScore: avg,
      band: scoreBand(avg, { green: 90, yellow: 80, red: 70 }),
    };
  });
}

// ---------------------------------------------------------------------------
// 2. Scorecards (department / station / platoon / personnel + trend).
// ---------------------------------------------------------------------------

function weightedComposite(values: Array<AnyRecord>) {
  const totalWeight = values.reduce((sum, v) => sum + v.weighting, 0) || 1;
  return Math.round(values.reduce((sum, v) => sum + v.value * v.weighting, 0) / totalWeight);
}

export function departmentScorecard(): AnyRecord {
  const lib = kpiLibrary();
  const current = weightedComposite(lib);
  const previous = weightedComposite(lib.map((k) => ({ value: k.previousValue, weighting: k.weighting })));
  return {
    scope: 'MissionOS — Agency Scorecard',
    currentScore: current,
    previousScore: previous,
    improvement: Math.round((current - previous) * 10) / 10,
    band: scoreBand(current, { green: 90, yellow: 80, red: 70 }),
    period: 'Current quarter',
    comparisonPeriod: 'Prior quarter',
    kpis: lib,
    supervisorNotes: 'Agency holding above target on EMS protocol and attendance; minimum-staffing compliance and overtime discipline remain the priority improvement areas.',
  };
}

export function stationScorecards(): AnyRecord[] {
  const board = coverageBoard();
  return demoStations.map((station, index) => {
    const cov = board.find((row: any) => row.station.id === station.id);
    const base = clamp(Math.round((cov?.coverage ?? 80) * 0.6 + Number(station.readinessScore ?? 80) * 0.4));
    const previous = clamp(base + ((index % 3) - 1) * 3 - 1);
    return {
      id: `scorecard-station-${station.id}`,
      station,
      currentScore: base,
      previousScore: previous,
      improvement: Math.round((base - previous) * 10) / 10,
      band: scoreBand(base, { green: 90, yellow: 80, red: 70 }),
      drivers: `Coverage ${cov?.coverage ?? '—'}% · readiness ${station.readinessScore}`,
      supervisorNotes: base < 80 ? `${station.name} needs a coverage + training recovery plan this period.` : `${station.name} trending stable; sustain current discipline.`,
    };
  }).sort((a, b) => a.currentScore - b.currentScore);
}

export function platoonScorecards(): AnyRecord[] {
  return ['A', 'B', 'C'].map((platoon, index) => {
    const members = demoPersonnel.filter((p) => p.platoon === platoon);
    const avg = Math.round(members.reduce((sum, p) => sum + Number(p.readinessScore ?? 80), 0) / Math.max(1, members.length));
    const previous = clamp(avg + ((index % 2) ? -2 : 2));
    return {
      id: `scorecard-platoon-${platoon}`,
      platoon: `${platoon} Platoon`,
      members: members.length,
      currentScore: avg,
      previousScore: previous,
      improvement: Math.round((avg - previous) * 10) / 10,
      band: scoreBand(avg, { green: 90, yellow: 82, red: 72 }),
      supervisorNotes: `${platoon} platoon readiness driven by ${members.length} members; watch drill participation and overtime balance.`,
    };
  });
}

export function personnelScorecards(): AnyRecord[] {
  return demoPersonnel.slice(0, 40).map((person, index) => {
    const current = Number(person.readinessScore ?? 80);
    const previous = clamp(current + (((index * 5) % 11) - 5));
    const band = scoreBand(current, { green: 90, yellow: 80, red: 70 });
    return {
      id: `scorecard-person-${person.id}`,
      personnel: person,
      station: demoStations.find((s) => s.id === person.currentStationId) ?? null,
      currentScore: current,
      previousScore: previous,
      improvement: Math.round((current - previous) * 10) / 10,
      band,
      status: bandToStatus(band),
      trend: current >= previous ? 'Improving' : 'Declining',
      supervisorNotes: current < 80 ? 'Targeted training plan opened; monitor next period.' : 'Meets expectations; on track for development goals.',
    };
  }).sort((a, b) => a.currentScore - b.currentScore);
}

// ---------------------------------------------------------------------------
// 3. Training Need Assessment (KPI below threshold → linked action).
// ---------------------------------------------------------------------------

const LINK_TARGETS = [
  { type: 'LMS Course', label: 'EMS Documentation Accuracy Refresher' },
  { type: 'Drill', label: 'Company Evolution Drill' },
  { type: 'Skill Evaluation', label: 'Driver/Operator Skills Check' },
  { type: 'Certification', label: 'EMT Recertification' },
  { type: 'Supervisor Coaching', label: '1:1 Coaching Session' },
];
const NEED_STATUS = ['Assigned', 'Completed', 'Overdue', 'Assigned', 'Completed'];

export function trainingNeeds(): AnyRecord[] {
  const personnel = personnelScorecards().filter((row) => row.currentScore < 86);
  return personnel.slice(0, 18).map((row, index) => {
    const link = LINK_TARGETS[index % LINK_TARGETS.length];
    const status = NEED_STATUS[index % NEED_STATUS.length];
    const triggerKpi = KPI_SEED[(index * 3) % KPI_SEED.length];
    return {
      id: `need-${row.personnel.id}`,
      personnel: row.personnel,
      station: row.station,
      triggerKpi: triggerKpi.name,
      kpiValue: row.currentScore,
      threshold: triggerKpi.thresholds.yellow,
      gap: triggerKpi.thresholds.green - row.currentScore,
      linkType: link.type,
      linkedAction: link.label,
      recommendedAction: `${link.type}: ${link.label} to recover ${triggerKpi.name}.`,
      status,
      dueDate: status === 'Overdue' ? '5 days ago' : `in ${7 + (index % 14)} days`,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Improvement tracking.
// ---------------------------------------------------------------------------

const OUTCOMES = ['Improved', 'Partially Improved', 'No Improvement', 'Escalated'];

export function improvementTracking(): AnyRecord[] {
  return personnelScorecards().slice(0, 16).map((row, index) => {
    const baseline = clamp(row.currentScore - 8 - (index % 6));
    const trainingCompleted = index % 4 !== 3;
    const post = trainingCompleted ? clamp(baseline + 6 + (index % 8)) : baseline + (index % 3 === 0 ? 1 : 0);
    const improvement = Math.round(((post - baseline) / Math.max(1, baseline)) * 100);
    const outcome = !trainingCompleted ? 'No Improvement' : improvement >= 12 ? 'Improved' : improvement >= 4 ? 'Partially Improved' : 'Escalated';
    return {
      id: `improvement-${row.personnel.id}`,
      personnel: row.personnel,
      station: row.station,
      baselineScore: baseline,
      trainingAssigned: LINK_TARGETS[index % LINK_TARGETS.length].label,
      trainingCompleted,
      postScore: post,
      improvementPercent: improvement,
      outcome: OUTCOMES.includes(outcome) ? outcome : 'Partially Improved',
      supervisorNotes: outcome === 'Improved' ? 'Goal met; close out and document.' : outcome === 'Escalated' ? 'No measurable gain — route to performance review.' : 'Continue plan; re-measure next cycle.',
    };
  });
}

// ---------------------------------------------------------------------------
// 5. Appraisal management.
// ---------------------------------------------------------------------------

const CYCLES = ['Annual', 'Semiannual', 'Probationary'];
const APPRAISAL_STATUS = ['Self-Assessment', 'Supervisor Review', 'Pending Signature', 'HR Approval', 'Finalized'];

function appraisalTemplate(role: string) {
  if (['Captain', 'Lieutenant', 'Battalion Chief'].includes(role)) return 'Company Officer Template';
  if (role.includes('Officer') || role.includes('Chief')) return 'Staff Officer Template';
  return 'Firefighter / EMS Template';
}

const PEER_COMMENTS = [
  'Reliable on the fireground; communicates clearly under load.',
  'Strong mentor to newer crew; consistent documentation.',
  'Dependable shift partner; could delegate more during complex calls.',
  'Excellent patient rapport; keep building command presence.',
];

// 360 / peer feedback — deterministic peer ratings + comments per appraisal.
function peerFeedbackFor(index: number): AnyRecord {
  const peers = [demoPersonnel[(index * 5 + 2) % demoPersonnel.length], demoPersonnel[(index * 9 + 4) % demoPersonnel.length], demoPersonnel[(index * 13 + 7) % demoPersonnel.length]];
  const entries = peers.map((peer, i) => ({
    reviewer: peer.name,
    relationship: i === 0 ? 'Same crew' : i === 1 ? 'Cross-shift' : 'Officer',
    rating: 3 + ((index + i) % 3),
    comment: PEER_COMMENTS[(index + i) % PEER_COMMENTS.length],
  }));
  const avg = Math.round((entries.reduce((sum, e) => sum + e.rating, 0) / Math.max(1, entries.length)) * 10) / 10;
  return { requested: true, responses: entries.length, averageRating: avg, scale: '1–5', entries };
}

export function appraisals(): AnyRecord[] {
  return demoPersonnel.slice(0, 24).map((person, index) => {
    const cycle = person.employmentStatus === 'Probationary' ? 'Probationary' : CYCLES[index % 2];
    const status = APPRAISAL_STATUS[index % APPRAISAL_STATUS.length];
    const readiness = Number(person.readinessScore ?? 80);
    const composite = clamp(Math.round(readiness * 0.6 + Number(person.performanceSummary?.attendanceRate ?? 90) * 0.4));
    return {
      id: `appraisal-${person.id}`,
      personnel: person,
      station: demoStations.find((s) => s.id === person.currentStationId) ?? null,
      cycle,
      template: appraisalTemplate(String(person.role ?? person.rank)),
      selfAssessment: index % 3 === 0 ? 'Submitted' : 'Pending',
      supervisorAssessment: ['Supervisor Review', 'Pending Signature', 'HR Approval', 'Finalized'].includes(status) ? 'Complete' : 'In Progress',
      peerFeedback: peerFeedbackFor(index),
      compositeRating: composite,
      ratingBand: composite >= 90 ? 'Exceeds' : composite >= 78 ? 'Meets' : composite >= 65 ? 'Developing' : 'Needs Improvement',
      autoPopulated: {
        kpiScore: composite,
        trainingHours: 24 + (index % 30),
        certifications: `${3 + (index % 4)} valid`,
        attendanceRate: Number(person.performanceSummary?.attendanceRate ?? 90),
        complianceFlags: index % 5 === 0 ? 1 : 0,
      },
      goals: index % 2 === 0 ? 'Lead a company evolution drill; complete officer development track.' : 'Improve ePCR accuracy; mentor a probationary firefighter.',
      developmentPlan: 'Quarterly check-ins with battalion chief; targeted LMS assignments tied to KPI gaps.',
      signature: status === 'Finalized' ? 'Signed' : status === 'Pending Signature' ? 'Awaiting employee signature' : 'Not signed',
      status,
      hrStatus: status === 'Finalized' ? 'Approved' : status === 'HR Approval' ? 'In HR Review' : 'Not Submitted',
    };
  });
}

export function appraisalCycleSummary(): AnyRecord {
  const all = appraisals();
  const finalized = all.filter((a) => a.status === 'Finalized').length;
  return {
    total: all.length,
    finalized,
    inProgress: all.length - finalized,
    completionRate: clamp(Math.round((finalized / Math.max(1, all.length)) * 100)),
    byCycle: CYCLES.map((cycle) => ({ cycle, count: all.filter((a) => a.cycle === cycle).length })),
  };
}

// ---------------------------------------------------------------------------
// 6. Performance Improvement / Escalation (recommend + route only).
// ---------------------------------------------------------------------------

const ESCALATION_LEVELS = ['Coaching Note', 'Development Plan', 'Performance Improvement Plan', 'Warning Recommendation'];

export function escalations(): AnyRecord[] {
  const candidates = improvementTracking().filter((row) => row.outcome === 'Escalated' || row.outcome === 'No Improvement' || row.improvementPercent < 4);
  return candidates.slice(0, 12).map((row, index) => {
    const level = ESCALATION_LEVELS[Math.min(ESCALATION_LEVELS.length - 1, index % ESCALATION_LEVELS.length)];
    return {
      id: `escalation-${row.personnel.id}`,
      personnel: row.personnel,
      station: row.station,
      recommendedLevel: level,
      reason: `${row.outcome} after assigned training (${row.improvementPercent}% change from baseline ${row.baselineScore}).`,
      coachingNote: 'Documented coaching conversation focused on documentation accuracy and shift reliability.',
      developmentPlan: 'Structured 30/60/90 plan with measurable KPI recovery targets.',
      pipRecommended: level === 'Performance Improvement Plan' || level === 'Warning Recommendation',
      warningRecommended: level === 'Warning Recommendation',
      hrReviewRequired: level !== 'Coaching Note',
      decisionState: 'Pending Command Review',
      disclaimer: 'Recommendation only — no disciplinary action is issued automatically; routed for command and HR approval.',
    };
  });
}

// ---------------------------------------------------------------------------
// 7. Workforce forecasting enhancement.
// ---------------------------------------------------------------------------

export function workforceForecast(days = 7): AnyRecord {
  const staffing = staffForecast(days);
  const board = coverageBoard();
  const leaveCount = demoPersonnel.filter((p) => String(p.status ?? '').toLowerCase() === 'leave').length;
  const expiringCerts = demoPersonnel.filter((p) => Number(p.expiringCerts ?? 0) > 0).length;
  const retirementEligible = demoPersonnel.filter((_, i) => i % 14 === 0).length;
  const avgOt = Math.round(demoPersonnel.reduce((sum, p) => sum + Number(p.performanceSummary?.overtimeHours ?? 0), 0) / Math.max(1, demoPersonnel.length));
  const minStaffingGaps = board.filter((row: any) => row.gap > 0).reduce((sum: number, row: any) => sum + row.gap, 0);

  const dimensions = [
    { id: 'fc-incident', label: 'Incident volume forecast', value: `${1180 + days * 14} calls / 30d`, trend: 'Up 6%', risk: 'Watch', detail: 'Seasonal EMS uptick; midweek peaks drive turnout demand.' },
    { id: 'fc-workload', label: 'Station workload forecast', value: `${board.filter((r: any) => r.coverage < 90).length} stations over target load`, trend: 'Stable', risk: 'Watch', detail: 'Busiest stations align with lowest coverage — compounding risk.' },
    { id: 'fc-leave', label: 'Leave / vacation impact', value: `${leaveCount} on leave`, trend: 'Up', risk: leaveCount > 4 ? 'At Risk' : 'Watch', detail: 'Weekend leave pressure reduces the relief pool.' },
    { id: 'fc-cert', label: 'Certification expiration impact', value: `${expiringCerts} expiring ≤30d`, trend: 'Up', risk: expiringCerts > 8 ? 'At Risk' : 'Watch', detail: 'Expiring EMT/medic certs threaten medic-unit staffing.' },
    { id: 'fc-retire', label: 'Retirement eligibility impact', value: `${retirementEligible} eligible`, trend: 'Stable', risk: 'Watch', detail: 'Officer-level retirements would thin company-officer coverage.' },
    { id: 'fc-ot', label: 'Overtime burn forecast', value: `${avgOt} avg hrs / member`, trend: avgOt > 12 ? 'Up' : 'Stable', risk: avgOt > 14 ? 'At Risk' : 'Watch', detail: 'Sustained backfill is pushing overtime toward policy caps.' },
    { id: 'fc-gap', label: 'Minimum staffing gap forecast', value: `${minStaffingGaps} open seats`, trend: 'Stable', risk: minStaffingGaps > 8 ? 'At Risk' : 'Watch', detail: 'Projected open seats across the forecast window.' },
    { id: 'fc-apparatus', label: 'Apparatus coverage impact', value: `${board.filter((r: any) => r.gap > 0).length} units at risk`, trend: 'Watch', risk: 'Watch', detail: 'Gaps map to specific frontline units that cannot field a full crew.' },
    { id: 'fc-budget', label: 'Budget impact', value: `$${(minStaffingGaps * 7400 + avgOt * 1850).toLocaleString()} projected`, trend: 'Up', risk: 'At Risk', detail: 'Backfill overtime + relief cost if gaps are not requisitioned.' },
  ];

  return {
    ...staffing,
    dimensions,
    headline: staffing.headline,
    summary: {
      leaveCount,
      expiringCerts,
      retirementEligible,
      avgOt,
      minStaffingGaps,
      reliefPool: callbackQueue().filter((c: any) => c.recommendation === 'Recommended').length,
    },
  };
}

// ---------------------------------------------------------------------------
// 8. Staff requisition management.
// ---------------------------------------------------------------------------

export const REQUISITION_STATES = ['Draft', 'Submitted', 'Command Review', 'Finance Review', 'HR Review', 'Approved', 'In Recruitment', 'Filled', 'Closed'] as const;

export function requisitions(): AnyRecord[] {
  const gaps = coverageBoard().filter((row: any) => row.gap > 0);
  return gaps.slice(0, 10).map((row: any, index: number) => {
    const state = REQUISITION_STATES[index % REQUISITION_STATES.length];
    const urgency = row.coverage < 70 ? 'Critical' : row.coverage < 85 ? 'High' : 'Normal';
    return {
      id: `req-${row.station.id}`,
      station: row.station,
      positionType: index % 3 === 0 ? 'Firefighter/Paramedic' : index % 3 === 1 ? 'Firefighter/EMT' : 'Driver/Engineer',
      unit: row.apparatusImpacted,
      reason: `Forecasted minimum-staffing gap of ${row.gap} seat${row.gap > 1 ? 's' : ''} at ${row.station.name}.`,
      requiredCertifications: index % 2 === 0 ? ['EMT', 'Firefighter II', 'HazMat Ops'] : ['Paramedic', 'Firefighter II', 'EVOC'],
      budgetImpact: `$${(row.gap * 86000).toLocaleString()} annualized`,
      urgency,
      status: state,
      linkedForecast: 'Minimum staffing gap forecast',
      linkedGap: `${row.station.name} · gap ${row.gap}`,
      submittedBy: 'Battalion Chief (on duty)',
      approvalTrail: REQUISITION_STATES.slice(0, (index % REQUISITION_STATES.length) + 1).map((s) => ({ stage: s, at: `day ${REQUISITION_STATES.indexOf(s)}` })),
    };
  });
}

// ---------------------------------------------------------------------------
// 9. Reporting.
// ---------------------------------------------------------------------------

export function workforceReports(): AnyRecord {
  const dept = departmentScorecard();
  const needs = trainingNeeds();
  const improvements = improvementTracking();
  const apps = appraisalCycleSummary();
  const reqs = requisitions();
  return {
    reports: [
      {
        id: 'report-kpi', name: 'KPI Dashboard Report', category: 'KPI', exportReady: true,
        summary: `Agency composite ${dept.currentScore} (${dept.band}); ${kpiLibrary().filter((k) => k.band === 'Red' || k.band === 'Critical').length} KPIs below target.`,
        metrics: kpiCategorySummary(),
      },
      {
        id: 'report-appraisal', name: 'Appraisal Completion Report', category: 'Appraisal', exportReady: true,
        summary: `${apps.completionRate}% appraisals finalized (${apps.finalized}/${apps.total}).`,
        metrics: apps.byCycle,
      },
      {
        id: 'report-needs', name: 'Training Needs Report', category: 'Training', exportReady: true,
        summary: `${needs.length} active training needs; ${needs.filter((n) => n.status === 'Overdue').length} overdue.`,
        metrics: [{ label: 'Assigned', value: needs.filter((n) => n.status === 'Assigned').length }, { label: 'Completed', value: needs.filter((n) => n.status === 'Completed').length }, { label: 'Overdue', value: needs.filter((n) => n.status === 'Overdue').length }],
      },
      {
        id: 'report-improvement', name: 'Improvement Tracking Report', category: 'Improvement', exportReady: true,
        summary: `${improvements.filter((i) => i.outcome === 'Improved').length} improved, ${improvements.filter((i) => i.outcome === 'Escalated').length} escalated.`,
        metrics: OUTCOMES.map((outcome) => ({ label: outcome, value: improvements.filter((i) => i.outcome === outcome).length })),
      },
      {
        id: 'report-requisition', name: 'Requisition Forecast Report', category: 'Requisition', exportReady: true,
        summary: `${reqs.length} requisitions tied to forecasted gaps; ${reqs.filter((r) => r.urgency === 'Critical').length} critical.`,
        metrics: REQUISITION_STATES.map((state) => ({ label: state, value: reqs.filter((r) => r.status === state).length })).filter((m) => m.value > 0),
      },
    ],
  };
}

export function workforceOverview(): AnyRecord {
  const dept = departmentScorecard();
  const needs = trainingNeeds();
  const apps = appraisalCycleSummary();
  const reqs = requisitions();
  return {
    summary: {
      compositeScore: dept.currentScore,
      compositeBand: dept.band,
      improvement: dept.improvement,
      kpisBelowTarget: kpiLibrary().filter((k) => k.band === 'Red' || k.band === 'Critical').length,
      openTrainingNeeds: needs.length,
      overdueNeeds: needs.filter((n) => n.status === 'Overdue').length,
      appraisalCompletion: apps.completionRate,
      openRequisitions: reqs.filter((r) => !['Filled', 'Closed'].includes(r.status)).length,
      escalations: escalations().length,
    },
  };
}
