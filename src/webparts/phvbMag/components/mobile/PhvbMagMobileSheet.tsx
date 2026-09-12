import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CloseIcon } from '../PhvbMagIcons';
import styles from '../PhvbMag.module.scss';

/** Kéo xuống quá ngưỡng này (px) thì coi như người dùng muốn đóng sheet. */
const SHEET_DISMISS_DRAG_PX = 90;

interface IPhvbMagMobileSheetProps {
  isOpen: boolean;
  title: React.ReactNode;
  titleId?: string;
  children: React.ReactNode;
  onDismiss: () => void;
}

/**
 * Bottom sheet cho mobile. Dùng để chứa nội dung mà desktop đặt ở rail phải
 * (bình luận + nhật ký) hoặc nhóm hành động phụ.
 *
 * Cố ý KHÔNG dùng primitives/PhvbMagDialog: sheet neo đáy, có grabber kéo để
 * đóng, và bắt Escape — khác hợp đồng của dialog canh giữa.
 */
export function PhvbMagMobileSheet(
  props: IPhvbMagMobileSheetProps
): React.ReactElement {
  const { isOpen, title, titleId, children, onDismiss } = props;
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartYRef = useRef<number | undefined>(undefined);
  const resolvedTitleId = titleId || 'phvb-mobile-sheet-title';

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  // Sheet đóng lại thì bỏ luôn offset kéo dở, tránh lần mở sau bị lệch.
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      dragStartYRef.current = undefined;
    }
  }, [isOpen]);

  const handlePointerDown = useCallback((event: React.PointerEvent): void => {
    dragStartYRef.current = event.clientY;
    setDragOffset(0);
  }, []);

  const handlePointerMove = useCallback((event: React.PointerEvent): void => {
    const startY = dragStartYRef.current;

    if (startY === undefined) {
      return;
    }

    // Chỉ cho kéo xuống; kéo lên không làm sheet cao hơn max-height.
    setDragOffset(Math.max(0, event.clientY - startY));
  }, []);

  const handlePointerUp = useCallback((): void => {
    const shouldDismiss = dragOffset > SHEET_DISMISS_DRAG_PX;

    dragStartYRef.current = undefined;
    setDragOffset(0);

    if (shouldDismiss) {
      onDismiss();
    }
  }, [dragOffset, onDismiss]);

  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className={styles.mobileSheetOverlay}
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className={styles.mobileSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
        onClick={event => event.stopPropagation()}
      >
        <div
          className={styles.mobileSheetGrabber}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="presentation"
        />

        <div className={styles.mobileSheetHeader}>
          <h3 id={resolvedTitleId}>{title}</h3>
          <button
            type="button"
            className={styles.mobileAppBarButton}
            onClick={onDismiss}
            aria-label="Đóng"
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.mobileSheetBody}>{children}</div>
      </div>
    </div>
  );
}
