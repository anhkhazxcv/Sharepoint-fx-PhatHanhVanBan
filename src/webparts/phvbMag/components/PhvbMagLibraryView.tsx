import * as React from 'react';
import { TooltipHost } from '@fluentui/react';
import type {
  ILibraryFolderEntry,
  IBanHanhLibraryItem,
  IPhvbDocumentContext
} from '../models/PhvbMag.models';
import { usePhvbLibrary } from '../hooks/usePhvbLibrary';
import { formatBanHanhDate } from '../utils/PhvbMagBanHanh.tree';
import { resolveLibraryContactPerson } from '../utils/PhvbMagLibrary.utils';
import { resolveIssuanceLibraryTitle } from '../config/PhvbMag.configuration';
import {
  usePhvbDocumentPreviewOptional,
  usePhvbRegisterPreviewDocuments
} from '../context/PhvbMagDocumentPreview.context';
import { usePhvbNarrowViewport } from '../hooks/usePhvbNarrowViewport';
import {
  readStoredNumber,
  readStoredNumberOptional,
  removeStoredKey,
  writeStoredNumber
} from '../utils/PhvbMagStorage.utils';
import { PhvbMagDocumentPreview } from './PhvbMagDocumentPreview';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagSkeleton } from './PhvbMagSkeleton';
import { PhvbMagFolderTreeNode } from './PhvbMagFolderTree';
import {
  CloseIcon,
  DocumentFileIcon,
  FolderAccentIcon,
  PaginationNextIcon,
  PaginationPreviousIcon,
  SearchIcon,
  SidebarCollapseIcon
} from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

// Kích thước 2 divider lưu ở localStorage (không phải session): đây là thói
// quen bố cục của user, phải giữ qua nhiều lần mở/đóng tab.
//
// Bố cục 2 cột (thư mục | danh sách) và 3 cột (thêm cột xem trước) có key
// riêng: độ rộng cột thư mục hợp lý ở 2 cột (5:5) quá to khi có cột xem trước
// (2:3:5), nên dùng chung một giá trị sẽ luôn sai ở một trong hai bố cục.
const LIBRARY_SIDEBAR_UNITS_KEY = 'phvbMag.librarySidebarUnits';
const LIBRARY_SIDEBAR_UNITS_PREVIEW_KEY = 'phvbMag.librarySidebarUnitsPreview';
const TOTAL_UNITS = 10;
const DEFAULT_UNITS = 5;
const DEFAULT_UNITS_WITH_PREVIEW = 2;
const MIN_UNITS = 2;
const MAX_UNITS = 7;

const LIBRARY_LIST_WIDTH_KEY = 'phvbMag.libraryListWidthPx';
// Phần cột danh sách trong bố cục mặc định 2:3:5, đo ra px lúc cột xem trước
// mở lần đầu (xem useLayoutEffect bên dưới).
const DEFAULT_LIST_RATIO_WITH_PREVIEW = 3 / TOTAL_UNITS;
// Chỉ dùng khi chưa đo được bề rộng container.
const DEFAULT_LIST_WIDTH_PX = 320;
const MIN_LIST_WIDTH_PX = 280;
const MAX_LIST_WIDTH_PX = 640;
// Phải khớp min-width của .previewPaneColumn trong _PhvbMag.preview.scss
const MIN_PREVIEW_WIDTH_PX = 360;
// Phải khớp width của .libraryResizeDivider trong _PhvbMag.animations.scss
const DIVIDER_WIDTH_PX = 6;

function clampSidebarUnits(units: number): number {
  return Math.max(MIN_UNITS, Math.min(MAX_UNITS, units));
}

function clampListPaneWidth(widthPx: number): number {
  return Math.max(MIN_LIST_WIDTH_PX, Math.min(MAX_LIST_WIDTH_PX, widthPx));
}

interface IPhvbMagLibraryViewProps {
  documentContext: IPhvbDocumentContext;
}

interface IFolderTreeNodeProps {
  folder: ILibraryFolderEntry;
  depth: number;
  childFoldersByPath: Record<string, ILibraryFolderEntry[]>;
  expandedPaths: Set<string>;
  selectedFolderId?: number;
  onToggleExpand: (folderPath: string) => void;
  onSelectFolder: (folder: ILibraryFolderEntry) => void;
}

