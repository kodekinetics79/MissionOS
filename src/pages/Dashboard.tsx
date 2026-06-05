import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ambulance, Building2, Radio, ShieldCheck, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAiInsights, getAnalyticsCommandCenter, getAnalyticsDashboard, getAssetCommandCenter, getIncidents, getPlatformSummary, getStations } from '../services/platformClient';
import { getPreventionCommandCenter } from '../services/preventionClient';
import { integrationApi } from '../services/integrationClient';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ReadinessScore } from '../components/ReadinessScore';
import { InsightCard } from '../components/InsightCard';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { approveItem, createNotification, escalateItem, getCommandCenterData, getDashboardMetrics, markComplete } from '../services/demoOperatingService';
import { useDemoState } from '../services/demoStateService';

export function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [stations, setStations] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [assetCommand, setAssetCommand] = useState<any>(null);
  const [preventionCommand, setPreventionCommand] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [analyticsCommand, setAnalyticsCommand] = useState<any>(null);
  const [integrationSystems, setIntegrationSystems] = useState<any[]>([]);
  const demoVersion = useDemoState((state: { version: number }) => state.version);
  const commandCenter = useMemo(() => getCommandCenterData(), [demoVersion]);
  const operatingMetrics = useMemo(() => getDashboardMetrics(), [demoVersion]);

  useEffect(() => {
    Promise.all([getPlatformSummary(), getAnalyticsDashboard(), getStations(), getAiInsights(), getAssetCommandCenter(), getPreventionCommandCenter()])
      .then(([platformSummary, analyticsSummary, stationPage, insightPage, assetSummary, preventionSummary]) => {
        setSummary(platformSummary);
        setAnalytics(analyticsSummary);
        setStations(stationPage.items);
        setInsights(insightPage.items);
        setAssetCommand(assetSummary);
        setPreventionCommand(preventionSummary);
      })
      .catch(() => undefined);
    getIncidents().then((page) => setIncidents(page.items)).catch(() => undefined);
    getAnalyticsCommandCenter().then(setAnalyticsCommand).catch(() => undefined);
    integrationApi.commandCenter().then((command) => setIntegrationSystems(command.systems ?? [])).catch(() => undefined);
  }, []);

  // Real monthly incident-volume trend from analytics command center.
  const incidentTrend = useMemo(() => {
    const volume = analyticsCommand?.trends?.incidentVolume ?? [];
    const byMonth = new Map<string, { month: string; incidents: number; ems: number; fire: number }>();
    for (const point of volume) {
      const key = String(point.label ?? point.month ?? '');
      byMonth.set(key, { month: key.slice(5) || key, incidents: Number(point.value ?? 0), ems: 0, fire: 0 });
    }
    // Derive EMS vs Fire split from real incident records by dispatch month.
    for (const incident of incidents) {
      const date = incident.dispatchAt ?? incident.createdAt;
      if (!date) continue;
      const key = String(date).slice(0, 7);
      const entry = byMonth.get(key) ?? { month: key.slice(5), incidents: 0, ems: 0, fire: 0 };
      const isEms = /ems|medical|patient|epcr|rescue/i.test(`${incident.recordType ?? ''} ${incident.incidentType ?? ''}`);
      if (isEms) entry.ems += 1; else entry.fire += 1;
      byMonth.set(key, entry);
    }
    return [...byMonth.values()].slice(-6);
  }, [analyticsCommand, incidents]);

  const readiness = summary?.readiness?.agencyAverage ?? analytics?.agencyReadiness ?? Math.round(stations.reduce((total, station) => total + Number(station.readinessScore ?? station.readiness ?? 0), 0) / Math.max(stations.length, 1)) ?? 0;
  const gaps = summary?.readiness?.openStaffingGaps ?? stations.filter((station) => String(station.staffingStatus ?? station.status ?? '').toUpperCase() !== 'COVERED' && String(station.status ?? '').toUpperCase() !== 'HEALTHY').length;
  const overdue = analytics?.overdueInspections ?? summary?.propertyCount ?? 0;
  const integrations = summary?.integrationHealth ?? { healthy: 0, degraded: 0, failed: 0 };

  const stationCards = useMemo(() => stations.slice(0, 8), [stations]);
  const insightCards = useMemo(() => insights.slice(0, 2), [insights]);
  const openRoute = (route: string) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));

  return (
    <>
      <PageHeader
        eyebrow="Executive command view"
        title="Command Dashboard"
        description="One agency-wide operating picture across incidents, stations, staffing, training, apparatus, inspections, integrations, and AI-prioritized risks."
      />
      <OperationalBriefing
        summary="This is the agency’s morning command screen: readiness, top risks, and next actions are all pulled from the shared demo record set."
        bullets={[
          `${operatingMetrics.nerisReadiness}% NERIS readiness is rolling through the RMS validation queue.`,
          `${operatingMetrics.staffingGaps} staffing gap(s) and ${operatingMetrics.overtimeRisk}% overtime risk are visible in the same command view.`,
          'The suite now shows prevention, interoperability, security, reporting, and continuity in one place.',
        ]}
        badge={operatingMetrics.nerisReadiness >= 90 ? 'Healthy' : operatingMetrics.nerisReadiness >= 80 ? 'Warning' : 'Critical'}
        actions={<button type="button" className="btn-primary" onClick={() => openRoute('demo-morning-readiness')}>Open Morning Briefing</button>}
        evidence={['NERIS-ready', 'ePCR-ready', 'Prevention-linked', 'Security-reviewed', 'Mobile-friendly']}
      />
      <div className="stats-grid">
        <StatCard label="NERIS readiness" value={`${operatingMetrics.nerisReadiness}%`} hint="Validated incidents ready" icon={<ShieldCheck />} onClick={() => openRoute('/rms-neris')} />
        <StatCard label="Staffing gaps" value={operatingMetrics.staffingGaps} hint="Coverage pressure" icon={<Users />} onClick={() => openRoute('staffing')} />
        <StatCard label="Training compliance" value={`${operatingMetrics.trainingCompliance}%`} hint="Current certifications" icon={<Ambulance />} onClick={() => openRoute('learning')} />
        <StatCard label="Asset readiness" value={`${operatingMetrics.assetReadiness}%`} hint="Equipment and apparatus" icon={<ShieldCheck />} onClick={() => openRoute('assets')} />
        <StatCard label="Inspection backlog" value={operatingMetrics.inspectionBacklog} hint="Overdue prevention work" icon={<Building2 />} onClick={() => openRoute('/prevention-inspections')} />
        <StatCard label="Permit queue" value={operatingMetrics.permitQueue} hint="Awaiting approval" icon={<Building2 />} onClick={() => openRoute('/permits')} />
        <StatCard label="High-risk occupancies" value={operatingMetrics.highRiskOccupancies} hint="Preplans and GIS linkage" icon={<AlertTriangle />} onClick={() => openRoute('/preplans')} />
        <StatCard label="Integration health" value={operatingMetrics.integrationHealth} hint="Connector posture" icon={<Radio />} onClick={() => openRoute('/integration-hub')} />
        <StatCard label="Security posture" value={operatingMetrics.securityPosture} hint="Trust center status" icon={<ShieldCheck />} onClick={() => openRoute('/security-compliance')} />
        <StatCard label="Overtime risk" value={`${operatingMetrics.overtimeRisk}%`} hint="Forecasted next period" icon={<AlertTriangle />} onClick={() => openRoute('workforce-performance')} />
      </div>

      <div className="two-col">
        <SectionCard title="Incident Volume Trend">
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={incidentTrend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="moAreaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0392a" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#e0392a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={34} />
                <Tooltip cursor={{ stroke: '#e0392a', strokeWidth: 1, strokeOpacity: 0.4 }} />
                <Area type="monotone" dataKey="incidents" stroke="#e0392a" strokeWidth={2.5} fill="url(#moAreaFill)" activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="EMS vs Fire Volume">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={incidentTrend.slice(0, 6)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
                <defs>
                  <linearGradient id="moBarEms" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" />
                    <stop offset="100%" stopColor="#e0392a" />
                  </linearGradient>
                  <linearGradient id="moBarFire" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={34} />
                <Tooltip cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                <Bar dataKey="ems" fill="url(#moBarEms)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="fire" fill="url(#moBarFire)" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Station Readiness Snapshot">
          <div className="station-grid">
            {stationCards.map((station) => (
              <article className="station-card" key={station.id}>
                <div>
                  <b>{station.name}</b>
                  <span>{station.city}</span>
                </div>
                <ReadinessScore score={Number(station.readinessScore ?? station.readiness ?? 0)} label="" />
                <StatusBadge status={station.status ?? station.staffingStatus ?? 'Warning'} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="AI Recommended Actions">
          <div className="stack">{insightCards.map((insight) => <InsightCard insight={insight} key={insight.id} />)}</div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Action Queue">
          <div className="stack">
            {commandCenter.tasks.slice(0, 8).map((task) => (
              <article key={task.id} className="mini-card">
                <div>
                  <b>{task.title}</b>
                  <span>{task.workflowType} · {task.owner} · Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</span>
                </div>
                <StatusBadge status={task.status} />
                <div className="inline-actions">
                  <button type="button" className="btn-link" onClick={() => approveItem(task.id, 'workflow')}>Approve</button>
                  <button type="button" className="btn-link" onClick={() => escalateItem(task.id, 'workflow')}>Escalate</button>
                  <button type="button" className="btn-link" onClick={() => markComplete(task.id, 'workflow')}>Complete</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Alerts & Notifications">
          <div className="stack">
            {commandCenter.alerts.slice(0, 8).map((alert) => (
              <article key={alert.id} className="mini-card">
                <div>
                  <b>{alert.title}</b>
                  <span>{alert.message}</span>
                </div>
                <StatusBadge status={alert.priority} />
                <div className="inline-actions">
                  <button type="button" className="btn-link" onClick={() => createNotification(`Reviewed ${alert.title}`, 'Alert reviewed from dashboard.', 'info')}>Review</button>
                  <button type="button" className="btn-link" onClick={() => openRoute(String(alert.relatedRoute ?? 'dashboard'))}>Open</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

        <SectionCard title="Integration & Data Quality Watch" action={<button type="button" className="btn-link" onClick={() => openRoute('/integration-hub')}>Open hub</button>}>
        <div className="integration-row">
          {(integrationSystems.length
            ? integrationSystems
            : [{ id: 'cad', name: 'CAD', status: 'Connected' }, { id: 'rms', name: 'RMS', status: 'Connected' }, { id: 'neris', name: 'NERIS', status: 'Connected' }, { id: 'lms', name: 'LMS', status: 'Connected' }]
          ).slice(0, 5).map((item: any) => (
            <div className="mini-card" key={item.id ?? item.name}>
              <b>{item.name}</b>
              <StatusBadge status={item.status} />
              <span>{item.lastSuccessfulSyncAt ? `synced ${new Date(item.lastSuccessfulSyncAt).toLocaleDateString()}` : item.exchangeMethod ?? 'Live'}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
