import { getDemoState } from './demoStateService';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const count = <T,>(items: T[], predicate: (item: T) => boolean) => items.filter(predicate).length;
const statusCount = <T extends { status?: string }>(items: T[], status: string) => count(items, (item) => String(item.status ?? '').toLowerCase() === status.toLowerCase());

function topItems<T>(items: T[], amount = 5) {
  return items.slice(0, amount);
}

export function getDemoDashboardSummary() {
  const {
    assets: demoAssets,
    forecasts: demoForecasting,
    hydrants: demoHydrants,
    incidents: demoIncidents,
    inspections: demoInspections,
    integrations: demoIntegrations,
    kpis: demoKpis,
    neris: demoNeris,
    notifications: demoNotifications,
    permits: demoPermits,
    preplans: demoPreplans,
    reports: demoReports,
    security: demoSecurity,
    stations: demoStations,
    staff: demoStaff,
    training: demoTraining,
  } = getDemoState();
  const readyNeris = count(demoNeris, (record) => record.validationStatus === 'Ready for Export');
  const staffingGaps = demoStations.reduce((total, station) => total + Number(station.staffingGap ?? 0), 0);
  const trainingCompliance = Math.round((count(demoTraining, (record) => record.status === 'Completed') / demoTraining.length) * 100);
  const assetReadiness = Math.round(sum(demoAssets.map((asset) => Number(asset.readiness ?? 0))) / demoAssets.length);
  const inspectionBacklog = count(demoInspections, (inspection) => ['Overdue', 'Pending Review'].includes(String(inspection.status)));
  const permitQueue = count(demoPermits, (permit) => ['Pending Review', 'Submitted'].includes(String(permit.status)));
  const highRiskOccupancies = count(demoPreplans, (occupancy) => Number(occupancy.riskScore ?? 0) >= 72 || occupancy.openViolations > 0);
  const healthyIntegrations = count(demoIntegrations, (integration) => integration.status === 'Healthy');
  const securityHealthy = Math.round((count(demoSecurity, (event) => event.severity !== 'High') / demoSecurity.length) * 100);
  const overtimeRisk = Math.round(sum(demoForecasting.filter((item: any) => item.category === 'Overtime').map((item: any) => Number(item.confidence ?? 0))) / Math.max(1, demoForecasting.filter((item: any) => item.category === 'Overtime').length));

  return {
    nerisReadiness: Math.round((readyNeris / demoNeris.length) * 100),
    staffingGaps,
    trainingCompliance,
    assetReadiness,
    inspectionBacklog,
    permitQueue,
    highRiskOccupancies,
    integrationHealth: `${healthyIntegrations}/${demoIntegrations.length}`,
    securityPosture: `${securityHealthy}%`,
    overtimeRisk,
    topStations: topItems(demoStations, 6),
    topAlerts: topItems(demoNotifications.filter((item) => item.priority === 'High'), 5),
    kpis: topItems(demoKpis, 10),
  };
}

export function getRmsNerisReadiness() {
  const { incidents: demoIncidents, neris: demoNeris, training: demoTraining } = getDemoState();
  const ready = demoNeris.filter((record) => record.validationStatus === 'Ready for Export');
  const needsQa = demoNeris.filter((record) => record.validationStatus === 'Needs QA' || record.exportStatus === 'Pending Review');
  const failed = demoNeris.filter((record) => record.validationStatus === 'Failed Sync');
  const incidents = demoIncidents.filter((incident) => incident.nerisStatus !== 'Ready for Export');
  const kpiImpacts = [...new Set(demoIncidents.flatMap((incident) => incident.kpiImpact))];
  return {
    summary: {
      readinessPct: Math.round((ready.length / demoNeris.length) * 100),
      readyForExport: ready.length,
      needsQa: needsQa.length,
      failedSync: failed.length,
      incidentsUsingNERIS: incidents.length,
      trainingRecommendations: kpiImpacts.includes('Training Compliance') ? demoTraining.filter((record) => record.supervisorAlert) : [],
    },
    ready,
    needsQa,
    failed,
    incidents: topItems(demoIncidents, 12),
    validations: topItems(demoNeris, 12),
    qaOwners: topItems([...new Map(demoNeris.map((record) => [record.qaOwner, record])).values()], 6),
    recommendedTraining: topItems([...new Map(demoNeris.map((record) => [record.recommendedTraining, record])).values()], 6),
  };
}

