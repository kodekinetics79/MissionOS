import type { AiInsight } from '../types';
import { StatusBadge } from './StatusBadge';
export function InsightCard({ insight }: { insight: AiInsight }) {
  return <article className="insight-card"><div className="insight-head"><h3>{insight.title}</h3><StatusBadge status={insight.severity} /></div><p>{insight.summary}</p><div className="mini-grid"><span>Confidence <b>{insight.confidence ?? insight.confidenceScore ?? 0}%</b></span><span>Impact <b>{insight.impact ?? 'Shared agency risk'}</b></span></div><div className="chips">{(insight.sources ?? insight.dataSources ?? []).map(s=><span key={s}>{s}</span>)}</div><div className="action-line"><b>Next action:</b> {insight.action ?? insight.recommendedActions?.[0] ?? 'Review recommended actions'}</div></article>;
}
