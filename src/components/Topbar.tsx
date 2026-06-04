import { Search, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { NotificationBell } from './NotificationBell';
import { StatusBadge } from './StatusBadge';
import { RoleSwitcher } from './RoleSwitcher';
import type { Notification } from '../types';

export function Topbar({
  title,
  subtitle,
  role,
  roles,
  onRoleChange,
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
  role: string;
  roles: string[];
  onRoleChange: (role: string) => void;
  notifications?: number;
  notificationItems?: Notification[];
  searchSlot?: ReactNode;
  systemHealthLabel?: string;
  systemHealthHint?: string;
  quickActionLabel?: string;
  onQuickAction?: () => void;
  onNotificationOpen?: (notification: Notification) => void;
}) {
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
            <input placeholder="Search platform records" />
          </label>
        )}
        <NotificationBell count={notifications ?? 0} notifications={notificationItems ?? []} onOpen={onNotificationOpen} />
        {onQuickAction && <button type="button" className="btn-primary quick-action" onClick={onQuickAction}><Zap size={16} />{quickActionLabel ?? 'Quick Action'}</button>}
        <RoleSwitcher value={role} options={roles} onChange={onRoleChange} />
      </div>
    </header>
  );
}
