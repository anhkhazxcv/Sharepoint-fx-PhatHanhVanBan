import * as React from 'react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { HOME_LIBRARY_PREVIEW_LIMIT } from '../config/PhvbMag.configuration';
import type {
  IBanHanhLibraryItem,
  IPhvbDocumentContext,
  IRecentViewDisplayItem,
  IRecentViewItem,
  TabType
} from '../models/PhvbMag.models';
import { phvbRecentViewsService } from '../services/PhvbMagRecentViews.service';

const RECENT_VIEWS_RELATED_TABS: TabType[] = ['TrangChu', 'XemGanDay', 'ThuVienTaiLieu'];

interface IPhvbRecentViewsContextValue {
  isLoading: boolean;
  errorMessage?: string;
  recentCount: number;
  recentDisplayItems: IRecentViewDisplayItem[];
  recentPreviewItems: IRecentViewDisplayItem[];
  isLoadingRecentView: boolean;
  isLoadingRecentPreview: boolean;
  ensureLoaded: () => void;
  loadRecentView: () => Promise<void>;
  loadRecentPreview: () => Promise<void>;
  recordView: (document: IBanHanhLibraryItem) => void;
}

const PhvbRecentViewsContext = createContext<IPhvbRecentViewsContextValue | undefined>(undefined);

interface IPhvbRecentViewsProviderProps {
  documentContext: IPhvbDocumentContext;
  activeTab: TabType;
  children: React.ReactNode;
}

