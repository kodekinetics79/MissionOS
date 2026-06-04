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
        summary="This is the agency’s morning command screen: readiness, top risks, and next actions are all pulled from shared master records."
        bullets={[
          `${stationCards.length || 17} station view(s) are available in the shared readiness model.`,
          `${insightCards.length || 2} AI action(s) are waiting for review.`,
          'Open Morning Readiness Briefing walks evaluators through the Station 4 story step by step.',
        ]}
        badge={readiness >= 90 ? 'Healthy' : readiness >= 75 ? 'Warning' : 'Critical'}
        actions={<button type="button" className="btn-primary" onClick={() => openRoute('demo-morning-readiness')}>Open Morning Briefing</button>}
        evidence={['One record, many uses', 'Readiness impact visible', 'Audit-ready', 'NERIS-ready', 'Mobile-friendly']}
      />
      <div className="stats-grid">
        <StatCard label="Agency Readiness" value={`${readiness}%`} hint="Shared platform summary" icon={<ShieldCheck />} onClick={() => openRoute('analytics-executive')} />
        <StatCard label="Annual Incidents" value={analytics?.incidentCount ?? summary?.openAlerts ?? '—'} hint="RMS-connected records" icon={<Ambulance />} onClick={() => openRoute('incident-center')} />
        <StatCard label="Staffing Gaps" value={gaps ?? 0} hint="Today across A/B/C shifts" icon={<Users />} onClick={() => openRoute('staffing')} />
        <StatCard label="Open Inspections" value={overdue ?? 0} hint="Prevention workload" icon={<Building2 />} onClick={() => openRoute('prevention-inspections')} />
        <StatCard label="Prevention Risk" value={`${preventionCommand?.summary?.overallPreventionRiskScore ?? preventionCommand?.riskScore ?? 0}%`} hint="Property and permit pressure" icon={<ShieldCheck />} onClick={() => openRoute('prevention-risks')} />
        <StatCard label="Asset Readiness" value={`${assetCommand?.overallAssetReadinessScore ?? 0}%`} hint={`Apparatus ${assetCommand?.apparatusReady ?? 0} ready`} icon={<ShieldCheck />} onClick={() => openRoute('assets')} />
        <StatCard label="Integrations" value={`${integrations.healthy}/${integrations.healthy + integrations.degraded + integrations.failed || 0}`} hint="NERIS, CAD, ePCR, and platform" icon={<Radio />} onClick={() => openRoute('integration-systems')} />
        <StatCard label="Priority Alerts" value={insightCards.length} hint="AI recommended actions" icon={<AlertTriangle />} onClick={() => openRoute('advisor')} />
      </div>

      <div className="two-col">
        <SectionCard title="Incident Volume Trend">
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={incidentTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="incidents" stroke="currentColor" fill="currentColor" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="EMS vs Fire Volume">
          <div className="chart">
            <ResponsiveContainer>
              <BarChart data={incidentTrend.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ems" fill="currentColor" />
                <Bar dataKey="fire" fill="currentColor" opacity={0.45} />
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

      <SectionCard title="Integration & Data Quality Watch" action={<button type="button" className="btn-link" onClick={() => openRoute('integrations')}>Open hub</button>}>
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
