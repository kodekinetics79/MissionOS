export function LoadingState({ label = 'Loading platform data...' }: { label?: string }) {
  return <div className="state-panel loading-state">{label}</div>;
}
