import * as React from 'react';
import type { IBanHanhLibraryItem } from '../models/PhvbMag.models';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagSkeleton } from './PhvbMagSkeleton';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagHomeLibraryPreviewItem {
  key: string | number;
  title: string;
  dateLabel: string;
  document?: IBanHanhLibraryItem;
  isAccessible: boolean;
}

export interface IPhvbMagHomeLibraryPreviewColumnProps {
  icon: React.ReactNode;
  title: string;
  viewAllPath: string;
  emptyMessage: string;
  isLoading: boolean;
  items: IPhvbMagHomeLibraryPreviewItem[];
  onNavigate: (path: string) => void;
}

export function PhvbMagHomeLibraryPreviewColumn(props: IPhvbMagHomeLibraryPreviewColumnProps): React.ReactElement {
  const {
    icon,
    title,
    viewAllPath,
    emptyMessage,
    isLoading,
    items,
    onNavigate
  } = props;

  return (
    <div className={styles.homeLibraryPreviewColumn}>
      <header className={styles.homeSectionHeader}>
        <div className={styles.homeSectionTitleWrap}>
          {icon}
          <h2 className={styles.homeSectionTitle}>{title}</h2>
        </div>
        <button
          type="button"
          className={styles.homeSectionMore}
          onClick={() => onNavigate(viewAllPath)}
        >
          Xem tất cả →
        </button>
      </header>

      {isLoading ? (
        <PhvbMagSkeleton variant="card" count={3} />
      ) : null}

      {!isLoading && items.length === 0 ? (
        <PhvbMagEmptyState message={emptyMessage} />
      ) : null}

      {!isLoading && items.length > 0 ? (
        <div className={styles.homeSavedList}>
          {items.map(item => {
            if (!item.isAccessible || !item.document) {
              return (
                <article key={item.key} className={styles.homeSavedUnavailable}>
                  <span className={styles.homeSavedUnavailableTitle}>{item.title}</span>
                  <span className={styles.homeSavedUnavailableMeta}>Không còn quyền truy cập</span>
                </article>
              );
            }

            return (
              <PhvbMagLibraryDocumentCard
                key={item.key}
                document={item.document}
                showDownload
                metaContent={(
                  <span className={styles.homeDocRowMeta}>
                    {item.dateLabel}
                  </span>
                )}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
