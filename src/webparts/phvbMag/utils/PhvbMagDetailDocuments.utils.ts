import { PHVB_ROLES, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IPhvbRoleEntry, IVanBanItem } from '../models/PhvbMag.models';
import { normalizeRoleEmail, userHasAnyRole } from './PhvbMagRole.utils';

const CREATOR_MANAGE_STATUSES: ReadonlySet<string> = new Set([
  REQUEST_STATUS.DANG_GOP_Y,
  REQUEST_STATUS.DANG_THAM_DINH,
  REQUEST_STATUS.DANG_PHE_DUYET
]);

const ADMIN_LOCKED_STATUSES: ReadonlySet<string> = new Set([
  REQUEST_STATUS.CHO_BAN_HANH,
  REQUEST_STATUS.BAN_HANH
]);

export function canManageDetailDocuments(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();
  const normalizedUserEmail = normalizeRoleEmail(userEmail);

  if (!normalizedUserEmail || !status) {
    return false;
  }

  const isAdminOrSuperAdmin = userHasAnyRole(roles, userEmail, [
    PHVB_ROLES.ADMIN,
    PHVB_ROLES.SUPER_ADMIN
  ]);

  if (isAdminOrSuperAdmin) {
    return !ADMIN_LOCKED_STATUSES.has(status);
  }

  const creatorEmail = normalizeRoleEmail(release.EmailNguoiTao);
  if (!creatorEmail || creatorEmail !== normalizedUserEmail) {
    return false;
  }

  return CREATOR_MANAGE_STATUSES.has(status);
}
