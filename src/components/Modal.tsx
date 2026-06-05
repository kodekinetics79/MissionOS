import type { ReactNode } from 'react';

export function Modal({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted" style={{ marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

