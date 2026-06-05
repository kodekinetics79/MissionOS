import { exportCsv as downloadCsvFile } from '../utils/exportCsv';
import { demoScenarioData } from '../data/demoScenarioData';
import {
  addAudit,
  addNotification,
  createTrainingAssignment,
  getDemoState,
  mutateDemoState,
  updateAsset,
  updateEpcr,
  updateHydrant,
  updateIncident,
  updateInspection,
  updateIntegration,
  updatePermit,
  updatePreplan,
  updateRequisition,
  updateReport,
  updateTraining,
  updateWorkOrder,
  updateWorkflow,
} from './demoStateService';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;

function byId<T extends { id: string }>(items: T[], recordId: string) {
  return items.find((item) => item.id === recordId) ?? null;
}

function countBy<T>(items: T[], predicate: (item: T) => boolean) {
  return items.reduce((total, item) => total + (predicate(item) ? 1 : 0), 0);
}

function current() {
  return getDemoState();
}

export function getDashboardMetrics() {
  const state = current();
  const readyNeris = countBy(state.neris, (record) => record.validationStatus === 'Ready for Export');
  const staffingGaps = state.stations.reduce((total, station) => total + Number(station.staffingGap ?? 0), 0) + countBy(state.staff, (person) => person.status === 'Leave');
  const trainingCompliance = Math.round((countBy(state.training, (record) => record.status === 'Completed') / Math.max(state.training.length, 1)) * 100);
  const assetReadiness = Math.round(state.assets.reduce((total, asset) => total + Number(asset.readiness ?? 0), 0) / Math.max(state.assets.length, 1));
  const inspectionBacklog = countBy(state.inspections, (record) => ['Overdue', 'Pending Review'].includes(String(record.status)));
  const permitQueue = countBy(state.permits, (record) => ['Pending Review', 'Submitted'].includes(String(record.status)));
  const highRiskOccupancies = countBy(state.preplans, (record) => Number(record.riskScore ?? 0) >= 72 || Boolean(record.highRiskFlag));
  const integrationHealth = Math.round(state.integrations.reduce((total, item) => total + Number(item.healthScore ?? 0), 0) / Math.max(state.integrations.length, 1));
  const securityPosture = Math.round((countBy(state.security, (event) => String(event.severity) !== 'High') / Math.max(state.security.length, 1)) * 100);
  const overtimeRisk = Math.round(state.forecasts.filter((item) => item.category === 'Overtime').reduce((total, item) => total + Number(item.confidence ?? 0), 0) / Math.max(state.forecasts.filter((item) => item.category === 'Overtime').length, 1));
  const openTasks = state.workflows.filter((task) => ['Pending Review', 'In Progress', 'Needs QA'].includes(String(task.status))).length;
  return {
    nerisReadiness: Math.round((readyNeris / Math.max(state.neris.length, 1)) * 100),
    staffingGaps,
    trainingCompliance,
    assetReadiness,
    inspectionBacklog,
    permitQueue,
    highRiskOccupancies,
    integrationHealth,
    securityPosture,
    overtimeRisk,
    openTasks,
    scenarios: demoScenarioData.scenarios,
  };
}

export function getCommandCenterData() {
  const state = current();
  return {
    tasks: state.workflows.filter((task) => ['Pending Review', 'In Progress', 'Needs QA'].includes(String(task.status))).slice(0, 12),
    alerts: state.notifications.filter((item) => item.priority === 'High').slice(0, 12),
    incidents: state.incidents.slice(0, 12),
    scenarios: demoScenarioData.scenarios,
    recentAudit: state.auditLog.slice(0, 12),
  };
}

