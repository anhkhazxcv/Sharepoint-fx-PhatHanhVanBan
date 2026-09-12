import * as React from 'react';
import { useMemo, useState } from 'react';
import { ALL_FILTER_VALUE, REQUEST_STATUS, TAB_LABELS } from '../../config/PhvbMag.configuration';
import type { IVanBanItem, TabType } from '../../models/PhvbMag.models';
import {
  applyRequestTableFilters,
  DEFAULT_REQUEST_TABLE_FILTERS,
  getWorkflowMetricCards,
  type IRequestTableFilters,
  type IWorkflowMetricCard,
  sortRequestTableItems
} from '../../utils/PhvbMagTable.utils';
import styles from '../PhvbMag.module.scss';
import { PhvbMagEmptyState } from '../PhvbMagEmptyState';
import { PhvbMagMobileRequestCard } from './PhvbMagMobileRequestCard';

/** Số card hiển thị ban đầu và mỗi lần bấm "Xem thêm". */
const MOBILE_PAGE_SIZE = 15;

// Hậu tố đếm khớp countSuffix trong LIST_TAB_CONFIG của PhvbMagTable.
const MOBILE_COUNT_SUFFIX: Partial<Record<TabType, string>> = {
  ViecCanLam: 'việc',
  YeuCauCuaToi: 'yêu cầu',
  CapSo: 'hồ sơ',
  QLVanBan: 'văn bản'
};

const METRIC_TONE_CLASS: Record<IWorkflowMetricCard['tone'], string> = {
  info: styles.mobileStatInfo,
  warning: styles.mobileStatWarning,
  success: styles.mobileStatSuccess,
  danger: styles.mobileStatDanger
};

interface IMobileFilterChip {
  key: string;
  label: string;
  /** Patch áp lên IRequestTableFilters — vẫn đi qua applyRequestTableFilters. */
  patch: Partial<IRequestTableFilters>;
}

/**
 * Chip mobile là lối tắt cho vài tổ hợp hay dùng của bộ lọc desktop, KHÔNG
 * phải bộ lọc thứ hai: mọi chip đều quy về IRequestTableFilters rồi chạy qua
 * cùng applyRequestTableFilters() mà bảng desktop dùng.
 */
const MOBILE_FILTER_CHIPS: ReadonlyArray<IMobileFilterChip> = [
  {
    key: 'all',
    label: 'Tất cả',
    patch: { status: ALL_FILTER_VALUE, loaiYeuCau: ALL_FILTER_VALUE }
  },
  {
    key: 'gopY',
    label: 'Đang góp ý',
    patch: { status: REQUEST_STATUS.DANG_GOP_Y, loaiYeuCau: ALL_FILTER_VALUE }
  },
  {
    key: 'thamDinh',
    label: 'Đang thẩm định',
    patch: { status: REQUEST_STATUS.DANG_THAM_DINH, loaiYeuCau: ALL_FILTER_VALUE }
  },
  {
    key: 'pheDuyet',
    label: 'Đang phê duyệt',
    patch: { status: REQUEST_STATUS.DANG_PHE_DUYET, loaiYeuCau: ALL_FILTER_VALUE }
  },
  {
    key: 'dieuChinh',
    label: 'Điều chỉnh',
    patch: { status: ALL_FILTER_VALUE, loaiYeuCau: 'Điều chỉnh' }
  }
];

interface IPhvbMagMobileRequestListProps {
  activeTab: TabType;
  items: IVanBanItem[];
  isLoading: boolean;
  onSelectItem: (item: IVanBanItem) => void;
  /** Chỉ tab ViecCanLam hiện 4 thẻ chỉ số, khớp showStatusMetrics của bảng. */
  showStatusMetrics?: boolean;
}

export function PhvbMagMobileRequestList(
  props: IPhvbMagMobileRequestListProps
): React.ReactElement {
  const { activeTab, items, isLoading, onSelectItem, showStatusMetrics = false } = props;
  const [activeChipKey, setActiveChipKey] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState<number>(MOBILE_PAGE_SIZE);

  // Thẻ chỉ số tính trên TOÀN BỘ items (không theo chip) — nếu tính sau khi lọc
  // thì bấm chip "Đang góp ý" sẽ làm 3 thẻ còn lại về 0.
  const metrics = useMemo(
    () => (showStatusMetrics ? getWorkflowMetricCards(items) : []),
    [items, showStatusMetrics]
  );

  const filteredItems = useMemo(() => {
    const chip =
      MOBILE_FILTER_CHIPS.filter(entry => entry.key === activeChipKey)[0] ||
      MOBILE_FILTER_CHIPS[0];

    const filters: IRequestTableFilters = {
      ...DEFAULT_REQUEST_TABLE_FILTERS,
      ...chip.patch
    };

    // Mặc định mới nhất trước, giống sortDirection 'desc' của bảng desktop.
    return sortRequestTableItems(
      applyRequestTableFilters(items, filters),
      'Created',
      'desc'
    );
  }, [items, activeChipKey]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = filteredItems.length > visibleItems.length;

  const handleSelectChip = (key: string): void => {
    setActiveChipKey(key);
    // Đổi bộ lọc thì quay về đầu danh sách, không giữ số card đã mở.
    setVisibleCount(MOBILE_PAGE_SIZE);
  };

  return (
    <div className={styles.mobileListScreen}>
      {showStatusMetrics && metrics.length > 0 ? (
        <div className={styles.mobileStatGrid}>
          {metrics.map(metric => (
            <div
              key={metric.key}
              className={[styles.mobileStatCard, METRIC_TONE_CLASS[metric.tone]]
                .filter(Boolean)
                .join(' ')}
            >
              <strong>{metric.count}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.mobileChipRow} role="tablist" aria-label="Bộ lọc nhanh">
        {MOBILE_FILTER_CHIPS.map(chip => {
          const isActive = chip.key === activeChipKey;

          return (
            <button
              key={chip.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={[styles.mobileChip, isActive ? styles.mobileChipActive : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => handleSelectChip(chip.key)}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <h3 className={styles.mobileSectionTitle}>
        {TAB_LABELS[activeTab]}
        <span className={styles.mobileSectionCount}>
          {filteredItems.length} {MOBILE_COUNT_SUFFIX[activeTab] || 'văn bản'}
        </span>
      </h3>

      {isLoading && items.length === 0 ? (
        <PhvbMagEmptyState message="Đang tải danh sách văn bản..." />
      ) : visibleItems.length === 0 ? (
        <PhvbMagEmptyState message="Không có văn bản phù hợp với bộ lọc hiện tại." />
      ) : (
        <>
          <div className={styles.mobileCardList}>
            {visibleItems.map(item => (
              <PhvbMagMobileRequestCard
                key={item.Id}
                item={item}
                onSelect={onSelectItem}
              />
            ))}
          </div>

          {hasMore ? (
            <button
              type="button"
              className={styles.mobileLoadMore}
              onClick={() => setVisibleCount(current => current + MOBILE_PAGE_SIZE)}
            >
              Xem thêm ({filteredItems.length - visibleItems.length} văn bản)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