export function getEpcrReadiness() {
  const { epcr: demoEpcr, integrations: demoIntegrations } = getDemoState();
  const synced = demoEpcr.filter((record) => record.syncStatus === 'Synced' || record.syncStatus === 'Live');
  const failed = demoEpcr.filter((record) => record.syncStatus === 'Failed Sync');
  const atRisk = demoEpcr.filter((record) => record.hipaaPosture === 'At Risk' || record.documentationComplete === false);
  return {
    summary: {
      syncReadyPct: Math.round((synced.length / demoEpcr.length) * 100),
      synced: synced.length,
      failed: failed.length,
      atRisk: atRisk.length,
      vendors: [...new Set(demoEpcr.map((record) => record.vendor))].length,
    },
    connectors: [
      { name: 'CAD → ePCR', status: 'Healthy', lastSyncAt: demoIntegrations.find((item) => item.id === 'INT-EPCR')?.lastSyncAt ?? null, notes: 'Documentation handoff in place.' },
      { name: 'ePCR Vendor Sync', status: failed.length > 0 ? 'Failed Sync' : 'Healthy', lastSyncAt: demoEpcr[0]?.lastSyncAt ?? null, notes: 'Patient-care export and QA pipeline.' },
      { name: 'HIPAA QA Monitor', status: atRisk.length > 0 ? 'Warning' : 'Healthy', lastSyncAt: demoEpcr[1]?.lastSyncAt ?? null, notes: 'Sensitive field check and audit trail.' },
    ],
    syncRecords: topItems(demoEpcr, 12),
    failedRecords: failed,
    qaQueue: atRisk,
    vendorCount: [...new Set(demoEpcr.map((record) => record.vendor))].length,
  };
}

export function getPreventionInspections() {
  const { inspections: demoInspections, preplans: demoPreplans } = getDemoState();
  const overdue = demoInspections.filter((inspection) => inspection.status === 'Overdue');
  const pending = demoInspections.filter((inspection) => inspection.status === 'Pending Review');
  const reinspection = demoInspections.filter((inspection) => inspection.reinspectionRequired);
  return {
    summary: {
      overdue: overdue.length,
      pending: pending.length,
      reinspection: reinspection.length,
      highRiskOccupancies: demoPreplans.filter((occupancy) => occupancy.highRiskFlag).length,
      inspectors: [...new Set(demoInspections.map((inspection) => inspection.inspectorId))].length,
    },
    inspections: topItems(demoInspections, 15),
    inspectorWorkload: Object.values(demoInspections.reduce<Record<string, { inspectorName: string; count: number; overdue: number }>>((acc, inspection) => {
      const current = acc[inspection.inspectorId] ?? { inspectorName: inspection.inspectorName, count: 0, overdue: 0 };
      current.count += 1;
      if (inspection.status === 'Overdue') current.overdue += 1;
      acc[inspection.inspectorId] = current;
      return acc;
    }, {})).slice(0, 6),
    violationTrend: topItems(demoInspections.map((inspection, index) => ({ month: `M${index + 1}`, violations: inspection.violationCount })), 6),
  };
}

export function getPermitsModule() {
  const { permits: demoPermits } = getDemoState();
  const pending = demoPermits.filter((permit) => permit.status === 'Pending Review');
  const approved = demoPermits.filter((permit) => permit.status === 'Approved');
  const dueFees = demoPermits.filter((permit) => permit.feeStatus === 'Due');
  return {
    summary: {
      pending: pending.length,
      approved: approved.length,
      dueFees: dueFees.length,
      inspectionDependencies: count(demoPermits, (permit) => permit.inspectionDependency === 'Required'),
    },
    permits: topItems(demoPermits, 15),
    pending,
    approved,
    dueFees,
  };
}

export function getPreplansModule() {
  const { preplans: demoPreplans, hydrants: demoHydrants } = getDemoState();
  const highRisk = demoPreplans.filter((occupancy) => occupancy.highRiskFlag);
  const dueUpdates = demoPreplans.filter((occupancy) => occupancy.preplanStatus !== 'Current');
  return {
    summary: {
      total: demoPreplans.length,
      highRisk: highRisk.length,
      dueUpdates: dueUpdates.length,
      linkedHydrants: demoHydrants.filter((hydrant) => hydrant.status === 'Healthy').length,
    },
    occupancies: topItems(demoPreplans, 15),
    highRisk,
    dueUpdates,
    hydrantLinks: topItems(demoHydrants, 10),
  };
}

export function getHydrantsModule() {
  const { hydrants: demoHydrants, preplans: demoPreplans } = getDemoState();
  const outOfService = demoHydrants.filter((hydrant) => hydrant.status === 'Out of Service');
  const needingWork = demoHydrants.filter((hydrant) => hydrant.maintenanceStatus !== 'Healthy');
  return {
    summary: {
      total: demoHydrants.length,
      outOfService: outOfService.length,
      gisReady: count(demoHydrants, (hydrant) => hydrant.gisReady),
      needingWork: needingWork.length,
    },
    hydrants: topItems(demoHydrants, 20),
    outOfService,
    needingWork,
    linkedOccupancies: topItems(demoPreplans.filter((occupancy) => occupancy.highRiskFlag), 10),
  };
}

