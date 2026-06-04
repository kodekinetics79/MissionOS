import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardList, FileText, Link2, Plus, RefreshCw, ShieldAlert, ShieldCheck, Send } from 'lucide-react';
import {
  addIncidentNarrative,
  addIncidentTimelineEvent,
  approveIncidentQa,
  closeIncident,
  createEpcrLink,
  createIncident,
  exportIncidentToNeris,
  getAuditLogs,
  getCadImportLogs,
  getEpcrLinks,
  getIncident,
  getIncidentCommandCenter,
  getIncidentDataQuality,
  getIncidentDuplicates,
  getIncidentNarratives,
  getIncidentTimeline,
  getIncidents,
  getNerisExportPreview,
  getNerisMappings,
  returnIncidentQa,
  submitIncident,
  updateIncident,
} from '../services/platformClient';
import type {
  AuditLog,
  CadImportLog,
  EpcrLink,
  Incident,
  IncidentCommandCenter,
  IncidentDataQualityIssue,
  IncidentDetail,
  IncidentDuplicateCandidate,
  IncidentNarrative,
  IncidentTimelineEvent,
  NerisMapping,
} from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { DetailDrawer } from '../components/DetailDrawer';
import { Tabs } from '../components/Tabs';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';

type Mode = 'center' | 'list' | 'detail' | 'edit' | 'qa' | 'neris' | 'export' | 'epcr' | 'cad' | 'quality';

type IncidentForm = {
  id?: string;
  incidentNumber: string;
  incidentType: string;
  recordType: string;
  reportNumber: string;
  patientCount: number;
  assignedTo: string;
  stationId: string;
  location: string;
  city: string;
  source: string;
  status: string;
  qaStatus: string;
  nerisStatus: string;
  epcrStatus: string;
  nerisReady: boolean;
  epcrLinked: boolean;
  narrativeComplete: boolean;
  attachmentsComplete: boolean;
  priority: string;
};

const emptyForm: IncidentForm = {
  incidentNumber: '',
  incidentType: '',
  recordType: 'Incident Report',
  reportNumber: '',
  patientCount: 0,
  assignedTo: '',
  stationId: '',
  location: '',
  city: '',
  source: 'Manual Entry',
  status: 'Draft',
  qaStatus: 'Open',
  nerisStatus: 'Ready',
  epcrStatus: 'Not Required',
  nerisReady: false,
  epcrLinked: false,
  narrativeComplete: false,
  attachmentsComplete: false,
  priority: 'Normal',
};

