import { REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';

export function isRevokeRelease(release: Pick<IVanBanItem, 'LoaiYeuCau'>): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Thu hồi';
}

export function isIssueOrAdjustRequest(loaiYeuCau?: string): boolean {
  const type = (loaiYeuCau || '').trim();
  return type === 'Viết mới' || type === 'Điều chỉnh';
}

export function canAssignDocumentNumber(release: IVanBanItem): boolean {
  const status = (release.StatusApproved || '').trim();
  const hasDocumentNumber = Boolean((release.SoVanBan || '').trim());

  return (
    status === REQUEST_STATUS.CHO_CAP_SO &&
    !hasDocumentNumber &&
    !isRevokeRelease(release)
  );
}
