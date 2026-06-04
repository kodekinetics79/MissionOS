import { useEffect, useState } from 'react';
import { getExpiringPersonnelCertifications, getPersonnel } from '../services/platformClient';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';

export function Personnel() {
  const [personnel, setPersonnel] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([getPersonnel(), getExpiringPersonnelCertifications()])
      .then(([people, expiringCerts]) => {
        setPersonnel(people.items);
        setExpiring(expiringCerts);
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Personnel intelligence"
        title="Personnel & Performance"
        description="Unified staff profile combining rank, station, certifications, training, attendance, incident participation, goals, and AI support flags."
      />
      <div className="person-grid">
        {personnel.map((person) => (
          <article className="person-card" key={person.id}>
            <div className="avatar">{(person.name ?? 'NA').split(' ').map((part: string) => part[0]).join('')}</div>
            <div className="person-main">
              <h3>{person.name ?? 'Unknown Personnel'}</h3>
              <p>{person.rank} · {person.station}</p>
              <ReadinessScore score={Number(person.readinessScore ?? person.readiness ?? 0)} />
              <div className="person-meta">
                <span>Incidents <b>{person.incidents ?? 0}</b></span>
                <span>Attendance <b>{person.attendance ?? 0}%</b></span>
                <span>Role <b>{person.role}</b></span>
              </div>
              <StatusBadge status={(person.expiringCerts ?? 0) > 0 ? 'Warning' : 'Healthy'} />
              {(person.expiringCerts ?? 0) > 0 && <p className="risk">AI Flag: Certification support needed before next high-risk assignment.</p>}
            </div>
          </article>
        ))}
      </div>

      <SectionCard title="Expiring Certifications">
        <div className="stack">
          {expiring.slice(0, 6).map((entry) => (
            <article className="mini-card" key={`${entry.personnelId}-${entry.certificationId}`}>
              <b>{entry.personnel?.name ?? entry.personnelId}</b>
              <span>{entry.certification?.name ?? entry.certificationId} · expires {entry.expiryDate ? new Date(entry.expiryDate).toLocaleDateString() : '—'}</span>
              <StatusBadge status={entry.status ?? 'Expiring Soon'} />
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Performance & Goals">
        <div className="three-col inner">
          <div>
            <b>Quality goal</b>
            <p>Reduce QA-needed incident reports by 15% this quarter.</p>
          </div>
          <div>
            <b>Training goal</b>
            <p>Restore EMS refresher completion to 95% agency-wide.</p>
          </div>
          <div>
            <b>Support goal</b>
            <p>Identify personnel needing schedule or credentialing support before readiness drops.</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
