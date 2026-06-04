import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Brain, Building2, CheckCircle2, ClipboardCheck, ClipboardList, HardHat, ShieldCheck, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { ReadinessScore } from '../components/ReadinessScore';
import { getAnalyticsDashboard, getAssetCommandCenter, getAuditLogs, getNotifications, getPersonnel, getPlatformSummary, getStations, getSupportTickets, getAiInsights } from '../services/platformClient';
import { getPreventionCommandCenter } from '../services/preventionClient';
import { integrationApi, openIntegrationSystem, setIntegrationRoute } from '../services/integrationClient';
import { setAiRoute } from '../services/aiClient';
import { productCoverageChecklist, productCoverageSummary } from '../data/productReadiness';

const demoOpen = (route: string) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
const openStation = (stationId: string) => window.dispatchEvent(new CustomEvent('missionos:open-station-360', { detail: { stationId } }));
const openPersonnel = (personnelId: string) => window.dispatchEvent(new CustomEvent('missionos:open-personnel-360', { detail: { personnelId } }));

const proofPoints = [
  'API-based integration across modules',
  'Audit-ready activity logging',
  'RBAC and access review workflow',
  'Staffing shift-fill, trade, overtime, and audit trail workflows',
  'NERIS readiness and export preview',
  'HIPAA-aware access posture for ePCR-linked records',
  'Mobile/tablet-ready workflows and limited-connectivity placeholder patterns',
  'Evaluator-ready report scheduling and export history',
  'Data warehouse and report builder foundation',
  'One record, many uses across the platform',
];

