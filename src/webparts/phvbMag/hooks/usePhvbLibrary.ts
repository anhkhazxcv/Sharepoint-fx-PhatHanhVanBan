import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LIBRARY_CACHE_STALE_MS,
  LIBRARY_FILES_PAGE_SIZE,
  LIBRARY_PAGE_CACHE_LIMIT,
  LIBRARY_SEARCH_PAGE_SIZE
} from '../config/PhvbMag.configuration';
import type {
  IBanHanhLibraryItem,
  ILibraryFolderEntry,
  ILibraryPagedFilesResult,
  ILibrarySearchPageResult,
  IPhvbDocumentContext
} from '../models/PhvbMag.models';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import {
  buildFolderAncestorData,
  buildLibraryFolderChildrenIndex,
  type ILibraryFolderIndex
} from '../utils/PhvbMagBanHanh.tree';
import {
  buildLibraryAllPath,
  buildLibraryFolderPath,
  buildLibrarySearchPath,
  parseLibraryRoute
} from '../utils/PhvbMagLibrary.utils';

interface ICacheEntry<TData> {
  data: TData;
  fetchedAt: number;
}

interface IUsePhvbLibraryResult {
  draftQuery: string;
  submittedQuery?: string;
  isSearchMode: boolean;
  isFolderPaneVisible: boolean;
  rootFolders: ILibraryFolderEntry[];
  childFoldersByPath: Record<string, ILibraryFolderEntry[]>;
  expandedPaths: Set<string>;
  selectedFolder?: ILibraryFolderEntry;
  documents: IBanHanhLibraryItem[];
  page: number;
  pageSize: number;
  totalCount?: number;
  hasNextPage: boolean;
  isLoadingFolders: boolean;
  isLoadingDocuments: boolean;
  isResolvingFolder: boolean;
  errorMessage?: string;
  setDraftQuery: (value: string) => void;
  toggleFolderExpand: (folderPath: string) => void;
  selectAll: () => void;
  selectFolder: (folder: ILibraryFolderEntry) => void;
  submitSearch: () => void;
  exitSearch: () => void;
  goToPage: (page: number) => void;
}

function isCacheFresh<TData>(entry: ICacheEntry<TData> | undefined): boolean {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < LIBRARY_CACHE_STALE_MS;
}

interface ICacheStore<TData> {
  entries: Record<string, ICacheEntry<TData>>;
  order: string[];
}

function createCacheStore<TData>(): ICacheStore<TData> {
  return {
    entries: {},
    order: []
  };
}

function getCacheEntry<TData>(store: ICacheStore<TData>, key: string): ICacheEntry<TData> | undefined {
  return store.entries[key];
}

function setCacheEntry<TData>(store: ICacheStore<TData>, key: string, entry: ICacheEntry<TData>): void {
  if (!store.entries[key]) {
    store.order.push(key);
  }

  store.entries[key] = entry;

  while (store.order.length > LIBRARY_PAGE_CACHE_LIMIT) {
    const firstKey = store.order.shift();

    if (!firstKey) {
      break;
    }

    delete store.entries[firstKey];
  }
}

function clearCacheStore<TData>(store: ICacheStore<TData>): void {
  store.entries = {};
  store.order = [];
}

function applyFolderIndex(
  index: ILibraryFolderIndex,
  setLibraryRootPath: (value: string) => void,
  setChildFoldersByPath: (value: Record<string, ILibraryFolderEntry[]>) => void,
  setRootFolders: (value: ILibraryFolderEntry[]) => void,
  folderIndexRef: MutableRefObject<ILibraryFolderIndex | undefined>
): void {
  folderIndexRef.current = index;
  setLibraryRootPath(index.libraryRootPath);
  setChildFoldersByPath(index.childFoldersByPath);
  setRootFolders(index.childFoldersByPath[index.libraryRootPath] || []);
}

