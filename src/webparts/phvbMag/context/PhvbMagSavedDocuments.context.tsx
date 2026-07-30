import * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type {
  IBanHanhLibraryItem,
  IPhvbDocumentContext,
  ISavedDocumentDisplayItem,
  ISavedDocumentItem,
  TabType
} from '../models/PhvbMag.models';
import { phvbSavedDocumentsService } from '../services/PhvbMagSavedDocuments.service';
import { ToastService } from '../utils/ToastService';

const BOOKMARK_RELATED_TABS: TabType[] = ['ThuVienTaiLieu', 'MoiBanHanh', 'DaLuu'];

interface IBookmarkIndex {
  bookmarkIdByLibraryItemId: Record<number, number>;
  libraryItemIds: Set<number>;
}

interface IPhvbSavedDocumentsContextValue {
  isLoading: boolean;
  errorMessage?: string;
  savedCount: number;
  savedDisplayItems: ISavedDocumentDisplayItem[];
  isLoadingSavedView: boolean;
  ensureLoaded: () => void;
  loadSavedView: () => Promise<void>;
  isSaved: (libraryItemId: number) => boolean;
  isPending: (libraryItemId: number) => boolean;
  toggleSave: (document: IBanHanhLibraryItem) => Promise<void>;
}

const PhvbSavedDocumentsContext = createContext<IPhvbSavedDocumentsContextValue | undefined>(undefined);

function buildBookmarkIndex(bookmarks: ISavedDocumentItem[]): IBookmarkIndex {
  const bookmarkIdByLibraryItemId: Record<number, number> = {};
  const libraryItemIds = new Set<number>();

  bookmarks.forEach((bookmark: ISavedDocumentItem) => {
    bookmarkIdByLibraryItemId[bookmark.libraryItemId] = bookmark.id;
    libraryItemIds.add(bookmark.libraryItemId);
  });

  return {
    bookmarkIdByLibraryItemId,
    libraryItemIds
  };
}

function setsAreEqual(left: Set<number>, right: Set<number>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  let isEqual = true;
  left.forEach((value: number) => {
    if (!right.has(value)) {
      isEqual = false;
    }
  });

  return isEqual;
}

interface IPhvbSavedDocumentsProviderProps {
  documentContext: IPhvbDocumentContext;
  activeTab: TabType;
  children: React.ReactNode;
}