function FolderTreeNode(props: IFolderTreeNodeProps): React.ReactElement {
  const {
    folder,
    depth,
    childFoldersByPath,
    expandedPaths,
    selectedFolderId,
    onToggleExpand,
    onSelectFolder
  } = props;
  const children = childFoldersByPath[folder.serverRelativePath] || [];
  const hasChildren = folder.hasChildFolders;
  const isExpanded = expandedPaths.has(folder.serverRelativePath);
  const isSelected = selectedFolderId === folder.id;

  return (
    <>
      <PhvbMagFolderTreeNode
        name={folder.name}
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        isSelected={isSelected}
        onToggleExpand={() => onToggleExpand(folder.serverRelativePath)}
        onSelect={() => onSelectFolder(folder)}
      />

      {isExpanded && children.map(child => (
        <FolderTreeNode
          key={child.serverRelativePath}
          folder={child}
          depth={depth + 1}
          childFoldersByPath={childFoldersByPath}
          expandedPaths={expandedPaths}
          selectedFolderId={selectedFolderId}
          onToggleExpand={onToggleExpand}
          onSelectFolder={onSelectFolder}
        />
      ))}
    </>
  );
}

interface IDocumentListItemProps {
  document: IBanHanhLibraryItem;
  showDownload: boolean;
}

interface ISearchFolderListItemProps {
  folder: IBanHanhLibraryItem;
  onSelectFolder: (folder: ILibraryFolderEntry) => void;
}

function SearchFolderListItem(props: ISearchFolderListItemProps): React.ReactElement {
  const { folder, onSelectFolder } = props;

  const handleSelect = (): void => {
    onSelectFolder({
      id: folder.id,
      name: folder.name,
      serverRelativePath: folder.fileRef,
      hasChildFolders: true
    });
  };

  return (
    <article className={styles.libraryDocumentItem}>
      <div className={styles.libraryDocumentFileType}>
        <FolderAccentIcon className={styles.libraryFolderIconLg} />
      </div>

      <div className={styles.libraryDocumentContent}>
        <div className={styles.libraryDocumentTitleRow}>
          <button
            type="button"
            className={styles.libraryDocumentTitle}
            onClick={handleSelect}
            title={folder.name}
          >
            {folder.name}
          </button>
        </div>
        <p className={styles.libraryDocumentSummary}>Thư mục</p>
      </div>
    </article>
  );
}

function DocumentListItem(props: IDocumentListItemProps): React.ReactElement {
  const { document, showDownload } = props;
  const effectiveDate = formatBanHanhDate(document.hieuLucTu) || 'Chưa xác định';
  const contactPerson = resolveLibraryContactPerson(document.lienHe);

  return (
    <PhvbMagLibraryDocumentCard
      document={document}
      showDownload={showDownload}
      badgeContent={document.isFormAttachment ? (
        <span className={styles.recentFormBadge}>Biểu mẫu</span>
      ) : null}
      metaContent={(
        <>
          <span className={styles.libraryDocumentContact}>
            <strong>Đầu mối liên hệ:</strong> {contactPerson}
          </span>
          <span className={styles.libraryDocumentEffectiveDate}>
            <strong>Ngày hiệu lực:</strong> {effectiveDate}
          </span>
        </>
      )}
    />
  );
}

