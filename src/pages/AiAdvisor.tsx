import { useEffect, useState } from 'react';
import { Brain, Send, ShieldCheck, AlertTriangle, Activity, Sparkles, ListChecks } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { DataTable } from '../components/DataTable';
import { Tabs } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { aiApi, openAiInsight, setAiRoute, type AiInsight } from '../services/aiClient';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const AI_TABS = [
  { id: 'advisor', label: 'Command Center' },
  { id: 'ai-briefing', label: 'Daily Briefing' },
  { id: 'ai-workbench', label: 'Insight Workbench' },
  { id: 'ai-actions', label: 'Next Best Actions' },
  { id: 'ai-ask', label: 'Ask MissionOS' },
  { id: 'ai-evidence', label: 'Evidence Viewer' },
  { id: 'ai-rules', label: 'Rules' },
  { id: 'ai-providers', label: 'Providers' },
];

function AiSubnav({ active }: { active: string }) {
  return <div style={{ marginBottom: 18 }}><Tabs items={AI_TABS} activeId={active} onChange={(id) => setAiRoute(id)} /></div>;
}

const fmtRel = (value?: string | null) => {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

function usePromise<T>(factory: () => Promise<T>, deps: any[] = []): [T | null, boolean, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    factory().then((result) => { if (active) { setData(result); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return [data, loading, () => setTick((value) => value + 1)];
}

function ScoreRing({ score }: { score: number }) {
  const style = { ['--score' as any]: `${Math.max(0, Math.min(100, score))}%` };
  return <div className="score"><div className="score-ring" style={style as any}><span>{score}</span></div></div>;
}

function InsightRow({ insight, onOpen }: { insight: AiInsight; onOpen: () => void }) {
  return (
    <>
      <td><StatusBadge status={insight.severity} /></td>
      <td><b>{insight.title}</b><br /><small>{insight.category} · {insight.estimatedTimeSensitivity}</small></td>
      <td>{insight.priorityScore}</td>
      <td>{insight.confidenceScore}%</td>
      <td>{insight.affectedStationName ?? insight.affectedScope ?? '—'}</td>
      <td><div className="chips" style={{ margin: 0 }}>{(insight.sourceModulesJson ?? []).slice(0, 3).map((m) => <span key={m}>{m}</span>)}</div></td>
      <td><StatusBadge status={insight.status} /></td>
      <td><button type="button" onClick={onOpen}>Open</button></td>
    </>
  );
}

// ---------------------------------------------------------------------------
// 1. AI Readiness Command Center  (route: advisor)
// ---------------------------------------------------------------------------
export function Advisor() {
  const [data, loading, reload] = usePromise<any>(() => aiApi.commandCenter());
  const [busy, setBusy] = useState(false);

  const generate = async () => { setBusy(true); try { await aiApi.generate(); reload(); } finally { setBusy(false); } };

  return (
    <>
      <PageHeader
        eyebrow="AI Readiness Advisor"
        title="AI Readiness Command Center"
        description="Cross-module operational intelligence, readiness risk detection, and next-best-action recommendations."
      />
      <AiSubnav active="advisor" />
      {loading && !data ? <LoadingState /> : data && (
        <>
          <div className="advisor-hero">
            <ScoreRing score={data.summary.agencyReadinessScore} />
            <div>
              <h2>District readiness {data.summary.agencyReadinessScore}% <RiskBadge level={data.summary.overallRiskLevel} /></h2>
              <p>{data.summary.openInsights} open insights · {data.summary.criticalCount} critical · {data.summary.openActions} open actions · avg confidence {data.summary.averageConfidence}%</p>
            </div>
            <button type="button" disabled={busy} onClick={generate}><Sparkles size={16} /> {busy ? 'Generating…' : 'Generate Insights'}</button>
          </div>

          <div className="stats-grid">
            <StatCard label="Agency Readiness" value={`${data.summary.agencyReadinessScore}%`} hint={`${data.summary.overallRiskLevel} risk`} icon={<ShieldCheck />} />
            <StatCard label="Critical Insights" value={data.summary.criticalCount} icon={<AlertTriangle />} />
            <StatCard label="High Priority" value={data.summary.highCount} icon={<AlertTriangle />} />
            <StatCard label="Open Insights" value={data.summary.openInsights} icon={<Brain />} />
            <StatCard label="Open Actions" value={data.summary.openActions} icon={<ListChecks />} />
            <StatCard label="Avg Confidence" value={`${data.summary.averageConfidence}%`} icon={<Activity />} />
          </div>

          <div className="two-col">
            <SectionCard title="What needs attention today?">
              <div className="card-list">
                {data.whatNeedsAttention.map((insight: AiInsight) => (
                  <article key={insight.id}>
                    <b>{insight.title} <StatusBadge status={insight.severity} /></b>
                    <span>{insight.summary}</span>
                    <span className="action-line">Priority {insight.priorityScore} · {insight.recommendedAction}</span>
                    <span><button type="button" onClick={() => openAiInsight(insight.id)}>Open insight</button></span>
                  </article>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Recommended Executive Actions">
              <div className="card-list">
                {data.executiveActions.map((action: any) => (
                  <article key={action.insightId}>
                    <b>{action.title} <RiskBadge level={action.severity} /></b>
                    <span className="action-line">{action.recommendedAction}</span>
                  </article>
                ))}
                {data.executiveActions.length === 0 && <EmptyState title="No executive actions" description="No agency-level critical actions right now." />}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Risk Distribution by Category">
            <div className="integration-grid">
              {data.riskByCategory.filter((row: any) => row.count > 0).map((row: any) => (
                <section className="integration-card" key={row.category}>
                  <div className="insight-head"><h3>{row.category}</h3>{row.critical > 0 ? <StatusBadge status="Critical" /> : <span className="badge neutral">{row.count}</span>}</div>
                  <p>{row.count} open · {row.critical} critical</p>
                  <div className="action-line">Top priority score: {row.topPriority}</div>
                </section>
              ))}
            </div>
          </SectionCard>

          <div className="two-col">
            <SectionCard title="Top Affected Stations">
              <DataTable columns={['Station', 'Open Insights', 'Max Priority']} rows={data.topAffectedStations}
                renderRow={(station: any) => (<><td><b>{station.name}</b></td><td>{station.count}</td><td>{station.maxPriority}</td></>)} />
            </SectionCard>
            <SectionCard title="Readiness Trend (14 days)">
              <Sparkbars points={data.readinessTrend} suffix="%" />
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}

function Sparkbars({ points, suffix = '' }: { points: Array<{ date: string; value: number }>; suffix?: string }) {
  if (!points?.length) return <EmptyState title="No trend data" description="Not enough snapshots yet." />;
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
      {points.map((point, index) => (
        <div key={index} title={`${point.value}${suffix}`} style={{ flex: 1, background: '#b42318', opacity: 0.35 + 0.65 * (point.value / max), height: `${Math.max(8, (point.value / max) * 100)}%`, borderRadius: 6 }} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Daily Readiness Briefing  (route: ai-briefing)
// ---------------------------------------------------------------------------
export function DailyReadinessBriefing() {
  const [data, loading] = usePromise<any>(() => aiApi.briefing());
  const block = (title: string, rows: AiInsight[]) => (
    <SectionCard title={title}>
      {rows.length === 0 ? <EmptyState title="Clear" description="No open risks in this area." /> : (
        <div className="card-list">
          {rows.map((insight) => (
            <article key={insight.id}>
              <b>{insight.title} <StatusBadge status={insight.severity} /></b>
              <span>{insight.summary}</span>
              <span className="action-line">{insight.recommendedAction}</span>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );

  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="Daily Readiness Briefing" description="Your morning operational intelligence briefing across every module." />
      <AiSubnav active="ai-briefing" />
      {loading && !data ? <LoadingState /> : data && (
        <>
          <div className="advisor-hero">
            <ScoreRing score={data.agencyReadinessScore} />
            <div>
              <h2>Morning Summary</h2>
              <p>{data.morningSummary}</p>
            </div>
          </div>
          <SectionCard title="Top 5 Operational Risks">
            <DataTable columns={['Severity', 'Risk', 'Priority', 'Affected', 'Action']} rows={data.topRisks}
              renderRow={(insight: AiInsight) => (
                <><td><StatusBadge status={insight.severity} /></td><td><b>{insight.title}</b></td><td>{insight.priorityScore}</td><td>{insight.affectedStationName ?? insight.affectedScope ?? '—'}</td><td><small>{insight.recommendedAction}</small></td></>
              )} />
          </SectionCard>
          {block('Stations Requiring Attention', data.stationsRequiringAttention)}
          {block('Personnel / Training Risks', data.personnelTrainingRisks)}
          {block('Apparatus & Inventory Risks', data.apparatusInventoryRisks)}
          {block('Prevention / Community Risk', data.preventionRisks)}
          {block('Integration & Data Quality Risks', data.integrationDataRisks)}
          <div className="two-col">
            <SectionCard title="Recommended Actions for Today">
              <div className="card-list">{data.recommendedToday.map((item: any, index: number) => <article key={index}><b>{item.title} <RiskBadge level={item.severity} /></b><span className="action-line">{item.recommendedAction}</span></article>)}</div>
            </SectionCard>
            <SectionCard title="Items to Monitor This Week">
              <div className="card-list">{data.monitorThisWeek.map((item: any, index: number) => <article key={index}><b>{item.title}</b><span className="action-line">{item.recommendedAction}</span></article>)}</div>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. Insight Workbench  (route: ai-workbench)
// ---------------------------------------------------------------------------
export function InsightWorkbench() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [view, setView] = useState('list');
  const [data, loading, reload] = usePromise(() => aiApi.insights(filters), [JSON.stringify(filters)]);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (key: string, value: string) => setFilters((current) => ({ ...current, [key]: value || undefined } as Record<string, string>));
  const act = async (id: string, fn: () => Promise<unknown>) => { setBusy(id); try { await fn(); reload(); } finally { setBusy(null); } };

  const insights = data?.items ?? [];
  const statuses = ['New', 'Acknowledged', 'In Progress', 'Resolved', 'Dismissed'];
  const categories = [...new Set(insights.map((insight) => insight.category))];

  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="Insight Workbench" description="Triage cross-module insights ranked by priority, confidence, and operational impact." />
      <AiSubnav active="ai-workbench" />
      <div className="filter-bar">
        <select aria-label="Filter by severity" onChange={(event) => set('severity', event.target.value)}>
          <option value="">All severities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option><option>Info</option>
        </select>
        <select aria-label="Filter by status" onChange={(event) => set('status', event.target.value)}>
          <option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select aria-label="Filter by category" onChange={(event) => set('category', event.target.value)}>
          <option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <Tabs items={[{ id: 'list', label: 'List' }, { id: 'kanban', label: 'Kanban' }, { id: 'category', label: 'By Category' }]} activeId={view} onChange={setView} />
      </div>

      {loading && !data ? <LoadingState /> : view === 'list' ? (
        <SectionCard title={`Insights (${data?.total ?? 0})`}>
          <DataTable columns={['Severity', 'Insight', 'Priority', 'Confidence', 'Affected', 'Sources', 'Status', '']} rows={insights}
            renderRow={(insight: AiInsight) => <InsightRow insight={insight} onOpen={() => openAiInsight(insight.id)} />} />
        </SectionCard>
      ) : view === 'kanban' ? (
        <div className="three-col">
          {['New', 'Acknowledged', 'In Progress'].map((status) => (
            <SectionCard key={status} title={`${status} (${insights.filter((insight) => insight.status === status).length})`}>
              <div className="card-list">
                {insights.filter((insight) => insight.status === status).slice(0, 12).map((insight) => (
                  <article key={insight.id}>
                    <b>{insight.title} <StatusBadge status={insight.severity} /></b>
                    <span className="action-line">Priority {insight.priorityScore}</span>
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button type="button" disabled={busy !== null} onClick={() => act(insight.id, () => aiApi.acknowledge(insight.id))}>Ack</button>
                      <button type="button" disabled={busy !== null} onClick={() => act(insight.id, () => aiApi.resolve(insight.id))}>Resolve</button>
                      <button type="button" onClick={() => openAiInsight(insight.id)}>Open</button>
                    </span>
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      ) : (
        <>
          {categories.map((category) => (
            <SectionCard key={category} title={`${category} (${insights.filter((insight) => insight.category === category).length})`}>
              <DataTable columns={['Severity', 'Insight', 'Priority', 'Confidence', 'Affected', 'Sources', 'Status', '']} rows={insights.filter((insight) => insight.category === category)}
                renderRow={(insight: AiInsight) => <InsightRow insight={insight} onOpen={() => openAiInsight(insight.id)} />} />
            </SectionCard>
          ))}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 4. Insight Detail  (route: ai-insight)
// ---------------------------------------------------------------------------
export function InsightDetail() {
  const selectedId = localStorage.getItem('missionos.ai.selectedInsightId') ?? '';
  const [data, loading, reload] = usePromise<any>(() => selectedId ? aiApi.insight(selectedId) : Promise.resolve(null), [selectedId]);
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (label: string, fn: () => Promise<unknown>) => { setBusy(label); try { await fn(); reload(); } finally { setBusy(null); } };

  if (!selectedId) {
    return (
      <>
        <PageHeader eyebrow="AI Readiness Advisor" title="Insight Detail" description="Open an insight from the workbench to see full evidence and recommended actions." />
        <AiSubnav active="ai-workbench" />
        <EmptyState title="No insight selected" description="Open an insight from the Insight Workbench." action={<button type="button" onClick={() => setAiRoute('ai-workbench')}>Go to Workbench</button>} />
      </>
    );
  }
  if (loading && !data) return <><AiSubnav active="ai-workbench" /><LoadingState /></>;
  if (!data) return <EmptyState title="Insight not found" description="This insight could not be loaded." />;

  const { insight, evidence, actions, timeline, operationalImpact } = data;
  return (
    <>
      <PageHeader eyebrow={`${insight.insightNumber} · ${insight.category}`} title={insight.title} description={insight.summary} />
      <AiSubnav active="ai-workbench" />
      <div className="advisor-hero">
        <ScoreRing score={insight.priorityScore} />
        <div>
          <h2><StatusBadge status={insight.severity} /> <StatusBadge status={insight.status} /></h2>
          <p>Priority {insight.priorityScore} · Confidence {insight.confidenceScore}% · {insight.estimatedTimeSensitivity} · Scope {insight.affectedScope}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy !== null} onClick={() => act('ack', () => aiApi.acknowledge(insight.id))}>Acknowledge</button>
          <button type="button" disabled={busy !== null} onClick={() => act('resolve', () => aiApi.resolve(insight.id))}>Resolve</button>
          <button type="button" disabled={busy !== null} onClick={() => act('dismiss', () => aiApi.dismiss(insight.id))}>Dismiss</button>
        </div>
      </div>

      <div className="two-col">
        <SectionCard title="Recommended Actions">
          {actions.length === 0 ? <EmptyState title="No actions" description="No recommended actions yet." /> : (
            <DataTable columns={['Action', 'Type', 'Target', 'Status', 'Due']} rows={actions}
              renderRow={(action: any) => (
                <><td><b>{action.actionTitle}</b><br /><small>{action.actionDescription}</small></td><td>{action.actionType}</td><td>{action.targetModule}</td><td><StatusBadge status={action.status} /></td><td><small>{action.dueDate ? new Date(action.dueDate).toLocaleDateString() : '—'}</small></td></>
              )} />
          )}
        </SectionCard>
        <SectionCard title="Operational Impact">
          <div className="mini-grid">
            <span>Readiness impact <b>{operationalImpact.readinessImpact ?? '—'}</b></span>
            <span>Impact area <b>{operationalImpact.impactArea}</b></span>
            <span>Compliance impact <b>{operationalImpact.complianceImpact}</b></span>
            <span>Community risk <b>{operationalImpact.communityRiskImpact}</b></span>
            <span>Reporting impact <b>{operationalImpact.reportingImpact}</b></span>
          </div>
          <div className="action-line" style={{ marginTop: 12 }}>{insight.operationalImpact}</div>
        </SectionCard>
      </div>

      <SectionCard title={`Evidence (${evidence.length})`}>
        <DataTable columns={['Source Module', 'Entity', 'Type', 'Evidence', 'Value', 'Weight', 'When']} rows={evidence}
          renderRow={(item: any) => (
            <><td><span className="badge neutral">{item.sourceModule}</span></td><td>{item.entityName}{item.entityId ? <small> · {item.entityId}</small> : null}</td><td>{item.evidenceType}</td><td><b>{item.evidenceTitle}</b></td><td>{item.evidenceValue}</td><td>{item.weight}</td><td><small>{fmtRel(item.createdAt)}</small></td></>
          )} />
      </SectionCard>

      <div className="two-col">
        <SectionCard title="Related Records">
          {(insight.relatedRecords ?? []).length === 0 ? <EmptyState title="No linked records" description="This insight has no directly linked records." /> : (
            <div className="chips">{insight.relatedRecords.map((record: any) => <span key={`${record.type}-${record.id}`}>{record.type}: {record.label}</span>)}</div>
          )}
        </SectionCard>
        <SectionCard title="Timeline">
          <div className="card-list">{timeline.map((event: any, index: number) => <article key={index}><b>{event.event}</b><span>{fmtRel(event.at)}</span></article>)}</div>
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. Evidence Viewer  (route: ai-evidence)
// ---------------------------------------------------------------------------
export function EvidenceViewer() {
  const [moduleFilter, setModuleFilter] = useState('');
  const [data, loading] = usePromise(() => aiApi.evidence(moduleFilter ? { sourceModule: moduleFilter } : {}), [moduleFilter]);
  const modules = ['Stations', 'Staffing', 'Personnel', 'LMS', 'RMS', 'Assets', 'Maintenance', 'Inventory', 'Prevention', 'Integrations', 'Analytics'];
  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="Evidence Viewer" description="Every AI insight is backed by traceable, weighted evidence from shared platform data." />
      <AiSubnav active="ai-evidence" />
      <div className="filter-bar">
        <select aria-label="Filter by module" value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
          <option value="">All source modules</option>{modules.map((module) => <option key={module}>{module}</option>)}
        </select>
      </div>
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Evidence Records (${data?.total ?? 0})`}>
          <DataTable columns={['Source Module', 'Entity', 'Type', 'Evidence', 'Value', 'Weight']} rows={data?.items ?? []}
            renderRow={(item: any) => (
              <><td><span className="badge neutral">{item.sourceModule}</span></td><td>{item.entityName}{item.entityId ? <small> · {item.entityId}</small> : null}</td><td>{item.evidenceType}</td><td><b>{item.evidenceTitle}</b></td><td>{item.evidenceValue}</td><td>{item.weight}</td></>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. Next Best Actions  (route: ai-actions)
// ---------------------------------------------------------------------------
export function NextBestActions() {
  const [data, loading] = usePromise(() => aiApi.insights({ openOnly: 'true' }));
  const insights = (data?.items ?? []).filter((insight) => insight.recommendedAction);
  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="Next Best Actions" description="Prioritized, evidence-backed recommended actions across every module." />
      <AiSubnav active="ai-actions" />
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Recommended Actions (${insights.length})`}>
          <DataTable columns={['Priority', 'Severity', 'Recommended Action', 'Category', 'Affected', 'Time', '']} rows={insights.slice(0, 60)}
            renderRow={(insight: AiInsight) => (
              <>
                <td><b>{insight.priorityScore}</b></td>
                <td><StatusBadge status={insight.severity} /></td>
                <td><b>{insight.recommendedAction}</b><br /><small>{insight.title}</small></td>
                <td>{insight.category}</td>
                <td>{insight.affectedStationName ?? insight.affectedScope ?? '—'}</td>
                <td>{insight.estimatedTimeSensitivity}</td>
                <td><button type="button" onClick={() => openAiInsight(insight.id)}>Open</button></td>
              </>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Ask MissionOS  (route: ai-ask)
// ---------------------------------------------------------------------------
const ASK_EXAMPLES = [
  'What needs attention today?',
  'Which stations are at highest readiness risk?',
  'Who needs training this week?',
  'Which apparatus affects station readiness?',
  'Which inspections should be prioritized?',
  'Which integrations are failing?',
  'What data quality issues affect reporting?',
  'Summarize Station 4 readiness.',
  'Why is training compliance down?',
];

export function AskCommandCore() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [history, , reloadHistory] = usePromise(() => aiApi.questionHistory());

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setBusy(true);
    try { setAnswer(await aiApi.ask(q)); reloadHistory(); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="Ask MissionOS" description="Ask operational questions and get evidence-backed answers from the cross-module rule engine. Optional LLM providers augment this when enabled." />
      <AiSubnav active="ai-ask" />
      <div className="advisor-hero">
        <Brain size={42} />
        <div style={{ flex: 1 }}>
          <h2>Ask MissionOS what needs attention</h2>
          <div className="search-inline" style={{ marginTop: 10, minWidth: 320 }}>
            <input value={question} placeholder="e.g. Which stations are at highest readiness risk?" onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') ask(question); }} />
          </div>
        </div>
        <button type="button" disabled={busy} onClick={() => ask(question)}><Send size={16} /> {busy ? 'Thinking…' : 'Ask'}</button>
      </div>

      <div className="chips">{ASK_EXAMPLES.map((example) => <span key={example} role="button" style={{ cursor: 'pointer' }} onClick={() => { setQuestion(example); ask(example); }}>{example}</span>)}</div>

      {answer && (
        <SectionCard title="Answer">
          <div className="mini-grid" style={{ marginBottom: 12 }}>
            <span>Provider <b>{answer.provider}</b></span>
            <span>Confidence <b>{answer.confidence}%</b></span>
            <span>Mode <b>{answer.usedLlm ? 'LLM-augmented' : 'Rule engine'}</b></span>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{answer.answer}</pre>
          {answer.sourceModules?.length > 0 && <div className="chips">{answer.sourceModules.map((m: string) => <span key={m}>{m}</span>)}</div>}
          {answer.suggestedActions?.length > 0 && (
            <div className="action-line" style={{ marginTop: 10 }}><b>Suggested next actions:</b> {answer.suggestedActions.join(' · ')}</div>
          )}
          {answer.relatedRecords?.length > 0 && (
            <div className="chips" style={{ marginTop: 10 }}>{answer.relatedRecords.map((record: any) => <span key={`${record.type}-${record.id}`}>{record.type}: {record.label}</span>)}</div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Recent Questions">
        <DataTable columns={['Question', 'Answer', 'Confidence', 'When']} rows={history?.items ?? []}
          renderRow={(log: any) => (<><td><b>{log.question}</b></td><td><small>{String(log.answer).slice(0, 120)}…</small></td><td>{log.confidenceScore ?? '—'}%</td><td><small>{fmtRel(log.createdAt)}</small></td></>)} />
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. AI Rules / Signal Settings  (route: ai-rules)
// ---------------------------------------------------------------------------
export function AiRules() {
  const [data, loading, reload] = usePromise(() => aiApi.rules());
  const [busy, setBusy] = useState<string | null>(null);
  const toggle = async (rule: any) => {
    setBusy(rule.id);
    try { await (rule.isActive ? aiApi.disableRule(rule.id) : aiApi.enableRule(rule.id)); reload(); } finally { setBusy(null); }
  };
  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="AI Rules / Signal Settings" description="Configurable detection rules that drive the intelligence engine. Enable or disable signals per category." />
      <AiSubnav active="ai-rules" />
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Rules (${data?.total ?? 0})`}>
          <DataTable columns={['Rule', 'Category', 'Default Severity', 'Active', 'Last Triggered', 'Description', '']} rows={data?.items ?? []}
            renderRow={(rule: any) => (
              <>
                <td><b>{rule.name}</b><br /><small>{rule.ruleCode}</small></td>
                <td>{rule.category}</td>
                <td><StatusBadge status={rule.severityDefault} /></td>
                <td>{rule.isActive ? <span className="badge healthy">Active</span> : <span className="badge neutral">Inactive</span>}</td>
                <td>{rule.lastTriggeredCount ?? 0}</td>
                <td><small>{rule.description}</small></td>
                <td><button type="button" disabled={busy !== null} onClick={() => toggle(rule)}>{rule.isActive ? 'Disable' : 'Enable'}</button></td>
              </>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 9. AI Provider Settings  (route: ai-providers)
// ---------------------------------------------------------------------------
export function AiProviders() {
  const [data, loading, reload] = usePromise(() => aiApi.providers());
  const [busy, setBusy] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, any>>({});

  const toggle = async (provider: any) => {
    if (provider.providerType === 'rule-engine') return;
    setBusy(provider.id);
    try { await aiApi.updateProvider(provider.id, { enabled: !provider.enabled }); reload(); } finally { setBusy(null); }
  };
  const test = async (provider: any) => {
    setBusy(provider.id);
    try { const result = await aiApi.testProvider(provider.id); setTestResult((current) => ({ ...current, [provider.id]: result })); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title="AI Provider Settings" description="The Local Rule Engine is always active. Optional LLM providers are disabled by default and require no API key for the platform to run." />
      <AiSubnav active="ai-providers" />
      {loading && !data ? <LoadingState /> : (
        <div className="integration-grid">
          {(data ?? []).map((provider: any) => (
            <section className="integration-card" key={provider.id}>
              <div className="insight-head">
                <h3>{provider.providerName}</h3>
                {provider.enabled ? <span className="badge healthy">Enabled</span> : <span className="badge neutral">Disabled</span>}
              </div>
              <p>{provider.notes}</p>
              <dl>
                <dt>Type</dt><dd>{provider.providerType}</dd>
                <dt>Model</dt><dd>{provider.modelName ?? '—'}</dd>
                <dt>Base URL</dt><dd>{provider.baseUrl ?? '—'}</dd>
                <dt>API key</dt><dd>{provider.apiKeyConfigured ? 'Configured' : 'Not configured'}</dd>
              </dl>
              {testResult[provider.id] && <div className="action-line" style={{ marginTop: 10 }}>{testResult[provider.id].message}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {provider.providerType !== 'rule-engine' && <button type="button" disabled={busy !== null} onClick={() => toggle(provider)}>{provider.enabled ? 'Disable' : 'Enable'}</button>}
                <button type="button" disabled={busy !== null} onClick={() => test(provider)}>Test</button>
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 10. Module Risk Views  (routes: ai-risk-<module>)
// ---------------------------------------------------------------------------
function ModuleRiskView({ module, title, description, active }: { module: string; title: string; description: string; active: string }) {
  const [data, loading] = usePromise<any>(() => aiApi.moduleRisk(module), [module]);
  return (
    <>
      <PageHeader eyebrow="AI Readiness Advisor" title={title} description={description} />
      <AiSubnav active={active} />
      {loading && !data ? <LoadingState /> : data && (
        <>
          <div className="stats-grid">
            <StatCard label="Total Insights" value={data.summary.total} />
            <StatCard label="Open" value={data.summary.open} />
            <StatCard label="Critical" value={data.summary.critical} />
            <StatCard label="High" value={data.summary.high} />
            <StatCard label="Avg Priority" value={data.summary.averagePriority} />
            <StatCard label="Module" value={data.label} />
          </div>
          <SectionCard title={`${data.label} Insights`}>
            {data.insights.length === 0 ? <EmptyState title="No risks" description="No insights in this module right now." /> : (
              <DataTable columns={['Severity', 'Insight', 'Priority', 'Confidence', 'Affected', 'Status', '']} rows={data.insights}
                renderRow={(insight: AiInsight) => <InsightRow insight={insight} onOpen={() => openAiInsight(insight.id)} />} />
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}

export const StaffingRiskView = () => <ModuleRiskView module="staffing" active="ai-risk-staffing" title="Staffing Risk" description="Open shifts, below-minimum staffing, overtime risk, and coverage gaps." />;
export const TrainingRiskView = () => <ModuleRiskView module="training" active="ai-risk-training" title="Training Risk" description="Expired/expiring certifications, overdue assignments, and trainer gaps." />;
export const PersonnelRiskView = () => <ModuleRiskView module="personnel" active="ai-risk-personnel" title="Personnel Risk" description="Low readiness, overdue reviews, high overtime, and documentation QA issues." />;
export const IncidentRiskView = () => <ModuleRiskView module="incidents" active="ai-risk-incidents" title="Incident Data Risk" description="Missing fields, QA rejections, NERIS readiness, duplicates, and ePCR delays." />;
export const AssetRiskView = () => <ModuleRiskView module="assets" active="ai-risk-assets" title="Asset Risk" description="Apparatus out of service, overdue maintenance, low critical inventory, and expired supplies." />;
export const PreventionRiskView = () => <ModuleRiskView module="prevention" active="ai-risk-prevention" title="Prevention Risk" description="High-risk overdue inspections, critical violations, permit backlog, and preplans." />;
export const IntegrationRiskView = () => <ModuleRiskView module="integrations" active="ai-risk-integrations" title="Integration Risk" description="Failed syncs, stale data, credential expiration, and mapping issues." />;
export const DataQualityRiskView = () => <ModuleRiskView module="data-quality" active="ai-risk-data" title="Data Quality Risk" description="Duplicate records, missing fields, low data quality scores, and unresolved issues." />;
export const StationRiskView = () => <ModuleRiskView module="stations" active="ai-risk-stations" title="Station Risk" description="Combined staffing, training, asset, and prevention risk by station." />;
