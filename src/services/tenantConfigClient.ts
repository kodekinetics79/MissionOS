// Tenant module-configuration client. Persists per-tenant module enablement
// server-side when the API is reachable (tenant-scoped, survives reload), and
// always to localStorage for demo mode.
import { apiRequestOptional } from './apiClient';
import { readTenantModules, writeTenantModules } from '../data/tenants';

export async function saveTenantModules(tenantId: string, config: Record<string, boolean>) {
  writeTenantModules(tenantId, config);
  return apiRequestOptional('/admin/tenant-config', {
    method: 'POST',
    body: JSON.stringify({ tenantId, modules: config }),
  });
}

export async function loadTenantModules(tenantId: string): Promise<Record<string, boolean>> {
  const live = await apiRequestOptional<{ modules?: Record<string, boolean> }>(`/admin/tenant-config?tenantId=${encodeURIComponent(tenantId)}`);
  if (live?.modules) {
    writeTenantModules(tenantId, live.modules);
    return live.modules;
  }
  return readTenantModules(tenantId);
}
