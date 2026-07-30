import * as React from 'react';
import { REQUEST_STATUS, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, TabType } from '../models/PhvbMag.models';
import { getBadgeVariant, getRequestStatusDisplayForItem, getSummaryPreview, type RequestStatusFilterKey } from '../utils/PhvbMag.selectors';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import styles from './PhvbMag.module.scss';
import { PaginationNextIcon, PaginationPreviousIcon, SearchIcon } from './PhvbMagIcons';

interface IPhvbMagTableProps {
  activeTab: TabType;
  items: IVanBanItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (item: IVanBanItem) => void;
}

interface IMetricCard {
  key: string;
  count: number;
  label: string;
  hint: string;
  tone: 'danger' | 'warning' | 'success' | 'info';
}

const metricToneClassMap: Record<IMetricCard['tone'], string> = {
  danger: styles.metricDanger,
  warning: styles.metricWarning,
  success: styles.metricSuccess,
  info: styles.metricInfo
};

type WorkflowBucketKey = 'gopY' | 'thamDinh' | 'pheDuyet' | 'choBanHanh';
type TaskMetricFilterKey = 'all' | WorkflowBucketKey;

interface ITaskMetricFilterOption {
  key: TaskMetricFilterKey;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const WORKFLOW_BUCKET_LABELS: Record<WorkflowBucketKey, string> = {
  gopY: 'Cần góp ý',
  thamDinh: 'Cần thẩm định',
  pheDuyet: 'Cần phê duyệt',
  choBanHanh: 'Chờ ban hành'
};

const WORKFLOW_BUCKET_ORDER: WorkflowBucketKey[] = ['gopY', 'thamDinh', 'pheDuyet', 'choBanHanh'];

const taskMetricFilterOptions: ITaskMetricFilterOption[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'gopY', label: WORKFLOW_BUCKET_LABELS.gopY },
  { key: 'thamDinh', label: WORKFLOW_BUCKET_LABELS.thamDinh},
  { key: 'pheDuyet', label: WORKFLOW_BUCKET_LABELS.pheDuyet },
  { key: 'choBanHanh', label: WORKFLOW_BUCKET_LABELS.choBanHanh}
];

function resolveWorkflowBucket(item: IVanBanItem): WorkflowBucketKey | undefined {
  const status = (item.StatusApproved || '').trim();

  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      return 'gopY';
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 'thamDinh';
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'pheDuyet';
    case REQUEST_STATUS.CHO_BAN_HANH:
      return 'choBanHanh';
    default:
      return undefined;
  }
}

function matchesTaskMetricFilter(item: IVanBanItem, filterKey: TaskMetricFilterKey): boolean {
  if (filterKey === 'all') {
    return true;
  }

  return resolveWorkflowBucket(item) === filterKey;
}

interface IWorkflowQuickFiltersProps {
  filterKey: TaskMetricFilterKey;
  onFilterChange: (key: TaskMetricFilterKey) => void;
}

