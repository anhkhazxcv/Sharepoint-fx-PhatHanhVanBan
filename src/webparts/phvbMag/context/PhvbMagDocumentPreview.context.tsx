import * as React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { IBanHanhLibraryItem, IPhvbDocumentContext } from '../models/PhvbMag.models';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { buildPreviewSearch, parsePreviewParam } from '../utils/PhvbMagLibrary.utils';
import { buildPreviewDeepLinkUrl } from '../utils/PhvbMagRoute.utils';
import { usePhvbRecentViewsOptional } from './PhvbMagRecentViews.context';

/** Only count a view once the reader has actually settled on the document. */
const RECORD_VIEW_DELAY_MS = 3000;

interface IPhvbDocumentPreviewContextValue {
  previewDocument?: IBanHanhLibraryItem;
  previewItemId?: number;
  isResolving: boolean;
  isFullscreen: boolean;
  hasPrevious: boolean;
  hasNext: boolean;
  openPreview: (document: IBanHanhLibraryItem) => void;
  closePreview: () => void;
  toggleFullscreen: () => void;
  exitFullscreen: () => void;
  goPrevious: () => void;
  goNext: () => void;
  copyPreviewLink: () => void;
  registerDocuments: (documents: IBanHanhLibraryItem[]) => void;
}

const PhvbDocumentPreviewContext = createContext<IPhvbDocumentPreviewContextValue | undefined>(undefined);

interface IPhvbDocumentPreviewProviderProps {
  documentContext: IPhvbDocumentContext;
  children: React.ReactNode;
}

