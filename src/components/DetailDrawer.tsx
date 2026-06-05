import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';

export function DetailDrawer({
  title,
  subtitle,
  status,
  details,
  relatedRecords,
  timeline,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  status?: string;
  details?: Array<{ label: string; value: ReactNode }>;
  relatedRecords?: ReactNode;
  timeline?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <aside className="detail-drawer">
      <div>
        <div className="row-between">
          <strong>{title}</strong>
          {status ? <StatusBadge status={status} /> : null}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {details?.length ? (
        <div className="detail-grid">
          {details.map((item) => (
            <div key={item.label} className="mini-card">
              <span>{item.label}</span>
              <b>{item.value}</b>
            </div>
          ))}
        </div>
      ) : null}
      {relatedRecords ? <div>{relatedRecords}</div> : null}
      {timeline ? <div>{timeline}</div> : null}
      {children}
      {actions ? <div className="inline-actions">{actions}</div> : null}
    </aside>
  );
}
