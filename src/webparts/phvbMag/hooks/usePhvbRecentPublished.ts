import { useEffect, useMemo, useState } from 'react';
import {
  hasSharePointSiteContext,
  resolveIssuanceLibraryTitle
} from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import {
  groupRecentPublishedByDocumentFolder,
  type IRecentPublishedSection
} from '../utils/PhvbMagRecentPublished.utils';

interface IUsePhvbRecentPublishedResult {
  isLoading: boolean;
  errorMessage?: string;
  sections: IRecentPublishedSection[];
  itemCount: number;
}

export function usePhvbRecentPublished(siteContext: IPhvbSiteContext): IUsePhvbRecentPublishedResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<IBanHanhLibraryItem[]>([]);
  const libraryTitle = resolveIssuanceLibraryTitle(siteContext.issuanceLibraryTitle);

  useEffect(() => {
    let isMounted = true;

    if (!hasSharePointSiteContext(siteContext)) {
      setIsLoading(false);
      setItems([]);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    const loadRecent = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const nextItems = await phvbDocumentLibraryService.loadRecentPublishedDocuments(siteContext);

        if (!isMounted) {
          return;
        }

        setItems(nextItems);
        setErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setItems([]);
        setErrorMessage(toRuntimeMessage(error, libraryTitle));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadRecent().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [libraryTitle, siteContext]);

  const sections = useMemo(
    () => groupRecentPublishedByDocumentFolder(items, libraryTitle),
    [items, libraryTitle]
  );

  return {
    isLoading,
    errorMessage,
    sections,
    itemCount: items.length
  };
}
