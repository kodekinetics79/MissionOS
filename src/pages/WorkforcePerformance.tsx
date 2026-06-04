import { useEffect, useMemo, useState } from 'react';
import { Award, BarChart3, ClipboardCheck, Gauge, GraduationCap, LineChart, Sparkles, TrendingUp, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { Tabs } from '../components/Tabs';
import {
  actOnWorkforceItem,
  createKpi,
  createRequisition,
  getAppraisals,
  getDepartmentScorecard,
  getEscalations,
  getImprovementTracking,
  getPersonnelScorecards,
  getPlatoonScorecards,
  getRequisitions,
  getStationScorecards,
  getTrainingNeeds,
  getWorkforceForecast,
  getWorkforceKpis,
  getWorkforceOverview,
  getWorkforceReports,
} from '../services/workforceClient';
import { getDecision, listDecisions, recordDecision, subscribe } from '../services/staffingDecisions';

const openPersonnel = (personnelId: string) => window.dispatchEvent(new CustomEvent('missionos:open-personnel-360', { detail: { personnelId } }));
const openStation = (stationId: string) => window.dispatchEvent(new CustomEvent('missionos:open-station-360', { detail: { stationId } }));
const demoOpen = (route: string) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));

function readLocal(key: string): any[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(key) ?? '[]'); } catch { return []; }
}
function writeLocal(key: string, value: any[]) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value));
}
function kpiBand(value: number, green: number, yellow: number, red: number) {
  return value >= green ? 'Green' : value >= yellow ? 'Yellow' : value >= red ? 'Red' : 'Critical';
}