export function getMobileFieldMode() {
  const { notifications: demoNotifications, inspections: demoInspections, workOrders: demoWorkOrders, training: demoTraining, incidents: demoIncidents } = getDemoState();
  const offline = demoNotifications.filter((notification) => notification.type === 'Incident' || notification.type === 'Inspection');
  return {
    summary: {
      offlineSaved: 14,
      syncPending: 6,
      inspectionsCompleted: statusCount(demoInspections, 'Completed'),
      vehicleChecksPending: statusCount(demoWorkOrders, 'Pending Review'),
      trainingAttendancePending: count(demoTraining, (record) => record.status === 'Due Soon'),
    },
    offlineQueue: topItems(offline, 10),
    incidentNotes: topItems(demoIncidents, 10),
    vehicleChecks: topItems(demoWorkOrders, 10),
    attendance: topItems(demoTraining, 10),
  };
}

export function getIntegrationHubModule() {
  const { integrations: demoIntegrations, security: demoSecurity } = getDemoState();
  const healthy = demoIntegrations.filter((integration) => integration.status === 'Healthy');
  const warning = demoIntegrations.filter((integration) => integration.status === 'Warning');
  return {
    summary: {
      healthy: healthy.length,
      warning: warning.length,
      total: demoIntegrations.length,
      avgHealth: Math.round(sum(demoIntegrations.map((integration) => Number(integration.healthScore ?? 0))) / demoIntegrations.length),
    },
    integrations: demoIntegrations,
    healthy,
    warning,
    recentLogs: topItems(demoSecurity, 8),
  };
}

export function getReportBuilderModule() {
  const { reports: demoReports } = getDemoState();
  const scheduled = demoReports.filter((report) => report.status === 'Scheduled');
  return {
    summary: {
      total: demoReports.length,
      scheduled: scheduled.length,
      exports: demoReports.filter((report) => report.delivery === 'Download').length,
      favorite: demoReports.filter((report) => report.isFavorite).length,
    },
    reports: demoReports,
    scheduled,
    exportable: demoReports.filter((report) => report.exportFormats.includes('XLSX')),
    filters: ['Station', 'Station Area', 'Date range', 'Incident Type', 'Risk Level'],
  };
}

export function getSecurityTrustCenter() {
  const { security: demoSecurity, incidents: demoIncidents } = getDemoState();
  return {
    summary: {
      mfa: 'Healthy',
      sso: 'Healthy',
      rbac: 'Healthy',
      backups: 'Healthy',
      rto: '4 hours',
      rpo: '1 hour',
      vulnerabilities: 3,
      auditEvents: demoSecurity.length,
    },
    controls: [
      { control: 'SSO / MFA', status: 'Healthy', detail: 'SAML + OIDC with enforced MFA for privileged users.' },
      { control: 'RBAC', status: 'Healthy', detail: 'Least-privilege roles and audit logs are enabled.' },
      { control: 'Encryption', status: 'Healthy', detail: 'TLS in transit and encryption at rest posture.' },
      { control: 'Backups', status: 'Healthy', detail: 'Nightly backups with restore verification.' },
      { control: 'Vulnerability management', status: 'Warning', detail: 'Three open findings, one high severity.' },
      { control: 'Accessibility / VPAT', status: 'Warning', detail: 'VPAT readiness is tracked as part of procurement support.' },
    ],
    audits: topItems(demoSecurity, 15),
  };
}

export function getContinuityCenter() {
  const { reports: demoReports, notifications: demoNotifications } = getDemoState();
  const exportsReady = demoReports.filter((report) => report.status === 'Ready').length;
  return {
    summary: {
      uptime: '99.95%',
      supportSla: 'On Track',
      dataExports: exportsReady,
      drTests: 4,
      retention: '7 years',
      exitPlan: 'Available',
    },
    continuityItems: [
      { title: 'Data export package', status: 'Healthy', detail: 'CSV, XLSX, and API export options are prepared.' },
      { title: 'Disaster recovery plan', status: 'Healthy', detail: 'RTO / RPO targets and restore test cadence are documented.' },
      { title: 'Monitoring', status: 'Healthy', detail: 'Connector, workflow, and audit monitoring is active.' },
      { title: 'Retention policy', status: 'Healthy', detail: 'Records retention and archive expectations are visible.' },
      { title: 'Vendor exit plan', status: 'Warning', detail: 'Agency export and transition checklist is ready, but dry run is pending.' },
    ],
    exportSamples: topItems(demoReports, 8),
    alerts: topItems(demoNotifications, 8),
  };
}
