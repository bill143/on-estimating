// NEXUS ON Estimating — Client-Side RBAC Hooks

'use client';

import { useCallback } from 'react';
import { type UserRole, type Permission, ROLE_PERMISSIONS, ROLE_LABELS } from '@on/db';
import { useAuth } from '../auth-context';

/**
 * Hook for permission checks in React components.
 *
 * Usage:
 *   const { can, role } = usePermissions();
 *   if (can('estimate:create')) { ... }
 */
export function usePermissions() {
  const { user } = useAuth();

  // In dev mode with AUTH_DISABLED, default to 'owner' for full access
  const role: UserRole = (user as unknown as { role?: UserRole })?.role ?? 'owner';

  const can = useCallback(
    (permission: Permission): boolean => {
      return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
    },
    [role]
  );

  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.some((p) => ROLE_PERMISSIONS[role]?.includes(p));
    },
    [role]
  );

  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      return permissions.every((p) => ROLE_PERMISSIONS[role]?.includes(p));
    },
    [role]
  );

  return {
    role,
    roleLabel: ROLE_LABELS[role],
    can,
    canAny,
    canAll,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    isEstimator: role === 'owner' || role === 'admin' || role === 'senior_estimator' || role === 'estimator',
  };
}
