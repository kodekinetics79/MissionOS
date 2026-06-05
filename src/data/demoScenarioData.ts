export type DemoScenario = {
  id: string;
  title: string;
  summary: string;
  priority: 'critical' | 'high' | 'medium';
  section: string;
  focusRoute: string;
  focusLabel: string;
  linkedRecords: Record<string, string[]>;
  walkthrough: string[];
  expectedOutcome: string;
};

export const demoScenarioData = {
  scenarios: [
    {
      id: 'scenario-staffing-risk',
      title: 'SCENARIO 1 — Staffing Risk',
      summary: 'Station 2 has two paramedic vacancies and overtime is trending above budget.',
      priority: 'critical',
      section: 'Workforce Readiness',
      focusRoute: 'staffing',
      focusLabel: 'Staffing & Coverage',
      linkedRecords: {
        stations: ['ST-02'],
        staff: ['SF-002', 'SF-012'],
        forecasts: ['FRC-001', 'FRC-002'],
        requisitions: ['REQ-001', 'REQ-002'],
        workflows: ['WF-001'],
      },
      walkthrough: [
        'Open Staffing & Coverage and review Station 2',
        'Open the overtime forecast cards and compare the two paramedic requisitions',
        'Approve the staffing requisitions to move them out of the queue',
      ],
      expectedOutcome: 'Two paramedic requisitions appear in workflow and dashboard staffing risk increases.',
    },
    {
      id: 'scenario-training-risk',
      title: 'SCENARIO 2 — Training Compliance Risk',
      summary: 'CPR certifications are expiring and ladder operations evaluations need follow-up.',
      priority: 'high',
      section: 'Workforce Readiness',
      focusRoute: 'learning',
      focusLabel: 'Learning & Skills',
      linkedRecords: {
        staff: ['SF-003', 'SF-009', 'SF-015'],
        training: ['TRN-001', 'TRN-010'],
        appraisals: ['APR-001', 'APR-002'],
        notifications: ['NOT-001', 'NOT-002'],
      },
      walkthrough: [
        'Open the training tab and inspect expiring CPR/BLS certifications',
        'Open the two evaluation records and assign refresher training from each record',
        'Confirm supervisor notifications were generated',
      ],
      expectedOutcome: 'Training assignments are recommended and supervisor notifications are created.',
    },
    {
      id: 'scenario-asset-risk',
      title: 'SCENARIO 3 — Asset Readiness Risk',
      summary: 'Engine 12 preventive maintenance and SCBA hydro testing are overdue.',
      priority: 'critical',
      section: 'Assets & Logistics',
      focusRoute: 'assets',
      focusLabel: 'Assets & Logistics',
      linkedRecords: {
        assets: ['AS-012', 'AS-021'],
        workOrders: ['WO-001', 'WO-002'],
        forecasts: ['FRC-003'],
        requisitions: ['REQ-003'],
      },
      walkthrough: [
        'Open Engine 12 and SCBA Hydro work orders',
        'Confirm readiness score dropped and replacement forecast is visible',
        'Create or approve the work order to move it to completion',
      ],
      expectedOutcome: 'Asset readiness drops and replacement forecast shows budget impact.',
    },
    {
      id: 'scenario-inventory-risk',
      title: 'SCENARIO 4 — Inventory Reorder Risk',
      summary: 'EMS supplies are below reorder threshold at Station 4 and purchase request is suggested.',
      priority: 'high',
      section: 'Assets & Logistics',
      focusRoute: 'maintenance',
      focusLabel: 'Inventory & Maintenance',
      linkedRecords: {
        inventory: ['INV-001', 'INV-014'],
        requisitions: ['REQ-004'],
        forecasts: ['FRC-004'],
        workflows: ['WF-004'],
      },
      walkthrough: [
        'Open inventory and inspect the low-stock EMS items',
        'Create a purchase request from the low-stock warning',
        'Approve the request so it moves out of the queue',
      ],
      expectedOutcome: 'Purchase request appears in workflow queue and burn-rate forecast shows days remaining.',
    },
    {
      id: 'scenario-high-risk-occupancy',
      title: 'SCENARIO 5 — High-Risk Occupancy',
      summary: 'Ridgeview Senior Living has open violations and nearby hydrant issues.',
      priority: 'critical',
      section: 'Community Risk & Prevention',
      focusRoute: '/preplans',
      focusLabel: 'Preplans & Occupancy Risk',
      linkedRecords: {
        occupancies: ['PP-012'],
        inspections: ['INS-012'],
        hydrants: ['HYD-017'],
        permits: ['PER-012'],
      },
      walkthrough: [
        'Open Ridgeview Senior Living and review the open violations',
        'Check the linked hydrant status and the overdue reinspection',
        'Schedule the reinspection and resolve the violation when complete',
      ],
      expectedOutcome: 'Community risk dashboard highlights the occupancy and reinspection queue.',
    },
    {
      id: 'scenario-incident-training',
      title: 'SCENARIO 6 — Incident-to-Training Loop',
      summary: 'A structure fire needs QA review and recommended refresher training.',
      priority: 'high',
      section: 'Response & Records',
      focusRoute: '/rms-neris',
      focusLabel: 'RMS / NERIS Readiness',
      linkedRecords: {
        incidents: ['INC-26-0001'],
        neris: ['NERIS-001'],
        training: ['TRN-002'],
      },
      walkthrough: [
        'Open the structure fire incident and inspect the QA flags',
        'Move to NERIS validation and review the missing fields',
        'Create the refresher training assignment from the incident detail',
      ],
      expectedOutcome: 'Training assignment can be created from incident detail and dashboard response KPI drops.',
    },
    {
      id: 'scenario-integration-health',
      title: 'SCENARIO 7 — Integration Health',
      summary: 'CAD is healthy, ePCR is recent, GIS is warning, and payroll has a failed sync.',
      priority: 'medium',
      section: 'Platform & Trust',
      focusRoute: '/integration-hub',
      focusLabel: 'Integration Hub',
      linkedRecords: {
        integrations: ['INT-CAD', 'INT-EPCR', 'INT-GIS', 'INT-PAY'],
        auditLogs: ['SEC-001', 'SEC-002'],
      },
      walkthrough: [
        'Open the connector grid and locate GIS and Payroll',
        'Run Sync Now on the failed connector and confirm health updates',
        'Review the audit log entry generated by the sync action',
      ],
      expectedOutcome: 'Sync Now updates connector status and audit log.',
    },
    {
      id: 'scenario-compliance-trust',
      title: 'SCENARIO 8 — Compliance / Trust',
      summary: 'MFA is enabled, backups completed, and export capability is available.',
      priority: 'medium',
      section: 'Platform & Trust',
      focusRoute: '/security-compliance',
      focusLabel: 'Security & Compliance',
      linkedRecords: {
        security: ['SEC-003', 'SEC-004'],
        reports: ['RPT-001', 'RPT-002'],
      },
      walkthrough: [
        'Open the trust center and review MFA, backups, and vulnerability posture',
        'Inspect the audit log entries and export controls',
        'Open the SLA / continuity page to confirm recovery posture',
      ],
      expectedOutcome: 'Trust center shows uptime, support, backup, and audit posture.',
    },
  ] satisfies DemoScenario[],
};
