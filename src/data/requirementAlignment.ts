// MissionOS product positioning + RFP requirement alignment.
//
// MissionOS is a configurable, multi-tenant SaaS platform for Fire/EMS, public
// safety, and emergency-service operations. This file is the single source of
// truth for the product-positioning copy and the "Requirement Alignment" page.
// Claims here are deliberately conservative — we describe capability and
// alignment, not production certification or legal/NERIS certification.

export interface ModuleLayer {
  layer: string;
  blurb: string;
  modules: string[];
}

export const PRODUCT = {
  name: 'MissionOS',
  tagline: 'Configurable SaaS platform for Fire/EMS, public safety, and emergency-service operations',
  positioning:
    'MissionOS is a multi-tenant SaaS platform configured per agency — not a one-off build. Each department, agency, or jurisdiction gets configurable modules, KPIs, workflows, reports, and role-based access on a shared common data platform. The Station 4 / Medic 4 scenario ships as a sample tenant to demonstrate the product.',
};

export const ARCHITECTURE_PILLARS: Array<{ title: string; detail: string }> = [
  { title: 'Multi-agency / multi-tenant', detail: 'Tenant-scoped data and configuration so multiple agencies, departments, stations, and jurisdictions run on one platform.' },
  { title: 'Configurable modules', detail: 'Modules can be enabled, disabled, or added per tenant as core, advanced, or optional add-ons.' },
  { title: 'Configurable KPIs', detail: 'KPI library + builder: formula, source, thresholds, weighting, and assignment level per tenant.' },
  { title: 'Configurable workflows', detail: 'Approval and action workflows (shift fill, requisitions, appraisals, escalations) are state-driven and configurable.' },
  { title: 'Configurable reports', detail: 'Report definitions, columns, filters, and schedules are tenant-configurable and export-ready.' },
  { title: 'Role-based access', detail: 'RBAC with roles, permissions, and access reviews scoped to each tenant.' },
  { title: 'API integration layer', detail: 'Adapter-based integration hub for CAD/RMS/ePCR/LMS and other public-safety systems.' },
  { title: 'Future data warehouse', detail: 'Analytics + snapshot model designed to feed a downstream warehouse and BI tooling.' },
  { title: 'Optional add-on modules', detail: 'Advanced intelligence and future-expansion modules activate per tenant without a rebuild.' },
];

export const MODULE_LAYERS: ModuleLayer[] = [
  {
    layer: 'Core Compliance Modules',
    blurb: 'The operational system of record each agency runs day to day.',
    modules: [
      'Records & Interoperability',
      'LMS / Training',
      'Staffing & Scheduling',
      'Personnel & Performance',
      'Asset & Inventory',
      'Prevention / Inspections / Permitting / Preplans',
      'Analytics / Reporting',
    ],
  },
  {
    layer: 'Advanced Intelligence Modules',
    blurb: 'Decision-support layered on the shared record — measure, recommend, act.',
    modules: [
      'Mission Control',
      'Readiness scoring',
      'KPI management',
      'Training need assessment',
      'Appraisal management',
      'Forecasting',
      'Staff requisitions',
      'Asset lifecycle intelligence',
      'Action engine',
    ],
  },
  {
    layer: 'Future Expansion Modules',
    blurb: 'Roadmap capabilities that activate per tenant as add-ons.',
    modules: [
      'Digital twin scenario planning',
      'AI command briefing',
      'Citizen portal',
      'Business/occupancy portal',
      'Vendor portal',
      'Mutual aid interoperability',
      'Board-ready reporting',
      'Open API / data warehouse',
    ],
  },
];

export type AlignmentLevel = 'Implemented' | 'Aligned' | 'Configurable' | 'Roadmap';

export interface AlignmentRow {
  requirement: string;
  level: AlignmentLevel;
  capability: string;
  honestScope: string;
}

