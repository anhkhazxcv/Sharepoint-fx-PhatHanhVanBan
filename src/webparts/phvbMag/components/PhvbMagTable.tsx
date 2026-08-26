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
import { usePhvbPagedItems } from '../hooks/usePhvbPagedItems';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagListPager } from './PhvbMagListPager';
import styles from './PhvbMag.module.scss';
import {
  SearchIcon,
  StatusDraftIcon,
  StatusGopYIcon,
  StatusNumberedIcon,
  StatusPendingIcon,
  StatusPheDuyetIcon,
  StatusPublishedIcon,
  StatusRejectedIcon,
  StatusRevokedIcon,
  StatusThamDinhIcon
} from './PhvbMagIcons';

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
  { key: 'type', label: 'LOẠI YÊU CẦU', sortKey: 'LoaiYeuCau' },
  { key: 'department', label: 'PHÒNG BAN', sortKey: 'KhoaPhongNguoiTao' },
  { key: 'created', label: 'NGÀY TẠO', sortKey: 'Created' },
  { key: 'status', label: 'TRẠNG THÁI', sortKey: 'StatusApproved' }
];

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

function resolveRequestStatusClassName(statusApproved?: string): string {
  switch (statusApproved) {
    case REQUEST_STATUS.BAN_NHAP:
      return styles.requestStatusBanNhap;
    case REQUEST_STATUS.DANG_GOP_Y:
      return styles.requestStatusDangGopY;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return styles.requestStatusDangThamDinh;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return styles.requestStatusDangPheDuyet;
    case REQUEST_STATUS.CHO_CAP_SO:
      return styles.requestStatusChoCapSo;
    case REQUEST_STATUS.DA_CAP_SO:
      return styles.requestStatusDaCapSo;
    case REQUEST_STATUS.CHO_BAN_HANH:
      return styles.requestStatusChoBanHanh;
    case REQUEST_STATUS.BAN_HANH:
      return styles.requestStatusBanHanh;
    case REQUEST_STATUS.TU_CHOI_THAM_DINH:
      return styles.requestStatusTuChoiThamDinh;
    case REQUEST_STATUS.TU_CHOI_PHE_DUYET:
      return styles.requestStatusTuChoiPheDuyet;
    case REQUEST_STATUS.THU_HOI:
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return styles.requestStatusThuHoi;
    default:
      return styles.requestStatusDefault;
  }
}

function resolveRequestStatusIcon(statusApproved?: string): React.ReactElement | undefined {
  switch (statusApproved) {
    case REQUEST_STATUS.BAN_NHAP:
      return <StatusDraftIcon />;
    case REQUEST_STATUS.DANG_GOP_Y:
      return <StatusGopYIcon />;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return <StatusThamDinhIcon />;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return <StatusPheDuyetIcon />;
    case REQUEST_STATUS.CHO_CAP_SO:
    case REQUEST_STATUS.CHO_BAN_HANH:
      return <StatusPendingIcon />;
    case REQUEST_STATUS.DA_CAP_SO:
      return <StatusNumberedIcon />;
    case REQUEST_STATUS.BAN_HANH:
      return <StatusPublishedIcon />;
    case REQUEST_STATUS.TU_CHOI_THAM_DINH:
    case REQUEST_STATUS.TU_CHOI_PHE_DUYET:
      return <StatusRejectedIcon />;
    case REQUEST_STATUS.THU_HOI:
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return <StatusRevokedIcon />;
    default:
      return undefined;
  }
}

function getRequestStatusState(item: IVanBanItem): { label: string; className: string; icon: React.ReactElement | undefined } {
  return {
    label: getRequestStatusDisplayForItem(item).label,
    className: resolveRequestStatusClassName(item.StatusApproved),
    icon: resolveRequestStatusIcon(item.StatusApproved)
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
          label="Loại yêu cầu:"
          value={filters.loaiYeuCau}
          options={filterOptions.loaiYeuCau}
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
  const pagination = usePhvbPagedItems(sortedItems, [filters, searchQuery, sortDirection, sortKey]);
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
                  const createdLabel = formatExecutionDate(item.Created) || '---';

                  return (
                    <tr
                      key={item.Id}
                      className={styles.requestTableRow}
                      onClick={() => onSelectItem(item)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectItem(item);
                        }
                      }}
                    >
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
                          {requestStatus.icon}
                          {requestStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            onReload={() => window.location.reload()}
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
