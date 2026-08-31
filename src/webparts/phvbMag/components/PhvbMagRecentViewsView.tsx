import * as React from 'react';
import { useEffect } from 'react';
import { DOCUMENT_COUNT_SUFFIX, RECENT_VIEWS_TOP, TAB_LABELS } from '../config/PhvbMag.configuration';
import type {
  IPhvbDocumentContext,
  IRecentViewDisplayItem
} from '../models/PhvbMag.models';
import { usePhvbRecentViews } from '../context/PhvbMagRecentViews.context';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagLibraryListPageShell } from './PhvbMagLibraryListPageShell';
import { PhvbMagLibraryPagedList } from './PhvbMagLibraryPagedList';
import styles from './PhvbMag.module.scss';

interface IPhvbMagRecentViewsViewProps {
  documentContext: IPhvbDocumentContext;
}

function RecentViewCard(props: { item: IRecentViewDisplayItem }): React.ReactElement {
  const { item } = props;
  const viewedAt = formatExecutionDateTime(item.recentView.modified) || 'Chưa xác định';

  if (!item.isAccessible || !item.document) {
    return (
      <article className={[styles.libraryDocumentItem, styles.savedDocumentItemUnavailable].join(' ')}>
        <div className={styles.libraryDocumentContent}>
          <div className={styles.libraryDocumentTitleRow}>
            <span className={styles.libraryDocumentTitle}>{item.recentView.title || 'Văn bản đã xem'}</span>
          </div>
          <p className={styles.libraryDocumentSummary}>Không còn truy cập được văn bản này.</p>
          <div className={styles.libraryDocumentMeta}>
            <span className={styles.libraryDocumentTimestamp}>
              <strong>Đã xem:</strong> {viewedAt}
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
        <span className={styles.libraryDocumentTimestamp}>
          <strong>Đã xem:</strong> {viewedAt}
        </span>
      )}
    />
  );
}

export function PhvbMagRecentViewsView(props: IPhvbMagRecentViewsViewProps): React.ReactElement {
  const { loadRecentView, recentCount, isLoadingRecentView, errorMessage, recentDisplayItems } = usePhvbRecentViews();

  useEffect(() => {
    loadRecentView().catch(() => undefined);
  }, [loadRecentView]);

  return (
    <PhvbMagLibraryListPageShell
      eyebrow="Thư viện"
      title={TAB_LABELS.XemGanDay}
      subtitle={`Danh sách các văn bản đã xem gần đây. Hệ thống hiển thị tối đa ${RECENT_VIEWS_TOP} văn bản được truy cập gần nhất.`}
      count={recentCount}
      countSuffix={DOCUMENT_COUNT_SUFFIX}
      isLoading={isLoadingRecentView}
      loadingMessage="Đang tải văn bản xem gần đây..."
      errorMessage={errorMessage}
      isEmpty={recentDisplayItems.length === 0}
      emptyMessage="Chưa có văn bản nào được xem. Hãy mở Thư viện tài liệu để bắt đầu."
    >
      <PhvbMagLibraryPagedList
        items={recentDisplayItems}
        resetDeps={[recentDisplayItems.length]}
        listClassName={styles.savedDocumentList}
        getItemKey={item => item.recentView.id}
        renderItem={item => <RecentViewCard item={item} />}
        onReload={() => {
          loadRecentView().catch(() => undefined);
        }}
      />
    </PhvbMagLibraryListPageShell>
  );
}
