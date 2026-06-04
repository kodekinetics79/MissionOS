import { useEffect, useMemo, useState } from 'react';
import {
  getAdminPermissions,
  getAdminRoles,
  getAdminTenant,
  getAdminTrustCenter,
  getAdminUsers,
  getAccessReviews,
  getAuditLogs,
  getBackupPolicy,
  getComplianceMapping,
  getDrPlan,
  getMfaPolicy,
  getPasswordPolicy,
  getSecurityControls,
  getSecurityIncidents,
  getSensitiveAccessLogs,
  getSessionLogs,
  getSsoConfig,
  getVulnerabilities,
  getAdminRbacMatrix,
} from '../services/platformClient';
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

const cardValue = (value: unknown) => (typeof value === 'number' ? value.toLocaleString() : String(value ?? '—'));

export function Security() {
  const summary = useResource(getAdminTrustCenter, []);
  const tenant = useResource(getAdminTenant, []);
  const compliance = useResource(getComplianceMapping, []);
  const controls = useResource(getSecurityControls, []);
  const audits = useResource(getAuditLogs, []);
  const reviews = useResource(getAccessReviews, []);

  const cards = summary?.summaryCards ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Security posture"
        title="Security, Administration & Trust Center"
        description="Role-based access, auditability, compliance posture, resilience, and public-sector support governance."
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="This trust center answers who has access, what they touched, what controls are in place, and whether the platform is ready for a public-sector buyer conversation."
        bullets={[
          `${summary?.openAccessReviews ?? 0} access review(s) are open and ${summary?.openSecurityIncidents ?? 0} security incident(s) need attention.`,
          `${summary?.ssoStatus ?? 'SSO placeholder'} and ${summary?.mfaAdoptionPlaceholder ?? 0}% MFA adoption are presented as configurable posture signals, not certification claims.`,
          `Audit, sensitive access, and session logging provide traceability across administrative actions.`,
        ]}
        badge={summary?.supportSlaStatus ?? 'Watch'}
        actions={<button type="button" className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'admin-access' } }))}>Open access reviews</button>}
        evidence={['NIST CSF', 'CJIS-aligned posture', 'HIPAA-aware access', 'SOC 2-ready controls', 'Audit-ready logging']}
      />
      <div className="stats-grid">
        {cards.map((card: any) => <StatCard key={card.label} label={card.label} value={cardValue(card.value)} hint="Live trust-center signal" />)}
        <StatCard label="MFA adoption" value={`${summary?.mfaAdoptionPlaceholder ?? 0}`} hint="Placeholder adoption count" />
        <StatCard label="Uptime" value={`${summary?.uptime ?? 0}%`} hint="Rolling platform availability" />
        <StatCard label="RTO / RPO" value={`${summary?.rtoMinutes ?? 0}m / ${summary?.rpoMinutes ?? 0}m`} hint="Backup and DR targets" />
        <StatCard label="Support SLA" value={summary?.supportSlaStatus ?? 'On Track'} hint="Ticket posture" />
      </div>
      <div className="three-col">
        <SectionCard title="Trust posture">
          <ul className="check-list">
            <li>Tenant: <b>{tenant?.name ?? 'West Metro Fire & EMS (Sample Agency)'}</b></li>
            <li>SSO: <StatusBadge status={summary?.ssoStatus ?? 'Active'} /></li>
            <li>Open access reviews: <b>{summary?.openAccessReviews ?? 0}</b></li>
            <li>Open security incidents: <b>{summary?.openSecurityIncidents ?? 0}</b></li>
          </ul>
        </SectionCard>
        <SectionCard title="Compliance posture">
          <div className="chips">
            <span>NIST CSF-aligned mapping</span>
            <span>CJIS-aligned control posture placeholder</span>
            <span>HIPAA-aware privacy controls</span>
            <span>SOC 2-ready control structure</span>
          </div>
          <p style={{ marginTop: 12 }}>Mapped controls: {compliance?.items?.length ?? 0}</p>
        </SectionCard>
        <SectionCard title="Recommended actions">
          <ul className="check-list">
            {(summary?.recommendedActions ?? ['Review access recertifications', 'Check backup posture']).map((action: string) => <li key={action}>{action}</li>)}
          </ul>
        </SectionCard>
      </div>
      <SectionCard title="Security controls and evidence">
        <DataTable
          columns={['Control', 'Framework', 'Status', 'Owner', 'Reviewed']}
          rows={(controls as any)?.items ?? []}
          renderRow={(control: any) => (
            <>
              <td><b>{control.controlCode}</b><div>{control.controlName}</div></td>
              <td>{control.framework}</td>
              <td><StatusBadge status={control.implementationStatus} /></td>
              <td>{control.ownerTeam}</td>
              <td>{control.lastReviewedAt ? new Date(control.lastReviewedAt).toLocaleDateString() : '—'}</td>
            </>
          )}
        />
      </SectionCard>
      <div className="two-col">
        <SectionCard title="Access review campaigns">
          <DataTable
            columns={['Review', 'Status', 'Owner', 'Due']}
            rows={(reviews as any)?.items ?? []}
            renderRow={(review: any) => (
              <>
                <td><b>{review.reviewName}</b></td>
                <td><StatusBadge status={review.status} /></td>
                <td>{review.ownerUserId}</td>
                <td>{review.dueDate ? new Date(review.dueDate).toLocaleDateString() : '—'}</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard title="Audit activity">
          <DataTable
            columns={['Time', 'User', 'Action', 'Module']}
            rows={(audits as any)?.items ?? []}
            renderRow={(log: any) => (
              <>
                <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
                <td><b>{log.userId ?? 'System'}</b></td>
                <td>{log.action}</td>
                <td>{log.module ?? log.entityName ?? 'Admin'}</td>
              </>
            )}
          />
        </SectionCard>
      </div>
    </>
  );
}

