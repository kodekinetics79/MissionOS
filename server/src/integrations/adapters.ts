import { prisma } from '../utils/prisma.js';

/**
 * Public Safety Integration Adapter Architecture
 * -----------------------------------------------
 * Replaceable connector layer. Every connected system is driven through an
 * adapter that implements a common interface. Today these are realistic MOCK
 * implementations (no external calls). To go live, replace a system's adapter
 * with a real connector that implements the same interface — nothing else in
 * the platform needs to change.
 */

export type AdapterOperation =
  | 'getSystemInfo'
  | 'testConnection'
  | 'getHealth'
  | 'sync'
  | 'retryFailed'
  | 'getFieldMappings'
  | 'validateFieldMappings'
  | 'getEndpointExamples'
  | 'getRecentLogs';

export interface AdapterSystemInfo {
  systemType: string;
  displayName: string;
  vendorName: string | null;
  capabilities: string[];
  dataObjects: string[];
  exchangePattern: string;
  authenticationType: string;
  notes: string;
  hipaaSensitive?: boolean;
}

export interface AdapterConnectionResult {
  ok: boolean;
  latencyMs: number;
  message: string;
  checkedAt: string;
}

export interface AdapterSyncResult {
  ok: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  latencyMs: number;
  message: string;
  correlationId: string;
  startedAt: string;
  completedAt: string;
}

const nowIso = () => new Date().toISOString();
const jitter = (base: number, spread = 120) => Math.max(20, Math.round(base + (Math.random() * spread - spread / 2)));

export abstract class BaseIntegrationAdapter {
  /** Whether this adapter calls a real external system. Mock adapters stay false. */
  readonly isReal: boolean = false;
  readonly supportedOperations: AdapterOperation[] = [
    'getSystemInfo',
    'testConnection',
    'getHealth',
    'sync',
    'retryFailed',
    'getFieldMappings',
    'validateFieldMappings',
    'getEndpointExamples',
    'getRecentLogs',
  ];

  constructor(protected readonly system: Record<string, any>) {}

  abstract getSystemInfo(): AdapterSystemInfo;

  async testConnection(): Promise<AdapterConnectionResult> {
    const base = Number(this.system.averageLatencyMs ?? 250);
    const degraded = ['Degraded', 'Failed'].includes(String(this.system.status));
    return {
      ok: this.system.status !== 'Failed' && this.system.status !== 'Disabled',
      latencyMs: jitter(base),
      message: degraded
        ? `${this.system.name} reachable but reporting degraded performance.`
        : `${this.system.name} connection healthy.`,
      checkedAt: nowIso(),
    };
  }

  async getHealth(): Promise<Record<string, any>> {
    const snapshot = (await prisma.integrationHealthSnapshot.findMany({
      where: { integrationSystemId: this.system.id },
      orderBy: { snapshotDate: 'desc' },
      take: 1,
    }))[0];
    return snapshot ?? {
      healthScore: this.system.successRatePercent ?? 90,
      successRatePercent: this.system.successRatePercent ?? 90,
      averageLatencyMs: this.system.averageLatencyMs ?? 250,
      riskLevel: 'Low',
    };
  }

  async sync(): Promise<AdapterSyncResult> {
    const objects = await prisma.integrationDataObject.findMany({ where: { integrationSystemId: this.system.id } });
    const processed = objects.reduce((total: number, object: any) => total + Math.min(120, Number(object.recordCountLastSync ?? 0) % 130), 40);
    const failRate = this.system.status === 'Degraded' ? 0.08 : 0.01;
    const failed = Math.round(processed * failRate);
    return {
      ok: failed === 0,
      recordsProcessed: processed,
      recordsSucceeded: processed - failed,
      recordsFailed: failed,
      latencyMs: jitter(Number(this.system.averageLatencyMs ?? 300)),
      message: `${this.system.name} sync simulated (${processed - failed}/${processed} records).`,
      correlationId: `corr-${Date.now()}`,
      startedAt: nowIso(),
      completedAt: nowIso(),
    };
  }

  async retryFailed(): Promise<AdapterSyncResult> {
    const result = await this.sync();
    return { ...result, message: `${this.system.name} retry of failed records simulated.` };
  }

  async getFieldMappings(): Promise<any[]> {
    return prisma.fieldMapping.findMany({ where: { integrationSystemId: this.system.id } });
  }

  async validateFieldMappings(): Promise<Record<string, any>> {
    const mappings = await this.getFieldMappings();
    const issues = mappings
      .filter((mapping: any) => mapping.status === 'Error' || mapping.status === 'Stale' || (mapping.required && !mapping.targetField))
      .map((mapping: any) => ({
        mappingId: mapping.id,
        field: `${mapping.sourceObject}.${mapping.sourceField}`,
        target: `${mapping.targetObject}.${mapping.targetField}`,
        issue: mapping.status === 'Error' ? 'Validation rule failure' : mapping.status === 'Stale' ? 'Mapping is stale' : 'Required field unmapped',
        severity: mapping.status === 'Error' ? 'High' : 'Medium',
      }));
    return {
      total: mappings.length,
      valid: mappings.length - issues.length,
      requiredCount: mappings.filter((mapping: any) => mapping.required).length,
      issues,
      validatedAt: nowIso(),
    };
  }

