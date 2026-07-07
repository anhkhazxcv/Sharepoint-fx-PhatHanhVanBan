import type { IPhvbRoleEntry } from '../models/PhvbMag.models';

export function normalizeRoleEmail(email?: string): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeRoleName(role?: string): string {
  return (role || '').trim();
}

export function userHasRole(
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail: string | undefined,
  role: string
): boolean {
  const normalizedEmail = normalizeRoleEmail(userEmail);
  const normalizedRole = normalizeRoleName(role);

  if (!normalizedEmail || !normalizedRole) {
    return false;
  }

  return roles.some(entry =>
    normalizeRoleName(entry.role) === normalizedRole &&
    normalizeRoleEmail(entry.email) === normalizedEmail
  );
}

export function userHasAnyRole(
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail: string | undefined,
  roleNames: ReadonlyArray<string>
): boolean {
  return roleNames.some(role => userHasRole(roles, userEmail, role));
}
