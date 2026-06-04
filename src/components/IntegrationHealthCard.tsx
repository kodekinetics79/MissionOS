import type { IntegrationSystem } from '../types';
import { StatusBadge } from './StatusBadge';
export function IntegrationHealthCard({ integration }: { integration: IntegrationSystem }) {
  return <article className="integration-card"><div><h3>{integration.name}</h3><p>{integration.method ?? integration.exchangeMethod}</p></div><StatusBadge status={integration.status}/><dl><dt>Latency</dt><dd>{integration.latency ?? 'n/a'}</dd><dt>Auth</dt><dd>{integration.auth ?? integration.authMethod ?? 'n/a'}</dd><dt>Last sync</dt><dd>{integration.lastSync ?? integration.lastSyncAt ?? 'n/a'}</dd><dt>Rate limit</dt><dd>{integration.rateLimit ?? (integration.rateLimitPerMinute ? `${integration.rateLimitPerMinute}/min` : 'n/a')}</dd></dl></article>;
}
