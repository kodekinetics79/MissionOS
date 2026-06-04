import { apiRequest, apiRequestOptional } from './apiClient';

const emptyPaginated: any = { items: [], page: 1, take: 50, total: 0 };

const getArray = async <T,>(path: string): Promise<T[]> => (await apiRequestOptional<T[]>(path)) ?? [];
const getPaginated = async <T,>(path: string): Promise<{ items: T[]; page: number; take: number; total: number }> => (await apiRequestOptional<any>(path)) ?? emptyPaginated;

export async function getPreventionCommandCenter(): Promise<any> {
  return (await apiRequestOptional<any>('/prevention/command-center')) ?? { summary: {}, properties: [], inspections: [], stationWorkload: [], highRiskOccupancies: [], openCriticalViolations: [], permitBacklog: [], reviewDuePreplans: [], hydrantIssues: [], hazardCounts: {}, aiRecommendedActions: [], recentActivity: [], insights: [], readinessImpact: {} };
}

export async function getPreventionRisks(): Promise<any[]> {
  return (await apiRequestOptional<any[]>('/prevention/risks')) ?? [];
}

export async function getPreventionReadinessImpact(): Promise<any> {
  return (await apiRequestOptional<any>('/prevention/readiness-impact')) ?? { agencyPreventionRiskScore: 0, riskLevel: 'Low', stationSummaries: [], topRisks: [] };
}

export async function getProperties(filters: Record<string, unknown> = {}): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim()) query.set(key, String(value));
  });
  return (await apiRequestOptional<any>(`/properties${query.toString() ? `?${query}` : ''}`)) ?? emptyPaginated;
}

