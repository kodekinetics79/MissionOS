import { useSyncExternalStore } from 'react';
import {
  demoAssets,
  demoAppraisals,
  demoEpcr,
  demoForecasting,
  demoHydrants,
  demoIncidents,
  demoInspections,
  demoIntegrations,
  demoInventory,
  demoKpis,
  demoNeris,
  demoNotifications,
  demoPermits,
  demoPreplans,
  demoReports,
  demoRequisitions,
  demoAuditLog,
  demoSecurity,
  demoStaff,
  demoStations,
  demoTraining,
  demoWorkOrders,
  demoWorkflows,
  demoOccupancies,
} from '../data/demoCore';

type Listener = () => void;

export type DemoState = {
  version: number;
  stations: any[];
  staff: any[];
  incidents: any[];
  neris: any[];
  epcr: any[];
  training: any[];
  appraisals: any[];
  kpis: any[];
  assets: any[];
  inventory: any[];
  workOrders: any[];
  inspections: any[];
  permits: any[];
  occupancies: any[];
  preplans: any[];
  hydrants: any[];
  forecasts: any[];
  requisitions: any[];
  workflows: any[];
  integrations: any[];
  security: any[];
  reports: any[];
  notifications: any[];
  auditLog: any[];
};

const clone = <T,>(value: T): T => structuredClone(value);

const createInitialState = (): DemoState => ({
  version: 0,
  stations: clone(demoStations),
  staff: clone(demoStaff),
  incidents: clone(demoIncidents),
  neris: clone(demoNeris),
  epcr: clone(demoEpcr),
  training: clone(demoTraining),
  appraisals: clone(demoAppraisals),
  kpis: clone(demoKpis),
  assets: clone(demoAssets),
  inventory: clone(demoInventory),
  workOrders: clone(demoWorkOrders),
  inspections: clone(demoInspections),
  permits: clone(demoPermits),
  occupancies: clone(demoOccupancies),
  preplans: clone(demoPreplans),
  hydrants: clone(demoHydrants),
  forecasts: clone(demoForecasting),
  requisitions: clone(demoRequisitions),
  workflows: clone(demoWorkflows),
  integrations: clone(demoIntegrations),
  security: clone(demoSecurity),
  reports: clone(demoReports),
  notifications: clone(demoNotifications),
  auditLog: clone(demoAuditLog),
});

let state = createInitialState();
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function updateState(mutator: (draft: DemoState) => void) {
  const draft = clone(state);
  draft.version += 1;
  mutator(draft);
  state = draft;
  notify();
}

export function mutateDemoState(mutator: (draft: DemoState) => void) {
  updateState(mutator);
}

export function subscribeDemoState(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoState() {
  return state;
}

export function emitToast(title: string, message: string, tone: 'success' | 'warning' | 'error' | 'info' = 'success') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('missionos:toast', { detail: { title, message, tone } }));
  }
}

export function addAudit(action: string, module: string, entityId?: string, entityName?: string, severity = 'Info') {
  updateState((draft) => {
    draft.auditLog.unshift({
      id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      action,
      module,
      entityId,
      entityName,
      severity,
      user: 'Demo User',
    });
  });
}

export function addNotification(notification: any) {
  updateState((draft) => {
    draft.notifications.unshift({
      id: `NOT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      isRead: false,
      ...notification,
    });
  });
}

function replaceById(collection: keyof DemoState, id: string, updates: Record<string, unknown>) {
  updateState((draft) => {
    const items = draft[collection] as any[];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return;
    items[index] = { ...items[index], ...updates };
  });
}

function appendToCollection(collection: keyof DemoState, records: any[]) {
  updateState((draft) => {
    const items = draft[collection] as any[];
    items.unshift(...records);
  });
}

export function updateIntegration(id: string, updates: Record<string, unknown>) {
  replaceById('integrations', id, updates);
}

export function updateWorkflow(id: string, updates: Record<string, unknown>) {
  replaceById('workflows', id, updates);
}

export function updatePermit(id: string, updates: Record<string, unknown>) {
  replaceById('permits', id, updates);
}

export function updatePreplan(id: string, updates: Record<string, unknown>) {
  replaceById('preplans', id, updates);
}

export function updateHydrant(id: string, updates: Record<string, unknown>) {
  replaceById('hydrants', id, updates);
}

export function updateReport(id: string, updates: Record<string, unknown>) {
  replaceById('reports', id, updates);
}

export function updateTraining(id: string, updates: Record<string, unknown>) {
  replaceById('training', id, updates);
}

export function updateRequisition(id: string, updates: Record<string, unknown>) {
  replaceById('requisitions', id, updates);
}

export function updateWorkOrder(id: string, updates: Record<string, unknown>) {
  replaceById('workOrders', id, updates);
}

export function updateInspection(id: string, updates: Record<string, unknown>) {
  replaceById('inspections', id, updates);
}

export function updateEpcr(id: string, updates: Record<string, unknown>) {
  replaceById('epcr', id, updates);
}

export function updateIncident(id: string, updates: Record<string, unknown>) {
  replaceById('incidents', id, updates);
}

export function updateAsset(id: string, updates: Record<string, unknown>) {
  replaceById('assets', id, updates);
}

export function updateKpi(id: string, updates: Record<string, unknown>) {
  replaceById('kpis', id, updates);
}

export function appendForecasts(records: any[]) {
  appendToCollection('forecasts', records);
}

export function appendReports(records: any[]) {
  appendToCollection('reports', records);
}

export function createTrainingAssignment(record: Record<string, unknown>) {
  updateState((draft) => {
    draft.training.unshift({
      id: `TRN-${Date.now().toString().slice(-6)}`,
      assignedAt: new Date().toISOString(),
      completionDate: null,
      completionPct: 0,
      status: 'Assigned',
      supervisorAlert: true,
      ...record,
    });
  });
}

export function useDemoState<T>(selector: (state: DemoState) => T): T {
  return useSyncExternalStore(
    subscribeDemoState,
    () => selector(state),
    () => selector(state),
  );
}

export function getCsv(rows: any[]) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
}

export function downloadCsv(rows: any[], fileName: string) {
  if (typeof document === 'undefined') return;
  const csv = getCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