function WorkflowQuickFilters(props: IWorkflowQuickFiltersProps): React.ReactElement {
  const { filterKey, onFilterChange } = props;

  return (
    <div className={styles.requestQuickFilters}>
      {taskMetricFilterOptions.map(option => {
        const IconComponent = option.icon;

        return (
          <button
            key={option.key}
            type="button"
            className={[styles.requestQuickFilter, filterKey === option.key ? styles.requestQuickFilterActive : ''].filter(Boolean).join(' ')}
            onClick={() => onFilterChange(option.key)}
          >
            {IconComponent ? <IconComponent className={styles.requestQuickFilterIcon} /> : null}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function getMetricCards(items: IVanBanItem[]): IMetricCard[] {
  const counts: Record<WorkflowBucketKey, number> = {
    gopY: 0,
    thamDinh: 0,
    pheDuyet: 0,
    choBanHanh: 0
  };

  items.forEach(item => {
    const bucket = resolveWorkflowBucket(item);

    if (bucket) {
      counts[bucket] += 1;
    }
  });

  const toneMap: Record<WorkflowBucketKey, IMetricCard['tone']> = {
    gopY: 'info',
    thamDinh: 'warning',
    pheDuyet: 'success',
    choBanHanh: 'danger'
  };

  return WORKFLOW_BUCKET_ORDER.map(key => ({
    key,
    count: counts[key],
    label: WORKFLOW_BUCKET_LABELS[key],
    hint: 'Việc cần xử lý',
    tone: toneMap[key]
  }));
}

const requestStatusFilterOptions: Array<{ key: RequestStatusFilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'approved', label: 'Đã ban hành' },
  { key: 'rejected', label: 'Từ chối' }
];

function isReleasedStatus(status?: string): boolean {
  return status === 'Approved' || status === REQUEST_STATUS.BAN_HANH || status === REQUEST_STATUS.CHO_BAN_HANH;
}

function getStageLabel(item: IVanBanItem): string {
  if (isReleasedStatus(item.StatusApproved)) {
    return REQUEST_STATUS.BAN_HANH;
  }

  if (item.StatusApproved === REQUEST_STATUS.BAN_NHAP) {
    return REQUEST_STATUS.BAN_NHAP;
  }

  if (item.StatusApproved === REQUEST_STATUS.DANG_GOP_Y) {
    return REQUEST_STATUS.DANG_GOP_Y;
  }

  if (item.StatusApproved === REQUEST_STATUS.DANG_THAM_DINH) {
    return REQUEST_STATUS.DANG_THAM_DINH;
  }

  if (item.StatusApproved === REQUEST_STATUS.DANG_PHE_DUYET) {
    return REQUEST_STATUS.DANG_PHE_DUYET;
  }

  if (item.StatusApproved === REQUEST_STATUS.CHO_CAP_SO) {
    return REQUEST_STATUS.CHO_CAP_SO;
  }

  if (item.StatusApproved === REQUEST_STATUS.DA_CAP_SO) {
    return REQUEST_STATUS.DA_CAP_SO;
  }

  if (item.ThamDinh) {
    return 'Cần thẩm định';
  }

  if (item.NguoiGopY) {
    return 'Cần góp ý';
  }

  if (item.PheDuyet) {
    return 'Cần phê duyệt';
  }

  if (item.StatusApproved === REQUEST_STATUS.CHO_CAP_SO) {
    return 'Cần cấp số';
  }

  if (item.StatusApproved === REQUEST_STATUS.DA_CAP_SO) {
    return REQUEST_STATUS.DA_CAP_SO;
  }

  if (!item.SoVanBan) {
    return 'Cần cấp số';
  }

  return 'Đang xử lý';
}

function getWorkflowText(item: IVanBanItem): string {
  const owner = item.NguoiTao || 'Yêu cầu';

  if (item.StatusApproved === REQUEST_STATUS.BAN_NHAP) {
    return `${owner} đang lưu nháp yêu cầu phát hành văn bản`;
  }

  if (isReleasedStatus(item.StatusApproved)) {
    return `${owner} đã hoàn tất quy trình phát hành văn bản`;
  }

  if (item.ThamDinh) {
    return `${owner} đang chờ thẩm định hồ sơ`;
  }

  if (item.NguoiGopY) {
    return `${owner} đang chờ góp ý từ các bên liên quan`;
  }

  if (item.PheDuyet) {
    return `${owner} đã qua góp ý và đang chờ phê duyệt`;
  }

  if (item.StatusApproved === REQUEST_STATUS.CHO_CAP_SO) {
    return `${owner} đang chờ cấp số phát hành`;
  }

  if (item.StatusApproved === REQUEST_STATUS.DA_CAP_SO) {
    return `${owner} đã cấp số, chờ admin chuẩn bị ban hành`;
  }

  if (!item.SoVanBan) {
    return `${owner} đang chờ cấp số phát hành`;
  }

  return `${owner} đang được hệ thống xử lý`;
}

function getRequestStatusState(item: IVanBanItem): { filterKey: RequestStatusFilterKey; label: string; className: string } {
  const statusDisplay = getRequestStatusDisplayForItem(item);

  if (statusDisplay.filterKey === 'rejected') {
    return {
      ...statusDisplay,
      className: styles.requestStatusRejected
    };
  }

  if (statusDisplay.filterKey === 'approved') {
    return {
      ...statusDisplay,
      className: styles.requestStatusApproved
    };
  }

  if (item.StatusApproved === REQUEST_STATUS.BAN_NHAP) {
    return {
      ...statusDisplay,
      className: styles.requestStatusPending
    };
  }

  if (item.NguoiGopY || item.ThamDinh) {
    return {
      filterKey: 'processing',
      label: statusDisplay.label,
      className: styles.requestStatusRevision
    };
  }

  return {
    ...statusDisplay,
    className: styles.requestStatusPending
  };
}

function getRequestFolderLabel(item: IVanBanItem): string {
  return item.ThuMucBanHanh || 'Thư mục ban hành';
}

const PAGE_SIZE_OPTIONS: ReadonlyArray<number> = [10, 20, 50];

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
          placeholder="Tìm tài liệu, mã số..."
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
  showStatusFilters?: boolean;
  showWorkflowFilters?: boolean;
  emptyMessage?: string;
}

const REQUEST_BOARD_TABS: Record<'YeuCauCuaToi' | 'BanNhap' | 'CapSo' | 'QLVanBan', {
  countSuffix: string;
  showStatusFilters: boolean;
  showWorkflowFilters: boolean;
  emptyMessage: string;
}> = {
  YeuCauCuaToi: {
    countSuffix: 'yêu cầu',
    showStatusFilters: true,
    showWorkflowFilters: false,
    emptyMessage: 'Không có yêu cầu phù hợp với bộ lọc hiện tại.'
  },
  BanNhap: {
    countSuffix: 'bản nháp',
    showStatusFilters: false,
    showWorkflowFilters: false,
    emptyMessage: 'Không có bản nháp phù hợp với bộ lọc hiện tại.'
  },
  CapSo: {
    countSuffix: 'hồ sơ',
    showStatusFilters: false,
    showWorkflowFilters: false,
    emptyMessage: 'Không có hồ sơ phù hợp với bộ lọc hiện tại.'
  },
  QLVanBan: {
    countSuffix: 'văn bản',
    showStatusFilters: false,
    showWorkflowFilters: true,
    emptyMessage: 'Không có văn bản phù hợp với bộ lọc hiện tại.'
  }
};

function RequestBoardTable(props: IRequestBoardTableProps): React.ReactElement {
  const {
    items,
    isLoading,
    searchQuery,
    onSearchChange,
    onSelectItem,
    boardTitle,
    countSuffix,
    showStatusFilters = false,
    showWorkflowFilters = false,
    emptyMessage = 'Không có dữ liệu phù hợp với bộ lọc hiện tại.'
  } = props;
  const [statusFilter, setStatusFilter] = React.useState<RequestStatusFilterKey>('all');
  const [workflowFilter, setWorkflowFilter] = React.useState<TaskMetricFilterKey>('all');
  const hasQuickFilters = showStatusFilters || showWorkflowFilters;

  const filteredItems = React.useMemo(() => items.filter(item => {
    if (showStatusFilters && statusFilter !== 'all' && getRequestStatusState(item).filterKey !== statusFilter) {
      return false;
    }

    if (showWorkflowFilters && !matchesTaskMetricFilter(item, workflowFilter)) {
      return false;
    }

    return true;
  }), [items, showStatusFilters, statusFilter, showWorkflowFilters, workflowFilter]);

  const pagination = usePagedItems(filteredItems, [statusFilter, workflowFilter, searchQuery, showStatusFilters, showWorkflowFilters]);
  const { pagedItems, totalItems } = pagination;

  return (
    <div className={styles.requestBoard}>
      <div className={styles.requestBoardHeader}>
        <div className={styles.requestBoardTitle}>
          <h3>{boardTitle}</h3>
          <span>{items.length} {countSuffix}</span>
        </div>
      </div>

      <div className={[styles.requestToolBar, !hasQuickFilters ? styles.requestToolBarSearchOnly : ''].filter(Boolean).join(' ')}>
        {showStatusFilters && (
          <div className={styles.requestQuickFilters}>
            {requestStatusFilterOptions.map(option => (
              <button
                key={option.key}
                type="button"
                className={[styles.requestQuickFilter, statusFilter === option.key ? styles.requestQuickFilterActive : ''].filter(Boolean).join(' ')}
                onClick={() => setStatusFilter(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        {showWorkflowFilters && (
          <WorkflowQuickFilters filterKey={workflowFilter} onFilterChange={setWorkflowFilter} />
        )}

        <RequestSearchControls searchQuery={searchQuery} onSearchChange={onSearchChange} />
      </div>

      {isLoading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className={styles.requestSkeletonRow}>
              <div className={styles.skeletonCell} style={{ width: '34%' }} />
              <div className={styles.skeletonCell} style={{ width: '24%' }} />
              <div className={styles.skeletonCell} style={{ width: '14%' }} />
              <div className={styles.skeletonCell} style={{ width: '18%' }} />
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
                  <th>TÊN VĂN BẢN</th>
                  <th>TÓM TẮT NỘI DUNG</th>
                  <th>TRẠNG THÁI</th>
                  <th>THƯ MỤC BAN HÀNH</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map(item => {
                  const requestStatus = getRequestStatusState(item);
                  const summaryPreview = getSummaryPreview(item.TomTatNoiDung, 110);

                  return (
                    <tr key={item.Id} className={styles.requestTableRow} onClick={() => onSelectItem(item)}>
                      <td className={styles.requestTitleCell}>
                        <div className={styles.requestTitle}>{item.Tenvanban || 'Chưa có tên văn bản'}</div>
                      </td>
                      <td className={styles.requestSummaryCell}>{summaryPreview || getWorkflowText(item)}</td>
                      <td>
                        <span className={[styles.requestStatusBadge, requestStatus.className].join(' ')}>{requestStatus.label}</span>
                      </td>
                      <td className={styles.requestFolderCell}>{getRequestFolderLabel(item)}</td>
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

function TaskListView(props: IPhvbMagTableProps): React.ReactElement {
  const { activeTab, items, isLoading, searchQuery, onSearchChange, onSelectItem } = props;
  const [metricFilter, setMetricFilter] = React.useState<TaskMetricFilterKey>('all');
  const isTaskTab = activeTab === 'ViecCanLam';
  const metrics = isTaskTab ? getMetricCards(items) : [];
  const sectionTitle = isTaskTab ? 'Cần xử lý' : TAB_LABELS[activeTab];
  const visibleItems = React.useMemo(() => {
    if (!isTaskTab) {
      return items;
    }

    return items.filter(item => matchesTaskMetricFilter(item, metricFilter));
  }, [isTaskTab, items, metricFilter]);
  const pagination = usePagedItems(visibleItems, [metricFilter, items, activeTab, searchQuery]);
  const { pagedItems, totalItems } = pagination;
  const listCountText = isTaskTab ? `${visibleItems.length} việc` : `${visibleItems.length} mục`;

  return (
    <div className={[styles.tableCard, isTaskTab ? styles.tableCardCompact : ''].filter(Boolean).join(' ')}>
      {!isLoading && isTaskTab && (
        <div className={styles.metricsGrid}>
          {metrics.map(metric => (
            <article key={metric.key} className={[styles.metricCard, metricToneClassMap[metric.tone]].join(' ')}>
              <span className={styles.metricValue}>{metric.count}</span>
              <span className={styles.metricLabel}>{metric.label}</span>
              <span className={styles.metricHint}>{metric.hint}</span>
            </article>
          ))}
        </div>
      )}

      <div className={styles.listSectionHeader}>
        <div className={styles.titleArea}>
          <h3>{sectionTitle}</h3>
          <span className={styles.countText}>{listCountText}</span>
        </div>
      </div>

      {isTaskTab && (
        <div className={styles.requestToolBar}>
          <WorkflowQuickFilters filterKey={metricFilter} onFilterChange={setMetricFilter} />
          <RequestSearchControls searchQuery={searchQuery} onSearchChange={onSearchChange} />
        </div>
      )}

      {isLoading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className={styles.skeletonRow}>
              <div className={styles.skeletonBlock}>
                <div className={styles.skeletonCell} style={{ width: '52%' }} />
                <div className={styles.skeletonCell} style={{ width: '34%' }} />
                <div className={styles.skeletonCell} style={{ width: '28%' }} />
              </div>
              <div className={styles.skeletonCell} style={{ width: '96px' }} />
            </div>
          ))}
        </div>
      ) : totalItems === 0 ? (
        <PhvbMagEmptyState message="Không có dữ liệu phù hợp với bộ lọc hiện tại." />
      ) : (
        <>
          <div className={styles.taskList}>
            {pagedItems.map(item => {
              const summaryPreview = getSummaryPreview(item.TomTatNoiDung, 120);
              const stageLabel = getStageLabel(item);

              return (
                <article key={item.Id} className={[styles.taskCard, styles.cardNeutral].join(' ')} onClick={() => onSelectItem(item)}>
                  <div className={styles.taskCardAccent} />

                  <div className={styles.taskCardBody}>
                    <div className={styles.taskCardTitleRow}>
                      <h4 className={styles.taskCardTitle}>{item.Tenvanban || 'Chưa có tên văn bản'}</h4>
                    </div>

                    <p className={styles.taskCardDescription}>{getWorkflowText(item)}</p>

                    <div className={styles.taskTagRow}>
                      <span className={styles.taskMetaPill}>{stageLabel}</span>
                      {item.LoaiYeuCau && <span className={`${styles.badge} ${styles[getBadgeVariant(item.LoaiYeuCau)]}`}>{item.LoaiYeuCau}</span>}
                      {item.KhoaPhongNguoiTao && <span className={styles.deptPill}>{item.KhoaPhongNguoiTao}</span>}
                      {item.SoVanBan && <span className={styles.taskMetaPill}>{item.SoVanBan}</span>}
                    </div>

                    {summaryPreview && <div className={styles.taskCardMeta}>{summaryPreview}</div>}
                  </div>
                </article>
              );
            })}
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

const BOARD_TABLE_TABS: Array<keyof typeof REQUEST_BOARD_TABS> = ['YeuCauCuaToi', 'BanNhap', 'CapSo', 'QLVanBan'];

function isBoardTableTab(tab: TabType): tab is keyof typeof REQUEST_BOARD_TABS {
  return BOARD_TABLE_TABS.indexOf(tab as keyof typeof REQUEST_BOARD_TABS) > -1;
}

export function PhvbMagTable(props: IPhvbMagTableProps): React.ReactElement {
  const { activeTab } = props;

  if (isBoardTableTab(activeTab)) {
    const boardConfig = REQUEST_BOARD_TABS[activeTab];

    return (
      <RequestBoardTable
        key={activeTab}
        {...props}
        boardTitle={TAB_LABELS[activeTab]}
        countSuffix={boardConfig.countSuffix}
        showStatusFilters={boardConfig.showStatusFilters}
        showWorkflowFilters={boardConfig.showWorkflowFilters}
        emptyMessage={boardConfig.emptyMessage}
      />
    );
  }

  return <TaskListView key={activeTab} {...props} />;
}