import { useEffect, useState } from 'react';
import { getEscalationPaths, getSlaPolicies, getSupportTickets, getSystemStatus } from '../services/platformClient';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { OperationalBriefing } from '../components/OperationalBriefing';

function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<T | null>(null);
  useEffect(() => {
    let active = true;
    loader().then((data) => {
      if (active) setState(data);
    }).catch(() => undefined);
    return () => { active = false; };
  }, deps);
  return state;
}

export function Support() {
  const tickets = useResource(() => getSupportTickets(), []);
  const sla = useResource(() => getSlaPolicies(), []);
  const status = useResource(() => getSystemStatus(), []);
  const escalations = useResource(() => getEscalationPaths(), []);

  const openTickets = ((tickets as any)?.items ?? []).filter((ticket: any) => !['Resolved', 'Closed'].includes(ticket.status)).length;
  const breached = ((tickets as any)?.items ?? []).filter((ticket: any) => ticket.slaStatus === 'Breached').length;

  return (
    <>
      <PageHeader
        eyebrow="Support posture"
        title="Support / SLA Center"
        description="Ticket queue, SLA posture, escalation path, and system status for public-sector buyers."
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="The support center shows whether critical requests are being met on time, whether escalations are defined, and whether the system status supports buyer confidence."
        bullets={[
          `${openTickets} open ticket(s) with ${breached} breached SLA item(s) need immediate triage.`,
          'SLA targets are visible by severity so evaluators can see response maturity.',
          'Escalation paths and system status events demonstrate support governance and operational discipline.',
        ]}
        badge={breached > 0 ? 'Warning' : 'Healthy'}
        actions={<button type="button" className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'support-sla' } }))}>Open SLA center</button>}
        evidence={['Response targets', 'Escalation path', 'Account manager', 'Uptime', 'Support maturity']}
      />
      <div className="stats-grid">
        <StatCard label="Open tickets" value={openTickets} hint="Live queue" />
        <StatCard label="Breached SLA" value={breached} hint="Escalation needed" />
        <StatCard label="Uptime" value="99.95%" hint="Rolling 30 days" />
        <StatCard label="Account manager" value="Assigned" hint="Support governance" />
      </div>
      <SectionCard title="Support ticket queue">
        <DataTable
          columns={['Ticket', 'Title', 'Severity', 'Status', 'SLA', 'Owner']}
          rows={(tickets as any)?.items ?? []}
          renderRow={(ticket: any) => (
            <>
              <td><b>{ticket.ticketNumber ?? ticket.id}</b></td>
              <td>{ticket.title}</td>
              <td><StatusBadge status={ticket.severity} /></td>
              <td><StatusBadge status={ticket.status} /></td>
              <td>{ticket.slaStatus ?? 'On Track'}</td>
              <td>{ticket.assignedTo ?? ticket.requesterName ?? 'Support'}</td>
            </>
          )}
        />
      </SectionCard>
      <div className="three-col">
        <SectionCard title="SLA matrix">
          <DataTable
            columns={['Severity', 'First response', 'Resolution', 'Escalation']}
            rows={(sla as any)?.items ?? []}
            renderRow={(policy: any) => (
              <>
                <td><b>{policy.severity}</b></td>
                <td>{policy.firstResponseMinutes} min</td>
                <td>{policy.resolutionMinutes} min</td>
                <td>{policy.escalationMinutes} min</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Escalation path">
          <ul className="check-list">
            {(escalations as any)?.items?.slice(0, 6).map((path: any) => <li key={path.id}>{path.level}. {path.roleName} — {path.contactName}</li>)}
          </ul>
        </SectionCard>
        <SectionCard title="System status">
          <ul className="check-list">
            {(status as any)?.items?.slice(0, 6).map((item: any) => <li key={item.id}><StatusBadge status={item.status} /> {item.componentName}</li>)}
          </ul>
        </SectionCard>
      </div>
    </>
  );
}

export const SlaCenter = Support;
export const EscalationPath = Support;
export const SystemStatus = Support;
