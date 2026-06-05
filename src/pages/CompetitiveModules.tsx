import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, BarChart3, CalendarDays, CheckCircle2, Cloud, FileText, Gauge, LifeBuoy, Lock, MapPinned, Radio, Smartphone, ShieldCheck, Users, Wrench } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { Tabs } from '../components/Tabs';
import { addAudit, addNotification, createTrainingAssignment, downloadCsv, emitToast, updateAsset, updateEpcr, updateHydrant, updateIncident, updateInspection, updateIntegration, updatePermit, updatePreplan, updateRequisition, updateReport, updateTraining, updateWorkOrder, updateWorkflow, useDemoState } from '../services/demoStateService';
import { getContinuityCenter, getDemoDashboardSummary, getEpcrReadiness, getHydrantsModule, getIntegrationHubModule, getMobileFieldMode, getPermitsModule, getPreplansModule, getPreventionInspections, getRmsNerisReadiness, getReportBuilderModule, getSecurityTrustCenter } from '../services/demoDataService';

const routeTo = (route: string) => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function useDemoRefreshToken() {
  return useDemoState((state) => state.version);
}

function downloadVisibleCsv<T extends Record<string, unknown>>(rows: T[], fileName: string) {
  downloadCsv(rows, fileName);
  emitToast('Export started', `Downloading ${fileName}`);
  addAudit('Export CSV', 'Reports', fileName, undefined, 'Info');
}

function DetailSummary({ title, record, actions }: { title: string; record: Record<string, unknown>; actions?: ReactNode }) {
  return (
    <div className="stack">
      <div className="row-between">
        <strong>{title}</strong>
        {actions}
      </div>
      <div className="mini-grid">
        {Object.entries(record).map(([key, value]) => (
          <span key={key}>{key}<b>{Array.isArray(value) ? value.join(', ') : String(value ?? '—')}</b></span>
        ))}
      </div>
    </div>
  );
}

function HeaderActions({ routes }: { routes: Array<{ label: string; route: string }> }) {
  return (
    <div className="inline-actions">
      {routes.map((item) => (
        <button key={item.route} type="button" className="btn-link" onClick={() => routeTo(item.route)}>{item.label}</button>
      ))}
    </div>
  );
}