export function UserManagement() {
  const users = useResource(() => getAdminUsers({ take: 100 }), []);
  const roles = useResource(getAdminRoles, []);
  return (
    <>
      <PageHeader eyebrow="Administration" title="User Management" description="Invite, disable, lock, and review user access." />
      <SectionCard title="Users">
        <DataTable
          columns={['User', 'Personnel', 'Status', 'Roles', 'MFA', 'Last Login']}
          rows={(users as any)?.items ?? []}
          renderRow={(user: any) => (
            <>
              <td><b>{user.displayName}</b><div>{user.email}</div></td>
              <td>{user.personnelId ?? '—'}</td>
              <td><StatusBadge status={user.status ?? (user.isActive ? 'Active' : 'Disabled')} /></td>
              <td>{(user.roles ?? []).map((link: any) => link.role?.name ?? link.roleId).join(', ') || '—'}</td>
              <td>{user.mfaEnabled ? 'Enabled' : '—'}</td>
              <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '—'}</td>
            </>
          )}
        />
      </SectionCard>
      <SectionCard title="Role context">
        <div className="chips">
          {(roles as any)?.items?.map((role: any) => <span key={role.id}>{role.name}</span>)}
        </div>
      </SectionCard>
    </>
  );
}

export function RoleManagement() {
  const roles = useResource(getAdminRoles, []);
  const permissions = useResource(getAdminPermissions, []);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Role Management" description="System and custom roles with assigned permissions." />
      <SectionCard title="Roles">
        <DataTable
          columns={['Role', 'Type', 'Users', 'Permissions']}
          rows={(roles as any)?.items ?? []}
          renderRow={(role: any) => (
            <>
              <td><b>{role.name}</b><div>{role.description}</div></td>
              <td>{role.roleType ?? (role.isSystemRole ? 'System' : 'Custom')}</td>
              <td>{role.assignedUsersCount ?? (role.permissions?.length ?? 0)}</td>
              <td>{role.permissionCount ?? role.permissions?.length ?? 0}</td>
            </>
          )}
        />
      </SectionCard>
      <SectionCard title="Permission set">
        <div className="chips">
          {(permissions as any)?.items?.slice(0, 18).map((permission: any) => <span key={permission.id}>{permission.code}</span>)}
        </div>
      </SectionCard>
    </>
  );
}

