import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, FileText, ShieldAlert, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import {
  getPersonnel,
  getPersonnel360,
  getPersonnelReadinessSummary,
} from '../services/platformClient';
import type { Personnel, PersonnelCertification, PersonnelDocument, PersonnelGoal, PersonnelNote, PersonnelPerformanceReview, PersonnelReadinessSnapshot, TrainingAssignment, TrainingAttendance } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DetailDrawer } from '../components/DetailDrawer';
import { AiInsightPanel } from '../components/AiInsightPanel';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';
import { Tabs } from '../components/Tabs';
import { OperationalBriefing } from '../components/OperationalBriefing';
import { assignTraining, createAuditLog, createNotification } from '../services/demoOperatingService';

type Personnel360Bundle = {
  personnel: Personnel;
  station?: unknown;
  rank?: unknown;
  supervisor?: Personnel | null;
  certifications: {
    active: PersonnelCertification[];
    expiring: PersonnelCertification[];
    expired: PersonnelCertification[];
    missingRequired: string[];
  };
  training: {
    assignments: TrainingAssignment[];
    attendance: TrainingAttendance[];
    completed: TrainingAssignment[];
    missed: TrainingAttendance[];
    recommendedNextTraining: TrainingAssignment | null;
  };
  staffing: {
    currentShift: string | null;
    recentAssignments: Array<Record<string, unknown>>;
    overtimeHours: number;
    leaveRecords: Array<Record<string, unknown>>;
    availability: Record<string, unknown> | null;
    staffingReliabilityScore: number;
  };
  incidents: {
    participation: Array<Record<string, unknown>>;
    recentIncidents: Array<Record<string, unknown>>;
    qaIssues: Array<Record<string, unknown>>;
  };
  performance: {
    reviews: PersonnelPerformanceReview[];
    goals: PersonnelGoal[];
    notes: PersonnelNote[];
    documents: PersonnelDocument[];
    latestReview: PersonnelPerformanceReview | null;
  };
  readiness: {
    snapshots: PersonnelReadinessSnapshot[];
    trainingScore: number;
    certificationScore: number;
    staffingReliabilityScore: number;
    incidentDocumentationScore: number;
    performanceScore: number;
    overtimeRiskScore: number;
    overallReadinessScore: number;
    riskLevel: string;
    evidenceSummary: string;
    riskFlags: string[];
  };
  aiInsights: Array<Record<string, unknown>>;
  notifications: Array<Record<string, unknown>>;
  assignmentHistory: Array<Record<string, unknown>>;
};

const tabs = [
  { id: 'summary', label: 'Profile Summary' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'training', label: 'Training' },
  { id: 'staffing', label: 'Staffing' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'performance', label: 'Performance' },
  { id: 'goals', label: 'Goals' },
  { id: 'documents', label: 'Documents' },
  { id: 'ai', label: 'AI Readiness' },
];

const storageKey = 'missionos.personnel.selectedId';

