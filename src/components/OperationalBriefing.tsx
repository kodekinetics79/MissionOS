import { ReactNode } from 'react';
import { SectionCard } from './SectionCard';
import { StatusBadge } from './StatusBadge';

export function OperationalBriefing({
  title = 'What matters now',
  eyebrow = 'Operational briefing',
  summary,
  bullets,
  actions,
  badge = 'Watch',
  evidence,
}: {
  title?: string;
  eyebrow?: string;
  summary: string;
  bullets: Array<string | ReactNode>;
  actions?: ReactNode;
  badge?: string;
  evidence?: Array<string>;
}) {
  return (
    <SectionCard
      title={title}
      action={<div className="inline-actions"><StatusBadge status={badge} />{actions}</div>}
    >
      <div className="operational-briefing">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <p className="briefing-summary">{summary}</p>
        </div>
        <div className="briefing-grid">
          <ul className="briefing-list">
            {bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
          </ul>
          {evidence?.length ? (
            <div className="briefing-evidence">
              <strong>Evidence</strong>
              <div className="chips">
                {evidence.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
