import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, MapPinned, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react';
import { DetailDrawer } from '../components/DetailDrawer';
import { EmptyState } from '../components/EmptyState';
import { FilterBar } from '../components/FilterBar';
import { LoadingState } from '../components/LoadingState';
import { PageHeader } from '../components/PageHeader';
import { ReadinessScore } from '../components/ReadinessScore';
import { SectionCard } from '../components/SectionCard';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { Tabs } from '../components/Tabs';
import { OperationalBriefing } from '../components/OperationalBriefing';
import {
  activatePreplan,
  addInspectionChecklistItem,
  approvePermit,
  closeInspection,
  completeInspection,
  getCorrectiveActions,
  createCorrectiveAction,
  createHazard,
  createHydrant,
  createInspection,
  createOccupancy,
  createPermit,
  createPreplan,
  createProperty,
  createViolation,
  denyPermit,
  escalateViolation,
  getCriticalHazards,
  getCriticalViolations,
  getExpiringPermits,
  getHazards,
  getHydrantIssues,
  getHydrants,
  getInspectionChecklist,
  getInspections,
  getOccupancies,
  getOpenViolations,
  getOverdueInspections,
  getPermitBacklog,
  getPermits,
  getPreplans,
  getPreplansIncomplete,
  getPreplansReviewDue,
  getPreventionCommandCenter,
  getPreventionReadinessImpact,
  getPreventionRisks,
  getPrioritizedInspections,
  getProperties,
  getViolations,
  getProperty360,
  getPropertyInspections,
  getPropertyPermits,
  getPropertyPreplans,
  getPropertyRisk,
  getPropertyViolations,
  getCriticalHazards as getCriticalPreventionHazards,
  getStationPreventionSummary,
  markPreplanReviewDue,
  requestPermitInfo,
  resolveViolation,
  startInspection,
  updateInspection,
  updateOccupancy,
  updatePermit,
  updatePreplan,
  updateProperty,
  updateViolation,
  reviewPermit,
} from '../services/preventionClient';

const checklistCategories = [
  'Access / egress',
  'Fire alarm',
  'Sprinkler system',
  'Electrical hazards',
  'Storage / combustibles',
  'Exit signage',
  'Fire extinguishers',
  'Hazardous materials',
  'Occupant load',
  'KnoxBox / key access',
];

const pageTabs = [
  { id: 'prevention', label: 'Command Center' },
  { id: 'properties', label: 'Property Registry' },
  { id: 'property360', label: 'Property 360' },
  { id: 'inspections', label: 'Inspection Queue' },
  { id: 'mobile', label: 'Mobile Inspection' },
  { id: 'violations', label: 'Violations' },
  { id: 'permits', label: 'Permits' },
  { id: 'preplans', label: 'Preplans' },
  { id: 'hazards', label: 'Hydrants & Hazards' },
  { id: 'risks', label: 'Risk Center' },
];

function routeTo(route: string) {
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
}

function openProperty(id: string) {
  localStorage.setItem('missionos.prevention.selectedPropertyId', id);
  window.dispatchEvent(new CustomEvent('missionos:open-property-360', { detail: { propertyId: id } }));
}

function riskLabel(score: number) {
  if (score >= 90) return 'Low';
  if (score >= 75) return 'Moderate';
  if (score >= 60) return 'High';
  return 'Critical';
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function useSelectedId(storageKey: string, fallbackId?: string | null) {
  const [selectedId, setSelectedId] = useState<string | null>(localStorage.getItem(storageKey) ?? fallbackId ?? null);
  useEffect(() => {
    if (!selectedId && fallbackId) {
      setSelectedId(fallbackId);
      localStorage.setItem(storageKey, fallbackId);
    }
  }, [fallbackId, selectedId, storageKey]);
  const select = (id: string) => {
    setSelectedId(id);
    localStorage.setItem(storageKey, id);
  };
  return [selectedId, select] as const;
}

function usePreventionData() {
  const [commandCenter, setCommandCenter] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [inspections, setInspections] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [permits, setPermits] = useState<any[]>([]);
  const [preplans, setPreplans] = useState<any[]>([]);
  const [hydrants, setHydrants] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      getPreventionCommandCenter(),
      getProperties(),
      getPrioritizedInspections(),
      getOpenViolations(),
      getPermitBacklog(),
      getPreplansReviewDue(),
      getHydrants(),
      getHazards(),
      getPreventionRisks(),
      getPreventionReadinessImpact(),
    ]).then(([center, propertyPage, inspectionList, openViolationList, permitBacklog, reviewDuePreplans, hydrantPage, hazardPage, riskList, readinessImpact]) => {
      setCommandCenter(center);
      setProperties(propertyPage.items ?? []);
      setInspections(inspectionList ?? []);
      setViolations(openViolationList ?? []);
      setPermits(permitBacklog ?? []);
      setPreplans(reviewDuePreplans ?? []);
      setHydrants(hydrantPage.items ?? []);
      setHazards(hazardPage.items ?? []);
      setRisks(riskList ?? []);
      setReadiness(readinessImpact);
    });
  }, []);

  return { commandCenter, properties, inspections, violations, permits, preplans, hydrants, hazards, risks, readiness };
}

