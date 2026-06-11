import * as React from 'react';
import { REQUEST_STATUS, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, TabType } from '../models/PhvbMag.models';
import { getBadgeVariant, getRequestStatusDisplayForItem, getSummaryPreview, type RequestStatusFilterKey } from '../utils/PhvbMag.selectors';
import styles from './PhvbMag.module.scss';
import { SearchIcon } from './PhvbMagIcons';

interface IPhvbMagTableProps {
  activeTab: TabType;
  items: IVanBanItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectItem: (item: IVanBanItem) => void;
}

interface IDeadlineState {
  tone: 'danger' | 'warning' | 'success' | 'info' | 'neutral';
  label: string;
}

interface IMetricCard {
  key: string;
  count: number;
  label: string;
  hint: string;
  tone: 'danger' | 'warning' | 'success' | 'info';
}

const DAY_IN_MS: number = 24 * 60 * 60 * 1000;

const metricToneClassMap: Record<IMetricCard['tone'], string> = {
  danger: styles.metricDanger,
  warning: styles.metricWarning,
  success: styles.metricSuccess,
  info: styles.metricInfo
};

const cardToneClassMap: Record<IDeadlineState['tone'], string> = {
  danger: styles.cardDanger,
  warning: styles.cardWarning,
  success: styles.cardSuccess,
  info: styles.cardInfo,
  neutral: styles.cardNeutral
};

const requestStatusFilterOptions: Array<{ key: RequestStatusFilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'approved', label: 'Đã ban hành' },
  { key: 'rejected', label: 'Từ chối' }
];

type TaskMetricFilterKey = 'all' | 'overdue' | 'upcoming' | 'processing' | 'released';

const taskMetricFilterOptions: Array<{ key: TaskMetricFilterKey; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'overdue', label: 'Quá hạn' },
  { key: 'upcoming', label: 'Sắp hạn' },
  { key: 'processing', label: 'Đang xử lý' },
  { key: 'released', label: 'Vừa ban hành' }
];

function parseDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const viDateMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(normalized);
  if (viDateMatch) {
    const parsedDate = new Date(Number(viDateMatch[3]), Number(viDateMatch[2]) - 1, Number(viDateMatch[1]));
    return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
  }

  const parsedDate = new Date(normalized);
  return isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function toStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function resolveReferenceDate(item: IVanBanItem): Date | undefined {
  return (
    parseDate(item.Date_ThamDinh) ||
    parseDate(item.Date_PheDuyet) ||
    parseDate(item.Date_GopY) ||
    parseDate(item.HieuLucTu) ||
    parseDate(item.NgayPhatHanh) ||
    parseDate(item.NgayTaoYeuCau)
  );
}

function getRelativeDays(item: IVanBanItem, today: Date): number | undefined {
  const referenceDate = resolveReferenceDate(item);

  if (!referenceDate) {
    return undefined;
  }

  return Math.ceil((toStartOfDay(referenceDate).getTime() - today.getTime()) / DAY_IN_MS);
}

function getDeadlineState(item: IVanBanItem, today: Date): IDeadlineState {
  const relativeDays = getRelativeDays(item, today);

  if (typeof relativeDays === 'number') {
    if (relativeDays < 0) {
      return {
        tone: 'danger',
        label: Math.abs(relativeDays) === 1 ? 'Quá hạn' : `Quá hạn ${Math.abs(relativeDays)} ngày`
      };
    }

    if (relativeDays === 0) {
      return {
        tone: 'danger',
        label: 'Cần xử lý ngay'
      };
    }

    if (relativeDays <= 2) {
      return {
        tone: 'warning',
        label: `Còn ${relativeDays} ngày`
      };
    }

    return {
      tone: isReleasedStatus(item.StatusApproved) ? 'info' : 'success',
      label: `Còn ${relativeDays} ngày`
    };
  }

  if (isReleasedStatus(item.StatusApproved)) {
    return {
      tone: 'info',
      label: REQUEST_STATUS.BAN_HANH
    };
  }

  return {
    tone: 'neutral',
    label: 'Đang xử lý'
  };
}

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

  if (!item.SoVanBan) {
    return `${owner} đang chờ cấp số phát hành`;
  }

  return `${owner} đang được hệ thống xử lý`;
}

function isOverdueTaskItem(item: IVanBanItem, today: Date): boolean {
  const relativeDays = getRelativeDays(item, today);
  return typeof relativeDays === 'number' && relativeDays <= 0;
}

function isUpcomingTaskItem(item: IVanBanItem, today: Date): boolean {
  const relativeDays = getRelativeDays(item, today);
  return typeof relativeDays === 'number' && relativeDays > 0 && relativeDays <= 2;
}

function isProcessingTaskItem(item: IVanBanItem): boolean {
  return !isReleasedStatus(item.StatusApproved);
}

function isReleasedThisWeekTaskItem(item: IVanBanItem, today: Date): boolean {
  if (!isReleasedStatus(item.StatusApproved)) {
    return false;
  }

  const publishDate = parseDate(item.NgayPhatHanh);
  if (!publishDate) {
    return false;
  }

  const diff = Math.floor((today.getTime() - toStartOfDay(publishDate).getTime()) / DAY_IN_MS);
  return diff >= 0 && diff <= 7;
}

function matchesTaskMetricFilter(item: IVanBanItem, filterKey: TaskMetricFilterKey, today: Date): boolean {
  switch (filterKey) {
    case 'overdue':
      return isOverdueTaskItem(item, today);
    case 'upcoming':
      return isUpcomingTaskItem(item, today);
    case 'processing':
      return isProcessingTaskItem(item);
    case 'released':
      return isReleasedThisWeekTaskItem(item, today);
    default:
      return true;
  }
}

