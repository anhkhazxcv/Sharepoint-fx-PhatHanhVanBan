import * as React from 'react';
import { ALL_FILTER_VALUE, REQUEST_STATUS, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowFilterOptions, TabType } from '../models/PhvbMag.models';
import { formatExecutionDate } from '../utils/PhvbMagDateTime.utils';
import { getBadgeVariant, getRequestStatusDisplayForItem } from '../utils/PhvbMag.selectors';
import {
  applyRequestTableFilters,
  DEFAULT_REQUEST_TABLE_FILTERS,
  getWorkflowMetricCards,
  type IRequestTableFilters,
  type IWorkflowMetricCard,
  type RequestTableSortDirection,
  type RequestTableSortKey,
  sortRequestTableItems
} from '../utils/PhvbMagTable.utils';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import styles from './PhvbMag.module.scss';
import { PaginationNextIcon, PaginationPreviousIcon, SearchIcon } from './PhvbMagIcons';

interface IPhvbMagTableProps {
  activeTab: TabType;
  items: IVanBanItem[];
  isLoading: boolean;
  searchQuery: string;
  filterOptions: IWorkflowFilterOptions;
  onSearchChange: (value: string) => void;
  onSelectItem: (item: IVanBanItem) => void;
}

const metricToneClassMap: Record<IWorkflowMetricCard['tone'], string> = {
  danger: styles.metricDanger,
  warning: styles.metricWarning,
  success: styles.metricSuccess,
  info: styles.metricInfo
};

interface ITableColumnDefinition {
  key: string;
  label: string;
  sortKey?: RequestTableSortKey;
  headerClassName?: string;
  cellClassName?: string;
}

const TABLE_COLUMNS: ReadonlyArray<ITableColumnDefinition> = [
  { key: 'index', label: '#', headerClassName: styles.requestTableIndexCol },
  { key: 'title', label: 'TÊN VĂN BẢN', sortKey: 'Tenvanban', headerClassName: styles.requestTitleCell },
  { key: 'code', label: 'MÃ HIỆU', sortKey: 'SoVanBan' },
  { key: 'type', label: 'LOẠI VB', sortKey: 'LoaiYeuCau' },
  { key: 'department', label: 'PHÒNG BAN', sortKey: 'KhoaPhongNguoiTao' },
  { key: 'created', label: 'NGÀY TẠO', sortKey: 'NgayTaoYeuCau' },
  { key: 'status', label: 'TRẠNG THÁI', sortKey: 'StatusApproved' }
];

const PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [10, 20, 50];

const LIST_TAB_CONFIG: Record<
  'ViecCanLam' | 'YeuCauCuaToi' | 'BanNhap' | 'CapSo' | 'QLVanBan',
  {
    countSuffix: string;
    emptyMessage: string;
    showStatusMetrics: boolean;
  }
> = {
  ViecCanLam: {
    countSuffix: 'việc',
    emptyMessage: 'Không có việc phù hợp với bộ lọc hiện tại.',
    showStatusMetrics: true
  },
  YeuCauCuaToi: {
    countSuffix: 'yêu cầu',
    emptyMessage: 'Không có yêu cầu phù hợp với bộ lọc hiện tại.',
    showStatusMetrics: false
  },
  BanNhap: {
    countSuffix: 'bản nháp',
    emptyMessage: 'Không có bản nháp phù hợp với bộ lọc hiện tại.',
    showStatusMetrics: false
  },
  CapSo: {
    countSuffix: 'hồ sơ',
    emptyMessage: 'Không có hồ sơ phù hợp với bộ lọc hiện tại.',
    showStatusMetrics: false
  },
  QLVanBan: {
    countSuffix: 'văn bản',
    emptyMessage: 'Không có văn bản phù hợp với bộ lọc hiện tại.',
    showStatusMetrics: false
  }
};

const LIST_TABLE_TABS: Array<keyof typeof LIST_TAB_CONFIG> = [
  'ViecCanLam',
  'YeuCauCuaToi',
  'BanNhap',
  'CapSo',
  'QLVanBan'
];

