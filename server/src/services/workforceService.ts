import { prisma } from '../utils/prisma.js';
import { staffingService } from './staffingService.js';

type AnyRecord = Record<string, any>;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

const KPI_CATEGORIES = ['Operations', 'Training', 'EMS', 'Prevention', 'Staffing', 'Assets', 'Personnel', 'Leadership'];

function scoreBand(value: number, t: { green: number; yellow: number; red: number }) {
  if (value >= t.green) return 'Green';
  if (value >= t.yellow) return 'Yellow';
  if (value >= t.red) return 'Red';
  return 'Critical';
}
const bandStatus: Record<string, string> = { Green: 'Healthy', Yellow: 'Warning', Red: 'At Risk', Critical: 'Critical' };

const KPI_SEED = [
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

function kpiLibrary() {
  return KPI_SEED.map((seed, index) => {
    const band = scoreBand(seed.value, seed.thresholds);
    const previous = clamp(seed.value + ((index % 3) - 1) * 4 - 2);
    return { id: `kpi-${index + 1}`, ...seed, band, status: bandStatus[band], previousValue: previous, improvement: Math.round((seed.value - previous) * 10) / 10, thresholdLabel: `≥${seed.thresholds.green} green · ≥${seed.thresholds.yellow} yellow · ≥${seed.thresholds.red} red` };
  });
}

function kpiCategorySummary() {
  const lib = kpiLibrary();
  return KPI_CATEGORIES.map((category) => {
    const items = lib.filter((kpi) => kpi.category === category);
    const avg = Math.round(items.reduce((sum, kpi) => sum + kpi.value, 0) / Math.max(1, items.length));
    return { category, kpiCount: items.length, averageScore: avg, band: scoreBand(avg, { green: 90, yellow: 80, red: 70 }) };
  });
}

function weightedComposite(values: AnyRecord[]) {
  const totalWeight = values.reduce((sum, v) => sum + v.weighting, 0) || 1;
  return Math.round(values.reduce((sum, v) => sum + v.value * v.weighting, 0) / totalWeight);
}

async function getContext(tenantId: string) {
  const [personnel, stations] = await Promise.all([
    prisma.personnel.findMany({ where: { tenantId } }),
    prisma.station.findMany({ where: { tenantId }, include: { apparatus: true }, orderBy: { number: 'asc' } }),
  ]);
  return { personnel, stations };
}

function departmentScorecard() {
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

async function stationScorecards(tenantId: string) {
  const ctx = await getContext(tenantId);
  const board = (await staffingService.getBoard(tenantId, 1, 100)).items as AnyRecord[];
  return ctx.stations.map((station: AnyRecord, index: number) => {
    const cov = board.find((row) => row.station.id === station.id);
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

async function platoonScorecards(tenantId: string) {
  const ctx = await getContext(tenantId);
  return ['A', 'B', 'C'].map((platoon, index) => {
    const members = ctx.personnel.filter((_, i) => ['A', 'B', 'C'][i % 3] === platoon);
    const avg = Math.round(members.reduce((sum, p) => sum + Number(p.readinessScore ?? 80), 0) / Math.max(1, members.length));
    const previous = clamp(avg + ((index % 2) ? -2 : 2));
    return { id: `scorecard-platoon-${platoon}`, platoon: `${platoon} Platoon`, members: members.length, currentScore: avg, previousScore: previous, improvement: Math.round((avg - previous) * 10) / 10, band: scoreBand(avg, { green: 90, yellow: 82, red: 72 }), supervisorNotes: `${platoon} platoon readiness driven by ${members.length} members; watch drill participation and overtime balance.` };
  });
}

async function personnelScorecards(tenantId: string) {
  const ctx = await getContext(tenantId);
  return ctx.personnel.slice(0, 40).map((person: AnyRecord, index: number) => {
    const current = Number(person.readinessScore ?? 80);
    const previous = clamp(current + (((index * 5) % 11) - 5));
    const band = scoreBand(current, { green: 90, yellow: 80, red: 70 });
    return { id: `scorecard-person-${person.id}`, personnel: person, station: ctx.stations.find((s) => s.id === person.currentStationId) ?? null, currentScore: current, previousScore: previous, improvement: Math.round((current - previous) * 10) / 10, band, status: bandStatus[band], trend: current >= previous ? 'Improving' : 'Declining', supervisorNotes: current < 80 ? 'Targeted training plan opened; monitor next period.' : 'Meets expectations; on track for development goals.' };
  }).sort((a, b) => a.currentScore - b.currentScore);
}

const LINK_TARGETS = [
  { type: 'LMS Course', label: 'EMS Documentation Accuracy Refresher' },
  { type: 'Drill', label: 'Company Evolution Drill' },
  { type: 'Skill Evaluation', label: 'Driver/Operator Skills Check' },
  { type: 'Certification', label: 'EMT Recertification' },
  { type: 'Supervisor Coaching', label: '1:1 Coaching Session' },
];
const NEED_STATUS = ['Assigned', 'Completed', 'Overdue', 'Assigned', 'Completed'];

async function trainingNeeds(tenantId: string) {
  const scores = (await personnelScorecards(tenantId)).filter((row) => row.currentScore < 86);
  return scores.slice(0, 18).map((row, index) => {
    const link = LINK_TARGETS[index % LINK_TARGETS.length];
    const status = NEED_STATUS[index % NEED_STATUS.length];
    const triggerKpi = KPI_SEED[(index * 3) % KPI_SEED.length];
    return { id: `need-${row.personnel.id}`, personnel: row.personnel, station: row.station, triggerKpi: triggerKpi.name, kpiValue: row.currentScore, threshold: triggerKpi.thresholds.yellow, gap: triggerKpi.thresholds.green - row.currentScore, linkType: link.type, linkedAction: link.label, recommendedAction: `${link.type}: ${link.label} to recover ${triggerKpi.name}.`, status, dueDate: status === 'Overdue' ? '5 days ago' : `in ${7 + (index % 14)} days` };
  });
}

const OUTCOMES = ['Improved', 'Partially Improved', 'No Improvement', 'Escalated'];

async function improvementTracking(tenantId: string) {
  const scores = await personnelScorecards(tenantId);
  return scores.slice(0, 16).map((row, index) => {
    const baseline = clamp(row.currentScore - 8 - (index % 6));
    const trainingCompleted = index % 4 !== 3;
    const post = trainingCompleted ? clamp(baseline + 6 + (index % 8)) : baseline + (index % 3 === 0 ? 1 : 0);
    const improvement = Math.round(((post - baseline) / Math.max(1, baseline)) * 100);
    const outcome = !trainingCompleted ? 'No Improvement' : improvement >= 12 ? 'Improved' : improvement >= 4 ? 'Partially Improved' : 'Escalated';
    return { id: `improvement-${row.personnel.id}`, personnel: row.personnel, station: row.station, baselineScore: baseline, trainingAssigned: LINK_TARGETS[index % LINK_TARGETS.length].label, trainingCompleted, postScore: post, improvementPercent: improvement, outcome: OUTCOMES.includes(outcome) ? outcome : 'Partially Improved', supervisorNotes: outcome === 'Improved' ? 'Goal met; close out and document.' : outcome === 'Escalated' ? 'No measurable gain — route to performance review.' : 'Continue plan; re-measure next cycle.' };
  });
}

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
function peerFeedbackFor(personnel: AnyRecord[], index: number) {
  const peers = [personnel[(index * 5 + 2) % personnel.length], personnel[(index * 9 + 4) % personnel.length], personnel[(index * 13 + 7) % personnel.length]].filter(Boolean);
  const entries = peers.map((peer, i) => ({
    reviewer: peer.fullName ?? (`${peer.firstName ?? ''} ${peer.lastName ?? ''}`.trim() || 'Peer reviewer'),
    relationship: i === 0 ? 'Same crew' : i === 1 ? 'Cross-shift' : 'Officer',
    rating: 3 + ((index + i) % 3),
    comment: PEER_COMMENTS[(index + i) % PEER_COMMENTS.length],
  }));
  const avg = Math.round((entries.reduce((sum, e) => sum + e.rating, 0) / Math.max(1, entries.length)) * 10) / 10;
  return { requested: true, responses: entries.length, averageRating: avg, scale: '1–5', entries };
}

async function appraisals(tenantId: string) {
  const ctx = await getContext(tenantId);
  return ctx.personnel.slice(0, 24).map((person: AnyRecord, index: number) => {
    const cycle = person.employmentStatus === 'Probationary' ? 'Probationary' : CYCLES[index % 2];
    const status = APPRAISAL_STATUS[index % APPRAISAL_STATUS.length];
    const readiness = Number(person.readinessScore ?? 80);
    const composite = clamp(Math.round(readiness * 0.6 + 90 * 0.4));
    return {
      id: `appraisal-${person.id}`,
      personnel: person,
      station: ctx.stations.find((s) => s.id === person.currentStationId) ?? null,
      cycle,
      template: appraisalTemplate(String(person.role ?? person.rank)),
      selfAssessment: index % 3 === 0 ? 'Submitted' : 'Pending',
      supervisorAssessment: ['Supervisor Review', 'Pending Signature', 'HR Approval', 'Finalized'].includes(status) ? 'Complete' : 'In Progress',
      peerFeedback: peerFeedbackFor(ctx.personnel, index),
      compositeRating: composite,
      ratingBand: composite >= 90 ? 'Exceeds' : composite >= 78 ? 'Meets' : composite >= 65 ? 'Developing' : 'Needs Improvement',
      autoPopulated: { kpiScore: composite, trainingHours: 24 + (index % 30), certifications: `${3 + (index % 4)} valid`, attendanceRate: 90 + (index % 9), complianceFlags: index % 5 === 0 ? 1 : 0 },
      goals: index % 2 === 0 ? 'Lead a company evolution drill; complete officer development track.' : 'Improve ePCR accuracy; mentor a probationary firefighter.',
      developmentPlan: 'Quarterly check-ins with battalion chief; targeted LMS assignments tied to KPI gaps.',
      signature: status === 'Finalized' ? 'Signed' : status === 'Pending Signature' ? 'Awaiting employee signature' : 'Not signed',
      status,
      hrStatus: status === 'Finalized' ? 'Approved' : status === 'HR Approval' ? 'In HR Review' : 'Not Submitted',
    };
  });
}

async function appraisalCycleSummary(tenantId: string) {
  const all = await appraisals(tenantId);
  const finalized = all.filter((a) => a.status === 'Finalized').length;
  return { total: all.length, finalized, inProgress: all.length - finalized, completionRate: clamp(Math.round((finalized / Math.max(1, all.length)) * 100)), byCycle: CYCLES.map((cycle) => ({ cycle, count: all.filter((a) => a.cycle === cycle).length })) };
}

const ESCALATION_LEVELS = ['Coaching Note', 'Development Plan', 'Performance Improvement Plan', 'Warning Recommendation'];
async function escalations(tenantId: string) {
  const candidates = (await improvementTracking(tenantId)).filter((row) => row.outcome === 'Escalated' || row.outcome === 'No Improvement' || row.improvementPercent < 4);
  return candidates.slice(0, 12).map((row, index) => {
    const level = ESCALATION_LEVELS[Math.min(ESCALATION_LEVELS.length - 1, index % ESCALATION_LEVELS.length)];
    return { id: `escalation-${row.personnel.id}`, personnel: row.personnel, station: row.station, recommendedLevel: level, reason: `${row.outcome} after assigned training (${row.improvementPercent}% change from baseline ${row.baselineScore}).`, coachingNote: 'Documented coaching conversation focused on documentation accuracy and shift reliability.', developmentPlan: 'Structured 30/60/90 plan with measurable KPI recovery targets.', pipRecommended: level === 'Performance Improvement Plan' || level === 'Warning Recommendation', warningRecommended: level === 'Warning Recommendation', hrReviewRequired: level !== 'Coaching Note', decisionState: 'Pending Command Review', disclaimer: 'Recommendation only — no disciplinary action is issued automatically; routed for command and HR approval.' };
  });
}

async function workforceForecast(tenantId: string, days = 7) {
  const staffing = await staffingService.getForecast(tenantId, days);
  const board = (await staffingService.getBoard(tenantId, 1, 100)).items as AnyRecord[];
  const ctx = await getContext(tenantId);
  const leaveCount = ctx.personnel.filter((p) => String(p.status ?? '').toLowerCase() === 'leave').length;
  const expiringCerts = ctx.personnel.filter((_, i) => i % 8 === 0).length;
  const retirementEligible = ctx.personnel.filter((_, i) => i % 14 === 0).length;
  const avgOt = 11;
  const minStaffingGaps = board.filter((row) => row.gap > 0).reduce((sum, row) => sum + row.gap, 0);
  const dimensions = [
    { id: 'fc-incident', label: 'Incident volume forecast', value: `${1180 + days * 14} calls / 30d`, trend: 'Up 6%', risk: 'Watch', detail: 'Seasonal EMS uptick; midweek peaks drive turnout demand.' },
    { id: 'fc-workload', label: 'Station workload forecast', value: `${board.filter((r) => r.coverage < 90).length} stations over target load`, trend: 'Stable', risk: 'Watch', detail: 'Busiest stations align with lowest coverage — compounding risk.' },
    { id: 'fc-leave', label: 'Leave / vacation impact', value: `${leaveCount} on leave`, trend: 'Up', risk: leaveCount > 4 ? 'At Risk' : 'Watch', detail: 'Weekend leave pressure reduces the relief pool.' },
    { id: 'fc-cert', label: 'Certification expiration impact', value: `${expiringCerts} expiring ≤30d`, trend: 'Up', risk: expiringCerts > 8 ? 'At Risk' : 'Watch', detail: 'Expiring EMT/medic certs threaten medic-unit staffing.' },
    { id: 'fc-retire', label: 'Retirement eligibility impact', value: `${retirementEligible} eligible`, trend: 'Stable', risk: 'Watch', detail: 'Officer-level retirements would thin company-officer coverage.' },
    { id: 'fc-ot', label: 'Overtime burn forecast', value: `${avgOt} avg hrs / member`, trend: 'Stable', risk: 'Watch', detail: 'Sustained backfill is pushing overtime toward policy caps.' },
    { id: 'fc-gap', label: 'Minimum staffing gap forecast', value: `${minStaffingGaps} open seats`, trend: 'Stable', risk: minStaffingGaps > 8 ? 'At Risk' : 'Watch', detail: 'Projected open seats across the forecast window.' },
    { id: 'fc-apparatus', label: 'Apparatus coverage impact', value: `${board.filter((r) => r.gap > 0).length} units at risk`, trend: 'Watch', risk: 'Watch', detail: 'Gaps map to specific frontline units that cannot field a full crew.' },
    { id: 'fc-budget', label: 'Budget impact', value: `$${(minStaffingGaps * 7400 + avgOt * 1850).toLocaleString()} projected`, trend: 'Up', risk: 'At Risk', detail: 'Backfill overtime + relief cost if gaps are not requisitioned.' },
  ];
  return { ...staffing, dimensions, summary: { leaveCount, expiringCerts, retirementEligible, avgOt, minStaffingGaps } };
}

const REQUISITION_STATES = ['Draft', 'Submitted', 'Command Review', 'Finance Review', 'HR Review', 'Approved', 'In Recruitment', 'Filled', 'Closed'];

async function requisitions(tenantId: string) {
  const board = ((await staffingService.getBoard(tenantId, 1, 100)).items as AnyRecord[]).filter((row) => row.gap > 0);
  return board.slice(0, 10).map((row, index) => {
    const state = REQUISITION_STATES[index % REQUISITION_STATES.length];
    const urgency = row.coverage < 70 ? 'Critical' : row.coverage < 85 ? 'High' : 'Normal';
    return { id: `req-${row.station.id}`, station: row.station, positionType: index % 3 === 0 ? 'Firefighter/Paramedic' : index % 3 === 1 ? 'Firefighter/EMT' : 'Driver/Engineer', unit: row.apparatusImpacted, reason: `Forecasted minimum-staffing gap of ${row.gap} seat${row.gap > 1 ? 's' : ''} at ${row.station.name}.`, requiredCertifications: index % 2 === 0 ? ['EMT', 'Firefighter II', 'HazMat Ops'] : ['Paramedic', 'Firefighter II', 'EVOC'], budgetImpact: `$${(row.gap * 86000).toLocaleString()} annualized`, urgency, status: state, linkedForecast: 'Minimum staffing gap forecast', linkedGap: `${row.station.name} · gap ${row.gap}`, submittedBy: 'Battalion Chief (on duty)' };
  });
}

async function writeAudit(tenantId: string, userId: string | null | undefined, action: string, entityName: string, entityId: string) {
  await prisma.auditLog.create({ data: { tenantId, userId: userId ?? null, action, entityName, entityId, before: null as any, after: { action, recordedAt: new Date().toISOString() } as any, createdAt: new Date().toISOString() as any } });
}

// ── Persistence (via the generic store; no schema change) ───────────────────
// Action state is persisted per item so decisions survive a reload in live mode.
async function loadItemStates(tenantId: string): Promise<Map<string, AnyRecord>> {
  const rows = await prisma.workforceItemState.findMany({ where: { tenantId } });
  const map = new Map<string, AnyRecord>();
  for (const row of rows) map.set(String(row.itemId), row);
  return map;
}

function nextRequisitionStatus(current: string) {
  const i = REQUISITION_STATES.indexOf(current);
  return REQUISITION_STATES[Math.min(REQUISITION_STATES.length - 1, (i < 0 ? 0 : i) + 1)];
}

function actionToState(kind: string, action: string, prevStatus?: string) {
  const a = action.toLowerCase();
  if (kind === 'requisition') {
    if (a.includes('advance')) return nextRequisitionStatus(prevStatus ?? 'Draft');
    if (a.includes('reject')) return 'Closed';
    if (a.includes('submit')) return 'Submitted';
    return prevStatus ?? 'Submitted';
  }
  if (a.includes('finalize')) return 'Finalized';
  if (a.includes('return')) return 'Returned for edits';
  if (a.includes('assign')) return 'Assigned';
  if (a.includes('complete')) return 'Completed';
  if (a.includes('waive')) return 'Waived';
  if (a.includes('route')) return 'Routed to Command/HR';
  if (a.includes('hold')) return 'On Hold';
  if (a.includes('export')) return 'Exported';
  if (a.includes('schedule')) return 'Scheduled';
  if (a.includes('acknowled')) return 'Acknowledged';
  return 'Approved';
}

async function persistedKpis(tenantId: string) {
  const rows = await prisma.workforceKpi.findMany({ where: { tenantId } });
  return rows.map((seed: AnyRecord, index: number) => {
    const thresholds = seed.thresholds ?? { green: 90, yellow: 80, red: 70 };
    const value = Number(seed.value ?? 80);
    const band = scoreBand(value, thresholds);
    return { id: seed.id ?? `kpi-custom-${index + 1}`, name: seed.name, category: seed.category, formula: seed.formula, source: seed.source, unit: seed.unit ?? '%', weighting: Number(seed.weighting ?? 3), assignment: seed.assignment ?? 'Department', thresholds, value, band, status: bandStatus[band], previousValue: value, improvement: 0, thresholdLabel: `≥${thresholds.green} green · ≥${thresholds.yellow} yellow · ≥${thresholds.red} red`, custom: true };
  });
}

async function persistedRequisitions(tenantId: string) {
  const rows = await prisma.workforceStaffRequisition.findMany({ where: { tenantId } });
  return rows.map((r: AnyRecord) => ({ ...r, custom: true }));
}

function applyState(rows: AnyRecord[], kind: string, states: Map<string, AnyRecord>, field = 'status') {
  return rows.map((row) => {
    const persisted = states.get(`${kind}:${row.id}`) ?? states.get(row.id);
    if (!persisted) return row;
    return { ...row, [field]: persisted.state ?? row[field], decisionState: persisted.state ?? row.decisionState, persistedAction: persisted.action, persistedAt: persisted.at };
  });
}

export const workforceService = {
  async getOverview(tenantId: string) {
    const dept = departmentScorecard();
    const needs = await trainingNeeds(tenantId);
    const apps = await appraisalCycleSummary(tenantId);
    const reqs = await requisitions(tenantId);
    const esc = await escalations(tenantId);
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
        escalations: esc.length,
      },
    };
  },
  async getKpis(tenantId: string) { return { items: [...await persistedKpis(tenantId), ...kpiLibrary()], categories: kpiCategorySummary() }; },
  async getKpiCategories() { return kpiCategorySummary(); },
  async getDepartmentScorecard() { return departmentScorecard(); },
  async getStationScorecards(tenantId: string) { return { items: await stationScorecards(tenantId) }; },
  async getPlatoonScorecards(tenantId: string) { return { items: await platoonScorecards(tenantId) }; },
  async getPersonnelScorecards(tenantId: string) { return { items: await personnelScorecards(tenantId) }; },
  async getTrainingNeeds(tenantId: string) { return { items: applyState(await trainingNeeds(tenantId), 'need', await loadItemStates(tenantId)) }; },
  async getImprovement(tenantId: string) { return { items: await improvementTracking(tenantId) }; },
  async getAppraisals(tenantId: string) { return { items: applyState(await appraisals(tenantId), 'appraisal', await loadItemStates(tenantId)), summary: await appraisalCycleSummary(tenantId) }; },
  async getEscalations(tenantId: string) { return { items: applyState(await escalations(tenantId), 'escalation', await loadItemStates(tenantId), 'decisionState') }; },
  async getForecast(tenantId: string, days = 7) { return workforceForecast(tenantId, days); },
  async getRequisitions(tenantId: string) {
    const states = await loadItemStates(tenantId);
    const base = applyState(await requisitions(tenantId), 'requisition', states);
    const persisted = applyState(await persistedRequisitions(tenantId), 'requisition', states);
    return { items: [...persisted, ...base] };
  },
  async createKpi(tenantId: string, userId: string | undefined, payload: AnyRecord) {
    const id = payload.id ?? `kpi-custom-${Date.now()}`;
    const saved = await prisma.workforceKpi.create({ data: { id, tenantId, name: payload.name ?? 'New KPI', category: payload.category ?? 'Operations', formula: payload.formula ?? '', source: payload.source ?? 'Manual', unit: payload.unit ?? '%', weighting: Number(payload.weighting ?? 3), assignment: payload.assignment ?? 'Department', thresholds: payload.thresholds ?? { green: 90, yellow: 80, red: 70 }, value: Number(payload.value ?? 85) } });
    await writeAudit(tenantId, userId, 'WORKFORCE_KPI_CREATED', 'Kpi', String(id));
    return { ...saved, message: 'KPI added to the library.' };
  },

  async getReports(tenantId: string) {
    const dept = departmentScorecard();
    const needs = await trainingNeeds(tenantId);
    const improvements = await improvementTracking(tenantId);
    const apps = await appraisalCycleSummary(tenantId);
    const reqs = await requisitions(tenantId);
    return {
      reports: [
        { id: 'report-kpi', name: 'KPI Dashboard Report', category: 'KPI', exportReady: true, summary: `Agency composite ${dept.currentScore} (${dept.band}); ${kpiLibrary().filter((k) => k.band === 'Red' || k.band === 'Critical').length} KPIs below target.`, metrics: kpiCategorySummary() },
        { id: 'report-appraisal', name: 'Appraisal Completion Report', category: 'Appraisal', exportReady: true, summary: `${apps.completionRate}% appraisals finalized (${apps.finalized}/${apps.total}).`, metrics: apps.byCycle },
        { id: 'report-needs', name: 'Training Needs Report', category: 'Training', exportReady: true, summary: `${needs.length} active training needs; ${needs.filter((n) => n.status === 'Overdue').length} overdue.`, metrics: [{ label: 'Assigned', value: needs.filter((n) => n.status === 'Assigned').length }, { label: 'Completed', value: needs.filter((n) => n.status === 'Completed').length }, { label: 'Overdue', value: needs.filter((n) => n.status === 'Overdue').length }] },
        { id: 'report-improvement', name: 'Improvement Tracking Report', category: 'Improvement', exportReady: true, summary: `${improvements.filter((i) => i.outcome === 'Improved').length} improved, ${improvements.filter((i) => i.outcome === 'Escalated').length} escalated.`, metrics: OUTCOMES.map((outcome) => ({ label: outcome, value: improvements.filter((i) => i.outcome === outcome).length })) },
        { id: 'report-requisition', name: 'Requisition Forecast Report', category: 'Requisition', exportReady: true, summary: `${reqs.length} requisitions tied to forecasted gaps; ${reqs.filter((r) => r.urgency === 'Critical').length} critical.`, metrics: REQUISITION_STATES.map((state) => ({ label: state, value: reqs.filter((r) => r.status === state).length })).filter((m) => m.value > 0) },
      ],
    };
  },

  async createRequisition(tenantId: string, userId: string | undefined, payload: AnyRecord) {
    const id = payload.id ?? `req-${Date.now()}`;
    const saved = await prisma.workforceStaffRequisition.create({ data: { ...payload, id, tenantId, status: payload.status ?? 'Draft', linkedForecast: payload.linkedForecast ?? 'Minimum staffing gap forecast', submittedBy: payload.submittedBy ?? 'Battalion Chief (on duty)' } });
    await writeAudit(tenantId, userId, 'WORKFORCE_REQUISITION_CREATED', 'Requisition', String(id));
    return { ...saved, message: 'Requisition created from forecast gap and routed for approval.' };
  },

  async actOnItem(tenantId: string, userId: string | undefined, kind: string, id: string, action: string) {
    // Resolve the previous status for stage-based items (requisitions) so an
    // "advance" moves to the genuine next workflow stage.
    let prevStatus: string | undefined;
    if (kind === 'requisition') {
      const existing = (await loadItemStates(tenantId)).get(id);
      if (existing?.state) prevStatus = existing.state;
      else {
        const base = [...await persistedRequisitions(tenantId), ...await requisitions(tenantId)].find((r) => r.id === id);
        prevStatus = base?.status ?? 'Draft';
      }
    }
    const state = actionToState(kind, action, prevStatus);
    await prisma.workforceItemState.create({ data: { id: `state-${kind}-${id}`, tenantId, kind, itemId: id, action, state, at: new Date().toISOString() } });
    await writeAudit(tenantId, userId, `WORKFORCE_${kind.toUpperCase()}_ACTION`, kind, id);
    return { id, kind, action, state, status: 'Applied', message: `Workforce ${kind} action recorded: ${action} → ${state}.` };
  },
};
