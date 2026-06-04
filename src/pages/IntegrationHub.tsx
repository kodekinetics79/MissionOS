import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowRightLeft, Boxes, KeyRound, Link2, Network, PlugZap, RefreshCw, ShieldCheck, Webhook,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { RiskBadge } from '../components/RiskBadge';
import { DataTable } from '../components/DataTable';
import { Tabs } from '../components/Tabs';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { integrationApi, openIntegrationSystem, setIntegrationRoute, type CommandCenter, type IntegrationSystem } from '../services/integrationClient';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const INTEGRATION_TABS = [
  { id: 'integrations', label: 'Command Center' },
  { id: 'integration-systems', label: 'Connected Systems' },
  { id: 'integration-flow', label: 'Data Flow' },
  { id: 'integration-mappings', label: 'Field Mapping' },
  { id: 'integration-logs', label: 'Sync Logs' },
  { id: 'integration-errors', label: 'Error & Retry' },
  { id: 'integration-docs', label: 'API Docs' },
  { id: 'integration-credentials', label: 'Credentials & Webhooks' },
  { id: 'integration-performance', label: 'Performance' },
  { id: 'integration-adapters', label: 'Adapter Registry' },
];

function IntegrationSubnav({ active }: { active: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Tabs items={INTEGRATION_TABS} activeId={active} onChange={(id) => setIntegrationRoute(id)} />
    </div>
  );
}

const fmtDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');
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

function ScoreRing({ score }: { score: number }) {
  const style = { ['--score' as any]: `${Math.max(0, Math.min(100, score))}%` };
  return (
    <div className="score">
      <div className="score-ring" style={style as any}><span>{score}</span></div>
    </div>
  );
}

const usePromise = <T,>(factory: () => Promise<T>, deps: any[] = []): [T | null, boolean, () => void] => {
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
};