function isListTableTab(tab: TabType): tab is keyof typeof LIST_TAB_CONFIG {
  return LIST_TABLE_TABS.indexOf(tab as keyof typeof LIST_TAB_CONFIG) > -1;
}

function getRequestStatusState(item: IVanBanItem): { label: string; className: string } {
  const statusDisplay = getRequestStatusDisplayForItem(item);

  if (statusDisplay.filterKey === 'rejected') {
    return {
      label: statusDisplay.label,
      className: styles.requestStatusRejected
    };
  }

  if (statusDisplay.filterKey === 'approved') {
    return {
      label: statusDisplay.label,
      className: styles.requestStatusApproved
    };
  }

  if (item.StatusApproved === REQUEST_STATUS.BAN_NHAP) {
    return {
      label: statusDisplay.label,
      className: styles.requestStatusPending
    };
  }

  if (item.NguoiGopY || item.ThamDinh) {
    return {
      label: statusDisplay.label,
      className: styles.requestStatusRevision
    };
  }

  return {
    label: statusDisplay.label,
    className: styles.requestStatusPending
  };
}

interface IPagedItemsResult<T> {
  pageSize: number;
  setPageSize: (size: number) => void;
  pagedItems: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  rangeStart: number;
  rangeEnd: number;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
}

function usePagedItems<T>(items: T[], resetDeps: React.DependencyList): IPagedItemsResult<T> {
  const [pageSize, setPageSizeState] = React.useState<number>(20);
  const [page, setPage] = React.useState<number>(1);

  React.useEffect(() => {
    setPage(1);
  }, resetDeps);

  const setPageSize = (size: number): void => {
    setPageSizeState(size);
    setPage(1);
  };

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = page > totalPages ? totalPages : page;
  const pagedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = totalItems === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return {
    pageSize,
    setPageSize,
    pagedItems,
    totalItems,
    totalPages,
    currentPage,
    rangeStart,
    rangeEnd,
    goToPreviousPage: () => setPage(currentPage - 1),
    goToNextPage: () => setPage(currentPage + 1)
  };
}

interface IRequestSearchControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

function RequestSearchControls(props: IRequestSearchControlsProps): React.ReactElement {
  const { searchQuery, onSearchChange } = props;
  const [searchDraft, setSearchDraft] = React.useState<string>(searchQuery);

  React.useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const handleSearchSubmit = (): void => {
    onSearchChange(searchDraft);
  };

  return (
    <div className={styles.requestControls}>
      <div className={styles.requestSearchBox}>
        <SearchIcon className={styles.searchIcon} />
        <input
          type="text"
          value={searchDraft}
          placeholder="Tìm tên văn bản, mã hiệu..."
          onChange={event => setSearchDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              handleSearchSubmit();
            }
          }}
        />
      </div>

      <button type="button" className={styles.requestSearchButton} onClick={handleSearchSubmit}>
        Tìm kiếm
      </button>
    </div>
  );
}

interface IRequestFilterSelectProps {
  label: string;
  value: string;
  options: ReadonlyArray<string>;
  onChange: (value: string) => void;
}

