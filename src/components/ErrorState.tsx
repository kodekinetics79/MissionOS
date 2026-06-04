export function ErrorState({
  title = 'Unable to load data',
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <div className="state-panel error-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