export function PhvbMagLibraryView(props: IPhvbMagLibraryViewProps): React.ReactElement {
  const { documentContext } = props;
  const library = usePhvbLibrary(documentContext);
  const libraryViewRef = React.useRef<HTMLDivElement>(null);
  const listPaneRef = React.useRef<HTMLElement>(null);
  const [sidebarWidthUnits, setSidebarWidthUnits] = React.useState<number>(
    () => readStoredNumber('local', LIBRARY_SIDEBAR_UNITS_KEY, DEFAULT_UNITS, clampSidebarUnits)
  );
  const [sidebarWidthUnitsWithPreview, setSidebarWidthUnitsWithPreview] = React.useState<number>(
    () => readStoredNumber(
      'local',
      LIBRARY_SIDEBAR_UNITS_PREVIEW_KEY,
      DEFAULT_UNITS_WITH_PREVIEW,
      clampSidebarUnits
    )
  );
  // undefined = user chưa từng kéo divider này, sẽ đo theo tỉ lệ 2:3:5 lúc cột
  // xem trước mở. Clamp lúc đọc dùng max tĩnh (MAX_LIST_WIDTH_PX): lúc này
  // listPaneRef chưa attach nên chưa tính được max động theo chỗ trống thực tế.
  const [listPaneWidthPx, setListPaneWidthPx] = React.useState<number | undefined>(
    () => readStoredNumberOptional('local', LIBRARY_LIST_WIDTH_KEY, clampListPaneWidth)
  );
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const preview = usePhvbDocumentPreviewOptional();
  const isNarrowViewport = usePhvbNarrowViewport();
  // Below the stacking breakpoint, and in fullscreen, the overlay takes over.
  const isPreviewColumnVisible = !isNarrowViewport && !preview?.isFullscreen;
  // Bố cục 3 cột: thư mục | danh sách | xem trước, mặc định 2:3:5.
  const isThreePaneLayout = isPreviewColumnVisible && !!preview?.previewDocument;
  const activeSidebarUnits = isThreePaneLayout ? sidebarWidthUnitsWithPreview : sidebarWidthUnits;
  const activeSidebarDefaultUnits = isThreePaneLayout ? DEFAULT_UNITS_WITH_PREVIEW : DEFAULT_UNITS;
  const effectiveListPaneWidthPx = listPaneWidthPx ?? DEFAULT_LIST_WIDTH_PX;

  // Search results mix folders in; only files are previewable.
  usePhvbRegisterPreviewDocuments(React.useMemo(
    () => library.documents.filter(item => item.fsObjType !== 1),
    [library.documents]
  ));
  const totalPages = library.totalCount !== undefined
    ? Math.max(1, Math.ceil(library.totalCount / library.pageSize))
    : undefined;
  const canGoPrevious = library.page > 1;
  const canGoNext = library.hasNextPage
    || (totalPages !== undefined && library.page < totalPages);
  const itemCountOnPage = library.documents.length;
  const rangeStart = itemCountOnPage === 0
    ? 0
    : ((library.page - 1) * library.pageSize) + 1;
  const rangeEnd = itemCountOnPage === 0
    ? 0
    : ((library.page - 1) * library.pageSize) + itemCountOnPage;
  const rangeLabel = library.totalCount !== undefined
    ? `${rangeStart}-${Math.min(rangeEnd, library.totalCount)}/${library.totalCount}`
    : (library.hasNextPage
      ? `${rangeStart}-${rangeEnd}+`
      : (itemCountOnPage === 0 ? `Trang ${library.page}` : `${rangeStart}-${rangeEnd}`));
  const isBrowseLanding = !library.isSearchMode && !library.selectedFolder;
  const showPager = !isBrowseLanding
    && !library.isLoadingDocuments
    && !library.isResolvingFolder
    && (itemCountOnPage > 0 || canGoPrevious || canGoNext || library.page > 1);
  const isFolderPaneVisible = library.isFolderPaneVisible;
  const documentCount = library.totalCount ?? itemCountOnPage;
  const contextLabel = library.isSearchMode
    ? 'Kết quả tìm kiếm'
    : (library.selectedFolder?.name || 'Tất cả thư mục');

  const applySidebarUnits = React.useCallback((units: number): void => {
    const nextUnits = clampSidebarUnits(units);

    if (isThreePaneLayout) {
      setSidebarWidthUnitsWithPreview(nextUnits);
      writeStoredNumber('local', LIBRARY_SIDEBAR_UNITS_PREVIEW_KEY, nextUnits);
      return;
    }

    setSidebarWidthUnits(nextUnits);
    writeStoredNumber('local', LIBRARY_SIDEBAR_UNITS_KEY, nextUnits);
  }, [isThreePaneLayout]);

  const updateUnitsFromClientX = React.useCallback((clientX: number): void => {
    const container = libraryViewRef.current;

    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();

    if (containerRect.width <= 0) {
      return;
    }

    const widthPercentage = ((clientX - containerRect.left) / containerRect.width) * 100;
    const units = Math.round((widthPercentage / 100) * TOTAL_UNITS);
    applySidebarUnits(units);
  }, [applySidebarUnits]);

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      library.submitSearch();
    }
  };

  const handleDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handleDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    updateUnitsFromClientX(event.clientX);
  };

  const handleDividerPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
  };

  const handleDividerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      applySidebarUnits(activeSidebarUnits - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      applySidebarUnits(activeSidebarUnits + 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      applySidebarUnits(activeSidebarDefaultUnits);
    }
  };

  const handleDividerDoubleClick = (): void => {
    applySidebarUnits(activeSidebarDefaultUnits);
  };

  const getListPaneMaxWidth = React.useCallback((): number => {
    const listPane = listPaneRef.current;
    const container = libraryViewRef.current;

    if (!listPane || !container) {
      return MAX_LIST_WIDTH_PX;
    }

    const listPaneRect = listPane.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const availableForListAndPreview = containerRect.right - listPaneRect.left - DIVIDER_WIDTH_PX;

    return Math.max(
      MIN_LIST_WIDTH_PX,
      Math.min(MAX_LIST_WIDTH_PX, availableForListAndPreview - MIN_PREVIEW_WIDTH_PX)
    );
  }, []);

  const applyListPaneWidth = React.useCallback((widthPx: number): void => {
    const nextWidth = Math.max(MIN_LIST_WIDTH_PX, Math.min(getListPaneMaxWidth(), widthPx));
    setListPaneWidthPx(nextWidth);
    writeStoredNumber('local', LIBRARY_LIST_WIDTH_KEY, nextWidth);
  }, [getListPaneMaxWidth]);

  /**
   * Bố cục 3 cột mặc định 2:3:5. Cột thư mục tính theo % nên đã đúng ngay từ
   * state, riêng cột danh sách đo theo px nên phải chờ biết bề rộng container.
   *
   * useLayoutEffect (không phải useEffect) để sửa bề rộng trước khi trình duyệt
   * paint, tránh nháy DEFAULT_LIST_WIDTH_PX rồi mới nhảy sang giá trị đo được.
   */
  React.useLayoutEffect(() => {
    if (!isThreePaneLayout || listPaneWidthPx !== undefined) {
      return;
    }

    const container = libraryViewRef.current;
    const containerWidth = container ? container.getBoundingClientRect().width : 0;

    if (containerWidth <= 0) {
      return;
    }

    // Chỉ set state, KHÔNG ghi localStorage: đây là mặc định chứ chưa phải lựa
    // chọn của user. Lần mở sau sẽ đo lại theo bề rộng web part lúc đó.
    setListPaneWidthPx(
      clampListPaneWidth(Math.round(containerWidth * DEFAULT_LIST_RATIO_WITH_PREVIEW))
    );
  }, [isThreePaneLayout, listPaneWidthPx]);

  /** Về mặc định = quên giá trị đã lưu, để layout effect đo lại tỉ lệ 3/10. */
  const resetListPaneWidth = React.useCallback((): void => {
    removeStoredKey('local', LIBRARY_LIST_WIDTH_KEY);
    setListPaneWidthPx(undefined);
  }, []);

  const updateListPaneWidthFromClientX = React.useCallback((clientX: number): void => {
    const listPane = listPaneRef.current;

    if (!listPane) {
      return;
    }

    const listPaneRect = listPane.getBoundingClientRect();
    applyListPaneWidth(clientX - listPaneRect.left);
  }, [applyListPaneWidth]);

  const handleListDividerPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handleListDividerPointerMove = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }

    updateListPaneWidthFromClientX(event.clientX);
  };

  const handleListDividerPointerUp = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setIsDragging(false);
  };

  const handleListDividerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      applyListPaneWidth(effectiveListPaneWidthPx - 20);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      applyListPaneWidth(effectiveListPaneWidthPx + 20);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      resetListPaneWidth();
    }
  };

  const handleListDividerDoubleClick = (): void => {
    resetListPaneWidth();
  };

  const libraryViewClassName = isDragging
    ? `${styles.libraryView} ${styles.libraryViewDragging}`
    : styles.libraryView;

  const libraryViewStyle = {
    ...(isFolderPaneVisible ? {
      ['--sidebar-width-units' as string]: activeSidebarUnits,
      ['--total-units' as string]: TOTAL_UNITS
    } : {}),
    ['--list-pane-width-px' as string]: `${effectiveListPaneWidthPx}px`
  } as React.CSSProperties;

  return (
    <div
      ref={libraryViewRef}
      className={libraryViewClassName}
      style={libraryViewStyle}
    >
      <header className={styles.libraryScreenHeader}>
        <h2 className={styles.libraryScreenTitle}>Thư viện tài liệu</h2>
        <div className={`${styles.librarySearchBar} ${library.isSearchMode ? styles.librarySearchBarActive : ''}`}>
          {library.isSearchMode ? (
            <TooltipHost content="Thoát tìm kiếm">
              <button
                type="button"
                className={styles.librarySearchBackButton}
                onClick={library.exitSearch}
                aria-label="Thoát tìm kiếm"
              >
                <SidebarCollapseIcon />
              </button>
            </TooltipHost>
          ) : null}

          <input
            type="text"
            className={styles.librarySearchInput}
            placeholder="Tìm kiếm thư mục, tài liệu..."
            value={library.draftQuery}
            onChange={event => library.setDraftQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Tìm kiếm thư mục và tài liệu"
          />

          {library.draftQuery.trim() ? (
            <TooltipHost content="Xóa nội dung tìm kiếm">
              <button
                type="button"
                className={styles.librarySearchClearButton}
                onClick={() => library.setDraftQuery('')}
                aria-label="Xóa nội dung tìm kiếm"
              >
                <CloseIcon />
              </button>
            </TooltipHost>
          ) : null}

          <TooltipHost content="Tìm kiếm">
            <button
              type="button"
              className={styles.librarySearchSubmitButton}
              onClick={library.submitSearch}
              aria-label="Tìm kiếm"
            >
              <SearchIcon />
            </button>
          </TooltipHost>
        </div>
      </header>

      <div className={styles.libraryMain}>
        {isFolderPaneVisible ? (
          <>
            <aside className={styles.folderPane}>
              <div className={styles.libraryColumnHeader}>
                <FolderAccentIcon className={styles.libraryColumnHeaderIconFolder} />
                <span>Danh sách thư mục</span>
              </div>

              <div className={styles.folderList}>
                {library.isLoadingFolders ? (
                  <PhvbMagSkeleton variant="line" count={6} />
                ) : null}

                {!library.isLoadingFolders && library.errorMessage && library.rootFolders.length === 0 ? (
                  <div className={styles.libraryErrorBanner} role="alert">
                    {library.errorMessage}
                  </div>
                ) : null}

                {!library.isLoadingFolders && !library.errorMessage && library.rootFolders.length === 0 ? (
                  <p className={styles.libraryStatusMessage}>Chưa có thư mục để hiển thị.</p>
                ) : null}

                {!library.isLoadingFolders && library.rootFolders.map(folder => (
                  <FolderTreeNode
                    key={folder.serverRelativePath}
                    folder={folder}
                    depth={0}
                    childFoldersByPath={library.childFoldersByPath}
                    expandedPaths={library.expandedPaths}
                    selectedFolderId={library.selectedFolder?.id}
                    onToggleExpand={library.toggleFolderExpand}
                    onSelectFolder={library.selectFolder}
                  />
                ))}
              </div>
            </aside>

            <div
              className={styles.libraryResizeDivider}
              onPointerDown={handleDividerPointerDown}
              onPointerMove={handleDividerPointerMove}
              onPointerUp={handleDividerPointerUp}
              onPointerCancel={handleDividerPointerUp}
              onKeyDown={handleDividerKeyDown}
              onDoubleClick={handleDividerDoubleClick}
              title="Kéo để thay đổi kích thước"
              role="separator"
              aria-orientation="vertical"
              aria-valuemin={MIN_UNITS}
              aria-valuemax={MAX_UNITS}
              aria-valuenow={activeSidebarUnits}
              aria-label="Thay đổi kích thước khung thư viện"
              tabIndex={0}
            />
          </>
        ) : null}

        <section
          ref={listPaneRef}
          className={[
            styles.libraryContentPane,
            isThreePaneLayout ? styles.libraryListPaneWithPreview : ''
          ].filter(Boolean).join(' ')}
        >
          <div className={styles.libraryColumnHeader}>
            <DocumentFileIcon className={styles.libraryColumnHeaderIconDocument} />
            <span>Tài liệu ({documentCount})</span>
            <span className={styles.libraryColumnContext} title={contextLabel}>
              {contextLabel}
            </span>
          </div>

          <div className={styles.libraryContentPaneBody}>

            {library.errorMessage ? (
              <div className={styles.libraryErrorBanner} role="alert">{library.errorMessage}</div>
            ) : null}

            {library.isSearchMode && library.submittedQuery ? (
              <div className={styles.libraryResultsSummary}>
                <span>
                  Kết quả cho <strong>{library.submittedQuery}</strong>
                  {library.totalCount !== undefined ? ` (${library.totalCount})` : ''}
                </span>
              </div>
            ) : null}

            <div className={styles.libraryListBoard}>
              <div
                className={[styles.libraryListScroll, styles.libraryDocumentList].join(' ')}
                aria-live="polite"
              >
                {(library.isLoadingDocuments || library.isResolvingFolder) && (
                  <PhvbMagSkeleton variant="card" count={5} />
                )}

                {!library.isLoadingDocuments && !library.isResolvingFolder && library.documents.length === 0 && (
                  <PhvbMagEmptyState
                    message={library.isSearchMode
                      ? 'Không tìm thấy kết quả. Hãy thử từ khóa khác hoặc thoát tìm kiếm.'
                      : (library.selectedFolder
                        ? 'Không có tài liệu trong thư mục này.'
                        : 'Vui lòng lựa chọn thư mục trong danh mục bên trái hoặc sử dụng chức năng tìm kiếm phía trên để tra cứu tài liệu.')}
                  />
                )}

                {!library.isLoadingDocuments && !library.isResolvingFolder && library.documents.map(document => (
                  document.fsObjType === 1 ? (
                    <SearchFolderListItem
                      key={`folder-${document.id}-${document.fileRef}`}
                      folder={document}
                      onSelectFolder={library.selectFolder}
                    />
                  ) : (
                    <DocumentListItem
                      key={`${document.id}-${document.fileRef}`}
                      document={document}
                      showDownload={!library.isSearchMode}
                    />
                  )
                ))}
              </div>

              {showPager ? (
                <div className={styles.libraryPagination}>
                  <div className={styles.requestPager}>
                    <span className={styles.requestRangeText}>{rangeLabel}</span>
                    <button
                      type="button"
                      className={styles.requestPageButton}
                      disabled={!canGoPrevious || library.isLoadingDocuments}
                      onClick={() => library.goToPage(library.page - 1)}
                      aria-label="Trang trước"
                    >
                      <PaginationPreviousIcon />
                    </button>
                    <button
                      type="button"
                      className={styles.requestPageButton}
                      disabled={!canGoNext || library.isLoadingDocuments}
                      onClick={() => library.goToPage(library.page + 1)}
                      aria-label="Trang sau"
                    >
                      <PaginationNextIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {isThreePaneLayout ? (
          <div
            className={styles.libraryResizeDivider}
            onPointerDown={handleListDividerPointerDown}
            onPointerMove={handleListDividerPointerMove}
            onPointerUp={handleListDividerPointerUp}
            onPointerCancel={handleListDividerPointerUp}
            onKeyDown={handleListDividerKeyDown}
            onDoubleClick={handleListDividerDoubleClick}
            title="Kéo để thay đổi kích thước"
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={MIN_LIST_WIDTH_PX}
            aria-valuemax={MAX_LIST_WIDTH_PX}
            aria-valuenow={effectiveListPaneWidthPx}
            aria-label="Thay đổi kích thước khung danh sách tài liệu"
            tabIndex={0}
          />
        ) : null}

        {isThreePaneLayout && preview?.previewDocument ? (
          <PhvbMagDocumentPreview
            document={preview.previewDocument}
            libraryTitle={resolveIssuanceLibraryTitle(documentContext.issuanceLibraryTitle)}
            variant="column"
            isFullscreen={preview.isFullscreen}
            hasPrevious={preview.hasPrevious}
            hasNext={preview.hasNext}
            onToggleFullscreen={preview.toggleFullscreen}
            onPrevious={preview.goPrevious}
            onNext={preview.goNext}
            onClose={preview.closePreview}
            onCopyLink={preview.copyPreviewLink}
          />
        ) : null}
      </div>
    </div>
  );
}