export function Prevention() {
  const { commandCenter, properties, risks, readiness } = usePreventionData();
  const riskCards = useMemo(() => (risks ?? []).slice(0, 6), [risks]);

  if (!commandCenter) {
    return <LoadingState label="Loading prevention command center..." />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Prevention & Community Risk"
        title="Inspections, permits, violations, preplans, occupancies, hazards, and risk-based prevention workflows."
        description="Fire marshal command center for the agency's property risk, inspection backlog, permit cycle, hydrant status, and prevention readiness."
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="The prevention command center prioritizes overdue inspections, open violations, permit backlog, incomplete preplans, and hydrant issues so the Fire Marshal knows what to inspect first."
        bullets={[
          `${commandCenter.summary.overdueInspections} overdue inspection(s) and ${commandCenter.summary.openCriticalViolations} critical violation(s) need immediate attention.`,
          `${commandCenter.summary.permitBacklog} permit application(s) and ${commandCenter.summary.preplansDue} preplan(s) are in the review queue.`,
          `Station workload and property risk now roll up into one readiness impact score across the agency.`,
        ]}
        badge={commandCenter.summary.overallRiskLevel}
        actions={<button type="button" className="btn-primary" onClick={() => routeTo('prevention-inspections')}>Open inspection queue</button>}
        evidence={['Property 360', 'Inspection queue', 'Permit pipeline', 'Preplan review', 'Hydrant risk']}
      />
      <Tabs items={pageTabs} activeId="prevention" onChange={routeTo} />
      <div className="stats-grid">
        <StatCard label="Overall Risk" value={`${commandCenter.summary.overallPreventionRiskScore}%`} hint={commandCenter.summary.overallRiskLevel} icon={<ShieldAlert />} />
        <StatCard label="Overdue Inspections" value={commandCenter.summary.overdueInspections} hint="Needs first-pass action" icon={<ClipboardList />} />
        <StatCard label="Critical Violations" value={commandCenter.summary.openCriticalViolations} hint="High priority closure" icon={<TriangleAlert />} />
        <StatCard label="Permit Backlog" value={commandCenter.summary.permitBacklog} hint="Review queue" icon={<ClipboardCheck />} />
        <StatCard label="Preplans Due" value={commandCenter.summary.preplansDue} hint="Review due / incomplete" icon={<MapPinned />} />
        <StatCard label="Hydrant Issues" value={commandCenter.summary.hydrantIssues} hint="Water supply risk" icon={<AlertTriangle />} />
      </div>

      <div className="two-col">
        <SectionCard title="AI recommended actions">
          <div className="stack">
            {commandCenter.aiRecommendedActions.map((action: string) => (
              <div className="mini-card" key={action}>
                <b>{action}</b>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Station prevention workload">
          <div className="stack">
            {commandCenter.stationWorkload.slice(0, 5).map((station: any) => (
              <article className="mini-card" key={station.id}>
                <div>
                  <b>{station.name}</b>
                  <span>{station.propertyCount} properties · {station.inspectionCount} inspections · {station.openViolationCount} open violations</span>
                </div>
                <StatusBadge status={riskLabel(Number(station.preventionRiskScore ?? 0))} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Top property risks">
          <div className="stack">
            {commandCenter.properties.slice(0, 6).map((property: any) => (
              <article className="mini-card selectable" key={property.id} onClick={() => { openProperty(property.id); routeTo('prevention-property'); }}>
                <div>
                  <b>{property.name}</b>
                  <span>{property.addressLine1 ?? property.address} · {property.city}</span>
                </div>
                <StatusBadge status={property.riskLevel} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Risk snapshot">
          <div className="stack">
            <div className="mini-card"><span>District prevention score</span><b>{readiness?.agencyPreventionRiskScore ?? commandCenter.summary.overallPreventionRiskScore}</b></div>
            <div className="mini-card"><span>Station average</span><b>{readiness?.stationSummaries?.length ? Math.round(readiness.stationSummaries.reduce((sum: number, item: any) => sum + Number(item.overallPreventionRiskScore ?? 0), 0) / readiness.stationSummaries.length) : commandCenter.summary.stationWorkloadAverage}</b></div>
            <div className="mini-card"><span>Properties at critical risk</span><b>{readiness?.topRisks?.filter((item: any) => item.severity === 'Critical').length ?? commandCenter.readinessImpact?.propertiesAtCriticalRisk ?? 0}</b></div>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Recent risks">
          <div className="stack">
            {riskCards.map((risk: any) => (
              <article className="mini-card" key={risk.id}>
                <div>
                  <b>{risk.title}</b>
                  <span>{risk.source} · {risk.evidenceSummary}</span>
                </div>
                <StatusBadge status={risk.severity} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Quick actions">
          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => routeTo('prevention-properties')}>Open property registry</button>
            <button type="button" onClick={() => routeTo('prevention-inspections')}>Prioritize inspections</button>
            <button type="button" onClick={() => routeTo('prevention-permits')}>Review permit queue</button>
            <button type="button" onClick={() => routeTo('prevention-preplans')}>Review preplans</button>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Hydrant and hazard pressure">
          <div className="stack">
            <div className="mini-card"><span>Hydrant issues</span><b>{commandCenter.summary.hydrantIssues}</b></div>
            <div className="mini-card"><span>Hazards active</span><b>{commandCenter.summary.activeHazards}</b></div>
            <div className="mini-card"><span>Preplans incomplete</span><b>{commandCenter.summary.incompletePreplans}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Recent activity">
          <div className="stack">
            {commandCenter.recentActivity.slice(0, 5).map((entry: any) => (
              <article className="mini-card" key={entry.id}>
                <div>
                  <b>{entry.title ?? entry.action}</b>
                  <span>{entry.message ?? entry.createdAt ? formatDate(entry.createdAt) : '—'}</span>
                </div>
                <StatusBadge status={entry.status ?? 'Healthy'} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function PropertyRegistry() {
  const [filters, setFilters] = useState({ search: '', stationId: '', riskLevel: '' });
  const [pageData, setPageData] = useState<any>({ items: [], total: 0 });
  const [selectedId, setSelectedId] = useSelectedId('missionos.prevention.selectedPropertyId', null);
  const [properties, setProperties] = useState<any[]>([]);
  const selectedProperty = useMemo(() => properties.find((property) => property.id === selectedId) ?? null, [properties, selectedId]);

  useEffect(() => {
    getProperties(filters).then((result) => {
      setPageData(result);
      setProperties(result.items ?? []);
      if (!selectedId && result.items?.[0]?.id) setSelectedId(result.items[0].id);
    });
  }, [filters]);

  return (
    <>
      <PageHeader eyebrow="Property / Occupancy Registry" title="Properties, occupancies, and community risk" description="Search and filter response-area properties, then open the 360 view for inspections, permits, preplans, and risk." />
      <FilterBar>
        <input placeholder="Search property" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        <input placeholder="Station ID" value={filters.stationId} onChange={(event) => setFilters((current) => ({ ...current, stationId: event.target.value }))} />
        <select value={filters.riskLevel} onChange={(event) => setFilters((current) => ({ ...current, riskLevel: event.target.value }))}>
          <option value="">All risks</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>
      </FilterBar>
      <div className="two-col">
        <SectionCard title={`Properties (${pageData.total ?? 0})`}>
          <div className="stack">
            {properties.map((property) => (
              <article key={property.id} className={`mini-card selectable ${selectedId === property.id ? 'selected' : ''}`} onClick={() => setSelectedId(property.id)}>
                <div>
                  <b>{property.name}</b>
                  <span>{property.addressLine1 ?? property.address} · {property.city}</span>
                  <span>{property.responseStationId ?? property.stationArea}</span>
                </div>
                <div className="stack">
                  <StatusBadge status={property.riskLevel} />
                  <button type="button" onClick={(event) => { event.stopPropagation(); openProperty(property.id); routeTo('prevention-property'); }}>Open 360 View</button>
                </div>
              </article>
            ))}
            {!properties.length && <EmptyState title="No properties found" description="Try widening the filters or syncing the prevention data feed." />}
          </div>
        </SectionCard>
        <DetailDrawer title={selectedProperty?.name ?? 'Select a property'} subtitle={selectedProperty ? `${selectedProperty.addressLine1 ?? selectedProperty.address} · ${selectedProperty.city}` : 'A property detail panel appears here.'}>
          {selectedProperty ? (
            <div className="profile-panel">
              <div className="chip-row">
                <span className="mini-chip">Risk {selectedProperty.riskLevel}</span>
                <span className="mini-chip">Station {selectedProperty.responseStationId ?? selectedProperty.stationArea}</span>
                <span className="mini-chip">Type {selectedProperty.propertyType ?? selectedProperty.occupancyType}</span>
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => { openProperty(selectedProperty.id); routeTo('prevention-property'); }}>Open 360</button>
                <button type="button" onClick={() => routeTo('prevention-inspections')}>Queue inspection</button>
              </div>
              <div className="mini-note">Next action: inspect, review preplan completeness, and clear any open permit or violation items.</div>
            </div>
          ) : <EmptyState title="No property selected" description="Pick a property from the registry to review the risk detail." />}
        </DetailDrawer>
      </div>
    </>
  );
}

export function Property360() {
  const [propertyId, setPropertyId] = useSelectedId('missionos.prevention.selectedPropertyId', null);
  const [detail, setDetail] = useState<any>(null);
  const [propertyList, setPropertyList] = useState<any[]>([]);

  useEffect(() => {
    getProperties().then((result) => {
      setPropertyList(result.items ?? []);
      if (!propertyId && result.items?.[0]?.id) setPropertyId(result.items[0].id);
    });
  }, []);

  useEffect(() => {
    if (!propertyId) return;
    getProperty360(propertyId).then(setDetail);
  }, [propertyId]);

  const property = detail?.property ?? propertyList.find((item) => item.id === propertyId) ?? null;

  if (!property) return <LoadingState label="Loading property 360..." />;

  return (
    <>
      <PageHeader eyebrow="Property 360" title={property.name} description={`${property.addressLine1 ?? property.address} · ${property.city}`} />
      <div className="stats-grid">
        <StatCard label="Risk level" value={detail?.readiness?.riskLevel ?? property.riskLevel} hint={detail?.readiness?.recommendedAction ?? 'Monitor prevention actions'} icon={<ShieldAlert />} />
        <StatCard label="Inspections" value={detail?.inspections?.length ?? 0} hint="Scheduled and completed" icon={<ClipboardList />} />
        <StatCard label="Violations" value={detail?.violations?.length ?? 0} hint="Open / closed" icon={<TriangleAlert />} />
        <StatCard label="Permits" value={detail?.permits?.length ?? 0} hint="Active review lifecycle" icon={<ClipboardCheck />} />
        <StatCard label="Preplans" value={detail?.preplans?.length ?? 0} hint="Tactical readiness" icon={<MapPinned />} />
        <StatCard label="Hydrants" value={detail?.hydrants?.length ?? 0} hint="Water supply" icon={<AlertTriangle />} />
      </div>

      <div className="two-col">
        <SectionCard title="Property profile">
          <div className="stack">
            <div className="mini-card"><span>Construction</span><b>{property.constructionType ?? 'Unknown'}</b></div>
            <div className="mini-card"><span>Square footage / stories</span><b>{property.squareFootage ?? '—'} / {property.stories ?? '—'}</b></div>
            <div className="mini-card"><span>Sprinkler / alarm / KnoxBox</span><b>{String(property.sprinklered ?? false)} / {String(property.alarmSystem ?? false)} / {String(property.KnoxBox ?? false)}</b></div>
            <div className="mini-card"><span>Fire flow requirement</span><b>{property.fireFlowRequirement ?? '—'} GPM</b></div>
            <div className="mini-card"><span>Contacts</span><b>{detail?.contacts?.length ?? 0}</b></div>
          </div>
        </SectionCard>
        <DetailDrawer title="Prevention insight" subtitle={detail?.readiness?.riskLevel ?? 'Risk summary'}>
          <div className="profile-panel">
            <ReadinessScore score={detail?.property?.riskScore ?? property.riskScore ?? 0} label="Prevention risk" />
            <div className="mini-note">{detail?.readiness?.evidenceSummary ?? 'No risk summary loaded.'}</div>
            <div className="action-row">
              <button className="primary-button" type="button" onClick={() => routeTo('prevention-inspections')}>Schedule inspection</button>
              <button type="button" onClick={() => routeTo('prevention-preplans')}>Review preplan</button>
            </div>
          </div>
        </DetailDrawer>
      </div>

      <div className="two-col">
        <SectionCard title="Inspection history">
          <div className="stack">
            {(detail?.inspections ?? []).map((inspection: any) => (
              <article key={inspection.id} className="mini-card">
                <div>
                  <b>{inspection.inspectionType}</b>
                  <span>{inspection.status} · {formatDate(inspection.scheduledDate ?? inspection.scheduledAt)}</span>
                </div>
                <StatusBadge status={inspection.status} />
              </article>
            ))}
            {!detail?.inspections?.length && <EmptyState title="No inspections" description="This property has no inspection records in the shared data yet." />}
          </div>
        </SectionCard>
        <SectionCard title="Violations and corrective actions">
          <div className="stack">
            {(detail?.violations ?? []).map((violation: any) => (
              <article key={violation.id} className="mini-card">
                <div>
                  <b>{violation.title}</b>
                  <span>{violation.codeReference} · Due {formatDate(violation.dueDate)}</span>
                </div>
                <StatusBadge status={violation.status} />
              </article>
            ))}
            {!detail?.violations?.length && <EmptyState title="No violations" description="No active violations are tied to this property." />}
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Permits">
          <div className="stack">
            {(detail?.permits ?? []).map((permit: any) => (
              <article key={permit.id} className="mini-card">
                <div>
                  <b>{permit.permitNumber}</b>
                  <span>{permit.permitType} · {permit.status}</span>
                </div>
                <StatusBadge status={permit.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Preplans, hydrants, hazards">
          <div className="stack">
            <div className="mini-card"><span>Preplans</span><b>{detail?.preplans?.length ?? 0}</b></div>
            <div className="mini-card"><span>Hydrants nearby</span><b>{detail?.hydrants?.length ?? 0}</b></div>
            <div className="mini-card"><span>Hazards</span><b>{detail?.hazards?.length ?? 0}</b></div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Incident history">
        <div className="stack">
          {(detail?.incidentHistory ?? []).slice(0, 5).map((incident: any) => (
            <article key={incident.id} className="mini-card">
              <div>
                <b>{incident.incidentNumber}</b>
                <span>{incident.incidentType} · {incident.status}</span>
              </div>
              <StatusBadge status={incident.qaStatus ?? incident.status} />
            </article>
          ))}
          {!detail?.incidentHistory?.length && <EmptyState title="No linked incidents" description="Incident location history will populate here as the RMS data links to this property." />}
        </div>
      </SectionCard>
    </>
  );
}

export function InspectionQueue() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { getPrioritizedInspections().then((result) => { setItems(result ?? []); setSelectedId((current) => current ?? result?.[0]?.id ?? null); }); }, []);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  if (!items.length) return <LoadingState label="Loading inspection queue..." />;
  return (
    <>
      <PageHeader eyebrow="Inspection Queue" title="Risk-based inspection prioritization" description="Inspect the highest-risk occupancies first, then move through the overdue and open-violation queue." />
      <div className="two-col">
        <SectionCard title="Priority queue">
          <div className="stack">
            {items.slice(0, 18).map((inspection) => (
              <article key={inspection.id} className={`mini-card selectable ${selectedId === inspection.id ? 'selected' : ''}`} onClick={() => setSelectedId(inspection.id)}>
                <div>
                  <b>{inspection.propertyName}</b>
                  <span>{inspection.inspectionType} · {inspection.address}</span>
                  <span>Reason: {inspection.priorityReason} · Overdue days: {inspection.overdueDays}</span>
                </div>
                <div className="stack">
                  <ReadinessScore score={inspection.riskScore} label="" />
                  <StatusBadge status={inspection.status} />
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
        <DetailDrawer title={selected?.propertyName ?? 'Inspection detail'} subtitle={selected ? `${selected.inspectionType} · ${selected.address}` : 'Select an inspection'}>
          {selected ? (
            <div className="profile-panel">
              <div className="chip-row">
                <span className="mini-chip">Risk {selected.riskScore}</span>
                <span className="mini-chip">Open violations {selected.openViolations}</span>
                <span className="mini-chip">Overdue {selected.overdueDays}</span>
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => startInspection(selected.id)}>Start</button>
                <button type="button" onClick={() => completeInspection(selected.id, { result: 'Passed' })}>Complete</button>
                <button type="button" onClick={() => updateInspection(selected.id, { scheduledDate: new Date(Date.now() + 7 * 86400000).toISOString() })}>Reschedule</button>
                <button type="button" onClick={() => routeTo('prevention-mobile')}>Open checklist</button>
              </div>
              <div className="mini-note">Next action: inspect the highest-risk property, capture checklist findings, and create violations for failed items.</div>
            </div>
          ) : null}
        </DetailDrawer>
      </div>
    </>
  );
}

export function MobileInspectionForm() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  useEffect(() => { getPrioritizedInspections().then((result) => { setItems(result ?? []); setSelectedId((current) => current ?? result?.[0]?.id ?? null); }); }, []);
  useEffect(() => { if (!selectedId) return; getInspectionChecklist(selectedId).then(setChecklist); }, [selectedId]);
  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  if (!items.length) return <LoadingState label="Loading mobile inspection form..." />;
  return (
    <>
      <PageHeader eyebrow="Mobile Inspection Form" title="Tablet-friendly inspection workflow" description="Complete a prevention inspection from the cab or field with checklist categories, photo capture, and follow-up actions." />
      <div className="two-col">
        <SectionCard title="Inspection selector">
          <div className="stack">
            {items.slice(0, 10).map((inspection) => (
              <button key={inspection.id} type="button" className={`mini-card selectable ${selectedId === inspection.id ? 'selected' : ''}`} onClick={() => setSelectedId(inspection.id)}>
                <div>
                  <b>{inspection.propertyName}</b>
                  <span>{inspection.inspectionType} · {inspection.status}</span>
                </div>
                <StatusBadge status={inspection.status} />
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title={selected?.propertyName ?? 'Inspection'}>
          <div className="stack">
            <div className="mini-card"><span>Type</span><b>{selected?.inspectionType ?? '—'}</b></div>
            <div className="mini-card"><span>Property</span><b>{selected?.address ?? '—'}</b></div>
            <div className="mini-card"><span>Checklist categories</span><b>{checklistCategories.length}</b></div>
            <textarea rows={4} placeholder="Inspection notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <div className="action-row">
              <button className="primary-button" type="button" onClick={() => addInspectionChecklistItem(selectedId ?? '', { category: 'Access / egress', requirement: 'Access meets standard', result: 'Fail', notes: notes || 'Field note', requiresCorrection: true })}>Save draft</button>
              <button type="button" onClick={() => completeInspection(selectedId ?? '', { notes, result: 'Failed' })}>Complete inspection</button>
              <button type="button" onClick={() => createViolation({ inspectionId: selectedId, propertyId: selected?.propertyId, title: 'Follow-up violation', description: 'Created from failed checklist item.', severity: 'High', dueDate: new Date(Date.now() + 14 * 86400000).toISOString() })}>Add violation</button>
            </div>
            <div className="mini-note">Mobile inspection controls are optimized for quick pass/fail decisions and immediate corrective follow-up.</div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function InspectionChecklist() {
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);
  useEffect(() => { getPrioritizedInspections().then((result) => { setItems(result ?? []); setSelectedId((current) => current ?? result?.[0]?.id ?? null); }); }, []);
  useEffect(() => { if (!selectedId) return; getInspectionChecklist(selectedId).then(setChecklist); }, [selectedId]);
  return (
    <>
      <PageHeader eyebrow="Inspection Checklist" title="Checklist and corrective-action detail" description="Open the inspection checklist for a selected property and track pass/fail results with evidence." />
      <div className="two-col">
        <SectionCard title="Inspection selector">
          <div className="stack">
            {items.slice(0, 10).map((inspection) => (
              <button key={inspection.id} type="button" className={`mini-card selectable ${selectedId === inspection.id ? 'selected' : ''}`} onClick={() => setSelectedId(inspection.id)}>
                <div>
                  <b>{inspection.propertyName}</b>
                  <span>{inspection.inspectionType}</span>
                </div>
                <StatusBadge status={inspection.status} />
              </button>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Checklist results">
          <div className="stack">
            {checklist.map((item) => (
              <article key={item.id} className="mini-card">
                <div>
                  <b>{item.category}</b>
                  <span>{item.requirement}</span>
                </div>
                <StatusBadge status={item.result} />
              </article>
            ))}
            {!checklist.length && <EmptyState title="No checklist items" description="Checklist items will appear for the selected inspection." />}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function ViolationsCorrectiveActions() {
  const [violations, setViolations] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  useEffect(() => { Promise.all([getViolations(), getCorrectiveActions()]).then(([violationPage, actionList]) => { setViolations(violationPage.items ?? []); setActions(actionList ?? []); }); }, []);
  return (
    <>
      <PageHeader eyebrow="Violations & Corrective Actions" title="Enforce, track, and close out code issues" description="Monitor severity, due dates, reinspection requirements, and corrective-action completion." />
      <div className="two-col">
        <SectionCard title="Violation board">
          <div className="stack">
            {violations.slice(0, 20).map((violation) => (
              <article key={violation.id} className="mini-card">
                <div>
                  <b>{violation.title}</b>
                  <span>{violation.codeReference} · {violation.propertyName}</span>
                  <span>Due {formatDate(violation.dueDate)} · {violation.status}</span>
                </div>
                <div className="stack">
                  <StatusBadge status={violation.severity} />
                  <button type="button" onClick={() => resolveViolation(violation.id)}>Resolve</button>
                  <button type="button" onClick={() => escalateViolation(violation.id)}>Escalate</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Corrective actions">
          <div className="stack">
            {actions.slice(0, 20).map((action) => (
              <article key={action.id} className="mini-card">
                <div>
                  <b>{action.actionDescription}</b>
                  <span>Due {formatDate(action.dueDate)} · {action.assignedToName ?? 'Unassigned'}</span>
                </div>
                <StatusBadge status={action.status} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function PermitCenter() {
  const [permits, setPermits] = useState<any[]>([]);
  useEffect(() => { getPermits().then((result) => setPermits(result.items ?? [])); }, []);
  return (
    <>
      <PageHeader eyebrow="Permit Center" title="Permit lifecycle pipeline" description="Review submissions, request information, approve, deny, and close permits tied to properties and occupancies." />
      <div className="stack">
        {permits.slice(0, 20).map((permit) => (
          <article key={permit.id} className="mini-card">
            <div>
              <b>{permit.permitNumber}</b>
              <span>{permit.permitType} · {permit.propertyName}</span>
              <span>Submitted {formatDate(permit.submittedDate)} · Review due {formatDate(permit.reviewDueDate)}</span>
            </div>
            <div className="stack">
              <StatusBadge status={permit.status} />
              <button type="button" onClick={() => reviewPermit(permit.id, { reviewStage: 'Technical Review', status: 'In Review', comments: 'Reviewed from permit center' })}>Review</button>
              <button type="button" onClick={() => requestPermitInfo(permit.id)}>Request info</button>
              <button type="button" onClick={() => approvePermit(permit.id)}>Approve</button>
              <button type="button" onClick={() => denyPermit(permit.id)}>Deny</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function PreplanLibrary() {
  const [preplans, setPreplans] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useSelectedId('missionos.prevention.selectedPreplanId', null);
  const selected = useMemo(() => preplans.find((item) => item.id === selectedId) ?? null, [preplans, selectedId]);
  useEffect(() => { getPreplans().then((result) => { setPreplans(result.items ?? []); if (!selectedId && result.items?.[0]?.id) setSelectedId(result.items[0].id); }); }, []);
  return (
    <>
      <PageHeader eyebrow="Preplan Library" title="Operational preplans and tactical notes" description="Review preplan completeness, due dates, and attachments before the next response cycle." />
      <div className="two-col">
        <SectionCard title="Preplans">
          <div className="stack">
            {preplans.slice(0, 20).map((preplan) => (
              <button key={preplan.id} type="button" className={`mini-card selectable ${selectedId === preplan.id ? 'selected' : ''}`} onClick={() => setSelectedId(preplan.id)}>
                <div>
                  <b>{preplan.title}</b>
                  <span>{preplan.propertyName} · Review due {formatDate(preplan.nextReviewDue)}</span>
                </div>
                <StatusBadge status={preplan.status} />
              </button>
            ))}
          </div>
        </SectionCard>
        <DetailDrawer title={selected?.title ?? 'Preplan detail'} subtitle={selected ? `${selected.propertyName} · ${selected.status}` : 'Select a preplan'}>
          {selected ? (
            <div className="profile-panel">
              <div className="stack">
                <div className="mini-card"><span>Access notes</span><b>{selected.accessNotes ?? '—'}</b></div>
                <div className="mini-card"><span>Water supply</span><b>{selected.waterSupplyNotes ?? '—'}</b></div>
                <div className="mini-card"><span>Tactical notes</span><b>{selected.tacticalNotes ?? '—'}</b></div>
                <div className="mini-card"><span>Completeness</span><b>{selected.completenessScore ?? 0}%</b></div>
              </div>
              <div className="action-row">
                <button className="primary-button" type="button" onClick={() => activatePreplan(selected.id)}>Activate</button>
                <button type="button" onClick={() => markPreplanReviewDue(selected.id)}>Mark review due</button>
                <button type="button" onClick={() => updatePreplan(selected.id, { status: 'Draft' })}>Edit</button>
              </div>
            </div>
          ) : null}
        </DetailDrawer>
      </div>
    </>
  );
}

export function PreplanDetail() {
  const [preplans, setPreplans] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useSelectedId('missionos.prevention.selectedPreplanId', null);
  const selected = useMemo(() => preplans.find((item) => item.id === selectedId) ?? null, [preplans, selectedId]);
  useEffect(() => { getPreplans().then((result) => { setPreplans(result.items ?? []); if (!selectedId && result.items?.[0]?.id) setSelectedId(result.items[0].id); }); }, []);
  if (!selected) return <LoadingState label="Loading preplan detail..." />;
  return (
    <>
      <PageHeader eyebrow="Preplan Detail" title={selected.title} description={`${selected.propertyName} · ${selected.status}`} />
      <div className="two-col">
        <SectionCard title="Tactical detail">
          <div className="stack">
            <div className="mini-card"><span>Access</span><b>{selected.accessNotes}</b></div>
            <div className="mini-card"><span>Water supply</span><b>{selected.waterSupplyNotes}</b></div>
            <div className="mini-card"><span>Roof access</span><b>{selected.roofAccessNotes}</b></div>
            <div className="mini-card"><span>Utility shutoff</span><b>{selected.utilityShutoffNotes}</b></div>
            <div className="mini-card"><span>Attachments</span><b>{selected.attachments?.length ?? 0}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Review workflow">
          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => activatePreplan(selected.id)}>Activate</button>
            <button type="button" onClick={() => markPreplanReviewDue(selected.id)}>Mark review due</button>
            <button type="button" onClick={() => updatePreplan(selected.id, { notes: 'Updated from detail view' })}>Update notes</button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export function HydrantsHazards() {
  const [hydrants, setHydrants] = useState<any[]>([]);
  const [hazards, setHazards] = useState<any[]>([]);
  useEffect(() => { Promise.all([getHydrants(), getCriticalHazards()]).then(([hydrantPage, hazardList]) => { setHydrants(hydrantPage.items ?? []); setHazards(hazardList ?? []); }); }, []);
  return (
    <>
      <PageHeader eyebrow="Hydrants & Hazards" title="Water supply and hazard visibility" description="Track hydrant status, flow, and prevention hazards with GIS-linked field reference." />
      <div className="two-col">
        <SectionCard title="Hydrants">
          <div className="stack">
            {hydrants.slice(0, 20).map((hydrant) => (
              <article key={hydrant.id} className="mini-card">
                <div>
                  <b>{hydrant.hydrantNumber}</b>
                  <span>{hydrant.status} · Flow {hydrant.flowRateGpm ?? '—'} GPM · Due {formatDate(hydrant.nextInspectionDue)}</span>
                </div>
                <StatusBadge status={hydrant.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Hazards">
          <div className="stack">
            {hazards.slice(0, 20).map((hazard) => (
              <article key={hazard.id} className="mini-card">
                <div>
                  <b>{hazard.title}</b>
                  <span>{hazard.hazardType} · {hazard.locationDescription}</span>
                </div>
                <StatusBadge status={hazard.severity} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="GIS / map view">
        <div className="map-panel"><span>GIS integration view · Hydrants · Hazards · Preplans · Response areas</span></div>
      </SectionCard>
    </>
  );
}

export function PreventionRiskCenter() {
  const [risks, setRisks] = useState<any[]>([]);
  useEffect(() => { getPreventionRisks().then(setRisks); }, []);
  return (
    <>
      <PageHeader eyebrow="Prevention Risk Center" title="Risk-based prevention alerts and prioritization" description="Every risk item answers what to inspect, fix, or review next." />
      <div className="stack">
        {risks.slice(0, 30).map((risk) => (
          <article key={risk.id} className="mini-card">
            <div>
              <b>{risk.title}</b>
              <span>{risk.source} · {risk.evidenceSummary}</span>
              <span>{risk.recommendedAction}</span>
            </div>
            <div className="stack">
              <StatusBadge status={risk.severity} />
              <span className="mini-chip">Impact {risk.readinessImpact}</span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export function InspectionPrioritization() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { getPrioritizedInspections().then((result) => setItems(result ?? [])); }, []);
  return (
    <>
      <PageHeader eyebrow="Inspection Prioritization" title="Which inspection should happen first?" description="Sorted by risk, overdue days, open violations, and response-area impact." />
      <div className="stack">
        {items.slice(0, 30).map((inspection) => (
          <article key={inspection.id} className="mini-card">
            <div>
              <b>{inspection.propertyName}</b>
              <span>{inspection.inspectionType} · {inspection.address}</span>
              <span>Risk {inspection.riskScore} · {inspection.priorityReason} · Overdue {inspection.overdueDays}</span>
            </div>
            <div className="stack">
              <ReadinessScore score={inspection.riskScore} label="" />
              <StatusBadge status={inspection.status} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