export function RmsNerisReadiness() {
  useDemoRefreshToken();
  const data = getRmsNerisReadiness();
  const [view, setView] = useState<'queue' | 'training' | 'audit'>('queue');
  const [selected, setSelected] = useState<any>(null);
  const [query, setQuery] = useState('');
  const filteredValidations = useMemo(() => data.validations.filter((record: any) => `${record.incidentId} ${record.incidentType} ${record.validationStatus} ${record.qaOwner}`.toLowerCase().includes(query.toLowerCase())), [data.validations, query]);
  const queueRows = view === 'queue' ? filteredValidations : data.incidents;
  const selectedIncident = selected ?? queueRows[0] ?? data.incidents[0];
  return (
    <>
      <PageHeader eyebrow="Records management" title="RMS / NERIS Readiness" description="Incident reporting, NERIS validation, QA/QI, export readiness, and incident-to-KPI/training/corrective action flow." />
      <OperationalBriefing
        summary="This module shows which incidents are export-ready, which need QA, and which should trigger training or corrective action before NERIS submission."
        bullets={[
          `${data.summary.readyForExport} incident(s) are ready for export and ${data.summary.needsQa} still need QA.`,
          `${data.summary.failedSync} sync issue(s) are flagged for records staff and ${data.summary.incidentsUsingNERIS} incident(s) still sit in the review queue.`,
          'Open the incident table to show how one structure fire can create both a QA action and a training recommendation.',
        ]}
        badge={data.summary.readinessPct >= 90 ? 'Ready for Export' : 'Needs QA'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setView('queue')}>Review QA</button>
            <button type="button" onClick={() => downloadVisibleCsv(filteredValidations, 'neris-readiness.csv')}>Export NERIS</button>
          </div>
        )}
        evidence={['NERIS validation', 'QA queue', 'Training trigger', 'Corrective actions', 'Export readiness']}
      />
      <div className="stats-grid">
        <StatCard label="NERIS readiness" value={`${data.summary.readinessPct}%`} hint="Validated incidents ready" icon={<ShieldCheck />} />
        <StatCard label="Ready for export" value={data.summary.readyForExport} hint="Ready to submit" icon={<CheckCircle2 />} />
        <StatCard label="Needs QA" value={data.summary.needsQa} hint="Requires review" icon={<AlertTriangle />} />
        <StatCard label="Failed sync" value={data.summary.failedSync} hint="Connector or validation issue" icon={<Radio />} />
        <StatCard label="Incident queue" value={data.summary.incidentsUsingNERIS} hint="Linked incidents" icon={<FileText />} />
        <StatCard label="Training recommendations" value={data.recommendedTraining.length} hint="Actionable follow-up" icon={<BarChart3 />} />
      </div>
      <div className="filter-bar">
        <label className="search-inline"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search incidents, QA owners, status..." /></label>
        <Tabs
          items={[
            { id: 'queue', label: 'Validation Queue' },
            { id: 'training', label: 'Training Links' },
            { id: 'audit', label: 'Audit Trail' },
          ]}
          activeId={view}
          onChange={(id) => setView(id as typeof view)}
        />
      </div>
      <div className="two-col">
        <SectionCard title="Validation queue">
          <DataTable
            columns={['Incident', 'Status', 'QA', 'Training', 'Batch']}
            rows={queueRows}
            onRowClick={(record: any) => setSelected(record)}
            renderRow={(record: any) => (
              <>
                <td><b>{record.incidentId}</b><div className="muted">{record.incidentType}</div></td>
                <td><StatusBadge status={record.validationStatus} /></td>
                <td>{record.qaOwner}</td>
                <td>{record.recommendedTraining}</td>
                <td>{record.exportBatch}</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Corrective action summary">
          <div className="stack">
            {data.incidents.slice(0, 6).map((incident: any) => (
              <article className="mini-card" key={incident.id}>
                <div>
                  <b>{incident.incidentType}</b>
                  <span>{incident.location} · {incident.stationName}</span>
                </div>
                <StatusBadge status={incident.qaStatus} />
                <div className="mini-note">{incident.trainingRecommendation} · {incident.correctiveAction}</div>
                <div className="inline-actions">
                  <button type="button" className="btn-link" onClick={() => setSelected(incident)}>Review</button>
                  <button type="button" className="btn-link" onClick={() => {
                    updateIncident(incident.id, { qaStatus: 'Approved', status: 'Approved' });
                    addAudit('Approved incident for export', 'RMS / NERIS', incident.id, incident.incidentNumber, 'Info');
                    emitToast('Incident approved', `${incident.incidentNumber} moved to export-ready.`);
                  }}>Approve</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {view === 'training' ? (
        <SectionCard title="QA to training linkage">
          <DataTable
            columns={['Incident', 'KPI impacts', 'Corrective action', 'Priority']}
            rows={data.incidents}
            onRowClick={(incident: any) => setSelected(incident)}
            renderRow={(incident: any) => (
              <>
                <td><b>{incident.incidentNumber}</b><div className="muted">{incident.incidentType}</div></td>
                <td>{incident.kpiImpact.join(', ')}</td>
                <td>{incident.correctiveAction}</td>
                <td><StatusBadge status={incident.priority} /></td>
              </>
            )}
          />
        </SectionCard>
      ) : null}
      {view === 'audit' ? (
        <SectionCard title="Audit trail">
          <div className="stack">
            {data.validations.slice(0, 8).map((record: any) => (
              <article className="mini-card" key={record.id}>
                <div>
                  <b>{record.incidentId}</b>
                  <span>{record.recommendedTraining} · {record.qaOwner}</span>
                </div>
                <StatusBadge status={record.validationStatus} />
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {selectedIncident ? (
        <Modal
          title={selectedIncident.incidentNumber ?? selectedIncident.incidentId}
          subtitle="NERIS export details and suggested next actions"
          onClose={() => setSelected(null)}
        >
          <DetailSummary
            title="Record summary"
            record={{
              Type: selectedIncident.incidentType,
              Station: selectedIncident.stationName,
              QA: selectedIncident.qaStatus,
              NERIS: selectedIncident.nerisStatus ?? selectedIncident.validationStatus,
              Training: selectedIncident.trainingRecommendation,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updateIncident(String(selectedIncident.validationStatus ? selectedIncident.incidentId : selectedIncident.id ?? selectedIncident.incidentId), { qaStatus: 'Approved', status: 'Approved', nerisStatus: 'Ready for Export' });
                  addNotification({ title: 'NERIS incident approved', message: `${selectedIncident.incidentNumber ?? selectedIncident.incidentId} is ready for export.`, type: 'Incident', priority: 'High', relatedRoute: '/rms-neris', status: 'Unread' });
                  emitToast('Approved', 'Incident marked ready for export.');
                  setSelected(null);
                }}>Approve</button>
                <button type="button" onClick={() => {
                  createTrainingAssignment({
                    staffId: selectedIncident.crewIds?.[0],
                    staffName: selectedIncident.leadOfficer,
                    course: selectedIncident.trainingRecommendation,
                    category: 'Operations',
                    relatedIncidentId: selectedIncident.incidentId ?? selectedIncident.id,
                    source: 'Incident QA',
                    dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
                  });
                  emitToast('Training assigned', 'Ladder operations refresher queued.');
                }}>Assign Training</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function EpcrReadiness() {
  useDemoRefreshToken();
  const data = getEpcrReadiness();
  const [view, setView] = useState<'sync' | 'qa' | 'connectors'>('sync');
  const [selected, setSelected] = useState<any>(null);
  const syncNow = (record: any) => {
    updateIntegration('INT-EPCR', { lastSyncAt: new Date().toISOString(), syncStatus: 'Live', status: 'Healthy' });
    if (record?.id && String(record.id).startsWith('EPCR')) updateEpcr(record.id, { syncStatus: 'Synced', hipaaPosture: 'Healthy', lastSyncAt: new Date().toISOString() });
    addAudit('Sync now', 'ePCR', record?.id ?? 'connector', record?.incidentId ?? 'ePCR', 'Info');
    emitToast('Sync complete', 'ePCR connector refreshed successfully.');
  };
  return (
    <>
      <PageHeader eyebrow="EMS interoperability" title="ePCR Integration Readiness" description="ePCR connector status, sync posture, QA/QI, HIPAA safeguards, and EMS documentation export health." />
      <OperationalBriefing
        summary="The EMS readiness view shows how patient care records move from the field into the vendor connector, where QA and HIPAA checks can hold or release the sync."
        bullets={[
          `${data.summary.syncReadyPct}% of sync records are healthy enough to move forward.`,
          `${data.summary.failed} record(s) failed sync and ${data.summary.atRisk} sit in HIPAA or documentation review.`,
          'Vendor posture and QA review are visible together so support can diagnose whether the issue is connector, content, or compliance.',
        ]}
        badge={data.summary.failed > 0 ? 'Failed Sync' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setView('sync')}>Sync Now</button>
            <button type="button" onClick={() => setView('qa')}>Open QA queue</button>
            <button type="button" onClick={() => setView('connectors')}>Open Integration Hub</button>
          </div>
        )}
        evidence={['ePCR vendor', 'HIPAA posture', 'QA review', 'Sync status', 'EMS documentation']}
      />
      <div className="stats-grid">
        <StatCard label="Sync ready" value={`${data.summary.syncReadyPct}%`} hint="Connected to vendor" icon={<ShieldCheck />} />
        <StatCard label="Synced" value={data.summary.synced} hint="Completed handoff" icon={<CheckCircle2 />} />
        <StatCard label="Failed sync" value={data.summary.failed} hint="Needs retry or mapping fix" icon={<AlertTriangle />} />
        <StatCard label="At risk" value={data.summary.atRisk} hint="HIPAA or QA concern" icon={<Lock />} />
        <StatCard label="Vendors" value={data.summary.vendors} hint="Connector landscape" icon={<Radio />} />
        <StatCard label="QA queue" value={data.qaQueue.length} hint="Ready for review" icon={<FileText />} />
      </div>
      <div className="filter-bar">
        <Tabs
          items={[
            { id: 'sync', label: 'Sync Records' },
            { id: 'qa', label: 'QA / HIPAA' },
            { id: 'connectors', label: 'Connector Posture' },
          ]}
          activeId={view}
          onChange={(id) => setView(id as typeof view)}
        />
      </div>
      <div className="two-col">
        <SectionCard title="Connector posture">
          <div className="stack">
            {data.connectors.map((connector: any) => (
              <article className="mini-card" key={connector.name}>
                <div>
                  <b>{connector.name}</b>
                  <span>{connector.notes}</span>
                </div>
                <StatusBadge status={connector.status} />
                <span className="muted">{formatDate(connector.lastSyncAt)}</span>
                <button type="button" className="btn-link" onClick={() => syncNow(connector)}>Sync Now</button>
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="HIPAA and QA watch">
          <div className="stack">
            {data.qaQueue.slice(0, 6).map((record: any) => (
              <article className="mini-card selectable" key={record.id} onClick={() => setSelected(record)}>
                <div>
                  <b>{record.vendor}</b>
                  <span>{record.incidentId} · {record.patientCareTypes.join(', ')}</span>
                </div>
                <StatusBadge status={record.hipaaPosture} />
                <span className="muted">{record.errors.length ? record.errors.join('; ') : 'No issues'}</span>
                <div className="inline-actions">
                  <button type="button" className="btn-link" onClick={() => {
                    updateEpcr(record.id, { syncStatus: 'Synced', hipaaPosture: 'Healthy', qaStatus: 'Reviewed' });
                    addNotification({ title: 'ePCR QA approved', message: `${record.incidentId} passed QA and HIPAA review.`, type: 'Integration', priority: 'High', relatedRoute: '/epcr-readiness', status: 'Unread' });
                    emitToast('QA approved', `${record.incidentId} moved to synced.`);
                  }}>Approve</button>
                  <button type="button" className="btn-link" onClick={() => {
                    updateEpcr(record.id, { syncStatus: 'Failed Sync', hipaaPosture: 'At Risk', qaStatus: 'Needs QA' });
                    emitToast('Review requested', 'Connector issue sent back for review.', 'warning');
                  }}>Reject</button>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {view === 'sync' ? (
        <SectionCard title="Sync records">
          <DataTable
            columns={['Incident', 'Vendor', 'Sync', 'HIPAA', 'QA']}
            rows={data.syncRecords}
            onRowClick={(record: any) => setSelected(record)}
            renderRow={(record: any) => (
              <>
                <td><b>{record.incidentId}</b></td>
                <td>{record.vendor}</td>
                <td><StatusBadge status={record.syncStatus} /></td>
                <td><StatusBadge status={record.hipaaPosture} /></td>
                <td><StatusBadge status={record.qaStatus} /></td>
              </>
            )}
          />
        </SectionCard>
      ) : null}
      {view === 'connectors' ? (
        <SectionCard title="Connector export controls">
          <div className="stack">
            {data.connectors.map((connector: any) => (
              <article className="mini-card" key={connector.name}>
                <div>
                  <b>{connector.name}</b>
                  <span>{connector.notes}</span>
                </div>
                <StatusBadge status={connector.status} />
              </article>
            ))}
          </div>
        </SectionCard>
      ) : null}
      {selected ? (
        <Modal title={selected.vendor ?? selected.incidentId} subtitle="ePCR record details" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Sync summary"
            record={{
              Incident: selected.incidentId,
              Vendor: selected.vendor,
              Sync: selected.syncStatus,
              HIPAA: selected.hipaaPosture,
              QA: selected.qaStatus,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  syncNow(selected);
                  setSelected(null);
                }}>Sync Now</button>
                <button type="button" onClick={() => {
                  addAudit('Open ePCR QA detail', 'ePCR', selected.id, selected.incidentId, 'Info');
                  emitToast('Detail opened', `${selected.incidentId} ready for QA review.`);
                }}>Review</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function PreventionInspections() {
  useDemoRefreshToken();
  const data = getPreventionInspections();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Prevention operations" title="Prevention & Inspections" description="Occupancies, inspection schedule, violations, reinspection workflow, inspector workload, and risk scoring." />
      <OperationalBriefing
        summary="This view is built to feel like a live marshal workflow: overdue inspections, reinspection triggers, and inspector workload all sit side by side."
        bullets={[
          `${data.summary.overdue} inspection(s) are overdue and ${data.summary.reinspection} require follow-up.`,
          `${data.summary.highRiskOccupancies} occupancy record(s) are flagged as high risk across the district.`,
          'Use the inspection table to move from review to assignment without switching modules.',
        ]}
        badge={data.summary.overdue > 0 ? 'Overdue' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setSelected(data.inspections[0])}>Review</button>
            <button type="button" onClick={() => downloadVisibleCsv(data.inspections, 'inspection-queue.csv')}>Export</button>
            <button type="button" onClick={() => emitToast('Filter saved', 'Inspection backlog saved to your current demo session.')}>Save Filter</button>
          </div>
        )}
        evidence={['Inspector workload', 'Reinspection', 'Violations', 'Risk score', 'Preplan links']}
      />
      <div className="stats-grid">
        <StatCard label="Overdue inspections" value={data.summary.overdue} hint="Immediate follow-up" icon={<AlertTriangle />} />
        <StatCard label="Pending review" value={data.summary.pending} hint="Queued for triage" icon={<FileText />} />
        <StatCard label="Reinspection required" value={data.summary.reinspection} hint="Follow-up visit needed" icon={<CheckCircle2 />} />
        <StatCard label="High-risk occupancies" value={data.summary.highRiskOccupancies} hint="Risk scoring in play" icon={<ShieldCheck />} />
        <StatCard label="Inspectors" value={data.summary.inspectors} hint="Active field staff" icon={<Users />} />
        <StatCard label="Violations trending" value={data.inspections.reduce((total: number, item: any) => total + Number(item.violationCount ?? 0), 0)} hint="Across inspected occupancies" icon={<BarChart3 />} />
      </div>
      <div className="two-col">
        <SectionCard title="Inspection queue">
          <DataTable
            columns={['Occupancy', 'Due', 'Risk', 'Violations', 'Status']}
            rows={data.inspections}
            onRowClick={(inspection: any) => setSelected(inspection)}
            renderRow={(inspection: any) => (
              <>
                <td><b>{inspection.occupancyName}</b><div className="muted">{inspection.address}</div></td>
                <td>{formatDate(inspection.dueDate)}</td>
                <td><StatusBadge status={inspection.riskLevel} /></td>
                <td>{inspection.violationCount}</td>
                <td><StatusBadge status={inspection.status} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Inspector workload">
          <div className="stack">
            {data.inspectorWorkload.map((row: any) => (
              <article className="mini-card" key={row.inspectorName}>
                <div>
                  <b>{row.inspectorName}</b>
                  <span>{row.count} inspection(s) · {row.overdue} overdue</span>
                </div>
                <StatusBadge status={row.overdue > 0 ? 'Warning' : 'Healthy'} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Violation trend and reinspection targets">
        <DataTable
          columns={['Inspection', 'Result', 'Reinspection', 'Permit dependency']}
          rows={data.inspections.slice(0, 12)}
          renderRow={(inspection: any) => (
            <>
              <td><b>{inspection.occupancyName}</b></td>
              <td>{inspection.result}</td>
              <td><StatusBadge status={inspection.reinspectionRequired ? 'Reinspection Required' : 'Completed'} /></td>
              <td>{inspection.permitDependency}</td>
            </>
          )}
        />
      </SectionCard>
      {selected ? (
        <Modal title={selected.occupancyName} subtitle="Inspection detail and workflow actions" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Inspection record"
            record={{
              Due: formatDate(selected.dueDate),
              Risk: selected.riskLevel,
              Violations: selected.violationCount,
              Result: selected.result,
              Inspector: selected.inspectorName,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updateInspection(selected.id, { status: 'Completed', result: 'Passed with notes' });
                  addAudit('Mark inspection complete', 'Prevention', selected.id, selected.occupancyName, 'Info');
                  emitToast('Inspection completed', `${selected.occupancyName} updated to completed.`);
                  setSelected(null);
                }}>Mark Complete</button>
                <button type="button" onClick={() => {
                  updateInspection(selected.id, { status: 'Scheduled', dueDate: new Date(Date.now() + 7 * 86400000).toISOString() });
                  emitToast('Reinspection scheduled', 'Follow-up date moved 7 days out.');
                }}>Schedule</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function Permits() {
  useDemoRefreshToken();
  const data = getPermitsModule();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Prevention workflow" title="Permitting" description="Fire permits, special event permits, sprinkler and fire alarm permits, fee status, approvals, and inspection dependency." />
      <OperationalBriefing
        summary="The permit queue shows what needs approval, what needs payment, and which applications cannot advance until inspection dependencies are met."
        bullets={[
          `${data.summary.pending} permit(s) are in pending review.`,
          `${data.summary.dueFees} permit(s) still have fees due.`,
          'Approval and inspection dependency are visible on the same page so staff can close the loop faster.',
        ]}
        badge={data.summary.pending > 0 ? 'Pending Review' : 'Approved'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setSelected(data.permits[0])}>Review</button>
            <button type="button" onClick={() => downloadVisibleCsv(data.permits, 'permit-queue.csv')}>Export</button>
          </div>
        )}
        evidence={['Fee status', 'Approval workflow', 'Inspection dependency', 'Permit type', 'Reinspection']}
      />
      <div className="stats-grid">
        <StatCard label="Pending review" value={data.summary.pending} hint="Awaiting action" icon={<FileText />} />
        <StatCard label="Approved" value={data.summary.approved} hint="Approved permits" icon={<CheckCircle2 />} />
        <StatCard label="Fees due" value={data.summary.dueFees} hint="Fee collection needed" icon={<AlertTriangle />} />
        <StatCard label="Inspection dependencies" value={data.summary.inspectionDependencies} hint="Requires site visit" icon={<MapPinned />} />
      </div>
      <div className="two-col">
        <SectionCard title="Permit review queue">
          <DataTable
            columns={['Permit', 'Occupancy', 'Type', 'Fee', 'Status']}
            rows={data.permits}
            onRowClick={(permit: any) => setSelected(permit)}
            renderRow={(permit: any) => (
              <>
                <td><b>{permit.permitNumber}</b></td>
                <td>{permit.occupancyName}</td>
                <td>{permit.permitType}</td>
                <td><StatusBadge status={permit.feeStatus} /></td>
                <td><StatusBadge status={permit.status} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Approval workflow">
          <div className="stack">
            {data.pending.slice(0, 6).map((permit: any) => (
              <article className="mini-card" key={permit.id}>
                <div>
                  <b>{permit.occupancyName}</b>
                  <span>{permit.permitType} · {permit.workflowStatus}</span>
                </div>
                <StatusBadge status={permit.reviewStatus} />
                <span className="muted">Inspection dependency: {permit.inspectionDependency}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.permitNumber} subtitle="Permit review workflow" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Permit record"
            record={{
              Occupancy: selected.occupancyName,
              Type: selected.permitType,
              Fee: selected.feeStatus,
              Status: selected.status,
              Inspection: selected.inspectionDependency,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updatePermit(selected.id, { status: 'Approved', reviewStatus: 'Approved', feeStatus: 'Paid' });
                  addAudit('Approved permit', 'Permits', selected.id, selected.permitNumber, 'Info');
                  emitToast('Permit approved', `${selected.permitNumber} moved to approved.`);
                  setSelected(null);
                }}>Approve</button>
                <button type="button" onClick={() => {
                  updatePermit(selected.id, { status: 'Needs QA', reviewStatus: 'Needs QA' });
                  emitToast('Permit sent back', 'Information requested from applicant.', 'warning');
                }}>Reject</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function Preplans() {
  useDemoRefreshToken();
  const data = getPreplansModule();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Occupancy intelligence" title="Preplans & Occupancy Risk" description="Building risk profiles, hazards, Knox box, alarm panel, sprinkler/FDC, contacts, hydrants nearby, and inspection links." />
      <OperationalBriefing
        summary="This page presents the preplan story the way a chief expects to see it: risks, hazards, contacts, and suppression features tied together in one view."
        bullets={[
          `${data.summary.highRisk} occupancy record(s) are flagged high risk.`,
          `${data.summary.dueUpdates} preplan(s) need an update or review.`,
          'Hydrant connections and inspection links are visible from the same risk record.',
        ]}
        badge={data.summary.highRisk > 0 ? 'At Risk' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setSelected(data.occupancies[0])}>View Preplan</button>
            <button type="button" onClick={() => downloadVisibleCsv(data.occupancies, 'preplans.csv')}>Export</button>
          </div>
        )}
        evidence={['Knox box', 'Alarm panel', 'Sprinkler / FDC', 'Contacts', 'Hydrant linkage']}
      />
      <div className="stats-grid">
        <StatCard label="Total occupancies" value={data.summary.total} hint="Preplan records" icon={<MapPinned />} />
        <StatCard label="High risk" value={data.summary.highRisk} hint="Requires attention" icon={<AlertTriangle />} />
        <StatCard label="Due updates" value={data.summary.dueUpdates} hint="Preplan refresh needed" icon={<FileText />} />
        <StatCard label="Hydrant links" value={data.summary.linkedHydrants} hint="Nearby hydrants available" icon={<ShieldCheck />} />
      </div>
      <div className="two-col">
        <SectionCard title="Occupancy risk profile">
          <DataTable
            columns={['Occupancy', 'Risk', 'Hazards', 'Knox box', 'Status']}
            rows={data.occupancies}
            onRowClick={(occupancy: any) => setSelected(occupancy)}
            renderRow={(occupancy: any) => (
              <>
                <td><b>{occupancy.occupancyName}</b><div className="muted">{occupancy.address}</div></td>
                <td><StatusBadge status={occupancy.riskLevel} /></td>
                <td>{occupancy.hazards.join('; ')}</td>
                <td><StatusBadge status={occupancy.knoxBox ? 'Healthy' : 'Warning'} /></td>
                <td><StatusBadge status={occupancy.preplanStatus} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Cross-module links">
          <div className="stack">
            {data.highRisk.slice(0, 6).map((occupancy: any) => (
              <article className="mini-card" key={occupancy.id}>
                <div>
                  <b>{occupancy.occupancyName}</b>
                  <span>{occupancy.primaryContact} · {occupancy.contactPhone}</span>
                </div>
                <StatusBadge status={occupancy.riskLevel} />
                <div className="mini-note">Hydrants: {occupancy.hydrantIds.join(', ')} · Inspection link: {occupancy.inspectionLink}</div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.occupancyName} subtitle="Preplan detail and occupancy risk" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Preplan record"
            record={{
              Address: selected.address,
              Risk: selected.riskLevel,
              Hazards: selected.hazards,
              KnoxBox: selected.knoxBox ? 'Yes' : 'No',
              Hydrants: selected.hydrantIds,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updatePreplan(selected.id, { preplanStatus: 'Reviewed', highRiskFlag: true });
                  addAudit('Reviewed preplan', 'Preplans', selected.id, selected.occupancyName, 'Info');
                  emitToast('Preplan updated', `${selected.occupancyName} marked reviewed.`);
                  setSelected(null);
                }}>Review</button>
                <button type="button" onClick={() => {
                  updatePreplan(selected.id, { preplanStatus: 'Pending Review' });
                  emitToast('Marked due', 'Preplan placed back in review queue.', 'warning');
                }}>Mark Due</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function HydrantsGis() {
  useDemoRefreshToken();
  const data = getHydrantsModule();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="GIS readiness" title="Hydrants / GIS Readiness" description="Hydrant records, GIS readiness, flow tests, out-of-service hydrants, maintenance status, and occupancy risk linkage." />
      <OperationalBriefing
        summary="Water supply readiness is tied directly back to nearby occupancies so a single out-of-service hydrant can change the risk posture of a building profile."
        bullets={[
          `${data.summary.outOfService} hydrant(s) are out of service.`,
          `${data.summary.gisReady} hydrant record(s) are GIS ready, and ${data.summary.needingWork} need maintenance or flushing.`,
          'High-risk occupancies are listed next to their closest hydrant references for immediate response planning.',
        ]}
        badge={data.summary.outOfService > 0 ? 'At Risk' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setSelected(data.hydrants[0])}>Review</button>
            <button type="button" onClick={() => downloadVisibleCsv(data.hydrants, 'hydrants.csv')}>Export</button>
          </div>
        )}
        evidence={['Hydrant readiness', 'Flow testing', 'GIS layer', 'Maintenance', 'Occupancy linkage']}
      />
      <div className="stats-grid">
        <StatCard label="Total hydrants" value={data.summary.total} hint="Hydrant record count" icon={<MapPinned />} />
        <StatCard label="GIS ready" value={data.summary.gisReady} hint="Mapped and usable" icon={<CheckCircle2 />} />
        <StatCard label="Out of service" value={data.summary.outOfService} hint="Needs repair" icon={<AlertTriangle />} />
        <StatCard label="Need work" value={data.summary.needingWork} hint="Flushing or maintenance" icon={<Wrench />} />
      </div>
      <div className="two-col">
        <SectionCard title="Hydrant inventory">
          <DataTable
            columns={['Hydrant', 'Address', 'Flow', 'GIS', 'Status']}
            rows={data.hydrants}
            onRowClick={(hydrant: any) => setSelected(hydrant)}
            renderRow={(hydrant: any) => (
              <>
                <td><b>{hydrant.hydrantNumber}</b><div className="muted">{hydrant.stationId}</div></td>
                <td>{hydrant.address}</td>
                <td>{hydrant.flowGpm} gpm</td>
                <td><StatusBadge status={hydrant.gisReady ? 'Healthy' : 'Warning'} /></td>
                <td><StatusBadge status={hydrant.status} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Nearby occupancy risk">
          <div className="stack">
            {data.linkedOccupancies.map((occupancy: any) => (
              <article className="mini-card" key={occupancy.id}>
                <div>
                  <b>{occupancy.occupancyName}</b>
                  <span>{occupancy.address}</span>
                </div>
                <StatusBadge status={occupancy.riskLevel} />
                <span className="muted">Hydrants: {occupancy.hydrantIds.join(', ')}</span>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.hydrantNumber} subtitle="Hydrant status and maintenance" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Hydrant record"
            record={{
              Address: selected.address,
              Flow: `${selected.flowGpm} gpm`,
              GIS: selected.gisReady ? 'Ready' : 'Needs work',
              Status: selected.status,
              Risk: selected.riskLevel,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updateHydrant(selected.id, { status: 'Healthy', maintenanceStatus: 'Healthy' });
                  addAudit('Hydrant restored', 'Hydrants', selected.id, selected.hydrantNumber, 'Info');
                  emitToast('Hydrant updated', `${selected.hydrantNumber} marked healthy.`);
                  setSelected(null);
                }}>Mark Healthy</button>
                <button type="button" onClick={() => {
                  updateHydrant(selected.id, { status: 'Out of Service', maintenanceStatus: 'Overdue' });
                  emitToast('Hydrant out of service', 'Maintenance ticket should be created.', 'warning');
                }}>Out of Service</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function MobileFieldMode() {
  useDemoRefreshToken();
  const data = getMobileFieldMode();
  return (
    <>
      <PageHeader eyebrow="Field operations" title="Mobile Field Mode" description="Tablet, MDT, and mobile workflows for offline save, sync pending, inspections, vehicle checks, incident notes, and training attendance." />
      <OperationalBriefing
        summary="This module is built around what crews actually need in the field: capture the note, save offline, and sync it later without losing the record."
        bullets={[
          `${data.summary.offlineSaved} records were saved offline and ${data.summary.syncPending} are waiting to sync.`,
          `${data.summary.inspectionsCompleted} inspection(s) are completed through field workflows.`,
          `${data.summary.vehicleChecksPending} vehicle check(s) and ${data.summary.trainingAttendancePending} training item(s) still need attention.`,
        ]}
        badge="Healthy"
        actions={<HeaderActions routes={[{ label: 'Open Inspections', route: '/prevention-inspections' }, { label: 'Open Training', route: 'learning' }]} />}
        evidence={['Offline save', 'Sync queue', 'Vehicle checks', 'Incident notes', 'Training attendance']}
      />
      <div className="stats-grid">
        <StatCard label="Offline saved" value={data.summary.offlineSaved} hint="Queued for sync" icon={<Smartphone />} />
        <StatCard label="Sync pending" value={data.summary.syncPending} hint="Waiting for connectivity" icon={<Cloud />} />
        <StatCard label="Inspections completed" value={data.summary.inspectionsCompleted} hint="Field workflow" icon={<CheckCircle2 />} />
        <StatCard label="Vehicle checks pending" value={data.summary.vehicleChecksPending} hint="Apparatus review" icon={<Wrench />} />
        <StatCard label="Training pending" value={data.summary.trainingAttendancePending} hint="Attendance follow-up" icon={<FileText />} />
      </div>
      <div className="two-col">
        <SectionCard title="Offline queue">
          <DataTable
            columns={['Item', 'Route', 'Priority', 'Status']}
            rows={data.offlineQueue}
            renderRow={(notification: any) => (
              <>
                <td><b>{notification.title}</b><div className="muted">{notification.message}</div></td>
                <td>{notification.relatedRoute}</td>
                <td><StatusBadge status={notification.priority} /></td>
                <td><StatusBadge status={notification.status} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Field checklists">
          <div className="stack">
            {data.vehicleChecks.slice(0, 6).map((workOrder: any) => (
              <article className="mini-card" key={workOrder.id}>
                <div>
                  <b>{workOrder.assetName}</b>
                  <span>{workOrder.title} · Due {formatDate(workOrder.dueDate)}</span>
                </div>
                <StatusBadge status={workOrder.status} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Incident notes and attendance">
        <DataTable
          columns={['Incident / training', 'Linked record', 'Action', 'Status']}
          rows={data.attendance.slice(0, 12)}
          renderRow={(record: any) => (
              <>
                <td><b>{record.course}</b><div className="muted">{record.staffName}</div></td>
                <td>{record.relatedIncidentId}</td>
                <td>{record.actionLabel}</td>
                <td><StatusBadge status={record.status === 'Overdue' ? 'High' : record.status === 'Due Soon' ? 'Warning' : 'Healthy'} /></td>
              </>
            )}
          />
      </SectionCard>
    </>
  );
}

export function ReportBuilder() {
  useDemoRefreshToken();
  const data = getReportBuilderModule();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Intelligence" title="Report Builder / Data Warehouse" description="Saved reports, scheduled reports, filters, exports, KPI reports, compliance reports, and custom reporting." />
      <OperationalBriefing
        summary="The report builder surfaces the saved report catalog and the data warehouse pipeline underneath so evaluators can see how ad hoc and scheduled reporting fit together."
        bullets={[
          `${data.summary.total} saved report(s) are available.`,
          `${data.summary.scheduled} report(s) are scheduled automatically and ${data.summary.favorite} are marked as favorites.`,
          'Filters, export formats, and scheduling options are surfaced together so the reporting story feels complete.',
        ]}
        badge="Healthy"
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => setSelected(data.reports[0])}>Run Report</button>
            <button type="button" onClick={() => downloadVisibleCsv(data.reports, 'saved-reports.csv')}>Export</button>
          </div>
        )}
        evidence={['Saved reports', 'Schedules', 'Exports', 'Filters', 'Data warehouse']}
      />
      <div className="stats-grid">
        <StatCard label="Saved reports" value={data.summary.total} hint="Catalog entries" icon={<FileText />} />
        <StatCard label="Scheduled" value={data.summary.scheduled} hint="Recurring delivery" icon={<CalendarDays />} />
        <StatCard label="Exports" value={data.summary.exports} hint="Download-ready" icon={<BarChart3 />} />
        <StatCard label="Favorites" value={data.summary.favorite} hint="Pinned by users" icon={<CheckCircle2 />} />
      </div>
      <div className="two-col">
        <SectionCard title="Saved reports">
          <DataTable
            columns={['Report', 'Module', 'Status', 'Schedule', 'Delivery']}
            rows={data.reports}
            onRowClick={(report: any) => setSelected(report)}
            renderRow={(report: any) => (
              <>
                <td><b>{report.name}</b><div className="muted">{report.owner}</div></td>
                <td>{report.module}</td>
                <td><StatusBadge status={report.status} /></td>
                <td>{report.schedule}</td>
                <td>{report.delivery}</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Filters and export options">
          <div className="chips">
            {data.filters.map((filter: string) => <span key={filter}>{filter}</span>)}
          </div>
          <div className="stack" style={{ marginTop: 12 }}>
            {data.exportable.slice(0, 5).map((report: any) => (
              <article className="mini-card" key={report.id}>
                <div>
                  <b>{report.name}</b>
                  <span>{report.exportFormats.join(', ')} · {report.rowsIncluded} rows</span>
                </div>
                <StatusBadge status={report.status} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.name} subtitle="Saved report detail and run controls" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Report record"
            record={{
              Module: selected.module,
              Status: selected.status,
              Schedule: selected.schedule,
              Delivery: selected.delivery,
              Formats: selected.exportFormats,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  updateReport(selected.id, { status: 'Running', lastRun: new Date().toISOString() });
                  addAudit('Run report', 'Report Builder', selected.id, selected.name, 'Info');
                  emitToast('Report running', `${selected.name} is being generated.`);
                }}>Run</button>
                <button type="button" onClick={() => {
                  updateReport(selected.id, { status: 'Scheduled' });
                  emitToast('Report scheduled', `${selected.name} added to the schedule queue.`);
                }}>Schedule</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function SecurityCompliance() {
  useDemoRefreshToken();
  const data = getSecurityTrustCenter();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Platform trust" title="Security & Compliance / Trust Center" description="SSO, MFA, RBAC, audit logs, encryption, backups, RTO/RPO, vulnerability management, NIST/CJIS/HIPAA alignment, and VPAT/accessibility readiness." />
      <OperationalBriefing
        summary="This trust center gives procurement, IT, and leadership a single place to validate platform posture, controls, and the evidence trail supporting the demo."
        bullets={[
          `MFA, RBAC, backups, and SSO are marked ${data.summary.mfa.toLowerCase()} / ${data.summary.sso.toLowerCase()} / ${data.summary.backups.toLowerCase()}.`,
          `RTO ${data.summary.rto} and RPO ${data.summary.rpo} are published for continuity review.`,
          `${data.summary.vulnerabilities} vulnerability item(s) remain open and ${data.summary.auditEvents} audit event(s) are tracked.`,
        ]}
        badge={data.summary.vulnerabilities > 0 ? 'Warning' : 'Healthy'}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => downloadVisibleCsv(data.audits, 'security-audit-log.csv')}>Export</button>
            <button type="button" onClick={() => setSelected(data.audits[0])}>Review</button>
          </div>
        )}
        evidence={['SSO / MFA', 'RBAC', 'Encryption', 'Backups', 'NIST/CJIS/HIPAA', 'VPAT']}
      />
      <div className="stats-grid">
        <StatCard label="SSO / MFA" value={data.summary.sso} hint="Identity posture" icon={<Lock />} />
        <StatCard label="RBAC" value={data.summary.rbac} hint="Role-based control" icon={<ShieldCheck />} />
        <StatCard label="Backups" value={data.summary.backups} hint="Restore posture" icon={<Cloud />} />
        <StatCard label="RTO / RPO" value={`${data.summary.rto} / ${data.summary.rpo}`} hint="Recovery targets" icon={<LifeBuoy />} />
        <StatCard label="Open vulnerabilities" value={data.summary.vulnerabilities} hint="Review queue" icon={<AlertTriangle />} />
        <StatCard label="Audit events" value={data.summary.auditEvents} hint="Traceable activity" icon={<FileText />} />
      </div>
      <div className="two-col">
        <SectionCard title="Control posture">
          <div className="stack">
            {data.controls.map((control: any) => (
              <article className="mini-card" key={control.control}>
                <div>
                  <b>{control.control}</b>
                  <span>{control.detail}</span>
                </div>
                <StatusBadge status={control.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Audit log">
          <DataTable
            columns={['Time', 'User', 'Action', 'Compliance']}
            rows={data.audits}
            onRowClick={(event: any) => setSelected(event)}
            renderRow={(event: any) => (
              <>
                <td>{formatDate(event.createdAt)}</td>
                <td><b>{event.user}</b></td>
                <td>{event.action}</td>
                <td>{event.complianceTag}</td>
              </>
            )}
          />
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.action} subtitle="Security and compliance event" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Audit event"
            record={{
              User: selected.user,
              Module: selected.module,
              Severity: selected.severity,
              Compliance: selected.complianceTag,
              Description: selected.description,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  addAudit('Reviewed audit event', 'Security', selected.id, selected.action, 'Info');
                  emitToast('Audit reviewed', 'Event recorded in the audit trail.');
                  setSelected(null);
                }}>Mark Reviewed</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function ContinuityCenter() {
  useDemoRefreshToken();
  const data = getContinuityCenter();
  const [selected, setSelected] = useState<any>(null);
  return (
    <>
      <PageHeader eyebrow="Platform trust" title="SLA / Data Ownership / Continuity Center" description="Uptime, support SLAs, data exports, disaster recovery, monitoring, data retention, and vendor exit planning." />
      <OperationalBriefing
        summary="This module is for procurement and IT leaders who need confidence in support, recovery targets, exportability, and what happens if the vendor relationship ends."
        bullets={[
          `Uptime is listed at ${data.summary.uptime} and support SLA remains ${data.summary.supportSla}.`,
          `${data.summary.dataExports} report export profile(s) are already ready for handoff.`,
          `Retention is set to ${data.summary.retention} and the vendor exit plan is ${data.summary.exitPlan.toLowerCase()}.`,
        ]}
        badge={data.summary.supportSla}
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => downloadVisibleCsv(data.exportSamples, 'continuity-exports.csv')}>Export</button>
            <button type="button" onClick={() => setSelected(data.continuityItems[0])}>Review</button>
          </div>
        )}
        evidence={['Uptime', 'Support SLA', 'Exports', 'DR plan', 'Retention', 'Vendor exit']}
      />
      <div className="stats-grid">
        <StatCard label="Uptime" value={data.summary.uptime} hint="Rolling availability" icon={<Gauge />} />
        <StatCard label="Support SLA" value={data.summary.supportSla} hint="Service posture" icon={<LifeBuoy />} />
        <StatCard label="Data exports" value={data.summary.dataExports} hint="Prepared for handoff" icon={<FileText />} />
        <StatCard label="DR tests" value={data.summary.drTests} hint="Exercise cadence" icon={<Cloud />} />
        <StatCard label="Retention" value={data.summary.retention} hint="Data retention policy" icon={<Lock />} />
        <StatCard label="Exit plan" value={data.summary.exitPlan} hint="Vendor transition readiness" icon={<CheckCircle2 />} />
      </div>
      <div className="two-col">
        <SectionCard title="Continuity plan">
          <div className="stack">
            {data.continuityItems.map((item: any) => (
              <article className="mini-card selectable" key={item.title} onClick={() => setSelected(item)}>
                <div>
                  <b>{item.title}</b>
                  <span>{item.detail}</span>
                </div>
                <StatusBadge status={item.status} />
              </article>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Alerts and export samples">
          <div className="stack">
            {data.alerts.slice(0, 6).map((alert: any) => (
              <article className="mini-card" key={alert.id}>
                <div>
                  <b>{alert.title}</b>
                  <span>{alert.message}</span>
                </div>
                <StatusBadge status={alert.priority} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      <SectionCard title="Report export samples">
        <DataTable
          columns={['Report', 'Module', 'Status', 'Delivery']}
          rows={data.exportSamples}
          renderRow={(report: any) => (
            <>
              <td><b>{report.name}</b></td>
              <td>{report.module}</td>
              <td><StatusBadge status={report.status} /></td>
              <td>{report.delivery}</td>
            </>
          )}
        />
      </SectionCard>
      {selected ? (
        <Modal title={selected.title} subtitle="Continuity and exit planning" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Continuity control"
            record={{
              Detail: selected.detail,
              Status: selected.status,
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  addAudit('Reviewed continuity item', 'Continuity', selected.title, selected.title, 'Info');
                  emitToast('Continuity reviewed', `${selected.title} recorded as reviewed.`);
                  setSelected(null);
                }}>Mark Reviewed</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}

export function IntegrationHubDemo() {
  useDemoRefreshToken();
  const data = getIntegrationHubModule();
  const dashboard = getDemoDashboardSummary();
  const [selected, setSelected] = useState<any>(null);
  const syncNow = (integration: any) => {
    updateIntegration(integration.id, { status: 'Healthy', syncStatus: 'Live', lastSyncAt: new Date().toISOString(), healthScore: Math.min(99, Number(integration.healthScore ?? 90) + 1) });
    addAudit('Sync connector', 'Integration Hub', integration.id, integration.name, 'Info');
    emitToast('Sync complete', `${integration.name} refreshed successfully.`);
  };
  return (
    <>
      <PageHeader eyebrow="Platform trust" title="Integration Hub" description="CAD, RMS, NERIS, ePCR, payroll, HRIS, GIS/ESRI, SSO, email/SMS, finance, and data warehouse connector status." />
      <OperationalBriefing
        summary="This version of Integration Hub is driven by the demo data layer so the connector posture, sync latency, and health signals always show up instantly."
        bullets={[
          `${data.summary.healthy} connector(s) are healthy and ${data.summary.warning} need attention.`,
          `Average connector health is ${data.summary.avgHealth}% across ${data.summary.total} systems.`,
          `The dashboard sees the same integration health value (${dashboard.integrationHealth}) so the story is consistent across the suite.`,
        ]}
        badge="Healthy"
        actions={(
          <div className="inline-actions">
            <button type="button" className="btn-primary" onClick={() => syncNow(data.integrations[0])}>Sync Now</button>
            <button type="button" onClick={() => setSelected(data.integrations[0])}>Review</button>
          </div>
        )}
        evidence={['CAD', 'RMS', 'NERIS', 'ePCR', 'Payroll', 'GIS', 'SSO']}
      />
      <div className="stats-grid">
        <StatCard label="Healthy" value={data.summary.healthy} hint="Connector status" icon={<CheckCircle2 />} />
        <StatCard label="Warning" value={data.summary.warning} hint="Needs review" icon={<AlertTriangle />} />
        <StatCard label="Total systems" value={data.summary.total} hint="Integration landscape" icon={<Radio />} />
        <StatCard label="Avg health" value={`${data.summary.avgHealth}%`} hint="Connector score" icon={<ShieldCheck />} />
      </div>
      <div className="two-col">
        <SectionCard title="Connector health">
          <DataTable
            columns={['System', 'Type', 'Status', 'Owner', 'Domains']}
            rows={data.integrations}
            onRowClick={(integration: any) => setSelected(integration)}
            renderRow={(integration: any) => (
              <>
                <td><b>{integration.name}</b><div className="muted">{integration.authMethod}</div></td>
                <td>{integration.systemType}</td>
                <td><StatusBadge status={integration.status} /></td>
                <td>{integration.owner}</td>
                <td>{integration.dataDomains.join(', ')}</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Recent security and sync signals">
          <div className="stack">
            {data.recentLogs.map((event: any) => (
              <article className="mini-card" key={event.id}>
                <div>
                  <b>{event.action}</b>
                  <span>{event.description}</span>
                </div>
                <StatusBadge status={event.severity} />
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
      {selected ? (
        <Modal title={selected.name} subtitle="Integration connector detail" onClose={() => setSelected(null)}>
          <DetailSummary
            title="Connector summary"
            record={{
              Type: selected.systemType,
              Status: selected.status,
              Owner: selected.owner,
              Domains: selected.dataDomains,
              LastSync: formatDate(selected.lastSyncAt),
            }}
            actions={(
              <div className="inline-actions">
                <button type="button" className="btn-primary" onClick={() => {
                  syncNow(selected);
                  setSelected(null);
                }}>Sync Now</button>
              </div>
            )}
          />
        </Modal>
      ) : null}
    </>
  );
}