function getMetricCards(items: IVanBanItem[], today: Date, activeTab: TabType): IMetricCard[] {
  const overdueCount = items.filter(item => isOverdueTaskItem(item, today)).length;
  const upcomingCount = items.filter(item => isUpcomingTaskItem(item, today)).length;
  const processingCount = items.filter(item => isProcessingTaskItem(item)).length;
  const releasedThisWeekCount = items.filter(item => isReleasedThisWeekTaskItem(item, today)).length;

  return [
    {
      key: 'overdue',
      count: overdueCount,
      label: 'Quá hạn',
      hint: 'Cần xử lý ngay',
      tone: 'danger'
    },
    {
      key: 'upcoming',
      count: upcomingCount,
      label: 'Sắp hạn',
      hint: 'Trong 2 ngày tới',
      tone: 'warning'
    },
    {
      key: 'processing',
      count: processingCount,
      label: 'Đang xử lý',
      hint: activeTab === 'YeuCauCuaToi' ? 'Yêu cầu của tôi' : 'Yêu cầu chờ duyệt',
      tone: 'info'
    },
    {
      key: 'released',
      count: releasedThisWeekCount,
      label: 'Vừa ban hành',
      hint: 'Tuần này',
      tone: 'success'
    }
  ];
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

        <button type="button" className={styles.requestPageButton} onClick={onPreviousPage} disabled={currentPage <= 1}>
          ‹
        </button>
        <button type="button" className={styles.requestPageButton} onClick={onNextPage} disabled={currentPage >= totalPages}>
          ›
        </button>
      </div>
    </div>
  );
}

function MyRequestsTable(props: IPhvbMagTableProps): React.ReactElement {
  const { items, isLoading, searchQuery, onSearchChange, onSelectItem } = props;
  const [statusFilter, setStatusFilter] = React.useState<RequestStatusFilterKey>('all');

  const filteredItems = React.useMemo(() => items.filter(item => {
    if (statusFilter === 'all') {
      return true;
    }

    return getRequestStatusState(item).filterKey === statusFilter;
  }), [items, statusFilter]);

  const pagination = usePagedItems(filteredItems, [statusFilter, searchQuery]);
  const { pagedItems, totalItems } = pagination;

  return (
    <div className={styles.requestBoard}>
      <div className={styles.requestBoardHeader}>
        <div className={styles.requestBoardTitle}>
          <h3>Yêu cầu của tôi</h3>
          <span>{items.length} yêu cầu</span>
        </div>
      </div>

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

      <RequestSearchControls searchQuery={searchQuery} onSearchChange={onSearchChange} />

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
        <div className={styles.emptyState}>
          <p>Không có yêu cầu phù hợp với bộ lọc hiện tại.</p>
        </div>
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
  const { activeTab, items, isLoading, onSelectItem } = props;
  const [metricFilter, setMetricFilter] = React.useState<TaskMetricFilterKey>('all');
  const today = toStartOfDay(new Date());
  const metrics = getMetricCards(items, today, activeTab);
  const sectionTitle = activeTab === 'ViecCanLam' ? 'Cần xử lý' : TAB_LABELS[activeTab];
  const visibleItems = React.useMemo(() => {
    if (activeTab !== 'ViecCanLam') {
      return items;
    }

    return items.filter(item => matchesTaskMetricFilter(item, metricFilter, today));
  }, [activeTab, items, metricFilter]);
  const pagination = usePagedItems(visibleItems, [metricFilter, items, activeTab]);
  const { pagedItems, totalItems } = pagination;

  return (
    <div className={styles.tableCard}>
      {!isLoading && (
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
          <span className={styles.countText}>{visibleItems.length} việc</span>
        </div>
      </div>

      {activeTab === 'ViecCanLam' && (
        <div className={styles.requestQuickFilters}>
          {taskMetricFilterOptions.map(option => (
            <button
              key={option.key}
              type="button"
              className={[styles.requestQuickFilter, metricFilter === option.key ? styles.requestQuickFilterActive : ''].filter(Boolean).join(' ')}
              onClick={() => setMetricFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
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
        <div className={styles.emptyState}>
          <p>Không có dữ liệu phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <>
          <div className={styles.taskList}>
            {pagedItems.map(item => {
              const summaryPreview = getSummaryPreview(item.TomTatNoiDung, 120);
              const deadline = getDeadlineState(item, today);
              const stageLabel = getStageLabel(item);
              const cardToneClassName = cardToneClassMap[deadline.tone];

              return (
                <article key={item.Id} className={[styles.taskCard, cardToneClassName].join(' ')} onClick={() => onSelectItem(item)}>
                  <div className={styles.taskCardAccent} />

                  <div className={styles.taskCardBody}>
                    <div className={styles.taskCardTitleRow}>
                      <h4 className={styles.taskCardTitle}>{item.Tenvanban || 'Chưa có tên văn bản'}</h4>
                      <div className={[styles.taskDeadline, cardToneClassName].join(' ')}>{deadline.label}</div>
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

export function PhvbMagTable(props: IPhvbMagTableProps): React.ReactElement {
  const { activeTab } = props;

  if (activeTab === 'YeuCauCuaToi') {
    return <MyRequestsTable {...props} />;
  }

  return <TaskListView key={activeTab} {...props} />;
}