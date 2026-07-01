import { REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';

export function isRevokeRelease(release: Pick<IVanBanItem, 'LoaiYeuCau'>): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Thu hồi';
}

export function canAssignDocumentNumber(release: IVanBanItem): boolean {
  const status = (release.StatusApproved || '').trim();
  const hasDocumentNumber = Boolean((release.SoVanBan || '').trim());

  return (
    status === REQUEST_STATUS.DA_CAP_SO &&
    !hasDocumentNumber &&
    !isRevokeRelease(release)
  );
}
