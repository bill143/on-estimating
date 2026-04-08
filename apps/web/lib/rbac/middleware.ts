// Source: AccuBuild — adapted from Django RBAC middleware to Next.js
// NEXUS ON Estimating — Permission Middleware

import { type UserRole, type Permission, ROLE_PERMISSIONS } from '@on/db';

/**
 * Server-side permission check for API routes.
 * Usage in Next.js API route:
 *   const user = await getAuthUser(request);
 *   requirePermission(user.role, 'estimate:create');
 */
export function requirePermission(role: UserRole | undefined, permission: Permission): void {
  if (!role) {
    throw new PermissionError('Authentication required');
  }
  if (!ROLE_PERMISSIONS[role]?.includes(permission)) {
    throw new PermissionError(
      `Role '${role}' does not have permission '${permission}'`
    );
  }
}

/**
 * Check multiple permissions (all must pass).
 */
export function requireAllPermissions(role: UserRole | undefined, permissions: Permission[]): void {
  for (const p of permissions) {
    requirePermission(role, p);
  }
}

/**
 * Check multiple permissions (at least one must pass).
 */
export function requireAnyPermission(role: UserRole | undefined, permissions: Permission[]): void {
  if (!role) {
    throw new PermissionError('Authentication required');
  }
  const hasAny = permissions.some((p) => ROLE_PERMISSIONS[role]?.includes(p));
  if (!hasAny) {
    throw new PermissionError(
      `Role '${role}' requires at least one of: ${permissions.join(', ')}`
    );
  }
}

/**
 * Pure check (no throw) for conditional UI rendering.
 */
export function canDo(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export class PermissionError extends Error {
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}