export function usePhvbLibrary(context: IPhvbDocumentContext): IUsePhvbLibraryResult {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = useMemo(
    () => parseLibraryRoute(location.pathname, location.search),
    [location.pathname, location.search]
  );

  const [draftQuery, setDraftQuery] = useState<string>('');
  const [rootFolders, setRootFolders] = useState<ILibraryFolderEntry[]>([]);
  const [childFoldersByPath, setChildFoldersByPath] = useState<Record<string, ILibraryFolderEntry[]>>({});
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set<string>());
  const [selectedFolder, setSelectedFolder] = useState<ILibraryFolderEntry | undefined>(undefined);
  const [documents, setDocuments] = useState<IBanHanhLibraryItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(LIBRARY_FILES_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoadingFolders, setIsLoadingFolders] = useState<boolean>(true);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(true);
  const [isResolvingFolder, setIsResolvingFolder] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [libraryRootPath, setLibraryRootPath] = useState<string>('');

  const folderIndexCacheRef = useRef<ICacheStore<ILibraryFolderIndex>>(createCacheStore<ILibraryFolderIndex>());
  const folderIndexRef = useRef<ILibraryFolderIndex | undefined>(undefined);
  const pageCacheRef = useRef<ICacheStore<ILibraryPagedFilesResult | ILibrarySearchPageResult>>(createCacheStore<ILibraryPagedFilesResult | ILibrarySearchPageResult>());
  const inFlightRef = useRef<Record<string, Promise<unknown>>>({});
  const requestSequenceRef = useRef<number>(0);

  const isSearchMode = routeState?.mode === 'search';
  const submittedQuery = routeState?.mode === 'search' ? routeState.query : undefined;
  const isFolderPaneVisible = !isSearchMode;

  const getCacheScope = useCallback((): string => {
    return [
      context.sourceSiteUrl || '',
      context.currentWebUrl || '',
      context.siteCollectionUrl || '',
      context.issuanceLibraryTitle || ''
    ].join('|');
  }, [context.currentWebUrl, context.issuanceLibraryTitle, context.siteCollectionUrl, context.sourceSiteUrl]);

  const runDeduped = useCallback(async <TResult,>(
    cacheKey: string,
    runner: () => Promise<TResult>
  ): Promise<TResult> => {
    const existing = inFlightRef.current[cacheKey] as Promise<TResult> | undefined;

    if (existing) {
      return existing;
    }

    const promise = runner()
      .then(result => {
        delete inFlightRef.current[cacheKey];
        return result;
      })
      .catch(error => {
        delete inFlightRef.current[cacheKey];
        throw error;
      });
    inFlightRef.current[cacheKey] = promise;
    return promise;
  }, []);

  const clearCaches = useCallback((): void => {
    clearCacheStore(folderIndexCacheRef.current);
    clearCacheStore(pageCacheRef.current);
    folderIndexRef.current = undefined;
    inFlightRef.current = {};
  }, []);

  useEffect(() => {
    requestSequenceRef.current += 1;
    clearCaches();
    setRootFolders([]);
    setChildFoldersByPath({});
    setExpandedPaths(new Set<string>());
    setSelectedFolder(undefined);
    setDocuments([]);
    setLibraryRootPath('');
  }, [clearCaches, getCacheScope]);

  useEffect(() => {
    if (routeState?.mode === 'search') {
      setDraftQuery(routeState.query || '');
    }
  }, [routeState]);

  useEffect(() => {
    if (!routeState) {
      return;
    }

    if (routeState.mode !== 'search' && location.pathname === '/tab/ThuVienTaiLieu') {
      navigate(buildLibraryAllPath(1), { replace: true });
    }
  }, [location.pathname, navigate, routeState]);

  const loadRootFolders = useCallback(async (): Promise<void> => {
    setIsLoadingFolders(true);
    setErrorMessage(undefined);

    try {
      const cacheKey = `${getCacheScope()}|folder-index`;
      const cached = getCacheEntry(folderIndexCacheRef.current, cacheKey);

      if (cached && isCacheFresh(cached)) {
        applyFolderIndex(
          cached.data,
          setLibraryRootPath,
          setChildFoldersByPath,
          setRootFolders,
          folderIndexRef
        );
        return;
      }

      const index = await runDeduped(cacheKey, async () => {
        const folders = await phvbDocumentLibraryService.loadBanHanhLibraryFolders(context);
        return buildLibraryFolderChildrenIndex(folders);
      });
      setCacheEntry(folderIndexCacheRef.current, cacheKey, {
        data: index,
        fetchedAt: Date.now()
      });
      applyFolderIndex(
        index,
        setLibraryRootPath,
        setChildFoldersByPath,
        setRootFolders,
        folderIndexRef
      );
    } catch (error) {
      setRootFolders([]);
      setChildFoldersByPath({});
      folderIndexRef.current = undefined;
      setLibraryRootPath('');
      setErrorMessage(error instanceof Error ? error.message : 'Không tải được danh mục thư mục.');
    } finally {
      setIsLoadingFolders(false);
    }
  }, [context, getCacheScope, runDeduped]);

  useEffect(() => {
    loadRootFolders().catch(() => undefined);
  }, [loadRootFolders]);

  const loadDocumentsForRoute = useCallback(async (): Promise<void> => {
    if (!routeState) {
      return;
    }

    if (!libraryRootPath || !folderIndexRef.current) {
      return;
    }

    // Mode /all: do not call Search — wait for folder select or explicit search submit.
    if (routeState.mode === 'all') {
      requestSequenceRef.current = requestSequenceRef.current + 1;
      setSelectedFolder(undefined);
      setDocuments([]);
      setTotalCount(undefined);
      setHasNextPage(false);
      setPage(1);
      setPageSize(LIBRARY_SEARCH_PAGE_SIZE);
      setIsLoadingDocuments(false);
      setIsResolvingFolder(false);
      setErrorMessage(undefined);
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setIsLoadingDocuments(true);
    setErrorMessage(undefined);

    try {
      if (routeState.mode === 'search') {
        if (!routeState.query) {
          setDocuments([]);
          setTotalCount(0);
          setHasNextPage(false);
          setPage(1);
          setPageSize(LIBRARY_SEARCH_PAGE_SIZE);
          return;
        }

        const cacheKey = `${getCacheScope()}|search:${routeState.query}:${routeState.page}`;
        const cached = getCacheEntry(pageCacheRef.current, cacheKey) as ICacheEntry<ILibrarySearchPageResult> | undefined;

        if (cached && isCacheFresh(cached)) {
          setDocuments(cached.data.items);
          setPage(cached.data.page);
          setPageSize(cached.data.pageSize);
          setTotalCount(cached.data.totalCount);
          setHasNextPage(cached.data.page * cached.data.pageSize < cached.data.totalCount);
          return;
        }

        const result = await runDeduped(cacheKey, () =>
          phvbDocumentLibraryService.searchLibraryDocuments(context, {
            query: routeState.query,
            page: routeState.page,
            pageSize: LIBRARY_SEARCH_PAGE_SIZE,
            libraryRootPath
          })
        );
        setCacheEntry(pageCacheRef.current, cacheKey, {
          data: result,
          fetchedAt: Date.now()
        });

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        setDocuments(result.items);
        setPage(result.page);
        setPageSize(result.pageSize);
        setTotalCount(result.totalCount);
        setHasNextPage(result.page * result.pageSize < result.totalCount);
        return;
      }

      if (routeState.mode === 'folder' && routeState.folderId) {
        setIsResolvingFolder(true);
        const folderIndex = folderIndexRef.current;
        const folder = folderIndex.folderById.get(routeState.folderId);

        if (!folder) {
          throw new Error(`Không tìm thấy thư mục ${routeState.folderId} trong danh mục thư viện.`);
        }

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        const ancestorData = buildFolderAncestorData(folderIndex, folder);

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        setSelectedFolder(folder);
        setExpandedPaths(previous => {
          let changed = false;
          const next = new Set<string>();
          previous.forEach(item => next.add(item));

          ancestorData.expandedPaths.forEach(path => {
            if (!next.has(path)) {
              next.add(path);
              changed = true;
            }
          });

          return changed ? next : previous;
        });
        setChildFoldersByPath(previous => {
          let next = previous;

          Object.keys(ancestorData.childFoldersByPath).forEach(path => {
            const children = ancestorData.childFoldersByPath[path];

            if (previous[path] !== children) {
              if (next === previous) {
                next = { ...previous };
              }

              next[path] = children;
            }
          });

          return next;
        });
        setIsResolvingFolder(false);

        const cacheKey = `${getCacheScope()}|files:${folder.id}:${routeState.page}`;
        const cached = getCacheEntry(pageCacheRef.current, cacheKey) as ICacheEntry<ILibraryPagedFilesResult> | undefined;

        if (cached && isCacheFresh(cached)) {
          setDocuments(cached.data.items);
          setPage(cached.data.page);
          setPageSize(cached.data.pageSize);
          setHasNextPage(cached.data.hasNextPage);
          setTotalCount(undefined);
          return;
        }

        const result = await runDeduped(cacheKey, () =>
          phvbDocumentLibraryService.listFolderFilesPage(
            context,
            folder.serverRelativePath,
            routeState.page,
            LIBRARY_FILES_PAGE_SIZE
          )
        );
        setCacheEntry(pageCacheRef.current, cacheKey, {
          data: result,
          fetchedAt: Date.now()
        });

        if (requestSequence !== requestSequenceRef.current) {
          return;
        }

        setDocuments(result.items);
        setPage(result.page);
        setPageSize(result.pageSize);
        setHasNextPage(result.hasNextPage);
        setTotalCount(undefined);
        return;
      }
    } catch (error) {
      if (requestSequence !== requestSequenceRef.current) {
        return;
      }

      setDocuments([]);
      setHasNextPage(false);
      setErrorMessage(error instanceof Error ? error.message : 'Không tải được danh sách tài liệu.');
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsLoadingDocuments(false);
        setIsResolvingFolder(false);
      }
    }
  }, [
    context,
    getCacheScope,
    libraryRootPath,
    routeState,
    runDeduped
  ]);

  useEffect(() => {
    loadDocumentsForRoute().catch(() => undefined);
  }, [loadDocumentsForRoute]);

  const toggleFolderExpand = useCallback((folderPath: string): void => {
    setExpandedPaths(previous => {
      const next = new Set<string>();
      previous.forEach(item => next.add(item));

      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }

      return next;
    });
  }, []);

  const selectAll = useCallback((): void => {
    navigate(buildLibraryAllPath(1));
  }, [navigate]);

  const selectFolder = useCallback((folder: ILibraryFolderEntry): void => {
    navigate(buildLibraryFolderPath(folder.id, 1));
  }, [navigate]);

  const submitSearch = useCallback((): void => {
    const trimmed = draftQuery.trim();

    if (!trimmed) {
      return;
    }

    navigate(buildLibrarySearchPath(trimmed, 1));
  }, [draftQuery, navigate]);

  const exitSearch = useCallback((): void => {
    setDraftQuery('');
    navigate(buildLibraryAllPath(1));
  }, [navigate]);

  const goToPage = useCallback((nextPage: number): void => {
    if (!routeState || nextPage < 1) {
      return;
    }

    if (routeState.mode === 'search' && routeState.query) {
      navigate(buildLibrarySearchPath(routeState.query, nextPage));
      return;
    }

    if (routeState.mode === 'folder' && routeState.folderId) {
      navigate(buildLibraryFolderPath(routeState.folderId, nextPage));
      return;
    }

    navigate(buildLibraryAllPath(nextPage));
  }, [navigate, routeState]);

  return {
    draftQuery,
    submittedQuery,
    isSearchMode,
    isFolderPaneVisible,
    rootFolders,
    childFoldersByPath,
    expandedPaths,
    selectedFolder,
    documents,
    page,
    pageSize,
    totalCount,
    hasNextPage,
    isLoadingFolders,
    isLoadingDocuments,
    isResolvingFolder,
    errorMessage,
    setDraftQuery,
    toggleFolderExpand,
    selectAll,
    selectFolder,
    submitSearch,
    exitSearch,
    goToPage
  };
}
