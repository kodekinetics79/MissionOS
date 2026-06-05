// MissionOS multi-tenant configuration model.
//
// MissionOS is a multi-tenant SaaS platform: each agency tenant runs the same
// product with its own enabled modules, KPIs, workflows, reports, and roles.
// This file defines the sample tenants and the configurable module registry that
// the Tenant Configuration admin page and the navigation both read from.

export interface SampleTenant {
  id: string;
  name: string;
  code: string;
  type: string;
  timezone: string;
  isSample: boolean;
}

// Two sample agency tenants demonstrate that the platform is not a one-off build.
export const SAMPLE_TENANTS: SampleTenant[] = [
  { id: 'tenant-west-metro', name: 'West Metro Fire & EMS (Sample Agency)', code: 'WMFE', type: 'Fire + EMS District', timezone: 'America/Denver', isSample: true },
  { id: 'tenant-riverton', name: 'Riverton Regional EMS (Sample Agency)', code: 'RREMS', type: 'Regional EMS Authority', timezone: 'America/Chicago', isSample: true },
];

export type ModuleLayer = 'Core Compliance' | 'Advanced Intelligence' | 'Future Expansion';

export interface ModuleDef {
  key: string;
  label: string;
  layer: ModuleLayer;
  navIds: string[]; // sidebar item ids gated by this module
  alwaysOn?: boolean; // platform essentials cannot be disabled
  available?: boolean; // false = roadmap add-on, shown but not yet shippable
}

// Module registry. navIds tie a configurable module to the sidebar items it gates,
// so toggling a module actually changes what the tenant sees.
export const MODULE_REGISTRY: ModuleDef[] = [
  { key: 'records', label: 'Response & Records', layer: 'Core Compliance', navIds: ['rms', '/rms-neris', '/epcr-readiness', '/mobile-field-mode', 'incident-center', 'incident-detail', 'incident-edit', 'incidents'] },
  { key: 'workflow', label: 'Workflows & Approvals', layer: 'Core Compliance', navIds: ['incident-qa', 'incident-neris', 'incident-export', 'incident-epcr', 'incident-cad', 'incident-quality', 'requirement-alignment'] },
  { key: 'lms', label: 'Learning & Certifications', layer: 'Core Compliance', navIds: ['learning'] },
  { key: 'staffing', label: 'Staffing & Coverage', layer: 'Core Compliance', navIds: ['staffing'] },
  { key: 'personnel', label: 'Personnel & Performance', layer: 'Core Compliance', navIds: ['personnel360', 'performance-goals'] },
  { key: 'assets', label: 'Assets & Logistics', layer: 'Core Compliance', navIds: ['assets', 'apparatusRegistry', 'apparatus360', 'stationInventory', 'maintenance', 'preventive', 'transactions', 'reorder', 'risks'] },
  { key: 'prevention', label: 'Community Risk & Prevention', layer: 'Core Compliance', navIds: ['prevention', '/prevention-inspections', '/permits', '/preplans', '/hydrants-gis', 'prevention-properties', 'prevention-property', 'prevention-violations', 'prevention-preplan', 'prevention-hydrants', 'prevention-risks', 'prevention-prioritization'] },
  { key: 'analytics', label: 'Performance & Intelligence', layer: 'Core Compliance', navIds: ['analytics', 'analytics-quality', '/report-builder'] },
  { key: 'stations', label: 'Station Readiness', layer: 'Core Compliance', navIds: ['stations', 'station360'] },

  { key: 'mission-control', label: 'Command Center Intelligence', layer: 'Advanced Intelligence', navIds: ['advisor', 'demo-readiness'] },
  { key: 'workforce', label: 'Workforce Planning', layer: 'Advanced Intelligence', navIds: ['workforce-performance'] },
  { key: 'integration', label: 'Platform & Trust', layer: 'Advanced Intelligence', navIds: ['integrations', '/integration-hub', '/security-compliance', '/continuity-center', 'security', 'support', 'tenant-configuration'] },

  { key: 'digital-twin', label: 'Digital Twin Scenario Planning', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'ai-briefing', label: 'AI Command Briefing', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'citizen-portal', label: 'Citizen Portal', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'occupancy-portal', label: 'Business / Occupancy Portal', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'vendor-portal', label: 'Vendor Portal', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'mutual-aid', label: 'Mutual Aid Interoperability', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'board-reporting', label: 'Board-Ready Reporting', layer: 'Future Expansion', navIds: [], available: false },
  { key: 'open-api', label: 'Open API / Data Warehouse', layer: 'Future Expansion', navIds: [], available: false },
];

// Platform essentials are always on regardless of tenant config.
export const ALWAYS_ON_NAV_IDS = ['dashboard', 'daily-briefing', 'demo-readiness', 'advisor', 'requirement-alignment', 'security', '/security-compliance', '/continuity-center', 'support', 'tenant-configuration'];

// Default enablement per tenant: all available modules on, roadmap add-ons off.
// Riverton (EMS authority) ships with a fire-prevention-light default to prove
// tenants differ.
export function defaultEnabledModules(tenantId: string): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const mod of MODULE_REGISTRY) {
    map[mod.key] = mod.available === false ? false : true;
  }
  if (tenantId === 'tenant-riverton') {
    map.prevention = false; // EMS authority does not run fire prevention
  }
  return map;
}

const STORAGE_PREFIX = 'missionos.tenant.modules.';

export function readTenantModules(tenantId: string): Record<string, boolean> {
  if (typeof window === 'undefined') return defaultEnabledModules(tenantId);
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + tenantId);
    if (raw) return { ...defaultEnabledModules(tenantId), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultEnabledModules(tenantId);
}

export function writeTenantModules(tenantId: string, config: Record<string, boolean>) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_PREFIX + tenantId, JSON.stringify(config));
}

export function getActiveTenantId(): string {
  if (typeof window === 'undefined') return SAMPLE_TENANTS[0].id;
  return window.localStorage.getItem('missionos.activeTenantId') || SAMPLE_TENANTS[0].id;
}

export function setActiveTenantId(tenantId: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem('missionos.activeTenantId', tenantId);
}

// Nav ids enabled for the active tenant (used to gate the sidebar).
export function enabledNavIds(tenantId: string): Set<string> {
  const config = readTenantModules(tenantId);
  const ids = new Set<string>(ALWAYS_ON_NAV_IDS);
  for (const mod of MODULE_REGISTRY) {
    if (config[mod.key]) for (const navId of mod.navIds) ids.add(navId);
  }
  return ids;
}
