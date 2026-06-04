import { useMemo, useState } from 'react';
import { Building2, Layers, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { Tabs } from '../components/Tabs';
import {
  MODULE_REGISTRY,
  SAMPLE_TENANTS,
  defaultEnabledModules,
  getActiveTenantId,
  readTenantModules,
  setActiveTenantId,
  writeTenantModules,
  type ModuleLayer,
} from '../data/tenants';
import { saveTenantModules } from '../services/tenantConfigClient';

const LAYERS: ModuleLayer[] = ['Core Compliance', 'Advanced Intelligence', 'Future Expansion'];

export function TenantConfiguration() {
  const [tenantId, setTenantId] = useState<string>(getActiveTenantId());
  const [config, setConfig] = useState<Record<string, boolean>>(() => readTenantModules(getActiveTenantId()));
  const [tab, setTab] = useState<'tenants' | 'modules' | 'config'>('modules');
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const tenant = useMemo(() => SAMPLE_TENANTS.find((t) => t.id === tenantId) ?? SAMPLE_TENANTS[0], [tenantId]);
  const enabledCount = useMemo(() => MODULE_REGISTRY.filter((m) => config[m.key]).length, [config]);

  const switchTenant = (id: string) => {
    setTenantId(id);
    setActiveTenantId(id);
    setConfig(readTenantModules(id));
    setSavedNote(null);
    window.dispatchEvent(new CustomEvent('missionos:tenant-config-changed'));
  };

  const toggle = (key: string) => {
    const next = { ...config, [key]: !config[key] };
    setConfig(next);
    writeTenantModules(tenantId, next);
    setSavedNote(null);
    window.dispatchEvent(new CustomEvent('missionos:tenant-config-changed'));
  };

  const persist = async () => {
    writeTenantModules(tenantId, config);
    setActiveTenantId(tenantId);
    await saveTenantModules(tenantId, config);
    setSavedNote(`Saved module configuration for ${tenant.name}.`);
    window.dispatchEvent(new CustomEvent('missionos:tenant-config-changed'));
  };

  const resetDefaults = () => {
    const def = defaultEnabledModules(tenantId);
    setConfig(def);
    writeTenantModules(tenantId, def);
    window.dispatchEvent(new CustomEvent('missionos:tenant-config-changed'));
    setSavedNote(`Reset ${tenant.name} to default module set.`);
  };

  return (
    <>
      <PageHeader
        eyebrow="MissionOS · multi-tenant administration"
        title="Tenant & Module Configuration"
        description="MissionOS is one platform serving many agencies. Each tenant enables its own modules, KPIs, workflows, reports, and roles. Changes here are tenant-scoped and reflected live in the navigation."
      />

      <div className="stats-grid">
        <StatCard label="Sample tenants" value={SAMPLE_TENANTS.length} hint="Multi-tenant runtime" icon={<Building2 />} onClick={() => setTab('tenants')} />
        <StatCard label="Active tenant" value={tenant.code} hint={tenant.name} icon={<Building2 />} onClick={() => setTab('tenants')} />
        <StatCard label="Enabled modules" value={enabledCount} hint={`of ${MODULE_REGISTRY.length}`} icon={<Layers />} onClick={() => setTab('modules')} />
        <StatCard label="Configurable" value="KPIs · Workflows · Reports · Roles" hint="Per tenant" icon={<SlidersHorizontal />} onClick={() => setTab('config')} />
      </div>

      <OperationalBriefing
        eyebrow="Why this matters"
        summary={`The same MissionOS deployment runs ${SAMPLE_TENANTS.length} sample agency tenants with different module sets — proving the product is configurable SaaS, not a one-off build. Toggling a module here updates what ${tenant.name} sees in the sidebar immediately.`}
        bullets={[
          'Module enablement is tenant-scoped and persisted (server-side in live mode, locally in demo) and survives reload.',
          'Disabling a module hides its navigation for that tenant without removing the underlying platform capability.',
          'Future-expansion modules are listed as configurable add-ons that activate per tenant without a rebuild.',
        ]}
        badge="Multi-tenant"
        evidence={[`${SAMPLE_TENANTS.length} tenants`, `${enabledCount}/${MODULE_REGISTRY.length} modules on`, 'Live nav gating', 'Persisted']}
      />

      {savedNote ? (
        <SectionCard title="Configuration saved">
          <div className="mini-card"><div><b>{savedNote}</b><span>Tenant-scoped configuration persisted and applied to navigation.</span></div><StatusBadge status="Healthy" /></div>
        </SectionCard>
      ) : null}

      <Tabs
        items={[
          { id: 'tenants', label: 'Tenants' },
          { id: 'modules', label: 'Module Configuration' },
          { id: 'config', label: 'Configurable Layers' },
        ]}
        activeId={tab}
        onChange={(next) => setTab(next as typeof tab)}
      />

      {tab === 'tenants' ? (
        <SectionCard title="Agency tenants">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Agency</th><th>Code</th><th>Type</th><th>Timezone</th><th>Enabled modules</th><th>Active</th><th>Action</th></tr></thead>
              <tbody>
                {SAMPLE_TENANTS.map((t) => {
                  const cfg = readTenantModules(t.id);
                  const count = MODULE_REGISTRY.filter((m) => cfg[m.key]).length;
                  return (
                    <tr key={t.id} className={t.id === tenantId ? 'row-highlight' : undefined}>
                      <td><b>{t.name}</b></td>
                      <td>{t.code}</td>
                      <td>{t.type}</td>
                      <td>{t.timezone}</td>
                      <td>{count} / {MODULE_REGISTRY.length}</td>
                      <td>{t.id === tenantId ? <StatusBadge status="Healthy" /> : <span className="muted">—</span>}</td>
                      <td><button type="button" className={t.id === tenantId ? 'ghost-button' : 'primary-button'} onClick={() => switchTenant(t.id)}>{t.id === tenantId ? 'Active' : 'Switch to tenant'}</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mini-note">Both tenants run the same MissionOS build with tenant-scoped data and configuration. The Station 4 / Medic 4 fire/EMS storyline lives inside the West Metro sample tenant.</div>
        </SectionCard>
      ) : null}

      {tab === 'modules' ? (
        <>
          <SectionCard title={`Module configuration — ${tenant.name}`}>
            <div className="inline-actions" style={{ marginBottom: 12 }}>
              <button type="button" className="btn-primary" onClick={persist}>Save configuration</button>
              <button type="button" className="ghost-button" onClick={resetDefaults}>Reset to defaults</button>
              <span className="muted">Toggling updates the sidebar for this tenant immediately.</span>
            </div>
            {LAYERS.map((layer) => (
              <div key={layer} className="module-layer-group">
                <h3 className="module-layer-title">{layer}</h3>
                <div className="module-grid">
                  {MODULE_REGISTRY.filter((m) => m.layer === layer).map((mod) => {
                    const on = !!config[mod.key];
                    const roadmap = mod.available === false;
                    return (
                      <button
                        type="button"
                        key={mod.key}
                        className={`module-toggle ${on ? 'on' : 'off'} ${roadmap ? 'roadmap' : ''}`}
                        onClick={() => toggle(mod.key)}
                        title={roadmap ? 'Roadmap add-on — activates per tenant' : 'Toggle module for this tenant'}
                      >
                        <span className="module-name">{mod.label}</span>
                        <span className="module-state">
                          <StatusBadge status={on ? 'Healthy' : roadmap ? 'Planned' : 'Neutral'} />
                          {on ? 'Enabled' : roadmap ? 'Add-on (off)' : 'Disabled'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </SectionCard>
        </>
      ) : null}

      {tab === 'config' ? (
        <div className="two-col">
          <SectionCard title="Configurable per tenant">
            <div className="stack">
              <div className="mini-card"><div><span>KPIs</span><b>KPI library + builder (formula, source, thresholds, weighting, assignment) — see Workforce Performance.</b></div><StatusBadge status="Healthy" /></div>
              <div className="mini-card"><div><span>Workflows</span><b>Shift fill, trades, callbacks, requisitions, appraisals, escalations — state-driven and configurable.</b></div><StatusBadge status="Healthy" /></div>
              <div className="mini-card"><div><span>Reports</span><b>Report definitions, columns, filters, schedules, delivery — export/schedule-ready.</b></div><StatusBadge status="Healthy" /></div>
              <div className="mini-card"><div><span>Roles & access</span><b>RBAC roles, permissions, and access reviews scoped to each tenant — see Security & Admin.</b></div><StatusBadge status="Healthy" /></div>
            </div>
          </SectionCard>
          <SectionCard title="Platform architecture">
            <div className="stack">
              <div className="mini-note">Multi-agency / multi-tenant · configurable modules · configurable KPIs · configurable workflows · configurable reports · role-based access · API integration layer · future data warehouse · optional add-on modules.</div>
              <div className="mini-card"><div><span>Data isolation</span><b>All records are tenant-scoped via tenantId across the data model and seed.</b></div><StatusBadge status="Healthy" /></div>
              <div className="mini-card"><div><span>Honest scope</span><b>Multi-tenant configurability is implemented and demonstrable here; production load/SLA hardening and HA infrastructure are deployment-time work.</b></div><StatusBadge status="Warning" /></div>
            </div>
          </SectionCard>
        </div>
      ) : null}
    </>
  );
}
