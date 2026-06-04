import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowUpRight, BrainCircuit, CalendarDays, CheckCircle2, ClipboardCheck, GraduationCap, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { StatCard } from '../components/StatCard';
import { DataTable } from '../components/DataTable';
import { ReadinessScore } from '../components/ReadinessScore';
import { StatusBadge } from '../components/StatusBadge';
import { OperationalBriefing } from '../components/OperationalBriefing';
import {
  dismissTrainingNeed,
  generateTrainingNeeds,
  getCertificationCompliance,
  getCourseRecommendations,
  getPersonnelTrainingProfile,
  getTrainingAssignments,
  getTrainingCourses,
  getTrainingNeeds,
  getTrainingAttendance,
  getTrainingReadinessImpact,
  getTrainingSessions,
  getTrainingStats,
  getTrainerRecommendations,
  getTraineeRecommendations,
  resolveTrainingNeed,
} from '../services/platformClient';
import type {
  Course,
  CourseSession,
  Personnel,
  TrainingAssignment,
  TrainingNeedAssessment,
} from '../types';

type TrainingDashboardData = {
  stats: any;
  needs: TrainingNeedAssessment[];
  courses: Course[];
  sessions: CourseSession[];
  assignments: TrainingAssignment[];
  compliance: any;
  readiness: any;
  trainerRecommendations: any[];
  traineeRecommendations: any[];
  courseRecommendations: any[];
};

const emptyDashboard: TrainingDashboardData = {
  stats: { openNeedCount: 0, projectedReadinessLift: 0, agencyReadiness: 0, trainingCoverageRate: 0 },
  needs: [],
  courses: [],
  sessions: [],
  assignments: [],
  compliance: { byCertification: [], byStation: [] },
  readiness: { riskStations: [] },
  trainerRecommendations: [],
  traineeRecommendations: [],
  courseRecommendations: [],
};