  async getEndpointExamples(): Promise<any[]> {
    return prisma.integrationEndpoint.findMany({ where: { integrationSystemId: this.system.id } });
  }

  async getRecentLogs(take = 25): Promise<any[]> {
    return prisma.integrationLog.findMany({
      where: { integrationSystemId: this.system.id },
      orderBy: { startedAt: 'desc' },
      take,
    });
  }
}

class CadAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'CAD', displayName: 'Computer-Aided Dispatch', vendorName: this.system.vendorName ?? 'Tyler / New World CAD',
      capabilities: ['Import incident dispatch data', 'Near real-time event stream', 'Unit assignment + timestamps'],
      dataObjects: ['Incidents', 'Units Dispatched', 'Dispatch Timestamps', 'Incident Locations'],
      exchangePattern: 'Event-driven / near real-time', authenticationType: this.system.authenticationType ?? 'OAuth2',
      notes: 'Inbound dispatch feed; new CAD events create or update MissionOS incidents.',
    };
  }
}

class RmsAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'RMS', displayName: 'Records Management System', vendorName: this.system.vendorName ?? 'MissionOS RMS',
      capabilities: ['Sync incident report lifecycle', 'QA status reconciliation', 'Attachment exchange'],
      dataObjects: ['Incident Reports', 'QA Reviews', 'Report Attachments'],
      exchangePattern: 'Event-driven / bidirectional', authenticationType: this.system.authenticationType ?? 'API Key',
      notes: 'Bidirectional reconciliation of report status and QA outcomes.',
    };
  }
}

class NerisAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'NERIS', displayName: 'NERIS National Export', vendorName: this.system.vendorName ?? 'USFA NERIS',
      capabilities: ['Outbound incident export', 'Required-field validation', 'Fire/EMS categorization'],
      dataObjects: ['Incident Report (NERIS)', 'Unit Response', 'Fire/EMS Categories'],
      exchangePattern: 'Batch / outbound', authenticationType: this.system.authenticationType ?? 'OAuth2',
      notes: 'Validates required incident location and codeset fields before national submission.',
    };
  }

  override async validateFieldMappings(): Promise<Record<string, any>> {
    const base = await super.validateFieldMappings();
    return { ...base, standard: 'NERIS', note: 'Location and geo fields are required for national submission.' };
  }
}

class PayrollAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'Payroll', displayName: 'Payroll Export', vendorName: this.system.vendorName ?? 'Workday Payroll',
      capabilities: ['Export overtime/staffing hours', 'Import payroll confirmation', 'Pay-period reconciliation'],
      dataObjects: ['Overtime Hours', 'Staffing Hours', 'Payroll Confirmation'],
      exchangePattern: 'Batch / bidirectional', authenticationType: this.system.authenticationType ?? 'Service Account',
      notes: 'Exports overtime/staffing hours and imports payroll confirmation per pay period.',
    };
  }
}

class GisAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'GIS', displayName: 'GIS / Mapping', vendorName: this.system.vendorName ?? 'Esri ArcGIS',
      capabilities: ['Import map layers, hydrants, property boundaries', 'Export response area overlays'],
      dataObjects: ['Hydrant Layer', 'Property Boundaries', 'Map Layers', 'Response Area Overlays'],
      exchangePattern: 'Hybrid / bidirectional', authenticationType: this.system.authenticationType ?? 'OAuth2',
      notes: 'Imports geospatial layers and publishes response-area overlays back to GIS.',
    };
  }
}

class EpcrAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'ePCR', displayName: 'ePCR / EMS Records', vendorName: this.system.vendorName ?? 'ESO Health Data Exchange',
      capabilities: ['Link EMS patient-care records', 'Return linked ePCR record ID + sync status'],
      dataObjects: ['Linked EMS Records', 'Patient Care Reports'],
      exchangePattern: 'Real-time / inbound', authenticationType: this.system.authenticationType ?? 'Mutual TLS',
      notes: 'HIPAA-restricted: ePCR access is logged and limited to authorized roles.',
      hipaaSensitive: true,
    };
  }

  override async sync(): Promise<AdapterSyncResult> {
    const result = await super.sync();
    return { ...result, message: `${result.message} (HIPAA-restricted access logged)` };
  }
}

class LmsAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'LMS', displayName: 'Learning Management System', vendorName: this.system.vendorName ?? 'Vector Solutions',
      capabilities: ['Sync course completions', 'Certification exchange', 'Push training assignments'],
      dataObjects: ['Course Completions', 'Certifications', 'Training Assignments'],
      exchangePattern: 'Real-time / bidirectional', authenticationType: this.system.authenticationType ?? 'OIDC',
      notes: 'Keeps training compliance and certification status in sync.',
    };
  }
}

class SsoAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'SSO', displayName: 'Single Sign-On / Identity', vendorName: this.system.vendorName ?? 'Microsoft Entra ID',
      capabilities: ['OIDC/SAML authentication', 'SCIM user provisioning', 'Role/group sync'],
      dataObjects: ['Users', 'Roles / Groups'],
      exchangePattern: 'Real-time / inbound', authenticationType: this.system.authenticationType ?? 'OIDC',
      notes: 'Microsoft Entra ID style OIDC/SAML configuration placeholder.',
    };
  }
}

class HrisAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'HRIS', displayName: 'HR Information System', vendorName: this.system.vendorName ?? 'Workday HCM',
      capabilities: ['Import authoritative personnel records', 'Employment status + rank sync'],
      dataObjects: ['Personnel Records', 'Employment Status', 'Rank / Position'],
      exchangePattern: 'Batch / inbound', authenticationType: this.system.authenticationType ?? 'Service Account',
      notes: 'Nightly authoritative personnel feed from the HR system of record.',
    };
  }
}

class DataWarehouseAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: 'Warehouse', displayName: 'Enterprise Data Warehouse', vendorName: this.system.vendorName ?? 'Snowflake',
      capabilities: ['Export incident/readiness facts', 'Nightly analytics staging'],
      dataObjects: ['Incident Facts', 'Readiness Snapshots', 'Integration Metrics'],
      exchangePattern: 'Batch / outbound', authenticationType: this.system.authenticationType ?? 'API Key',
      notes: 'Stages operational metrics into the enterprise warehouse for BI.',
    };
  }
}

/** Fallback adapter for any system without a dedicated connector. */
export class MockIntegrationAdapter extends BaseIntegrationAdapter {
  getSystemInfo(): AdapterSystemInfo {
    return {
      systemType: this.system.systemType ?? 'Generic', displayName: this.system.name ?? 'Generic System',
      vendorName: this.system.vendorName ?? null,
      capabilities: ['Test connection', 'Sync', 'Retry failed', 'Validate mappings'],
      dataObjects: [], exchangePattern: this.system.exchangeMethod ?? 'Batch',
      authenticationType: this.system.authenticationType ?? 'Pending',
      notes: 'Generic mock connector — replace with a real adapter to go live.',
    };
  }
}

type AdapterCtor = new (system: Record<string, any>) => BaseIntegrationAdapter;

const ADAPTER_BY_TYPE: Record<string, AdapterCtor> = {
  CAD: CadAdapter,
  RMS: RmsAdapter,
  NERIS: NerisAdapter,
  Payroll: PayrollAdapter,
  GIS: GisAdapter,
  ePCR: EpcrAdapter,
  LMS: LmsAdapter,
  SSO: SsoAdapter,
  HRIS: HrisAdapter,
  Warehouse: DataWarehouseAdapter,
};

const ADAPTER_LABELS: Record<string, string> = {
  CAD: 'CadAdapter', RMS: 'RmsAdapter', NERIS: 'NerisAdapter', Payroll: 'PayrollAdapter',
  GIS: 'GisAdapter', ePCR: 'EpcrAdapter', LMS: 'LmsAdapter', SSO: 'SsoAdapter',
  HRIS: 'HrisAdapter', Warehouse: 'DataWarehouseAdapter',
};

/**
 * Adapter registry — resolves the correct connector for a system and exposes
 * the catalog of adapters for the Adapter Registry UI.
 */
export const integrationAdapterRegistry = {
  resolve(system: Record<string, any>): BaseIntegrationAdapter {
    const Ctor = ADAPTER_BY_TYPE[String(system.systemType)] ?? MockIntegrationAdapter;
    return new Ctor(system);
  },

  adapterName(systemType: string): string {
    return ADAPTER_LABELS[systemType] ?? 'MockIntegrationAdapter';
  },

  /** Static catalog for the Adapter Registry page. */
  catalog() {
    const supported: AdapterOperation[] = [
      'testConnection', 'sync', 'retryFailed', 'validateFieldMappings', 'getRecentLogs', 'getEndpointExamples',
    ];
    return [
      { systemType: 'CAD', adapterName: 'CadAdapter' },
      { systemType: 'RMS', adapterName: 'RmsAdapter' },
      { systemType: 'NERIS', adapterName: 'NerisAdapter' },
      { systemType: 'Payroll', adapterName: 'PayrollAdapter' },
      { systemType: 'GIS', adapterName: 'GisAdapter' },
      { systemType: 'ePCR', adapterName: 'EpcrAdapter' },
      { systemType: 'LMS', adapterName: 'LmsAdapter' },
      { systemType: 'SSO', adapterName: 'SsoAdapter' },
      { systemType: 'HRIS', adapterName: 'HrisAdapter' },
      { systemType: 'Warehouse', adapterName: 'DataWarehouseAdapter' },
    ].map((entry) => ({
      ...entry,
      mode: 'Mock' as const,
      replaceable: true,
      replaceableNote: `Replace ${entry.adapterName} with a real connector implementing BaseIntegrationAdapter to go live.`,
      supportedOperations: supported,
      baseAdapter: 'BaseIntegrationAdapter',
    }));
  },
};