function usePromise<T>(factory: () => Promise<T>, deps: any[] = []): [T | null, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    factory()
      .then((result) => { if (active) { setData(result); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading];
}

function ScoreMeter({ value }: { value: number }) {
  const tone = value >= 90 ? 'healthy' : value >= 80 ? 'watch' : value >= 70 ? 'risk' : 'critical';
  return (
    <div className="coverage-meter" title={`${value}`}>
      <div className={`coverage-meter-fill ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      <span>{value}</span>
    </div>
  );
}

function BandBadge({ band }: { band: string }) {
  const map: Record<string, string> = { Green: 'Healthy', Yellow: 'Warning', Red: 'At Risk', Critical: 'Critical' };
  return <StatusBadge status={map[band] ?? band} />;
}

function DeltaTag({ value }: { value: number }) {
  const positive = value >= 0;
  return <span className={positive ? 'delta-up' : 'delta-down'}>{positive ? '▲' : '▼'} {Math.abs(value)}{typeof value === 'number' ? '' : ''}</span>;
}

function Decision({ id, entityName, entityLabel, primary, primaryLabel = 'Approve', secondary, secondaryLabel, onAct, onOpen }: {
  id: string; entityName: string; entityLabel: string; primary: string; primaryLabel?: string; secondary?: string; secondaryLabel?: string;
  onAct: (id: string, action: string, entityName: string, entityLabel: string) => void; onOpen?: () => void;
}) {
  const decided = getDecision(id);
  return (
    <div className="inline-actions">
      {decided ? (
        <span className="badge healthy" title={`${decided.action} · ${new Date(decided.createdAt).toLocaleString()}`}>✓ {decided.decisionState}</span>
      ) : (
        <>
          <button type="button" className="primary-button" onClick={() => onAct(id, primary, entityName, entityLabel)}>{primaryLabel}</button>
          {secondary ? <button type="button" className="ghost-button" onClick={() => onAct(id, secondary, entityName, entityLabel)}>{secondaryLabel ?? 'Hold'}</button> : null}
        </>
      )}
      {onOpen ? <button type="button" className="ghost-button" onClick={onOpen}>Open 360</button> : null}
    </div>
  );
}

type TabId = 'overview' | 'kpis' | 'scorecards' | 'needs' | 'improvement' | 'appraisals' | 'escalation' | 'forecast' | 'requisitions' | 'reports';

export function WorkforcePerformance() {
  const [overview] = usePromise(() => getWorkforceOverview(), []);
  const [kpis] = usePromise(() => getWorkforceKpis(), []);
  const [deptScore] = usePromise(() => getDepartmentScorecard(), []);
  const [stationScores] = usePromise(() => getStationScorecards(), []);
  const [platoonScores] = usePromise(() => getPlatoonScorecards(), []);
  const [personScores] = usePromise(() => getPersonnelScorecards(), []);
  const [needs] = usePromise(() => getTrainingNeeds(), []);
  const [improvement] = usePromise(() => getImprovementTracking(), []);
  const [appraisals] = usePromise(() => getAppraisals(), []);
  const [escalations] = usePromise(() => getEscalations(), []);
  const [forecast] = usePromise(() => getWorkforceForecast(7), []);
  const [requisitions, reqLoading] = usePromise(() => getRequisitions(), []);
  const [reports] = usePromise(() => getWorkforceReports(), []);

  const [tab, setTab] = useState<TabId>('overview');
  const [scorecardScope, setScorecardScope] = useState<'department' | 'station' | 'platoon' | 'personnel'>('department');
  const [kpiCategory, setKpiCategory] = useState<string>('All');
  const [actionState, setActionState] = useState<string | null>(null);
  // Created KPIs/requisitions persist locally too, so they survive a reload even
  // in demo mode (live mode also persists them server-side via the API).
  const [localReqs, setLocalReqs] = useState<any[]>(() => readLocal('missionos.workforce.reqs'));
  const [localKpis, setLocalKpis] = useState<any[]>(() => readLocal('missionos.workforce.kpis'));
  const [showKpiBuilder, setShowKpiBuilder] = useState(false);
  const [kpiDraft, setKpiDraft] = useState({ name: '', category: 'Operations', formula: '', source: '', weighting: 3, assignment: 'Station', green: 90, yellow: 80, red: 70, value: 85 });
  const [peerDrawer, setPeerDrawer] = useState<any | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => forceRender((n) => n + 1));
    return unsub;
  }, []);

  const summary = overview?.summary ?? {};

  const recordAction = async (id: string, action: string, entityName: string, entityLabel: string) => {
    recordDecision({ id, action, entityName, entityLabel });
    setActionState(`${action} recorded for ${entityLabel}`);
    await actOnWorkforceItem(entityName.toLowerCase(), id, action);
  };

  const mergedKpis = useMemo(() => {
    const live = kpis?.items ?? [];
    const liveIds = new Set(live.map((k: any) => k.id));
    return [...localKpis.filter((k) => !liveIds.has(k.id)), ...live];
  }, [kpis, localKpis]);

  const filteredKpis = useMemo(() => (kpiCategory === 'All' ? mergedKpis : mergedKpis.filter((k: any) => k.category === kpiCategory)), [mergedKpis, kpiCategory]);

  const allRequisitions = useMemo(() => {
    const live = requisitions?.items ?? [];
    const liveIds = new Set(live.map((r: any) => r.id));
    return [...localReqs.filter((r) => !liveIds.has(r.id)), ...live];
  }, [localReqs, requisitions]);

  const submitKpi = async () => {
    if (!kpiDraft.name.trim()) return;
    const id = `kpi-custom-${Date.now()}`;
    const value = Number(kpiDraft.value);
    const band = kpiBand(value, Number(kpiDraft.green), Number(kpiDraft.yellow), Number(kpiDraft.red));
    const kpi = {
      id, name: kpiDraft.name, category: kpiDraft.category, formula: kpiDraft.formula || 'Custom formula', source: kpiDraft.source || 'Manual',
      unit: '%', weighting: Number(kpiDraft.weighting), assignment: kpiDraft.assignment, value, previousValue: value, improvement: 0, band,
      thresholds: { green: Number(kpiDraft.green), yellow: Number(kpiDraft.yellow), red: Number(kpiDraft.red) },
      thresholdLabel: `≥${kpiDraft.green} green · ≥${kpiDraft.yellow} yellow · ≥${kpiDraft.red} red`, custom: true,
    };
    const next = [kpi, ...localKpis];
    setLocalKpis(next); writeLocal('missionos.workforce.kpis', next);
    recordDecision({ id, action: 'Create KPI', entityName: 'Kpi', entityLabel: kpiDraft.name });
    setActionState(`KPI "${kpiDraft.name}" added to the library`);
    setShowKpiBuilder(false);
    setKpiDraft({ name: '', category: 'Operations', formula: '', source: '', weighting: 3, assignment: 'Station', green: 90, yellow: 80, red: 70, value: 85 });
    await createKpi(kpi);
  };

  const openRequisitionFromGap = async (row: any) => {
    const req = {
      id: `req-local-${row.station?.id ?? Date.now()}`,
      station: row.station,
      positionType: 'Firefighter/EMT',
      unit: row.apparatusImpacted ?? row.unit,
      reason: `Requisition opened from forecasted gap at ${row.station?.name ?? 'station'}.`,
      requiredCertifications: ['EMT', 'Firefighter II'],
      budgetImpact: '$86,000 annualized',
      urgency: 'High',
      status: 'Draft',
      linkedForecast: 'Minimum staffing gap forecast',
      linkedGap: `${row.station?.name ?? 'station'} gap`,
      submittedBy: 'Battalion Chief (on duty)',
    };
    setLocalReqs((current) => { const next = [req, ...current]; writeLocal('missionos.workforce.reqs', next); return next; });
    recordDecision({ id: req.id, action: 'Create requisition (Draft)', entityName: 'Requisition', entityLabel: `${row.station?.name ?? 'Station'} requisition` });
    setActionState(`Requisition drafted for ${row.station?.name ?? 'station'} from forecast gap`);
    await createRequisition(req);
    setTab('requisitions');
  };

  return (
    <>
      <PageHeader
        eyebrow="Workforce performance & planning"
        title="Workforce Performance & Planning"
        description="KPI management, scorecards, training-need assessment, improvement tracking, appraisals, performance escalation, workforce forecasting, and staff requisitions — one closed loop from measurement to action, built on the shared personnel and station record."
      />

      <div className="stats-grid">
        <StatCard label="Agency Score" value={summary.compositeScore ?? 0} hint={summary.compositeBand ?? '—'} icon={<Gauge />} onClick={() => { setTab('scorecards'); setScorecardScope('department'); }} />
        <StatCard label="KPIs Below Target" value={summary.kpisBelowTarget ?? 0} hint="Red / critical" icon={<BarChart3 />} onClick={() => setTab('kpis')} />
        <StatCard label="Training Needs" value={summary.openTrainingNeeds ?? 0} hint={`${summary.overdueNeeds ?? 0} overdue`} icon={<GraduationCap />} onClick={() => setTab('needs')} />
        <StatCard label="Appraisals Done" value={`${summary.appraisalCompletion ?? 0}%`} hint="Cycle completion" icon={<Award />} onClick={() => setTab('appraisals')} />
        <StatCard label="Escalations" value={summary.escalations ?? 0} hint="Recommend + route" icon={<TrendingUp />} onClick={() => setTab('escalation')} />
        <StatCard label="Open Requisitions" value={summary.openRequisitions ?? 0} hint="From forecast gaps" icon={<UserPlus />} onClick={() => setTab('requisitions')} />
      </div>

      <OperationalBriefing
        eyebrow="What matters now"
        summary={`Agency composite performance is ${summary.compositeScore ?? 0} (${summary.compositeBand ?? '—'}). ${summary.kpisBelowTarget ?? 0} KPIs are below target, which automatically opened ${summary.openTrainingNeeds ?? 0} training needs. Forecasted staffing gaps have generated ${summary.openRequisitions ?? 0} requisitions awaiting approval.`}
        bullets={[
          'KPIs scored Green/Yellow/Red/Critical against formula-based thresholds and weighting, assignable to department, station, platoon, unit, role, or person.',
          'When a KPI drops below threshold the platform recommends a linked training action and tracks it from assigned to completed to post-training score.',
          'Workforce forecasting feeds staff requisitions; appraisals auto-populate from KPI, training, certification, attendance, and compliance data.',
        ]}
        badge={Number(summary.kpisBelowTarget ?? 0) > 3 ? 'Watch' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setTab('forecast')}>Open forecast</button>
            <button type="button" onClick={() => setTab('reports')}>View reports</button>
          </div>
        )}
        evidence={[`${summary.compositeScore ?? 0} composite`, `${summary.kpisBelowTarget ?? 0} KPIs at risk`, `${summary.openTrainingNeeds ?? 0} training needs`, `${summary.openRequisitions ?? 0} requisitions`]}
      />

      <Tabs
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'kpis', label: 'KPI Management' },
          { id: 'scorecards', label: 'Scorecards' },
          { id: 'needs', label: 'Training Needs' },
          { id: 'improvement', label: 'Improvement' },
          { id: 'appraisals', label: 'Appraisals' },
          { id: 'escalation', label: 'Performance / Escalation' },
          { id: 'forecast', label: 'Forecasting' },
          { id: 'requisitions', label: 'Requisitions' },
          { id: 'reports', label: 'Reporting' },
        ]}
        activeId={tab}
        onChange={(next) => setTab(next as TabId)}
      />

      {actionState ? (
        <SectionCard title="Action recorded">
          <div className="mini-card"><div><b>{actionState}</b><span>Logged to the workforce decision trail and routed for the appropriate approval.</span></div><StatusBadge status="Stable" /></div>
        </SectionCard>
      ) : null}

      {tab === 'overview' ? (
        <>
          <div className="two-col">
            <SectionCard title="KPI category health">
              <DataTable
                columns={['Category', 'KPIs', 'Avg score', 'Band']}
                rows={kpis?.categories ?? []}
                renderRow={(row: any) => (
                  <>
                    <td><b>{row.category}</b></td>
                    <td>{row.kpiCount}</td>
                    <td><ScoreMeter value={row.averageScore} /></td>
                    <td><BandBadge band={row.band} /></td>
                  </>
                )}
              />
            </SectionCard>
            <SectionCard title="Lowest-scoring stations">
              <div className="stack">
                {(stationScores?.items ?? []).slice(0, 6).map((row: any) => (
                  <article className="mini-card" key={row.id}>
                    <div><b>{row.station?.name}</b><span>{row.drivers}</span></div>
                    <div className="stack" style={{ alignItems: 'flex-end' }}><BandBadge band={row.band} /><b>{row.currentScore}</b></div>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
          <SectionCard title="Closed-loop snapshot">
            <div className="kpi-grid">
              <article className="kpi-card"><span className="muted">Measure</span><strong>{summary.kpisBelowTarget ?? 0}</strong><span className="muted">KPIs below target</span></article>
              <article className="kpi-card"><span className="muted">Recommend</span><strong>{summary.openTrainingNeeds ?? 0}</strong><span className="muted">training needs opened</span></article>
              <article className="kpi-card"><span className="muted">Improve</span><strong>{(improvement?.items ?? []).filter((i: any) => i.outcome === 'Improved').length}</strong><span className="muted">improved after training</span></article>
              <article className="kpi-card"><span className="muted">Escalate</span><strong>{summary.escalations ?? 0}</strong><span className="muted">routed for review</span></article>
              <article className="kpi-card"><span className="muted">Plan</span><strong>{summary.openRequisitions ?? 0}</strong><span className="muted">requisitions from forecast</span></article>
              <article className="kpi-card"><span className="muted">Appraise</span><strong>{summary.appraisalCompletion ?? 0}%</strong><span className="muted">cycle complete</span></article>
            </div>
          </SectionCard>
        </>
      ) : null}

      {tab === 'kpis' ? (
        <SectionCard title="KPI library & builder">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="chip-row">
              {['All', 'Operations', 'Training', 'EMS', 'Prevention', 'Staffing', 'Assets', 'Personnel', 'Leadership'].map((cat) => (
                <button key={cat} type="button" className={cat === kpiCategory ? 'primary-button' : 'ghost-button'} onClick={() => setKpiCategory(cat)}>{cat}</button>
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={() => setShowKpiBuilder((v) => !v)}>{showKpiBuilder ? 'Close builder' : '+ New KPI'}</button>
          </div>

          {showKpiBuilder ? (
            <div className="kpi-builder">
              <div className="form-grid">
                <label>Name<input value={kpiDraft.name} onChange={(e) => setKpiDraft({ ...kpiDraft, name: e.target.value })} placeholder="e.g. Mutual Aid Response Rate" /></label>
                <label>Category
                  <select value={kpiDraft.category} onChange={(e) => setKpiDraft({ ...kpiDraft, category: e.target.value })}>
                    {['Operations', 'Training', 'EMS', 'Prevention', 'Staffing', 'Assets', 'Personnel', 'Leadership'].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label>Formula<input value={kpiDraft.formula} onChange={(e) => setKpiDraft({ ...kpiDraft, formula: e.target.value })} placeholder="completed ÷ total" /></label>
                <label>Source<input value={kpiDraft.source} onChange={(e) => setKpiDraft({ ...kpiDraft, source: e.target.value })} placeholder="RMS / LMS / Staffing" /></label>
                <label>Assignment
                  <select value={kpiDraft.assignment} onChange={(e) => setKpiDraft({ ...kpiDraft, assignment: e.target.value })}>
                    {['Department', 'Station', 'Shift/Platoon', 'Unit', 'Role', 'Personnel'].map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label>Weighting<input type="number" min={1} max={5} value={kpiDraft.weighting} onChange={(e) => setKpiDraft({ ...kpiDraft, weighting: Number(e.target.value) })} /></label>
                <label>Green ≥<input type="number" value={kpiDraft.green} onChange={(e) => setKpiDraft({ ...kpiDraft, green: Number(e.target.value) })} /></label>
                <label>Yellow ≥<input type="number" value={kpiDraft.yellow} onChange={(e) => setKpiDraft({ ...kpiDraft, yellow: Number(e.target.value) })} /></label>
                <label>Red ≥<input type="number" value={kpiDraft.red} onChange={(e) => setKpiDraft({ ...kpiDraft, red: Number(e.target.value) })} /></label>
                <label>Current value<input type="number" value={kpiDraft.value} onChange={(e) => setKpiDraft({ ...kpiDraft, value: Number(e.target.value) })} /></label>
              </div>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button type="button" className="primary-button" onClick={submitKpi}>Save KPI</button>
                <button type="button" className="ghost-button" onClick={() => setShowKpiBuilder(false)}>Cancel</button>
              </div>
            </div>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>KPI</th><th>Category</th><th>Formula</th><th>Source</th><th>Threshold</th><th>Weight</th><th>Assignment</th><th>Current</th><th>Δ vs prior</th><th>Band</th></tr>
              </thead>
              <tbody>
                {filteredKpis.map((kpi: any) => (
                  <tr key={kpi.id}>
                    <td><b>{kpi.name}</b></td>
                    <td>{kpi.category}</td>
                    <td className="cell-wrap">{kpi.formula}</td>
                    <td>{kpi.source}</td>
                    <td className="cell-wrap"><span className="mini-note-inline">{kpi.thresholdLabel}</span></td>
                    <td>×{kpi.weighting}</td>
                    <td>{kpi.assignment}</td>
                    <td><ScoreMeter value={kpi.value} /></td>
                    <td><DeltaTag value={kpi.improvement} /></td>
                    <td><BandBadge band={kpi.band} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mini-note">KPI builder: each KPI carries a formula, data source, Green/Yellow/Red/Critical thresholds, weighting, and an assignment level (department, station, shift/platoon, unit, role, or individual). Scores roll up into the weighted scorecards.</div>
        </SectionCard>
      ) : null}

      {tab === 'scorecards' ? (
        <>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {(['department', 'station', 'platoon', 'personnel'] as const).map((scope) => (
              <button key={scope} type="button" className={scope === scorecardScope ? 'primary-button' : 'ghost-button'} onClick={() => setScorecardScope(scope)}>
                {scope[0].toUpperCase() + scope.slice(1)}
              </button>
            ))}
          </div>

          {scorecardScope === 'department' && deptScore ? (
            <SectionCard title="Department scorecard">
              <div className="row-between" style={{ marginBottom: 12 }}>
                <div><b style={{ fontSize: 26 }}>{deptScore.currentScore}</b> <BandBadge band={deptScore.band} /> <span className="muted">vs {deptScore.previousScore} last period</span> <DeltaTag value={deptScore.improvement} /></div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>KPI</th><th>Category</th><th>Current</th><th>Previous</th><th>Improvement</th><th>Band</th></tr></thead>
                  <tbody>
                    {(deptScore.kpis ?? []).map((kpi: any) => (
                      <tr key={kpi.id}><td><b>{kpi.name}</b></td><td>{kpi.category}</td><td><ScoreMeter value={kpi.value} /></td><td>{kpi.previousValue}</td><td><DeltaTag value={kpi.improvement} /></td><td><BandBadge band={kpi.band} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mini-note"><b>Supervisor notes:</b> {deptScore.supervisorNotes}</div>
            </SectionCard>
          ) : null}

          {scorecardScope === 'station' ? (
            <SectionCard title="Station scorecards">
              <DataTable
                columns={['Station', 'Current', 'Previous', 'Improvement', 'Band', 'Supervisor note', 'Action']}
                rows={stationScores?.items ?? []}
                renderRow={(row: any) => (
                  <>
                    <td><b>{row.station?.name}</b></td>
                    <td><ScoreMeter value={row.currentScore} /></td>
                    <td>{row.previousScore}</td>
                    <td><DeltaTag value={row.improvement} /></td>
                    <td><BandBadge band={row.band} /></td>
                    <td className="cell-wrap">{row.supervisorNotes}</td>
                    <td><button type="button" className="ghost-button" onClick={() => openStation(row.station?.id ?? '')}>Open 360</button></td>
                  </>
                )}
              />
            </SectionCard>
          ) : null}

          {scorecardScope === 'platoon' ? (
            <SectionCard title="Shift / platoon scorecards">
              <div className="kpi-grid">
                {(platoonScores?.items ?? []).map((row: any) => (
                  <article className="kpi-card" key={row.id}>
                    <span className="muted">{row.platoon} · {row.members} members</span>
                    <strong>{row.currentScore}</strong>
                    <div className="kpi-meta"><BandBadge band={row.band} /><DeltaTag value={row.improvement} /></div>
                    <span className="mini-note-inline">{row.supervisorNotes}</span>
                  </article>
                ))}
              </div>
            </SectionCard>
          ) : null}

          {scorecardScope === 'personnel' ? (
            <SectionCard title="Individual scorecards">
              <DataTable
                columns={['Person', 'Station', 'Current', 'Previous', 'Trend', 'Band', 'Action']}
                rows={(personScores?.items ?? []).slice(0, 25)}
                renderRow={(row: any) => (
                  <>
                    <td><b>{row.personnel?.name}</b><br /><span className="muted">{row.personnel?.rank}</span></td>
                    <td>{row.station?.name ?? '—'}</td>
                    <td><ScoreMeter value={row.currentScore} /></td>
                    <td>{row.previousScore}</td>
                    <td><StatusBadge status={row.trend === 'Improving' ? 'Improving' : 'Warning'} /></td>
                    <td><BandBadge band={row.band} /></td>
                    <td><button type="button" className="ghost-button" onClick={() => openPersonnel(row.personnel?.id ?? '')}>Open 360</button></td>
                  </>
                )}
              />
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {tab === 'needs' ? (
        <SectionCard title="Training need assessment (auto-generated from KPI gaps)">
          <div className="mini-note">When a KPI drops below threshold, a training need is opened automatically and linked to an LMS course, drill, skill evaluation, certification, or supervisor coaching.</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person</th><th>Trigger KPI</th><th>Score</th><th>Gap</th><th>Linked action</th><th>Recommended action</th><th>Status</th><th>Due</th><th>Action</th></tr></thead>
              <tbody>
                {(needs?.items ?? []).map((row: any) => (
                  <tr key={row.id}>
                    <td><b>{row.personnel?.name}</b></td>
                    <td>{row.triggerKpi}</td>
                    <td>{row.kpiValue}</td>
                    <td>{row.gap > 0 ? `-${row.gap}` : '0'}</td>
                    <td><span className="mini-chip">{row.linkType}</span> {row.linkedAction}</td>
                    <td className="cell-wrap">{row.recommendedAction}</td>
                    <td><StatusBadge status={row.status === 'Completed' ? 'Healthy' : row.status === 'Overdue' ? 'Critical' : 'Warning'} /></td>
                    <td>{row.dueDate}</td>
                    <td><Decision id={row.id} entityName="Need" entityLabel={`${row.personnel?.name} training`} primary="Assign training" primaryLabel="Assign" secondary="Waive" secondaryLabel="Waive" onAct={recordAction} onOpen={() => openPersonnel(row.personnel?.id ?? '')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'improvement' ? (
        <SectionCard title="Improvement tracking">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person</th><th>Baseline</th><th>Training assigned</th><th>Completed</th><th>Post score</th><th>Improvement</th><th>Outcome</th><th>Supervisor review</th></tr></thead>
              <tbody>
                {(improvement?.items ?? []).map((row: any) => (
                  <tr key={row.id}>
                    <td><b>{row.personnel?.name}</b></td>
                    <td>{row.baselineScore}</td>
                    <td className="cell-wrap">{row.trainingAssigned}</td>
                    <td><StatusBadge status={row.trainingCompleted ? 'Healthy' : 'Warning'} /></td>
                    <td>{row.postScore}</td>
                    <td><div className="coverage-meter" style={{ minWidth: 80 }}><div className={`coverage-meter-fill ${row.improvementPercent >= 12 ? 'healthy' : row.improvementPercent >= 4 ? 'watch' : 'critical'}`} style={{ width: `${Math.min(100, Math.max(6, row.improvementPercent * 4))}%` }} /><span>{row.improvementPercent}%</span></div></td>
                    <td><StatusBadge status={row.outcome === 'Improved' ? 'Healthy' : row.outcome === 'Partially Improved' ? 'Warning' : row.outcome === 'Escalated' ? 'Critical' : 'At Risk'} /> {row.outcome}</td>
                    <td className="cell-wrap">{row.supervisorNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'appraisals' ? (
        <>
          <SectionCard title="Appraisal cycles">
            <div className="kpi-grid">
              <article className="kpi-card"><span className="muted">Completion</span><strong>{appraisals?.summary?.completionRate ?? 0}%</strong><span className="muted">{appraisals?.summary?.finalized ?? 0}/{appraisals?.summary?.total ?? 0} finalized</span></article>
              {(appraisals?.summary?.byCycle ?? []).map((c: any) => (
                <article className="kpi-card" key={c.cycle}><span className="muted">{c.cycle}</span><strong>{c.count}</strong><span className="muted">in cycle</span></article>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Appraisal management">
            <div className="mini-note">Role-based templates auto-populate KPI results, training history, certifications, attendance, and compliance. Self + supervisor assessment, optional 360 feedback, goals/development plan, digital signature, and HR approval status are tracked per appraisal.</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Person</th><th>Cycle</th><th>Template</th><th>Self</th><th>Supervisor</th><th>360</th><th>Composite</th><th>Auto-populated</th><th>Signature</th><th>HR</th><th>Action</th></tr></thead>
                <tbody>
                  {(appraisals?.items ?? []).map((row: any) => (
                    <tr key={row.id}>
                      <td><b>{row.personnel?.name}</b><br /><span className="muted">{row.personnel?.rank}</span></td>
                      <td>{row.cycle}</td>
                      <td>{row.template}</td>
                      <td><StatusBadge status={row.selfAssessment === 'Submitted' ? 'Healthy' : 'Warning'} /></td>
                      <td><StatusBadge status={row.supervisorAssessment === 'Complete' ? 'Healthy' : 'Warning'} /></td>
                      <td>
                        {row.peerFeedback?.responses ? (
                          <button type="button" className="mini-chip" onClick={() => setPeerDrawer(row)}>★ {row.peerFeedback.averageRating} · {row.peerFeedback.responses} peers</button>
                        ) : <span className="muted">Not requested</span>}
                      </td>
                      <td><b>{row.compositeRating}</b><br /><span className="muted">{row.ratingBand}</span></td>
                      <td className="cell-wrap"><span className="muted">KPI {row.autoPopulated?.kpiScore} · {row.autoPopulated?.trainingHours}h trn · {row.autoPopulated?.certifications} · {row.autoPopulated?.attendanceRate}% att · {row.autoPopulated?.complianceFlags} flag(s)</span></td>
                      <td><StatusBadge status={row.signature === 'Signed' ? 'Healthy' : 'Warning'} /></td>
                      <td><StatusBadge status={row.hrStatus === 'Approved' ? 'Healthy' : 'Warning'} /></td>
                      <td><Decision id={row.id} entityName="Appraisal" entityLabel={`${row.personnel?.name} appraisal`} primary="Finalize appraisal" primaryLabel="Finalize" secondary="Return for edits" secondaryLabel="Return" onAct={recordAction} onOpen={() => openPersonnel(row.personnel?.id ?? '')} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          {peerDrawer ? (
            <SectionCard title={`360 / peer feedback — ${peerDrawer.personnel?.name}`}>
              <div className="row-between" style={{ marginBottom: 10 }}>
                <span className="muted">Average peer rating {peerDrawer.peerFeedback.averageRating} / 5 from {peerDrawer.peerFeedback.responses} reviewers</span>
                <button type="button" className="ghost-button" onClick={() => setPeerDrawer(null)}>Close</button>
              </div>
              <div className="stack">
                {(peerDrawer.peerFeedback.entries ?? []).map((entry: any, i: number) => (
                  <article className="mini-card" key={i}>
                    <div><b>{entry.reviewer}</b><span>{entry.relationship} · rated {entry.rating}/5</span><span className="muted">{entry.comment}</span></div>
                    <StatusBadge status={entry.rating >= 4 ? 'Healthy' : 'Warning'} />
                  </article>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {tab === 'escalation' ? (
        <SectionCard title="Performance improvement / escalation">
          <div className="mini-note">Recommendations only — no disciplinary action is issued automatically. Each item is routed for command and HR approval with a full audit trail.</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Person</th><th>Recommended level</th><th>Reason</th><th>PIP</th><th>Warning</th><th>HR review</th><th>State</th><th>Action</th></tr></thead>
              <tbody>
                {(escalations?.items ?? []).map((row: any) => (
                  <tr key={row.id}>
                    <td><b>{row.personnel?.name}</b></td>
                    <td><StatusBadge status={row.recommendedLevel.includes('Warning') ? 'Critical' : row.recommendedLevel.includes('Improvement') ? 'At Risk' : 'Warning'} /> {row.recommendedLevel}</td>
                    <td className="cell-wrap">{row.reason}</td>
                    <td><StatusBadge status={row.pipRecommended ? 'At Risk' : 'Stable'} /></td>
                    <td><StatusBadge status={row.warningRecommended ? 'Critical' : 'Stable'} /></td>
                    <td><StatusBadge status={row.hrReviewRequired ? 'Warning' : 'Healthy'} /></td>
                    <td><StatusBadge status="Warning" /> {row.decisionState}</td>
                    <td><Decision id={row.id} entityName="Escalation" entityLabel={`${row.personnel?.name} ${row.recommendedLevel}`} primary="Route to command/HR" primaryLabel="Route for approval" secondary="Hold" onAct={recordAction} onOpen={() => openPersonnel(row.personnel?.id ?? '')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'forecast' ? (
        <>
          <SectionCard title="Workforce forecast">
            <div className="mini-note">{forecast?.headline}</div>
            <div className="forecast-grid">
              {(forecast?.dimensions ?? []).map((dim: any) => (
                <article className="forecast-day" key={dim.id}>
                  <span className="muted">{dim.label}</span>
                  <b>{dim.value}</b>
                  <div className="kpi-meta"><StatusBadge status={dim.risk} /><span className="muted">{dim.trend}</span></div>
                  <span className="mini-note-inline">{dim.detail}</span>
                </article>
              ))}
            </div>
          </SectionCard>
          <div className="two-col">
            <SectionCard title="Coverage projection (next 7 days)">
              <div className="forecast-grid">
                {(forecast?.series ?? []).map((day: any) => (
                  <article className="forecast-day" key={day.dayOffset}>
                    <span className="planner-platoon">{day.platoon} platoon</span>
                    <b>{day.label}</b>
                    <div className="coverage-meter"><div className={`coverage-meter-fill ${day.projectedCoverage >= 95 ? 'healthy' : day.projectedCoverage >= 85 ? 'watch' : 'risk'}`} style={{ width: `${day.projectedCoverage}%` }} /><span>{day.projectedCoverage}%</span></div>
                    <StatusBadge status={day.riskLevel} />
                  </article>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Turn forecast into requisitions">
              <div className="mini-note">{forecast?.recommendation}</div>
              <div className="stack" style={{ marginTop: 12 }}>
                {(stationScores?.items ?? []).filter((s: any) => s.currentScore < 80).slice(0, 4).map((s: any) => (
                  <article className="mini-card" key={s.id}>
                    <div><b>{s.station?.name}</b><span>Score {s.currentScore} · {s.drivers}</span></div>
                    <button type="button" className="primary-button" onClick={() => openRequisitionFromGap({ station: s.station, apparatusImpacted: s.drivers })}>Create requisition</button>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'requisitions' ? (
        <SectionCard title="Staff requisition management">
          <div className="mini-note">Requisitions are created from forecasted staffing gaps and routed through Draft → Submitted → Command → Finance → HR → Approved → In Recruitment → Filled → Closed. Each links back to the forecast and the originating gap.</div>
          {reqLoading ? <div className="mini-note">Loading requisitions…</div> : null}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Station</th><th>Position</th><th>Unit</th><th>Reason</th><th>Required certs</th><th>Budget impact</th><th>Urgency</th><th>Status</th><th>Linked gap</th><th>Action</th></tr></thead>
              <tbody>
                {allRequisitions.map((row: any) => (
                  <tr key={row.id}>
                    <td><b>{row.station?.name}</b></td>
                    <td>{row.positionType}</td>
                    <td>{row.unit}</td>
                    <td className="cell-wrap">{row.reason}</td>
                    <td className="cell-wrap">{(row.requiredCertifications ?? []).join(', ')}</td>
                    <td>{row.budgetImpact}</td>
                    <td><StatusBadge status={row.urgency === 'Critical' ? 'Critical' : row.urgency === 'High' ? 'At Risk' : 'Stable'} /></td>
                    <td><StatusBadge status={['Approved', 'Filled', 'In Recruitment'].includes(row.status) ? 'Healthy' : row.status === 'Closed' ? 'Stable' : 'Warning'} /> {row.status}</td>
                    <td><span className="mini-chip">{row.linkedForecast}</span><br /><span className="muted">{row.linkedGap}</span></td>
                    <td><Decision id={row.id} entityName="Requisition" entityLabel={`${row.station?.name} requisition`} primary="Advance to next stage" primaryLabel="Advance" secondary="Reject" secondaryLabel="Reject" onAct={recordAction} onOpen={() => openStation(row.station?.id ?? '')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {tab === 'reports' ? (
        <SectionCard title="Workforce reporting">
          <div className="mini-note">Export- and schedule-ready report structures across KPIs, appraisals, training needs, improvement tracking, and requisition forecasting.</div>
          <div className="report-grid">
            {(reports?.reports ?? []).map((report: any) => (
              <article className="report-card" key={report.id}>
                <header className="row-between">
                  <div><b>{report.name}</b><br /><span className="muted">{report.category}</span></div>
                  <StatusBadge status={report.exportReady ? 'Healthy' : 'Warning'} />
                </header>
                <p className="mini-note-inline">{report.summary}</p>
                <div className="chips">
                  {(report.metrics ?? []).map((m: any, i: number) => (
                    <span key={i}>{m.label ?? m.category ?? m.cycle}: {m.value ?? m.averageScore ?? m.count}</span>
                  ))}
                </div>
                <div className="inline-actions">
                  <button type="button" className="ghost-button" onClick={() => recordAction(`export-${report.id}`, 'Export report', 'Report', report.name)}>Export</button>
                  <button type="button" className="ghost-button" onClick={() => recordAction(`schedule-${report.id}`, 'Schedule report', 'Report', report.name)}>Schedule</button>
                  <button type="button" className="ghost-button" onClick={() => demoOpen('analytics')}>Open in Analytics</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Decision trail">
        <div className="stack">
          {listDecisions().filter((d) => ['Need', 'Appraisal', 'Escalation', 'Requisition', 'Report'].includes(d.entityName)).slice(0, 8).map((entry) => (
            <article className="mini-card" key={entry.id}>
              <div><b>{entry.action}</b><span>{entry.entityName} · {entry.entityLabel}</span><span className="muted">{new Date(entry.createdAt).toLocaleString()} · {entry.actor}</span></div>
              <StatusBadge status={entry.decisionState === 'Denied' ? 'Critical' : 'Stable'} />
            </article>
          ))}
          {listDecisions().filter((d) => ['Need', 'Appraisal', 'Escalation', 'Requisition', 'Report'].includes(d.entityName)).length === 0 ? (
            <div className="mini-note">No workforce actions recorded yet. Assign a training need, finalize an appraisal, route an escalation, or advance a requisition to populate the trail.</div>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}
