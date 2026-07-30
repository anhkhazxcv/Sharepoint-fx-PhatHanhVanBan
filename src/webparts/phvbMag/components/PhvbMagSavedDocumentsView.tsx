import * as React from 'react';
import { useEffect } from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type {
  IBanHanhLibraryItem,
  IPhvbDocumentContext,
  ISavedDocumentDisplayItem
} from '../models/PhvbMag.models';
import { usePhvbSavedDocuments } from '../context/PhvbMagSavedDocuments.context';
import { formatBanHanhDate } from '../utils/PhvbMagBanHanh.tree';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagLibraryListPageShell } from './PhvbMagLibraryListPageShell';
import { PhvbMagSaveBookmarkButton } from './PhvbMagSaveBookmarkButton';
import styles from './PhvbMag.module.scss';

interface IPhvbMagSavedDocumentsViewProps {
  documentContext: IPhvbDocumentContext;
}

function buildFallbackDocument(bookmark: ISavedDocumentDisplayItem['bookmark']): IBanHanhLibraryItem {
  return {
    id: bookmark.libraryItemId,
    name: bookmark.title || 'Văn bản đã lưu',
    fileDirRef: bookmark.fileDirRef,
    fsObjType: 0,
    fileRef: bookmark.fileRef,
    fileUrl: bookmark.fileRef,
    uniqueId: bookmark.uniqueId
  };
}

function SavedDocumentCard(props: { item: ISavedDocumentDisplayItem }): React.ReactElement {
  const { item } = props;
  const savedAt = formatBanHanhDate(item.bookmark.created) || 'Chưa xác định';

  if (!item.isAccessible || !item.document) {
    const fallbackDocument = buildFallbackDocument(item.bookmark);

    return (
      <article className={[styles.libraryDocumentItem, styles.savedDocumentItemUnavailable].join(' ')}>
        <div className={styles.libraryDocumentContent}>
          <div className={styles.libraryDocumentTitleRow}>
            <span className={styles.libraryDocumentTitle}>{item.bookmark.title || 'Văn bản đã lưu'}</span>
            <div className={styles.libraryDocumentStatusGroup}>
              <PhvbMagSaveBookmarkButton document={fallbackDocument} />
            </div>
          </div>
          <p className={styles.libraryDocumentSummary}>Không còn truy cập được văn bản này.</p>
          <div className={styles.libraryDocumentMeta}>
            <span className={styles.libraryDocumentEffectiveDate}>
              <strong>Đã lưu:</strong> {savedAt}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <PhvbMagLibraryDocumentCard
      document={item.document}
      showDownload
      showBookmark
      metaContent={(
        <>
          <span className={styles.libraryDocumentEffectiveDate}>
            <strong>Đã lưu:</strong> {savedAt}
          </span>
          {item.bookmark.notes ? (
            <span className={styles.libraryDocumentContact}>
              <strong>Ghi chú:</strong> {item.bookmark.notes}
            </span>
          ) : null}
        </>
      )}
    />
  );
}

export function PhvbMagSavedDocumentsView(props: IPhvbMagSavedDocumentsViewProps): React.ReactElement {
  const { loadSavedView, savedCount, isLoadingSavedView, errorMessage, savedDisplayItems } = usePhvbSavedDocuments();

  useEffect(() => {
    loadSavedView().catch(() => undefined);
  }, [loadSavedView]);

  return (
    <PhvbMagLibraryListPageShell
      eyebrow="Thư viện"
      title={TAB_LABELS.DaLuu}
      subtitle="Văn bản bạn đã đánh dấu"
      count={savedCount}
      isLoading={isLoadingSavedView}
      loadingMessage="Đang tải văn bản đã lưu..."
      errorMessage={errorMessage}
      isEmpty={savedDisplayItems.length === 0}
      emptyMessage="Chưa lưu văn bản nào. Hãy mở Thư viện tài liệu hoặc Mới ban hành để đánh dấu văn bản."
    >
      <div className={[styles.recentSectionList, styles.savedDocumentList].join(' ')}>
        {savedDisplayItems.map((item: ISavedDocumentDisplayItem) => (
          <SavedDocumentCard key={item.bookmark.id} item={item} />
        ))}
      </div>
    </PhvbMagLibraryListPageShell>
  );
}
