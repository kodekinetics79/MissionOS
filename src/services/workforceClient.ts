// Workforce Performance & Planning client. Mirrors the platform pattern: try the
// live API, fall back to the deterministic demo dataset so the module works with
// or without a running backend.
import { apiRequest, apiRequestOptional } from './apiClient';
import {
  appraisalCycleSummary,
  appraisals,
  departmentScorecard,
  escalations,
  improvementTracking,
  kpiCategorySummary,
  kpiLibrary,
  personnelScorecards,
  platoonScorecards,
  requisitions,
  stationScorecards,
  trainingNeeds,
  workforceForecast,
  workforceOverview,
  workforceReports,
} from '../data/workforceMock';

const optional = <T>(path: string, fallback: () => T) => apiRequestOptional<T>(path).then((value) => value ?? fallback());

export const getWorkforceOverview = () => optional('/workforce/overview', workforceOverview);
export const getWorkforceKpis = () => optional('/workforce/kpis', () => ({ items: kpiLibrary(), categories: kpiCategorySummary() }));
export const getWorkforceKpiCategories = () => optional('/workforce/kpi-categories', kpiCategorySummary);
export const getDepartmentScorecard = () => optional('/workforce/scorecards/department', departmentScorecard);
export const getStationScorecards = () => optional('/workforce/scorecards/stations', () => ({ items: stationScorecards() }));
export const getPlatoonScorecards = () => optional('/workforce/scorecards/platoons', () => ({ items: platoonScorecards() }));
export const getPersonnelScorecards = () => optional('/workforce/scorecards/personnel', () => ({ items: personnelScorecards() }));
export const getTrainingNeeds = () => optional('/workforce/training-needs', () => ({ items: trainingNeeds() }));
export const getImprovementTracking = () => optional('/workforce/improvement', () => ({ items: improvementTracking() }));
export const getAppraisals = () => optional('/workforce/appraisals', () => ({ items: appraisals(), summary: appraisalCycleSummary() }));
export const getEscalations = () => optional('/workforce/escalations', () => ({ items: escalations() }));
export const getWorkforceForecast = (days = 7) => optional(`/workforce/forecast?days=${days}`, () => workforceForecast(days));
export const getRequisitions = () => optional('/workforce/requisitions', () => ({ items: requisitions() }));
export const getWorkforceReports = () => optional('/workforce/reports', workforceReports);

export async function createRequisition(payload: Record<string, unknown>) {
  return apiRequestOptional('/workforce/requisitions', { method: 'POST', body: JSON.stringify(payload) });
}

export async function createKpi(payload: Record<string, unknown>) {
  return apiRequestOptional('/workforce/kpis', { method: 'POST', body: JSON.stringify(payload) });
}

export async function actOnWorkforceItem(kind: string, id: string, action: string) {
  // Tolerant of an unreachable API; the page persists the decision locally too.
  return apiRequestOptional(`/workforce/${kind}/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) });
}

export { apiRequest };