// Conservative, honest alignment — no overclaiming of certification, legal
// compliance, NERIS certification, or full ePCR parity.
export const ALIGNMENT_ROWS: AlignmentRow[] = [
  {
    requirement: 'RMS / ePCR / NERIS compatible workflows',
    level: 'Aligned',
    capability: 'Incident records, QA workflow, NERIS field mapping + export preview, and privacy-aware ePCR linkage modeled on NERIS-style structures.',
    honestScope: 'NERIS-compatible workflow and mapping are implemented; this is not a NERIS-certified submission, and ePCR is linkage/QA, not a full ePCR system of record.',
  },
  {
    requirement: 'LMS / Training',
    level: 'Implemented',
    capability: 'Need assessment, course catalog, sessions, trainer/trainee recommendations, attendance, and certification compliance.',
    honestScope: 'Functional in-app LMS workflow; not an accredited external LMS or SCORM content host.',
  },
  {
    requirement: 'Staffing & Scheduling',
    level: 'Implemented',
    capability: 'Coverage board, shift fill, roster/planner, forecaster, trades, overtime callback, minimum-staffing rules, and audited command decisions.',
    honestScope: 'Decisions are audited command actions; payroll/timekeeping integration is via the API layer, not bundled.',
  },
  {
    requirement: 'Personnel & Performance Management',
    level: 'Implemented',
    capability: 'Shared personnel master record plus KPI scorecards, appraisals, training-need assessment, improvement tracking, and recommend-only escalation.',
    honestScope: 'Appraisal/HR routing is recommendation + status tracking; it is not a system of record for legal HR/disciplinary action.',
  },
  {
    requirement: 'Asset & Inventory Management',
    level: 'Implemented',
    capability: 'Apparatus readiness, maintenance, preventive schedules, inventory transactions, vendor/reorder, and asset lifecycle intelligence.',
    honestScope: 'Procurement/finance posting is integration-ready via the API layer, not a bundled ERP.',
  },
  {
    requirement: 'Prevention / Inspections / Permitting / Preplans',
    level: 'Implemented',
    capability: 'Property/occupancy records, inspection queue + mobile form, violations, permits, preplans, hydrants, and hazards.',
    honestScope: 'Mobile/offline behavior is modeled in-app; field-hardened offline sync is a configuration/roadmap item.',
  },
  {
    requirement: 'Data Warehouse / Analytics / Reporting',
    level: 'Aligned',
    capability: 'Executive dashboards, report builder, saved/scheduled reports, exports, data quality, and duplicate detection across modules.',
    honestScope: 'Analytics + snapshot model is warehouse-ready; an external warehouse/BI deployment is a configuration/roadmap item.',
  },
  {
    requirement: 'Duplication reduction',
    level: 'Implemented',
    capability: 'One shared personnel/station/apparatus/property master record reused across every module; duplicate-record detection in RMS.',
    honestScope: 'Cross-module reuse is real; enterprise MDM/golden-record governance is a configurable extension.',
  },
  {
    requirement: 'API / common data platform',
    level: 'Implemented',
    capability: 'Adapter-based integration hub, field mapping studio, sync logs, error/retry, API documentation, and credential/webhook management.',
    honestScope: 'Adapters are demonstrated against modeled feeds; production endpoints are onboarded per integration.',
  },
  {
    requirement: 'Usability',
    level: 'Implemented',
    capability: 'Command-center UI, cross-module deep links, guided demo flow, role-aware navigation, and consistent action patterns.',
    honestScope: 'WCAG/accessibility hardening and full localization are configuration/roadmap items.',
  },
  {
    requirement: 'Security',
    level: 'Aligned',
    capability: 'RBAC, audit logging, access reviews, SSO/MFA posture, sensitive-data access logging, and a trust/compliance-mapping center.',
    honestScope: 'Security posture and controls are modeled in-product; SOC 2 / formal certification and pen-test attestation are not claimed.',
  },
  {
    requirement: 'Scalability',
    level: 'Aligned',
    capability: 'Multi-tenant, tenant-scoped data, configurable modules, and a stateless API design intended to scale horizontally.',
    honestScope: 'Architecture is multi-tenant-ready; production load/SLA hardening and HA infrastructure are deployment-time work.',
  },
];

export const alignmentSummary = {
  implemented: ALIGNMENT_ROWS.filter((r) => r.level === 'Implemented').length,
  aligned: ALIGNMENT_ROWS.filter((r) => r.level === 'Aligned').length,
  configurable: ALIGNMENT_ROWS.filter((r) => r.level === 'Configurable').length,
  roadmap: ALIGNMENT_ROWS.filter((r) => r.level === 'Roadmap').length,
  total: ALIGNMENT_ROWS.length,
};
