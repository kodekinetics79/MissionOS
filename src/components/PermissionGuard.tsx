import type { ReactNode } from 'react';

export function PermissionGuard({
  hasAccess,
  fallback = null,
  children,
}: {
  hasAccess: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