export function Learning() {
  const [data, setData] = useState<TrainingDashboardData>(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNeedId, setSelectedNeedId] = useState<string | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const loadDashboard = async () => {
    const [stats, needs, courses, sessions, assignments, compliance, readiness, courseRecommendations] = await Promise.all([
      getTrainingStats(),
      getTrainingNeeds(),
      getTrainingCourses(),
      getTrainingSessions(),
      getTrainingAssignments(),
      getCertificationCompliance(),
      getTrainingReadinessImpact(),
      getCourseRecommendations(),
    ]);

    const selectedNeed = needs.items[0] ?? null;
    const selectedNeedIdNext = selectedNeedId ?? selectedNeed?.id ?? null;
    const trainerRecommendations = await getTrainerRecommendations(selectedNeedIdNext ?? undefined, selectedNeed?.requiredCourseId ?? undefined);
    const traineeRecommendations = await getTraineeRecommendations(selectedNeedIdNext ?? undefined, selectedNeed?.requiredCourseId ?? undefined);

    setData({
      stats,
      needs: needs.items,
      courses: courses.items,
      sessions: sessions.items,
      assignments: assignments.items,
      compliance,
      readiness,
      trainerRecommendations,
      traineeRecommendations,
      courseRecommendations,
    });

    const defaultPersonnelId = selectedPersonnelId ?? traineeRecommendations.flatMap((group) => group.recommendedTrainees ?? []).find((item) => item.personnelId)?.personnelId ?? null;
    setSelectedNeedId(selectedNeedIdNext);
    setSelectedPersonnelId(defaultPersonnelId);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboard().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPersonnelId) return;
    getPersonnelTrainingProfile(selectedPersonnelId).then(setProfile).catch(() => setProfile(null));
  }, [selectedPersonnelId]);

  const selectedNeed = useMemo(() => data.needs.find((need) => need.id === selectedNeedId) ?? data.needs[0] ?? null, [data.needs, selectedNeedId]);
  const needTrainerGroup = useMemo(() => data.trainerRecommendations.find((group) => group.need?.id === selectedNeed?.id) ?? data.trainerRecommendations[0] ?? null, [data.trainerRecommendations, selectedNeed]);
  const needTraineeGroup = useMemo(() => data.traineeRecommendations.find((group) => group.need?.id === selectedNeed?.id) ?? data.traineeRecommendations[0] ?? null, [data.traineeRecommendations, selectedNeed]);
  const selectedSession = useMemo(() => data.sessions[0] ?? null, [data.sessions]);

  useEffect(() => {
    if (!selectedSession?.id) return;
    getTrainingAttendance(selectedSession.id).then(setAttendance).catch(() => setAttendance([]));
  }, [selectedSession?.id]);

  const handleGenerateNeeds = async () => {
    setRefreshing(true);
    await generateTrainingNeeds();
    await loadDashboard();
  };

  const handleDismissNeed = async (needId: string) => {
    await dismissTrainingNeed(needId);
    await loadDashboard();
  };

  const handleResolveNeed = async (needId: string) => {
    await resolveTrainingNeed(needId);
    await loadDashboard();
  };

  const complianceRate = data.compliance?.byCertification?.length
    ? Math.round(data.compliance.byCertification.reduce((total: number, item: any) => total + Number(item.complianceRate ?? 0), 0) / data.compliance.byCertification.length)
    : 0;

  if (loading) {
    return (
      <div className="page-loading">
        <PageHeader eyebrow="Learning, Skills & Readiness" title="Loading training command center" description="Building agency training intelligence and readiness signals." />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Learning, Skills & Readiness"
        title="Training Need Assessment, Trainer Matching, and Readiness Control"
        description="An operational training command center that identifies what training is needed, who should attend, who should teach, and how readiness changes for stations and personnel."
      />
      <OperationalBriefing
        eyebrow="What matters now"
        summary="The training command center prioritizes expiring certifications, targeted training needs, trainer selection, trainee selection, and readiness lift so leadership can see the operational effect of training."
        bullets={[
          `${data.stats?.openNeedCount ?? data.needs.length} open training need(s) and ${data.sessions.length} scheduled session(s) are in flight.`,
          `Projected readiness lift is +${data.readiness?.projectedReadinessLift ?? data.stats?.projectedReadinessLift ?? 0} and compliance is ${complianceRate}%.`,
          'Each recommendation explains why it matters, who should attend, and what station readiness improves.',
        ]}
        badge={complianceRate >= 90 ? 'Healthy' : complianceRate >= 75 ? 'Warning' : 'Critical'}
        actions={<button type="button" className="btn-primary" onClick={handleGenerateNeeds}>Recalculate needs</button>}
        evidence={['Need assessment', 'Trainer match', 'Trainee selection', 'Coverage impact', 'Attendance']}
      />

      <div className="stats-grid">
        <StatCard label="Training Compliance" value={`${complianceRate}%`} hint="Certification and course readiness" icon={<ShieldCheck />} />
        <StatCard label="Open Training Needs" value={data.stats?.openNeedCount ?? data.needs.length} hint="Operational needs under review" icon={<AlertTriangle />} />
        <StatCard label="Expiring Certs" value={data.compliance?.byCertification?.reduce((total: number, item: any) => total + Number(item.expiring ?? 0), 0) ?? 0} hint="Renewal window active" icon={<ClipboardCheck />} />
        <StatCard label="Projected Lift" value={`+${data.readiness?.projectedReadinessLift ?? data.stats?.projectedReadinessLift ?? 0}`} hint="Estimated readiness gain" icon={<Sparkles />} />
        <StatCard label="Upcoming Sessions" value={data.sessions.length} hint="Scheduled, completed, and cancelled" icon={<CalendarDays />} />
        <StatCard label="Completion Rate" value={`${data.stats?.trainingCoverageRate ?? 0}%`} hint="Completed training assignments" icon={<CheckCircle2 />} />
      </div>

      <SectionCard
        title="Command Center Actions"
        action={
          <button className="btn-primary" onClick={handleGenerateNeeds} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Recalculate Needs'}
          </button>
        }
      >
        <div className="command-links">
          {[
            ['needs', 'Need Assessment'],
            ['catalog', 'Course Catalog'],
            ['sessions', 'Session Scheduler'],
            ['trainers', 'Trainer Matching'],
            ['trainees', 'Trainee Recommendations'],
            ['compliance', 'Certification Compliance'],
            ['attendance', 'Training Attendance'],
            ['profile', 'Personnel Profile'],
          ].map(([id, label]) => (
            <a key={id} href={`#${id}`} className="mini-chip">
              {label}
            </a>
          ))}
        </div>
      </SectionCard>

      <div className="two-col">
        <SectionCard title="Readiness Forecast">
          <div className="stack">
            <ReadinessScore score={data.readiness?.agencyReadiness ?? 0} />
            <div className="mini-grid">
              {(data.readiness?.riskStations ?? []).slice(0, 4).map((item: any) => (
                <article key={item.station?.id ?? item.station?.name} className="mini-card">
                  <b>{item.station?.name}</b>
                  <span>{item.station?.battalion ?? 'Station risk'}</span>
                  <StatusBadge status={item.station?.staffingStatus ?? 'Warning'} />
                </article>
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="High Priority Needs">
          <div className="stack">
            {(data.needs ?? []).slice(0, 4).map((need) => (
              <article key={need.id} className={`mini-card ${need.id === selectedNeedId ? 'active' : ''}`} onClick={() => setSelectedNeedId(need.id)}>
                <div className="row-between">
                  <b>{need.title}</b>
                  <StatusBadge status={need.severity} />
                </div>
                <span>{need.evidenceSummary}</span>
                <small>{need.recommendedAction}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard id="needs" title="Training Need Assessment">
        <DataTable
          columns={['Need', 'Signal', 'Severity', 'Station / Group', 'Course', 'Readiness Impact', 'Status']}
          rows={data.needs}
          renderRow={(need) => (
            <>
              <td>
                <b>{need.title}</b>
                <div className="muted">{need.description}</div>
              </td>
              <td>{need.sourceType}</td>
              <td><StatusBadge status={need.severity} /></td>
              <td>{need.stationId ?? 'District'}</td>
              <td>{need.requiredCourseId ?? 'Suggested course'}</td>
              <td>{need.readinessImpact ?? 0}</td>
              <td>
                <div className="table-actions">
                  <StatusBadge status={need.status} />
                  <button className="btn-link" onClick={() => setSelectedNeedId(need.id)}>View</button>
                  <button className="btn-link" onClick={() => handleResolveNeed(need.id)}>Resolve</button>
                  <button className="btn-link" onClick={() => handleDismissNeed(need.id)}>Dismiss</button>
                </div>
              </td>
            </>
          )}
        />
      </SectionCard>

      <div className="two-col">
        <SectionCard id="catalog" title="Course Catalog">
          <DataTable
            columns={['Course', 'Category', 'Delivery', 'Duration', 'Certs', 'Criticality']}
            rows={data.courses}
            renderRow={(course) => (
              <>
                <td>
                  <b>{course.title}</b>
                  <div className="muted">{course.code}</div>
                </td>
                <td>{course.category}</td>
                <td>{course.deliveryType}</td>
                <td>{course.durationHours} hrs</td>
                <td>{(course.requiredCertifications ?? []).join(', ') || '—'}</td>
                <td><StatusBadge status={course.complianceCriticality ?? 'Moderate'} /></td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard id="sessions" title="Course Session Scheduler">
          <DataTable
            columns={['Session', 'Course', 'Trainer', 'Start', 'Location', 'Status']}
            rows={data.sessions}
            renderRow={(session) => (
              <>
                <td>{session.id}</td>
                <td>{data.courses.find((course) => course.id === session.courseId)?.title ?? session.courseId}</td>
                <td>{session.trainerPersonnelId}</td>
                <td>{new Date(session.startDateTime).toLocaleString()}</td>
                <td>{session.deliveryLocation ?? 'TBD'}</td>
                <td><StatusBadge status={session.status} /></td>
              </>
            )}
          />
          <div className="mini-note">
            Coverage-aware scheduling is enforced in the API so sessions can be shifted around minimum staffing windows.
          </div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard id="trainers" title="Trainer Matching">
          {needTrainerGroup ? (
            <div className="stack">
              <div className="mini-note">
                <b>{needTrainerGroup.need?.title}</b> — {needTrainerGroup.course?.title}
              </div>
              {(needTrainerGroup.recommendations ?? []).slice(0, 3).map((trainer: any, index: number) => (
                <article key={`${trainer.personnelId}-${index}`} className="mini-card">
                  <div className="row-between">
                    <b>{trainer.personnel?.name ?? trainer.personnelId}</b>
                    <StatusBadge status={index === 0 ? 'Healthy' : 'Warning'} />
                  </div>
                  <span>Suitability score {trainer.suitabilityScore}</span>
                  <small>{trainer.reasonSummary}</small>
                  <div className="chip-row">
                    <span className="mini-chip">Expertise {trainer.expertiseScore}</span>
                    <span className="mini-chip">Availability {trainer.availabilityScore}</span>
                    <span className="mini-chip">Workload {trainer.workloadScore}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">No trainer recommendations available.</div>
          )}
        </SectionCard>
        <SectionCard id="trainees" title="Trainee Recommendations">
          {needTraineeGroup ? (
            <DataTable
              columns={['Trainee', 'Score', 'Urgency', 'Readiness Impact', 'Coverage Impact']}
              rows={(needTraineeGroup.recommendedTrainees ?? []).slice(0, 8)}
              renderRow={(trainee: any) => (
                <>
                  <td>
                    <button className="btn-link" onClick={() => setSelectedPersonnelId(trainee.personnelId)}>
                      {trainee.personnel?.name ?? trainee.personnelId}
                    </button>
                    <div className="muted">{trainee.gapReason}</div>
                  </td>
                  <td>{trainee.suitabilityScore}</td>
                  <td>{trainee.urgencyScore}</td>
                  <td>{trainee.readinessImpactScore}</td>
                  <td>{trainee.stationCoverageImpact}</td>
                </>
              )}
            />
          ) : (
            <div className="empty-state">No trainee recommendations available.</div>
          )}
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard id="compliance" title="Certification Compliance">
          <DataTable
            columns={['Certification', 'Active', 'Expiring', 'Expired', 'Rate']}
            rows={data.compliance?.byCertification ?? []}
            renderRow={(item: any) => (
              <>
                <td>{item.certification?.name ?? item.certification?.code ?? 'Certification'}</td>
                <td>{item.active}</td>
                <td>{item.expiring}</td>
                <td>{item.expired}</td>
                <td>{item.complianceRate}%</td>
              </>
            )}
          />
        </SectionCard>
        <SectionCard id="attendance" title="Training Attendance">
          <DataTable
            columns={['Session', 'Personnel', 'Status', 'Score', 'Notes']}
            rows={attendance}
            renderRow={(record) => (
              <>
                <td>{record.sessionId}</td>
                <td>{record.personnelId}</td>
                <td>{record.attendanceStatus}</td>
                <td>{record.participationScore ?? '—'}</td>
                <td>{record.instructorNotes ?? '—'}</td>
              </>
            )}
          />
          <div className="mini-note">Attendance updates can be posted through the API and flow directly into completion and outcome tracking.</div>
        </SectionCard>
      </div>

      <div className="two-col">
        <SectionCard id="profile" title="Personnel Training Profile">
          {profile?.personnel ? (
            <div className="profile-panel">
              <div className="profile-head">
                <div>
                  <b>{profile.personnel.name}</b>
                  <p>{profile.personnel.rank} · {profile.personnel.station}</p>
                </div>
                <ReadinessScore score={Number(profile.personnel.readinessScore ?? profile.personnel.readiness ?? 0)} label="Readiness" />
              </div>
              <div className="mini-grid">
                <article className="mini-card"><b>Assignments</b><span>{profile.assignments?.length ?? 0}</span></article>
                <article className="mini-card"><b>Certifications</b><span>{profile.certifications?.length ?? 0}</span></article>
                <article className="mini-card"><b>Outcomes</b><span>{profile.outcomes?.length ?? 0}</span></article>
                <article className="mini-card"><b>Training impact</b><span>{profile.readinessImpact ?? 0}</span></article>
              </div>
              <div className="stack">
                {(profile.certifications ?? []).slice(0, 4).map((cert: any) => (
                  <article className="mini-card" key={cert.id}>
                    <div className="row-between">
                      <b>{cert.certificationId}</b>
                      <StatusBadge status={cert.status} />
                    </div>
                    <span>Expires {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : '—'}</span>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">Select a trainee to inspect readiness, training history, and certifications.</div>
          )}
        </SectionCard>
        <SectionCard title="Course Recommendations">
          <div className="stack">
            {(data.courseRecommendations ?? []).slice(0, 5).map((item: any) => (
              <article className="mini-card" key={item.need?.id}>
                <div className="row-between">
                  <b>{item.recommendedCourse?.title ?? item.newCourseSuggestion?.title}</b>
                  <StatusBadge status={item.need?.severity ?? 'Moderate'} />
                </div>
                <span>{item.whyThisCourse ?? item.need?.evidenceSummary}</span>
                <small>Readiness impact {item.estimatedReadinessImprovement ?? item.need?.readinessImpact ?? 0}</small>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Operational Readiness Notes" action={<ArrowUpRight size={16} />}>
        <div className="stack">
          <div className="mini-note">
            This module is tied to personnel, station, staffing, RMS/NERIS quality, asset readiness, and prevention risk — not a standalone school LMS.
          </div>
          <div className="mini-note">
            The API enforces RBAC for needs generation, trainer assignment, attendance, and certification renewals so agency and station leaders stay in control.
          </div>
          <div className="mini-note">
            Training outcomes feed readiness improvements, which can be surfaced in AI advisor and analytics views.
          </div>
        </div>
      </SectionCard>
    </>
  );
}
