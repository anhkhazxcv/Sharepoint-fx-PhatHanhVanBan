import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT,
  DETAIL_PANEL_EXPANDED_VISIBLE_COUNT
} from '../config/PhvbMag.configuration';
import type { ILichSuThucHienItem } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailActivityFeedProps {
  comments: ILichSuThucHienItem[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const COMMENT_TRUNCATE_MIN_LENGTH = 120;

function isEditRequestComment(item: ILichSuThucHienItem): boolean {
  const status = (item.TrangThai_ThucHien || '').toLowerCase();
  const content = (item.NoiDung || '').toLowerCase();
  return status.indexOf('chỉnh sửa') > -1 || status.indexOf('chinh sua') > -1 || content.indexOf('yêu cầu chỉnh sửa') > -1;
}

function getCommentText(item: ILichSuThucHienItem): string {
  return (item.NoiDung || item.TrangThai_ThucHien || '---').trim();
}

function getCommentInitials(name?: string): string {
  const normalized = (name || '').trim();
  if (!normalized) {
    return '?';
  }

  const parts = normalized.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 1).toUpperCase();
  }

  return `${parts[0].substring(0, 1)}${parts[parts.length - 1].substring(0, 1)}`.toUpperCase();
}

interface IActivityCommentItemProps {
  item: ILichSuThucHienItem;
}

function ActivityCommentItem(props: IActivityCommentItemProps): React.ReactElement {
  const { item } = props;
  const [isExpanded, setIsExpanded] = useState(false);
  const commentText = getCommentText(item);
  const shouldTruncate = commentText.length > COMMENT_TRUNCATE_MIN_LENGTH;

  return (
    <div className={styles.detailActivityItem}>
      <div className={styles.detailActivityAuthorRow}>
        <span className={styles.detailActivityAvatar} aria-hidden="true">
          {getCommentInitials(item.User_ThucHien)}
        </span>
        <div className={styles.detailActivityAuthorMeta}>
          <strong>{item.User_ThucHien || '---'}</strong>
          {item.Ngay_ThucHien ? (
            <span>{formatExecutionDateTime(item.Ngay_ThucHien)}</span>
          ) : null}
        </div>
      </div>

      <div
        className={[
          styles.detailActivityBubble,
          isEditRequestComment(item) ? styles.detailActivityBubbleEdit : styles.detailActivityBubbleDefault,
          shouldTruncate && !isExpanded ? styles.detailActivityBubbleClamped : ''
        ].filter(Boolean).join(' ')}
      >
        {commentText}
      </div>

      {shouldTruncate && !isExpanded ? (
        <button
          type="button"
          className={styles.detailActivityExpandTextBtn}
          onClick={() => setIsExpanded(true)}
        >
          Xem thêm
        </button>
      ) : null}
    </div>
  );
}

function ActivityCommentComposer(): React.ReactElement {
  return (
    <div className={styles.detailCommentComposer}>
      <textarea placeholder="Viết bình luận..." disabled rows={3} />
      <div className={styles.detailCommentActions}>
        <button type="button" disabled title="Sắp có">
          Gửi
        </button>
      </div>
    </div>
  );
}

export function PhvbMagDetailActivityFeed(props: IPhvbMagDetailActivityFeedProps): React.ReactElement {
  const { comments, isExpanded, onExpandedChange } = props;

  const sortedComments = useMemo(() => {
    return comments.slice().sort((left, right) => right.Id - left.Id);
  }, [comments]);

  const visibleComments = isExpanded
    ? sortedComments
    : sortedComments.slice(0, DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT);

  const hiddenCount = Math.max(0, sortedComments.length - visibleComments.length);
  const canExpand = sortedComments.length > DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT;

  return (
    <PhvbMagSidebarAccordion
      title="Trao đổi & hoạt động"
      badge={comments.length}
      defaultOpen
      footer={<ActivityCommentComposer />}
    >
      <div className={styles.detailActivityPanel}>
        <div className={styles.detailActivityCount}>
          {comments.length} hoạt động / bình luận
        </div>

        <div
          className={[
            styles.detailActivityFeed,
            isExpanded ? styles.detailActivityFeedExpanded : styles.detailActivityFeedCollapsed
          ].filter(Boolean).join(' ')}
        >
          {visibleComments.length === 0 ? (
            <p className={styles.detailWorkflowEmpty}>Chưa có trao đổi nào.</p>
          ) : (
            visibleComments.map(item => <ActivityCommentItem key={item.Id} item={item} />)
          )}
        </div>

        {hiddenCount > 0 && !isExpanded && canExpand ? (
          <button
            type="button"
            className={styles.detailSidebarExpandBtn}
            onClick={() => onExpandedChange(true)}
          >
            Xem tất cả hoạt động ({sortedComments.length})
          </button>
        ) : null}

        {isExpanded && sortedComments.length > DETAIL_PANEL_EXPANDED_VISIBLE_COUNT ? (
          <div className={styles.detailWorkflowSummaryMuted}>
            Cuộn để xem thêm {sortedComments.length - DETAIL_PANEL_EXPANDED_VISIBLE_COUNT} hoạt động
          </div>
        ) : null}

        {isExpanded && canExpand ? (
          <button
            type="button"
            className={styles.detailSidebarExpandBtnMuted}
            onClick={() => onExpandedChange(false)}
          >
            Thu gọn hoạt động
          </button>
        ) : null}
      </div>
    </PhvbMagSidebarAccordion>
  );
}
