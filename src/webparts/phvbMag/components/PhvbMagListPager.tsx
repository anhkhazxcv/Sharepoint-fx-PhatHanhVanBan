import * as React from 'react';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePhvbPagedItems';
import { PaginationNextIcon, PaginationPreviousIcon } from './PhvbMagIcons';
import { PhvbMagButton } from './primitives/PhvbMagButton';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagListPagerProps {
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageSizeChange: (size: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onReload?: () => void;
}

export function PhvbMagListPager(props: IPhvbMagListPagerProps): React.ReactElement {
  const {
    pageSize,
    rangeStart,
    rangeEnd,
    totalItems,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPreviousPage,
    onNextPage,
    onReload
  } = props;

  return (
    <div className={styles.requestFooter}>
      {onReload ? (
        <PhvbMagButton variant="secondary" className={styles.requestReloadButton} onClick={onReload}>
          Tải lại
        </PhvbMagButton>
      ) : null}

      <div className={styles.requestPager}>
        <label className={styles.requestPageSizeLabel}>
          Hiển thị:
          <select value={pageSize} onChange={event => onPageSizeChange(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <span className={styles.requestRangeText}>{rangeStart}-{rangeEnd}/{totalItems}</span>

        <button
          type="button"
          className={styles.requestPageButton}
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
          aria-label="Trang trước"
        >
          <PaginationPreviousIcon />
        </button>
        <button
          type="button"
          className={styles.requestPageButton}
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          aria-label="Trang sau"
        >
          <PaginationNextIcon />
        </button>
      </div>
    </div>
  );
}