export function Personnel360() {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [bundle, setBundle] = useState<Personnel360Bundle | null>(null);
  const [tab, setTab] = useState('summary');
  const [summary, setSummary] = useState<{ ready: number; watch: number; atRisk: number; critical: number; readinessAverage: number; expiringCertifications: number } | null>(null);

  useEffect(() => {
    Promise.all([getPersonnel(), getPersonnelReadinessSummary()]).then(([personnelResponse, readinessSummary]) => {
      setPersonnel(personnelResponse.items);
      setSummary(readinessSummary as any);
      setSelectedPersonnelId((current) => (current && personnelResponse.items.some((entry) => entry.id === current) ? current : personnelResponse.items[0]?.id ?? null));
    });
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ personnelId?: string }>).detail;
      if (detail?.personnelId) {
        setSelectedPersonnelId(detail.personnelId);
        setTab('summary');
        localStorage.setItem(storageKey, detail.personnelId);
      }
    };
    window.addEventListener('missionos:open-personnel-360', handler as EventListener);
    return () => window.removeEventListener('missionos:open-personnel-360', handler as EventListener);
  }, []);

  useEffect(() => {
    if (!selectedPersonnelId) return;
    localStorage.setItem(storageKey, selectedPersonnelId);
    getPersonnel360(selectedPersonnelId).then((response) => setBundle(response as Personnel360Bundle));
  }, [selectedPersonnelId]);

  const selectedPersonnel = useMemo(() => personnel.find((entry) => entry.id === selectedPersonnelId) ?? null, [personnel, selectedPersonnelId]);

  if (!personnel.length || !selectedPersonnel || !bundle) {
    return <LoadingState label="Loading personnel 360..." />;
  }

  const activeCertifications = bundle.certifications.active.length;
  const expiringCertifications = bundle.certifications.expiring.length + bundle.certifications.expired.length;
  const readinessScore = bundle.readiness.overallReadinessScore;

  return (
    <>
      <PageHeader
        eyebrow="Personnel 360"
        title="Personnel 360 Detail"
        description="A single operational identity record for staffing, LMS, RMS, performance, and readiness management."
      />

      {selectedPersonnelId && <AiInsightPanel personnelId={selectedPersonnelId} title="AI Readiness Insights — Personnel" />}
      <OperationalBriefing
        eyebrow="What matters now"
        summary={`${selectedPersonnel.name ?? `${selectedPersonnel.firstName} ${selectedPersonnel.lastName}`} is the platform’s master staff record, reused across staffing, LMS, RMS, performance, and AI readiness.`}
        bullets={[
          `Current readiness score ${readinessScore}%, with ${bundle.certifications.expiring.length + bundle.certifications.expired.length} expiring or expired certification(s).`,
          `${bundle.training.assignments.length} training assignment(s) and ${bundle.training.completed.length} completed item(s) flow back into readiness scoring.`,
          `This person’s staffing, incident, and performance data are connected to the same identity record—no duplicate staff entry exists in the platform.`,
        ]}
        badge={bundle.readiness.riskLevel}
        actions={<button type="button" className="btn-primary" onClick={() => setTab('training')}>Review training</button>}
        evidence={[
          bundle.staffing.currentShift ?? 'Shift n/a',
          bundle.supervisor?.name ?? 'Supervisor n/a',
          `Goals ${bundle.performance.goals.length}`,
          `AI flags ${bundle.readiness.riskFlags.length}`,
        ]}
      />

      <div className="stats-grid">
        <SectionCard title="Readiness score">
          <div className="stack">
            <ReadinessScore score={readinessScore} />
            <div className="mini-note">{bundle.readiness.evidenceSummary}</div>
          </div>
        </SectionCard>
        <SectionCard title="Certification pressure">
          <div className="stack">
            <div className="mini-card"><span>Active / Expiring</span><b>{activeCertifications} / {expiringCertifications}</b></div>
            <div className="mini-card"><span>Missing required</span><b>{bundle.certifications.missingRequired.length}</b></div>
          </div>
        </SectionCard>
        <SectionCard title="Staffing exposure">
          <div className="stack">
            <div className="mini-card"><span>Overtime hours</span><b>{bundle.staffing.overtimeHours}</b></div>
            <div className="mini-card"><span>Reliability score</span><b>{bundle.staffing.staffingReliabilityScore}%</b></div>
          </div>
        </SectionCard>
        <SectionCard title="AI readiness">
          <div className="stack">
            <div className="mini-card"><span>Risk level</span><b>{bundle.readiness.riskLevel}</b></div>
            <div className="mini-card"><span>Flags</span><b>{bundle.readiness.riskFlags.length}</b></div>
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard title="Personnel selector">
          <div className="stack">
            {personnel.map((entry) => {
              const score = entry.readinessScore ?? entry.readiness ?? 0;
              return (
                <button key={entry.id} type="button" className={`mini-card selectable ${entry.id === selectedPersonnelId ? 'selected' : ''}`} onClick={() => setSelectedPersonnelId(entry.id)}>
                  <div>
                    <b>{entry.name ?? `${entry.firstName} ${entry.lastName}`}</b>
                    <span>{entry.rank} · {entry.station}</span>
                  </div>
                  <div className="row-between">
                    <StatusBadge status={score >= 90 ? 'Healthy' : score >= 75 ? 'Warning' : 'Critical'} />
                    <ReadinessScore score={score} />
                  </div>
                </button>
              );
            })}
          </div>
        </SectionCard>

        <DetailDrawer title={selectedPersonnel.name ?? `${selectedPersonnel.firstName} ${selectedPersonnel.lastName}`} subtitle={`${selectedPersonnel.rank} · ${selectedPersonnel.station}`}>
          <div className="profile-panel">
            <div className="profile-head">
              <div>
                <b>{selectedPersonnel.employeeNumber ?? 'No employee number'}</b>
                <p>{selectedPersonnel.roleTitle ?? selectedPersonnel.role} · {selectedPersonnel.platoon ?? 'Unassigned'} platoon</p>
              </div>
              <ReadinessScore score={readinessScore} />
            </div>
            <div className="chip-row">
              <span className="mini-chip">Supervisor {bundle.supervisor?.name ?? 'Not assigned'}</span>
              <span className="mini-chip">Years of service {selectedPersonnel.yearsOfService ?? 0}</span>
              <span className="mini-chip">Current shift {bundle.staffing.currentShift ?? 'n/a'}</span>
              <span className="mini-chip">Risk {bundle.readiness.riskLevel}</span>
            </div>
            <Tabs items={tabs} activeId={tab} onChange={setTab} />
            {tab === 'summary' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Email</span><b>{selectedPersonnel.email ?? 'n/a'}</b></div>
                  <div className="mini-card"><span>Phone</span><b>{selectedPersonnel.phone ?? 'n/a'}</b></div>
                  <div className="mini-card"><span>Employment</span><b>{selectedPersonnel.employmentStatus ?? 'Full Time'}</b></div>
                </div>
                <div className="mini-note">This record feeds staffing, LMS, RMS, analytics, and AI readiness so every module works from the same person identity.</div>
                <div className="inline-actions">
                  <button type="button" className="btn-primary" onClick={() => setTab('training')}>Review training</button>
                  <button type="button" onClick={() => setTab('performance')}>View performance</button>
                  <button type="button" onClick={() => setTab('ai')}>View AI flags</button>
                </div>
              </div>
            )}
            {tab === 'certifications' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Active</span><b>{bundle.certifications.active.length}</b></div>
                  <div className="mini-card"><span>Expiring / expired</span><b>{bundle.certifications.expiring.length + bundle.certifications.expired.length}</b></div>
                  <div className="mini-card"><span>Missing required</span><b>{bundle.certifications.missingRequired.length}</b></div>
                </div>
                <div className="stack">
                  {bundle.certifications.active.length ? bundle.certifications.active.map((cert) => (
                    <article className="mini-card" key={cert.id}>
                      <div>
                        <b>{cert.certification?.name ?? cert.certificationId}</b>
                        <span>{cert.status} · {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry date'}</span>
                      </div>
                      <StatusBadge status={cert.status === 'Valid' ? 'Healthy' : 'Warning'} />
                    </article>
                  )) : <EmptyState title="No active certifications" description="Certification records will appear here once linked to the shared compliance model." />}
                  {!!bundle.certifications.missingRequired.length && (
                    <div className="mini-note">Missing required certifications: {bundle.certifications.missingRequired.join(', ')}</div>
                  )}
                </div>
              </div>
            )}
            {tab === 'training' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Assignments</span><b>{bundle.training.assignments.length}</b></div>
                  <div className="mini-card"><span>Completed</span><b>{bundle.training.completed.length}</b></div>
                  <div className="mini-card"><span>Missed / remediation</span><b>{bundle.training.missed.length}</b></div>
                </div>
                {bundle.training.recommendedNextTraining && (
                  <div className="mini-note">Next recommended training: {bundle.training.recommendedNextTraining.course?.title ?? bundle.training.recommendedNextTraining.courseId}</div>
                )}
                <div className="stack">
                  {bundle.training.attendance.slice(0, 5).map((attendance) => (
                    <article className="mini-card" key={attendance.id}>
                      <div>
                        <b>{attendance.attendanceStatus}</b>
                        <span>{attendance.session?.course?.title ?? attendance.sessionId}</span>
                      </div>
                      <StatusBadge status={attendance.attendanceStatus === 'Completed' ? 'Healthy' : 'Warning'} />
                    </article>
                  ))}
                </div>
              </div>
            )}
            {tab === 'staffing' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Assignment history</span><b>{bundle.assignmentHistory.length}</b></div>
                  <div className="mini-card"><span>Recent assignments</span><b>{bundle.staffing.recentAssignments.length}</b></div>
                  <div className="mini-card"><span>Leave / availability</span><b>{bundle.staffing.leaveRecords.length}</b></div>
                  <div className="mini-card"><span>Overtime hours</span><b>{bundle.staffing.overtimeHours}</b></div>
                </div>
                <div className="mini-note">Staffing reliability is derived from the shared staffing model, overtime exposure, and assignment continuity.</div>
              </div>
            )}
            {tab === 'incidents' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Participation records</span><b>{bundle.incidents.participation.length}</b></div>
                  <div className="mini-card"><span>Recent incidents</span><b>{bundle.incidents.recentIncidents.length}</b></div>
                  <div className="mini-card"><span>QA issues</span><b>{bundle.incidents.qaIssues.length}</b></div>
                </div>
                <div className="mini-note">Participation and QA history flow back into RMS so documentation, response quality, and station trends can shape future training and readiness actions.</div>
                {!bundle.incidents.participation.length && <EmptyState title="No incident participation" description="Once incident participation records are linked, they will appear here with QA and documentation signals." />}
              </div>
            )}
            {tab === 'performance' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Latest review</span><b>{bundle.performance.latestReview?.overallRating ?? bundle.performance.latestReview?.rating ?? 'n/a'}</b></div>
                  <div className="mini-card"><span>Goals</span><b>{bundle.performance.goals.length}</b></div>
                  <div className="mini-card"><span>Documents</span><b>{bundle.performance.documents.length}</b></div>
                </div>
                {bundle.performance.latestReview && (
                  <div className="mini-note">{bundle.performance.latestReview.comments ?? bundle.performance.latestReview.notes ?? 'No supervisor notes entered yet.'}</div>
                )}
                <div className="stack">
                  {bundle.performance.reviews.slice(0, 4).map((review) => (
                    <article className="mini-card" key={review.id}>
                      <div>
                        <b>{review.reviewPeriod}</b>
                        <span>Overall {review.overallRating ?? review.rating ?? 'n/a'} · Docs {review.documentationRating ?? 'n/a'} · Safety {review.safetyRating ?? 'n/a'}</span>
                      </div>
                      <StatusBadge status={(review.status ?? 'Draft') as any} />
                    </article>
                  ))}
                </div>
              </div>
            )}
            {tab === 'goals' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Open goals</span><b>{bundle.performance.goals.filter((goal) => goal.status !== 'Completed').length}</b></div>
                  <div className="mini-card"><span>Completed</span><b>{bundle.performance.goals.filter((goal) => goal.status === 'Completed').length}</b></div>
                  <div className="mini-card"><span>Overdue</span><b>{bundle.performance.goals.filter((goal) => goal.targetDate && new Date(goal.targetDate).getTime() < Date.now() && goal.status !== 'Completed').length}</b></div>
                </div>
                <div className="stack">
                  {bundle.performance.goals.length ? bundle.performance.goals.map((goal) => (
                    <article className="mini-card" key={goal.id}>
                      <div>
                        <b>{goal.title}</b>
                        <span>{goal.category ?? 'General'} · {goal.progressPercent ?? 0}% complete</span>
                      </div>
                      <StatusBadge status={goal.status as any} />
                    </article>
                  )) : <EmptyState title="No goals yet" description="Goal tracking will appear here as supervisors and the AI advisor create development actions." />}
                </div>
              </div>
            )}
            {tab === 'documents' && (
              <div className="stack">
                <div className="inline-actions">
                  <button type="button" className="btn-primary" onClick={() => { createAuditLog('Upload personnel document', 'Personnel', selectedPersonnel.id); createNotification('Document captured', 'A personnel document was queued for review.', 'info'); }}><FileText size={15} /> Upload document</button>
                  <button type="button" onClick={() => { createAuditLog('Add personnel note', 'Personnel', selectedPersonnel.id); createNotification('Personnel note added', 'The note was recorded in the demo audit trail.', 'info'); }}>Add note</button>
                </div>
                <div className="stack">
                  {bundle.performance.documents.length ? bundle.performance.documents.map((document) => (
                    <article className="mini-card" key={document.id}>
                      <div>
                        <b>{document.title}</b>
                        <span>{document.documentType} · {document.fileName ?? 'No file attached'}</span>
                      </div>
                      <StatusBadge status={document.expiryDate ? (new Date(document.expiryDate).getTime() < Date.now() ? 'Critical' : 'Healthy') : 'Healthy'} />
                    </article>
                  )) : <EmptyState title="No uploaded documents" description="Personnel documents such as certifications, commendations, or leave forms will be surfaced here." />}
                </div>
              </div>
            )}
            {tab === 'ai' && (
              <div className="stack">
                <div className="three-col">
                  <div className="mini-card"><span>Snapshot risk level</span><b>{bundle.readiness.riskLevel}</b></div>
                  <div className="mini-card"><span>Risk flags</span><b>{bundle.readiness.riskFlags.length}</b></div>
                  <div className="mini-card"><span>Notifications</span><b>{bundle.notifications.length}</b></div>
                </div>
                <div className="mini-note">Why flagged: {bundle.readiness.riskFlags.length ? bundle.readiness.riskFlags.join('; ') : 'No active risk flags.'}</div>
                <div className="stack">
                  {bundle.aiInsights.slice(0, 4).map((insight, index) => (
                    <article className="mini-card" key={`insight-${index}`}>
                      <div>
                        <b>{String(insight.title ?? insight.category ?? 'AI Insight')}</b>
                        <span>{String(insight.summary ?? insight.recommendedAction ?? 'Operational recommendation available')}</span>
                      </div>
                      <StatusBadge status={String(insight.severity ?? 'Info') as any} />
                    </article>
                  ))}
                </div>
                <div className="inline-actions">
                  <button type="button" className="btn-primary" onClick={() => { assignTraining(selectedPersonnel.id, bundle.training.recommendedNextTraining?.id ?? bundle.training.assignments[0]?.id ?? 'training-001'); window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'learning' } })); }}><ShieldCheck size={15} /> Send to Training</button>
                  <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'staffing' } })); createNotification('Staffing review opened', `${selectedPersonnel.name ?? 'Personnel'} sent to staffing review.`, 'info'); }}><TrendingUp size={15} /> Send to Staffing</button>
                  <button type="button" onClick={() => { createAuditLog('Create follow-up', 'Personnel', selectedPersonnel.id); createNotification('Follow-up created', 'Supervisor follow-up has been added.', 'warning'); }}><ShieldAlert size={15} /> Create follow-up</button>
                </div>
              </div>
            )}
          </div>
        </DetailDrawer>
      </div>
    </>
  );
}
