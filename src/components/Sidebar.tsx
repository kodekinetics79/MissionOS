import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ShieldCheck } from 'lucide-react';

export interface SidebarItem {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  description?: string;
}

export interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

export function Sidebar({
  groups,
  activeId,
  onSelect,
}: {
  groups: SidebarGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const itemToGroup = useMemo(
    () =>
      Object.fromEntries(
        groups.flatMap((group) => group.items.map((item) => [item.id, group.label] as const)),
      ),
    [groups],
  );
  const initialOpen = useMemo(() => Object.fromEntries(groups.map((group) => [group.label, false])), [groups]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  useEffect(() => {
    const activeGroup = itemToGroup[activeId];
    if (!activeGroup) return;
    setOpenGroups((current) => {
      if (current[activeGroup]) return current;
      return { ...current, [activeGroup]: true };
    });
  }, [activeId, itemToGroup]);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <ShieldCheck size={22} />
        </div>
        <div>
          <strong>MissionOS</strong>
          <span>SaaS platform for Fire/EMS & public safety</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        {groups.map((group) => {
          const isOpen = openGroups[group.label] ?? true;
          return (
            <div key={group.label} className="sidebar-group">
              <button
                type="button"
                className="sidebar-group-header"
                onClick={() => setOpenGroups((current) => ({ ...current, [group.label]: !isOpen }))}
              >
                <span>{group.label}</span>
                <small>{group.items.length}</small>
              </button>
              {isOpen && (
                <div className="sidebar-group-items">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={activeId === item.id ? 'active' : ''}
                        onClick={() => onSelect(item.id)}
                      >
                        <Icon size={18} />
                        <span>
                          <strong>{item.label}</strong>
                          {item.description && <small>{item.description}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
