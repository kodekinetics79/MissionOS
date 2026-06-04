import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAnalyticsCommandCenter,
  getAnalyticsDashboard,
  getAnalyticsFilters,
  getAnalyticsWidgets,
  getAnalyticsReadiness,
  getAnalyticsSnapshots,
  getAnalyticsTrends,
  getDataQualityChecks,
  getDataQualityIssues,
  getDataQualitySummary,
  getDuplicateCandidates,
  getExecutiveSummary,
  getModuleAnalytics,
  getReportDefinitions,
  getReportExport,
  getReportExports,
  getReportSchedules,
  getSavedReports,
  getStationComparison,
  markDuplicateCandidate,
  dismissDuplicateCandidate,
  previewReport,
  runDataQualityChecks,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
  createReportSchedule,
  runReportSchedule,
  exportReport,
} from '../services/platformClient';
import type { DataQualityCheck, DataQualityIssue, DuplicateRecordCandidate, ReportDefinition, ReportExport, ReportSchedule, SavedReport } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ReadinessScore } from '../components/ReadinessScore';
import { EmptyState } from '../components/EmptyState';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { Tabs } from '../components/Tabs';

const routeKey = 'missionos.analytics.selectedReportId';

function navigate(route: string) {
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
}

function openStation(stationId: string) {
  localStorage.setItem('missionos.station.selectedId', stationId);
  navigate('station360');
}

function openSavedReport(reportId: string, route: string) {
  localStorage.setItem(routeKey, reportId);
  navigate(route);
}

function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    loader()
      .then((result) => {
        if (active) setData(result);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, deps);
  return data;
}

