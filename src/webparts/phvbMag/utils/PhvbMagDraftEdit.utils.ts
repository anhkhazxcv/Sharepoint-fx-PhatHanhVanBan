import { cloneDefaultRequestForm, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IAllUserWorkflowItem, ICreateRequestInput, IPhvbDirectoryUser, IVanBanItem } from '../models/PhvbMag.models';

const REQUEST_TYPE_VALUES: ReadonlyArray<ICreateRequestInput['requestType']> = ['Viết mới', 'Điều chỉnh', 'Thu hồi'];

export function isDraftStatus(status?: string): boolean {
  return (status || '').trim() === REQUEST_STATUS.BAN_NHAP;
}

export function parseSemicolonSeparatedValues(value?: string): string[] {
  if (!value || !value.trim()) {
    return [];
  }

  return value
    .split(';')
    .map(entry => entry.trim())
    .filter(entry => Boolean(entry));
}

export function resolveParticipantEmails(
  value?: string,
  directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>
): string[] {
  const tokens = parseSemicolonSeparatedValues(value);
  const resolved: string[] = [];

  tokens.forEach(token => {
    if (token.indexOf('@') > -1) {
      if (resolved.indexOf(token) === -1) {
        resolved.push(token);
      }
      return;
    }

    if (!directoryUsers) {
      if (resolved.indexOf(token) === -1) {
        resolved.push(token);
      }
      return;
    }

    const matchedUser = directoryUsers.filter(user => user.displayName === token)[0];
    const email = matchedUser ? matchedUser.email : token;

    if (resolved.indexOf(email) === -1) {
      resolved.push(email);
    }
  });

  return resolved;
}

export function collectEmailsFromAllUserItems(items: IAllUserWorkflowItem[]): string[] {
  const emails: string[] = [];

  items.forEach(item => {
    const email = (item.Email_ThucHien || '').trim();
    if (email && emails.indexOf(email) === -1) {
      emails.push(email);
    }
  });

  return emails;
}

export function toInputDateValue(value?: string): string {
  const normalized = (value || '').trim();

  if (!normalized || normalized === 'Vô thời hạn') {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    return normalized.substring(0, 10);
  }

  const viMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (viMatch) {
    const day = viMatch[1].length === 1 ? `0${viMatch[1]}` : viMatch[1];
    const month = viMatch[2].length === 1 ? `0${viMatch[2]}` : viMatch[2];
    return `${viMatch[3]}-${month}-${day}`;
  }

  return normalized;
}

function resolveRequestType(value?: string): ICreateRequestInput['requestType'] {
  const normalized = (value || '').trim() as ICreateRequestInput['requestType'];
  return REQUEST_TYPE_VALUES.indexOf(normalized) > -1 ? normalized : 'Viết mới';
}

export interface IMapDraftFormOptions {
  release: IVanBanItem;
  gopYUsers: IAllUserWorkflowItem[];
  thamDinhUsers: IAllUserWorkflowItem[];
  pheDuyetUsers: IAllUserWorkflowItem[];
  directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>;
}

export function mapReleaseToCreateRequestInput(options: IMapDraftFormOptions): ICreateRequestInput {
  const { release, gopYUsers, thamDinhUsers, pheDuyetUsers, directoryUsers } = options;
  const folderPath = release.ThuMucBanHanh || '';

  const gopYEmails = collectEmailsFromAllUserItems(gopYUsers);
  const thamDinhEmails = collectEmailsFromAllUserItems(thamDinhUsers);
  const pheDuyetEmails = collectEmailsFromAllUserItems(pheDuyetUsers);

  return {
    ...cloneDefaultRequestForm(),
    title: release.Tenvanban || '',
    code: release.SoVanBan || '',
    type: 'Tiêu chuẩn',
    department: release.KhoaPhongNguoiTao || '',
    approvalUsers: pheDuyetEmails.length > 0
      ? pheDuyetEmails
      : resolveParticipantEmails(release.PheDuyet, directoryUsers),
    summary: release.TomTatNoiDung || '',
    contact: release.LienHe || '',
    folder: folderPath,
    folderLuuTru: folderPath,
    hieuLucTu: toInputDateValue(release.HieuLucTu),
    hieuLucDen: toInputDateValue(release.HieuLucDen),
    noiLuu: release.NoiLuuBanCung || '',
    requestType: resolveRequestType(release.LoaiYeuCau),
    titleEn: release.TenVanBan_ENG || '',
    taiLieuFiles: [],
    bieuMauFiles: [],
    loaiSla: release.Loai_SLA || cloneDefaultRequestForm().loaiSla,
    nguoiGopY: gopYEmails.length > 0
      ? gopYEmails
      : resolveParticipantEmails(release.NguoiGopY, directoryUsers),
    deadlineGopY: toInputDateValue(release.Date_GopY),
    nguoiThamDinh: thamDinhEmails.length > 0
      ? thamDinhEmails
      : resolveParticipantEmails(release.ThamDinh, directoryUsers),
    deadlineThamDinh: toInputDateValue(release.Date_ThamDinh),
    deadlinePheDuyet: toInputDateValue(release.Date_PheDuyet),
    ghiChuThamDinh: release.GhiChuChoThamDinh || '',
    isSendMailNotify: release.IsSendMailNotify === true
  };
}