// ---------------------------------------------------------------------------
// 1. Integration Command Center  (route: integrations)
// ---------------------------------------------------------------------------
export function Integrations() {
  const [data, loading] = usePromise<CommandCenter>(() => integrationApi.commandCenter());

  return (
    <>
      <PageHeader
        eyebrow="Public Safety Integration Hub"
        title="Integration Command Center"
        description="API health, data exchange, field mapping, sync monitoring, and public-safety system interoperability."
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="The integration hub exposes the systems behind the scenes so evaluators can see how MissionOS tracks health, sync delay, and data exchange quality."
        bullets={[
          `${data?.summary?.connectedCount ?? 0} connected system(s), ${data?.summary?.degradedCount ?? 0} degraded, and ${data?.summary?.failedCount ?? 0} failed or disabled.`,
          `${data?.summary?.failedSyncsToday ?? 0} failed sync(s) today and ${data?.summary?.dataFreshnessRisks ?? 0} freshness risk(s) affect downstream records.`,
          'Open the CAD, RMS, and NERIS systems to show how the same issue appears across connected modules.',
        ]}
        badge={(data?.summary?.degradedCount ?? 0) > 0 || (data?.summary?.failedCount ?? 0) > 0 ? 'Warning' : 'Healthy'}
        actions={<button type="button" className="btn-primary" onClick={() => setIntegrationRoute('integration-systems')}>Open systems</button>}
        evidence={['CAD', 'RMS', 'NERIS', 'ePCR', 'Field mapping', 'Logs']}
      />
      <IntegrationSubnav active="integrations" />
      {loading && !data ? <LoadingState /> : null}
      {data && (
        <>
          <div className="stats-grid">
            <StatCard label="Overall Health" value={data.summary.overallHealthScore} hint="Weighted across all systems" icon={<ShieldCheck />} />
            <StatCard label="Connected" value={data.summary.connectedCount} hint={`${data.summary.totalSystems} total systems`} icon={<PlugZap />} />
            <StatCard label="Degraded" value={data.summary.degradedCount} hint="Needs attention" icon={<AlertTriangle />} />
            <StatCard label="Failed / Disabled" value={data.summary.failedCount} icon={<AlertTriangle />} />
            <StatCard label="Failed Syncs Today" value={data.summary.failedSyncsToday} icon={<RefreshCw />} />
            <StatCard label="Records Today" value={data.summary.recordsExchangedToday.toLocaleString()} hint="Exchanged successfully" icon={<ArrowRightLeft />} />
          </div>
          <div className="stats-grid">
            <StatCard label="Avg Latency" value={`${data.summary.averageLatencyMs} ms`} icon={<Activity />} />
            <StatCard label="Critical Errors" value={data.summary.criticalErrorCount} hint="Unresolved" icon={<AlertTriangle />} />
            <StatCard label="Data Freshness Risks" value={data.summary.dataFreshnessRisks} hint="Stale data objects" icon={<Boxes />} />
            <StatCard label="Last Successful Sync" value={fmtRel(data.summary.lastSuccessfulSyncAt)} icon={<RefreshCw />} />
            <StatCard label="Connected Systems" value={`${data.summary.connectedCount}/${data.summary.totalSystems}`} icon={<Network />} />
            <StatCard label="Adapters" value={data.systems.length} hint="Replaceable connectors" icon={<Link2 />} />
          </div>

          <SectionCard title="AI Recommended Actions">
            {data.recommendedActions.length === 0 ? (
              <EmptyState title="All clear" description="No integration risks need attention right now." />
            ) : (
              <div className="card-list">
                {data.recommendedActions.map((action, index) => (
                  <article key={index}>
                    <b>{action.system} <RiskBadge level={action.severity} /></b>
                    <span>{action.riskSummary}</span>
                    <span className="action-line">{action.recommendedAction}</span>
                  </article>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Connected Systems" action={<button type="button" onClick={() => setIntegrationRoute('integration-systems')}>View all</button>}>
            <div className="integration-grid">
              {data.systems.map((system) => <SystemCard key={system.id} system={system} />)}
            </div>
          </SectionCard>
        </>
      )}
    </>
  );
}

function SystemCard({ system }: { system: IntegrationSystem }) {
  return (
    <section className="integration-card">
      <div className="insight-head">
        <h3>{system.name}</h3>
        <StatusBadge status={system.status} />
      </div>
      <p>{system.vendorName ?? system.systemType}</p>
      <dl>
        <dt>Auth</dt><dd>{system.authenticationType}</dd>
        <dt>Exchange</dt><dd>{system.exchangeMethod}</dd>
        <dt>Direction</dt><dd>{system.dataDirection}</dd>
        <dt>Last sync</dt><dd>{fmtRel(system.lastSuccessfulSyncAt)}</dd>
        <dt>Success</dt><dd>{system.health?.successRatePercent ?? system.successRatePercent}%</dd>
        <dt>Latency</dt><dd>{system.averageLatencyMs} ms</dd>
        <dt>Open errors</dt><dd>{system.openErrorCount ?? system.health?.openErrorCount ?? 0}</dd>
        <dt>Health</dt><dd>{system.health?.healthScore ?? '—'}</dd>
      </dl>
      <div className="action-line" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <RiskBadge level={system.health?.riskLevel ?? 'Low'} />
        <button type="button" onClick={() => openIntegrationSystem(system.id)}>Open 360</button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. Connected Systems  (route: integration-systems)
// ---------------------------------------------------------------------------
export function ConnectedSystems() {
  const [statusFilter, setStatusFilter] = useState('');
  const [data, loading] = usePromise(() => integrationApi.systems(statusFilter ? { status: statusFilter } : {}), [statusFilter]);

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Connected Systems" description="Every connected public-safety system, its adapter, exchange pattern, and live health." />
      <IntegrationSubnav active="integration-systems" />
      <div className="filter-bar">
        <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          <option>Connected</option><option>Degraded</option><option>Failed</option><option>Disabled</option><option>Pending Configuration</option>
        </select>
      </div>
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Systems (${data?.total ?? 0})`}>
          <DataTable
            columns={['System', 'Type', 'Status', 'Auth', 'Exchange', 'Direction', 'Success', 'Latency', 'Health', 'Errors', '']}
            rows={data?.items ?? []}
            renderRow={(system: IntegrationSystem) => (
              <>
                <td><b>{system.name}</b><br /><small>{system.vendorName}</small></td>
                <td>{system.systemType}</td>
                <td><StatusBadge status={system.status} /></td>
                <td>{system.authenticationType}</td>
                <td>{system.exchangeMethod}</td>
                <td>{system.dataDirection}</td>
                <td>{system.health?.successRatePercent ?? system.successRatePercent}%</td>
                <td>{system.averageLatencyMs} ms</td>
                <td>{system.health?.healthScore ?? '—'} <RiskBadge level={system.health?.riskLevel ?? 'Low'} /></td>
                <td>{system.openErrorCount ?? 0}</td>
                <td><button type="button" onClick={() => openIntegrationSystem(system.id)}>Open 360</button></td>
              </>
            )}
          />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 3. System 360 Detail  (route: integration-system)
// ---------------------------------------------------------------------------
export function IntegrationSystem360() {
  const selectedId = localStorage.getItem('missionos.integration.selectedId') ?? '';
  const [data, loading, reload] = usePromise<any>(() => selectedId ? integrationApi.system360(selectedId) : Promise.resolve(null), [selectedId]);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState<string | null>(null);

  if (!selectedId) {
    return (
      <>
        <PageHeader eyebrow="Public Safety Integration Hub" title="System 360" description="Select a system from Connected Systems to open its 360 view." />
        <IntegrationSubnav active="integration-systems" />
        <EmptyState title="No system selected" description="Open a system from the Connected Systems list." action={<button type="button" onClick={() => setIntegrationRoute('integration-systems')}>Browse systems</button>} />
      </>
    );
  }
  if (loading && !data) return <><IntegrationSubnav active="integration-systems" /><LoadingState /></>;
  if (!data) return <EmptyState title="System not found" description="This integration system could not be loaded." />;

  const { system, health, connectionProfile, dataObjects, endpoints, fieldMappings, recentLogs, openErrors, performance, aiInsight, adapterInfo } = data;

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    setBusy(label);
    try { await action(); reload(); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader eyebrow={`${system.systemType} · ${system.adapterName}`} title={`${system.name} — System 360`} description={system.description ?? ''} />
      <IntegrationSubnav active="integration-systems" />

      <div className="advisor-hero">
        <ScoreRing score={health.healthScore} />
        <div>
          <h2>{system.name} <StatusBadge status={system.status} /></h2>
          <p>{system.vendorName} · {system.environment} · {system.isCritical ? 'Critical system' : 'Standard system'} · Last sync {fmtRel(system.lastSuccessfulSyncAt)}</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" disabled={busy !== null} onClick={() => runAction('test', () => integrationApi.test(system.id))}>{busy === 'test' ? 'Testing…' : 'Test Connection'}</button>
          <button type="button" disabled={busy !== null} onClick={() => runAction('sync', () => integrationApi.sync(system.id))}>{busy === 'sync' ? 'Syncing…' : 'Sync Now'}</button>
          <button type="button" disabled={busy !== null} onClick={() => runAction('validate', () => integrationApi.validateMappings(system.id))}>Validate Mappings</button>
        </div>
      </div>

      <Tabs
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'objects', label: 'Data Objects' },
          { id: 'endpoints', label: 'Endpoints' },
          { id: 'mappings', label: 'Field Mappings' },
          { id: 'logs', label: 'Recent Logs' },
          { id: 'errors', label: `Open Errors (${openErrors.length})` },
          { id: 'performance', label: 'Performance' },
        ]}
        activeId={tab}
        onChange={setTab}
      />
      <div style={{ height: 16 }} />

      {tab === 'overview' && (
        <div className="two-col">
          <SectionCard title="Connection Profile">
            <dl className="integration-card" style={{ border: 0, boxShadow: 'none', padding: 0 }}>
              <ProfileRow label="Base URL" value={connectionProfile.baseUrl ?? '—'} />
              <ProfileRow label="Auth Type" value={connectionProfile.authenticationType} />
              <ProfileRow label="Exchange" value={connectionProfile.exchangeMethod} />
              <ProfileRow label="Direction" value={connectionProfile.dataDirection} />
              <ProfileRow label="Owner Team" value={connectionProfile.ownerTeam} />
              <ProfileRow label="Rate Limit" value={`${connectionProfile.rateLimitPerMinute ?? '—'} / min`} />
              <ProfileRow label="Environment" value={connectionProfile.environment} />
            </dl>
          </SectionCard>
          <SectionCard title="AI Integration Insight">
            <p style={{ marginTop: 0 }}>{aiInsight.riskSummary}</p>
            <div className="action-line">{aiInsight.recommendedAction}</div>
            <div className="chips" style={{ marginTop: 14 }}>
              {Object.entries(health.components).map(([key, value]) => (
                <span key={key}>{key.replace('Score', '')}: {String(value)}</span>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 10 }}>Adapter: {system.adapterName} · {adapterInfo.notes}</p>
          </SectionCard>
        </div>
      )}

      {tab === 'objects' && (
        <SectionCard title="Data Objects">
          <DataTable columns={['Object', 'Direction', 'Frequency', 'Records (last)', 'Last Synced', 'Status']} rows={dataObjects}
            renderRow={(object: any) => (
              <><td><b>{object.objectName}</b></td><td>{object.direction}</td><td>{object.syncFrequency}</td><td>{Number(object.recordCountLastSync).toLocaleString()}</td><td>{fmtRel(object.lastSyncedAt)}</td><td><StatusBadge status={object.status} /></td></>
            )} />
        </SectionCard>
      )}

      {tab === 'endpoints' && (
        <SectionCard title="Endpoints">
          <DataTable columns={['Method', 'Path', 'Description', 'Auth', 'Rate Limit']} rows={endpoints}
            renderRow={(endpoint: any) => (
              <><td><b>{endpoint.method}</b></td><td><code>{endpoint.path}</code></td><td>{endpoint.description}</td><td>{endpoint.authRequired ? 'Required' : 'Public'}</td><td>{endpoint.rateLimit ?? '—'}/min</td></>
            )} />
        </SectionCard>
      )}

      {tab === 'mappings' && (
        <SectionCard title="Field Mappings">
          <DataTable columns={['Source', 'Target', 'Type', 'Required', 'Transformation', 'Validation', 'Status']} rows={fieldMappings}
            renderRow={(mapping: any) => (
              <>
                <td><code>{mapping.sourceObject}.{mapping.sourceField}</code></td>
                <td><code>{mapping.targetObject}.{mapping.targetField}</code></td>
                <td>{mapping.dataType}</td>
                <td>{mapping.required ? 'Yes' : 'No'}</td>
                <td>{mapping.transformationRule ?? '—'}</td>
                <td>{mapping.validationRule ?? '—'}</td>
                <td><StatusBadge status={mapping.status} /></td>
              </>
            )} />
        </SectionCard>
      )}

      {tab === 'logs' && (
        <SectionCard title="Recent Sync Logs">
          <DataTable columns={['Event', 'Status', 'Processed', 'Failed', 'Latency', 'Started', 'Error']} rows={recentLogs}
            renderRow={(log: any) => (
              <><td>{log.eventType}</td><td><StatusBadge status={log.status} /></td><td>{log.recordsProcessed}</td><td>{log.recordsFailed}</td><td>{log.latencyMs} ms</td><td>{fmtRel(log.startedAt)}</td><td><small>{log.errorMessage ?? '—'}</small></td></>
            )} />
        </SectionCard>
      )}

      {tab === 'errors' && (
        <SectionCard title="Open Errors">
          {openErrors.length === 0 ? <EmptyState title="No open errors" description="This system has no open integration errors." /> : (
            <DataTable columns={['Severity', 'Title', 'Affected', 'Retryable', 'Retries', 'Actions']} rows={openErrors}
              renderRow={(error: any) => (
                <>
                  <td><RiskBadge level={error.severity} /></td>
                  <td><b>{error.title}</b><br /><small>{error.recommendedFix}</small></td>
                  <td>{error.affectedObject}</td>
                  <td>{error.retryable ? 'Yes' : 'No'}</td>
                  <td>{error.retryCount}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button type="button" disabled={busy !== null} onClick={() => runAction('retry', () => integrationApi.retryError(error.id))}>Retry</button>
                    <button type="button" disabled={busy !== null} onClick={() => runAction('resolve', () => integrationApi.resolveError(error.id))}>Resolve</button>
                  </td>
                </>
              )} />
          )}
        </SectionCard>
      )}

      {tab === 'performance' && (
        <div className="two-col">
          <SectionCard title="Success Rate Trend">
            <Sparkbars points={performance.successTrend} suffix="%" />
          </SectionCard>
          <SectionCard title="Latency Trend">
            <Sparkbars points={performance.latencyTrend} suffix=" ms" />
          </SectionCard>
          <SectionCard title="Records Exchanged"><p className="big-metric">{Number(performance.recordsExchanged).toLocaleString()}</p></SectionCard>
          <SectionCard title="Failed Sync Count"><p className="big-metric">{performance.failedSyncCount}</p></SectionCard>
        </div>
      )}
    </>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
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
// 4. Data Flow Monitor  (route: integration-flow)
// ---------------------------------------------------------------------------
export function DataFlowMonitor() {
  const [data, loading] = usePromise(() => integrationApi.dataFlow());
  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Data Flow Monitor" description="Live operational view of the data moving between MissionOS and connected public-safety systems." />
      <IntegrationSubnav active="integration-flow" />
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Data Flows (${data?.flows.length ?? 0})`}>
          <DataTable columns={['Source', 'Target', 'Direction', 'Method', 'Frequency', 'Last Run', 'Status', 'Records', 'Latency', 'Risk']} rows={data?.flows ?? []}
            renderRow={(flow: any) => (
              <>
                <td><b>{flow.source}</b></td>
                <td>{flow.target}</td>
                <td>{flow.direction}</td>
                <td>{flow.method}</td>
                <td>{flow.frequency}</td>
                <td>{fmtRel(flow.lastRun)}</td>
                <td><StatusBadge status={flow.status} /></td>
                <td>{Number(flow.recordCount).toLocaleString()}</td>
                <td>{flow.latencyMs} ms</td>
                <td><RiskBadge level={flow.risk} /></td>
              </>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 5. Field Mapping Studio  (route: integration-mappings)
// ---------------------------------------------------------------------------
export function FieldMappingStudio() {
  const [systems] = usePromise(() => integrationApi.systems());
  const [systemId, setSystemId] = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const effectiveId = systemId || systems?.items?.[0]?.id || '';
  const [mappings, loading, reload] = usePromise(() => effectiveId ? integrationApi.fieldMappings(effectiveId) : Promise.resolve([]), [effectiveId]);

  const validate = async () => {
    setBusy(true);
    try { setValidation(await integrationApi.validateMappings(effectiveId)); reload(); } finally { setBusy(false); }
  };

  const requiredMissing = (mappings ?? []).filter((mapping: any) => mapping.required && (!mapping.targetField || mapping.status === 'Error'));

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Field Mapping Studio" description="Map external system fields to MissionOS objects, validate required fields, and catch transformation gaps before they break a sync." />
      <IntegrationSubnav active="integration-mappings" />
      <div className="filter-bar">
        <select aria-label="Select system" value={effectiveId} onChange={(event) => { setSystemId(event.target.value); setValidation(null); }}>
          {(systems?.items ?? []).map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
        </select>
        <button type="button" disabled={busy || !effectiveId} onClick={validate}>{busy ? 'Validating…' : 'Validate Mappings'}</button>
      </div>

      {validation && (
        <SectionCard title="Validation Result">
          <div className="stats-grid">
            <StatCard label="Total Mappings" value={validation.total} />
            <StatCard label="Valid" value={validation.valid} />
            <StatCard label="Required Fields" value={validation.requiredCount} />
            <StatCard label="Issues" value={validation.issues.length} />
          </div>
          {validation.issues.length > 0 && (
            <DataTable columns={['Field', 'Target', 'Issue', 'Severity']} rows={validation.issues}
              renderRow={(issue: any) => (<><td><code>{issue.field}</code></td><td><code>{issue.target}</code></td><td>{issue.issue}</td><td><RiskBadge level={issue.severity} /></td></>)} />
          )}
        </SectionCard>
      )}

      {requiredMissing.length > 0 && (
        <SectionCard title={`Required Fields Needing Attention (${requiredMissing.length})`}>
          <div className="chips">{requiredMissing.map((mapping: any) => <span key={mapping.id}>{mapping.sourceObject}.{mapping.sourceField}</span>)}</div>
        </SectionCard>
      )}

      {loading && !mappings ? <LoadingState /> : (
        <SectionCard title={`Field Mappings (${mappings?.length ?? 0})`}>
          <DataTable columns={['Source Object', 'Source Field', 'Target Object', 'Target Field', 'Type', 'Required', 'Transformation', 'Validation', 'Last Validated', 'Status']} rows={mappings ?? []}
            renderRow={(mapping: any) => (
              <>
                <td>{mapping.sourceObject}</td>
                <td><b>{mapping.sourceField}</b></td>
                <td>{mapping.targetObject}</td>
                <td><b>{mapping.targetField}</b></td>
                <td>{mapping.dataType}</td>
                <td>{mapping.required ? 'Required' : 'Optional'}</td>
                <td>{mapping.transformationRule ?? '—'}</td>
                <td>{mapping.validationRule ?? '—'}</td>
                <td><small>{fmtRel(mapping.lastValidatedAt)}</small></td>
                <td><StatusBadge status={mapping.status} /></td>
              </>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 6. Sync Logs  (route: integration-logs)
// ---------------------------------------------------------------------------
export function SyncLogs() {
  const [systems] = usePromise(() => integrationApi.systems());
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [data, loading, reload] = usePromise(() => integrationApi.logs(filters), [JSON.stringify(filters)]);

  const set = (key: string, value: string) => setFilters((current) => ({ ...current, [key]: value || undefined } as Record<string, string>));

  const retry = async (logId: string) => { setBusy(logId); try { await integrationApi.retryLog(logId); reload(); } finally { setBusy(null); } };

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Sync Logs" description="Every exchange event across connected systems with correlation IDs, record counts, latency, and failure detail." />
      <IntegrationSubnav active="integration-logs" />
      <div className="filter-bar">
        <select aria-label="Filter by system" onChange={(event) => set('integrationSystemId', event.target.value)}>
          <option value="">All systems</option>
          {(systems?.items ?? []).map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
        </select>
        <select aria-label="Filter by status" onChange={(event) => set('status', event.target.value)}>
          <option value="">All statuses</option><option>Success</option><option>Partial Success</option><option>Failed</option><option>Retried</option>
        </select>
        <select aria-label="Filter by direction" onChange={(event) => set('direction', event.target.value)}>
          <option value="">All directions</option><option>Inbound</option><option>Outbound</option>
        </select>
        <select aria-label="Filter by event type" onChange={(event) => set('eventType', event.target.value)}>
          <option value="">All events</option><option>sync</option><option>import</option><option>export</option><option>webhook</option><option>validation</option><option>retry</option>
        </select>
        <select aria-label="Filter errors only" onChange={(event) => set('errorOnly', event.target.value)}>
          <option value="">All records</option><option value="true">Errors only</option>
        </select>
      </div>
      {loading && !data ? <LoadingState /> : (
        <SectionCard title={`Sync Logs (${data?.total ?? 0})`}>
          <DataTable columns={['System', 'Event', 'Direction', 'Status', 'Proc', 'OK', 'Fail', 'Latency', 'Started', 'Correlation', '']} rows={data?.items ?? []}
            renderRow={(log: any) => (
              <>
                <td><b>{log.systemName}</b></td>
                <td>{log.eventType}</td>
                <td>{log.direction}</td>
                <td><StatusBadge status={log.status} /></td>
                <td>{log.recordsProcessed}</td>
                <td>{log.recordsSucceeded}</td>
                <td>{log.recordsFailed}</td>
                <td>{log.latencyMs} ms</td>
                <td><small>{fmtRel(log.startedAt)}</small></td>
                <td><small>{log.correlationId}</small></td>
                <td>{(log.status === 'Failed' || log.status === 'Partial Success') ? <button type="button" disabled={busy !== null} onClick={() => retry(log.id)}>Retry</button> : null}</td>
              </>
            )} />
        </SectionCard>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 7. Error & Retry Center  (route: integration-errors)
// ---------------------------------------------------------------------------
export function ErrorRetryCenter() {
  const [tab, setTab] = useState('errors');
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, loadingErrors, reloadErrors] = usePromise(() => integrationApi.errors({ openOnly: 'true' }), []);
  const [jobs, loadingJobs, reloadJobs] = usePromise(() => integrationApi.retryJobs(), []);

  const act = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key);
    try { await action(); reloadErrors(); reloadJobs(); } finally { setBusy(null); }
  };

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Error & Retry Center" description="Triage integration failures, schedule and run retries, and prove every exchange issue is being worked." />
      <IntegrationSubnav active="integration-errors" />
      <Tabs items={[{ id: 'errors', label: `Open Errors (${errors?.total ?? 0})` }, { id: 'jobs', label: `Retry Jobs (${jobs?.total ?? 0})` }]} activeId={tab} onChange={setTab} />
      <div style={{ height: 16 }} />
      {tab === 'errors' && (loadingErrors && !errors ? <LoadingState /> : (
        <SectionCard title="Open Integration Errors">
          {(errors?.items.length ?? 0) === 0 ? <EmptyState title="No open errors" description="All integration errors are resolved or dismissed." /> : (
            <DataTable columns={['Severity', 'System', 'Error', 'Affected', 'Retryable', 'Retries', 'First Seen', 'Status', 'Actions']} rows={errors?.items ?? []}
              renderRow={(error: any) => (
                <>
                  <td><RiskBadge level={error.severity} /></td>
                  <td><b>{error.systemName}</b></td>
                  <td><b>{error.title}</b><br /><small>{error.recommendedFix}</small></td>
                  <td>{error.affectedObject}</td>
                  <td>{error.retryable ? 'Yes' : 'No'}</td>
                  <td>{error.retryCount}</td>
                  <td><small>{fmtRel(error.firstSeenAt)}</small></td>
                  <td><StatusBadge status={error.status} /></td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {error.retryable && <button type="button" disabled={busy !== null} onClick={() => act(error.id, () => integrationApi.retryError(error.id))}>Retry</button>}
                    <button type="button" disabled={busy !== null} onClick={() => act(error.id, () => integrationApi.resolveError(error.id))}>Resolve</button>
                    <button type="button" disabled={busy !== null} onClick={() => act(error.id, () => integrationApi.dismissError(error.id))}>Dismiss</button>
                  </td>
                </>
              )} />
          )}
        </SectionCard>
      ))}
      {tab === 'jobs' && (loadingJobs && !jobs ? <LoadingState /> : (
        <SectionCard title="Retry Jobs">
          <DataTable columns={['System', 'Status', 'Scheduled', 'Attempted', 'Completed', 'Result']} rows={jobs?.items ?? []}
            renderRow={(job: any) => (
              <><td><b>{job.systemName}</b></td><td><StatusBadge status={job.retryStatus} /></td><td><small>{fmtRel(job.scheduledAt)}</small></td><td><small>{fmtRel(job.attemptedAt)}</small></td><td><small>{fmtRel(job.completedAt)}</small></td><td><small>{job.resultMessage ?? '—'}</small></td></>
            )} />
        </SectionCard>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// 8. API Documentation  (route: integration-docs)
// ---------------------------------------------------------------------------
export function ApiDocumentation() {
  const [systems] = usePromise(() => integrationApi.systems());
  const [systemId, setSystemId] = useState('');
  const effectiveId = systemId || systems?.items?.[0]?.id || '';
  const [docs, loading] = usePromise(() => effectiveId ? integrationApi.apiDocs(effectiveId) : Promise.resolve(null), [effectiveId]);

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="API Documentation" description="Public-safety integration endpoints with authentication, request/response examples, rate limits, and error codes." />
      <IntegrationSubnav active="integration-docs" />
      <div className="filter-bar">
        <select aria-label="Select system" value={effectiveId} onChange={(event) => setSystemId(event.target.value)}>
          {(systems?.items ?? []).map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
        </select>
      </div>
      {loading && !docs ? <LoadingState /> : docs && (
        <>
          <SectionCard title={`${docs.system.name} — Connection`}>
            <dl className="integration-card" style={{ border: 0, boxShadow: 'none', padding: 0 }}>
              <ProfileRow label="Base URL" value={docs.system.baseUrl ?? '—'} />
              <ProfileRow label="Authentication" value={docs.system.authenticationType} />
            </dl>
          </SectionCard>
          {docs.endpoints.map((endpoint: any) => (
            <SectionCard key={endpoint.id} title={`${endpoint.method} ${endpoint.path}`}>
              <p style={{ marginTop: 0 }}>{endpoint.description}</p>
              <div className="chips">
                <span>Auth: {endpoint.authRequired ? 'Required' : 'Public'}</span>
                <span>Rate limit: {endpoint.rateLimit ?? '—'}/min</span>
                {(endpoint.errorCodes ?? []).map((code: string) => <span key={code}>{code}</span>)}
              </div>
              <div className="two-col">
                <div>
                  <b>Request</b>
                  <pre>{endpoint.requestExampleJson ? JSON.stringify(endpoint.requestExampleJson, null, 2) : '— no request body —'}</pre>
                </div>
                <div>
                  <b>Response</b>
                  <pre>{endpoint.responseExampleJson ? JSON.stringify(endpoint.responseExampleJson, null, 2) : '—'}</pre>
                </div>
              </div>
            </SectionCard>
          ))}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 9. Credentials & Webhooks  (route: integration-credentials)
// ---------------------------------------------------------------------------
export function CredentialsWebhooks() {
  const [systems] = usePromise(() => integrationApi.systems());
  const [systemId, setSystemId] = useState('');
  const effectiveId = systemId || systems?.items?.[0]?.id || '';
  const [busy, setBusy] = useState<string | null>(null);
  const [credentials, loadingCred, reloadCred] = usePromise(() => effectiveId ? integrationApi.credentials(effectiveId) : Promise.resolve([]), [effectiveId]);
  const [webhooks, loadingHook, reloadHook] = usePromise(() => effectiveId ? integrationApi.webhooks(effectiveId) : Promise.resolve([]), [effectiveId]);

  const rotate = async (credentialId: string) => { setBusy(credentialId); try { await integrationApi.rotateCredential(effectiveId, credentialId); reloadCred(); } finally { setBusy(null); } };
  const testHook = async (webhookId: string) => { setBusy(webhookId); try { await integrationApi.testWebhook(effectiveId, webhookId); reloadHook(); } finally { setBusy(null); } };

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Credentials & Webhooks" description="API keys, OAuth/OIDC credentials, and webhook subscriptions. Secrets are never stored in plain text — masked placeholders only." />
      <IntegrationSubnav active="integration-credentials" />
      <div className="filter-bar">
        <select aria-label="Select system" value={effectiveId} onChange={(event) => setSystemId(event.target.value)}>
          {(systems?.items ?? []).map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
        </select>
      </div>
      <SectionCard title="Credentials">
        {loadingCred && !credentials ? <LoadingState /> : (
          <DataTable columns={['Credential', 'Auth Type', 'Masked Identifier', 'Status', 'Expires', 'Last Rotated', '']} rows={credentials ?? []}
            renderRow={(credential: any) => (
              <>
                <td><b>{credential.credentialName}</b></td>
                <td>{credential.authType}</td>
                <td><code>{credential.maskedIdentifier}</code></td>
                <td><StatusBadge status={credential.status} /></td>
                <td><small>{fmtDate(credential.expiresAt)}</small></td>
                <td><small>{fmtRel(credential.lastRotatedAt)}</small></td>
                <td><button type="button" disabled={busy !== null} onClick={() => rotate(credential.id)}>Rotate</button></td>
              </>
            )} />
        )}
      </SectionCard>
      <SectionCard title={<span><Webhook size={16} /> Webhook Subscriptions</span> as any}>
        {loadingHook && !webhooks ? <LoadingState /> : (
          <DataTable columns={['Name', 'Event Type', 'Target URL', 'Secret', 'Status', 'Last Triggered', '']} rows={webhooks ?? []}
            renderRow={(webhook: any) => (
              <>
                <td><b>{webhook.name}</b></td>
                <td><code>{webhook.eventType}</code></td>
                <td><small>{webhook.targetUrl}</small></td>
                <td>{webhook.secretConfigured ? 'Configured' : 'Missing'}</td>
                <td><StatusBadge status={webhook.status} /></td>
                <td><small>{fmtRel(webhook.lastTriggeredAt)}</small></td>
                <td><button type="button" disabled={busy !== null} onClick={() => testHook(webhook.id)}>Test</button></td>
              </>
            )} />
        )}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// 10. Integration Performance  (route: integration-performance)
// ---------------------------------------------------------------------------
export function IntegrationPerformance() {
  const [data, loading] = usePromise(() => integrationApi.performance());
  const rows = data?.systems ?? [];
  const avgSuccess = useMemo(() => rows.length ? Math.round(rows.reduce((total: number, system: any) => total + system.successRatePercent, 0) / rows.length) : 0, [rows]);

  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Integration Performance" description="Success rate, latency, uptime, records exchanged, and health score by system with trend indicators." />
      <IntegrationSubnav active="integration-performance" />
      {loading && !data ? <LoadingState /> : (
        <>
          <div className="stats-grid">
            <StatCard label="Avg Success Rate" value={`${avgSuccess}%`} />
            <StatCard label="Systems Monitored" value={rows.length} />
            <StatCard label="Records Exchanged" value={rows.reduce((total: number, system: any) => total + system.recordsExchanged, 0).toLocaleString()} />
            <StatCard label="Failed Syncs" value={rows.reduce((total: number, system: any) => total + system.failedSyncCount, 0)} />
            <StatCard label="Avg Latency" value={`${rows.length ? Math.round(rows.reduce((total: number, system: any) => total + system.averageLatencyMs, 0) / rows.length) : 0} ms`} />
            <StatCard label="Avg Uptime" value={`${rows.length ? (rows.reduce((total: number, system: any) => total + system.uptimePercent, 0) / rows.length).toFixed(1) : 0}%`} />
          </div>
          <SectionCard title="Performance by System">
            <DataTable columns={['System', 'Status', 'Success', 'Latency', 'Failed Syncs', 'Records', 'Uptime', 'Health', 'Risk']} rows={rows}
              renderRow={(system: any) => (
                <>
                  <td><b>{system.name}</b></td>
                  <td><StatusBadge status={system.status} /></td>
                  <td>{system.successRatePercent}%</td>
                  <td>{system.averageLatencyMs} ms</td>
                  <td>{system.failedSyncCount}</td>
                  <td>{Number(system.recordsExchanged).toLocaleString()}</td>
                  <td>{system.uptimePercent}%</td>
                  <td>{system.healthScore}</td>
                  <td><RiskBadge level={system.riskLevel} /></td>
                </>
              )} />
          </SectionCard>
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// 11. Adapter Registry  (route: integration-adapters)
// ---------------------------------------------------------------------------
export function AdapterRegistry() {
  const [adapters, loading] = usePromise(() => integrationApi.adapters());
  return (
    <>
      <PageHeader eyebrow="Public Safety Integration Hub" title="Adapter Registry" description="Replaceable integration adapter architecture. Mock connectors implement the same interface as future real connectors — swap one in to go live." />
      <IntegrationSubnav active="integration-adapters" />
      {loading && !adapters ? <LoadingState /> : (
        <div className="integration-grid">
          {(adapters ?? []).map((adapter: any) => (
            <section className="integration-card" key={adapter.systemType}>
              <div className="insight-head">
                <h3>{adapter.adapterName}</h3>
                <span className="badge warning">{adapter.mode}</span>
              </div>
              <p>{adapter.systemType} · extends {adapter.baseAdapter}</p>
              <dl>
                <dt>System</dt><dd>{adapter.systemName}</dd>
                <dt>Status</dt><dd><StatusBadge status={adapter.status} /></dd>
                <dt>Last test</dt><dd>{fmtRel(adapter.lastTestedAt)}</dd>
              </dl>
              <div className="chips" style={{ marginTop: 12 }}>
                {adapter.supportedOperations.map((operation: string) => <span key={operation}>{operation}</span>)}
              </div>
              <div className="action-line" style={{ marginTop: 12 }}>{adapter.replaceableNote}</div>
              {adapter.systemId && (
                <div style={{ marginTop: 12 }}>
                  <button type="button" onClick={() => openIntegrationSystem(adapter.systemId)}>Open System 360</button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
