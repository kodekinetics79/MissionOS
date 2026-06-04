import { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const Card = (
    <section className={`stat-card${onClick ? ' clickable' : ''}`}>
      <div className="stat-top"><span>{label}</span>{icon}</div>
      <strong>{value}</strong>
      {hint && <p>{hint}</p>}
    </section>
  );
  return onClick ? <button type="button" className="stat-button" onClick={onClick}>{Card}</button> : Card;
}
