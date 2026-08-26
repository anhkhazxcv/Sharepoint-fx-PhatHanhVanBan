const DEFAULT_JOIN_LIMIT = 5;
const DEFAULT_MORE_LABEL = 'mục khác';

const HTML_TAG_REGEX = /<[^>]*>/g;
const MULTI_BLANK_LINE_REGEX = /\n{3,}/g;
const MAX_USER_NOIDUNG_LENGTH = 2000;

export interface IJoinWithLimitOptions {
  max?: number;
  /** Danh từ số nhiều dùng trong hậu tố "và N ...", ví dụ 'tệp khác', 'người khác'. */
  moreLabel?: string;
}

/**
 * Nối danh sách bằng ', ', rút gọn khi vượt quá `max` phần tử:
 * "a, b, c, d, e và 12 tệp khác".
 */
export function joinWithLimit(items: ReadonlyArray<string>, options?: IJoinWithLimitOptions): string {
  const max = options?.max ?? DEFAULT_JOIN_LIMIT;
  const moreLabel = options?.moreLabel ?? DEFAULT_MORE_LABEL;
  const normalized = items.map(item => item.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return '';
  }

  if (normalized.length <= max) {
    return normalized.join(', ');
  }

  const shown = normalized.slice(0, max);
  const remaining = normalized.length - max;
  return `${shown.join(', ')} và ${remaining} ${moreLabel}`;
}

export interface INamedAttachmentLike {
  name?: string;
  id?: number | string;
}

/**
 * Danh sách tên hiển thị cho log Thêm/Xoá tài liệu — dùng chung cho cả File[]
 * (chọn mới, luôn có `.name`) và IAttachmentLibraryItem[] (đã có trên list,
 * fallback "ID {id}" nếu thiếu tên). Nguồn duy nhất, thay cho 2 cách build
 * tên tệp độc lập trước đây (PhvbMag.service.ts và usePhvbDetailDocuments.ts).
 */
export function resolveAttachmentDisplayNames(items: ReadonlyArray<INamedAttachmentLike>): string[] {
  return items.map(item => item.name || (item.id !== undefined ? `ID ${item.id}` : ''));
}

/**
 * Chuẩn hoá NoiDung do người dùng gõ (bình luận, ý kiến, lý do từ chối...):
 * bỏ thẻ HTML, gộp dòng trống liên tiếp, cắt ở 2000 ký tự kèm "…" nếu bị cắt.
 */
export function sanitizeUserNoiDung(text: string): string {
  const withoutHtml = (text || '').replace(HTML_TAG_REGEX, '');
  const collapsed = withoutHtml
    .replace(/\r\n/g, '\n')
    .replace(MULTI_BLANK_LINE_REGEX, '\n\n')
    .trim();

  if (collapsed.length <= MAX_USER_NOIDUNG_LENGTH) {
    return collapsed;
  }

  return `${collapsed.substring(0, MAX_USER_NOIDUNG_LENGTH)}…`;
}