export function PhvbRecentViewsProvider(props: IPhvbRecentViewsProviderProps): React.ReactElement {
  const { documentContext, activeTab, children } = props;
  const { userEmail } = documentContext;

  const [recentViews, setRecentViews] = useState<IRecentViewItem[]>([]);
  const [recentDisplayItems, setRecentDisplayItems] = useState<IRecentViewDisplayItem[]>([]);
  const [recentPreviewItems, setRecentPreviewItems] = useState<IRecentViewDisplayItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [isLoadingRecentView, setIsLoadingRecentView] = useState<boolean>(false);
  const [isLoadingRecentPreview, setIsLoadingRecentPreview] = useState<boolean>(false);

  const hasLoadedRef = useRef<boolean>(false);
  const loadPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const recentViewPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const recentPreviewPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const recordViewPromiseByLibraryItemIdRef = useRef<Record<number, Promise<void>>>({});

  const applyRecentViews = useCallback((nextViews: IRecentViewItem[]) => {
    setRecentViews(nextViews);
    phvbRecentViewsService.primeSessionCache(nextViews);
  }, []);

  const loadRecentViews = useCallback(async (): Promise<void> => {
    if (!userEmail.trim()) {
      applyRecentViews([]);
      hasLoadedRef.current = true;
      return;
    }

    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    setIsLoading(true);

    const promise = phvbRecentViewsService.loadUserRecentViews(documentContext, userEmail)
      .then((nextViews: IRecentViewItem[]) => {
        applyRecentViews(nextViews);
        setErrorMessage(undefined);
        hasLoadedRef.current = true;
      })
      .catch((error: unknown) => {
        applyRecentViews([]);
        setErrorMessage(phvbRecentViewsService.getRuntimeErrorMessage(error));
      })
      .then(() => {
        setIsLoading(false);
        loadPromiseRef.current = undefined;
      });

    loadPromiseRef.current = promise;
    return promise;
  }, [applyRecentViews, documentContext, userEmail]);

  const ensureLoaded = useCallback((): void => {
    if (hasLoadedRef.current || loadPromiseRef.current) {
      return;
    }

    loadRecentViews().catch(() => undefined);
  }, [loadRecentViews]);

  const loadRecentView = useCallback(async (): Promise<void> => {
    if (recentViewPromiseRef.current) {
      return recentViewPromiseRef.current;
    }

    setIsLoadingRecentView(true);

    const promise = phvbRecentViewsService.loadUserRecentViews(documentContext, userEmail)
      .then((nextViews: IRecentViewItem[]) => {
        applyRecentViews(nextViews);
        hasLoadedRef.current = true;
        setErrorMessage(undefined);
        return phvbRecentViewsService.hydrateRecentViews(documentContext, nextViews);
      })
      .then((items: IRecentViewDisplayItem[]) => {
        setRecentDisplayItems(items);
      })
      .catch((error: unknown) => {
        setRecentDisplayItems([]);
        setErrorMessage(phvbRecentViewsService.getRuntimeErrorMessage(error));
      })
      .then(() => {
        setIsLoadingRecentView(false);
        recentViewPromiseRef.current = undefined;
      });

    recentViewPromiseRef.current = promise;
    return promise;
  }, [applyRecentViews, documentContext, userEmail]);

  const loadRecentPreview = useCallback(async (): Promise<void> => {
    if (recentPreviewPromiseRef.current) {
      return recentPreviewPromiseRef.current;
    }

    setIsLoadingRecentPreview(true);

    const promise = phvbRecentViewsService.loadUserRecentViews(
      documentContext,
      userEmail,
      HOME_LIBRARY_PREVIEW_LIMIT
    )
      .then((nextViews: IRecentViewItem[]) => {
        setErrorMessage(undefined);
        return phvbRecentViewsService.hydrateRecentViews(documentContext, nextViews);
      })
      .then((items: IRecentViewDisplayItem[]) => {
        setRecentPreviewItems(items);
      })
      .catch((error: unknown) => {
        setRecentPreviewItems([]);
        setErrorMessage(phvbRecentViewsService.getRuntimeErrorMessage(error));
      })
      .then(() => {
        setIsLoadingRecentPreview(false);
        recentPreviewPromiseRef.current = undefined;
      });

    recentPreviewPromiseRef.current = promise;
    return promise;
  }, [documentContext, userEmail]);

  const recordView = useCallback((document: IBanHanhLibraryItem): void => {
    if (!userEmail.trim()) {
      return;
    }

    if (Object.prototype.hasOwnProperty.call(recordViewPromiseByLibraryItemIdRef.current, document.id)) {
      return;
    }

    const promise = phvbRecentViewsService.recordView(documentContext, userEmail, document)
      .catch(() => undefined)
      .then(() => {
        delete recordViewPromiseByLibraryItemIdRef.current[document.id];
      });

    recordViewPromiseByLibraryItemIdRef.current[document.id] = promise;
  }, [documentContext, userEmail]);

  React.useEffect(() => {
    if (RECENT_VIEWS_RELATED_TABS.indexOf(activeTab) === -1) {
      return;
    }

    ensureLoaded();
  }, [activeTab, ensureLoaded]);

  React.useEffect(() => {
    hasLoadedRef.current = false;
    loadPromiseRef.current = undefined;
    recentViewPromiseRef.current = undefined;
    recentPreviewPromiseRef.current = undefined;
    recordViewPromiseByLibraryItemIdRef.current = {};
    phvbRecentViewsService.clearSessionCache();
    applyRecentViews([]);
    setRecentDisplayItems([]);
    setRecentPreviewItems([]);
    setErrorMessage(undefined);
  }, [
    applyRecentViews,
    documentContext.currentWebUrl,
    documentContext.siteCollectionUrl,
    documentContext.sourceSiteUrl,
    userEmail
  ]);

  const contextValue = useMemo((): IPhvbRecentViewsContextValue => ({
    isLoading,
    errorMessage,
    recentCount: recentViews.length,
    recentDisplayItems,
    recentPreviewItems,
    isLoadingRecentView,
    isLoadingRecentPreview,
    ensureLoaded,
    loadRecentView,
    loadRecentPreview,
    recordView
  }), [
    ensureLoaded,
    errorMessage,
    isLoading,
    isLoadingRecentPreview,
    isLoadingRecentView,
    loadRecentPreview,
    loadRecentView,
    recentDisplayItems,
    recentPreviewItems,
    recentViews.length,
    recordView
  ]);

  return (
    <PhvbRecentViewsContext.Provider value={contextValue}>
      {children}
    </PhvbRecentViewsContext.Provider>
  );
}

export function usePhvbRecentViews(): IPhvbRecentViewsContextValue {
  const context = useContext(PhvbRecentViewsContext);

  if (!context) {
    throw new Error('usePhvbRecentViews must be used within PhvbRecentViewsProvider.');
  }

  return context;
}

export function usePhvbRecentViewsOptional(): IPhvbRecentViewsContextValue | undefined {
  return useContext(PhvbRecentViewsContext);
}
