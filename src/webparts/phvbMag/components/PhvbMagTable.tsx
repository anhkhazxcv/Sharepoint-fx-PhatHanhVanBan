import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, TabType } from '../models/PhvbMag.models';
import { getBadgeVariant, getSummaryPreview } from '../utils/PhvbMag.selectors';
import styles from './PhvbMag.module.scss';
import { SearchIcon } from './PhvbMagIcons';

interface IPhvbMagTableProps {
  activeTab: TabType;
  items: IVanBanItem[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenCreate: () => void;
  onSelectItem: (item: IVanBanItem) => void;
}

type RequestStatusFilterKey = 'all' | 'processing' | 'approved' | 'rejected';

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
      tone: item.StatusApproved === 'Approved' ? 'info' : 'success',
      label: `Còn ${relativeDays} ngày`
    };
  }

  if (item.StatusApproved === 'Approved') {
    return {
      tone: 'info',
      label: 'Đã ban hành'
    };
  }

  return {
    tone: 'neutral',
    label: 'Đang xử lý'
  };
}

function getStageLabel(item: IVanBanItem): string {
  if (item.StatusApproved === 'Approved') {
    return 'Đã ban hành';
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

  if (item.StatusApproved === 'Approved') {
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

function getMetricCards(items: IVanBanItem[], today: Date, activeTab: TabType): IMetricCard[] {
  const overdueCount = items.filter(item => {
    const relativeDays = getRelativeDays(item, today);
    return typeof relativeDays === 'number' && relativeDays <= 0;
  }).length;

  const upcomingCount = items.filter(item => {
    const relativeDays = getRelativeDays(item, today);
    return typeof relativeDays === 'number' && relativeDays > 0 && relativeDays <= 2;
  }).length;

  const processingCount = items.filter(item => item.StatusApproved !== 'Approved').length;
  const releasedThisWeekCount = items.filter(item => {
    if (item.StatusApproved !== 'Approved') {
      return false;
    }

    const publishDate = parseDate(item.NgayPhatHanh);
    if (!publishDate) {
      return false;
    }

    const diff = Math.floor((today.getTime() - toStartOfDay(publishDate).getTime()) / DAY_IN_MS);
    return diff >= 0 && diff <= 7;
  }).length;

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
  const normalizedStatus = (item.StatusApproved || '').toLowerCase();

  if (
    normalizedStatus.indexOf('reject') > -1 ||
    normalizedStatus.indexOf('declin') > -1 ||
    normalizedStatus.indexOf('từ chối') > -1 ||
    normalizedStatus.indexOf('tu choi') > -1
  ) {
    return {
      filterKey: 'rejected',
      label: 'Từ chối',
      className: styles.requestStatusRejected
    };
  }

  if (normalizedStatus.indexOf('approved') > -1 || normalizedStatus.indexOf('đã duyệt') > -1 || normalizedStatus.indexOf('da duyet') > -1) {
    return {
      filterKey: 'approved',
      label: 'Đã duyệt',
      className: styles.requestStatusApproved
    };
  }

  if (item.NguoiGopY || item.ThamDinh) {
    return {
      filterKey: 'processing',
      label: 'Cần chỉnh sửa',
      className: styles.requestStatusRevision
    };
  }

  return {
    filterKey: 'processing',
    label: 'Chờ duyệt',
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
  const { items, isLoading, searchQuery, onSearchChange, onOpenCreate, onSelectItem } = props;
  const [statusFilter, setStatusFilter] = React.useState<RequestStatusFilterKey>('all');
  const [searchDraft, setSearchDraft] = React.useState<string>(searchQuery);

  React.useEffect(() => {
    setSearchDraft(searchQuery);
  }, [searchQuery]);

  const filteredItems = React.useMemo(() => items.filter(item => {
    if (statusFilter === 'all') {
      return true;
    }

    return getRequestStatusState(item).filterKey === statusFilter;
  }), [items, statusFilter]);

  const pagination = usePagedItems(filteredItems, [statusFilter, searchQuery]);
  const { pagedItems, totalItems } = pagination;

  const handleSearchSubmit = (): void => {
    onSearchChange(searchDraft);
  };

  return (
    <div className={styles.requestBoard}>
      <div className={styles.requestBoardHeader}>
        <div className={styles.requestBoardTitle}>
          <h3>Yêu cầu của tôi</h3>
          <span>{items.length} yêu cầu</span>
        </div>

        <button type="button" className={styles.requestCreateButton} onClick={onOpenCreate}>
          + Tạo mới
        </button>
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

      <div className={styles.requestControls}>
        <select
          className={styles.requestStatusSelect}
          value={statusFilter}
          onChange={event => setStatusFilter(event.target.value as RequestStatusFilterKey)}
        >
          <option value="all">Trạng thái</option>
          {requestStatusFilterOptions.slice(1).map(option => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>

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
  const { activeTab, items, isLoading, searchQuery, onSelectItem } = props;
  const today = toStartOfDay(new Date());
  const metrics = getMetricCards(items, today, activeTab);
  const sectionTitle = activeTab === 'ViecCanLam' ? 'Cần xử lý' : TAB_LABELS[activeTab];
  const pagination = usePagedItems(items, [searchQuery, items]);
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
          <span className={styles.countText}>{items.length} việc</span>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className={styles.skeletonRow}>
              <div className={styles.skeletonCell} style={{ width: '54px', height: '54px', borderRadius: '16px' }} />
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
              const iconLabel = (item.LoaiYeuCau || item.Tenvanban || 'V').substring(0, 1).toUpperCase();
              const cardToneClassName = cardToneClassMap[deadline.tone];

              return (
                <article key={item.Id} className={[styles.taskCard, cardToneClassName].join(' ')} onClick={() => onSelectItem(item)}>
                  <div className={styles.taskCardAccent} />

                  <div className={[styles.taskIconBadge, cardToneClassName].join(' ')}>
                    {iconLabel}
                  </div>

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