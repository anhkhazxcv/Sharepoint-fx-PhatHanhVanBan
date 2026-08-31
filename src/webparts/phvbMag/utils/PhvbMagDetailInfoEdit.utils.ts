import { PHVB_ROLES, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IPhvbRoleEntry, IVanBanItem } from '../models/PhvbMag.models';
import { toInputDateValue } from './PhvbMagDraftEdit.utils';
import { userHasAnyRole } from './PhvbMagRole.utils';

/** Chỉ khoá sửa thông tin khi đã Ban hành (bản thân document đã phát hành chính thức). Admin/Super Admin vẫn được sửa khi Chờ ban hành. */
const INFO_EDIT_LOCKED_STATUSES: ReadonlySet<string> = new Set([REQUEST_STATUS.BAN_HANH]);

export interface IRequestInfoFieldsInput {
  tenVanBan: string;
  tenVanBanEng: string;
  folderLuuTru: string;
  hieuLucTu: string;
  hieuLucDen: string;
  isSendMailNotify: boolean;
  summary: string;
  ghiChuThamDinh: string;
  lienHe: string;
}

export function canEditRequestInfoFields(
  release: IVanBanItem,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail?: string
): boolean {
  const status = (release.StatusApproved || '').trim();

  if (!status || INFO_EDIT_LOCKED_STATUSES.has(status)) {
    return false;
  }

  return userHasAnyRole(roles, userEmail, [PHVB_ROLES.ADMIN, PHVB_ROLES.SUPER_ADMIN]);
}

export function buildRequestInfoFieldsFromRelease(release: IVanBanItem): IRequestInfoFieldsInput {
  return {
    tenVanBan: release.Tenvanban || '',
    tenVanBanEng: release.TenVanBan_ENG || '',
    folderLuuTru: release.ThuMucBanHanh || '',
    hieuLucTu: toInputDateValue(release.HieuLucTu),
    hieuLucDen: toInputDateValue(release.HieuLucDen),
    isSendMailNotify: release.IsSendMailNotify === true,
    summary: release.TomTatNoiDung || '',
    ghiChuThamDinh: release.GhiChuChoThamDinh || '',
    lienHe: release.LienHe || ''
  };
}

/** Nhãn hiển thị đúng như UI (`PhvbMagDetailInfoTab.tsx`, dạng sentence case cho log). */
const REQUEST_INFO_FIELD_LABELS: Record<keyof IRequestInfoFieldsInput, string> = {
  tenVanBan: 'Tên văn bản',
  tenVanBanEng: 'Tên văn bản (tiếng Anh)',
  folderLuuTru: 'Thư mục',
  hieuLucTu: 'Ngày hiệu lực',
  hieuLucDen: 'Ngày hết hiệu lực',
  isSendMailNotify: 'Email',
  summary: 'Tóm tắt nội dung',
  ghiChuThamDinh: 'Ghi chú cho cấp thẩm định / phê duyệt',
  lienHe: 'Đầu mối liên hệ'
};

/** Danh sách nhãn field đã đổi giá trị, dùng để build NoiDung log "Sửa thông tin yêu cầu". */
export function buildRequestInfoChangedFieldLabels(
  before: IRequestInfoFieldsInput,
  after: IRequestInfoFieldsInput
): string[] {
  return (Object.keys(REQUEST_INFO_FIELD_LABELS) as Array<keyof IRequestInfoFieldsInput>)
    .filter(field => before[field] !== after[field])
    .map(field => REQUEST_INFO_FIELD_LABELS[field]);
}
