export function RiskBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  const className = normalized.includes('high') || normalized.includes('critical') || normalized.includes('extreme')
    ? 'badge critical'
    : normalized.includes('warn') || normalized.includes('moderate')
      ? 'badge warning'
      : 'badge healthy';
  return <span className={className}>{level}</span>;
}
