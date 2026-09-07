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

const LIBRARY_SIDEBAR_UNITS_KEY = 'phvbMag.librarySidebarUnits';
const TOTAL_UNITS = 10;
const DEFAULT_UNITS = 5;
const MIN_UNITS = 2;
const MAX_UNITS = 7;

function clampSidebarUnits(units: number): number {
  return Math.max(MIN_UNITS, Math.min(MAX_UNITS, units));
}

function readStoredUnits(): number {
  try {
    const raw = sessionStorage.getItem(LIBRARY_SIDEBAR_UNITS_KEY);

    if (!raw) {
      return DEFAULT_UNITS;
    }

    const parsed = parseInt(raw, 10);

    if (isNaN(parsed)) {
      return DEFAULT_UNITS;
    }

    return clampSidebarUnits(parsed);
  } catch {
    return DEFAULT_UNITS;
  }
}

function writeStoredUnits(units: number): void {
  try {
    sessionStorage.setItem(LIBRARY_SIDEBAR_UNITS_KEY, String(units));
  } catch {
    // Ignore storage quota / private mode failures.
  }
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
  const [sidebarWidthUnits, setSidebarWidthUnits] = React.useState<number>(readStoredUnits);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const preview = usePhvbDocumentPreviewOptional();
  const isNarrowViewport = usePhvbNarrowViewport();
  // Below the stacking breakpoint, and in fullscreen, the overlay takes over.
  const isPreviewColumnVisible = !isNarrowViewport && !preview?.isFullscreen;

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
    setSidebarWidthUnits(nextUnits);
    writeStoredUnits(nextUnits);
  }, []);

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
      applySidebarUnits(sidebarWidthUnits - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      applySidebarUnits(sidebarWidthUnits + 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      applySidebarUnits(DEFAULT_UNITS);
    }
  };

  const handleDividerDoubleClick = (): void => {
    applySidebarUnits(DEFAULT_UNITS);
  };

  const libraryViewClassName = isDragging
    ? `${styles.libraryView} ${styles.libraryViewDragging}`
    : styles.libraryView;

  const libraryViewStyle = isFolderPaneVisible
    ? ({
      ['--sidebar-width-units' as string]: sidebarWidthUnits,
      ['--total-units' as string]: TOTAL_UNITS
    } as React.CSSProperties)
    : undefined;

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
              aria-valuenow={sidebarWidthUnits}
              aria-label="Thay đổi kích thước khung thư viện"
              tabIndex={0}
            />
          </>
        ) : null}

        <section
          className={[
            styles.libraryContentPane,
            isPreviewColumnVisible && preview?.previewDocument ? styles.libraryListPaneWithPreview : ''
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

        {isPreviewColumnVisible && preview?.previewDocument ? (
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