function SectionMetric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="mini-card">
      <span>{label}</span>
      <b>{value}</b>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function TrendChart({ data, dataKey = 'value' }: { data: Array<{ label?: string; month?: string; value?: number }>; dataKey?: string }) {
  return (
    <div className="chart">
      <ResponsiveContainer>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Area type="monotone" dataKey={dataKey} stroke="currentColor" fill="currentColor" fillOpacity={0.12} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusList({ items }: { items: Array<{ label: string; value: string | number; status?: string }> }) {
  return (
    <div className="stack">
      {items.map((item) => (
        <article key={item.label} className="mini-card">
          <div>
            <b>{item.label}</b>
            <span>{item.value}</span>
          </div>
          {item.status ? <StatusBadge status={item.status} /> : null}
        </article>
      ))}
    </div>
  );
}

export function Analytics() {
  const commandCenter = useResource(getAnalyticsCommandCenter, []);
  const dashboardSummary = useResource(getAnalyticsDashboard, []);
  const executive = useResource(getExecutiveSummary, []);
  const analyticsWidgets = useResource(getAnalyticsWidgets, []);
  const trends = useResource(getAnalyticsTrends, []);
  const readiness = useResource(getAnalyticsReadiness, []);
  const [analyticsTab, setAnalyticsTab] = useState('command');

  const stationRows = commandCenter?.summary?.stationRows ?? [];
  const readinessTrend = useMemo(() => stationRows.slice(0, 10).map((row: any) => ({ label: row.station.name, value: row.readinessScore })), [stationRows]);
  const severityData = useMemo(() => Object.entries(commandCenter?.summary?.violationSeverityDistribution ?? {}).map(([label, value]) => ({ name: label, value: Number(value) })), [commandCenter]);
  const integrationData = useMemo(() => Object.entries(commandCenter?.summary?.integrationHealth ?? {}).map(([label, value]) => ({ label, value: Number(value) })), [commandCenter]);
  const changeCards = executive?.trendStatus ?? [];

  return (
    <>
      <PageHeader
        eyebrow="District leadership analytics"
        title="Command Analytics & Data Warehouse"
        description="Cross-module dashboards, custom reporting, exports, data quality, and operational intelligence for agency leadership."
      />
      <Tabs
        items={[
          { id: 'command', label: 'Command Center' },
          { id: 'executive', label: 'Executive Summary' },
          { id: 'station', label: 'Station Comparison' },
          { id: 'builder', label: 'Report Builder' },
          { id: 'saved', label: 'Saved Reports' },
          { id: 'exports', label: 'Export Center' },
          { id: 'quality', label: 'Data Quality' },
          { id: 'duplicates', label: 'Duplicates' },
        ]}
        activeId={analyticsTab}
        onChange={(id) => {
          setAnalyticsTab(id);
          if (id === 'command') navigate('analytics-reports');
          if (id === 'executive') navigate('analytics-executive');
          if (id === 'station') navigate('analytics-station-comparison');
          if (id === 'builder') navigate('analytics-builder');
          if (id === 'saved') navigate('analytics-saved');
          if (id === 'exports') navigate('analytics-exports');
          if (id === 'quality') navigate('analytics-quality');
          if (id === 'duplicates') navigate('analytics-duplicates');
        }}
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="Analytics is the agency’s evidence layer: it turns shared operational data into readiness trends, station comparisons, data quality checks, duplicate detection, and exportable reports."
        bullets={[
          `District readiness is ${commandCenter?.summary?.agencyReadiness ?? dashboardSummary?.agencyReadiness ?? readiness?.agencyReadiness ?? 0}% and is summarized by station, module, and risk level.`,
          `${commandCenter?.summary?.dataQualityScore ?? 0}% data quality and ${commandCenter?.duplicates?.length ?? 0} duplicate candidate(s) keep leadership honest about data confidence.`,
          'Executive users can build, save, preview, and export reports from the same shared records used by operational modules.',
        ]}
        badge={executive?.overallRiskLevel ?? 'Watch'}
        actions={<button type="button" className="btn-primary" onClick={() => navigate('analytics-builder')}>Open report builder</button>}
        evidence={['Readiness trend', 'Station comparison', 'Data quality', 'Exports', 'AI evidence']}
      />

      <div className="stats-grid">
        <StatCard label="Agency Readiness" value={`${commandCenter?.summary?.agencyReadiness ?? dashboardSummary?.agencyReadiness ?? readiness?.agencyReadiness ?? 0}%`} hint="Readiness intelligence" onClick={() => navigate('analytics-executive')} />
        <StatCard label="Operational Risk" value={`${executive?.operationalRiskIndex ?? 0}%`} hint="Executive index" onClick={() => navigate('analytics-executive')} />
        <StatCard label="Training Compliance" value={`${commandCenter?.summary?.trainingCompliance ?? 0}%`} hint="LMS-connected" onClick={() => navigate('analytics-training')} />
        <StatCard label="Staffing Coverage" value={`${commandCenter?.summary?.staffingCoverage ?? 0}%`} hint="Coverage trend" onClick={() => navigate('analytics-staffing')} />
        <StatCard label="Asset Availability" value={`${commandCenter?.summary?.apparatusReadiness ?? 0}%`} hint="Logistics and maintenance" onClick={() => navigate('analytics-assets')} />
        <StatCard label="Data Quality" value={`${commandCenter?.summary?.dataQualityScore ?? 0}%`} hint="Warehouse health" onClick={() => navigate('analytics-quality')} />
        <StatCard label="Integration Uptime" value={`${executive?.integrationUptime ?? 0}%`} hint="Connected systems" onClick={() => navigate('analytics-integrations')} />
        <StatCard label="Dashboard Widgets" value={commandCenter?.widgets?.length ?? 0} hint="Command dashboard widgets" onClick={() => navigate('analytics-builder')} />
      </div>

      <div className="two-col">
        <SectionCard title="Station Readiness Distribution">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={readinessTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="currentColor" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="What changed this week?">
          <StatusList items={changeCards.map((item: any) => ({ label: item.label, value: item.direction, status: item.direction }))} />
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Operational Trend">
          <TrendChart data={trends?.incidentVolume ?? []} />
        </SectionCard>
        <SectionCard title="Integration Health">
          <div className="chart">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={integrationData} dataKey="value" nameKey="label" innerRadius={40} outerRadius={90}>
                  {integrationData.map((entry) => (
                    <Cell key={entry.label} fill="currentColor" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Top Operational Risks">
          <StatusList
            items={(commandCenter?.topRisks ?? executive?.topFiveRisks ?? []).map((risk: any) => ({
              label: risk.title,
              value: risk.summary ?? risk.description ?? 'Operational risk item',
              status: risk.severity ?? 'Warning',
            }))}
          />
        </SectionCard>
        <SectionCard title="AI Recommended Actions">
          <StatusList items={(commandCenter?.summary?.aiRecommendedActions ?? executive?.recommendedActions ?? []).map((action: string, index: number) => ({ label: `Action ${index + 1}`, value: action, status: index % 2 === 0 ? 'Warning' : 'Healthy' }))} />
        </SectionCard>
      </div>

      <SectionCard title="Command Widgets">
        <div className="card-grid">
          {(analyticsWidgets?.items ?? []).slice(0, 8).map((widget: any) => (
            <article key={widget.id} className="mini-card">
              <b>{widget.title}</b>
              <span>{widget.sourceModule}</span>
              <StatusBadge status={widget.isActive ? 'Healthy' : 'Warning'} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function ExecutiveSummaryDashboard() {
  const executive = useResource(getExecutiveSummary, []);
  const commandCenter = useResource(getAnalyticsCommandCenter, []);
  const trendCards = executive?.trendStatus ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Leadership summary"
        title="Executive Summary Dashboard"
        description="High-level KPIs, trend status, and recommended agency actions in one operational view."
      />
      <div className="stats-grid">
        <StatCard label="Overall Readiness" value={`${executive?.overallReadiness ?? 0}%`} hint="District-wide" />
        <StatCard label="Operational Risk Index" value={`${executive?.operationalRiskIndex ?? 0}%`} hint="Lower is better" />
        <StatCard label="Response Workload" value={executive?.responseWorkload ?? 0} hint="Current demand" />
        <StatCard label="Prevention Backlog" value={executive?.preventionBacklog ?? 0} hint="Permits, inspections, preplans" />
        <StatCard label="Data Quality Score" value={`${executive?.dataQualityScore ?? 0}%`} hint="Reporting integrity" />
        <StatCard label="Integration Uptime" value={`${executive?.integrationUptime ?? 0}%`} hint="Connected systems" />
      </div>
      <div className="two-col">
        <SectionCard title="What changed this week?">
          <StatusList items={trendCards.map((item: any) => ({ label: item.label, value: item.direction, status: item.direction }))} />
        </SectionCard>
        <SectionCard title="Top 5 Risks">
          <StatusList
            items={(executive?.topFiveRisks ?? []).map((risk: any) => ({
              label: risk.title,
              value: risk.summary ?? risk.description ?? 'Risk signal',
              status: risk.severity ?? 'Warning',
            }))}
          />
        </SectionCard>
      </div>
      <SectionCard title="Recommended Actions">
        <div className="stack">
          {(executive?.recommendedActions ?? commandCenter?.summary?.aiRecommendedActions ?? []).map((action: string, index: number) => (
            <article key={action + index} className="mini-card">
              <div>
                <b>Action {index + 1}</b>
                <span>{action}</span>
              </div>
              <StatusBadge status={index % 2 === 0 ? 'Warning' : 'Healthy'} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function StationComparison() {
  const stations = useResource(() => getStationComparison(1, 100, 'readinessScore'), []);

  return (
    <>
      <PageHeader
        eyebrow="Station benchmark"
        title="Station Comparison"
        description="Compare the 17 stations across readiness, incidents, staffing coverage, training compliance, apparatus, maintenance, inventory, inspections, preplans, and risk."
      />
      <SectionCard title="Comparison matrix">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Station</th>
                <th>Readiness</th>
                <th>Incidents</th>
                <th>Staffing</th>
                <th>Training</th>
                <th>Assets</th>
                <th>Prevention</th>
                <th>AI Risks</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(stations?.items ?? []).map((row: any) => (
                <tr key={row.station.id}>
                  <td>{row.station.name}</td>
                  <td><ReadinessScore score={row.readinessScore} label="" /></td>
                  <td>{row.incidentVolume}</td>
                  <td>{row.staffingCoverage}%</td>
                  <td>{row.trainingCompliance}%</td>
                  <td>{row.apparatusReadiness}%</td>
                  <td>{row.preplanCompleteness}%</td>
                  <td>{row.aiRiskCount}</td>
                  <td><button type="button" className="ghost-button" onClick={() => openStation(row.station.id)}>Open Station 360</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="two-col">
        <SectionCard title="Readiness comparison">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={(stations?.items ?? []).slice(0, 10).map((row: any) => ({ label: row.station.name, value: row.readinessScore }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="currentColor" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Risk badges">
          <div className="stack">
            {(stations?.items ?? []).slice(0, 8).map((row: any) => (
              <article key={row.station.id} className="mini-card">
                <div>
                  <b>{row.station.name}</b>
                  <span>{row.station.city} · {row.station.battalion ?? 'Unassigned'}</span>
                </div>
                <StatusBadge status={row.readinessScore >= 90 ? 'Healthy' : row.readinessScore >= 75 ? 'Warning' : 'Critical'} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function ReportBuilderCore() {
  const definitions = useResource(getReportDefinitions, []);
  const filters = useResource(getAnalyticsFilters, []);
  const [category, setCategory] = useState('Operations / Incidents');
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<string>('');
  const [selectedColumns, setSelectedColumns] = useState<string>('station,readinessScore,incidentCount');
  const [filterStation, setFilterStation] = useState('');
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    if (!selectedDefinitionId && definitions?.items?.length) {
      setSelectedDefinitionId(definitions.items[0].id);
      setCategory(definitions.items[0].category ?? definitions.items[0].module ?? 'Operations / Incidents');
    }
  }, [definitions, selectedDefinitionId]);

  const selectedDefinition = definitions?.items?.find((definition) => definition.id === selectedDefinitionId) ?? null;

  const runPreview = async () => {
    if (!selectedDefinition) return;
    const columns = selectedColumns.split(',').map((value) => value.trim()).filter(Boolean);
    const result = await previewReport({
      reportType: selectedDefinition.name,
      category: selectedDefinition.category ?? selectedDefinition.module,
      columns,
      filters: {
        stationId: filterStation || undefined,
      },
    });
    setPreview(result);
  };

  return (
    <SectionCard title="Custom Report Builder">
      <div className="builder-grid">
        <label>
          <span>Report category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {['Operations / Incidents', 'Staffing', 'Training', 'Personnel', 'Assets', 'Prevention', 'Integrations', 'Cross-module readiness'].map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Definition</span>
          <select value={selectedDefinitionId} onChange={(event) => setSelectedDefinitionId(event.target.value)}>
            {(definitions?.items ?? []).map((definition) => (
              <option key={definition.id} value={definition.id}>{definition.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Columns</span>
          <input value={selectedColumns} onChange={(event) => setSelectedColumns(event.target.value)} />
        </label>
        <label>
          <span>Station filter</span>
          <input value={filterStation} onChange={(event) => setFilterStation(event.target.value)} placeholder="station-1" />
        </label>
      </div>
      <div className="builder-actions">
        <button type="button" className="primary-button" onClick={runPreview}>Preview</button>
        <button type="button" onClick={() => createSavedReport({ name: selectedDefinition?.name ?? 'Custom Report', category, reportType: selectedDefinition?.name ?? 'Custom', filtersJson: { stationId: filterStation || undefined }, columnsJson: selectedColumns.split(',').map((value) => value.trim()).filter(Boolean) })}>Save Report</button>
        <button type="button" onClick={() => exportReport({ savedReportId: selectedDefinition?.id, exportFormat: 'CSV', rowCount: preview?.total ?? 0 })}>Export CSV</button>
        <button type="button" onClick={() => createReportSchedule({ savedReportId: selectedDefinition?.id, frequency: 'Weekly', recipients: ['user-admin'] })}>Schedule</button>
      </div>
      {preview ? (
        <div className="preview-panel">
          <div className="mini-note">Preview rows: {preview.total}</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {(preview.columns ?? []).map((column: string) => <th key={column}>{column}</th>)}
                </tr>
              </thead>
              <tbody>
                {(preview.rows ?? []).map((row: any, rowIndex: number) => (
                  <tr key={rowIndex}>
                    {(preview.columns ?? []).map((column: string) => <td key={column}>{String(row[column] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Preview a report" description="Choose a report definition, select fields, apply filters, and preview the result before saving or exporting." />
      )}
      <div className="mini-note">Available filters: {(filters?.riskLevels ?? []).join(' · ')}</div>
    </SectionCard>
  );
}

export function CustomReportBuilder() {
  return (
    <>
      <PageHeader
        eyebrow="Self-service reporting"
        title="Custom Report Builder"
        description="Build operational reports from shared platform data, preview rows, then save, schedule, or export."
      />
      <ReportBuilderCore />
    </>
  );
}

export function SavedReports() {
  const reports = useResource(getSavedReports, []);
  const [schedules, setSchedules] = useState<{ items: any[] } | null>(null);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  const loadSchedules = async () => {
    try {
      setSchedules(await getReportSchedules());
    } catch {
      setSchedules({ items: [] });
    }
  };
  useEffect(() => {
    loadSchedules();
  }, []);

  const runSchedule = async (id: string) => {
    setRunningScheduleId(id);
    try {
      const result: any = await runReportSchedule(id);
      setScheduleMessage(`Generated "${result?.reportName ?? 'scheduled report'}" now (${result?.exportRecord?.rowCount ?? 100} rows, ${result?.exportRecord?.exportFormat ?? 'CSV'}). Next run ${result?.nextRunAt ? new Date(result.nextRunAt).toLocaleString() : 'pending'}.`);
      await loadSchedules();
    } finally {
      setRunningScheduleId(null);
    }
  };

  const scheduleItems = schedules?.items ?? [];
  const fmt = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');
  return (
    <>
      <PageHeader
        eyebrow="Saved analytics"
        title="Saved Reports"
        description="Track agency report templates, visibility, schedules, and export-ready workflows."
      />
      <SectionCard title="Saved report library">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Visibility</th>
                <th>Last Run</th>
                <th>Schedule</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(reports?.items ?? []).map((report) => (
                <tr key={report.id}>
                  <td>{report.name}</td>
                  <td>{report.category}</td>
                  <td>{report.ownerUserId ?? '—'}</td>
                  <td>{report.visibility}</td>
                  <td>{report.lastRunAt ? new Date(report.lastRunAt).toLocaleString() : '—'}</td>
                  <td>{report.scheduleEnabled ? report.scheduleFrequency : 'Off'}</td>
                  <td>
                    <div className="inline-actions">
                      <button type="button" className="ghost-button" onClick={() => openSavedReport(report.id, 'analytics-preview')}>Open</button>
                      <button type="button" className="ghost-button" onClick={() => openSavedReport(report.id, 'analytics-preview')}>Preview</button>
                      <button type="button" className="ghost-button" onClick={() => exportReport({ savedReportId: report.id, exportFormat: 'CSV', rowCount: 100 })}>Export</button>
                      <button type="button" className="ghost-button" onClick={() => createReportSchedule({ savedReportId: report.id, frequency: 'Weekly', recipients: ['user-admin'] })}>Schedule</button>
                      <button type="button" className="ghost-button" onClick={() => updateSavedReport(report.id, { ...report, name: `${report.name} Copy` })}>Duplicate</button>
                      <button type="button" className="ghost-button" onClick={() => deleteSavedReport(report.id)}>Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <div className="stats-grid">
        <SectionMetric label="Scheduled Reports" value={scheduleItems.length} hint="Automated delivery" />
        <SectionMetric label="Active" value={scheduleItems.filter((s) => s.status === 'Active').length} hint="Running on schedule" />
        <SectionMetric label="Paused / Error" value={scheduleItems.filter((s) => s.status !== 'Active').length} hint="Need attention" />
        <SectionMetric label="Exports Logged" value={scheduleItems.reduce((sum, s) => sum + (s.exportHistoryCount ?? 0), 0)} hint="Across schedules" />
      </div>
      <SectionCard title="Scheduled Reports">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Recipients</th>
                <th>Frequency</th>
                <th>Delivery</th>
                <th>Last Generated</th>
                <th>Next Run</th>
                <th>History</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.map((schedule) => (
                <tr key={schedule.id}>
                  <td><b>{schedule.reportName ?? schedule.savedReportId}</b></td>
                  <td>{schedule.reportType ?? '—'}</td>
                  <td>{schedule.ownerUserId ?? '—'}</td>
                  <td>{(schedule.recipients ?? schedule.recipientsJson ?? []).join(', ') || '—'}</td>
                  <td>{schedule.frequency}</td>
                  <td>{schedule.deliveryMethod ?? 'Email'}</td>
                  <td>{fmt(schedule.lastGeneratedAt)}</td>
                  <td>{fmt(schedule.nextRunAt)}</td>
                  <td>{schedule.exportHistoryCount ?? 0}</td>
                  <td><StatusBadge status={schedule.status} /></td>
                  <td>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={runningScheduleId === schedule.id}
                      onClick={() => runSchedule(schedule.id)}
                    >
                      {runningScheduleId === schedule.id ? 'Generating…' : 'Generate now'}
                    </button>
                  </td>
                </tr>
              ))}
              {scheduleItems.length === 0 ? (
                <tr><td colSpan={11}><span className="mini-note">No scheduled reports configured yet. Use “Schedule” on a saved report to add one.</span></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {scheduleMessage ? <div className="mini-note">{scheduleMessage}</div> : null}
      </SectionCard>
      <SectionCard title="Export history">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Format</th>
                <th>Rows</th>
                <th>Requested</th>
                <th>Completed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.flatMap((schedule) =>
                (schedule.exportHistory ?? []).map((entry: any) => (
                  <tr key={`${schedule.id}-${entry.id}`}>
                    <td><b>{schedule.reportName ?? schedule.savedReportId}</b></td>
                    <td>{entry.exportFormat}</td>
                    <td>{entry.rowCount ?? '—'}</td>
                    <td>{fmt(entry.requestedAt)}</td>
                    <td>{fmt(entry.completedAt)}</td>
                    <td><StatusBadge status={entry.status} /></td>
                  </tr>
                )),
              )}
              {scheduleItems.every((s) => (s.exportHistory ?? []).length === 0) ? (
                <tr><td colSpan={6}><span className="mini-note">No export runs recorded yet. Use “Generate now” to produce one.</span></td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

export function ReportPreview() {
  const reports = useResource(getSavedReports, []);
  const [preview, setPreview] = useState<any>(null);
  const selectedReportId = localStorage.getItem(routeKey) ?? reports?.items?.[0]?.id ?? '';

  useEffect(() => {
    const report = reports?.items?.find((entry) => entry.id === selectedReportId) ?? reports?.items?.[0];
    if (!report) return;
    previewReport({ category: report.category, columns: report.columnsJson, filters: report.filtersJson, limit: 12 }).then(setPreview);
  }, [reports, selectedReportId]);

  return (
    <>
      <PageHeader
        eyebrow="Preview"
        title="Report Preview"
        description="Validate the first rows and field mapping before scheduling or exporting a report."
      />
      <SectionCard title="Selected report">
        <div className="mini-note">{selectedReportId || 'No report selected'}</div>
      </SectionCard>
      <SectionCard title="Preview rows">
        {preview ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>{preview.columns.map((column: string) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.map((row: any, index: number) => (
                  <tr key={index}>
                    {preview.columns.map((column: string) => <td key={column}>{String(row[column] ?? '—')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No preview data" description="Pick a saved report and preview the first rows." />
        )}
      </SectionCard>
    </>
  );
}

export function ReportExportCenter() {
  const exportsPage = useResource(getReportExports, []);
  const previewSnapshot = useResource(getAnalyticsSnapshots, []);
  return (
    <>
      <PageHeader
        eyebrow="Exports"
        title="Report Export Center"
        description="Track queued, processing, completed, and failed export requests."
      />
      <div className="stats-grid">
        <StatCard label="Queued" value={(exportsPage?.items ?? []).filter((item) => item.status === 'Queued').length} />
        <StatCard label="Processing" value={(exportsPage?.items ?? []).filter((item) => item.status === 'Processing').length} />
        <StatCard label="Completed" value={(exportsPage?.items ?? []).filter((item) => item.status === 'Completed').length} />
        <StatCard label="Failed" value={(exportsPage?.items ?? []).filter((item) => item.status === 'Failed').length} />
      </div>
      <SectionCard title="Export queue">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Format</th>
                <th>Status</th>
                <th>Requested By</th>
                <th>Requested</th>
                <th>Completed</th>
                <th>Rows</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {(exportsPage?.items ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.exportFormat}</td>
                  <td><StatusBadge status={entry.status} /></td>
                  <td>{entry.requestedByUserId ?? '—'}</td>
                  <td>{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : '—'}</td>
                  <td>{entry.completedAt ? new Date(entry.completedAt).toLocaleString() : '—'}</td>
                  <td>{entry.rowCount ?? 0}</td>
                  <td>{entry.fileUrl ?? 'Queued placeholder'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Recent snapshots">
        <div className="stack">
          {(previewSnapshot?.items ?? []).slice(0, 6).map((snapshot) => (
            <article key={snapshot.id} className="mini-card">
              <div>
                <b>{snapshot.module}</b>
                <span>{new Date(snapshot.snapshotDate).toLocaleDateString()} · {snapshot.riskLevel}</span>
              </div>
              <StatusBadge status={snapshot.riskLevel ?? 'Watch'} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function DataQualityCenter() {
  const summary = useResource(getDataQualitySummary, []);
  const checks = useResource(getDataQualityChecks, []);
  const issues = useResource(getDataQualityIssues, []);
  const [refreshing, setRefreshing] = useState(false);

  const runChecks = async () => {
    try {
      setRefreshing(true);
      await runDataQualityChecks();
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Data quality center"
        title="Data Quality Center"
        description="Monitor missing fields, duplicate candidates, overdue records, and sync health across all modules."
      />
      <div className="stats-grid">
        <StatCard label="Quality Score" value={`${summary?.overallScore ?? 0}%`} hint="Warehouse health" />
        <StatCard label="Critical Issues" value={(issues?.items ?? []).filter((item) => item.severity === 'Critical').length} />
        <StatCard label="Failed Checks" value={summary?.failedChecks ?? 0} />
        <StatCard label="Affected Records" value={summary?.affectedRecords ?? 0} />
      </div>
      <div className="builder-actions">
        <button type="button" className="primary-button" onClick={runChecks} disabled={refreshing}>{refreshing ? 'Running...' : 'Run Checks'}</button>
      </div>
      <div className="two-col">
        <SectionCard title="Checks">
          <div className="stack">
            {(checks?.items ?? []).map((check: DataQualityCheck) => (
              <article key={check.id} className="mini-card">
                <div>
                  <b>{check.title}</b>
                  <span>{check.module} · {check.affectedRecordCount} affected</span>
                </div>
                <StatusBadge status={check.severity} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Issues">
          <div className="stack">
            {(issues?.items ?? []).slice(0, 10).map((issue: DataQualityIssue) => (
              <article key={issue.id} className="mini-card">
                <div>
                  <b>{issue.title}</b>
                  <span>{issue.module} · {issue.entityName} · {issue.issueType}</span>
                </div>
                <StatusBadge status={issue.severity} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function DuplicateDetectionCenter() {
  const candidates = useResource(getDuplicateCandidates, []);
  const [selected, setSelected] = useState<DuplicateRecordCandidate | null>(null);

  useEffect(() => {
    if (!selected && candidates?.items?.length) setSelected(candidates.items[0]);
  }, [candidates, selected]);

  return (
    <>
      <PageHeader
        eyebrow="Duplicate review"
        title="Duplicate Detection Center"
        description="Review duplicate candidates for personnel, properties, assets, and incidents."
      />
      <div className="two-col">
        <SectionCard title="Candidate queue">
          <div className="stack">
            {(candidates?.items ?? []).map((candidate) => (
              <button key={candidate.id} type="button" className={`mini-card selectable ${selected?.id === candidate.id ? 'selected' : ''}`} onClick={() => setSelected(candidate)}>
                <div>
                  <b>{candidate.entityName} · {candidate.module}</b>
                  <span>Match score {candidate.matchScore} · {candidate.matchReason}</span>
                </div>
                <StatusBadge status={candidate.status} />
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Review">
          {selected ? (
            <div className="stack">
              <article className="mini-card">
                <b>Primary</b>
                <span>{selected.primaryEntityId}</span>
              </article>
              <article className="mini-card">
                <b>Possible duplicate</b>
                <span>{selected.duplicateEntityId}</span>
              </article>
              <article className="mini-card">
                <b>Reason</b>
                <span>{selected.matchReason}</span>
              </article>
              <div className="builder-actions">
                <button type="button" className="primary-button" onClick={async () => { await markDuplicateCandidate(selected.id); setSelected({ ...selected, status: 'Duplicate' }); }}>Mark Duplicate</button>
                <button type="button" onClick={async () => { await dismissDuplicateCandidate(selected.id); setSelected({ ...selected, status: 'Dismissed' }); }}>Dismiss</button>
              </div>
            </div>
          ) : <EmptyState title="Select a candidate" description="Choose a duplicate candidate to inspect the primary and duplicate records." />}
        </SectionCard>
      </div>
    </>
  );
}

function ModuleAnalyticsPage({ title, eyebrow, module, description }: { title: string; eyebrow: string; module: 'incidents' | 'training' | 'staffing' | 'personnel' | 'assets' | 'prevention' | 'integrations'; description: string }) {
  const data = useResource(() => getModuleAnalytics(module), [module]);
  const items = data?.trends ?? [];
  const kpis = data?.kpis ?? {};
  const insight = data?.insight ?? [];

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="stats-grid">
        {Object.entries(kpis).slice(0, 6).map(([label, value]) => (
          <StatCard key={label} label={label.replace(/([A-Z])/g, ' $1')} value={typeof value === 'number' ? value : String(value)} />
        ))}
      </div>
      <div className="two-col">
        <SectionCard title="Trend">
          <TrendChart data={items.map((item: any) => ({ label: item.label ?? item.month, value: item.value }))} />
        </SectionCard>
        <SectionCard title="Insights">
          <StatusList items={insight.map((entry: any) => ({ label: entry.title, value: entry.summary, status: entry.severity ?? 'Watch' }))} />
        </SectionCard>
      </div>
    </>
  );
}

export function IncidentAnalytics() {
  return <ModuleAnalyticsPage title="Incident Analytics" eyebrow="RMS intelligence" module="incidents" description="Incident trends, QA issues, NERIS readiness, and station volume." />;
}

export function TrainingAnalytics() {
  return <ModuleAnalyticsPage title="Training Analytics" eyebrow="Learning intelligence" module="training" description="Training compliance, expiring certifications, and completion trends." />;
}

export function StaffingAnalytics() {
  return <ModuleAnalyticsPage title="Staffing Analytics" eyebrow="Coverage intelligence" module="staffing" description="Coverage, overtime, and staffing gap trends across the agency." />;
}

export function PersonnelAnalytics() {
  return <ModuleAnalyticsPage title="Personnel Analytics" eyebrow="Master record intelligence" module="personnel" description="Readiness distribution, performance, and certification risk by staff member." />;
}

export function AssetAnalytics() {
  return <ModuleAnalyticsPage title="Asset Analytics" eyebrow="Logistics intelligence" module="assets" description="Apparatus readiness, maintenance backlog, and inventory risk trends." />;
}

export function PreventionAnalytics() {
  return <ModuleAnalyticsPage title="Prevention Analytics" eyebrow="Prevention intelligence" module="prevention" description="Inspection backlog, violations, permit cycle time, and preplan completeness." />;
}

export function IntegrationAnalytics() {
  return <ModuleAnalyticsPage title="Integration Analytics" eyebrow="Platform intelligence" module="integrations" description="Sync health, failures, latency, and records exchanged by integration." />;
}