export async function createProperty(data: Record<string, unknown>) { return apiRequest('/properties', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateProperty(id: string, data: Record<string, unknown>) { return apiRequest(`/properties/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function getProperty360(id: string): Promise<any> { return apiRequestOptional<any>(`/properties/${id}/360`); }
export async function getPropertyInspections(id: string) { return getArray(`/properties/${id}/inspections`); }
export async function getPropertyPermits(id: string) { return getArray(`/properties/${id}/permits`); }
export async function getPropertyPreplans(id: string) { return getArray(`/properties/${id}/preplans`); }
export async function getPropertyViolations(id: string) { return getArray(`/properties/${id}/violations`); }
export async function getPropertyRisk(id: string) { return apiRequestOptional(`/properties/${id}/risk`); }

export async function getOccupancies(): Promise<any> { return getPaginated<any>('/occupancies'); }
export async function createOccupancy(data: Record<string, unknown>) { return apiRequest('/occupancies', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateOccupancy(id: string, data: Record<string, unknown>) { return apiRequest(`/occupancies/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

export async function getInspections(filters: Record<string, unknown> = {}): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim()) query.set(key, String(value));
  });
  return (await apiRequestOptional<any>(`/inspections${query.toString() ? `?${query}` : ''}`)) ?? emptyPaginated;
}
export async function createInspection(data: Record<string, unknown>) { return apiRequest('/inspections', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateInspection(id: string, data: Record<string, unknown>) { return apiRequest(`/inspections/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function startInspection(id: string) { return apiRequest(`/inspections/${id}/start`, { method: 'POST' }); }
export async function completeInspection(id: string, data: Record<string, unknown> = {}) { return apiRequest(`/inspections/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }); }
export async function closeInspection(id: string) { return apiRequest(`/inspections/${id}/close`, { method: 'POST' }); }
export async function getPrioritizedInspections(): Promise<any[]> { return getArray('/inspections/prioritized'); }
export async function getOverdueInspections(): Promise<any[]> { return getArray('/inspections/overdue'); }
export async function getInspectionChecklist(id: string): Promise<any[]> { return getArray(`/inspections/${id}/checklist`); }
export async function addInspectionChecklistItem(id: string, data: Record<string, unknown>) { return apiRequest(`/inspections/${id}/checklist`, { method: 'POST', body: JSON.stringify(data) }); }

export async function getViolations(filters: Record<string, unknown> = {}): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim()) query.set(key, String(value));
  });
  return (await apiRequestOptional<any>(`/violations${query.toString() ? `?${query}` : ''}`)) ?? emptyPaginated;
}
export async function createViolation(data: Record<string, unknown>) { return apiRequest('/violations', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateViolation(id: string, data: Record<string, unknown>) { return apiRequest(`/violations/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function resolveViolation(id: string) { return apiRequest(`/violations/${id}/resolve`, { method: 'POST' }); }
export async function escalateViolation(id: string) { return apiRequest(`/violations/${id}/escalate`, { method: 'POST' }); }
export async function getOpenViolations(): Promise<any[]> { return getArray('/violations/open'); }
export async function getCriticalViolations(): Promise<any[]> { return getArray('/violations/critical'); }

export async function getCorrectiveActions(): Promise<any[]> { return getArray('/corrective-actions'); }
export async function createCorrectiveAction(data: Record<string, unknown>) { return apiRequest('/corrective-actions', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateCorrectiveAction(id: string, data: Record<string, unknown>) { return apiRequest(`/corrective-actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function completeCorrectiveAction(id: string) { return apiRequest(`/corrective-actions/${id}/complete`, { method: 'POST' }); }

export async function getPermits(filters: Record<string, unknown> = {}): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim()) query.set(key, String(value));
  });
  return (await apiRequestOptional<any>(`/permits${query.toString() ? `?${query}` : ''}`)) ?? emptyPaginated;
}
export async function createPermit(data: Record<string, unknown>) { return apiRequest('/permits', { method: 'POST', body: JSON.stringify(data) }); }
export async function updatePermit(id: string, data: Record<string, unknown>) { return apiRequest(`/permits/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function reviewPermit(id: string, data: Record<string, unknown>) { return apiRequest(`/permits/${id}/review`, { method: 'POST', body: JSON.stringify(data) }); }
export async function approvePermit(id: string) { return apiRequest(`/permits/${id}/approve`, { method: 'POST' }); }
export async function denyPermit(id: string) { return apiRequest(`/permits/${id}/deny`, { method: 'POST' }); }
export async function requestPermitInfo(id: string) { return apiRequest(`/permits/${id}/request-info`, { method: 'POST' }); }
export async function getPermitBacklog(): Promise<any[]> { return getArray('/permits/backlog'); }
export async function getExpiringPermits(): Promise<any[]> { return getArray('/permits/expiring'); }

export async function getPreplans(filters: Record<string, unknown> = {}): Promise<any> {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value != null && String(value).trim()) query.set(key, String(value));
  });
  return (await apiRequestOptional<any>(`/preplans${query.toString() ? `?${query}` : ''}`)) ?? emptyPaginated;
}
export async function createPreplan(data: Record<string, unknown>) { return apiRequest('/preplans', { method: 'POST', body: JSON.stringify(data) }); }
export async function updatePreplan(id: string, data: Record<string, unknown>) { return apiRequest(`/preplans/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export async function activatePreplan(id: string) { return apiRequest(`/preplans/${id}/activate`, { method: 'POST' }); }
export async function markPreplanReviewDue(id: string) { return apiRequest(`/preplans/${id}/mark-review-due`, { method: 'POST' }); }
export async function getPreplansReviewDue(): Promise<any[]> { return getArray('/preplans/review-due'); }
export async function getPreplansIncomplete(): Promise<any[]> { return getArray('/preplans/incomplete'); }

export async function getHydrants(): Promise<any> { return getPaginated<any>('/hydrants'); }
export async function createHydrant(data: Record<string, unknown>) { return apiRequest('/hydrants', { method: 'POST', body: JSON.stringify(data) }); }
export async function getHydrantIssues(): Promise<any[]> { return getArray('/hydrants/issues'); }

export async function getHazards(): Promise<any> { return getPaginated<any>('/hazards'); }
export async function createHazard(data: Record<string, unknown>) { return apiRequest('/hazards', { method: 'POST', body: JSON.stringify(data) }); }
export async function getCriticalHazards(): Promise<any[]> { return getArray('/hazards/critical'); }

export async function getStationPreventionSummary(id: string): Promise<any> { return apiRequestOptional<any>(`/stations/${id}/prevention`); }
export async function getStationPreventionRisk(id: string): Promise<any> { return apiRequestOptional<any>(`/stations/${id}/prevention-risk`); }
