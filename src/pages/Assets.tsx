import { useEffect, useMemo, useState } from 'react';
import {
  approveReorderRecommendation,
  completeMaintenanceEvent,
  completePreventiveMaintenance,
  createAsset,
  createInventory,
  createInventoryTransaction,
  createMaintenanceEvent,
  deferMaintenanceEvent,
  getApparatus360,
  getAssetCommandCenter,
  getAssetHistory,
  getAssetRisks,
  getAssets,
  getApparatus,
  getInventory,
  getInventoryExpiring,
  getInventoryLowStock,
  getInventoryTransactions,
  getMaintenanceEvents,
  getPreventiveMaintenance,
  getPreventiveMaintenanceDue,
  getReorderRecommendations,
  getStations,
  getVendors,
  rejectReorderRecommendation,
  scheduleMaintenanceEvent,
  startMaintenanceEvent,
  updateMaintenanceEvent,
} from '../services/platformClient';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { Tabs } from '../components/Tabs';
import { ReadinessScore } from '../components/ReadinessScore';
import { DetailDrawer } from '../components/DetailDrawer';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { OperationalBriefing } from '../components/OperationalBriefing';
import type { Apparatus, Asset, InventoryItem, MaintenanceEvent, Personnel, Station } from '../types';

type HubData = {
  commandCenter: any;
  risks: any[];
  apparatus: Apparatus[];
  assets: Asset[];
  inventory: InventoryItem[];
  lowStock: InventoryItem[];
  expiring: InventoryItem[];
  maintenance: MaintenanceEvent[];
  preventiveMaintenance: any[];
  preventiveDue: any[];
  transactions: any[];
  vendors: any[];
  reorderRecommendations: any[];
  stations: Station[];
};

const assetSelectionKey = 'missionos.apparatus.selectedId';
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : dateFormatter.format(parsed);
}

function useAssetSelection(initialId?: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId ?? localStorage.getItem(assetSelectionKey));
  useEffect(() => {
    if (selectedId) localStorage.setItem(assetSelectionKey, selectedId);
  }, [selectedId]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ apparatusId?: string }>).detail;
      if (detail?.apparatusId) setSelectedId(detail.apparatusId);
    };
    window.addEventListener('missionos:open-apparatus-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-apparatus-360', handler as EventListener);
  }, []);
  return [selectedId, setSelectedId] as const;
}

function useAssetHubData() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    Promise.all([
      getAssetCommandCenter(),
      getAssetRisks(),
      getApparatus(),
      getAssets(),
      getInventory(),
      getInventoryLowStock(),
      getInventoryExpiring(),
      getMaintenanceEvents(),
      getPreventiveMaintenance(),
      getPreventiveMaintenanceDue(),
      getInventoryTransactions(),
      getVendors(),
      getReorderRecommendations(),
      getStations(),
    ]).then(([commandCenter, risks, apparatusPage, assetPage, inventoryPage, lowStock, expiring, maintenancePage, preventivePage, preventiveDue, transactionPage, vendorPage, reorderPage, stationPage]) => {
      if (!alive) return;
      setData({
        commandCenter,
        risks,
        apparatus: apparatusPage.items,
        assets: assetPage.items,
        inventory: inventoryPage.items,
        lowStock: lowStock as InventoryItem[],
        expiring: expiring as InventoryItem[],
        maintenance: maintenancePage.items as MaintenanceEvent[],
        preventiveMaintenance: preventivePage.items,
        preventiveDue,
        transactions: transactionPage.items,
        vendors: vendorPage.items,
        reorderRecommendations: reorderPage.items,
        stations: stationPage.items,
      });
      setLoading(false);
    }).catch(() => {
      if (!alive) return;
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);
  return { data, loading };
}

function AppHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <PageHeader eyebrow={eyebrow} title={title} description={description} />;
}

