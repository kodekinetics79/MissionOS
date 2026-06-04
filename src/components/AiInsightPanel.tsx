import { useEffect, useState } from 'react';
import { SectionCard } from './SectionCard';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './EmptyState';
import { aiApi, openAiInsight, setAiRoute, type AiInsight } from '../services/aiClient';

/**
 * Cross-module AI insight panel. Drops the AI Readiness Advisor's entity-scoped
 * insights into Station 360 / Personnel 360 (and anywhere else an entity needs
 * its AI risk signals).
 */
export function AiInsightPanel({ stationId, personnelId, title = 'AI Readiness Insights' }: { stationId?: string | null; personnelId?: string | null; title?: string }) {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!stationId && !personnelId) { setInsights([]); setLoaded(true); return; }
    setLoaded(false);
    const filters: Record<string, string> = {};
    if (stationId) filters.stationId = stationId;
    if (personnelId) filters.personnelId = personnelId;
    aiApi.insights(filters)
      .then((page) => setInsights(page.items))
      .catch(() => setInsights([]))
      .finally(() => setLoaded(true));
  }, [stationId, personnelId]);

  return (
    <SectionCard title={title} action={<button type="button" onClick={() => setAiRoute('advisor')}>Open Advisor</button>}>
      {!loaded ? <p className="muted">Loading AI signals…</p> : insights.length === 0 ? (
        <EmptyState title="No AI insights" description="No open AI readiness insights for this record right now." />
      ) : (
        <div className="card-list">
          {insights.slice(0, 5).map((insight) => (
            <article key={insight.id}>
              <b>{insight.title} <StatusBadge status={insight.severity} /></b>
              <span>{insight.summary}</span>
              <span className="action-line">Priority {insight.priorityScore} · {insight.recommendedAction}</span>
              <span><button type="button" onClick={() => openAiInsight(insight.id)}>Open insight</button></span>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
