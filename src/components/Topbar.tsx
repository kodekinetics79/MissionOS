import { Search, Zap } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NotificationBell } from './NotificationBell';
import { StatusBadge } from './StatusBadge';
import { CurrentUser } from './CurrentUser';
import { ThemeToggle } from './ThemeToggle';
import type { Notification } from '../types';

export function Topbar({
  title,
  subtitle,
  notifications,
  notificationItems,
  searchSlot,
  systemHealthLabel,
  systemHealthHint,
  quickActionLabel,
  onQuickAction,
  onNotificationOpen,
}: {
  title: string;
  subtitle?: string;
  notifications?: number;
  notificationItems?: Notification[];
  searchSlot?: ReactNode;
  systemHealthLabel?: string;
  systemHealthHint?: string;
  quickActionLabel?: string;
  onQuickAction?: () => void;
  onNotificationOpen?: (notification: Notification) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const submitSearch = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    localStorage.setItem('missionos.search.query', trimmed);
    window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'search' } }));
  };

  return (
    <header className="topbar">
      <div className="topbar-copy">
        <span className="eyebrow">Unified shared platform</span>
        <strong>{title}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="topbar-actions">
        {systemHealthLabel && <div className="topbar-health"><StatusBadge status={systemHealthLabel} /><span>{systemHealthHint ?? 'System health overview'}</span></div>}
        {searchSlot ?? (
          <label className="search-inline">
            <Search size={16} />
            <input
              value={searchQuery}
              placeholder="Search platform records"
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch();
              }}
            />
          </label>
        )}
        <ThemeToggle />
        <NotificationBell count={notifications ?? 0} notifications={notificationItems ?? []} onOpen={onNotificationOpen} />
        {onQuickAction && <button type="button" className="btn-primary quick-action" onClick={onQuickAction}><Zap size={16} />{quickActionLabel ?? 'Quick Action'}</button>}
        <CurrentUser />
      </div>
    </header>
  );
}
