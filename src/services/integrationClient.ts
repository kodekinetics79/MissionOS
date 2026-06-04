import { apiRequest, apiRequestOptional } from './apiClient';

export interface IntegrationHealth {
  healthScore: number;
  riskLevel: string;
  components: Record<string, number>;
  openErrorCount: number;
  criticalErrorCount: number;
  staleObjectCount: number;
  failedSyncCount: number;
  successRatePercent: number;
  averageLatencyMs: number;
}

export interface IntegrationSystem {
  id: string;
  name: string;
  systemType: string;
  vendorName?: string | null;
  description?: string;
  status: string;
  environment?: string;
  baseUrl?: string | null;
  authenticationType: string;
  exchangeMethod: string;
  dataDirection: string;
  lastSuccessfulSyncAt?: string | null;
  lastFailedSyncAt?: string | null;
  averageLatencyMs?: number;
  successRatePercent?: number;
  rateLimitPerMinute?: number;
  ownerTeam?: string;
  isCritical?: boolean;
  adapterName?: string;
  health?: IntegrationHealth;
  openErrorCount?: number;
  riskSummary?: string;
  recommendedAction?: string;
}

export interface CommandCenter {
  summary: {
    overallHealthScore: number;
    connectedCount: number;
    degradedCount: number;
    failedCount: number;
    totalSystems: number;
    lastSuccessfulSyncAt: string | null;
    failedSyncsToday: number;
    recordsExchangedToday: number;
    averageLatencyMs: number;
    criticalErrorCount: number;
    dataFreshnessRisks: number;
  };
  systems: IntegrationSystem[];
  recommendedActions: Array<{ system: string; riskSummary: string; recommendedAction: string; severity: string }>;
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

export const integrationApi = {
  commandCenter: () => apiRequest<CommandCenter>('/integrations/command-center'),
  health: () => apiRequest<{ overallHealthScore: number; systems: any[] }>('/integrations/health'),
  performance: () => apiRequest<{ systems: any[] }>('/integrations/performance'),
  dataFlow: () => apiRequest<{ flows: any[] }>('/integrations/data-flow'),
  adapters: () => items<any>('/integrations/adapters'),

  systems: (filters: Record<string, string | undefined> = {}) => list<IntegrationSystem>(`/integrations${qs(filters)}`),
  system360: (id: string) => apiRequest<any>(`/integrations/${id}`),

  logs: (filters: Record<string, string | undefined> = {}) => list<any>(`/integrations/logs${qs({ ...filters, take: '300' })}`),
  errors: (filters: Record<string, string | undefined> = {}) => list<any>(`/integrations/errors${qs(filters)}`),
  retryJobs: (filters: Record<string, string | undefined> = {}) => list<any>(`/integrations/retry-jobs${qs(filters)}`),

  fieldMappings: (id: string, filters: Record<string, string | undefined> = {}) => items<any>(`/integrations/${id}/field-mappings${qs(filters)}`),
  endpoints: (id: string) => items<any>(`/integrations/${id}/endpoints`),
  apiDocs: (id: string) => apiRequest<any>(`/integrations/${id}/api-docs`),
  dataObjects: (id: string) => items<any>(`/integrations/${id}/data-objects`),
  credentials: (id: string) => items<any>(`/integrations/${id}/credentials`),
  webhooks: (id: string) => items<any>(`/integrations/${id}/webhooks`),
  adapterInfo: (id: string) => apiRequest<any>(`/integrations/${id}/adapter-info`),

  // actions
  test: (id: string) => apiRequest<any>(`/integrations/${id}/test`, { method: 'POST' }),
  sync: (id: string) => apiRequest<any>(`/integrations/${id}/sync`, { method: 'POST' }),
  enable: (id: string) => apiRequest<any>(`/integrations/${id}/enable`, { method: 'POST' }),
  disable: (id: string) => apiRequest<any>(`/integrations/${id}/disable`, { method: 'POST' }),
  validateMappings: (id: string) => apiRequest<any>(`/integrations/${id}/field-mappings/validate`, { method: 'POST' }),
  resolveError: (errorId: string) => apiRequest<any>(`/integrations/errors/${errorId}/resolve`, { method: 'POST' }),
  dismissError: (errorId: string) => apiRequest<any>(`/integrations/errors/${errorId}/dismiss`, { method: 'POST' }),
  retryError: (errorId: string) => apiRequest<any>(`/integrations/errors/${errorId}/retry`, { method: 'POST' }),
  retryLog: (logId: string) => apiRequest<any>(`/integrations/logs/${logId}/retry`, { method: 'POST' }),
  rotateCredential: (id: string, credentialId: string) => apiRequest<any>(`/integrations/${id}/credentials/${credentialId}/rotate`, { method: 'POST' }),
  testWebhook: (id: string, webhookId: string) => apiRequest<any>(`/integrations/${id}/webhooks/${webhookId}/test`, { method: 'POST' }),
};

export function openIntegrationSystem(systemId: string) {
  localStorage.setItem('missionos.integration.selectedId', systemId);
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'integration-system' } }));
}

export function setIntegrationRoute(route: string) {
  window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route } }));
}
