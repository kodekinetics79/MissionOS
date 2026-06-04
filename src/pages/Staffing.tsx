import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, Gauge, Repeat, Sparkles, Timer, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { Tabs } from '../components/Tabs';
import {
  actOnStaffingRecommendation,
  getStaffingAppraisals,
  getStaffingAuditLog,
  getStaffingBoard,
  getStaffingCallbackQueue,
  getStaffingCommandCenter,
  getStaffingForecast,
  getStaffingGaps,
  getStaffingKpis,
  getStaffingMinimumRules,
  getStaffingOvertime,
  getStaffingPlanner,
  getStaffingRecommendations,
  getStaffingRoster,
  getStaffingShiftFill,
  getStaffingTrades,
} from '../services/platformClient';
import { getDecision, listDecisions, recordDecision, subscribe } from '../services/staffingDecisions';

const demoOpen = (route: string) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
const openStation = (stationId: string) => window.dispatchEvent(new CustomEvent('missionos:open-station-360', { detail: { stationId } }));
const openPersonnel = (personnelId: string) => window.dispatchEvent(new CustomEvent('missionos:open-personnel-360', { detail: { personnelId } }));

function usePromise<T>(factory: () => Promise<T>, deps: any[] = []): [T | null, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    factory()
      .then((result) => {
        if (active) {
          setData(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading];
}

function CoverageMeter({ value }: { value: number }) {
  const tone = value >= 100 ? 'healthy' : value >= 90 ? 'watch' : value >= 75 ? 'risk' : 'critical';
  return (
    <div className="coverage-meter" title={`${value}% coverage`}>
      <div className={`coverage-meter-fill ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      <span>{value}%</span>
    </div>
  );
}

type DecisionButtonProps = {
  decisionId: string;
  entityName: string;
  entityLabel: string;
  primaryAction: string;
  primaryLabel?: string;
  secondaryAction?: string;
  secondaryLabel?: string;
  onAct: (id: string, action: string, entityName: string, entityLabel: string) => void;
  onOpen?: () => void;
};

function DecisionActions({ decisionId, entityName, entityLabel, primaryAction, primaryLabel = 'Approve', secondaryAction, secondaryLabel, onAct, onOpen }: DecisionButtonProps) {
  const decided = getDecision(decisionId);
  return (
    <div className="inline-actions">
      {decided ? (
        <span className="badge healthy" title={`${decided.action} · ${new Date(decided.createdAt).toLocaleString()}`}>✓ {decided.decisionState}</span>
      ) : (
        <>
          <button type="button" className="primary-button" onClick={() => onAct(decisionId, primaryAction, entityName, entityLabel)}>{primaryLabel}</button>
          {secondaryAction ? (
            <button type="button" className="ghost-button" onClick={() => onAct(decisionId, secondaryAction, entityName, entityLabel)}>{secondaryLabel ?? 'Hold'}</button>
          ) : null}
        </>
      )}
      {onOpen ? <button type="button" className="ghost-button" onClick={onOpen}>Open 360</button> : null}
    </div>
  );
}

type TabId = 'overview' | 'shift-fill' | 'roster' | 'forecast' | 'trades' | 'overtime' | 'kpis' | 'audit';

export function Staffing() {
  const [commandCenter] = usePromise(() => getStaffingCommandCenter(), []);
  const [board] = usePromise(() => getStaffingBoard(1, 50), []);
  const [gaps] = usePromise(() => getStaffingGaps(1, 25), []);
  const [recommendations] = usePromise(() => getStaffingRecommendations(1, 25), []);
  const [shiftFill] = usePromise(() => getStaffingShiftFill(1, 25), []);
  const [trades] = usePromise(() => getStaffingTrades(1, 25), []);
  const [overtime] = usePromise(() => getStaffingOvertime(1, 25), []);
  const [callbacks] = usePromise(() => getStaffingCallbackQueue(1, 25), []);
  const [planner] = usePromise(() => getStaffingPlanner(5), []);
  const [forecast] = usePromise(() => getStaffingForecast(7), []);
  const [kpis] = usePromise(() => getStaffingKpis(), []);
  const [appraisals] = usePromise(() => getStaffingAppraisals(1, 25), []);
  const [minRules] = usePromise(() => getStaffingMinimumRules(1, 25), []);

  const [rosterDay, setRosterDay] = useState(0);
  const [roster] = usePromise(() => getStaffingRoster(rosterDay), [rosterDay]);

  const [auditLog, setAuditLog] = useState<any>(null);
  const [tab, setTab] = useState<TabId>('overview');
  const [actionState, setActionState] = useState<{ id: string; message: string } | null>(null);
  const [, forceRender] = useState(0);

  const loadAudit = async () => {
    try {
      setAuditLog(await getStaffingAuditLog(1, 25));
    } catch {
      setAuditLog({ items: [] });
    }
  };
  useEffect(() => {
    loadAudit();
    if (localStorage.getItem('missionos.staffing.focusStationId')) setTab('shift-fill');
    const unsubscribe = subscribe(() => forceRender((n) => n + 1));
    return unsubscribe;
  }, []);

  const atRiskStations = useMemo(() => commandCenter?.topRiskStations ?? [], [commandCenter]);
  const focusStationId = typeof window !== 'undefined' ? localStorage.getItem('missionos.staffing.focusStationId') : null;
  const selectedShiftFill = useMemo(() => {
    const items = shiftFill?.items ?? [];
    return items.find((row: any) => row.station?.id === focusStationId) ?? items[0] ?? null;
  }, [shiftFill, focusStationId]);

  const [focusedStation, setFocusedStation] = useState<string | null>(focusStationId);
  const focusShiftFill = (stationId: string) => {
    localStorage.setItem('missionos.staffing.focusStationId', stationId);
    setFocusedStation(stationId);
    setTab('shift-fill');
  };

  const recordAction = async (id: string, action: string, entityName: string, entityLabel: string) => {
    recordDecision({ id, action, entityName, entityLabel });
    setActionState({ id, message: `${action} recorded for ${entityLabel}` });
    await actOnStaffingRecommendation(id, action);
    await loadAudit();
  };

  const mergedAudit = useMemo(() => {
    const local = listDecisions().map((entry) => ({
      id: `local-${entry.id}`,
      action: entry.action,
      entityName: entry.entityName,
      entityId: entry.entityLabel,
      severity: entry.decisionState === 'Denied' ? 'Critical' : entry.decisionState === 'On Hold' ? 'Watch' : 'Normal',
      createdAt: entry.createdAt,
      actor: entry.actor,
      source: 'Local command decision',
    }));
    const server = (auditLog?.items ?? []).map((entry: any) => ({ ...entry, source: 'Server audit' }));
    return [...local, ...server].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [auditLog, actionState]);

  const summary = commandCenter?.summary ?? {};

  return (
    <>
      <PageHeader
        eyebrow="Staffing automation"
        title="Staffing & Scheduling"
        description="A coverage-aware staffing operating picture: roster, planner, forecaster, shift fill, trades, overtime callback, KPIs, and a command audit trail — all driven from one shared personnel and station source."
      />

      <div className="stats-grid">
        <StatCard label="Coverage" value={`${summary.coverage ?? 0}%`} hint="District staffing health" icon={<Users />} onClick={() => demoOpen('analytics-staffing')} />
        <StatCard label="Open Shifts" value={summary.openShifts ?? 0} hint="Seats below minimum" icon={<CalendarDays />} onClick={() => setTab('shift-fill')} />
        <StatCard label="Gaps" value={summary.gaps ?? 0} hint="Stations below target" icon={<AlertTriangle />} onClick={() => setTab('shift-fill')} />
        <StatCard label="Min-Staffing OK" value={`${summary.minStaffingCompliance ?? 0}%`} hint="Stations at minimum" icon={<Gauge />} onClick={() => setTab('kpis')} />
        <StatCard label="Backfill Options" value={summary.recommendationCount ?? 0} hint="Qualified cross-cover" icon={<Sparkles />} onClick={() => setTab('shift-fill')} />
        <StatCard label="Callback Ready" value={summary.callbackReady ?? 0} hint="Rested relief pool" icon={<Timer />} onClick={() => setTab('overtime')} />
      </div>

      <OperationalBriefing
        eyebrow="What matters now"
        summary={`Staffing coverage is judged through one shared agency lens. ${summary.gaps ?? 0} stations need attention, ${summary.openShifts ?? 0} seats sit below minimum staffing, and the platform can rank the best backfill and callback options without duplicating personnel records.`}
        bullets={[
          'Minimum staffing is computed from each station\'s frontline apparatus crews, so coverage risk ties directly to which unit can roll.',
          'Backfill and callback candidates are ranked by readiness, rest, and overtime exposure before they reach a command decision.',
          'Every approve / hold / deny / callback action is persisted to the audit trail and reflected back as decision state.',
        ]}
        badge={Number(summary.gaps ?? 0) > 0 ? 'Watch' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => demoOpen('demo-morning-readiness')}>Open morning briefing</button>
            <button type="button" onClick={() => setTab('forecast')}>Run staffing forecast</button>
          </div>
        )}
        evidence={[
          `${summary.coverage ?? 0}% coverage`,
          `${summary.openShifts ?? 0} open seats`,
          `${summary.recommendationCount ?? 0} backfill options`,
          `${summary.callbackReady ?? 0} callback-ready`,
        ]}
      />

      <Tabs
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'shift-fill', label: 'Shift Fill' },
          { id: 'roster', label: 'Roster & Planner' },
          { id: 'forecast', label: 'Forecaster' },
          { id: 'trades', label: 'Shift Trades' },
          { id: 'overtime', label: 'Overtime & Callback' },
          { id: 'kpis', label: 'KPIs & Appraisal' },
          { id: 'audit', label: 'Audit Trail' },
        ]}
        activeId={tab}
        onChange={(next) => setTab(next as TabId)}
      />

      {actionState ? (
        <SectionCard title="Command decision recorded">
          <div className="mini-card">
            <div>
              <b>{actionState.message}</b>
              <span>Logged for evaluator visibility and now visible in the audit trail with decision state.</span>
            </div>
            <StatusBadge status="Stable" />
          </div>
        </SectionCard>
      ) : null}

      {tab === 'overview' ? (
        <>
          <div className="two-col">
            <SectionCard title="Station staffing board">
              <DataTable
                columns={['Station', 'Coverage', 'Min', 'Gap', 'Open', 'Risk', 'Action']}
                rows={board?.items ?? atRiskStations}
                renderRow={(row: any) => (
                  <>
                    <td><b>{row.station?.name ?? 'Station'}</b></td>
                    <td><CoverageMeter value={row.coverage ?? 0} /></td>
                    <td>{row.minimumStaffing ?? row.targetStaffing ?? '—'}</td>
                    <td>{row.gap ?? 0}</td>
                    <td>{row.openShifts ?? 0}</td>
                    <td><StatusBadge status={row.riskLevel ?? row.staffingStatus ?? 'Watch'} /></td>
                    <td>
                      <div className="inline-actions">
                        <button type="button" className="primary-button" onClick={() => focusShiftFill(row.station?.id ?? '')}>Shift fill</button>
                        <button type="button" className="ghost-button" onClick={() => openStation(row.station?.id ?? '')}>Open 360</button>
                      </div>
                    </td>
                  </>
                )}
              />
            </SectionCard>

            <SectionCard title="Apparatus / station gap explanation">
              <div className="stack">
                {(gaps?.items ?? []).slice(0, 6).map((row: any) => (
                  <article className="mini-card" key={row.station?.id}>
                    <div>
                      <b>{row.station?.name}</b>
                      <span>{row.apparatusGapExplanation ?? row.recommendation}</span>
                      <span className="muted">Impacted: {row.apparatusImpacted ?? '—'}</span>
                    </div>
                    <StatusBadge status={row.riskLevel ?? 'Watch'} />
                  </article>
                ))}
                {(gaps?.items ?? []).length === 0 ? <div className="mini-note">All stations are meeting minimum staffing right now.</div> : null}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Recommended backfills">
            <DataTable
              columns={['Station', 'Personnel', 'Suitability', 'Why this person', 'Impact', 'OT risk', 'Decision']}
              rows={recommendations?.items ?? []}
              renderRow={(row: any) => {
                const id = row.id ?? `${row.station?.id}-${row.personnel?.id}`;
                return (
                  <>
                    <td><b>{row.station?.name ?? 'Station'}</b></td>
                    <td>{row.personnel?.name ?? `${row.personnel?.firstName ?? 'Crew'} ${row.personnel?.lastName ?? ''}`}</td>
                    <td>{row.suitabilityScore ?? 0}</td>
                    <td className="cell-wrap">{row.reason ?? 'High-readiness cross-cover'}</td>
                    <td><StatusBadge status={row.coverageImpact ?? 'Moderate'} /></td>
                    <td><StatusBadge status={row.overtimeRisk === 'Elevated' ? 'Warning' : 'Healthy'} /></td>
                    <td>
                      <DecisionActions
                        decisionId={id}
                        entityName="Backfill"
                        entityLabel={`${row.personnel?.name ?? 'Crew'} → ${row.station?.name ?? 'Station'}`}
                        primaryAction="Approve backfill"
                        secondaryAction="Hold backfill"
                        onAct={recordAction}
                        onOpen={() => openPersonnel(row.personnel?.id ?? '')}
                      />
                    </td>
                  </>
                );
              }}
            />
          </SectionCard>

          <div className="two-col">
            <SectionCard title="Top risk stations">
              <div className="stack">
                {atRiskStations.slice(0, 5).map((row: any) => (
                  <article className="mini-card" key={row.station?.id ?? row.station?.name}>
                    <div>
                      <b>{row.station?.name ?? 'Station'}</b>
                      <span>{row.recommendation}</span>
                      <span className="muted">Minimum staffing: {row.minimumStaffing ?? row.targetStaffing ?? 6}</span>
                    </div>
                    <div className="stack" style={{ alignItems: 'flex-end' }}>
                      <StatusBadge status={row.riskLevel ?? 'Watch'} />
                      <button type="button" onClick={() => openStation(row.station?.id ?? '')}>Open 360</button>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Command perspective">
              <div className="stack">
                <div className="mini-card">
                  <div>
                    <span>Minimum staffing rule</span>
                    <b>{selectedShiftFill?.minimumStaffingRule ?? 'Stations stay at or above the computed apparatus-based minimum.'}</b>
                  </div>
                </div>
                <div className="mini-card">
                  <div>
                    <span>Station gap explanation</span>
                    <b>{selectedShiftFill?.apparatusGapExplanation ?? 'The engine evaluates minimum staffing, leave, overtime, and station readiness together.'}</b>
                  </div>
                </div>
                <div className="mini-card">
                  <div>
                    <span>Recommended action</span>
                    <b>{selectedShiftFill?.recommendation ?? 'Review the board and approve a backfill if coverage drifts below target.'}</b>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'shift-fill' ? (
        <SectionCard title="Shift fill workflow">
          {focusedStation ? (
            <div className="mini-note">
              Focused on {(shiftFill?.items ?? []).find((row: any) => row.station?.id === focusedStation)?.station?.name ?? 'selected station'} from the coverage board.{' '}
              <button type="button" className="ghost-button" onClick={() => { localStorage.removeItem('missionos.staffing.focusStationId'); setFocusedStation(null); }}>Clear focus</button>
            </div>
          ) : null}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Station</th>
                  <th>Min</th>
                  <th>Coverage</th>
                  <th>Gap</th>
                  <th>Impacted apparatus</th>
                  <th>Decision</th>
                  <th>Suggested personnel</th>
                </tr>
              </thead>
              <tbody>
                {(shiftFill?.items ?? []).map((row: any) => (
                  <tr key={row.id} className={row.station?.id === focusedStation ? 'row-highlight' : undefined}>
                    <td><b>{row.station?.name}</b><br /><span className="mini-note-inline">{row.apparatusGapExplanation ?? row.minimumStaffingRule}</span></td>
                    <td>{row.minimumStaffing}</td>
                    <td><CoverageMeter value={row.coverage ?? 0} /></td>
                    <td>{row.gap}</td>
                    <td>{row.apparatusImpacted}</td>
                    <td>
                      <DecisionActions
                        decisionId={row.id}
                        entityName="ShiftFill"
                        entityLabel={`${row.station?.name} fill`}
                        primaryAction="Approve shift fill"
                        primaryLabel="Approve fill"
                        secondaryAction="Hold shift fill"
                        onAct={recordAction}
                        onOpen={() => openStation(row.station?.id ?? '')}
                      />
                    </td>
                    <td>{(row.suggestedPersonnel ?? []).map((person: any) => `${person.name}${person.rank ? ` (${person.rank})` : ''}`).join(', ') || 'None qualified — escalate'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionCard title="Minimum staffing rules">
            <DataTable
              columns={['Station', 'Minimum', 'Frontline apparatus (crew)', 'Brown-out threshold', 'Escalation']}
              rows={minRules?.items ?? []}
              renderRow={(row: any) => (
                <>
                  <td><b>{row.station?.name}</b></td>
                  <td>{row.minimumStaffing}</td>
                  <td className="cell-wrap">{row.apparatus}</td>
                  <td>{row.browndownThreshold}</td>
                  <td className="cell-wrap">{row.escalation}</td>
                </>
              )}
            />
          </SectionCard>
        </SectionCard>
      ) : null}

      {tab === 'roster' ? (
        <>
          <SectionCard title="Shift planner (next cycles)">
            <div className="planner-grid">
              {(planner?.cycle ?? []).map((day: any) => (
                <button
                  type="button"
                  key={day.dayOffset}
                  className={`planner-day ${day.dayOffset === rosterDay ? 'active' : ''}`}
                  onClick={() => setRosterDay(day.dayOffset)}
                >
                  <span className="planner-platoon">{day.platoon} platoon</span>
                  <b>{day.dayLabel}</b>
                  <CoverageMeter value={day.coverage} />
                  <span className="muted">{day.filled}/{day.seats} seats · {day.open} open</span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={`Station roster — ${roster?.platoon ?? 'A'} platoon · ${roster?.dayLabel ?? 'today'}`}>
            <div className="mini-note">
              {roster?.totals ? `${roster.totals.filled}/${roster.totals.seats} seats filled agency-wide · ${roster.totals.open} open seats need backfill or callback.` : 'Loading roster…'}
            </div>
            <div className="roster-grid">
              {(roster?.stations ?? []).map((entry: any) => (
                <article className="roster-card" key={entry.station.id}>
                  <header className="roster-card-head">
                    <div>
                      <b>{entry.station.name}</b>
                      <span className="muted">{entry.filled}/{entry.total} seats</span>
                    </div>
                    <StatusBadge status={entry.open > 0 ? (entry.coverage < 75 ? 'Critical' : 'Watch') : 'Ready'} />
                  </header>
                  <ul className="seat-list">
                    {entry.seats.map((seat: any, index: number) => (
                      <li key={index} className={seat.status === 'OPEN' ? 'seat open' : 'seat'}>
                        <span className="seat-unit">{seat.unit}</span>
                        <span className="seat-role">{seat.role}</span>
                        <span className="seat-person">{seat.status === 'OPEN' ? <em>OPEN</em> : seat.personnel}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.open > 0 ? (
                    <DecisionActions
                      decisionId={`roster-${entry.station.id}-${rosterDay}`}
                      entityName="Roster"
                      entityLabel={`${entry.station.name} ${roster?.platoon ?? ''} roster`}
                      primaryAction="Open backfill request"
                      primaryLabel={`Fill ${entry.open} open seat${entry.open > 1 ? 's' : ''}`}
                      onAct={recordAction}
                      onOpen={() => openStation(entry.station.id)}
                    />
                  ) : (
                    <span className="badge healthy">Fully staffed</span>
                  )}
                </article>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}

      {tab === 'forecast' ? (
        <>
          <SectionCard title="Staff forecaster">
            <div className="mini-note">{forecast?.headline}</div>
            <div className="forecast-grid">
              {(forecast?.series ?? []).map((day: any) => (
                <article className="forecast-day" key={day.dayOffset}>
                  <span className="planner-platoon">{day.platoon} platoon</span>
                  <b>{day.label}</b>
                  <CoverageMeter value={day.projectedCoverage} />
                  <StatusBadge status={day.riskLevel} />
                  <span className="muted">{day.projectedOpenSeats} projected open · {day.driver}</span>
                </article>
              ))}
            </div>
          </SectionCard>
          <div className="two-col">
            <SectionCard title="Forecast drivers">
              <div className="stack">
                <div className="mini-card"><div><span>Baseline coverage</span><b>{forecast?.baselineCoverage ?? 0}%</b></div></div>
                <div className="mini-card"><div><span>On leave</span><b>{forecast?.leaveCount ?? 0} personnel</b></div></div>
                <div className="mini-card"><div><span>In training</span><b>{forecast?.trainingCount ?? 0} personnel</b></div></div>
                <div className="mini-card"><div><span>Relief pool</span><b>{forecast?.reliefPool ?? 0} qualified</b></div></div>
              </div>
            </SectionCard>
            <SectionCard title="Recommended pre-staging">
              <div className="mini-note">{forecast?.recommendation}</div>
              <div className="inline-actions" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => recordAction('forecast-prestage', 'Open relief sign-up', 'Forecast', 'Forecast pre-staging')}
                >
                  Open relief sign-up
                </button>
                <button type="button" onClick={() => setTab('overtime')}>Review callback queue</button>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {tab === 'trades' ? (
        <SectionCard title="Shift trade request workflow">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Counterparty</th>
                  <th>Station</th>
                  <th>Shift</th>
                  <th>Reason</th>
                  <th>Coverage impact</th>
                  <th>State</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {(trades?.items ?? []).map((row: any) => (
                  <tr key={row.id}>
                    <td><b>{row.personnel?.name}</b></td>
                    <td>{row.counterparty?.name ?? '—'}</td>
                    <td>{row.station?.name ?? '—'}</td>
                    <td>{row.shiftLabel}</td>
                    <td>{row.reason}</td>
                    <td><StatusBadge status={row.coverageSafe ? 'Healthy' : 'Warning'} /> {row.coverageImpact}</td>
                    <td><StatusBadge status={row.tradeState ?? 'Pending Review'} /></td>
                    <td>
                      <DecisionActions
                        decisionId={row.id}
                        entityName="ShiftTrade"
                        entityLabel={`${row.personnel?.name} trade`}
                        primaryAction="Approve trade"
                        secondaryAction="Deny trade"
                        secondaryLabel="Deny"
                        onAct={recordAction}
                        onOpen={() => openPersonnel(row.personnel?.id ?? '')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mini-note">Trades are screened for coverage impact before approval: a coverage-neutral swap (qualified counterparty, opposite platoon) can be approved; trades that thin the relief pool are flagged to hold until a backfill is confirmed.</div>
        </SectionCard>
      ) : null}

      {tab === 'overtime' ? (
        <>
          <SectionCard title="Overtime pressure">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Station</th>
                    <th>OT hours</th>
                    <th>Risk</th>
                    <th>Recommended action</th>
                  </tr>
                </thead>
                <tbody>
                  {(overtime?.items ?? []).slice(0, 12).map((row: any) => (
                    <tr key={row.id}>
                      <td><b>{row.personnel?.name}</b></td>
                      <td>{row.station?.name ?? '—'}</td>
                      <td>{row.overtimeHours}</td>
                      <td><StatusBadge status={row.riskLevel ?? 'Watch'} /></td>
                      <td className="cell-wrap">{row.recommendedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Overtime callback recommendation workflow">
            <div className="mini-note">Ranked relief queue for the next open seat — favoring rested, qualified, low-overtime members. Sending a callback records the decision and advances the queue.</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Person</th>
                    <th>Rank</th>
                    <th>OT</th>
                    <th>Rested</th>
                    <th>Seniority</th>
                    <th>Score</th>
                    <th>Recommendation</th>
                    <th>Callback</th>
                  </tr>
                </thead>
                <tbody>
                  {(callbacks?.items ?? []).map((row: any, index: number) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td><b>{row.personnel?.name}</b></td>
                      <td>{row.rank}</td>
                      <td>{row.overtimeHours}h</td>
                      <td>{row.restedHours}h</td>
                      <td>{row.seniorityYears}y</td>
                      <td>{row.callbackScore}</td>
                      <td><StatusBadge status={row.recommendation === 'Recommended' ? 'Healthy' : row.recommendation === 'Hold' ? 'Warning' : 'Critical'} /> {row.recommendation}</td>
                      <td>
                        <DecisionActions
                          decisionId={row.id}
                          entityName="Callback"
                          entityLabel={`${row.personnel?.name} callback`}
                          primaryAction="Send callback"
                          primaryLabel="Send callback"
                          secondaryAction="Skip"
                          secondaryLabel="Skip"
                          onAct={recordAction}
                          onOpen={() => openPersonnel(row.personnel?.id ?? '')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}

      {tab === 'kpis' ? (
        <>
          <SectionCard title="Staffing KPI scorecards">
            <div className="kpi-grid">
              {(kpis?.scorecards ?? []).map((card: any) => (
                <article className="kpi-card" key={card.id}>
                  <span className="muted">{card.label}</span>
                  <strong>{card.value}</strong>
                  <div className="kpi-meta">
                    <StatusBadge status={card.status} />
                    <span className="muted">Target {card.target}</span>
                  </div>
                  <span className="kpi-trend"><Repeat size={13} /> {card.trend}</span>
                </article>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Officer staffing appraisal">
            <div className="mini-note">Appraisals tie each company officer to the staffing KPIs they own — coverage discipline, overtime control, and crew readiness — and carry an acknowledgement state.</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Officer</th>
                    <th>Station</th>
                    <th>Period</th>
                    <th>Coverage</th>
                    <th>OT discipline</th>
                    <th>Readiness</th>
                    <th>Composite</th>
                    <th>Band</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(appraisals?.items ?? []).map((row: any) => (
                    <tr key={row.id}>
                      <td><b>{row.personnel?.name}</b><br /><span className="muted">{row.personnel?.rank}</span></td>
                      <td>{row.station?.name}</td>
                      <td>{row.period}</td>
                      <td>{row.coverageScore}</td>
                      <td>{row.overtimeDiscipline}</td>
                      <td>{row.readiness}</td>
                      <td><b>{row.compositeRating}</b></td>
                      <td><StatusBadge status={row.ratingBand === 'Exceeds' || row.ratingBand === 'Meets' ? 'Healthy' : row.ratingBand === 'Developing' ? 'Warning' : 'Critical'} /> {row.ratingBand}</td>
                      <td><StatusBadge status={row.status === 'Finalized' ? 'Healthy' : 'Warning'} /></td>
                      <td>
                        <DecisionActions
                          decisionId={row.id}
                          entityName="Appraisal"
                          entityLabel={`${row.personnel?.name} appraisal`}
                          primaryAction="Finalize appraisal"
                          primaryLabel="Finalize"
                          secondaryAction="Acknowledge"
                          secondaryLabel="Acknowledge"
                          onAct={recordAction}
                          onOpen={() => openPersonnel(row.personnel?.id ?? '')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : null}

      {tab === 'audit' ? (
        <SectionCard title="Command decision audit trail">
          <div className="stack">
            {mergedAudit.length === 0 ? <div className="mini-note">No staffing command decisions recorded yet. Approve a backfill, trade, or callback to populate the trail.</div> : null}
            {mergedAudit.map((entry: any) => (
              <article key={entry.id} className="mini-card">
                <div>
                  <b>{entry.action}</b>
                  <span>{entry.entityName} · {entry.entityId ?? '—'}</span>
                  <span className="muted">{new Date(entry.createdAt).toLocaleString()} · {entry.actor ?? entry.source}</span>
                </div>
                <StatusBadge status={entry.severity ?? 'Normal'} />
              </article>
            ))}
          </div>
          <div className="mini-note">The trail merges locally persisted command decisions with server audit records so approvals, holds, denials, and callbacks remain visible across the session.</div>
        </SectionCard>
      ) : null}

      <SectionCard title="Recent signals">
        <div className="stack">
          {(commandCenter?.notifications ?? []).slice(0, 5).map((notification: any) => (
            <article className="mini-card" key={notification.id}>
              <div>
                <b>{notification.title}</b>
                <span>{notification.message}</span>
              </div>
              <StatusBadge status={notification.isRead ? 'Stable' : 'Warning'} />
            </article>
          ))}
          {(commandCenter?.aiInsights ?? []).slice(0, 3).map((insight: any) => (
            <article className="mini-card" key={insight.id}>
              <div>
                <b>{insight.title}</b>
                <span>{insight.summary}</span>
              </div>
              <StatusBadge status={insight.severity ?? 'Watch'} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
