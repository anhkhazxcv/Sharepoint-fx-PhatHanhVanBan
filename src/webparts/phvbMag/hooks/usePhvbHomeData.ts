import { useEffect, useMemo, useState } from 'react';
import {
  hasSharePointSiteContext,
  resolveIssuanceLibraryTitle
} from '../config/PhvbMag.configuration';
import type { IBanHanhLibraryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import {
  groupRecentPublishedByDocumentFolder,
  orderRecentPublishedSections,
  type IRecentPublishedSection
} from '../utils/PhvbMagRecentPublished.utils';

interface IUsePhvbHomeDataOptions {
  siteContext: IPhvbSiteContext;
  enabled?: boolean;
  maxFolders?: number;
  includeMostViewed?: boolean;
}

interface IUsePhvbHomeDataResult {
  windowDays: number;
  folderCount: number;
  sections: IRecentPublishedSection[];
  itemCount: number;
  mostViewed: IBanHanhLibraryItem[];
  isLoadingRecent: boolean;
  isLoadingMostViewed: boolean;
  errorMessage?: string;
  mostViewedErrorMessage?: string;
}

export function usePhvbHomeData(options: IUsePhvbHomeDataOptions): IUsePhvbHomeDataResult {
  const {
    siteContext,
    enabled = true,
    maxFolders,
    includeMostViewed = false
  } = options;
  const libraryTitle = resolveIssuanceLibraryTitle(siteContext.issuanceLibraryTitle);

  const [windowDays, setWindowDays] = useState<number>(7);
  const [folderCount, setFolderCount] = useState<number>(0);
  const [allSections, setAllSections] = useState<IRecentPublishedSection[]>([]);
  const [itemCount, setItemCount] = useState<number>(0);
  const [mostViewed, setMostViewed] = useState<IBanHanhLibraryItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(enabled);
  const [isLoadingMostViewed, setIsLoadingMostViewed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [mostViewedErrorMessage, setMostViewedErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      setIsLoadingRecent(false);
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setIsLoadingRecent(false);
      setAllSections([]);
      setFolderCount(0);
      setItemCount(0);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    const loadRecent = async (): Promise<void> => {
      setIsLoadingRecent(true);

      try {
        const configuredWindowDays = await phvbBanHanhConfigService.getRecentPublishedWindowDays(siteContext);
        const recentData = await phvbDocumentLibraryService.loadRecentPublishedData(
          siteContext,
          configuredWindowDays
        );
        const folderNgayPhatHanhByKey: Record<string, string | undefined> = {};

        recentData.folders.forEach(folder => {
          folderNgayPhatHanhByKey[folder.fileRef] = folder.ngayPhatHanh;
        });

        const groupedSections = groupRecentPublishedByDocumentFolder(
          recentData.items,
          libraryTitle,
          folderNgayPhatHanhByKey
        );
        const orderedSections = orderRecentPublishedSections(
          groupedSections,
          recentData.folders.map(folder => folder.fileRef)
        );

        if (!isMounted) {
          return;
        }

        setWindowDays(configuredWindowDays);
        setFolderCount(recentData.folders.length);
        setAllSections(orderedSections);
        setItemCount(recentData.items.length);
        setErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAllSections([]);
        setFolderCount(0);
        setItemCount(0);
        setErrorMessage(toRuntimeMessage(error, libraryTitle));
      } finally {
        if (isMounted) {
          setIsLoadingRecent(false);
        }
      }
    };

    loadRecent().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [enabled, libraryTitle, siteContext]);

  useEffect(() => {
    let isMounted = true;

    if (!enabled || !includeMostViewed) {
      setIsLoadingMostViewed(false);
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setMostViewed([]);
      setMostViewedErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      setIsLoadingMostViewed(false);
      return () => {
        isMounted = false;
      };
    }

    const loadPopular = async (): Promise<void> => {
      setIsLoadingMostViewed(true);

      try {
        const items = await phvbDocumentLibraryService.loadMostViewedDocuments(siteContext);

        if (!isMounted) {
          return;
        }

        setMostViewed(items);
        setMostViewedErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMostViewed([]);
        setMostViewedErrorMessage(toRuntimeMessage(error, libraryTitle));
      } finally {
        if (isMounted) {
          setIsLoadingMostViewed(false);
        }
      }
    };

    loadPopular().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [enabled, includeMostViewed, libraryTitle, siteContext]);

  const sections = useMemo(() => {
    if (!maxFolders || maxFolders <= 0) {
      return allSections;
    }

    return allSections.slice(0, maxFolders);
  }, [allSections, maxFolders]);

  return {
    windowDays,
    folderCount,
    sections,
    itemCount,
    mostViewed,
    isLoadingRecent,
    isLoadingMostViewed,
    errorMessage,
    mostViewedErrorMessage
  };
}