export const getIncidents = () => current().incidents;
export const getNerisRecords = () => current().neris;
export const getEpcrSyncRecords = () => current().epcr;
export const getStaff = () => current().staff;
export const getTrainingAssignments = () => current().training;
export const getCertifications = () => current().staff.flatMap((staffMember) => (staffMember.certifications ?? []).map((certification: string, index: number) => ({
  id: `${staffMember.id}-CERT-${index + 1}`,
  staffId: staffMember.id,
  staffName: staffMember.name,
  name: certification,
  status: staffMember.certExpiringDays <= 30 ? 'Expiring Soon' : 'Valid',
  expiryDate: staffMember.certExpiringDays ? new Date(Date.now() + staffMember.certExpiringDays * 86_400_000).toISOString() : null,
})));
export const getEvaluations = () => current().appraisals;
export const getImprovementPlans = () => current().workflows.filter((task) => task.workflowType === 'Evaluation' || task.workflowType === 'Improvement Plan');
export const getSchedules = () => current().workflows.filter((task) => task.workflowType === 'Schedule' || task.workflowType === 'Training Assignment');
export const getOvertimeRecords = () => current().forecasts.filter((item) => item.category === 'Overtime');
export const getAssets = () => current().assets;
export const getInventory = () => current().inventory;
export const getWorkOrders = () => current().workOrders;
export const getPurchaseRequests = () => current().requisitions.filter((item) => item.type === 'Inventory' || item.type === 'Budget');
export const getOccupancies = () => current().occupancies;
export const getInspections = () => current().inspections;
export const getViolations = () => current().inspections.flatMap((inspection) => (inspection.violationCount > 0 ? [{
  id: `VIO-${inspection.id}`,
  inspectionId: inspection.id,
  occupancyId: inspection.occupancyId,
  title: `${inspection.occupancyName} corrective issue`,
  status: inspection.reinspectionRequired ? 'Open' : 'Resolved',
  severity: inspection.riskLevel,
  dueDate: inspection.dueDate,
}] : []));
export const getPermits = () => current().permits;
export const getPreplans = () => current().preplans;
export const getHydrants = () => current().hydrants;
export const getKpis = () => current().kpis;
export const getForecasts = () => current().forecasts;
export const getReports = () => current().reports;
export const getWorkflowTasks = () => current().workflows;
export const getNotifications = () => current().notifications;
export const getIntegrations = () => current().integrations;
export const getAuditLogs = () => current().auditLog;

export function approveItem(recordId: string, type: string) {
  switch (type) {
    case 'permit':
      updatePermit(recordId, { status: 'Approved', reviewStatus: 'Approved', feeStatus: 'Paid' });
      break;
    case 'workflow':
      updateWorkflow(recordId, { status: 'Approved' });
      break;
    case 'report':
      updateReport(recordId, { status: 'Scheduled' });
      break;
    case 'incident':
      updateIncident(recordId, { qaStatus: 'Approved', status: 'Approved', nerisStatus: 'Ready for Export' });
      break;
    case 'epcr':
      updateEpcr(recordId, { syncStatus: 'Synced', qaStatus: 'Reviewed', hipaaPosture: 'Healthy' });
      break;
    default:
      break;
  }
  createAuditLog('Approve', type, recordId);
  createNotification(`${type} approved`, `${recordId} approved in demo state.`, 'success');
}

export function rejectItem(recordId: string, type: string, reason = 'Rejected in demo review') {
  switch (type) {
    case 'permit':
      updatePermit(recordId, { status: 'Needs QA', reviewStatus: 'Needs QA' });
      break;
    case 'workflow':
      updateWorkflow(recordId, { status: 'Needs QA' });
      break;
    case 'incident':
      updateIncident(recordId, { qaStatus: 'Needs QA', status: 'QA Needed' });
      break;
    case 'epcr':
      updateEpcr(recordId, { syncStatus: 'Failed Sync', qaStatus: 'Needs QA', hipaaPosture: 'At Risk' });
      break;
    default:
      break;
  }
  createAuditLog(`Reject: ${reason}`, type, recordId);
  createNotification(`${type} rejected`, reason, 'warning');
}

export function escalateItem(recordId: string, type: string) {
  if (type === 'workflow') updateWorkflow(recordId, { status: 'Escalated' });
  createAuditLog('Escalate', type, recordId);
  createNotification(`${type} escalated`, `${recordId} escalated to supervisor review.`, 'warning');
}

export function assignOwner(recordId: string, ownerId: string) {
  mutateDemoState((state) => {
    const target = [...state.workflows, ...state.requisitions, ...state.workOrders, ...state.inspections].find((item) => item.id === recordId);
    if (target) {
      target.ownerId = ownerId;
      target.assignedTo = ownerId;
    }
  });
  createAuditLog('Assign owner', 'Workflow', recordId);
}

