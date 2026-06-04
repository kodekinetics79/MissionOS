import type { ReactNode } from 'react';

export function DetailDrawer({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <aside className="detail-drawer">
      <div>
        <strong>{title}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </aside>
  );
}
