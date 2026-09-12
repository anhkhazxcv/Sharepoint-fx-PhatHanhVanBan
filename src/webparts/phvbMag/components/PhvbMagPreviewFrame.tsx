import * as React from 'react';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagSkeleton } from './PhvbMagSkeleton';
import styles from './PhvbMag.module.scss';

/** Embedded viewers fail silently — no onError fires — so fall back on a timer. */
const PREVIEW_LOAD_TIMEOUT_MS = 15000;

export interface IPhvbMagPreviewFrameProps {
  /** URL thử trước. Không có URL nào = coi như hỏng ngay, hiện luôn panel lỗi. */
  attemptUrl?: string;
  /** Lần thử thứ hai, chỉ dùng khi lần đầu không bao giờ fire load. */
  fallbackUrl?: string;
  /** title của iframe — screen reader đọc cái này. */
  title: string;
  /** Thông báo khi mọi lần thử đều thất bại. */
  errorMessage: string;
  /** Lối thoát dưới thông báo lỗi (mở ở tab mới, tải xuống...). */
  errorActions?: React.ReactNode;
  className?: string;
}

/**
 * Khung xem trước dùng chung: skeleton khi tải, chuỗi thử URL, panel lỗi.
 * Tách khỏi PhvbMagDocumentPreview để màn Hướng dẫn (chỉ có mỗi URL PDF, không
 * có bản ghi thư viện) hưởng cùng hành vi mà không phải dựng item giả.
 */
export function PhvbMagPreviewFrame(props: IPhvbMagPreviewFrameProps): React.ReactElement {
  const { attemptUrl, fallbackUrl, title, errorMessage, errorActions, className } = props;

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [hasLoadFailed, setHasLoadFailed] = React.useState<boolean>(false);
  const [isUsingFallback, setIsUsingFallback] = React.useState<boolean>(false);

  const previewUrl = isUsingFallback ? fallbackUrl : attemptUrl;

  // Reset the load state whenever the previewed document changes.
  React.useEffect(() => {
    setIsUsingFallback(false);
    setIsLoading(Boolean(attemptUrl));
    setHasLoadFailed(!attemptUrl);
  }, [attemptUrl]);

  // Chuỗi fallback chỉ cứu được trường hợp iframe KHÔNG BAO GIỜ fire load. Khi
  // SharePoint trả trang "không xem trước được", đó vẫn là một document tải
  // thành công nên onLoad fire y hệt lúc render đúng — không có cách nào phân
  // biệt hai ca đó từ ngoài iframe. Vì vậy timer buộc phải chết theo onLoad:
  // giữ nó sống sẽ tráo URL và phá luôn những preview đang chạy tốt.
  React.useEffect(() => {
    if (!isLoading || !previewUrl) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (!isUsingFallback && fallbackUrl) {
        setIsUsingFallback(true);
        return;
      }

      setIsLoading(false);
      setHasLoadFailed(true);
    }, PREVIEW_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, previewUrl, isUsingFallback, fallbackUrl]);

  return (
    <div className={[styles.previewBody, className].filter(Boolean).join(' ')}>
      {isLoading ? (
        <div className={styles.previewLoading}>
          <PhvbMagSkeleton variant="card" count={1} />
        </div>
      ) : null}

      {hasLoadFailed ? (
        <div className={styles.previewFallback}>
          <PhvbMagEmptyState message={errorMessage} />
          {errorActions ? (
            <div className={styles.previewFallbackActions}>{errorActions}</div>
          ) : null}
        </div>
      ) : null}

      {previewUrl && !hasLoadFailed ? (
        <iframe
          key={previewUrl}
          className={styles.previewFrame}
          src={previewUrl}
          title={title}
          onLoad={() => setIsLoading(false)}
        />
      ) : null}
    </div>
  );
}