export function markComplete(recordId: string, type: string) {
  switch (type) {
    case 'inspection':
      updateInspection(recordId, { status: 'Completed', completedAt: now() });
      break;
    case 'workOrder':
      updateWorkOrder(recordId, { status: 'Completed', completedAt: now() });
      break;
    case 'workflow':
      updateWorkflow(recordId, { status: 'Completed', completedAt: now() });
      break;
    case 'training':
      updateTraining(recordId, { status: 'Completed', completionDate: now(), completionPct: 100 });
      break;
    default:
      break;
  }
  createAuditLog('Mark complete', type, recordId);
  createNotification(`${type} completed`, `${recordId} marked complete.`, 'success');
}

export function createCorrectiveAction(sourceId: string, sourceType: string) {
  const task = {
    id: id('WF'),
    workflowType: 'Corrective Action',
    title: `${sourceType} corrective action`,
    status: 'Pending Review',
    owner: 'Demo Supervisor',
    approver: 'Division Chief',
    sourceModule: sourceType,
    dueDate: now(),
    linkedEntityId: sourceId,
    nextAction: 'Review and assign',
  };
  mutateDemoState((state) => {
    state.workflows.unshift(task);
  });
  createAuditLog('Create corrective action', sourceType, sourceId);
  return task;
}

export function assignTraining(staffId: string, trainingId: string) {
  createTrainingAssignment({
    staffId,
    staffName: byId(current().staff, staffId)?.name ?? 'Assigned Staff',
    course: byId(current().training, trainingId)?.course ?? 'Targeted refresher',
    category: 'Operations',
    relatedIncidentId: byId(current().incidents, trainingId)?.id ?? trainingId,
    source: 'Demo Operating Service',
    dueDate: now(),
  });
  createAuditLog('Assign training', 'Training', trainingId);
  return trainingId;
}

export function createStaffRequisition(sourceForecastId: string) {
  const forecast = byId(current().forecasts, sourceForecastId);
  const record = {
    id: id('REQ'),
    type: 'Staff',
    title: forecast?.title ?? 'Staff requisition',
    status: 'Pending Review',
    priority: 'High',
    requestedBy: 'Demo System',
    approver: 'Deputy Chief',
    reason: forecast?.title ?? 'Staffing forecast recommendation',
    linkedForecastId: sourceForecastId,
    cost: 0,
  };
  mutateDemoState((state) => {
    state.requisitions.unshift(record);
    state.workflows.unshift({
      id: id('WF'),
      workflowType: 'Requisition',
      title: `${record.title} approval`,
      status: 'Pending Review',
      owner: 'Demo System',
      approver: record.approver,
      sourceModule: 'Requisition',
      dueDate: now(),
      linkedEntityId: record.id,
      nextAction: 'Approve or reject',
    });
  });
  createAuditLog('Create staff requisition', 'Requisition', record.id);
  createNotification('Staff requisition created', record.title, 'info');
  return record;
}

export function createPurchaseRequest(sourceInventoryId: string) {
  const item = byId(current().inventory, sourceInventoryId);
  const record = {
    id: id('REQ'),
    type: 'Inventory',
    title: `${item?.itemName ?? 'Inventory'} reorder`,
    status: 'Pending Review',
    priority: item?.critical ? 'High' : 'Normal',
    requestedBy: 'Demo System',
    approver: 'Logistics Captain',
    reason: `Inventory on hand for ${item?.itemName ?? sourceInventoryId} is below reorder point.`,
    linkedForecastId: sourceInventoryId,
    cost: Number(item?.unitCost ?? 0) * 10,
  };
  mutateDemoState((state) => {
    state.requisitions.unshift(record);
  });
  createAuditLog('Create purchase request', 'Inventory', sourceInventoryId);
  createNotification('Purchase request created', record.title, 'warning');
  return record;
}

