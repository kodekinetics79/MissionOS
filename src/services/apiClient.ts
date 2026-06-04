import type { ApiResponse } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4100/api';

const TOKEN_KEY = 'missionos_token';
const DEMO_EMAIL = (import.meta.env.VITE_DEMO_EMAIL as string) || 'admin@westmetro.example';
const DEMO_PASSWORD = (import.meta.env.VITE_DEMO_PASSWORD as string) || 'MissionOS2026!';

/**
 * Ensures the SPA has a valid session before pages fetch data. The app has no
 * login screen for the local evaluator build, so this validates any existing
 * token and silently signs in with the seeded demo identity when needed. If the
 * API is unreachable, callers transparently fall back to demo data.
 */
export async function ensureDevSession(): Promise<boolean> {
  const existing = localStorage.getItem(TOKEN_KEY);
  if (existing) {
    try {
      const meResponse = await fetch(`${API_BASE_URL}/auth/me`, { headers: { Authorization: `Bearer ${existing}` } });
      if (meResponse.ok) return true;
    } catch {
      return false; // API unreachable — keep token, use fallbacks
    }
    localStorage.removeItem(TOKEN_KEY); // token invalid/expired — re-login below
  }
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const payload = await response.json().catch(() => null);
    const token = payload?.data?.accessToken;
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      return true;
    }
  } catch {
    /* API unreachable — pages will use demo fallbacks */
  }
  return false;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('missionos_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.errors?.[0] || payload?.message || `Request failed: ${response.status}`);
  }

  return payload.data;
}

export async function apiRequestOptional<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    return await apiRequest<T>(path, options);
  } catch {
    return null;
  }
}

export const commandCoreApi = {
  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: unknown }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => apiRequest('/auth/me'),
  dashboard: () => apiRequest('/platform/summary'),
  stations: () => apiRequest('/stations'),
  personnel: () => apiRequest('/personnel'),
  incidents: () => apiRequest('/incidents'),
  incidentCommandCenter: () => apiRequest('/incidents/command-center'),
  incidentDuplicates: () => apiRequest('/incidents/duplicates'),
  nerisMappings: () => apiRequest('/neris/mappings'),
  epcrLinks: () => apiRequest('/epcr/links'),
  cadImportLogs: () => apiRequest('/cad/import-logs'),
  apparatus: () => apiRequest('/apparatus'),
  assets: () => apiRequest('/assets'),
  inventory: () => apiRequest('/inventory'),
  properties: () => apiRequest('/properties'),
  notifications: () => apiRequest('/notifications'),
  rmsSummary: () => apiRequest('/rms/summary'),
  rmsRecords: () => apiRequest('/rms/records'),
  rmsNerisQueue: () => apiRequest('/rms/neris/queue'),
  rmsEpcrQueue: () => apiRequest('/rms/epcr/queue'),
  auditLogs: () => apiRequest('/audit-logs'),
  search: (q: string) => apiRequest(`/search?q=${encodeURIComponent(q)}`),
  roles: () => apiRequest('/roles'),
  permissions: () => apiRequest('/permissions'),
};