function RequestFilterSelect(props: IRequestFilterSelectProps): React.ReactElement {
  const { label, value, options, onChange } = props;

  return (
    <label className={styles.requestFilterField}>
      <span className={styles.requestFilterLabel}>{label}</span>
      <select
        className={styles.requestStatusSelect}
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value={ALL_FILTER_VALUE}>Tất cả</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

interface IRequestTableToolbarProps {
  filterOptions: IWorkflowFilterOptions;
  filters: IRequestTableFilters;
  searchQuery: string;
  onFiltersChange: (filters: IRequestTableFilters) => void;
  onSearchChange: (value: string) => void;
}

function RequestTableToolbar(props: IRequestTableToolbarProps): React.ReactElement {
  const { filterOptions, filters, searchQuery, onFiltersChange, onSearchChange } = props;

  const updateFilter = (patch: Partial<IRequestTableFilters>): void => {
    onFiltersChange({
      ...filters,
      ...patch
    });
  };

  return (
    <div className={styles.requestToolBarStack}>
      <RequestSearchControls searchQuery={searchQuery} onSearchChange={onSearchChange} />

      <div className={styles.requestFilterBar}>
        <RequestFilterSelect
          label="Trạng thái:"
          value={filters.status}
          options={filterOptions.status}
          onChange={status => updateFilter({ status })}
        />
        <RequestFilterSelect
          label="Loại VB:"
          value={filters.loaiYeuCau}
          options={filterOptions.loaiVB}
          onChange={loaiYeuCau => updateFilter({ loaiYeuCau })}
        />
        <RequestFilterSelect
          label="Phòng ban:"
          value={filters.department}
          options={filterOptions.phongBan}
          onChange={department => updateFilter({ department })}
        />
        <RequestFilterSelect
          label="Năm tạo yêu cầu:"
          value={filters.requestCreatedYear}
          options={filterOptions.namTaoYeuCau}
          onChange={requestCreatedYear => updateFilter({ requestCreatedYear })}
        />
      </div>
    </div>
  );
}

interface ISortableTableHeaderProps {
  column: ITableColumnDefinition;
  sortKey?: RequestTableSortKey;
  sortDirection: RequestTableSortDirection;
  onSort: (sortKey: RequestTableSortKey) => void;
}

function SortableTableHeader(props: ISortableTableHeaderProps): React.ReactElement {
  const { column, sortKey, sortDirection, onSort } = props;
  const isActive = Boolean(column.sortKey && sortKey === column.sortKey);

  if (!column.sortKey) {
    return (
      <th className={column.headerClassName}>
        {column.label}
      </th>
    );
  }

  const handleClick = (): void => {
    onSort(column.sortKey as RequestTableSortKey);
  };

  return (
    <th className={column.headerClassName}>
      <button
        type="button"
        className={[
          styles.requestTableSortableHeader,
          isActive ? styles.requestTableSortableHeaderActive : ''
        ].filter(Boolean).join(' ')}
        onClick={handleClick}
      >
        <span>{column.label}</span>
        <span className={styles.requestTableSortIcon} aria-hidden>
          {isActive ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </button>
    </th>
  );
}

interface IListPagerProps {
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  onPageSizeChange: (size: number) => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function ListPager(props: IListPagerProps): React.ReactElement {
  const {
    pageSize,
    rangeStart,
    rangeEnd,
    totalItems,
    currentPage,
    totalPages,
    onPageSizeChange,
    onPreviousPage,
    onNextPage
  } = props;

  return (
    <div className={styles.requestFooter}>
      <button type="button" className={styles.requestReloadButton} onClick={() => window.location.reload()}>
        Tải lại
      </button>

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

interface IRequestBoardTableProps extends IPhvbMagTableProps {
  boardTitle: string;
  countSuffix: string;
  showStatusMetrics?: boolean;
  emptyMessage?: string;
}

function RequestBoardTable(props: IRequestBoardTableProps): React.ReactElement {
  const {
    items,
    isLoading,
    searchQuery,
    filterOptions,
    onSearchChange,
    onSelectItem,
    boardTitle,
    countSuffix,
    showStatusMetrics = false,
    emptyMessage = 'Không có dữ liệu phù hợp với bộ lọc hiện tại.'
  } = props;
  const [filters, setFilters] = React.useState<IRequestTableFilters>(DEFAULT_REQUEST_TABLE_FILTERS);
  const [sortKey, setSortKey] = React.useState<RequestTableSortKey | undefined>(undefined);
  const [sortDirection, setSortDirection] = React.useState<RequestTableSortDirection>('desc');
  const metrics = showStatusMetrics ? getWorkflowMetricCards(items) : [];

  const filteredItems = React.useMemo(
    () => applyRequestTableFilters(items, filters),
    [filters, items]
  );
  const sortedItems = React.useMemo(
    () => sortRequestTableItems(filteredItems, sortKey, sortDirection),
    [filteredItems, sortDirection, sortKey]
  );
  const pagination = usePagedItems(sortedItems, [filters, searchQuery, sortDirection, sortKey]);
  const { pagedItems, totalItems, currentPage, pageSize } = pagination;

  const handleSort = (nextSortKey: RequestTableSortKey): void => {
    if (sortKey === nextSortKey) {
      setSortDirection(previous => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection('asc');
  };

  const rootClassName = [
    showStatusMetrics ? styles.tableCard : styles.requestBoard,
    showStatusMetrics ? styles.tableCardCompact : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {!isLoading && showStatusMetrics ? (
        <div className={styles.metricsGrid}>
          {metrics.map(metric => (
            <article key={metric.key} className={[styles.metricCard, metricToneClassMap[metric.tone]].join(' ')}>
              <span className={styles.metricValue}>{metric.count}</span>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={styles.metricHint}>{metric.hint}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className={styles.requestBoardHeader}>
        <div className={styles.requestBoardTitle}>
          <h3>{boardTitle}</h3>
          <span>{filteredItems.length} {countSuffix}</span>
        </div>
      </div>

      <RequestTableToolbar
        filterOptions={filterOptions}
        filters={filters}
        searchQuery={searchQuery}
        onFiltersChange={setFilters}
        onSearchChange={onSearchChange}
      />

      {isLoading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className={styles.requestSkeletonRow}>
              <div className={styles.skeletonCell} style={{ width: '8%' }} />
              <div className={styles.skeletonCell} style={{ width: '24%' }} />
              <div className={styles.skeletonCell} style={{ width: '12%' }} />
              <div className={styles.skeletonCell} style={{ width: '12%' }} />
              <div className={styles.skeletonCell} style={{ width: '14%' }} />
              <div className={styles.skeletonCell} style={{ width: '14%' }} />
              <div className={styles.skeletonCell} style={{ width: '12%' }} />
            </div>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <PhvbMagEmptyState message={emptyMessage} />
      ) : (
        <>
          <div className={styles.requestTableWrap}>
            <table className={styles.requestTable}>
              <thead>
                <tr>
                  {TABLE_COLUMNS.map(column => (
                    <SortableTableHeader
                      key={column.key}
                      column={column}
                      sortKey={sortKey}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item, index) => {
                  const requestStatus = getRequestStatusState(item);
                  const rowNumber = ((currentPage - 1) * pageSize) + index + 1;
                  const createdLabel = formatExecutionDate(item.NgayTaoYeuCau) || '---';

                  return (
                    <tr key={item.Id} className={styles.requestTableRow} onClick={() => onSelectItem(item)}>
                      <td className={styles.requestTableIndexCol}>{rowNumber}</td>
                      <td className={styles.requestTitleCell}>
                        <div className={styles.requestTitle}>{item.Tenvanban || 'Chưa có tên văn bản'}</div>
                      </td>
                      <td>{item.SoVanBan || '---'}</td>
                      <td>
                        {item.LoaiYeuCau ? (
                          <span className={`${styles.badge} ${styles[getBadgeVariant(item.LoaiYeuCau)]}`}>
                            {item.LoaiYeuCau}
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>
                      <td>{item.KhoaPhongNguoiTao || '---'}</td>
                      <td>{createdLabel}</td>
                      <td>
                        <span className={[styles.requestStatusBadge, requestStatus.className].join(' ')}>
                          {requestStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ListPager
            pageSize={pagination.pageSize}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            totalItems={pagination.totalItems}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageSizeChange={pagination.setPageSize}
            onPreviousPage={pagination.goToPreviousPage}
            onNextPage={pagination.goToNextPage}
          />
        </>
      )}
    </div>
  );
}

export function PhvbMagTable(props: IPhvbMagTableProps): React.ReactElement {
  const { activeTab } = props;

  if (!isListTableTab(activeTab)) {
    return <PhvbMagEmptyState message="Không có dữ liệu cho tab này." />;
  }

  const tabConfig = LIST_TAB_CONFIG[activeTab];

  return (
    <RequestBoardTable
      key={activeTab}
      {...props}
      boardTitle={TAB_LABELS[activeTab]}
      countSuffix={tabConfig.countSuffix}
      showStatusMetrics={tabConfig.showStatusMetrics}
      emptyMessage={tabConfig.emptyMessage}
    />
  );
}