export function createWorkOrder(sourceAssetId: string) {
  const asset = byId(current().assets, sourceAssetId);
  const record = {
    id: id('WO'),
    assetId: sourceAssetId,
    assetName: asset?.name ?? 'Asset',
    title: 'Demo work order',
    status: 'Pending Review',
    priority: asset?.status === 'At Risk' ? 'High' : 'Normal',
    dueDate: now(),
    assignedTo: 'Demo Technician',
    estimatedCost: 500,
    riskImpact: asset?.status === 'At Risk' ? 'High' : 'Low',
  };
  mutateDemoState((state) => {
    state.workOrders.unshift(record);
  });
  createAuditLog('Create work order', 'Assets', sourceAssetId);
  createNotification('Work order created', `${asset?.name ?? sourceAssetId} sent to maintenance.`, 'info');
  return record;
}

export function scheduleInspection(occupancyId: string, date: string) {
  const occupancy = byId(current().occupancies, occupancyId);
  const record = {
    id: id('INS'),
    occupancyId,
    occupancyName: occupancy?.occupancyName ?? 'Occupancy',
    address: occupancy?.address ?? 'Unknown',
    stationId: occupancy?.stationId ?? 'ST-01',
    inspectorId: current().staff[0]?.id ?? 'SF-001',
    inspectorName: current().staff[0]?.name ?? 'Assigned Inspector',
    scheduledFor: date,
    dueDate: date,
    status: 'Scheduled',
    riskLevel: occupancy?.riskLevel ?? 'Moderate',
    violationCount: occupancy?.openViolations ?? 0,
    reinspectionRequired: false,
    permitDependency: occupancy?.permitIds?.[0] ?? null,
    preplanLinked: occupancy?.id ?? null,
    result: 'Scheduled from demo operating service',
    notes: 'Scheduled from demo operating service.',
  };
  mutateDemoState((state) => {
    state.inspections.unshift(record);
  });
  createAuditLog('Schedule inspection', 'Prevention', occupancyId);
  return record;
}

export function resolveViolation(violationId: string) {
  createAuditLog('Resolve violation', 'Prevention', violationId);
  createNotification('Violation resolved', `${violationId} marked resolved.`, 'success');
  return violationId;
}

export function approvePermit(permitId: string) {
  updatePermit(permitId, { status: 'Approved', reviewStatus: 'Approved', feeStatus: 'Paid' });
  createAuditLog('Approve permit', 'Permits', permitId);
  createNotification('Permit approved', permitId, 'success');
  return permitId;
}

export function updateHydrantStatus(hydrantId: string, status: string) {
  updateHydrant(hydrantId, { status, maintenanceStatus: status === 'Healthy' ? 'Healthy' : 'Overdue' });
  createAuditLog('Update hydrant status', 'Hydrants', hydrantId);
  return hydrantId;
}

export function syncIntegration(connectorId: string) {
  updateIntegration(connectorId, { status: 'Healthy', syncStatus: 'Live', lastSyncAt: now() });
  createAuditLog('Sync integration', 'Integration', connectorId);
  createNotification('Integration synced', `${connectorId} refreshed successfully.`, 'success');
  return connectorId;
}

export function exportCsv(datasetName: string, visibleRows: Array<Record<string, unknown>>) {
  downloadCsvFile(datasetName, visibleRows);
  createAuditLog('Export CSV', datasetName, datasetName);
  createNotification('CSV export started', `${datasetName} is downloading.`, 'info');
}

export function createAuditLog(action: string, entityType: string, entityId?: string) {
  addAudit(action, entityType, entityId, entityId, 'Info');
}

export function createNotification(title: string, message: string, severity: 'success' | 'warning' | 'error' | 'info' = 'info') {
  addNotification({ title, message, priority: severity === 'warning' || severity === 'error' ? 'High' : 'Normal', type: entityTypeFromTitle(title), relatedRoute: '/dashboard', status: 'Unread' });
  return { title, message, severity };
}

function entityTypeFromTitle(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('permit')) return 'Permit';
  if (lower.includes('training')) return 'Training';
  if (lower.includes('integration')) return 'Integration';
  if (lower.includes('inspection')) return 'Inspection';
  if (lower.includes('asset')) return 'Asset';
  return 'General';
}
