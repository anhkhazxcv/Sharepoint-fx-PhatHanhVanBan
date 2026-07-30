const CHECKOUT_LOCKED_PATTERN = /checked\s*out|checkout|locked|đang\s*chỉnh\s*sửa|423/i;

export const BAN_HANH_PUBLISH_TOAST_CHECKOUT =
  'Đang có người chỉnh sửa tài liệu. Vui lòng thử lại sau.';

export const BAN_HANH_PUBLISH_TOAST_GENERIC =
  'Không thể hoàn tất ban hành. Vui lòng liên hệ IT để hỗ trợ.';

export function mapBanHanhPublishToastError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '');
  const details =
    error && typeof error === 'object' && 'details' in error
      ? String((error as { details?: string }).details || '')
      : '';
  const combined = `${message}\n${details}`;

  if (CHECKOUT_LOCKED_PATTERN.test(combined)) {
    return BAN_HANH_PUBLISH_TOAST_CHECKOUT;
  }

  return BAN_HANH_PUBLISH_TOAST_GENERIC;
}

export function maskApiKeySuffix(apiKey: string): string {
  const normalized = (apiKey || '').trim();

  if (normalized.length <= 4) {
    return '****';
  }

  return `****${normalized.substring(normalized.length - 4)}`;
}
