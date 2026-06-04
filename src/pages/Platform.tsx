import { useEffect, useState } from 'react';
import { AlertTriangle, Building2, HardHat, Radio, ShieldCheck, Users } from 'lucide-react';
import { getPlatformSummary, getStations, getNotifications, getAiInsights } from '../services/platformClient';
import type { DashboardSummary, Station, Notification, AiInsight } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ReadinessScore } from '../components/ReadinessScore';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

export function Platform() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getPlatformSummary(), getStations(), getNotifications(), getAiInsights()])
      .then(([platformSummary, stationResponse, notificationResponse, insightResponse]) => {
        setSummary(platformSummary);
        setStations(stationResponse.items);
        setNotifications(notificationResponse.items);
        setInsights(insightResponse.items);
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : 'Unable to load platform overview'));
  }, []);

  if (error) {
    return <ErrorState description={error} />;
  }

  if (!summary) {
    return <LoadingState label="Loading unified platform overview..." />;
  }

  const readinessColor = summary.readiness.agencyAverage >= 88 ? 'Healthy' : summary.readiness.agencyAverage >= 80 ? 'Warning' : 'Critical';

  return (
    <>
      <PageHeader
        eyebrow="Shared core platform"
        title="Platform Overview"
        description="MissionOS gives each agency tenant a single configurable operating picture across station readiness, personnel, assets, properties, integrations, alerts, and action-oriented intelligence."
      />

      <div className="stats-grid">
        <StatCard label="Agency Readiness" value={`${summary.readiness.agencyAverage}%`} hint={`${summary.readiness.criticalStations} stations below target`} icon={<ShieldCheck />} />
        <StatCard label="Stations" value={summary.stationCount} hint="17-station network" icon={<Building2 />} />
        <StatCard label="Personnel" value={summary.personnelCount} hint="Shared master roster" icon={<Users />} />
        <StatCard label="Apparatus" value={summary.apparatusCount} hint="Stations + battalion fleet" icon={<HardHat />} />
        <StatCard label="Notifications" value={summary.notificationCount} hint={`${summary.openAlerts} unread`} icon={<AlertTriangle />} />
        <StatCard label="Integrations" value={summary.integrationHealth.healthy} hint={`${summary.integrationHealth.degraded} degraded`} icon={<Radio />} />
      </div>

      <div className="two-col">
        <SectionCard title="Readiness Signals">
          <div className="stack">
            <div className="mini-card">
              <span>Open staffing gaps</span>
              <b>{summary.readiness.openStaffingGaps}</b>
            </div>
            <div className="mini-card">
              <span>Personnel readiness avg</span>
              <b>{summary.personnelReadiness?.average ?? '—'}%</b>
            </div>
            <div className="mini-card">
              <span>Personnel at risk</span>
              <b>{(summary.personnelReadiness?.atRisk ?? 0) + (summary.personnelReadiness?.critical ?? 0)}</b>
            </div>
            <div className="mini-card">
              <span>Expiring certifications</span>
              <b>{summary.readiness.expiringCertifications}</b>
            </div>
            <div className="mini-card">
              <span>Platform state</span>
              <StatusBadge status={readinessColor} />
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Current alerts">
          <div className="stack">
            {notifications.slice(0, 4).map((notification) => (
              <article className="mini-card" key={notification.id}>
                <div>
                  <b>{notification.title}</b>
                  <span>{notification.message}</span>
                </div>
                <StatusBadge status={notification.isRead ? 'Healthy' : 'Warning'} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Station readiness snapshot">
          <div className="station-grid">
            {stations.slice(0, 8).map((station) => (
              <article className="station-card" key={station.id}>
                <div>
                  <b>{station.name}</b>
                  <span>{station.battalion ?? station.city}</span>
                </div>
                <ReadinessScore score={station.readinessScore ?? station.readiness ?? 0} label="Readiness" />
                <StatusBadge status={station.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="AI insights">
          <div className="stack">
            {insights.slice(0, 3).map((insight) => (
              <article className="insight-card" key={insight.id}>
                <div className="insight-head">
                  <div>
                    <h3>{insight.title}</h3>
                    <p>{insight.summary}</p>
                  </div>
                  <StatusBadge status={insight.severity === 'Critical' ? 'Critical' : 'Warning'} />
                </div>
              </article>
            ))}
            {insights.length === 0 && <EmptyState title="No insights yet" description="The platform will surface combined operational signals here once the backend or demo data is available." />}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
