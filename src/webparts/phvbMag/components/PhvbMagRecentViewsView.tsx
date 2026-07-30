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
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
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
    <div className={styles.recentView}>
      <header className={styles.recentHeader}>
        <div className={styles.pageHeading}>
          <span className={styles.pageEyebrow}>Thư viện</span>
          <h2>{TAB_LABELS.XemGanDay}</h2>
          <p className={styles.recentSubtitle}>Văn bản bạn đã mở gần đây</p>
        </div>
        {recentCount > 0 ? (
          <span className={styles.recentSectionCount}>{recentCount}</span>
        ) : null}
      </header>

      <div className={styles.recentBody}>
        <PhvbMagLoadingOverlay
          isOpen={isLoadingRecentView}
          message="Đang tải văn bản xem gần đây..."
        />

        {!isLoadingRecentView && errorMessage ? (
          <div className={styles.recentEmptyState} role="alert">
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {!isLoadingRecentView && !errorMessage && recentDisplayItems.length === 0 ? (
          <div className={styles.recentEmptyState}>
            <p>Chưa có văn bản nào được xem. Hãy mở Thư viện tài liệu để bắt đầu.</p>
          </div>
        ) : null}

        {!isLoadingRecentView && !errorMessage && recentDisplayItems.length > 0 ? (
          <div className={[styles.recentSectionList, styles.savedDocumentList].join(' ')}>
            {recentDisplayItems.map((item: IRecentViewDisplayItem) => (
              <RecentViewCard key={item.recentView.id} item={item} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
