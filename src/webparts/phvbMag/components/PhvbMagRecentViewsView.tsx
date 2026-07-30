import * as React from 'react';
import { useEffect } from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type {
  IPhvbDocumentContext,
  IRecentViewDisplayItem
} from '../models/PhvbMag.models';
import { usePhvbRecentViews } from '../context/PhvbMagRecentViews.context';
import { formatBanHanhDate } from '../utils/PhvbMagBanHanh.tree';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagLibraryListPageShell } from './PhvbMagLibraryListPageShell';
import styles from './PhvbMag.module.scss';

interface IPhvbMagRecentViewsViewProps {
  documentContext: IPhvbDocumentContext;
}

function RecentViewCard(props: { item: IRecentViewDisplayItem }): React.ReactElement {
  const { item } = props;
  const viewedAt = formatBanHanhDate(item.recentView.modified) || 'Chưa xác định';

  if (!item.isAccessible || !item.document) {
    return (
      <article className={[styles.libraryDocumentItem, styles.savedDocumentItemUnavailable].join(' ')}>
        <div className={styles.libraryDocumentContent}>
          <div className={styles.libraryDocumentTitleRow}>
            <span className={styles.libraryDocumentTitle}>{item.recentView.title || 'Văn bản đã xem'}</span>
          </div>
          <p className={styles.libraryDocumentSummary}>Không còn truy cập được văn bản này.</p>
          <div className={styles.libraryDocumentMeta}>
            <span className={styles.libraryDocumentEffectiveDate}>
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
        <span className={styles.libraryDocumentEffectiveDate}>
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
      subtitle="Văn bản bạn đã mở gần đây"
      count={recentCount}
      isLoading={isLoadingRecentView}
      loadingMessage="Đang tải văn bản xem gần đây..."
      errorMessage={errorMessage}
      isEmpty={recentDisplayItems.length === 0}
      emptyMessage="Chưa có văn bản nào được xem. Hãy mở Thư viện tài liệu để bắt đầu."
    >
      <div className={[styles.recentSectionList, styles.savedDocumentList].join(' ')}>
        {recentDisplayItems.map((item: IRecentViewDisplayItem) => (
          <RecentViewCard key={item.recentView.id} item={item} />
        ))}
      </div>
    </PhvbMagLibraryListPageShell>
  );
}
