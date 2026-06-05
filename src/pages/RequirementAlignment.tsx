import { useState } from 'react';
import { Layers, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { Tabs } from '../components/Tabs';
import {
  ALIGNMENT_ROWS,
  ARCHITECTURE_PILLARS,
  MODULE_LAYERS,
  PRODUCT,
  alignmentSummary,
  type AlignmentLevel,
} from '../data/requirementAlignment';

const levelStatus: Record<AlignmentLevel, string> = {
  Implemented: 'Healthy',
  Aligned: 'On Track',
  Configurable: 'Warning',
  Roadmap: 'Planned',
};

export function RequirementAlignment() {
  const [tab, setTab] = useState<'alignment' | 'layers' | 'architecture'>('alignment');

  return (
    <>
      <PageHeader
        eyebrow="MissionOS · requirement alignment"
        title="Requirement Alignment"
        description={`How ${PRODUCT.name} — a configurable, multi-tenant SaaS platform for Fire/EMS and public safety — aligns with the procurement requirements. Capabilities are stated conservatively: alignment and configurability, not production certification.`}
      />

      <div className="stats-grid">
        <StatCard label="Requirements mapped" value={alignmentSummary.total} hint="Across the RFP scope" icon={<ShieldCheck />} />
        <StatCard label="Implemented" value={alignmentSummary.implemented} hint="Working in-product" icon={<Sparkles />} />
        <StatCard label="Aligned" value={alignmentSummary.aligned} hint="Modeled / config-ready" icon={<Workflow />} />
        <StatCard label="Module layers" value={MODULE_LAYERS.length} hint="Core · Advanced · Future" icon={<Layers />} />
      </div>

      <OperationalBriefing
        eyebrow="Product positioning"
        summary={PRODUCT.positioning}
        bullets={[
          'MissionOS is configured per agency tenant — modules, KPIs, workflows, reports, and roles are all configurable on a shared common data platform.',
          'The Station 4 / Medic 4 fire/EMS storyline ships as a sample tenant, not as a one-off client build.',
          'Requirement alignment is stated honestly: we do not claim NERIS certification, full ePCR parity, SOC 2, or legal compliance unless actually implemented.',
        ]}
        badge="SaaS"
        evidence={[`${alignmentSummary.implemented} implemented`, `${alignmentSummary.aligned} aligned`, 'Multi-tenant', 'Configurable']}
      />

      <Tabs
        items={[
          { id: 'alignment', label: 'Requirement Alignment' },
          { id: 'layers', label: 'Module Layers' },
          { id: 'architecture', label: 'SaaS Architecture' },
        ]}
        activeId={tab}
        onChange={(next) => setTab(next as typeof tab)}
      />

      {tab === 'alignment' ? (
        <SectionCard title="RFP requirement alignment">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Requirement</th><th>Alignment</th><th>MissionOS capability</th><th>Honest scope / caveat</th></tr>
              </thead>
              <tbody>
                {ALIGNMENT_ROWS.map((row) => (
                  <tr key={row.requirement}>
                    <td><b>{row.requirement}</b></td>
                    <td><StatusBadge status={levelStatus[row.level]} /> {row.level}</td>
                    <td className="cell-wrap">{row.capability}</td>
                    <td className="cell-wrap"><span className="muted">{row.honestScope}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mini-note">Alignment levels: <b>Implemented</b> = working in-product · <b>Aligned</b> = modeled and configuration-ready · <b>Configurable</b> = available via tenant configuration · <b>Roadmap</b> = planned add-on. MissionOS does not claim NERIS certification, full ePCR parity, SOC 2, or legal/regulatory compliance unless explicitly implemented.</div>
        </SectionCard>
      ) : null}

      {tab === 'layers' ? (
        <div className="three-col">
          {MODULE_LAYERS.map((layer) => (
            <SectionCard key={layer.layer} title={layer.layer}>
              <div className="mini-note" style={{ marginBottom: 12 }}>{layer.blurb}</div>
              <div className="stack">
                {layer.modules.map((mod) => (
                  <article className="mini-card" key={mod}>
                    <div><b>{mod}</b></div>
                    <StatusBadge status={layer.layer.startsWith('Future') ? 'Planned' : 'Healthy'} />
                  </article>
                ))}
              </div>
            </SectionCard>
          ))}
        </div>
      ) : null}

      {tab === 'architecture' ? (
        <SectionCard title="Configurable SaaS architecture">
          <div className="kpi-grid">
            {ARCHITECTURE_PILLARS.map((pillar) => (
              <article className="kpi-card" key={pillar.title}>
                <span className="muted">{pillar.title}</span>
                <span className="mini-note-inline">{pillar.detail}</span>
              </article>
            ))}
          </div>
          <div className="mini-note">MissionOS is built as a configurable, multi-tenant SaaS product: the same platform serves multiple agencies, departments, stations, and jurisdictions, with per-tenant modules, KPIs, workflows, reports, and role-based access.</div>
        </SectionCard>
      ) : null}

      <footer className="product-footer">
        <span>{PRODUCT.name} — {PRODUCT.tagline}</span>
        <a className="product-footer-credit" href="https://www.kodekinetics.com" target="_blank" rel="noopener noreferrer">
          <span className="product-footer-label">Powered by</span>
          <span className="product-footer-brand">Kode Kinetics</span>
          <span className="product-footer-url">www.kodekinetics.com</span>
        </a>
      </footer>
    </>
  );
}
