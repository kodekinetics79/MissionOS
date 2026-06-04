import { apiRequest, apiRequestOptional } from './apiClient';

export interface AiInsight {
  id: string;
  insightNumber: string;
  title: string;
  category: string;
  severity: string;
  priority: string;
  priorityScore: number;
  confidenceScore: number;
  status: string;
  sourceModulesJson: string[];
  summary: string;
  evidenceSummary: string;
  operationalImpact: string;
  recommendedAction: string;
  readinessImpactScore?: number;
  estimatedTimeSensitivity: string;
  affectedScope?: string;
  affectedStationId?: string | null;
  affectedStationName?: string | null;
  relatedRecords?: Array<{ type: string; id: string; label: string; route?: string }>;
}

interface Paginated<T> { items: T[]; page: number; take: number; total: number }
const list = <T,>(path: string) => apiRequestOptional<Paginated<T>>(path).then((res) => res ?? { items: [], page: 1, take: 0, total: 0 });
const items = <T,>(path: string) => apiRequestOptional<{ items: T[] }>(path).then((res) => res?.items ?? []);
const qs = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const aiApi = {
  commandCenter: (filters: Record<string, string | undefined> = {}) => apiRequest<any>(`/ai/command-center${qs(filters)}`),
  briefing: () => apiRequest<any>('/ai/readiness-briefing'),
  readinessSnapshot: () => apiRequest<any>('/ai/readiness-snapshot'),
  generate: () => apiRequest<any>('/ai/generate-insights', { method: 'POST' }),

  insights: (filters: Record<string, string | undefined> = {}) => list<AiInsight>(`/ai/insights${qs({ ...filters, take: '300' })}`),
  insight: (id: string) => apiRequest<any>(`/ai/insights/${id}`),
  insightEvidence: (id: string) => items<any>(`/ai/insights/${id}/evidence`),
  evidence: (filters: Record<string, string | undefined> = {}) => list<any>(`/ai/evidence${qs(filters)}`),

  acknowledge: (id: string) => apiRequest<any>(`/ai/insights/${id}/acknowledge`, { method: 'POST' }),
  resolve: (id: string) => apiRequest<any>(`/ai/insights/${id}/resolve`, { method: 'POST' }),
  dismiss: (id: string) => apiRequest<any>(`/ai/insights/${id}/dismiss`, { method: 'POST' }),
  createAction: (id: string, body: Record<string, unknown>) => apiRequest<any>(`/ai/insights/${id}/actions`, { method: 'POST', body: JSON.stringify(body) }),
  updateAction: (id: string, actionId: string, body: Record<string, unknown>) => apiRequest<any>(`/ai/insights/${id}/actions/${actionId}`, { method: 'PUT', body: JSON.stringify(body) }),

  ask: (question: string) => apiRequest<any>('/ai/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  questionHistory: () => list<any>('/ai/questions/history'),

  rules: (filters: Record<string, string | undefined> = {}) => list<any>(`/ai/rules${qs(filters)}`),
  enableRule: (id: string) => apiRequest<any>(`/ai/rules/${id}/enable`, { method: 'POST' }),
  disableRule: (id: string) => apiRequest<any>(`/ai/rules/${id}/disable`, { method: 'POST' }),

  providers: () => items<any>('/ai/providers'),
  updateProvider: (id: string, body: Record<string, unknown>) => apiRequest<any>(`/ai/providers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  testProvider: (id: string) => apiRequest<any>(`/ai/providers/${id}/test`, { method: 'POST' }),

  moduleRisk: (module: string) => apiRequest<any>(`/ai/risks/${module}`),
};

export function openAiInsight(insightId: string) {
  localStorage.setItem('missionos.ai.selectedInsightId', insightId);
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'ai-insight' } }));
}
export function setAiRoute(route: string) {
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
}
