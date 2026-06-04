import { useEffect, useRef, useState } from 'react';
import { Bell, ExternalLink } from 'lucide-react';
import type { Notification } from '../types';
import { StatusBadge } from './StatusBadge';

export function NotificationBell({
  count = 0,
  notifications = [],
  onOpen,
}: {
  count?: number;
  notifications?: Notification[];
  onOpen?: (notification: Notification) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="notification-wrap">
      <button type="button" className="icon-button" aria-label={`Notifications ${count}`} onClick={() => setOpen((current) => !current)}>
        <Bell size={18} />
        {count > 0 && <span className="pill">{count}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <strong>Notifications</strong>
            <span>{count} unread</span>
          </div>
          <div className="notification-list">
            {(notifications.length ? notifications : []).slice(0, 6).map((notification) => (
              <button
                key={notification.id}
                type="button"
                className="notification-item"
                onClick={() => {
                  onOpen?.(notification);
                  setOpen(false);
                }}
              >
                <div>
                  <b>{notification.title}</b>
                  <span>{notification.message}</span>
                </div>
                <div className="notification-meta">
                  <StatusBadge status={notification.isRead ? 'Healthy' : 'Warning'} />
                  <small>{notification.notificationType}</small>
                  <ExternalLink size={14} />
                </div>
              </button>
            ))}
            {!notifications.length && <div className="mini-note">No unread notifications.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
