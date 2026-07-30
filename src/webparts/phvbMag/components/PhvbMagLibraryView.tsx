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
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagLibraryDocumentCard } from './PhvbMagLibraryDocumentCard';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
import { PhvbMagSkeleton } from './PhvbMagSkeleton';
import {
  CloseIcon,
  FolderAccentIcon,
  FolderTreeChevronDownIcon,
  FolderTreeChevronRightIcon,
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
      <div
        className={`${styles.libraryFolderNode} ${isSelected ? styles.libraryFolderNodeActive : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        <button
          type="button"
          className={styles.libraryFolderChevron}
          onClick={event => {
            event.stopPropagation();
            onToggleExpand(folder.serverRelativePath);
          }}
          aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
        >
          {hasChildren ? (
            isExpanded ? (
              <FolderTreeChevronDownIcon className={styles.libraryFolderChevronIcon} />
            ) : (
              <FolderTreeChevronRightIcon className={styles.libraryFolderChevronIcon} />
            )
          ) : null}
        </button>
        <button
          type="button"
          className={styles.libraryFolderNodeButton}
          onClick={() => onSelectFolder(folder)}
          title={folder.name}
        >
          <FolderAccentIcon className={styles.libraryFolderIcon} />
          <span>{folder.name}</span>
        </button>
      </div>

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
        <FolderAccentIcon style={{ width: 22, height: 22, color: '#FFD700' }} />
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
      trackRecentView
      metaContent={(
        <>
          <span className={styles.libraryDocumentContact}>
            <strong>Người liên hệ:</strong> {contactPerson}
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
  const breadcrumbLabel = library.isSearchMode
    ? `Tìm kiếm: ${library.submittedQuery || library.draftQuery}`
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
      {isFolderPaneVisible ? (
        <>
          <aside className={styles.folderPane}>
            <div className={styles.folderPaneHeader}>
              <h4>Thư viện tài liệu</h4>
            </div>

            <div className={styles.folderList}>
              {library.isLoadingFolders ? (
                <PhvbMagSkeleton variant="line" count={6} />
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

      <section className={styles.libraryContentPane}>
        <PhvbMagPageHeader
          eyebrow="Thư viện"
          title="Thư viện tài liệu"
          subtitle="Duyệt thư mục và tìm kiếm văn bản nội bộ"
          className={styles.libraryPageHeader}
          headerActions={(
            <ol className={styles.libraryBreadcrumb} aria-label="Vị trí hiện tại">
              <li>Thư viện</li>
              <li><strong>{breadcrumbLabel}</strong></li>
            </ol>
          )}
        />

        <div className={styles.libraryContentPaneBody}>
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
            placeholder="Tìm kiếm thư mục và tài liệu..."
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

        {library.errorMessage ? (
          <div className={styles.libraryErrorBanner}>{library.errorMessage}</div>
        ) : null}

        {library.isSearchMode && library.submittedQuery ? (
          <div className={styles.libraryResultsSummary}>
            <span>
              Kết quả cho <strong>{library.submittedQuery}</strong>
              {library.totalCount !== undefined ? ` (${library.totalCount})` : ''}
            </span>
          </div>
        ) : null}

        <div className={styles.libraryDocumentList} aria-live="polite">
          {(library.isLoadingDocuments || library.isResolvingFolder) && (
            <PhvbMagSkeleton variant="card" count={5} />
          )}

          {!library.isLoadingDocuments && !library.isResolvingFolder && library.documents.length === 0 && (
            <PhvbMagEmptyState
              message={library.isSearchMode
                ? 'Không tìm thấy kết quả phù hợp.'
                : (library.selectedFolder
                  ? 'Không có tài liệu trong mục này.'
                  : 'Chọn thư mục bên trái hoặc tìm kiếm tài liệu.')}
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
      </section>
    </div>
  );
}