function buildForm(incident?: IncidentDetail | null): IncidentForm {
  if (!incident) return emptyForm;
  return {
    id: incident.id,
    incidentNumber: incident.incidentNumber ?? '',
    incidentType: incident.incidentType ?? '',
    recordType: incident.recordType ?? 'Incident Report',
    reportNumber: incident.reportNumber ?? '',
    patientCount: Number(incident.patientCount ?? 0),
    assignedTo: incident.assignedTo ?? '',
    stationId: incident.stationId ?? '',
    location: incident.location ?? '',
    city: incident.city ?? '',
    source: incident.source ?? 'Manual Entry',
    status: String(incident.status ?? 'Draft'),
    qaStatus: incident.qaStatus ?? 'Open',
    nerisStatus: incident.nerisStatus ?? 'Ready',
    epcrStatus: incident.epcrStatus ?? 'Not Required',
    nerisReady: Boolean(incident.nerisReady),
    epcrLinked: Boolean(incident.epcrLinked),
    narrativeComplete: Boolean(incident.narrativeComplete),
    attachmentsComplete: Boolean(incident.attachmentsComplete),
    priority: incident.priority ?? 'Normal',
  };
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function incidentRiskClass(value?: string) {
  return value === 'Rejected' || value === 'Failed'
    ? 'Critical'
    : value === 'Queued' || value === 'Pending' || value === 'QA Needed' || value === 'Returned'
      ? 'Warning'
      : 'Healthy';
}

export function IncidentWorkspace({ mode }: { mode: Mode }) {
  const [center, setCenter] = useState<IncidentCommandCenter | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentDetail | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimelineEvent[]>([]);
  const [narratives, setNarratives] = useState<IncidentNarrative[]>([]);
  const [qualityIssues, setQualityIssues] = useState<IncidentDataQualityIssue[]>([]);
  const [duplicates, setDuplicates] = useState<IncidentDuplicateCandidate[]>([]);
  const [mappings, setMappings] = useState<NerisMapping[]>([]);
  const [epcrLinks, setEpcrLinks] = useState<EpcrLink[]>([]);
  const [cadLogs, setCadLogs] = useState<CadImportLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentForm>(emptyForm);
  const [note, setNote] = useState('');
  const [timelineType, setTimelineType] = useState('Workflow Update');
  const [timelineNotes, setTimelineNotes] = useState('');
  const [narrativeDraft, setNarrativeDraft] = useState('');
  const [activePanel, setActivePanel] = useState<'summary' | 'queue' | 'quality' | 'neris' | 'epcr' | 'audit'>('summary');
  const isDetailView = mode === 'detail';
  const isEditView = mode === 'edit';

  const loadSelectedIncident = async (incidentId: string) => {
    const [detail, detailTimeline, detailNarratives, detailIssues, detailPreview] = await Promise.all([
      getIncident(incidentId),
      getIncidentTimeline(incidentId),
      getIncidentNarratives(incidentId),
      getIncidentDataQuality(incidentId),
      getNerisExportPreview(incidentId),
    ]);
    setSelectedIncident(detail);
    setTimeline(detailTimeline);
    setNarratives(detailNarratives);
    setQualityIssues(detailIssues);
    setPreview(detailPreview);
    setForm(buildForm(detail));
  };

  useEffect(() => {
    Promise.all([
      getIncidentCommandCenter(),
      getIncidents(),
      getIncidentDuplicates(),
      getNerisMappings(),
      getEpcrLinks(),
      getCadImportLogs(),
      getAuditLogs(),
    ])
      .then(([centerResponse, incidentsResponse, duplicateResponse, mappingResponse, epcrResponse, cadResponse, auditResponse]) => {
        setCenter(centerResponse);
        setIncidents(incidentsResponse.items);
        setDuplicates(duplicateResponse);
        setMappings(mappingResponse);
        setEpcrLinks(epcrResponse);
        setCadLogs(cadResponse);
        setAuditLogs(auditResponse.items);
        const deepLinkId = typeof window !== 'undefined' ? localStorage.getItem('missionos.incident.selectedId') : null;
        const deepLinked = deepLinkId ? incidentsResponse.items.find((entry: any) => entry.id === deepLinkId) : null;
        const initialIncident = deepLinked ?? incidentsResponse.items[0] ?? centerResponse.incidents[0];
        if (initialIncident) {
          setSelectedId(initialIncident.id);
          loadSelectedIncident(initialIncident.id).catch((failure) => setError(failure instanceof Error ? failure.message : 'Unable to load incident detail'));
        }
      })
      .catch((failure) => setError(failure instanceof Error ? failure.message : 'Unable to load incident workspace'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadSelectedIncident(selectedId).catch((failure) => setError(failure instanceof Error ? failure.message : 'Unable to load incident detail'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const queueIncidents = useMemo(() => (center?.qaQueue ?? incidents.filter((incident) => incident.status === 'Submitted' || incident.qaStatus === 'QA Needed')).slice(0, 10), [center, incidents]);
  const selected = selectedIncident;

  if (error) {
    return <ErrorState description={error} />;
  }

  if (!center) {
    return <LoadingState label="Loading incident command center..." />;
  }

  const refreshAll = async () => {
    const [centerResponse, incidentsResponse, duplicateResponse, mappingResponse, epcrResponse, cadResponse, auditResponse] = await Promise.all([
      getIncidentCommandCenter(),
      getIncidents(),
      getIncidentDuplicates(),
      getNerisMappings(),
      getEpcrLinks(),
      getCadImportLogs(),
      getAuditLogs(),
    ]);
    setCenter(centerResponse);
    setIncidents(incidentsResponse.items);
    setDuplicates(duplicateResponse);
    setMappings(mappingResponse);
    setEpcrLinks(epcrResponse);
    setCadLogs(cadResponse);
    setAuditLogs(auditResponse.items);
  };

  const handleSelectIncident = async (incidentId: string) => {
    setSelectedId(incidentId);
    await loadSelectedIncident(incidentId);
    const nextPanel: typeof activePanel =
      mode === 'quality' ? 'quality'
        : mode === 'qa' ? 'queue'
          : mode === 'neris' || mode === 'export' ? 'neris'
            : mode === 'epcr' ? 'epcr'
              : mode === 'cad' ? 'audit'
                : 'summary';
    setActivePanel(nextPanel);
  };

  const handleCreateOrUpdate = async () => {
    if (form.id) {
      const updated = await updateIncident(form.id, form);
      setSelectedIncident(updated);
      setSelectedId(updated.id);
      await refreshAll();
      await loadSelectedIncident(updated.id);
    } else {
      const created = await createIncident(form);
      setSelectedId(created.id);
      setSelectedIncident(created);
      await refreshAll();
      await loadSelectedIncident(created.id);
    }
  };

  const handleAction = async (action: 'submit' | 'approve' | 'return' | 'close' | 'export' | 'link') => {
    if (!selectedId) return;
    if (action === 'submit') await submitIncident(selectedId);
    if (action === 'approve') await approveIncidentQa(selectedId, note || 'QA approved in command center');
    if (action === 'return') await returnIncidentQa(selectedId, note || 'Returned for correction');
    if (action === 'close') await closeIncident(selectedId);
    if (action === 'export') await exportIncidentToNeris(selectedId);
    if (action === 'link') {
      await createEpcrLink({
        incidentId: selectedId,
        externalEpcrId: `EPCR-${Date.now()}`,
        vendorName: 'Zoll ePCR',
        syncStatus: 'Linked',
        accessRestricted: true,
        hipaaWarning: true,
        sensitiveAccessLogCount: 0,
      });
    }
    await refreshAll();
    await loadSelectedIncident(selectedId);
  };

  const handleAddTimeline = async () => {
    if (!selectedId) return;
    await addIncidentTimelineEvent(selectedId, { eventType: timelineType, notes: timelineNotes, eventTime: new Date().toISOString() });
    setTimelineNotes('');
    await loadSelectedIncident(selectedId);
  };

  const handleAddNarrative = async () => {
    if (!selectedId || !narrativeDraft.trim()) return;
    await addIncidentNarrative(selectedId, { authorName: 'MissionOS User', narrative: narrativeDraft });
    setNarrativeDraft('');
    await loadSelectedIncident(selectedId);
  };

  const title = mode === 'center'
    ? 'Incident Command Center'
    : mode === 'list'
      ? 'Incident List'
      : mode === 'detail'
        ? 'Incident Detail'
        : mode === 'edit'
          ? 'Incident Create / Edit'
          : mode === 'qa'
            ? 'Incident QA Work Queue'
            : mode === 'neris'
              ? 'NERIS Mapping'
              : mode === 'export'
                ? 'NERIS Export Preview'
                : mode === 'epcr'
                  ? 'ePCR Linkage'
                  : mode === 'cad'
                    ? 'CAD Import Logs'
                    : 'Incident Data Quality Center';

  const description = mode === 'center'
    ? 'Operations-first incident reporting, QA, export readiness, ePCR linkage, and data quality control.'
    : mode === 'qa'
      ? 'Work queued records, QA reviews, and correction workflows before submission or export.'
      : mode === 'neris'
        ? 'Validate field mappings and preview export readiness before submission to NERIS.'
        : mode === 'epcr'
          ? 'Maintain privacy-aware linkage to external ePCR records with restricted access labels.'
          : mode === 'cad'
            ? 'Track import status, source health, and CAD handoff traceability.'
            : mode === 'quality'
              ? 'Surface missing fields, duplicates, and export blockers before they impact reporting.'
              : 'Review the incident record, timeline, narrative, attachments, and audit trail.';

  return (
    <>
      <PageHeader
        eyebrow="RMS / ePCR / NERIS"
        title={title}
        description={description}
      />

      {mode === 'edit' ? (
        <SectionCard title={form.id ? 'Edit Incident' : 'Create Incident'} action={<button type="button" onClick={handleCreateOrUpdate}>{form.id ? 'Save Changes' : 'Create Incident'}</button>}>
          <div className="form-grid">
            {[
              ['incidentNumber', 'Incident Number'],
              ['incidentType', 'Incident Type'],
              ['recordType', 'Record Type'],
              ['reportNumber', 'Report Number'],
              ['assignedTo', 'Assigned To'],
              ['stationId', 'Station ID'],
              ['location', 'Location'],
              ['city', 'City'],
              ['source', 'Source'],
              ['priority', 'Priority'],
              ['status', 'Status'],
              ['qaStatus', 'QA Status'],
              ['nerisStatus', 'NERIS Status'],
              ['epcrStatus', 'ePCR Status'],
            ].map(([key, label]) => (
              <label key={key}>
                <span>{label}</span>
                <input value={(form as any)[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: key === 'patientCount' ? Number(event.target.value) : event.target.value }))} />
              </label>
            ))}
            <label><span>Patient Count</span><input type="number" value={form.patientCount} onChange={(event) => setForm((current) => ({ ...current, patientCount: Number(event.target.value) }))} /></label>
            <label><span>NERIS Ready</span><input type="checkbox" checked={form.nerisReady} onChange={(event) => setForm((current) => ({ ...current, nerisReady: event.target.checked }))} /></label>
            <label><span>ePCR Linked</span><input type="checkbox" checked={form.epcrLinked} onChange={(event) => setForm((current) => ({ ...current, epcrLinked: event.target.checked }))} /></label>
            <label><span>Narrative Complete</span><input type="checkbox" checked={form.narrativeComplete} onChange={(event) => setForm((current) => ({ ...current, narrativeComplete: event.target.checked }))} /></label>
            <label><span>Attachments Complete</span><input type="checkbox" checked={form.attachmentsComplete} onChange={(event) => setForm((current) => ({ ...current, attachmentsComplete: event.target.checked }))} /></label>
          </div>
        </SectionCard>
      ) : (
        <>
          <div className="stats-grid">
            <StatCard label="Incident Records" value={center.summary.totalIncidents} hint={`${center.summary.qaNeeded} need QA`} icon={<ClipboardList />} />
            <StatCard label="NERIS Ready" value={center.summary.nerisReady} hint={`${center.summary.exported} exported`} icon={<ShieldCheck />} />
            <StatCard label="ePCR Linked" value={center.summary.epcrLinked} hint="Privacy-aware linkage active" icon={<Link2 />} />
            <StatCard label="Data Quality Issues" value={center.summary.openDataQualityIssues} hint="Open blockers surfaced" icon={<AlertTriangle />} />
            <StatCard label="Duplicate Candidates" value={center.summary.duplicateCandidates} hint="Potential duplicates reviewed" icon={<ShieldAlert />} />
            <StatCard label="Readiness Forecast" value={`${center.readinessForecast}%`} hint="Incident workflow health" icon={<RefreshCw />} />
          </div>

          <SectionCard
            title="Command Actions"
            action={(
              <div className="inline-actions">
                <button type="button" onClick={() => setActivePanel('summary')}><FileText size={16} /> Summary</button>
                <button type="button" onClick={() => setActivePanel('queue')}><ClipboardList size={16} /> QA Queue</button>
                <button type="button" onClick={() => setActivePanel('quality')}><ShieldAlert size={16} /> Quality</button>
                <button type="button" onClick={() => setActivePanel('neris')}><ShieldCheck size={16} /> NERIS</button>
                <button type="button" onClick={() => setActivePanel('epcr')}><Link2 size={16} /> ePCR</button>
                <button type="button" onClick={() => setActivePanel('audit')}><ArrowRight size={16} /> Audit</button>
              </div>
            )}
          >
            <Tabs
              items={[
                { id: 'summary', label: 'Summary' },
                { id: 'queue', label: 'QA Queue' },
                { id: 'quality', label: 'Quality' },
                { id: 'neris', label: 'NERIS' },
                { id: 'epcr', label: 'ePCR' },
                { id: 'audit', label: 'Audit' },
              ]}
              activeId={activePanel}
              onChange={(id) => setActivePanel(id as typeof activePanel)}
            />
            <div className="inline-actions">
              <button type="button" onClick={() => setForm(emptyForm)}><Plus size={16} /> New Incident</button>
              <button type="button" onClick={() => selectedId && handleAction('submit')}><Send size={16} /> Submit for QA</button>
              <button type="button" onClick={() => selectedId && handleAction('approve')}><CheckCircle2 size={16} /> Approve QA</button>
              <button type="button" onClick={() => selectedId && handleAction('return')}><RefreshCw size={16} /> Return for Correction</button>
              <button type="button" onClick={() => selectedId && handleAction('export')}><ShieldCheck size={16} /> Export NERIS</button>
              <button type="button" onClick={() => selectedId && handleAction('link')}><Link2 size={16} /> Link ePCR</button>
              <button type="button" onClick={() => selectedId && handleAction('close')}><CheckCircle2 size={16} /> Close</button>
            </div>
            <label className="stack" style={{ marginTop: '1rem' }}>
              <span>QA / workflow note</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Use this for QA return notes, approval comments, or export guidance." />
            </label>
          </SectionCard>

          <div className="two-col">
            <SectionCard title={mode === 'qa' ? 'QA Queue' : mode === 'quality' ? 'Data Quality Watchlist' : 'Incident Queue'} action={<button type="button" onClick={refreshAll}>Refresh</button>}>
              <DataTable
                columns={['Incident', 'Type', 'Station', 'Status', 'QA', 'NERIS', 'ePCR', 'Action']}
                rows={mode === 'qa' ? queueIncidents : incidents}
                renderRow={(incident) => (
                  <>
                    <td><b>{incident.incidentNumber}</b><br /><small>{formatDate(incident.dispatchAt)} · {incident.priority ?? 'Normal'}</small></td>
                    <td>{incident.incidentType}</td>
                    <td>{incident.station ?? incident.stationId ?? '—'}</td>
                    <td><StatusBadge status={incident.status} /></td>
                    <td><StatusBadge status={incident.qaStatus ?? 'Open'} /></td>
                    <td><StatusBadge status={incidentRiskClass(incident.nerisStatus)} /></td>
                    <td><StatusBadge status={incidentRiskClass(incident.epcrStatus)} /></td>
                    <td><button type="button" onClick={() => handleSelectIncident(incident.id)}>Open</button></td>
                  </>
                )}
              />
              {!incidents.length && <EmptyState title="No incidents" description="Incident records will appear here after CAD import or manual entry." />}
            </SectionCard>

            <DetailDrawer title={selected?.incidentNumber ?? 'Incident detail'} subtitle={`${selected?.incidentType ?? 'Select an incident'} · ${selected?.status ?? 'Draft'}`}>
              {selected ? (
                <div className="stack">
                  <div className="mini-card"><span>Location</span><b>{selected.location ?? '—'}</b></div>
                  <div className="mini-card"><span>Station / Battalion</span><b>{selected.stationName ?? (typeof selected.station === 'string' ? selected.station : (selected.station as any)?.name ?? '—')}</b><span>{selected.battalionName ?? (typeof selected.battalion === 'string' ? selected.battalion : (selected.battalion as any)?.name ?? '—')}</span></div>
                  <div className="mini-card"><span>CAD Source</span><b>{selected.source ?? 'CAD Import'}</b></div>
                  <div className="mini-card"><span>Units dispatched</span><b>{selected.unitsDetailed?.map((unit: any) => unit.unitName).join(', ') || selected.units?.join(', ') || '—'}</b></div>
                  <div className="mini-card"><span>Personnel involved</span><b>{selected.personnelDetailed?.map((person: any) => `${person.personnel?.firstName ?? ''} ${person.personnel?.lastName ?? ''}`.trim() || person.roleAtIncident).join(', ') || '—'}</b></div>
                  <div className="mini-card"><span>QA / Export</span><b>{selected.qaStatus ?? 'Open'}</b><span>NERIS {selected.nerisStatus ?? 'Ready'} · ePCR {selected.epcrStatus ?? 'Not Required'}</span></div>
                  <div className="mini-card"><span>Readiness impact</span><b>{selected.readinessImpact ?? 0}%</b><span>{selected.riskWarnings?.join(' · ') || 'No active warnings'}</span></div>

                  {activePanel === 'summary' && (
                    <>
                      <SectionCard title="Timeline">
                        <ul className="check-list">
                          {(selected.timeline ?? timeline).map((event) => (
                            <li key={event.id}>{event.eventType} · {formatDate(event.eventTime)}{event.notes ? ` — ${event.notes}` : ''}</li>
                          ))}
                        </ul>
                        <div className="stack">
                          <label>
                            <span>Event type</span>
                            <input value={timelineType} onChange={(event) => setTimelineType(event.target.value)} />
                          </label>
                          <label>
                            <span>Timeline notes</span>
                            <input value={timelineNotes} onChange={(event) => setTimelineNotes(event.target.value)} />
                          </label>
                          <button type="button" onClick={handleAddTimeline}>Add Timeline Event</button>
                        </div>
                      </SectionCard>
                      <SectionCard title="Narrative">
                        <ul className="check-list">
                          {(selected.narratives ?? narratives).map((entry) => (
                            <li key={entry.id}><b>{entry.authorName}</b> — {entry.narrative}</li>
                          ))}
                        </ul>
                        <div className="stack">
                          <label>
                            <span>New narrative note</span>
                            <textarea rows={3} value={narrativeDraft} onChange={(event) => setNarrativeDraft(event.target.value)} />
                          </label>
                          <button type="button" onClick={handleAddNarrative}>Add Narrative</button>
                        </div>
                      </SectionCard>
                      <SectionCard title="Attachments">
                        <ul className="check-list">
                          {(selected.attachments ?? []).map((attachment: any) => (
                            <li key={attachment.id}><b>{attachment.fileName}</b> — {attachment.fileType ?? 'Attachment'}{attachment.fileUrl ? ` · ${attachment.fileUrl}` : ''}</li>
                          ))}
                        </ul>
                      </SectionCard>
                    </>
                  )}

                  {activePanel === 'quality' && (
                    <SectionCard title="Data Quality Warnings">
                      <ul className="check-list">
                        {(selected.dataQualityIssues ?? qualityIssues).map((issue) => (
                          <li key={issue.id}><StatusBadge status={issue.severity} /> {issue.issueDescription}</li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}

                  {activePanel === 'neris' && (
                    <SectionCard title="NERIS Readiness">
                      {preview ? (
                        <ul className="check-list">
                          {preview.mappings?.map((mapping: any) => (
                            <li key={mapping.nerisField}>{mapping.nerisField} → {String(mapping.value ?? '—')} · {mapping.validationStatus}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">Select an incident to preview NERIS readiness.</p>
                      )}
                    </SectionCard>
                  )}

                  {activePanel === 'epcr' && (
                    <SectionCard title="ePCR Linkage">
                      {(selected.epcrLinks ?? epcrLinks).length ? (
                        <ul className="check-list">
                          {(selected.epcrLinks ?? epcrLinks).map((link) => (
                            <li key={link.id}><b>{link.externalEpcrId}</b> — {link.vendorName} · <StatusBadge status={link.syncStatus} />{link.accessRestricted ? ' · Restricted' : ''}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">No linked ePCR record yet. Use the linkage action to create one.</p>
                      )}
                    </SectionCard>
                  )}

                  {activePanel === 'audit' && (
                    <SectionCard title="Audit Trail">
                      <ul className="check-list">
                        {auditLogs.filter((log) => log.entityName === 'Incident' && log.entityId === selected.id).slice(0, 8).map((log) => (
                          <li key={log.id}>{log.action} · {formatDate(log.createdAt)}</li>
                        ))}
                      </ul>
                    </SectionCard>
                  )}
                </div>
              ) : (
                <EmptyState title="No incident selected" description="Choose an incident to inspect QA status, readiness, and export controls." />
              )}
            </DetailDrawer>
          </div>

          <div className="three-col">
            <SectionCard title="NERIS Mappings">
              <ul className="check-list">
                {mappings.slice(0, 6).map((mapping) => (
                  <li key={mapping.id}><b>{mapping.internalField}</b> → {mapping.nerisField} · {mapping.required ? 'Required' : 'Optional'} · {mapping.validationStatus ?? 'Valid'}</li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="ePCR Linkages">
              <ul className="check-list">
                {epcrLinks.slice(0, 6).map((link) => (
                  <li key={link.id}><b>{link.externalEpcrId}</b> · {link.vendorName} · {link.syncStatus}</li>
                ))}
              </ul>
            </SectionCard>
            <SectionCard title="CAD Import Logs">
              <ul className="check-list">
                {cadLogs.slice(0, 6).map((log) => (
                  <li key={log.id}><b>{log.externalId}</b> · {log.sourceSystem} · {log.status}</li>
                ))}
              </ul>
            </SectionCard>
          </div>
        </>
      )}
    </>
  );
}
