export type CoverageStatus = 'Strong' | 'Partial' | 'Thin' | 'Missing';

export interface ProductCoverageItem {
  scope: string;
  status: CoverageStatus;
  frontend: string;
  backend: string;
  database: string;
  seed: string;
  workflow: string;
  analytics: string;
  ai: string;
  audit: string;
  remainingGap: string;
}

export const productCoverageChecklist: ProductCoverageItem[] = [
  {
    scope: 'Records Management System — RMS / ePCR / NERIS',
    status: 'Strong',
    frontend: 'Command center, incident detail, QA queue, export preview, ePCR linkage, CAD import logs.',
    backend: 'Incident workflow, QA, timeline, narratives, NERIS mapping/export, ePCR linkage, data quality, duplicate detection.',
    database: 'Incident, unit, personnel, timeline, narrative, QA, attachment, export, CAD log, duplicate tables.',
    seed: '100+ incidents with units, personnel, QA reviews, ePCR links, and NERIS export logs.',
    workflow: 'Create, submit, QA approve/return, export preview, export, link ePCR, and close.',
    analytics: 'Incident volume, QA trends, NERIS readiness, and agency response patterns.',
    ai: 'AI insights cite CAD/RMS/NERIS gaps and missing field risks.',
    audit: 'Audit logs plus ePCR-sensitive access awareness in the trust center.',
    remainingGap: 'Incident, apparatus, station, and personnel records now open via cross-module deep links; a few deep subpages are still shell-driven rather than URL-addressable.',
  },
  {
    scope: 'Learning Management System — LMS',
    status: 'Strong',
    frontend: 'Command center, need assessment, course catalog, trainer matching, session scheduling, attendance, personnel training profile.',
    backend: 'Need generation, course/session/assignment APIs, trainer and trainee recommendation engines, certification compliance.',
    database: 'Course, session, assignment, attendance, outcome, renewal, recommendation, and instructor tables.',
    seed: '12+ courses, 20+ sessions, 100+ assignments, attendance, recommendations, and renewals.',
    workflow: 'Generate need, choose course, pick trainer, pick trainees, schedule session, track attendance, update readiness.',
    analytics: 'Training compliance, expiring certs, station training risk, and readiness improvement trends.',
    ai: 'AI advisor references LMS gaps and readiness impacts.',
    audit: 'Training assignment and attendance actions are auditable.',
    remainingGap: 'Full editor-style create flows are still lightweight command-center forms.',
  },
  {
    scope: 'Staffing and Scheduling',
    status: 'Strong',
    frontend: 'Coverage board, staffing dashboard, shift fill, trade requests, overtime, and audit tabs.',
    backend: 'Command center, board, gaps, recommendation, shift-fill, trade, overtime, audit, and action endpoints expose live staffing signals.',
    database: 'Shift assignments, open shifts, staffing rules, leave, overtime, and availability records.',
    seed: 'Station coverage and overtime records are seeded across the sample agency.',
    workflow: 'Identify coverage gaps, deep-link a station into shift-fill, approve fills/trades/callbacks with a confirmed "Applied" state, and record command decisions that refresh the audit trail live.',
    analytics: 'Coverage, overtime, and staffing risk trend into analytics and station readiness.',
    ai: 'AI staffing risk views cite the same station and personnel readiness data.',
    audit: 'Coverage exceptions and staffing decisions are traceable through station/personnel data, audit logs, and action records; each approval re-reads the audit trail.',
    remainingGap: 'Shift assignment persistence is still lighter than a full workforce system (decisions are recorded as audited command actions rather than mutating roster rows), but the evaluator workflow is fully actionable. Forecasting now extends into the Workforce Performance & Planning module with staff requisitions.',
  },
  {
    scope: 'Workforce Performance & Planning',
    status: 'Strong',
    frontend: 'KPI management/builder, department/station/platoon/individual scorecards with trend, training-need assessment, improvement tracking, appraisal management, performance escalation, enhanced workforce forecasting, staff requisitions, and reporting tabs.',
    backend: 'KPI library/categories, scorecards, training-need generation, improvement tracking, appraisal cycles, escalation routing, multi-dimension forecast, requisition create + approval workflow, and reports endpoints under /workforce.',
    database: 'Built on the shared personnel, station, apparatus, certification, overtime, and availability records; KPI/appraisal/requisition state is computed and audited (no schema rewrite).',
    seed: 'KPI library (8 categories), scorecards, training needs, improvement records, appraisals, escalations, forecast, and requisitions derive from the seeded 80 personnel / 17 stations / apparatus.',
    workflow: 'Measure KPIs → auto-open training needs below threshold → track improvement → escalate (recommend + route, never auto-discipline) → forecast workforce demand → raise staff requisitions from gaps → appraise with auto-populated evidence.',
    analytics: 'KPI dashboard, appraisal completion, training needs, improvement tracking, and requisition forecast reports are export/schedule-ready.',
    ai: 'Reuses the same staffing forecast and readiness signals the AI advisor cites, keeping recommendations consistent.',
    audit: 'Requisition creation and every KPI/appraisal/escalation/requisition action write audit entries; escalations are recommendation-only and routed for command + HR approval.',
    remainingGap: 'None outstanding for the module scope: custom KPIs and requisitions persist (server-side in live mode, localStorage in demo), action state survives reload, 360 peer feedback is populated, and live/demo coverage bands are identical. By design, escalation only recommends and routes — it never issues disciplinary action automatically.',
  },
  {
    scope: 'Personnel & Performance Management',
    status: 'Strong',
    frontend: 'Personnel directory, 360 detail, performance, goals, documents, readiness, and risk panels.',
    backend: 'Shared personnel master record, certification, readiness, goals, performance review, documents, and risk services.',
    database: 'Personnel, rank, assignment history, certifications, reviews, goals, notes, documents, readiness snapshots.',
    seed: '80+ personnel with rank, station, shift, certifications, reviews, goals, notes, and readiness snapshots.',
    workflow: 'Update one master record and reuse it across staffing, training, RMS, analytics, and AI.',
    analytics: 'Readiness distribution, certification risk, performance correlation, and staffing reliability.',
    ai: 'AI readiness advisor flags personnel risk and recommends training or staffing action.',
    audit: 'Personnel changes, goals, reviews, and documents are logged.',
    remainingGap: 'Personnel records open via cross-module deep links (directory, staffing, AI, search); a few embedded panels still render in-shell rather than as standalone addressable pages.',
  },
  {
    scope: 'Asset and Inventory Management',
    status: 'Strong',
    frontend: 'Asset command center, apparatus registry, 360 detail, maintenance, inventory transactions, reorder center, and risk views.',
    backend: 'Apparatus readiness, maintenance, preventive maintenance, vendor/reorder, inventory transactions, and station summaries.',
    database: 'Apparatus, asset, inventory, maintenance, preventive schedule, vendor, reorder, and readiness snapshot tables.',
    seed: '35 apparatus, 150+ assets, 120 inventory items, 50 maintenance events, and vendor/reorder data.',
    workflow: 'Report maintenance, schedule work, complete maintenance, reorder supplies, and update readiness.',
    analytics: 'Maintenance backlog, inventory shortage, apparatus readiness, and station logistics risk.',
    ai: 'AI reads apparatus and inventory risk evidence.',
    audit: 'Maintenance and reorder actions write audit entries and notifications.',
    remainingGap: 'Some create/edit actions are command-center level rather than full modal workflows.',
  },
  {
    scope: 'Prevention / Inspections / Permitting / Preplans',
    status: 'Strong',
    frontend: 'Prevention command center, property registry, property 360, inspection queue, mobile form, violations, permits, preplans, hydrants, hazards.',
    backend: 'Property, occupancy, inspection, violation, corrective action, permit, preplan, hydrant, hazard, and prevention risk services.',
    database: 'Shared property/occupancy master records with inspection, violation, permit, preplan, hydrant, hazard, and contact tables.',
    seed: '60 properties, 75 occupancies, 120 inspections, 80 violations, 70 permits, 60 preplans, and hydrant/hazard data.',
    workflow: 'Prioritize, inspect, cite, correct, permit, review preplans, and track risk.',
    analytics: 'Inspection backlog, violation trends, permit cycle time, hydrant issues, and preplan completeness.',
    ai: 'AI prevention risks and recommended actions are visible.',
    audit: 'Critical violations, permits, and inspection actions are logged.',
    remainingGap: 'Some mobile workflow behaviors remain modeled rather than fully offline-capable.',
  },
  {
    scope: 'Data Warehouse / Analytics / Reporting',
    status: 'Strong',
    frontend: 'Executive dashboards, station comparison, custom report builder, saved reports, export center, data quality, duplicate detection, module analytics.',
    backend: 'Command center, snapshot, report definition, export, schedule, data quality, duplicate detection, and module analytics services.',
    database: 'Saved reports, widgets, snapshots, export queue, quality checks, issues, duplicates, report schedules, KPI definitions.',
    seed: 'Report definitions, saved reports, exports, widgets, snapshots, data quality issues, duplicates, schedules, and KPIs.',
    workflow: 'Build, preview, save, export, and schedule reports with a full scheduled-reports table (type, owner, recipients, frequency, delivery method, last generated, next run, status, export history) plus a Generate-now action that produces an export and refreshes history in place.',
    analytics: 'Cross-module trends across readiness, risk, staffing, training, assets, prevention, integrations, and support.',
    ai: 'Analytics evidence feeds AI recommendations and risk scoring.',
    audit: 'Exports, saved report changes, schedule runs, and quality resolutions are traceable.',
    remainingGap: 'Background export delivery is simulated (Generate-now writes a completed export synchronously) rather than a true async job queue/email service, but the scheduling, history, and generate-now experience is evaluator-ready.',
  },
];

export const productCoverageSummary = {
  strong: productCoverageChecklist.filter((item) => item.status === 'Strong').length,
  partial: productCoverageChecklist.filter((item) => item.status === 'Partial').length,
  thin: productCoverageChecklist.filter((item) => item.status === 'Thin').length,
  missing: productCoverageChecklist.filter((item) => item.status === 'Missing').length,
};
