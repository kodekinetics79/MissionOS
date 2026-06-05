import { useEffect, useState } from 'react';
import { getCurrentUser } from '../services/platformClient';

function initials(email: string) {
  const name = email.split('@')[0] ?? email;
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// Shows the actual authenticated user (from /auth/me) — replaces the old demo
// role switcher. Permissions/roles are managed in Security & Admin → Users.
export function CurrentUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    let active = true;
    getCurrentUser().then((u) => { if (active) setUser(u); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const email = user?.email ?? '—';
  const isAdmin = (user?.permissions ?? []).some((p: string) => p.startsWith('admin.'));
  const roleLabel = isAdmin ? 'Administrator' : 'Member';

  return (
    <button
      type="button"
      className="current-user"
      title="Manage users & roles in Security & Admin"
      onClick={() => window.dispatchEvent(new CustomEvent('missionos:set-route', { detail: { route: 'admin-users' } }))}
    >
      <span className="current-user-avatar">{initials(email)}</span>
      <span className="current-user-meta">
        <strong>{email}</strong>
        <small>{roleLabel}</small>
      </span>
    </button>
  );
}