export function RbacMatrix() {
  const matrix = useResource(getAdminRbacMatrix, []);
  return (
    <>
      <PageHeader eyebrow="Administration" title="RBAC Matrix" description="Roles by columns, permissions by rows, with risky permissions highlighted." />
      <SectionCard title="Role / permission matrix">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Permission</th>
                {(matrix?.roles ?? []).slice(0, 8).map((role: any) => <th key={role.id}>{role.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {(matrix?.permissions ?? []).slice(0, 24).map((permission: any) => (
                <tr key={permission.id}>
                  <td>
                    <b>{permission.code}</b>
                    <div>{permission.module}</div>
                  </td>
                  {(matrix?.roles ?? []).slice(0, 8).map((role: any) => (
                    <td key={`${permission.id}-${role.id}`}>{(matrix?.matrix ?? []).find((entry: any) => entry.roleId === role.id)?.permissions?.includes(permission.code) ? '✓' : '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}

export function AccessReviewCenter() {
  const reviews = useResource(getAccessReviews, []);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Access Review Center" description="Governance campaigns for role recertification and access hygiene." />
      <SectionCard title="Campaigns">
        <DataTable
          columns={['Review', 'Status', 'Owner', 'Due', 'Items']}
          rows={(reviews as any)?.items ?? []}
          renderRow={(review: any) => (
            <>
              <td><b>{review.reviewName}</b></td>
              <td><StatusBadge status={review.status} /></td>
              <td>{review.ownerUserId}</td>
              <td>{review.dueDate ? new Date(review.dueDate).toLocaleDateString() : '—'}</td>
              <td>{review.items?.length ?? '—'}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function AuditLogViewer() {
  const logs = useResource(getAuditLogs, []);
  return (
    <>
      <PageHeader eyebrow="Audit" title="Audit Log Viewer" description="Operational changes, exports, and sensitive actions." />
      <SectionCard title="Audit trail">
        <DataTable
          columns={['Time', 'User', 'Module', 'Action', 'Severity']}
          rows={(logs as any)?.items ?? []}
          renderRow={(log: any) => (
            <>
              <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
              <td>{log.userId ?? 'System'}</td>
              <td>{log.module ?? 'Admin'}</td>
              <td>{log.action}</td>
              <td><StatusBadge status={log.severity ?? 'Normal'} /></td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function SensitiveDataAccessLogs() {
  const logs = useResource(() => import('../services/platformClient').then((module) => module.getSensitiveAccessLogs()), []);
  return (
    <>
      <PageHeader eyebrow="Audit" title="Sensitive Data Access Logs" description="HIPAA-aware access history for ePCR, personnel documents, and security settings." />
      <SectionCard title="Sensitive access">
        <DataTable
          columns={['Time', 'User', 'Category', 'Entity', 'Access']}
          rows={(logs as any)?.items ?? []}
          renderRow={(log: any) => (
            <>
              <td>{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</td>
              <td>{log.userId}</td>
              <td>{log.dataCategory}</td>
              <td>{log.entityName}</td>
              <td><StatusBadge status={log.accessType} /></td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function SessionLogs() {
  const logs = useResource(() => import('../services/platformClient').then((module) => module.getSessionLogs()), []);
  return (
    <>
      <PageHeader eyebrow="Audit" title="Session Logs" description="Login, logout, lock, and MFA posture tracking." />
      <SectionCard title="Session history">
        <DataTable
          columns={['Login', 'Logout', 'User', 'IP', 'Status']}
          rows={(logs as any)?.items ?? []}
          renderRow={(log: any) => (
            <>
              <td>{log.loginAt ? new Date(log.loginAt).toLocaleString() : '—'}</td>
              <td>{log.logoutAt ? new Date(log.logoutAt).toLocaleString() : '—'}</td>
              <td>{log.userId}</td>
              <td>{log.ipAddress ?? '—'}</td>
              <td><StatusBadge status={log.status} /></td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function AuthenticationPolicies() {
  const passwordPolicy = useResource(getPasswordPolicy, []);
  const mfaPolicy = useResource(getMfaPolicy, []);
  const sso = useResource(getSsoConfig, []);
  return (
    <>
      <PageHeader eyebrow="Authentication" title="Authentication Policies" description="Password policy, MFA posture, and SSO placeholders." />
      <div className="three-col">
        <SectionCard title="Password policy">
          <ul className="check-list">
            <li>Min length: <b>{passwordPolicy?.minLength ?? 14}</b></li>
            <li>Complexity: <b>{passwordPolicy?.requireUppercase ? 'Upper/lower/number/special' : 'Basic'}</b></li>
            <li>Lockout threshold: <b>{passwordPolicy?.lockoutThreshold ?? 5}</b></li>
          </ul>
        </SectionCard>
        <SectionCard title="MFA policy">
          <ul className="check-list">
            <li>Admins required: <b>{mfaPolicy?.requiredForAdmins ? 'Yes' : 'No'}</b></li>
            <li>All users: <b>{mfaPolicy?.requiredForAllUsers ? 'Yes' : 'Placeholder'}</b></li>
            <li>Methods: {(mfaPolicy?.allowedMethodsJson ?? []).join(', ') || 'TOTP, Push'}</li>
          </ul>
        </SectionCard>
        <SectionCard title="SSO">
          <div className="chips">
            {(sso as any)?.items?.map((config: any) => <span key={config.id}>{config.providerName}: {config.status}</span>)}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

export const SsoMfaSettings = AuthenticationPolicies;

export function SecurityControls() {
  const controls = useResource(getSecurityControls, []);
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Security Controls" description="NIST CSF-aligned control mapping and evidence status." />
      <SectionCard title="Controls">
        <DataTable
          columns={['Code', 'Framework', 'Control', 'Status', 'Owner']}
          rows={(controls as any)?.items ?? []}
          renderRow={(control: any) => (
            <>
              <td><b>{control.controlCode}</b></td>
              <td>{control.framework}</td>
              <td>{control.controlName}</td>
              <td><StatusBadge status={control.implementationStatus} /></td>
              <td>{control.ownerTeam}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function ComplianceMapping() {
  const nist = useResource(() => getComplianceMapping('NIST CSF'), []);
  const cjis = useResource(() => getComplianceMapping('CJIS-aligned'), []);
  const hipaa = useResource(() => getComplianceMapping('HIPAA-aware'), []);
  return (
    <>
      <PageHeader eyebrow="Compliance" title="Compliance Mapping" description="Framework domain mappings for NIST, CJIS-aligned, HIPAA-aware, and SOC 2-ready controls." />
      <div className="three-col">
        <SectionCard title="NIST CSF">{(nist as any)?.items?.slice(0, 4).map((item: any) => <div key={item.id}><b>{item.domain}</b> — {item.controlTitle}</div>)}</SectionCard>
        <SectionCard title="CJIS-aligned">{(cjis as any)?.items?.slice(0, 4).map((item: any) => <div key={item.id}><b>{item.domain}</b> — {item.controlTitle}</div>)}</SectionCard>
        <SectionCard title="HIPAA-aware">{(hipaa as any)?.items?.slice(0, 4).map((item: any) => <div key={item.id}><b>{item.domain}</b> — {item.controlTitle}</div>)}</SectionCard>
      </div>
    </>
  );
}

export function BackupDisasterRecovery() {
  const backup = useResource(getBackupPolicy, []);
  const dr = useResource(getDrPlan, []);
  return (
    <>
      <PageHeader eyebrow="Resilience" title="Backup & Disaster Recovery" description="Backup frequency, encryption, RPO/RTO, restore testing, and DR plan posture." />
      <div className="three-col">
        <SectionCard title="Backup policy">
          <ul className="check-list">
            <li>Frequency: <b>{backup?.backupFrequency ?? 'Daily'}</b></li>
            <li>Retention: <b>{backup?.retentionDays ?? 30} days</b></li>
            <li>Encrypted: <b>{backup?.encryptionEnabled ? 'Yes' : 'No'}</b></li>
          </ul>
        </SectionCard>
        <SectionCard title="Recovery targets">
          <ul className="check-list">
            <li>RTO: <b>{backup?.rtoMinutes ?? dr?.rtoMinutes ?? 240} min</b></li>
            <li>RPO: <b>{backup?.rpoMinutes ?? dr?.rpoMinutes ?? 15} min</b></li>
            <li>Last restore test: {backup?.lastRestoreTestAt ? new Date(backup.lastRestoreTestAt).toLocaleDateString() : '—'}</li>
          </ul>
        </SectionCard>
        <SectionCard title="DR plan">
          <p><b>{dr?.planName ?? 'Disaster recovery plan'}</b></p>
          <p>{dr?.summary ?? 'Placeholder recovery and failover plan.'}</p>
        </SectionCard>
      </div>
    </>
  );
}

export function SecurityIncidentResponse() {
  const incidents = useResource(getSecurityIncidents, []);
  return (
    <>
      <PageHeader eyebrow="Incident response" title="Security Incident Response" description="Lifecycle tracking for prepare, detect, contain, resolve, and close." />
      <SectionCard title="Incidents">
        <DataTable
          columns={['Number', 'Title', 'Severity', 'Status', 'Detected', 'Owner']}
          rows={(incidents as any)?.items ?? []}
          renderRow={(incident: any) => (
            <>
              <td><b>{incident.incidentNumber}</b></td>
              <td>{incident.title}</td>
              <td><StatusBadge status={incident.severity} /></td>
              <td><StatusBadge status={incident.status} /></td>
              <td>{incident.detectedAt ? new Date(incident.detectedAt).toLocaleDateString() : '—'}</td>
              <td>{incident.ownerUserId ?? '—'}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}

export function VulnerabilityManagement() {
  const vulns = useResource(getVulnerabilities, []);
  return (
    <>
      <PageHeader eyebrow="Security posture" title="Vulnerability Management" description="Open, remediating, risk accepted, and resolved vulnerabilities." />
      <SectionCard title="Vulnerabilities">
        <DataTable
          columns={['Number', 'Title', 'Severity', 'Status', 'Source', 'Due']}
          rows={(vulns as any)?.items ?? []}
          renderRow={(vuln: any) => (
            <>
              <td><b>{vuln.vulnerabilityNumber}</b></td>
              <td>{vuln.title}</td>
              <td><StatusBadge status={vuln.severity} /></td>
              <td><StatusBadge status={vuln.status} /></td>
              <td>{vuln.source}</td>
              <td>{vuln.dueDate ? new Date(vuln.dueDate).toLocaleDateString() : '—'}</td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}
