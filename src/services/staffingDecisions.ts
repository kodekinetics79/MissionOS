// Persisted command-decision store for the staffing module.
//
// Staffing approvals, holds, denials and callbacks need to *stick* and feed the
// audit trail so the workflow reads as operational, not informational. When the
// live API is reachable the action is also POSTed for server-side audit; either
// way the decision is cached locally so the UI reflects state across the session
// and renders a real audit trail in demo mode.

const STORAGE_KEY = 'missionos.staffing.decisions.v1';

export interface StaffingDecision {
  id: string;
  action: string;
  decisionState: string;
  entityName: string;
  entityLabel: string;
  note?: string;
  actor: string;
  createdAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): Record<string, StaffingDecision> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function write(map: Record<string, StaffingDecision>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  listeners.forEach((listener) => listener());
}

// Map a human action into the resulting persisted state shown as a badge.
function stateForAction(action: string): string {
  const value = action.toLowerCase();
  if (value.includes('deny') || value.includes('reject')) return 'Denied';
  if (value.includes('hold')) return 'On Hold';
  if (value.includes('counter')) return 'Counter-Offered';
  if (value.includes('callback') || value.includes('contact')) return 'Callback Sent';
  if (value.includes('acknowled')) return 'Acknowledged';
  return 'Approved';
}

export function recordDecision(input: {
  id: string;
  action: string;
  entityName: string;
  entityLabel: string;
  note?: string;
  actor?: string;
}): StaffingDecision {
  const decision: StaffingDecision = {
    id: input.id,
    action: input.action,
    decisionState: stateForAction(input.action),
    entityName: input.entityName,
    entityLabel: input.entityLabel,
    note: input.note,
    actor: input.actor ?? 'Battalion Chief (on duty)',
    createdAt: new Date().toISOString(),
  };
  const map = read();
  map[input.id] = decision;
  write(map);
  return decision;
}

export function getDecision(id: string): StaffingDecision | null {
  return read()[id] ?? null;
}

export function listDecisions(): StaffingDecision[] {
  return Object.values(read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function clearDecisions() {
  write({});
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