export function PhvbDocumentPreviewProvider(props: IPhvbDocumentPreviewProviderProps): React.ReactElement {
  const { documentContext, children } = props;
  const location = useLocation();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<IBanHanhLibraryItem[]>([]);
  const [resolvedDocument, setResolvedDocument] = useState<IBanHanhLibraryItem | undefined>(undefined);
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const previewItemId = parsePreviewParam(location.search);

  const documentsRef = useRef<IBanHanhLibraryItem[]>([]);
  documentsRef.current = documents;

  const registerDocuments = useCallback((nextDocuments: IBanHanhLibraryItem[]): void => {
    setDocuments(previous => (previous === nextDocuments ? previous : nextDocuments));
  }, []);

  // Prefer the already-loaded list; only a cold deep link needs a fetch.
  const documentFromList = useMemo(
    () => (previewItemId === undefined
      ? undefined
      : documents.filter(item => item.id === previewItemId)[0]),
    [documents, previewItemId]
  );

  const previewDocument = documentFromList
    || (resolvedDocument && resolvedDocument.id === previewItemId ? resolvedDocument : undefined);

  useEffect(() => {
    if (previewItemId === undefined || documentFromList) {
      setIsResolving(false);
      return undefined;
    }

    if (resolvedDocument && resolvedDocument.id === previewItemId) {
      return undefined;
    }

    let isMounted = true;
    setIsResolving(true);

    phvbDocumentLibraryService
      .hydrateBanHanhItemsByIds(documentContext, [previewItemId])
      .then(items => {
        if (!isMounted) {
          return;
        }

        setResolvedDocument(items[0]);
        setIsResolving(false);
      })
      .catch(() => {
        if (isMounted) {
          setResolvedDocument(undefined);
          setIsResolving(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [previewItemId, documentFromList, resolvedDocument, documentContext]);

  const setPreviewParam = useCallback((itemId: number | undefined, replace?: boolean): void => {
    navigate(
      `${location.pathname}${buildPreviewSearch(location.search, itemId)}`,
      replace ? { replace: true } : undefined
    );
  }, [navigate, location.pathname, location.search]);

  const openPreview = useCallback((document: IBanHanhLibraryItem): void => {
    setPreviewParam(document.id);
  }, [setPreviewParam]);

  const closePreview = useCallback((): void => {
    setIsFullscreen(false);
    setPreviewParam(undefined);
  }, [setPreviewParam]);

  const currentIndex = previewItemId === undefined
    ? -1
    : documents.map(item => item.id).indexOf(previewItemId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < documents.length - 1;

  const goPrevious = useCallback((): void => {
    const list = documentsRef.current;
    const index = list.map(item => item.id).indexOf(previewItemId ?? -1);

    if (index > 0) {
      // Replace, not push: arrow-key browsing must not flood the back stack.
      setPreviewParam(list[index - 1].id, true);
    }
  }, [previewItemId, setPreviewParam]);

  const goNext = useCallback((): void => {
    const list = documentsRef.current;
    const index = list.map(item => item.id).indexOf(previewItemId ?? -1);

    if (index >= 0 && index < list.length - 1) {
      setPreviewParam(list[index + 1].id, true);
    }
  }, [previewItemId, setPreviewParam]);

  const toggleFullscreen = useCallback((): void => {
    setIsFullscreen(previous => !previous);
  }, []);

  const exitFullscreen = useCallback((): void => {
    setIsFullscreen(false);
  }, []);

  const copyPreviewLink = useCallback((): void => {
    if (previewItemId === undefined) {
      return;
    }

    const url = buildPreviewDeepLinkUrl(location.pathname, location.search, previewItemId);

    try {
      navigator.clipboard?.writeText(url).catch(() => undefined);
    } catch {
      // Clipboard unavailable (older browsers / insecure context) — ignore silently.
    }
  }, [previewItemId, location.pathname, location.search]);

  // Closing the preview must also drop fullscreen so the next open starts clean.
  useEffect(() => {
    if (previewItemId === undefined && isFullscreen) {
      setIsFullscreen(false);
    }
  }, [previewItemId, isFullscreen]);

  // Count a view only after the reader settles, so arrow-key browsing does not inflate it.
  const recentViews = usePhvbRecentViewsOptional();
  const recentViewsRef = useRef(recentViews);
  recentViewsRef.current = recentViews;
  const previewDocumentRef = useRef(previewDocument);
  previewDocumentRef.current = previewDocument;

  const previewDocumentId = previewDocument?.id;

  useEffect(() => {
    if (previewDocumentId === undefined) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const currentDocument = previewDocumentRef.current;

      if (currentDocument) {
        recentViewsRef.current?.recordView(currentDocument);
      }
    }, RECORD_VIEW_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [previewDocumentId]);

  // Esc is tiered: leave fullscreen first, close only on the second press.
  const keyboardHandlersRef = useRef({ closePreview, goPrevious, goNext, exitFullscreen, isFullscreen });
  keyboardHandlersRef.current = { closePreview, goPrevious, goNext, exitFullscreen, isFullscreen };

  useEffect(() => {
    if (previewItemId === undefined) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      const handlers = keyboardHandlersRef.current;

      if (event.key === 'Escape') {
        event.preventDefault();

        if (handlers.isFullscreen) {
          handlers.exitFullscreen();
        } else {
          handlers.closePreview();
        }

        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        handlers.goPrevious();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        handlers.goNext();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);

    return () => window.document.removeEventListener('keydown', handleKeyDown);
  }, [previewItemId]);

  const value = useMemo<IPhvbDocumentPreviewContextValue>(() => ({
    previewDocument,
    previewItemId,
    isResolving,
    isFullscreen,
    hasPrevious,
    hasNext,
    openPreview,
    closePreview,
    toggleFullscreen,
    exitFullscreen,
    goPrevious,
    goNext,
    copyPreviewLink,
    registerDocuments
  }), [
    previewDocument,
    previewItemId,
    isResolving,
    isFullscreen,
    hasPrevious,
    hasNext,
    openPreview,
    closePreview,
    toggleFullscreen,
    exitFullscreen,
    goPrevious,
    goNext,
    copyPreviewLink,
    registerDocuments
  ]);

  return (
    <PhvbDocumentPreviewContext.Provider value={value}>
      {children}
    </PhvbDocumentPreviewContext.Provider>
  );
}

export function usePhvbDocumentPreviewOptional(): IPhvbDocumentPreviewContextValue | undefined {
  return useContext(PhvbDocumentPreviewContext);
}

/** Views call this so the preview knows what list to page through. */
export function usePhvbRegisterPreviewDocuments(documents: IBanHanhLibraryItem[]): void {
  const preview = usePhvbDocumentPreviewOptional();
  const registerDocuments = preview?.registerDocuments;

  useEffect(() => {
    registerDocuments?.(documents);
  }, [registerDocuments, documents]);
}
