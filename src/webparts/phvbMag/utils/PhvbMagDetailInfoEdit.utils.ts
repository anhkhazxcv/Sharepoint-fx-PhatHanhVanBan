import { PHVB_ROLES } from '../config/PhvbMag.configuration';
import type { IPhvbRoleEntry, IVanBanItem } from '../models/PhvbMag.models';
import { userHasAnyRole } from './PhvbMagRole.utils';
import { ADMIN_LOCKED_STATUSES } from './PhvbMagDetailDocuments.utils';

export interface IRequestInfoFieldsInput {
  tenVanBan: string;
  tenVanBanEng: string;
  folderLuuTru: string;
  hieuLucTu: string;
  hieuLucDen: string;
  isSendMailNotify: boolean;
  summary: string;
  ghiChuThamDinh: string;
}

export function canEditRequestInfoFields(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();

  if (!status || ADMIN_LOCKED_STATUSES.has(status)) {
    return false;
  }

  return userHasAnyRole(roles, userEmail, [PHVB_ROLES.ADMIN, PHVB_ROLES.SUPER_ADMIN]);
}

export function buildRequestInfoFieldsFromRelease(release: IVanBanItem): IRequestInfoFieldsInput {
  return {
    tenVanBan: release.Tenvanban || '',
    tenVanBanEng: release.TenVanBan_ENG || '',
    folderLuuTru: release.ThuMucBanHanh || '',
    hieuLucTu: release.HieuLucTu || '',
    hieuLucDen: release.HieuLucDen || '',
    isSendMailNotify: release.IsSendMailNotify === true,
    summary: release.TomTatNoiDung || '',
    ghiChuThamDinh: release.GhiChuChoThamDinh || ''
  };
}
