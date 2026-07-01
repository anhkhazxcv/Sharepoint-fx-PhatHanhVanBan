import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT,
  DETAIL_PANEL_EXPANDED_VISIBLE_COUNT,
  DRAFT_DOCUMENT_ACCEPT
} from '../config/PhvbMag.configuration';
import type { ICommentWithAttachments } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { DeleteFileIcon, UploadDocumentIcon } from './PhvbMagIcons';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailActivityFeedProps {
  comments: ICommentWithAttachments[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  selectedFiles: File[];
  isSaving?: boolean;
  errorMessage?: string;
  onAddFiles: (files: FileList | File[]) => string | undefined;
  onRemoveFile: (fileIndex: number) => void;
  onSubmitComment: (text: string) => Promise<boolean>;
}

const COMMENT_TRUNCATE_MIN_LENGTH = 120;

function isEditRequestComment(item: ICommentWithAttachments): boolean {
  const status = (item.TrangThai_ThucHien || '').toLowerCase();
  const content = (item.NoiDung || '').toLowerCase();
  return status.indexOf('chỉnh sửa') > -1 || status.indexOf('chinh sua') > -1 || content.indexOf('yêu cầu chỉnh sửa') > -1;
}

function getCommentText(item: ICommentWithAttachments): string {
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
  item: ICommentWithAttachments;
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

      {item.attachments.length > 0 ? (
        <ul className={styles.detailCommentAttachmentList}>
          {item.attachments.map(attachment => (
            <li key={attachment.id}>
              {attachment.fileUrl ? (
                <a
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.detailCommentAttachmentLink}
                >
                  {attachment.name}
                </a>
              ) : (
                <span>{attachment.name}</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

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

interface IActivityCommentComposerProps {
  selectedFiles: File[];
  isSaving?: boolean;
  errorMessage?: string;
  onAddFiles: (files: FileList | File[]) => string | undefined;
  onRemoveFile: (fileIndex: number) => void;
  onSubmitComment: (text: string) => Promise<boolean>;
}

function ActivityCommentComposer(props: IActivityCommentComposerProps): React.ReactElement {
  const {
    selectedFiles,
    isSaving,
    errorMessage,
    onAddFiles,
    onRemoveFile,
    onSubmitComment
  } = props;
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSubmit = commentText.trim().length > 0 && !isSaving;

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (event.target.files && event.target.files.length > 0) {
      onAddFiles(event.target.files);
    }

    event.target.value = '';
  };

  const handleSubmit = async (): Promise<void> => {
    const succeeded = await onSubmitComment(commentText);

    if (succeeded) {
      setCommentText('');
    }
  };

  return (
    <div className={styles.detailCommentComposer}>
      <textarea
        placeholder="Viết bình luận..."
        rows={3}
        value={commentText}
        disabled={isSaving}
        onChange={event => setCommentText(event.target.value)}
      />

      <div className={styles.detailCommentFilePicker}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={DRAFT_DOCUMENT_ACCEPT}
          className={styles.detailCommentFileInput}
          disabled={isSaving}
          onChange={handleFileInputChange}
        />
        <button
          type="button"
          className={styles.detailCommentAttachBtn}
          disabled={isSaving}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadDocumentIcon style={{ width: 18, height: 18 }} />
          Đính kèm file
        </button>
      </div>

      {selectedFiles.length > 0 ? (
        <ul className={styles.detailCommentFileList}>
          {selectedFiles.map((file, fileIndex) => (
            <li key={`${file.name}-${fileIndex}`} className={styles.detailCommentFileChip}>
              <span className={styles.detailCommentFileName}>{file.name}</span>
              <button
                type="button"
                className={styles.detailCommentFileRemoveBtn}
                disabled={isSaving}
                aria-label={`Xóa file ${file.name}`}
                onClick={() => onRemoveFile(fileIndex)}
              >
                <DeleteFileIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {errorMessage ? (
        <p className={styles.detailCommentError} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className={styles.detailCommentActions}>
        <button
          type="button"
          className={canSubmit ? styles.detailCommentSubmitBtn : styles.detailCommentSubmitBtnDisabled}
          disabled={!canSubmit}
          onClick={() => {
            handleSubmit().catch(() => undefined);
          }}
        >
          {isSaving ? 'Đang gửi...' : 'Gửi'}
        </button>
      </div>
    </div>
  );
}

export function PhvbMagDetailActivityFeed(props: IPhvbMagDetailActivityFeedProps): React.ReactElement {
  const {
    comments,
    isExpanded,
    onExpandedChange,
    selectedFiles,
    isSaving,
    errorMessage,
    onAddFiles,
    onRemoveFile,
    onSubmitComment
  } = props;

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
      footer={(
        <ActivityCommentComposer
          selectedFiles={selectedFiles}
          isSaving={isSaving}
          errorMessage={errorMessage}
          onAddFiles={onAddFiles}
          onRemoveFile={onRemoveFile}
          onSubmitComment={onSubmitComment}
        />
      )}
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
