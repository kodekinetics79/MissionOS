export function Tabs({
  items,
  activeId,
  onChange,
}: {
  items: Array<{ id: string; label: string }>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs">
      {items.map((item) => (
        <button key={item.id} type="button" className={item.id === activeId ? 'active' : ''} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
