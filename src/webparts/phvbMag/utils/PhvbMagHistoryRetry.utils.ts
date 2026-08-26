import { SharePointRequestError } from '../services/PhvbMag.error';

export const HISTORY_RETRY_DELAYS_MS: ReadonlyArray<number> = [1000, 3000, 9000];

export const HISTORY_WRITE_WARNING_MESSAGE =
  'Thao tác đã lưu nhưng chưa ghi được lịch sử, hệ thống đang thử lại.';

export const HISTORY_QUEUE_KEY_PREFIX = 'phvb_history_queue_';

/**
 * Delay cho lần retry `attemptIndex` (0 = retry thứ nhất sau lần ghi đầu).
 * 429/503 tôn trọng Retry-After nếu có; các lỗi khác dùng 1s / 3s / 9s.
 * Trả undefined khi hết lượt retry.
 */
export function resolveHistoryRetryDelayMs(error: unknown, attemptIndex: number): number | undefined {
  if (attemptIndex < 0 || attemptIndex >= HISTORY_RETRY_DELAYS_MS.length) {
    return undefined;
  }

  const fallbackMs = HISTORY_RETRY_DELAYS_MS[attemptIndex];

  if (
    error instanceof SharePointRequestError
    && (error.status === 429 || error.status === 503)
    && typeof error.retryAfterSeconds === 'number'
    && error.retryAfterSeconds > 0
  ) {
    return error.retryAfterSeconds * 1000;
  }

  return fallbackMs;
}

export function waitHistoryRetry(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}
