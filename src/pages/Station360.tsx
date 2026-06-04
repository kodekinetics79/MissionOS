import { useEffect, useMemo, useState } from 'react';
import { getApparatus, getAuditLogs, getExpiringPersonnelCertifications, getInventory, getNotifications, getPersonnel, getProperties, getStationAssetSummary, getStationSummary, getStations } from '../services/platformClient';
import { getStationPreventionSummary } from '../services/preventionClient';
import type { Apparatus, AuditLog, InventoryItem, Notification, Personnel, Property, Station } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DetailDrawer } from '../components/DetailDrawer';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { AiInsightPanel } from '../components/AiInsightPanel';
import { OperationalBriefing } from '../components/OperationalBriefing';

type StationSummary = {
  station: Station | null;
  personnelCount: number;
  apparatusCount: number;
  inventoryCount: number;
  openInspections: number;
  expiringCertifications: number;
  incidentCount?: number;
  qaNeededIncidents?: number;
  nerisRejected?: number;
};

export function Station360() {
  const [stations, setStations] = useState<Station[]>([]);
  const [summary, setSummary] = useState<StationSummary | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [apparatus, setApparatus] = useState<Apparatus[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
const [expiring, setExpiring] = useState<Array<{ personnel: Personnel; expiringCount: number; nextExpiryDate: string }>>([]);
const [assetSummary, setAssetSummary] = useState<any>(null);
const [preventionSummary, setPreventionSummary] = useState<any>(null);
const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
const storageKey = 'missionos.station.selectedId';

  useEffect(() => {
    Promise.all([
      getStations(),
      getPersonnel(),
      getApparatus(),
      getInventory(),
      getProperties(),
      getNotifications(),
      getAuditLogs().catch(() => ({ items: [] as AuditLog[] })),
      getExpiringPersonnelCertifications(),
    ]).then(([stationPage, personnelPage, apparatusPage, inventoryPage, propertyPage, notificationPage, auditPage, expiringPage]) => {
      setStations(stationPage.items);
      setPersonnel(personnelPage.items);
      setApparatus(apparatusPage.items);
      setInventory(inventoryPage.items);
      setProperties(propertyPage.items);
      setNotifications(notificationPage.items);
      setAuditLogs(auditPage.items);
      setExpiring(expiringPage);
      setSelectedStationId((current) => current ?? localStorage.getItem(storageKey) ?? stationPage.items[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!selectedStationId) return;
    getStationSummary(selectedStationId).then((result) => setSummary(result as StationSummary));
    getStationAssetSummary(selectedStationId).then((result) => setAssetSummary(result)).catch(() => setAssetSummary(null));
    getStationPreventionSummary(selectedStationId).then((result) => setPreventionSummary(result)).catch(() => setPreventionSummary(null));
  }, [selectedStationId]);

  const selectedStation = useMemo(() => stations.find((station) => station.id === selectedStationId) ?? null, [stations, selectedStationId]);
  const stationPersonnel = useMemo(() => personnel.filter((entry) => entry.currentStationId === selectedStationId || entry.station === selectedStation?.name), [personnel, selectedStationId, selectedStation]);
  const stationApparatus = useMemo(() => apparatus.filter((unit) => unit.stationId === selectedStationId), [apparatus, selectedStationId]);
  const stationInventory = useMemo(() => inventory.filter((item) => item.stationId === selectedStationId), [inventory, selectedStationId]);
  const stationProperties = useMemo(() => properties.filter((property) => property.stationArea === selectedStation?.responseArea || property.city === selectedStation?.city), [properties, selectedStation]);
  const stationNotifications = useMemo(() => notifications.filter((notification) => selectedStation ? notification.message.toLowerCase().includes(selectedStation.name.toLowerCase()) || notification.title.toLowerCase().includes(selectedStation.name.toLowerCase()) : false), [notifications, selectedStation]);
  const stationAuditLogs = useMemo(() => auditLogs.filter((log) => log.entityId === selectedStationId), [auditLogs, selectedStationId]);
  const stationExpiring = useMemo(() => expiring.filter((entry) => entry.personnel.currentStationId === selectedStationId || entry.personnel.station === selectedStation?.name), [expiring, selectedStationId, selectedStation]);
  const inventoryRisk = stationInventory.filter((item) => item.quantity <= item.reorderPoint).length;
  const propertyRisk = stationProperties.filter((property) => String(property.riskLevel).toLowerCase() === 'high' || String(property.riskLevel).toLowerCase() === 'extreme').length;
  const assetReadiness = assetSummary?.assetReadinessScore ?? assetSummary?.overallAssetReadinessScore ?? selectedStation?.readinessScore ?? selectedStation?.readiness ?? 0;

  if (!stations.length || !selectedStation) {
    return <LoadingState label="Loading station 360 view..." />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Station 360"
        title="Station 360 View"
        description="A single operational view of station readiness, battalion coverage, platoon assignment, personnel, apparatus, inventory, risk, and live alerts."
      />

      {selectedStationId && <AiInsightPanel stationId={selectedStationId} title="AI Readiness Insights — Station" />}
      <OperationalBriefing
        eyebrow="What matters now"
        summary={`${selectedStation.name} is the shared operational anchor for the agency story: apparatus readiness, expiring certs, prevention backlog, and response-area risk all roll up here.`}
        bullets={[
          `Readiness score ${summary?.station?.readinessScore ?? selectedStation.readinessScore ?? selectedStation.readiness ?? 0}% with asset readiness ${assetReadiness}%.`,
          `${summary?.personnelCount ?? stationPersonnel.length} personnel, ${summary?.apparatusCount ?? stationApparatus.length} apparatus, and ${stationProperties.length} response-area properties are connected to this station.`,
          `Next action: review inventory risk, verify expiring certifications, and confirm staffing coverage for the next operational period.`,
        ]}
        badge={(selectedStation.status ?? 'Watch') as string}
        actions={<button type="button" className="btn-primary" onClick={() => setSelectedStationId('station-4')}>Focus Station 4</button>}
        evidence={[
          selectedStation.battalion ?? 'Battalion',
          `Inventory risks ${inventoryRisk}`,
          `Prevention ${preventionSummary?.overallPreventionRiskScore ?? preventionSummary?.riskScore ?? 0}`,
          `QA ${summary?.qaNeededIncidents ?? 0}`,
        ]}
      />

      <div className="two-col">
        <SectionCard title="Station selector">
          <div className="stack">
            {stations.map((station) => (
              <button key={station.id} type="button" className={`mini-card selectable ${station.id === selectedStationId ? 'selected' : ''}`} onClick={() => setSelectedStationId(station.id)}>
                <div>
                  <b>{station.name}</b>
                  <span>{station.battalion ?? 'Unassigned'} · {station.city}</span>
                </div>
                <StatusBadge status={station.status} />
              </button>
            ))}
          </div>
        </SectionCard>

        <DetailDrawer title={selectedStation.name} subtitle={`${selectedStation.battalion ?? 'Unassigned'} · ${selectedStation.responseArea ?? 'Response area pending'}`}>
          <div className="profile-panel">
            <div className="profile-head">
              <div>
                <b>{selectedStation.address ?? selectedStation.city}</b>
                <p className="muted">Station {selectedStation.number}</p>
              </div>
              <ReadinessScore score={summary?.station?.readinessScore ?? selectedStation.readinessScore ?? selectedStation.readiness ?? 0} />
            </div>
            <div className="chip-row">
              <span className="mini-chip">Personnel {summary?.personnelCount ?? stationPersonnel.length}</span>
              <span className="mini-chip">Apparatus {summary?.apparatusCount ?? stationApparatus.length}</span>
              <span className="mini-chip">Inventory risks {inventoryRisk}</span>
              <span className="mini-chip">Certification risks {summary?.expiringCertifications ?? stationExpiring.length}</span>
            </div>
            <div className="mini-note">Next action: review inventory risk, verify expiring certifications, and confirm staffing coverage for the next operational period.</div>
          </div>
        </DetailDrawer>
      </div>

      <div className="stats-grid">
        <SectionCard title="Current readiness">
          <ReadinessScore score={summary?.station?.readinessScore ?? selectedStation.readinessScore ?? selectedStation.readiness ?? 0} label="Readiness" />
          <div className="mini-note" style={{ marginTop: 12 }}>Asset readiness: {assetReadiness}% · {assetSummary?.riskLevel ?? 'Watch'} · {assetSummary?.maintenanceBacklog ?? 0} maintenance item(s)</div>
        </SectionCard>
        <SectionCard title="Inventory risk">
          <div className="stack">
            <div className="mini-card"><span>Items at/below reorder</span><b>{inventoryRisk}</b></div>
            <div className="mini-card"><span>Total inventory items</span><b>{stationInventory.length}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Certification risk">
          <div className="stack">
            <div className="mini-card"><span>Expiring within 30 days</span><b>{stationExpiring.length}</b></div>
            <div className="mini-card"><span>Open inspections</span><b>{summary?.openInspections ?? 0}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Property risk">
          <div className="stack">
            <div className="mini-card"><span>High-risk occupancies</span><b>{propertyRisk}</b></div>
            <div className="mini-card"><span>Properties in response area</span><b>{stationProperties.length}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Prevention risk">
          <div className="stack">
            <div className="mini-card"><span>Prevention score</span><b>{preventionSummary?.overallPreventionRiskScore ?? preventionSummary?.riskScore ?? 0}</b></div>
            <div className="mini-card"><span>Open violations</span><b>{preventionSummary?.openViolationCount ?? 0}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Incident load">
          <div className="stack">
            <div className="mini-card"><span>Incidents this station</span><b>{summary?.incidentCount ?? 0}</b></div>
            <div className="mini-card"><span>QA-needed incidents</span><b>{summary?.qaNeededIncidents ?? 0}</b></div>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Assigned personnel">
          <div className="stack">
            {stationPersonnel.slice(0, 8).map((entry) => (
              <article className="mini-card" key={entry.id}>
                <div>
                  <b>{entry.name ?? `${entry.firstName} ${entry.lastName}`}</b>
                  <span>{entry.rank} · Platoon {entry.platoon ?? 'n/a'}</span>
                </div>
                <StatusBadge status={entry.status ?? 'Healthy'} />
              </article>
            ))}
            {!stationPersonnel.length && <EmptyState title="No personnel loaded" description="This station has no rostered personnel in the shared master data yet." />}
          </div>
        </SectionCard>

        <SectionCard title="Assigned apparatus">
          <div className="stack">
            {stationApparatus.map((unit) => (
              <article className="mini-card" key={unit.id}>
                <div>
                  <b>{unit.unitNumber}</b>
                  <span>{unit.apparatusType}</span>
                </div>
                <StatusBadge status={unit.status} />
              </article>
            ))}
            {!stationApparatus.length && <EmptyState title="No apparatus assigned" description="This station has no apparatus records in the shared foundation yet." />}
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Inventory watchlist">
          <div className="stack">
            {stationInventory.slice(0, 8).map((item) => (
              <article className="mini-card" key={item.id}>
                <div>
                  <b>{item.name}</b>
                  <span>{item.category} · Qty {item.quantity} {item.unit}</span>
                </div>
                <StatusBadge status={item.quantity <= item.reorderPoint ? 'Warning' : 'Healthy'} />
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent activity">
          <div className="stack">
            {stationNotifications.slice(0, 4).map((notification) => (
              <article className="mini-card" key={notification.id}>
                <div>
                  <b>{notification.title}</b>
                  <span>{notification.message}</span>
                </div>
                <StatusBadge status={notification.isRead ? 'Healthy' : 'Warning'} />
              </article>
            ))}
            {stationAuditLogs.slice(0, 4).map((log) => (
              <article className="mini-card" key={log.id}>
                <div>
                  <b>{log.action}</b>
                  <span>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</span>
                </div>
                <StatusBadge status="Healthy" />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