function usePromise<T>(factory: () => Promise<T>, deps: any[] = []): [T | null, boolean] {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    factory().then((result) => { if (active) { setData(result); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return [data, loading];
}

export function MorningReadinessBriefing() {
  const [summary] = usePromise(() => getPlatformSummary(), []);
  const [stations] = usePromise(() => getStations(), []);
  const [personnel] = usePromise(() => getPersonnel(), []);
  const [analytics] = usePromise(() => getAnalyticsDashboard(), []);
  const [assets] = usePromise(() => getAssetCommandCenter(), []);
  const [prevention] = usePromise(() => getPreventionCommandCenter(), []);
  const [integration] = usePromise(() => integrationApi.commandCenter(), []);
  const [insights] = usePromise(() => getAiInsights(), []);
  const [notifications] = usePromise(() => getNotifications(), []);
  const [auditLogs] = usePromise(() => getAuditLogs(), []);

  const station4 = useMemo(() => stations?.items?.find((station) => station.id === 'station-4' || String(station.name).includes('Station 4')) ?? stations?.items?.[3] ?? null, [stations]);
  const station4Personnel = useMemo(() => personnel?.items?.find((entry) => entry.currentStationId === station4?.id) ?? personnel?.items?.[0] ?? null, [personnel, station4]);
  const station4Notification = useMemo(() => notifications?.items?.find((item) => String(item.message ?? item.title ?? '').includes('Station 4') || String(item.message ?? item.title ?? '').includes('Medic 4')) ?? notifications?.items?.[0] ?? null, [notifications]);
  const inspectionEvidence = prevention?.highPriorityInspections?.[0] ?? prevention?.overdueInspections?.[0] ?? prevention?.summary?.highPriorityNeed ?? null;
  const assetConcern = assets?.highRiskApparatus?.find((unit: any) => String(unit.unitNumber ?? unit.name ?? '').includes('Medic 4')) ?? assets?.highRiskApparatus?.[0] ?? null;
  const syncIssue = integration?.recommendedActions?.find((action) => String(action.system).includes('CAD') || String(action.system).includes('NERIS')) ?? integration?.recommendedActions?.[0] ?? null;

  const steps = [
    { title: 'Open Command Dashboard', detail: 'Start with agency readiness, top risks, and AI actions.', action: () => demoOpen('dashboard'), cta: 'Open dashboard' },
    { title: 'Review Station 4 risk', detail: 'See Medic 4 maintenance, expiring certs, inspection backlog, and sync delay.', action: () => openStation('station-4'), cta: 'Open Station 4' },
    { title: 'Open Personnel 360', detail: 'Inspect the affected firefighter, training gap, and staffing impact.', action: () => station4Personnel?.id && openPersonnel(station4Personnel.id), cta: 'Open personnel', disabled: !station4Personnel?.id },
    { title: 'Open Learning & Readiness', detail: 'Generate a targeted training need, trainer match, and coverage-aware assignment.', action: () => demoOpen('learning'), cta: 'Open learning' },
    { title: 'Open Asset & Logistics', detail: 'Review Medic 4 maintenance warning and readiness impact.', action: () => demoOpen('apparatus360'), cta: 'Open apparatus' },
    { title: 'Open Prevention', detail: 'Prioritize the overdue high-risk inspection and preplan status.', action: () => demoOpen('prevention-inspections'), cta: 'Open prevention' },
    { title: 'Open Integration Hub', detail: 'Review the CAD/RMS/NERIS sync issue and the evidence trail.', action: () => { setIntegrationRoute('integrations'); openIntegrationSystem('integration-cad'); }, cta: 'Open integrations' },
    { title: 'Open Analytics', detail: 'Show readiness trend, station comparison, data quality, and exportable reporting.', action: () => demoOpen('analytics'), cta: 'Open analytics' },
    { title: 'Return to AI Advisor', detail: 'Present the recommended actions and resolve workflow.', action: () => setAiRoute('advisor'), cta: 'Open AI advisor' },
    { title: 'Demo Readiness', detail: 'Show evaluators the platform’s scope coverage and proof points.', action: () => demoOpen('demo-readiness'), cta: 'Open evaluator view' },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Evaluator demo"
        title="Morning Readiness Briefing"
        description="A guided, executive-style demo that walks an agency leader through one unified risk story across command, workforce, operations, logistics, prevention, analytics, integration, AI, and trust."
      />

      <div className="stats-grid">
        <StatCard label="Agency Readiness" value={`${summary?.readiness?.agencyAverage ?? analytics?.agencyReadiness ?? 0}%`} hint="Unified operating picture" icon={<ShieldCheck />} onClick={() => demoOpen('dashboard')} />
        <StatCard label="Top Station Risk" value={station4?.name ?? 'Station 4'} hint="Featured demo storyline" icon={<HardHat />} onClick={() => openStation('station-4')} />
        <StatCard label="AI Actions" value={insights?.items?.length ?? 0} hint="Cross-module intelligence" icon={<Brain />} onClick={() => setAiRoute('advisor')} />
        <StatCard label="Open Alerts" value={summary?.openAlerts ?? notifications?.items?.filter((item) => !item.isRead).length ?? 0} hint="What leaders need to see" icon={<Sparkles />} onClick={() => demoOpen('notifications')} />
      </div>

      <OperationalBriefing
        eyebrow="What the evaluator should notice"
        summary="Station 4 is the anchor story: Medic 4 has a maintenance warning, paramedic certifications are expiring, a high-risk inspection is overdue, and CAD/RMS/NERIS sync quality is affecting the data trail."
        bullets={[
          'One station story connects personnel, apparatus, prevention, RMS, training, analytics, and AI.',
          'Each recommendation shows why it matters and what readiness improves if the issue is fixed.',
          'Every workflow action is tied to shared master records instead of page-local mock data.',
        ]}
        badge={(station4?.status ?? 'Watch') as string}
        actions={<button type="button" className="btn-primary" onClick={() => demoOpen('demo-readiness')}>Open evaluator view</button>}
        evidence={[
          station4?.name ?? 'Station 4',
          assetConcern?.unitNumber ?? 'Medic 4',
          inspectionEvidence?.title ?? 'Overdue inspection',
          syncIssue?.system ?? 'CAD / NERIS',
          station4Notification?.title ?? 'Live alert',
        ].filter(Boolean) as string[]}
      />

      <div className="two-col">
        <SectionCard title="Station 4 evidence chain">
          <div className="stack">
            <div className="mini-card"><span>Station</span><b>{station4?.name ?? 'Station 4'}</b></div>
            <div className="mini-card"><span>Apparatus</span><b>{assetConcern?.unitNumber ?? 'Medic 4'}</b></div>
            <div className="mini-card"><span>Personnel</span><b>{station4Personnel?.name ?? `${station4Personnel?.firstName ?? 'Crew'} ${station4Personnel?.lastName ?? ''}`}</b></div>
            <div className="mini-card"><span>Inspection</span><b>{inspectionEvidence?.title ?? 'High-risk inspection overdue'}</b></div>
            <div className="mini-card"><span>Integration</span><b>{syncIssue?.system ?? 'CAD / RMS / NERIS sync'}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Readiness trend and risk posture">
          <div className="stack">
            <ReadinessScore score={summary?.readiness?.agencyAverage ?? analytics?.agencyReadiness ?? 0} />
            <div className="mini-note">This briefing mirrors the agency’s morning run sheet: what changed, what is at risk, and what action should happen first.</div>
            <div className="inline-actions">
              <button type="button" className="btn-primary" onClick={() => demoOpen('dashboard')}>Open dashboard</button>
              <button type="button" onClick={() => setAiRoute('advisor')}>Open AI advisor</button>
              <button type="button" onClick={() => demoOpen('analytics-executive')}>Open executive summary</button>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Guided demo flow">
        <div className="demo-timeline">
          {steps.map((step, index) => (
            <article className="demo-step" key={step.title}>
              <div className="demo-step-index">{index + 1}</div>
              <div className="demo-step-copy">
                <b>{step.title}</b>
                <p>{step.detail}</p>
              </div>
              <button type="button" className="btn-primary" disabled={step.disabled} onClick={step.action}>
                {step.cta} <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

export function DemoReadiness() {
  const [summary] = usePromise(() => getPlatformSummary(), []);
  const [supportTickets] = usePromise(() => getSupportTickets(), []);
  const [auditLogs] = usePromise(() => getAuditLogs(), []);
  const [stations] = usePromise(() => getStations(), []);
  const [assets] = usePromise(() => getAssetCommandCenter(), []);
  const [prevention] = usePromise(() => getPreventionCommandCenter(), []);

  return (
    <>
      <PageHeader
        eyebrow="Demo readiness"
        title="Evaluator View"
        description="A concise proof-of-coverage and requirement-alignment page for evaluators that highlights scope, integrations, security posture, and demo readiness."
      />

      <div className="stats-grid">
        <StatCard label="Scope Areas" value="7 / 7" hint="Platform coverage" icon={<CheckCircle2 />} />
        <StatCard label="Stations" value={stations?.items?.length ?? 17} hint="Shared master data" icon={<Building2 />} />
        <StatCard label="Open Tickets" value={supportTickets?.items?.length ?? 0} hint="Support maturity" icon={<ClipboardList />} />
        <StatCard label="Audit Events" value={auditLogs?.items?.length ?? 0} hint="Traceable actions" icon={<ShieldCheck />} />
        <StatCard label="Asset Readiness" value={`${assets?.overallAssetReadinessScore ?? 0}%`} hint="Logistics signal" icon={<HardHat />} />
        <StatCard label="Prevention Risk" value={`${prevention?.summary?.overallPreventionRiskScore ?? 0}%`} hint="Community risk signal" icon={<ClipboardCheck />} />
      </div>

      <div className="two-col">
      <SectionCard title="Scope coverage checklist">
        <div className="stack">
            {productCoverageChecklist.map((item) => (
              <article className="mini-card" key={item.scope}>
                <div>
                  <b>{item.scope}</b>
                  <span>{item.frontend}</span>
                  <span>{item.remainingGap}</span>
                </div>
                <StatusBadge status={item.status} />
              </article>
            ))}
            <div className="mini-note">
              Coverage summary: {productCoverageSummary.strong} strong, {productCoverageSummary.partial} partial, {productCoverageSummary.thin} thin, {productCoverageSummary.missing} missing.
            </div>
        </div>
      </SectionCard>

        <SectionCard title="Evaluator proof points">
          <div className="stack">
            {proofPoints.map((point) => (
              <div className="mini-card" key={point}><span>{point}</span><StatusBadge status="Healthy" /></div>
            ))}
            <div className="mini-note">
              Data freshness: shared operational records are reused across modules, and the station 4 story is visible in dashboard, AI, personnel, learning, assets, prevention, integration, analytics, and trust center views. District readiness today is {summary?.readiness?.agencyAverage ?? '—'}%.
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Remaining production-hardening notes">
        <div className="three-col">
          <div className="nested-card"><b>Offline posture</b><p>Limited-connectivity workflow pattern and sync queue placeholders are demonstrated, not full offline mode.</p></div>
          <div className="nested-card"><b>Identity integrations</b><p>SSO / MFA settings are configurable posture placeholders unless a live IdP is connected.</p></div>
          <div className="nested-card"><b>Reporting exports</b><p>Export and scheduling UX is evaluator-ready, while the final delivery pipeline can be connected later.</p></div>
        </div>
        <div className="inline-actions" style={{ marginTop: 14 }}>
          <button type="button" className="btn-primary" onClick={() => demoOpen('dashboard')}>Open dashboard</button>
          <button type="button" onClick={() => demoOpen('demo-morning-readiness')}>Open morning briefing</button>
          <button type="button" onClick={() => demoOpen('support-sla')}>Open support / SLA</button>
        </div>
      </SectionCard>
    </>
  );
}
