import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from '../services/platformClient';
import type { Notification } from '../types';
import { PageHeader } from '../components/PageHeader';
import { SectionCard } from '../components/SectionCard';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    getNotifications().then((response) => setNotifications(response.items));
  }, []);

  const handleMarkRead = async (id: string) => {
    const updated = await markNotificationRead(id);
    if (updated) {
      setNotifications((current) => current.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)));
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Alerts"
        title="Notifications"
        description="A shared notification stream for certifications, staffing, assets, integrations, and inspection issues."
      />

      <SectionCard title="Notification queue">
        <DataTable
          columns={['Title', 'Message', 'Type', 'State', 'Action']}
          rows={notifications}
          renderRow={(notification) => (
            <>
              <td><b>{notification.title}</b></td>
              <td>{notification.message}</td>
              <td>{notification.notificationType}</td>
              <td><StatusBadge status={notification.isRead ? 'Healthy' : 'Warning'} /></td>
              <td>
                <button type="button" onClick={() => handleMarkRead(notification.id)} disabled={notification.isRead}>
                  {notification.isRead ? 'Read' : 'Mark read'}
                </button>
              </td>
            </>
          )}
        />
      </SectionCard>
    </>
  );
}
