import {
  BAN_HANH_MAIL_LABELS,
  BAN_HANH_NOTIFY_DEFAULTS
} from '../config/PhvbMag.configuration';
import { parseExecutionDateTime } from './PhvbMagDateTime.utils';
import type {
  IBanHanhNotifyDraft,
  ILabelCustomConfigItem,
  IMailBanHanhConfigItem,
  IVanBanItem
} from '../models/PhvbMag.models';

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function formatDateVi(value?: string): string {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return (value || '').trim();
  }

  return `${pad2(parsed.getDate())}/${pad2(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

/* Tạm tắt — dùng cho nội dung tiếng Anh
function formatDateEn(value?: string): string {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return (value || '').trim();
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: '2-digit'
  });
}
*/

export function resolveHanhDong(loaiYeuCau?: string): string {
  const type = (loaiYeuCau || '').trim();

  switch (type) {
    case 'Viết mới':
      return 'ban hành';
    case 'Điều chỉnh':
      return 'điều chỉnh';
    case 'Thu hồi':
      return 'thu hồi';
    default:
      return 'ban hành';
  }
}

export function resolveBanHanhSubjectPrefix(loaiYeuCau?: string): string {
  const type = (loaiYeuCau || '').trim();

  switch (type) {
    case 'Viết mới':
      return 'Thông báo ban hành văn bản mới';
    case 'Điều chỉnh':
      return 'Thông báo điều chỉnh văn bản';
    default:
      return `Thông báo theo ${type || 'yêu cầu'}`;
  }
}

export function resolveRecipientEmail(
  thuMucBanHanh: string | undefined,
  mailConfig: ReadonlyArray<IMailBanHanhConfigItem>
): string {
  const folderPath = (thuMucBanHanh || '').trim();

  if (!folderPath || mailConfig.length === 0) {
    return '';
  }

  const priorityFolder = BAN_HANH_NOTIFY_DEFAULTS.PRIORITY_FOLDER.trim();

  if (folderPath.indexOf(priorityFolder) > -1) {
    let priorityMatch: IMailBanHanhConfigItem | undefined;

    for (let index = 0; index < mailConfig.length; index += 1) {
      const item = mailConfig[index];
      const folder = item.folder.trim();

      if (folder === priorityFolder) {
        priorityMatch = item;
        break;
      }

      if (!priorityMatch && folder.indexOf(priorityFolder) > -1 && folderPath.indexOf(folder) > -1) {
        priorityMatch = item;
      }
    }

    if (priorityMatch) {
      return priorityMatch.email.trim();
    }
  }

  let bestMatch: IMailBanHanhConfigItem | undefined;
  let bestLength = -1;

  mailConfig.forEach(item => {
    const folder = item.folder.trim();

    if (!folder || folderPath.indexOf(folder) < 0) {
      return;
    }

    if (folder.length > bestLength) {
      bestMatch = item;
      bestLength = folder.length;
    }
  });

  return bestMatch ? bestMatch.email.trim() : '';
}

export function buildBanHanhSubject(release: IVanBanItem): string {
  const prefix = resolveBanHanhSubjectPrefix(release.LoaiYeuCau);
  const titleVi = (release.Tenvanban || '').trim();
  const titleEn = (release.TenVanBan_ENG || '').trim();

  if (!titleEn) {
    return `${prefix} ${titleVi}`.trim();
  }

  return `${prefix} ${titleVi} / Announcement of ${titleEn} Issuance`.trim();
}

function getLabelValue(
  labelConfig: ReadonlyArray<ILabelCustomConfigItem>,
  labelKey: string
): string {
  const normalizedKey = labelKey.trim();

  for (let index = 0; index < labelConfig.length; index += 1) {
    const item = labelConfig[index];

    if (item.label.trim() === normalizedKey) {
      return item.value;
    }
  }

  return '';
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  let result = template;
  const tokenKeys = Object.keys(tokens);

  for (let index = 0; index < tokenKeys.length; index += 1) {
    const token = tokenKeys[index];

    // Skip link placeholders — keep token as-is for later update
    if (token === '{{LinkFile}}' || token === '{{LinkTatCaTaiLieu}}') {
      continue;
    }

    const value = tokens[token];
    let searchFrom = 0;
    let nextIndex = result.indexOf(token, searchFrom);

    while (nextIndex > -1) {
      result = `${result.substring(0, nextIndex)}${value}${result.substring(nextIndex + token.length)}`;
      searchFrom = nextIndex + value.length;
      nextIndex = result.indexOf(token, searchFrom);
    }
  }

  return result;
}

export function buildBanHanhNotifyBody(
  release: IVanBanItem,
  labelConfig: ReadonlyArray<ILabelCustomConfigItem>
): string {
  const titleVi = (release.Tenvanban || '').trim();
  const ngayHieuLucVi = formatDateVi(release.HieuLucTu);
  const hanhDong = resolveHanhDong(release.LoaiYeuCau);

  const vnTokens: Record<string, string> = {
    '{{TenVanBan_TV}}': titleVi,
    '{{HanhDong}}': hanhDong,
    '{{NgayHieuLuc}}': ngayHieuLucVi,
    '{{LinkFile}}': '{{LinkFile}}',
    '{{LinkTatCaTaiLieu}}': '{{LinkTatCaTaiLieu}}',
    '{{BoPhanGui_TV}}': BAN_HANH_NOTIFY_DEFAULTS.BO_PHAN_GUI_TV
  };

  const templateVn = getLabelValue(labelConfig, BAN_HANH_MAIL_LABELS.CONTENT_VN);
  const contentVn = replaceTokens(templateVn, vnTokens);
  return contentVn;

  /* Tạm tắt nội dung tiếng Anh
  const titleEn = (release.TenVanBan_ENG || '').trim();
  const ngayHieuLucEn = formatDateEn(release.HieuLucTu);

  if (!titleEn) {
    return contentVn;
  }

  const enTokens: Record<string, string> = {
    '{{TenVanBan_TV}}': titleVi,
    '{{TenVanBan_TA}}': titleEn,
    '{{NgayHieuLuc}}': ngayHieuLucVi,
    '{{NgayHieuLuc_EN}}': ngayHieuLucEn,
    '{{LinkFile}}': '{{LinkFile}}',
    '{{LinkTatCaTaiLieu}}': '{{LinkTatCaTaiLieu}}',
    '{{BoPhanGui_TV}}': BAN_HANH_NOTIFY_DEFAULTS.BO_PHAN_GUI_TV,
    '{{BoPhanGui_TA}}': BAN_HANH_NOTIFY_DEFAULTS.BO_PHAN_GUI_TA
  };

  const templateEn = getLabelValue(labelConfig, BAN_HANH_MAIL_LABELS.CONTENT_ENG);
  const contentEn = replaceTokens(templateEn, enTokens);

  if (!contentVn) {
    return contentEn;
  }

  if (!contentEn) {
    return contentVn;
  }

  return `${contentVn}<br/><br/>${contentEn}`;
  */
}

export function buildBanHanhNotifyDraft(
  release: IVanBanItem,
  mailConfig: ReadonlyArray<IMailBanHanhConfigItem>,
  labelConfig: ReadonlyArray<ILabelCustomConfigItem>
): IBanHanhNotifyDraft {
  const draft: IBanHanhNotifyDraft = {
    recipient: resolveRecipientEmail(release.ThuMucBanHanh, mailConfig),
    subject: buildBanHanhSubject(release),
    body: buildBanHanhNotifyBody(release, labelConfig)
  };

  return draft;
}

export function validateBanHanhNotifyDraft(draft: IBanHanhNotifyDraft): string | undefined {
  if (!(draft.recipient || '').trim()) {
    return 'Vui lòng nhập nơi nhận email.';
  }

  if (!(draft.subject || '').trim()) {
    return 'Vui lòng nhập tiêu đề email.';
  }

  if (!(draft.body || '').trim()) {
    return 'Vui lòng nhập nội dung email.';
  }

  return undefined;
}