function ApparatusTable({ apparatus, onOpen }: { apparatus: Apparatus[]; onOpen: (id: string) => void }) {
  return (
    <DataTable
      columns={['Unit', 'Station', 'Type', 'Status', 'Readiness', 'Mileage', 'Next Maintenance', 'Action']}
      rows={apparatus}
      renderRow={(unit) => (
        <>
          <td><b>{unit.unitNumber}</b><br /><small>{unit.callSign ?? unit.name ?? unit.unitNumber}</small></td>
          <td>{unit.stationId ?? 'Unassigned'}</td>
          <td>{unit.apparatusType}</td>
          <td><StatusBadge status={String(unit.status)} /></td>
          <td><ReadinessScore score={Number(unit.readinessScore ?? 0)} label="Readiness" /></td>
          <td>{unit.mileage ?? '—'} mi</td>
          <td>{formatDate(unit.nextMaintenanceDue ?? unit.nextMaintenanceAt)}</td>
          <td><button className="btn-link" type="button" onClick={() => onOpen(unit.id)}>Open 360</button></td>
        </>
      )}
    />
  );
}

function CommandCenter({ data }: { data: HubData }) {
  return (
    <>
      <OperationalBriefing
        eyebrow="What matters now"
        summary="The logistics command center ties apparatus readiness, inventory health, preventive maintenance, and reorder pressure into one operational view."
        bullets={[
          `Overall asset readiness is ${data.commandCenter.overallAssetReadinessScore}%, with ${data.commandCenter.apparatusReady} apparatus ready and ${data.commandCenter.apparatusOutOfService} out of service.`,
          `${data.commandCenter.maintenanceDueThisWeek} maintenance item(s) are due this week and ${data.commandCenter.overdueMaintenance} are already overdue.`,
          `${data.commandCenter.criticalLowStock} critical low-stock item(s) and ${data.commandCenter.expiringSupplies} expiring supply item(s) are pushing readiness risk.`,
        ]}
        badge={data.commandCenter.riskLevel}
        actions={<button type="button" className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'apparatusRegistry' } }))}>Open apparatus registry</button>}
        evidence={[
          'Ready / Warning / OOS',
          'Maintenance due',
          'Reorder recommendation',
          'Station readiness impact',
        ]}
      />
      <div className="stats-grid">
        <StatCard label="Overall Asset Readiness" value={`${data.commandCenter.overallAssetReadinessScore}%`} hint={`Risk: ${data.commandCenter.riskLevel}`} />
        <StatCard label="Apparatus Ready" value={data.commandCenter.apparatusReady} hint={`${data.commandCenter.apparatusWarning} watch / ${data.commandCenter.apparatusOutOfService} out`} />
        <StatCard label="Maintenance Due" value={data.commandCenter.maintenanceDueThisWeek} hint={`${data.commandCenter.overdueMaintenance} overdue`} />
        <StatCard label="Low Stock" value={data.commandCenter.criticalLowStock} hint={`${data.commandCenter.expiringSupplies} expiring supplies`} />
      </div>

      <div className="two-col">
        <SectionCard title="Station readiness impact">
          <div className="stack">
            {data.commandCenter.stationReadinessImpact.slice(0, 6).map((row: any) => (
              <article className="mini-card" key={row.station?.id ?? row.station?.name}>
                <div>
                  <b>{row.station?.name ?? 'Unassigned station'}</b>
                  <span>{row.apparatusCount} apparatus · {row.lowStockCount} low stock · {row.maintenanceBacklog} maintenance</span>
                </div>
                <div className="row-between">
                  <ReadinessScore score={row.assetReadinessScore ?? 0} label="Asset" />
                  <StatusBadge status={row.riskLevel} />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="High-risk apparatus">
          <div className="stack">
            {data.commandCenter.highRiskApparatus.slice(0, 6).map((unit: any) => (
              <article className="mini-card" key={unit.id}>
                <div>
                  <b>{unit.unitNumber}</b>
                  <span>{unit.station?.name ?? 'Unassigned'} · {unit.apparatusType}</span>
                </div>
                <div className="row-between">
                  <ReadinessScore score={Number(unit.readinessScore ?? 0)} label="Readiness" />
                  <StatusBadge status={unit.riskLevel ?? unit.status} />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="AI recommended actions">
          <div className="stack">
            {(data.commandCenter.aiInsights ?? []).slice(0, 4).map((insight: any) => (
              <article className="mini-card" key={insight.id}>
                <div>
                  <b>{insight.title}</b>
                  <span>{insight.summary}</span>
                </div>
                <StatusBadge status={insight.severity ?? 'Warning'} />
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Reorder recommendations">
          <div className="stack">
            {(data.commandCenter.reorderRecommendations ?? []).slice(0, 4).map((recommendation: any) => (
              <article className="mini-card" key={recommendation.id}>
                <div>
                  <b>{recommendation.inventoryItem?.name ?? 'Inventory item'}</b>
                  <span>{recommendation.reason}</span>
                </div>
                <StatusBadge status={recommendation.priority} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent maintenance activity">
        <div className="stack">
          {(data.commandCenter.recentMaintenanceActivity ?? []).slice(0, 8).map((activity: any) => (
            <article className="mini-card" key={`${activity.type}-${activity.id}`}>
              <div>
                <b>{activity.title}</b>
                <span>{activity.type} · {formatDate(activity.createdAt)}</span>
              </div>
              <StatusBadge status={activity.type === 'Maintenance' ? 'Warning' : 'Healthy'} />
            </article>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function ApparatusRegistryView({ data, selectedId, setSelectedId }: { data: HubData; selectedId: string | null; setSelectedId: (value: string) => void }) {
  const [stationFilter, setStationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const apparatus = useMemo(() => {
    return data.apparatus.filter((unit) => (stationFilter === 'all' || unit.stationId === stationFilter) && (statusFilter === 'all' || String(unit.status) === statusFilter) && (typeFilter === 'all' || String(unit.apparatusType).toLowerCase().includes(typeFilter.toLowerCase())));
  }, [data.apparatus, stationFilter, statusFilter, typeFilter]);
  const selected = data.apparatus.find((unit) => unit.id === selectedId) ?? apparatus[0] ?? null;

  return (
    <div className="two-col">
      <SectionCard title="Apparatus registry" action={<button className="btn-link" type="button" onClick={() => {
        if (!selected) return;
        window.dispatchEvent(new CustomEvent('missionos:open-apparatus-360', { detail: { apparatusId: selected.id } }));
        window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'apparatus360' } }));
      }}>Open 360</button>}>
        <div className="filter-bar">
          <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}>
            <option value="all">All stations</option>
            {data.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {['Ready', 'Warning', 'Maintenance Due', 'Out of Service', 'Retired'].map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">All types</option>
            {Array.from(new Set(data.apparatus.map((unit) => unit.apparatusType))).map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <ApparatusTable apparatus={apparatus.slice(0, 18)} onOpen={(id) => {
          setSelectedId(id);
          window.dispatchEvent(new CustomEvent('missionos:open-apparatus-360', { detail: { apparatusId: id } }));
          window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'apparatus360' } }));
        }} />
      </SectionCard>

      <DetailDrawer title={selected?.unitNumber ?? 'Apparatus 360'} subtitle={selected?.stationId ?? 'Select an apparatus'}>
        {selected ? (
          <div className="profile-panel">
            <div className="profile-head">
              <div>
                <b>{selected.apparatusType} · {selected.callSign ?? selected.unitNumber}</b>
                <p className="muted">{selected.make ?? '—'} {selected.model ?? ''} {selected.year ?? ''}</p>
              </div>
              <ReadinessScore score={Number(selected.readinessScore ?? 0)} />
            </div>
            <div className="chip-row">
              <span className="mini-chip">Mileage {selected.mileage ?? 0}</span>
              <span className="mini-chip">Engine hours {selected.engineHours ?? 0}</span>
              <span className="mini-chip">Next inspection {formatDate(selected.nextInspectionDue)}</span>
              <span className="mini-chip">Next maintenance {formatDate(selected.nextMaintenanceDue)}</span>
            </div>
            <div className="mini-note">{selected.notes ?? 'This apparatus record is shared across Station 360, incidents, maintenance, and readiness reporting.'}</div>
          </div>
        ) : <EmptyState title="No apparatus selected" description="Choose a unit in the registry to inspect readiness and workflow history." />}
      </DetailDrawer>
    </div>
  );
}

function Apparatus360View({ apparatusId, data }: { apparatusId: string | null; data: HubData }) {
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => {
    if (!apparatusId) return;
    getApparatus360(apparatusId).then(setDetail).catch(() => setDetail(null));
  }, [apparatusId]);

  if (!apparatusId) return <LoadingState label="Select an apparatus from the registry..." />;
  if (!detail) return <LoadingState label="Loading apparatus 360..." />;

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Readiness" value={`${detail.readiness?.readinessScore ?? detail.readinessScore ?? 0}%`} hint={`Risk: ${detail.readiness?.riskLevel ?? detail.riskLevel ?? 'Watch'}`} />
        <StatCard label="Open maintenance" value={detail.readiness?.maintenanceOpen ?? detail.maintenanceEvents?.length ?? 0} hint="Active work orders" />
        <StatCard label="Critical issues" value={detail.readiness?.criticalIssues ?? 0} hint="Support inventory risk" />
        <StatCard label="Incident usage" value={detail.incidents?.length ?? 0} hint="Recent response involvement" />
      </div>
      <div className="two-col">
        <SectionCard title="Profile summary">
          <div className="stack">
            <div className="mini-card">
              <b>{detail.unitNumber}</b>
              <span>{detail.station?.name ?? 'Unassigned'} · {detail.apparatusType}</span>
            </div>
            <div className="mini-card"><span>Make/model/year</span><b>{[detail.make, detail.model, detail.year].filter(Boolean).join(' ')}</b></div>
            <div className="mini-card"><span>VIN / Plate</span><b>{detail.vin ?? '—'} / {detail.licensePlate ?? '—'}</b></div>
            <div className="mini-card"><span>Driver / crew requirements</span><b>{detail.apparatusTypeRef?.requiredCrewCount ?? 4} crew</b></div>
          </div>
        </SectionCard>
        <DetailDrawer title="AI readiness insight" subtitle={`Why this unit is ${detail.riskLevel ?? 'at risk'}`}>
          <div className="mini-note">
            {detail.aiInsight?.summary ?? 'This unit is monitored for maintenance due dates, support inventory, and incident usage patterns.'}
          </div>
          <div className="chip-row">
            <span className="mini-chip">Status {detail.status}</span>
            <span className="mini-chip">Readiness {detail.readinessScore ?? 0}%</span>
            <span className="mini-chip">Next maintenance {formatDate(detail.nextMaintenanceDue)}</span>
          </div>
        </DetailDrawer>
      </div>
      <div className="two-col">
        <SectionCard title="Equipment assigned">
          <div className="stack">
            {(detail.assignedAssets ?? []).slice(0, 8).map((asset: any) => (
              <article className="mini-card" key={asset.id}>
                <div>
                  <b>{asset.assetTag}</b>
                  <span>{asset.name} · {asset.condition ?? 'Good'}</span>
                </div>
                <StatusBadge status={asset.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Inventory on apparatus">
          <div className="stack">
            {(detail.inventoryItems ?? []).slice(0, 8).map((item: any) => (
              <article className="mini-card" key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <span>Qty {item.quantityOnHand ?? item.quantity ?? 0} · Reorder {item.reorderPoint}</span>
                </div>
                <StatusBadge status={item.status ?? 'In Stock'} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <div className="two-col">
        <SectionCard title="Maintenance history">
          <div className="stack">
            {(detail.maintenanceHistory ?? []).slice(0, 8).map((event: any) => (
              <article className="mini-card" key={event.id}>
                <div>
                  <b>{event.title}</b>
                  <span>{event.maintenanceType ?? 'Maintenance'} · {formatDate(event.reportedDate)}</span>
                </div>
                <StatusBadge status={event.priority} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Preventive maintenance">
          <div className="stack">
            {(detail.preventiveSchedules ?? []).slice(0, 8).map((schedule: any) => (
              <article className="mini-card" key={schedule.id}>
                <div>
                  <b>{schedule.maintenanceName}</b>
                  <span>Due {formatDate(schedule.nextDueDate)} · {schedule.frequencyType} {schedule.frequencyValue}</span>
                </div>
                <StatusBadge status={schedule.status} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <div className="two-col">
        <SectionCard title="Incident response usage">
          <div className="stack">
            {(detail.incidents ?? []).slice(0, 8).map((entry: any) => (
              <article className="mini-card" key={entry.id}>
                <div>
                  <b>{entry.incident?.incidentNumber ?? 'Incident'}</b>
                  <span>{entry.incident?.incidentType ?? entry.role ?? 'Response role'}</span>
                </div>
                <StatusBadge status={entry.incident?.status ?? 'Open'} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Readiness guidance">
          <div className="mini-note">
            {detail.readiness?.riskLevel === 'Critical'
              ? 'This unit should be reviewed immediately. Dispatch coverage, maintenance, and support inventory are all affecting readiness.'
              : 'Continue monitoring maintenance and support inventory. Keep this apparatus in the normal preventive cycle.'}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function AssetInventoryView({ data }: { data: HubData }) {
  const [stationFilter, setStationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [form, setForm] = useState({ assetTag: '', name: '', category: 'Equipment', status: 'READY', stationId: '', readinessImpact: '5' });
  const rows = useMemo(() => data.assets.filter((asset) => (stationFilter === 'all' || asset.stationId === stationFilter) && (statusFilter === 'all' || String(asset.status) === statusFilter) && (categoryFilter === 'all' || String(asset.category).toLowerCase().includes(categoryFilter.toLowerCase()))), [data.assets, stationFilter, statusFilter, categoryFilter]);

  return (
    <>
      <SectionCard title="Create equipment asset" action={<button className="btn-link" type="button" onClick={() => createAsset({ ...form, readinessImpact: Number(form.readinessImpact) }).then(() => window.location.reload())}>Save asset</button>}>
        <div className="form-grid">
          <label>Asset tag<input value={form.assetTag} onChange={(event) => setForm({ ...form, assetTag: event.target.value })} /></label>
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label>Station<select value={form.stationId} onChange={(event) => setForm({ ...form, stationId: event.target.value })}><option value="">Unassigned</option>{data.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
          <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{['READY', 'WARNING', 'OUT_OF_SERVICE', 'MAINTENANCE_DUE', 'RETIRED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label>Readiness impact<input type="number" value={form.readinessImpact} onChange={(event) => setForm({ ...form, readinessImpact: event.target.value })} /></label>
        </div>
      </SectionCard>
      <SectionCard title="Equipment / asset inventory">
        <div className="filter-bar">
          <select value={stationFilter} onChange={(event) => setStationFilter(event.target.value)}><option value="all">All stations</option>{data.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{['READY', 'WARNING', 'OUT_OF_SERVICE', 'MAINTENANCE_DUE', 'RETIRED'].map((status) => <option key={status} value={status}>{status}</option>)}</select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{Array.from(new Set(data.assets.map((asset) => asset.category))).map((category) => <option key={category} value={category}>{category}</option>)}</select>
        </div>
        <DataTable
          columns={['Tag', 'Name', 'Assignment', 'Status', 'Condition', 'Warranty', 'Impact']}
          rows={rows}
          renderRow={(asset) => (
            <>
              <td><b>{asset.assetTag}</b><br /><small>{asset.manufacturer} {asset.model}</small></td>
              <td>{asset.name}</td>
              <td>{asset.stationId ?? asset.apparatusId ?? asset.assignedToPersonnelId ?? 'Unassigned'}</td>
              <td><StatusBadge status={asset.status} /></td>
              <td>{asset.condition ?? 'Good'}</td>
              <td>{formatDate(asset.warrantyExpiryDate)}</td>
              <td>{asset.readinessImpact ?? 0}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

function StationInventoryView({ data }: { data: HubData }) {
  const [form, setForm] = useState({ sku: '', name: '', category: 'EMS', stationId: data.stations[0]?.id ?? '', quantityOnHand: '1', reorderPoint: '1', unitOfMeasure: 'each' });
  return (
    <div className="stack">
      <SectionCard title="Create station inventory item" action={<button className="btn-link" type="button" onClick={() => createInventory(form).then(() => window.location.reload())}>Save inventory item</button>}>
        <div className="form-grid">
          <label>SKU<input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
          <label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Category<input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
          <label>Station<select value={form.stationId} onChange={(event) => setForm({ ...form, stationId: event.target.value })}>{data.stations.map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select></label>
          <label>Quantity<input type="number" value={form.quantityOnHand} onChange={(event) => setForm({ ...form, quantityOnHand: event.target.value })} /></label>
          <label>Reorder point<input type="number" value={form.reorderPoint} onChange={(event) => setForm({ ...form, reorderPoint: event.target.value })} /></label>
        </div>
      </SectionCard>
      <SectionCard title="Station inventory">
        <div className="stack">
          {data.stations.slice(0, 8).map((station) => {
            const items = data.inventory.filter((item) => item.stationId === station.id);
            return (
              <article className="mini-card" key={station.id}>
                <div>
                  <b>{station.name}</b>
                  <span>{items.length} item(s) · {items.filter((item) => Number(item.quantityOnHand ?? item.quantity ?? 0) <= Number(item.reorderPoint ?? 0)).length} low stock</span>
                </div>
                <ReadinessScore score={data.commandCenter.stationReadinessImpact.find((row: any) => row.station?.id === station.id)?.assetReadinessScore ?? 0} label="Asset" />
              </article>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

function MaintenanceWorkbenchView({ data }: { data: HubData }) {
  const [form, setForm] = useState({ title: '', apparatusId: '', assetId: '', priority: 'Normal', status: 'Reported' });
  return (
    <>
      <SectionCard title="Create maintenance event" action={<button className="btn-link" type="button" onClick={() => createMaintenanceEvent(form).then(() => window.location.reload())}>Save maintenance</button>}>
        <div className="form-grid">
          <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{['Critical', 'High', 'Normal', 'Low'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
          <label>Apparatus<select value={form.apparatusId} onChange={(event) => setForm({ ...form, apparatusId: event.target.value })}><option value="">None</option>{data.apparatus.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitNumber}</option>)}</select></label>
          <label>Asset<select value={form.assetId} onChange={(event) => setForm({ ...form, assetId: event.target.value })}><option value="">None</option>{data.assets.slice(0, 40).map((asset) => <option key={asset.id} value={asset.id}>{asset.assetTag} · {asset.name}</option>)}</select></label>
        </div>
      </SectionCard>
      <SectionCard title="Maintenance workbench">
        <DataTable
          columns={['Title', 'Linked To', 'Priority', 'Status', 'Reported', 'Action']}
          rows={data.maintenance}
          renderRow={(event) => (
            <>
              <td><b>{event.title}</b><br /><small>{event.maintenanceType ?? 'Maintenance'}</small></td>
              <td>{event.apparatusId ?? event.assetId ?? '—'}</td>
              <td><StatusBadge status={event.priority} /></td>
              <td><StatusBadge status={event.status} /></td>
              <td>{formatDate(event.reportedDate)}</td>
              <td className="inline-actions">
                <button className="btn-link" type="button" onClick={() => scheduleMaintenanceEvent(event.id, { scheduledDate: new Date().toISOString() }).then(() => window.location.reload())}>Schedule</button>
                <button className="btn-link" type="button" onClick={() => startMaintenanceEvent(event.id, {}).then(() => window.location.reload())}>Start</button>
                <button className="btn-link" type="button" onClick={() => completeMaintenanceEvent(event.id, {}).then(() => window.location.reload())}>Complete</button>
                <button className="btn-link" type="button" onClick={() => deferMaintenanceEvent(event.id, {}).then(() => window.location.reload())}>Defer</button>
              </td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

function PreventiveMaintenanceView({ data }: { data: HubData }) {
  return (
    <SectionCard title="Preventive maintenance calendar">
      <div className="two-col">
        <div className="stack">
          {data.preventiveDue.slice(0, 8).map((schedule: any) => (
            <article className="mini-card" key={schedule.id}>
              <div>
                <b>{schedule.maintenanceName}</b>
                <span>Due {formatDate(schedule.nextDueDate)} · {schedule.frequencyType} {schedule.frequencyValue}</span>
              </div>
              <StatusBadge status={schedule.status} />
            </article>
          ))}
        </div>
        <div className="stack">
          {data.preventiveMaintenance.slice(0, 8).map((schedule: any) => (
            <article className="mini-card" key={schedule.id}>
              <div>
                <b>{schedule.maintenanceName}</b>
                <span>{schedule.apparatusId ?? schedule.assetId ?? 'District asset'} · {formatDate(schedule.nextDueDate)}</span>
              </div>
              <button className="btn-link" type="button" onClick={() => completePreventiveMaintenance(schedule.id).then(() => window.location.reload())}>Mark complete</button>
            </article>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function InventoryTransactionsView({ data }: { data: HubData }) {
  const [form, setForm] = useState({ inventoryItemId: data.inventory[0]?.id ?? '', transactionType: 'Receive', quantity: '1', reason: 'Operational adjustment' });
  return (
    <>
      <SectionCard title="Inventory transaction entry" action={<button className="btn-link" type="button" onClick={() => createInventoryTransaction(form).then(() => window.location.reload())}>Post transaction</button>}>
        <div className="form-grid">
          <label>Item<select value={form.inventoryItemId} onChange={(event) => setForm({ ...form, inventoryItemId: event.target.value })}>{data.inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Type<select value={form.transactionType} onChange={(event) => setForm({ ...form, transactionType: event.target.value })}>{['Receive', 'Issue', 'Transfer', 'Assign to Apparatus', 'Consume', 'Adjust', 'Expire', 'Dispose'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label>Quantity<input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <label>Reason<input value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
        </div>
      </SectionCard>
      <SectionCard title="Inventory transactions">
        <DataTable
          columns={['Type', 'Item', 'Qty', 'Date', 'Station / Apparatus', 'Performed By']}
          rows={data.transactions}
          renderRow={(transaction) => (
            <>
              <td><StatusBadge status={transaction.transactionType} /></td>
              <td>{transaction.inventoryItemId}</td>
              <td>{transaction.quantity}</td>
              <td>{formatDate(transaction.createdAt ?? transaction.transactionDate)}</td>
              <td>{transaction.fromStationId ?? transaction.toStationId ?? transaction.apparatusId ?? '—'}</td>
              <td>{transaction.performedByPersonnelId ?? '—'}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

function VendorReorderView({ data }: { data: HubData }) {
  return (
    <div className="two-col">
      <SectionCard title="Vendor directory">
        <div className="stack">
          {data.vendors.slice(0, 12).map((vendor: any) => (
            <article className="mini-card" key={vendor.id}>
              <div>
                <b>{vendor.name}</b>
                <span>{vendor.vendorType} · {vendor.contactName ?? 'No contact'}</span>
              </div>
              <StatusBadge status={vendor.preferredVendor ? 'Ready' : 'Watch'} />
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Reorder center">
        <div className="stack">
          {data.reorderRecommendations.slice(0, 12).map((recommendation: any) => (
            <article className="mini-card" key={recommendation.id}>
              <div>
                <b>{recommendation.inventoryItem?.name ?? recommendation.inventoryItemId}</b>
                <span>{recommendation.reason}</span>
              </div>
              <div className="inline-actions">
                <StatusBadge status={recommendation.priority} />
                <button className="btn-link" type="button" onClick={() => approveReorderRecommendation(recommendation.id).then(() => window.location.reload())}>Approve</button>
                <button className="btn-link" type="button" onClick={() => rejectReorderRecommendation(recommendation.id).then(() => window.location.reload())}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function AssetRisksView({ data }: { data: HubData }) {
  return (
    <SectionCard title="Asset readiness risks">
      <div className="stack">
        {data.risks.map((risk: any) => (
          <article className="mini-card" key={risk.id}>
            <div>
              <b>{risk.title}</b>
              <span>{risk.station} · {risk.evidenceSummary}</span>
            </div>
            <div className="inline-actions">
              <StatusBadge status={risk.severity} />
              <span className="mini-chip">{risk.recommendedAction}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function AssetLogisticsShell({ page }: { page: string }) {
  const { data, loading } = useAssetHubData();
  const [selectedApparatusId, setSelectedApparatusId] = useAssetSelection(null);
  useEffect(() => {
    if (page === 'apparatus360' && !selectedApparatusId && data?.apparatus[0]?.id) {
      setSelectedApparatusId(data.apparatus[0].id);
    }
  }, [page, selectedApparatusId, data, setSelectedApparatusId]);
  if (loading || !data) {
    return <LoadingState label="Loading asset and logistics readiness..." />;
  }

  const headers: Record<string, { eyebrow: string; title: string; description: string }> = {
    assets: { eyebrow: 'Asset & Logistics Readiness', title: 'Asset & Logistics Command Center', description: 'Apparatus, equipment, inventory, maintenance, and operational readiness from one command view.' },
    apparatusRegistry: { eyebrow: 'Asset & Logistics Readiness', title: 'Apparatus Registry', description: 'Find every response unit, its status, readiness, maintenance risk, and next action.' },
    apparatus360: { eyebrow: 'Asset & Logistics Readiness', title: 'Apparatus 360 Detail', description: 'Deep operational detail for a single apparatus record shared across the platform.' },
    assetInventory: { eyebrow: 'Asset & Logistics Readiness', title: 'Equipment / Asset Inventory', description: 'Track assigned equipment, condition, warranty, readiness impact, and assignment status.' },
    stationInventory: { eyebrow: 'Asset & Logistics Readiness', title: 'Station Inventory', description: 'See supply health and readiness risk by station and apparatus assignment.' },
    maintenance: { eyebrow: 'Asset & Logistics Readiness', title: 'Maintenance Workbench', description: 'Manage maintenance reports, scheduling, completion, and downtime tracking.' },
    preventive: { eyebrow: 'Asset & Logistics Readiness', title: 'Preventive Maintenance Calendar', description: 'Track what is due, overdue, and completed across apparatus and equipment.' },
    transactions: { eyebrow: 'Asset & Logistics Readiness', title: 'Inventory Transactions', description: 'Receive, issue, transfer, consume, and adjust stock with audit trail.' },
    reorder: { eyebrow: 'Asset & Logistics Readiness', title: 'Vendor / Reorder Center', description: 'Review vendors and approve reorder recommendations before readiness slips.' },
    risks: { eyebrow: 'Asset & Logistics Readiness', title: 'Asset Readiness Risks', description: 'Readiness issues, evidence, and recommended corrective actions.' },
  };

  const tabs = [
    { id: 'assets', label: 'Command Center' },
    { id: 'apparatusRegistry', label: 'Apparatus Registry' },
    { id: 'apparatus360', label: 'Apparatus 360' },
    { id: 'assetInventory', label: 'Equipment Inventory' },
    { id: 'stationInventory', label: 'Station Inventory' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'preventive', label: 'Preventive' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'reorder', label: 'Vendors / Reorder' },
    { id: 'risks', label: 'Risks' },
  ];

  const header = headers[page as keyof typeof headers] ?? headers.assets;
  return (
    <>
      <AppHeader {...header} />
      <div className="command-links" style={{ marginBottom: 16 }}>
        <Tabs items={tabs} activeId={page} onChange={(next) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: next } }))} />
      </div>
      {page === 'assets' && <CommandCenter data={data} />}
      {page === 'apparatusRegistry' && <ApparatusRegistryView data={data} selectedId={selectedApparatusId} setSelectedId={setSelectedApparatusId} />}
      {page === 'apparatus360' && <Apparatus360View apparatusId={selectedApparatusId} data={data} />}
      {page === 'assetInventory' && <AssetInventoryView data={data} />}
      {page === 'stationInventory' && <StationInventoryView data={data} />}
      {page === 'maintenance' && <MaintenanceWorkbenchView data={data} />}
      {page === 'preventive' && <PreventiveMaintenanceView data={data} />}
      {page === 'transactions' && <InventoryTransactionsView data={data} />}
      {page === 'reorder' && <VendorReorderView data={data} />}
      {page === 'risks' && <AssetRisksView data={data} />}
    </>
  );
}

export function Assets() {
  return <AssetLogisticsShell page="assets" />;
}

export function ApparatusRegistry() {
  return <AssetLogisticsShell page="apparatusRegistry" />;
}

export function Apparatus360() {
  return <AssetLogisticsShell page="apparatus360" />;
}

export function EquipmentInventory() {
  return <AssetLogisticsShell page="assetInventory" />;
}

export function StationInventory() {
  return <AssetLogisticsShell page="stationInventory" />;
}

export function MaintenanceWorkbench() {
  return <AssetLogisticsShell page="maintenance" />;
}

export function PreventiveMaintenanceCalendar() {
  return <AssetLogisticsShell page="preventive" />;
}

export function InventoryTransactionsPage() {
  return <AssetLogisticsShell page="transactions" />;
}

export function VendorReorderCenter() {
  return <AssetLogisticsShell page="reorder" />;
}

export function AssetReadinessRisks() {
  return <AssetLogisticsShell page="risks" />;
}
