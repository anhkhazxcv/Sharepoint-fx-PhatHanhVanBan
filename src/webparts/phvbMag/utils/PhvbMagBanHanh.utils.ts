import { PHVB_ROLES, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';
import { isRevokeRelease } from './PhvbMagCapSo.utils';
import { userHasRole } from './PhvbMagRole.utils';
import type { IPhvbRoleEntry } from '../models/PhvbMag.models';

export function canPrepareBanHanh(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();
  const hasDocumentNumber = Boolean((release.SoVanBan || '').trim());

  return (
    status === REQUEST_STATUS.DA_CAP_SO &&
    hasDocumentNumber &&
    !isRevokeRelease(release) &&
    userHasRole(roles, userEmail, PHVB_ROLES.ADMIN)
  );
}

export function canPublishBanHanh(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();

  return (
    status === REQUEST_STATUS.CHO_BAN_HANH &&
    !isRevokeRelease(release) &&
    userHasRole(roles, userEmail, PHVB_ROLES.SUPER_ADMIN)
  );
}
