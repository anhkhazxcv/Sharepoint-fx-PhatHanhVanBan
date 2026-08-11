import * as React from 'react';
import { usePhvbPagedItems } from '../hooks/usePhvbPagedItems';
import { PhvbMagListPager } from './PhvbMagListPager';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagLibraryPagedListProps<T> {
  items: T[];
  resetDeps: React.DependencyList;
  onReload?: () => void;
  listClassName?: string;
  getItemKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
}

export function PhvbMagLibraryPagedList<T>(props: IPhvbMagLibraryPagedListProps<T>): React.ReactElement {
  const { items, resetDeps, onReload, listClassName, getItemKey, renderItem } = props;
  const pagination = usePhvbPagedItems(items, resetDeps);
  const listClassNames = [
    styles.libraryListScroll,
    styles.recentSectionList,
    listClassName
  ].filter(Boolean).join(' ');

  return (
    <div className={styles.libraryListBoard}>
      <div className={listClassNames}>
        {pagination.pagedItems.map(item => (
          <React.Fragment key={getItemKey(item)}>
            {renderItem(item)}
          </React.Fragment>
        ))}
      </div>
      <PhvbMagListPager
        pageSize={pagination.pageSize}
        rangeStart={pagination.rangeStart}
        rangeEnd={pagination.rangeEnd}
        totalItems={pagination.totalItems}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageSizeChange={pagination.setPageSize}
        onPreviousPage={pagination.goToPreviousPage}
        onNextPage={pagination.goToNextPage}
        onReload={onReload}
      />
    </div>
  );
}
