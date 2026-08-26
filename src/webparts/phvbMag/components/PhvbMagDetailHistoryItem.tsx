import * as React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LEGACY_TRANG_THAI_THUC_HIEN, TRANG_THAI_THUC_HIEN } from '../config/PhvbMag.configuration';
import type { ICommentAttachmentItem, ILichSuThucHienItem } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { getExecutionHistoryTone } from '../utils/PhvbMagStatusTone.utils';
import { getWorkflowStepDisplayInitials } from '../utils/PhvbMagWorkflowTimeline.utils';
import { usePhvbAvatarPhotoState } from '../hooks/usePhvbAvatarPhotoState';
import { PhvbMagExternalLink } from './PhvbMagExternalLink';
import styles from './PhvbMag.module.scss';

const HISTORY_STATUS_TONE_CLASS: Record<string, string> = {
  draft: styles.detailHistoryStatusDraft,
  info: styles.detailHistoryStatusInfo,
  warning: styles.detailHistoryStatusWarning,
  success: styles.detailHistoryStatusSuccess,
  error: styles.detailHistoryStatusError,
  archived: styles.detailHistoryStatusArchived
};

const HISTORY_STATUS_STAGE_CLASS: Record<string, string> = {
  [TRANG_THAI_THUC_HIEN.TAO_BAN_NHAP]: styles.detailHistoryStatusBanNhap,
  [TRANG_THAI_THUC_HIEN.CAP_NHAT_BAN_NHAP]: styles.detailHistoryStatusBanNhap,
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_GOP_Y]: styles.detailHistoryStatusDangGopY,
  [LEGACY_TRANG_THAI_THUC_HIEN.DONG_Y_GOP_Y]: styles.detailHistoryStatusDangGopY,
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_THAM_DINH]: styles.detailHistoryStatusDangThamDinh,
  [TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH]: styles.detailHistoryStatusDangThamDinh,
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_PHE_DUYET]: styles.detailHistoryStatusDangPheDuyet,
  [LEGACY_TRANG_THAI_THUC_HIEN.PHE_DUYET]: styles.detailHistoryStatusDangPheDuyet,
  [TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET]: styles.detailHistoryStatusDangPheDuyet,
  [TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO]: styles.detailHistoryStatusChoCapSo,
  [TRANG_THAI_THUC_HIEN.TU_CHOI_THAM_DINH]: styles.detailHistoryStatusTuChoiThamDinh,
  [TRANG_THAI_THUC_HIEN.TU_CHOI_PHE_DUYET]: styles.detailHistoryStatusTuChoiPheDuyet
};

function resolveHistoryStatusClassName(action: string): string {
  return HISTORY_STATUS_STAGE_CLASS[action] || HISTORY_STATUS_TONE_CLASS[getExecutionHistoryTone(action)];
}

interface IPhvbMagDetailHistoryItemProps {
  item: ILichSuThucHienItem;
  attachments?: ICommentAttachmentItem[];
  photoUrl?: string;
}

function measureContentOverflow(
  element: HTMLParagraphElement | undefined,
  collapsedClassName: string
): boolean {
  if (!element) {
    return false;
  }

  // Fast path: line-clamp often exposes overflow via scroll vs client height.
  if (element.scrollHeight > element.clientHeight + 1) {
    return true;
  }

  // Harden for browsers where -webkit-line-clamp keeps scrollHeight === clientHeight.
  const clampedHeight = element.getBoundingClientRect().height;
  const hadCollapsedClass = element.classList.contains(collapsedClassName);

  if (hadCollapsedClass) {
    element.classList.remove(collapsedClassName);
  }

  const fullHeight = element.scrollHeight;

  if (hadCollapsedClass) {
    element.classList.add(collapsedClassName);
  }

  return fullHeight > clampedHeight + 1;
}

export function PhvbMagDetailHistoryItem(props: IPhvbMagDetailHistoryItemProps): React.ReactElement {
  const { item, attachments, photoUrl } = props;
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [canExpand, setCanExpand] = useState<boolean>(false);
  const { showPhoto, onImageError } = usePhvbAvatarPhotoState(photoUrl);

  // Only collapse when content identity changes. Do not reset canExpand here —
  // useLayoutEffect owns that, and resetting after measure used to wipe it permanently.
  useEffect(() => {
    setIsExpanded(false);
  }, [item.Id, item.NoiDung]);

  useLayoutEffect(() => {
    if (!item.NoiDung) {
      setCanExpand(false);
      return;
    }

    // Keep toggle visible ("Ẩn bớt") while expanded; re-measure when collapsed.
    if (isExpanded) {
      return;
    }

    setCanExpand(
      measureContentOverflow(contentRef.current || undefined, styles.detailHistoryContentCollapsed)
    );
  }, [item.Id, item.NoiDung, isExpanded]);

  const handleToggleExpand = (): void => {
    setIsExpanded(previous => !previous);
  };

  return (
    <div className={styles.detailHistoryItem}>
      <div className={styles.detailHistoryHeader}>
        <span className={styles.detailHistoryAvatar}>
          {showPhoto ? (
            <img
              src={photoUrl}
              alt={item.User_ThucHien || 'Người dùng'}
              className={styles.detailHistoryAvatarImage}
              onError={onImageError}
            />
          ) : (
            <span aria-hidden="true">{getWorkflowStepDisplayInitials(item.User_ThucHien || '')}</span>
          )}
        </span>
        <strong className={styles.detailHistoryAuthorName} title={item.User_ThucHien || '---'}>
          {item.User_ThucHien || '---'}
        </strong>
        <span
          className={[
            styles.detailHistoryStatus,
            resolveHistoryStatusClassName(item.TrangThai_ThucHien || '')
          ].filter(Boolean).join(' ')}
        >
          {item.TrangThai_ThucHien || '---'}
        </span>
      </div>
      <span className={styles.detailHistoryDate}>
        {formatExecutionDateTime(item.Created)}
      </span>
      {item.NoiDung ? (
        <>
          <p
            ref={contentRef}
            title={!isExpanded && canExpand ? item.NoiDung : undefined}
            className={[
              styles.detailHistoryContent,
              !isExpanded ? styles.detailHistoryContentCollapsed : ''
            ].filter(Boolean).join(' ')}
          >
            {item.NoiDung}
          </p>
          {canExpand ? (
            <button
              type="button"
              className={styles.detailHistoryContentToggle}
              onClick={handleToggleExpand}
            >
              {isExpanded ? 'Ẩn bớt' : 'Xem thêm'}
            </button>
          ) : null}
        </>
      ) : null}
      {attachments && attachments.length > 0 ? (
        <ul className={styles.detailCommentAttachmentList}>
          {attachments.map(attachment => (
            <li key={attachment.id}>
              <PhvbMagExternalLink
                href={attachment.fileUrl}
                className={styles.detailCommentAttachmentLink}
              >
                {attachment.name}
              </PhvbMagExternalLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
