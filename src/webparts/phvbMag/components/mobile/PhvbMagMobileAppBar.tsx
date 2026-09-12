import * as React from 'react';
import styles from '../PhvbMag.module.scss';
import { MobileBackIcon, MobileCommentIcon, MobileMoreIcon } from '../PhvbMagIcons';

interface IPhvbMagMobileAppBarProps {
  title: string;
  /** Có nút back (màn chi tiết) hay không (màn danh sách). */
  onBack?: () => void;
  /** Mở bottom sheet bình luận + nhật ký. */
  onOpenComments?: () => void;
  commentCount?: number;
  /** Mở sheet các hành động phụ không đủ chỗ ở sticky footer. */
  onOpenOverflow?: () => void;
  hasOverflowActions?: boolean;
}

export function PhvbMagMobileAppBar(
  props: IPhvbMagMobileAppBarProps
): React.ReactElement {
  const {
    title,
    onBack,
    onOpenComments,
    commentCount = 0,
    onOpenOverflow,
    hasOverflowActions = false
  } = props;

  return (
    <header className={styles.mobileAppBar}>
      {onBack ? (
        <button
          type="button"
          className={styles.mobileAppBarButton}
          onClick={onBack}
          aria-label="Quay lại"
        >
          <MobileBackIcon />
        </button>
      ) : null}

      <h2 className={styles.mobileAppBarTitle} title={title}>
        {title}
      </h2>

      {onOpenComments ? (
        <button
          type="button"
          className={styles.mobileAppBarButton}
          onClick={onOpenComments}
          aria-label={
            commentCount > 0
              ? `Bình luận và hoạt động (${commentCount})`
              : 'Bình luận và hoạt động'
          }
        >
          <MobileCommentIcon />
          {commentCount > 0 ? (
            <span className={styles.mobileAppBarBadge}>
              {commentCount > 99 ? '99+' : commentCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {onOpenOverflow && hasOverflowActions ? (
        <button
          type="button"
          className={styles.mobileAppBarButton}
          onClick={onOpenOverflow}
          aria-label="Hành động khác"
        >
          <MobileMoreIcon />
        </button>
      ) : null}
    </header>
  );
}
