import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import type { MSGraphClientFactory } from '@microsoft/sp-http';
import { DRAFT_DOCUMENT_ACCEPT } from '../config/PhvbMag.configuration';
import type { ICommentWithAttachments, ILichSuThucHienItem } from '../models/PhvbMag.models';
import { parseExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { usePhvbUserPhotosByEmail } from '../hooks/usePhvbUserPhotosByEmail';
import { DeleteFileIcon, UploadDocumentIcon } from './PhvbMagIcons';
import { PhvbMagDetailHistoryItem } from './PhvbMagDetailHistoryItem';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

type ActivityFilter = 'all' | 'discussion' | 'activity';

type ActivityFeedItem =
  | { kind: 'discussion'; item: ICommentWithAttachments }
  | { kind: 'activity'; item: ICommentWithAttachments };

interface IPhvbMagDetailActivityFeedProps {
  msGraphClientFactory: MSGraphClientFactory;
  history: ICommentWithAttachments[];
  comments: ICommentWithAttachments[];
  selectedFiles: File[];
  isSaving?: boolean;
  errorMessage?: string;
  onAddFiles: (files: FileList | File[]) => string | undefined;
  onRemoveFile: (fileIndex: number) => void;
  onSubmitComment: (text: string) => Promise<boolean>;
}

const ACTIVITY_FILTERS: ReadonlyArray<{ key: ActivityFilter; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'discussion', label: 'Bình luận' },
  { key: 'activity', label: 'Nhật ký hoạt động' }
];

function getItemTimestamp(item: ILichSuThucHienItem): number {
  const createdRaw = (item.Created || '').trim();
  if (createdRaw) {
    const createdParsed = Date.parse(createdRaw);
    if (!isNaN(createdParsed)) {
      return createdParsed;
    }

    const createdDate = parseExecutionDateTime(createdRaw);
    if (createdDate) {
      return createdDate.getTime();
    }
  }

  return 0;
}

function getFilterButtonLabel(
  filter: { key: ActivityFilter; label: string },
  discussionCount: number,
  activityCount: number
): string {
  if (filter.key === 'discussion' && discussionCount > 0) {
    return `${filter.label} (${discussionCount})`;
  }

  if (filter.key === 'activity' && activityCount > 0) {
    return `${filter.label} (${activityCount})`;
  }

  return filter.label;
}

function getEmptyMessage(filter: ActivityFilter): string {
  switch (filter) {
    case 'discussion':
      return 'Chưa có trao đổi nào.';
    case 'activity':
      return 'Chưa có hoạt động nào.';
    default:
      return 'Chưa có trao đổi hoặc hoạt động nào.';
  }
}

interface IActivityFilterBarProps {
  activeFilter: ActivityFilter;
  discussionCount: number;
  activityCount: number;
  onChange: (filter: ActivityFilter) => void;
}

function ActivityFilterBar(props: IActivityFilterBarProps): React.ReactElement {
  const { activeFilter, discussionCount, activityCount, onChange } = props;

  return (
    <div className={styles.detailActivityFilterBar} role="tablist" aria-label="Lọc trao đổi và hoạt động">
      {ACTIVITY_FILTERS.map(filter => (
        <button
          key={filter.key}
          type="button"
          role="tab"
          aria-selected={activeFilter === filter.key}
          className={[
            styles.detailActivityFilterBtn,
            activeFilter === filter.key ? styles.detailActivityFilterBtnActive : ''
          ].filter(Boolean).join(' ')}
          onClick={() => onChange(filter.key)}
        >
          {getFilterButtonLabel(filter, discussionCount, activityCount)}
        </button>
      ))}
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const handleCommentKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter') {
      return;
    }

    if (event.altKey || event.shiftKey) {
      event.preventDefault();
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = `${commentText.slice(0, start)}\n${commentText.slice(end)}`;

      setCommentText(nextValue);

      window.requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
      });
      return;
    }

    event.preventDefault();

    if (canSubmit) {
      handleSubmit().catch(() => undefined);
    }
  };

  return (
    <div className={styles.detailCommentComposer}>
      <textarea
        ref={textareaRef}
        placeholder="Viết bình luận..."
        rows={3}
        value={commentText}
        disabled={isSaving}
        onChange={event => setCommentText(event.target.value)}
        onKeyDown={handleCommentKeyDown}
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
          Gửi
        </button>
      </div>
    </div>
  );
}

function renderFeedItem(
  entry: ActivityFeedItem,
  photosByEmail: Record<string, string | undefined>
): React.ReactElement {
  const photoUrl = entry.item.Email_ThucHien
    ? photosByEmail[entry.item.Email_ThucHien.trim().toLowerCase()]
    : undefined;

  return (
    <PhvbMagDetailHistoryItem
      key={`${entry.kind}-${entry.item.Id}`}
      item={entry.item}
      attachments={entry.item.attachments}
      photoUrl={photoUrl}
    />
  );
}

export function PhvbMagDetailActivityFeed(props: IPhvbMagDetailActivityFeedProps): React.ReactElement {
  const {
    msGraphClientFactory,
    history,
    comments,
    selectedFiles,
    isSaving,
    errorMessage,
    onAddFiles,
    onRemoveFile,
    onSubmitComment
  } = props;
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');

  const filteredItems = useMemo((): ActivityFeedItem[] => {
    let items: ActivityFeedItem[] = [];

    if (activeFilter === 'all' || activeFilter === 'discussion') {
      items = items.concat(comments.map(item => ({ kind: 'discussion' as const, item })));
    }

    if (activeFilter === 'all' || activeFilter === 'activity') {
      items = items.concat(history.map(item => ({ kind: 'activity' as const, item })));
    }

    return items.sort((left, right) => {
      const leftTime = getItemTimestamp(left.item);
      const rightTime = getItemTimestamp(right.item);

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return right.item.Id - left.item.Id;
    });
  }, [activeFilter, comments, history]);

  const totalCount = history.length + comments.length;

  const authorEmails = useMemo(
    () => history.concat(comments).map(item => item.Email_ThucHien),
    [history, comments]
  );
  const photosByEmail = usePhvbUserPhotosByEmail({ msGraphClientFactory, emails: authorEmails });

  return (
    <PhvbMagSidebarAccordion
      title="Bình luận & nhật ký hoạt động"
      badge={totalCount}
      fillHeight
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
        <ActivityFilterBar
          activeFilter={activeFilter}
          discussionCount={comments.length}
          activityCount={history.length}
          onChange={setActiveFilter}
        />

        <div className={styles.detailActivityFeed}>
          {filteredItems.length === 0 ? (
            <p className={styles.detailWorkflowEmpty}>{getEmptyMessage(activeFilter)}</p>
          ) : (
            filteredItems.map(entry => renderFeedItem(entry, photosByEmail))
          )}
        </div>
      </div>
    </PhvbMagSidebarAccordion>
  );
}