export function PhvbSavedDocumentsProvider(props: IPhvbSavedDocumentsProviderProps): React.ReactElement {
  const { documentContext, activeTab, children } = props;
  const { userEmail } = documentContext;

  const [bookmarks, setBookmarks] = useState<ISavedDocumentItem[]>([]);
  const [bookmarkIndex, setBookmarkIndex] = useState<IBookmarkIndex>(() => buildBookmarkIndex([]));
  const [pendingIds, setPendingIds] = useState<Set<number>>(() => new Set<number>());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [savedDisplayItems, setSavedDisplayItems] = useState<ISavedDocumentDisplayItem[]>([]);
  const [isLoadingSavedView, setIsLoadingSavedView] = useState<boolean>(false);

  const hasLoadedRef = useRef<boolean>(false);
  const loadPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const savedViewPromiseRef = useRef<Promise<void> | undefined>(undefined);

  const applyBookmarks = useCallback((nextBookmarks: ISavedDocumentItem[]) => {
    setBookmarks(nextBookmarks);
    setBookmarkIndex(buildBookmarkIndex(nextBookmarks));
  }, []);

  const loadBookmarks = useCallback(async (): Promise<void> => {
    if (!userEmail.trim()) {
      applyBookmarks([]);
      hasLoadedRef.current = true;
      return;
    }

    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    setIsLoading(true);

    const promise = phvbSavedDocumentsService.loadUserBookmarks(documentContext, userEmail)
      .then((nextBookmarks: ISavedDocumentItem[]) => {
        applyBookmarks(nextBookmarks);
        setErrorMessage(undefined);
        hasLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        applyBookmarks([]);
        setErrorMessage(phvbSavedDocumentsService.getRuntimeErrorMessage(error));
      })
      .then(() => {
        setIsLoading(false);
        loadPromiseRef.current = undefined;
      });

    loadPromiseRef.current = promise;
    return promise;
  }, [applyBookmarks, documentContext, userEmail]);

  const ensureLoaded = useCallback((): void => {
    if (hasLoadedRef.current || loadPromiseRef.current) {
      return;
    }

    loadBookmarks().catch(() => undefined);
  }, [loadBookmarks]);

  const loadSavedView = useCallback(async (): Promise<void> => {
    if (savedViewPromiseRef.current) {
      return savedViewPromiseRef.current;
    }

    setIsLoadingSavedView(true);

    const promise = phvbSavedDocumentsService.loadUserBookmarks(documentContext, userEmail)
      .then((nextBookmarks: ISavedDocumentItem[]) => {
        applyBookmarks(nextBookmarks);
        hasLoadedRef.current = true;
        setErrorMessage(undefined);
        return phvbSavedDocumentsService.hydrateSavedDocuments(documentContext, nextBookmarks);
      })
      .then((items: ISavedDocumentDisplayItem[]) => {
        setSavedDisplayItems(items);
      })
      .catch((error: unknown) => {
        setSavedDisplayItems([]);
        setErrorMessage(phvbSavedDocumentsService.getRuntimeErrorMessage(error));
      })
      .then(() => {
        setIsLoadingSavedView(false);
        savedViewPromiseRef.current = undefined;
      });

    savedViewPromiseRef.current = promise;
    return promise;
  }, [applyBookmarks, documentContext, userEmail]);

  React.useEffect(() => {
    if (BOOKMARK_RELATED_TABS.indexOf(activeTab) === -1) {
      return;
    }

    ensureLoaded();
  }, [activeTab, ensureLoaded]);

  React.useEffect(() => {
    hasLoadedRef.current = false;
    loadPromiseRef.current = undefined;
    savedViewPromiseRef.current = undefined;
    applyBookmarks([]);
    setSavedDisplayItems([]);
    setErrorMessage(undefined);
  }, [applyBookmarks, documentContext.currentWebUrl, documentContext.siteCollectionUrl, documentContext.sourceSiteUrl, userEmail]);

  const setPending = useCallback((libraryItemId: number, isPending: boolean) => {
    setPendingIds((previous: Set<number>) => {
      const next = new Set<number>();
      previous.forEach((id: number) => {
        next.add(id);
      });

      if (isPending) {
        next.add(libraryItemId);
      } else {
        next.delete(libraryItemId);
      }

      if (setsAreEqual(previous, next)) {
        return previous;
      }

      return next;
    });
  }, []);

  const toggleSave = useCallback(async (document: IBanHanhLibraryItem): Promise<void> => {
    if (!userEmail.trim()) {
      ToastService.error('Không xác định được email người dùng.');
      return;
    }

    if (pendingIds.has(document.id)) {
      return;
    }

    const bookmarkId = bookmarkIndex.bookmarkIdByLibraryItemId[document.id];
    const wasSaved = Boolean(bookmarkId);
    const previousBookmarks = bookmarks.slice();
    const previousDisplayItems = savedDisplayItems.slice();

    setPending(document.id, true);

    if (wasSaved && bookmarkId) {
      const optimisticBookmarks = previousBookmarks.filter((item: ISavedDocumentItem) => item.id !== bookmarkId);
      applyBookmarks(optimisticBookmarks);
      setSavedDisplayItems((previous: ISavedDocumentDisplayItem[]) => (
        previous.filter((item: ISavedDocumentDisplayItem) => item.bookmark.id !== bookmarkId)
      ));

      try {
        await phvbSavedDocumentsService.unsaveBookmark(documentContext, bookmarkId);
        ToastService.success('Đã bỏ lưu văn bản.');
      } catch (error) {
        applyBookmarks(previousBookmarks);
        setSavedDisplayItems(previousDisplayItems);
        ToastService.error(phvbSavedDocumentsService.getRuntimeErrorMessage(error));
      } finally {
        setPending(document.id, false);
      }

      return;
    }

    if (bookmarkIndex.libraryItemIds.has(document.id)) {
      ToastService.success('Đã lưu văn bản.');
      setPending(document.id, false);
      return;
    }

    try {
      const created = await phvbSavedDocumentsService.saveBookmark(documentContext, userEmail, document);
      applyBookmarks([created].concat(previousBookmarks));
      ToastService.success('Đã lưu văn bản.');
    } catch (error) {
      ToastService.error(phvbSavedDocumentsService.getRuntimeErrorMessage(error));
    } finally {
      setPending(document.id, false);
    }
  }, [
    applyBookmarks,
    bookmarkIndex.bookmarkIdByLibraryItemId,
    bookmarkIndex.libraryItemIds,
    bookmarks,
    documentContext,
    pendingIds,
    savedDisplayItems,
    setPending,
    userEmail
  ]);

  const isSaved = useCallback((libraryItemId: number): boolean => {
    return bookmarkIndex.libraryItemIds.has(libraryItemId);
  }, [bookmarkIndex.libraryItemIds]);

  const isPending = useCallback((libraryItemId: number): boolean => {
    return pendingIds.has(libraryItemId);
  }, [pendingIds]);

  const contextValue = useMemo((): IPhvbSavedDocumentsContextValue => ({
    isLoading,
    errorMessage,
    savedCount: bookmarks.length,
    savedDisplayItems,
    isLoadingSavedView,
    ensureLoaded,
    loadSavedView,
    isSaved,
    isPending,
    toggleSave
  }), [
    bookmarks.length,
    ensureLoaded,
    errorMessage,
    isLoading,
    isLoadingSavedView,
    isPending,
    isSaved,
    loadSavedView,
    savedDisplayItems,
    toggleSave
  ]);

  return (
    <PhvbSavedDocumentsContext.Provider value={contextValue}>
      {children}
    </PhvbSavedDocumentsContext.Provider>
  );
}

export function usePhvbSavedDocuments(): IPhvbSavedDocumentsContextValue {
  const context = useContext(PhvbSavedDocumentsContext);

  if (!context) {
    throw new Error('usePhvbSavedDocuments must be used within PhvbSavedDocumentsProvider.');
  }

  return context;
}

export function usePhvbSavedDocumentsOptional(): IPhvbSavedDocumentsContextValue | undefined {
  return useContext(PhvbSavedDocumentsContext);
}
