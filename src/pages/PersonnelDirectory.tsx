import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BadgeAlert, Building2, BriefcaseBusiness, ShieldCheck, Users } from 'lucide-react';
import { getExpiringPersonnelCertifications, getPersonnel, getPersonnelReadinessSummary, getPersonnelRisks } from '../services/platformClient';
import type { Personnel } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable } from '../components/DataTable';
import { SearchBox } from '../components/SearchBox';
import { FilterBar } from '../components/FilterBar';
import { LoadingState } from '../components/LoadingState';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';

const open360 = (personnelId: string) => {
  window.dispatchEvent(new CustomEvent('missionos:open-personnel-360', { detail: { personnelId } }));
};

export function PersonnelDirectory() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [search, setSearch] = useState('');
  const [station, setStation] = useState('all');
  const [rank, setRank] = useState('all');
  const [shift, setShift] = useState('all');
  const [certStatus, setCertStatus] = useState('all');
  const [readinessStatus, setReadinessStatus] = useState('all');
  const [employmentStatus, setEmploymentStatus] = useState('all');
  const [summary, setSummary] = useState<{ ready: number; watch: number; atRisk: number; critical: number; readinessAverage: number; expiringCertifications: number } | null>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const [riskMap, setRiskMap] = useState<Record<string, { riskLevel: string; riskScore: number; reasons: string[] }>>({});

  useEffect(() => {
    Promise.all([getPersonnel(), getExpiringPersonnelCertifications(), getPersonnelReadinessSummary(), getPersonnelRisks()]).then(([personnelResponse, expiringResponse, summaryResponse, risksResponse]) => {
      setPersonnel(personnelResponse.items);
      setExpiringCount(expiringResponse.length);
      setSummary(summaryResponse as any);
      setRiskMap(Object.fromEntries((risksResponse as Array<{ personnel: Personnel; riskLevel: string; riskScore: number; reasons: string[] }>).map((risk) => [risk.personnel.id, risk])));
    });
  }, []);

  const stations = useMemo(() => ['all', ...new Set(personnel.map((entry) => entry.station ?? 'Unassigned'))], [personnel]);
  const ranks = useMemo(() => ['all', ...new Set(personnel.map((entry) => entry.rank ?? 'Unassigned'))], [personnel]);
  const shifts = useMemo(() => ['all', ...new Set(personnel.map((entry) => entry.platoon ?? 'Unassigned'))], [personnel]);

  const filteredPersonnel = useMemo(() => personnel.filter((entry) => {
    const score = entry.readinessScore ?? entry.readiness ?? 0;
    const expiringCerts = entry.expiringCerts ?? 0;
    const stationMatch = station === 'all' || (entry.station ?? 'Unassigned') === station;
    const rankMatch = rank === 'all' || (entry.rank ?? 'Unassigned') === rank;
    const shiftMatch = shift === 'all' || (entry.platoon ?? 'Unassigned') === shift;
    const certMatch = certStatus === 'all'
      || (certStatus === 'healthy' && expiringCerts === 0)
      || (certStatus === 'warning' && expiringCerts > 0)
      || (certStatus === 'critical' && (entry.readinessStatus === 'AT_RISK' || entry.readinessStatus === 'CRITICAL'));
    const readinessMatch = readinessStatus === 'all'
      || (readinessStatus === 'ready' && score >= 90)
      || (readinessStatus === 'watch' && score >= 75 && score < 90)
      || (readinessStatus === 'at-risk' && score >= 60 && score < 75)
      || (readinessStatus === 'critical' && score < 60);
    const employmentMatch = employmentStatus === 'all' || (entry.employmentStatus ?? 'Full Time') === employmentStatus;
    const searchMatch = !search || `${entry.name ?? `${entry.firstName} ${entry.lastName}`} ${entry.rank} ${entry.station} ${entry.employeeNumber}`.toLowerCase().includes(search.toLowerCase());
    return stationMatch && rankMatch && shiftMatch && certMatch && readinessMatch && employmentMatch && searchMatch;
  }), [certStatus, employmentStatus, personnel, rank, readinessStatus, search, shift, station]);

  const readinessCounts = useMemo(() => {
    const ready = filteredPersonnel.filter((entry) => (entry.readinessScore ?? entry.readiness ?? 0) >= 90).length;
    const watch = filteredPersonnel.filter((entry) => (entry.readinessScore ?? entry.readiness ?? 0) >= 75 && (entry.readinessScore ?? entry.readiness ?? 0) < 90).length;
    const atRisk = filteredPersonnel.filter((entry) => (entry.readinessScore ?? entry.readiness ?? 0) >= 60 && (entry.readinessScore ?? entry.readiness ?? 0) < 75).length;
    const critical = filteredPersonnel.filter((entry) => (entry.readinessScore ?? entry.readiness ?? 0) < 60).length;
    return { ready, watch, atRisk, critical };
  }, [filteredPersonnel]);

  if (!personnel.length) {
    return <LoadingState label="Loading personnel roster..." />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Master staff record"
        title="Personnel Directory"
        description="One shared personnel record used by staffing, training, RMS, readiness, analytics, and security workflows across the agency."
      />

      <div className="stats-grid">
        <SectionCard title="Roster health">
          <div className="stack">
            <div className="mini-card"><span>Total personnel</span><b>{personnel.length}</b></div>
            <div className="mini-card"><span>Expiring certs</span><b>{expiringCount}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Readiness average">
          <div className="stack">
            <div className="mini-card"><span>District average</span><b>{summary?.readinessAverage ?? Math.round(personnel.reduce((sum, item) => sum + Number(item.readinessScore ?? item.readiness ?? 0), 0) / personnel.length)}%</b></div>
            <div className="mini-card"><span>Ready / Watch / At Risk / Critical</span><b>{summary ? `${summary.ready}/${summary.watch}/${summary.atRisk}/${summary.critical}` : `${readinessCounts.ready}/${readinessCounts.watch}/${readinessCounts.atRisk}/${readinessCounts.critical}`}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Risk signals">
          <div className="stack">
            <div className="mini-card"><span>Certification risk</span><b>{summary?.expiringCertifications ?? expiringCount}</b></div>
            <div className="mini-card"><span>Personnel at risk</span><b>{readinessCounts.atRisk + readinessCounts.critical}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Next action">
          <div className="stack">
            <div className="mini-note">Review the at-risk roster, then open Personnel 360 to inspect readiness drivers, assign training, or flag a staffing backfill.</div>
          </div>
        </SectionCard>
      </div>

      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, employee #, rank, or station" />
        <select value={station} onChange={(event) => setStation(event.target.value)}>
          {stations.map((item) => <option key={item} value={item}>{item === 'all' ? 'All stations' : item}</option>)}
        </select>
        <select value={rank} onChange={(event) => setRank(event.target.value)}>
          {ranks.map((item) => <option key={item} value={item}>{item === 'all' ? 'All ranks' : item}</option>)}
        </select>
        <select value={shift} onChange={(event) => setShift(event.target.value)}>
          {shifts.map((item) => <option key={item} value={item}>{item === 'all' ? 'All shifts' : item}</option>)}
        </select>
        <select value={certStatus} onChange={(event) => setCertStatus(event.target.value)}>
          <option value="all">All certification states</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Expiring soon</option>
          <option value="critical">Critical</option>
        </select>
        <select value={readinessStatus} onChange={(event) => setReadinessStatus(event.target.value)}>
          <option value="all">All readiness levels</option>
          <option value="ready">Ready</option>
          <option value="watch">Watch</option>
          <option value="at-risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>
        <select value={employmentStatus} onChange={(event) => setEmploymentStatus(event.target.value)}>
          <option value="all">All employment</option>
          <option value="Full Time">Full Time</option>
          <option value="Part Time">Part Time</option>
          <option value="Leave">Leave</option>
          <option value="Training">Training</option>
        </select>
      </FilterBar>

      <div className="two-col">
        <SectionCard title={`Personnel roster (${filteredPersonnel.length})`}>
          <div className="person-grid">
            {filteredPersonnel.slice(0, 12).map((entry) => {
              const risk = riskMap[entry.id];
              const score = entry.readinessScore ?? entry.readiness ?? 0;
              return (
                <article className="person-card" key={entry.id}>
                  <div className="avatar">{(entry.name ?? `${entry.firstName} ${entry.lastName}`).split(' ').map((part) => part[0]).join('')}</div>
                  <div className="person-main">
                    <h3>{entry.name ?? `${entry.firstName} ${entry.lastName}`}</h3>
                    <p>{entry.rank} · {entry.station}</p>
                    <ReadinessScore score={score} />
                    <div className="person-meta">
                      <span>Shift <b>{entry.platoon ?? 'n/a'}</b></span>
                      <span>Status <b>{entry.employmentStatus ?? 'Full Time'}</b></span>
                      <span>Certs <b>{entry.expiringCerts ?? 0}</b></span>
                    </div>
                    <div className="chips" style={{ marginTop: 0 }}>
                      <StatusBadge status={score >= 90 ? 'Healthy' : score >= 75 ? 'Warning' : 'Critical'} />
                      <StatusBadge status={(risk?.riskLevel ?? 'Ready') as any} />
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="btn-primary" onClick={() => open360(entry.id)}>
                        Open 360
                        <ArrowUpRight size={15} />
                      </button>
                      <button type="button" onClick={() => setSearch(entry.name ?? `${entry.firstName} ${entry.lastName}`)}>Focus</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Roster intelligence">
          <div className="stack">
            <div className="mini-card"><span>At-risk personnel</span><b>{readinessCounts.atRisk + readinessCounts.critical}</b></div>
            <div className="mini-card"><span>Personnel with expiring certs</span><b>{personnel.filter((entry) => (entry.expiringCerts ?? 0) > 0).length}</b></div>
            <div className="mini-card"><span>Ready staff</span><b>{readinessCounts.ready}</b></div>
            <div className="mini-note">Use this directory as the gateway into the shared personnel master record. Training, RMS participation, staffing reliability, and readiness all follow this single identity.</div>
            <div className="stack">
              {personnel.slice(0, 5).map((entry) => {
                const risk = riskMap[entry.id];
                return (
                  <article className="mini-card" key={`risk-${entry.id}`}>
                    <div>
                      <b>{entry.name ?? `${entry.firstName} ${entry.lastName}`}</b>
                      <span>{risk?.riskLevel ?? 'Ready'} · {risk?.riskScore ?? entry.readinessScore ?? 0}%</span>
                    </div>
                    <StatusBadge status={(risk?.riskLevel ?? 'Ready') as any} />
                  </article>
                );
              })}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Personnel table">
        <DataTable
          columns={['Name', 'Rank', 'Station', 'Shift', 'Employment', 'Readiness', 'Risk', 'Actions']}
          rows={filteredPersonnel}
          renderRow={(entry) => {
            const risk = riskMap[entry.id];
            const score = entry.readinessScore ?? entry.readiness ?? 0;
            return (
              <>
                <td>
                  <b>{entry.name ?? `${entry.firstName} ${entry.lastName}`}</b>
                  <br />
                  <small>{entry.employeeNumber ?? entry.email}</small>
                </td>
                <td>{entry.rank}</td>
                <td>{entry.station}</td>
                <td>{entry.platoon ?? 'n/a'}</td>
                <td>{entry.employmentStatus ?? 'Full Time'}</td>
                <td><ReadinessScore score={score} /></td>
                <td>{risk ? <StatusBadge status={risk.riskLevel as any} /> : <StatusBadge status={score >= 90 ? 'Healthy' : score >= 75 ? 'Warning' : 'Critical'} />}</td>
                <td>
                  <div className="inline-actions">
                    <button type="button" className="btn-link" onClick={() => open360(entry.id)}>360 view</button>
                  </div>
                </td>
              </>
            );
          }}
        />
      </SectionCard>
    </>
  );
}
