import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  autoLoadRecent?: boolean;
}

interface IUsePhvbHomeDataResult {
  windowDays: number;
  folderCount: number;
  sections: IRecentPublishedSection[];
  itemCount: number;
  mostViewed: IBanHanhLibraryItem[];
  isLoadingRecent: boolean;
  errorMessage?: string;
  mostViewedErrorMessage?: string;
  loadRecentPublished: () => Promise<void>;
}

export function usePhvbHomeData(options: IUsePhvbHomeDataOptions): IUsePhvbHomeDataResult {
  const {
    siteContext,
    enabled = true,
    maxFolders,
    includeMostViewed = false,
    autoLoadRecent = true
  } = options;
  const libraryTitle = resolveIssuanceLibraryTitle(siteContext.issuanceLibraryTitle);

  const [windowDays, setWindowDays] = useState<number>(7);
  const [folderCount, setFolderCount] = useState<number>(0);
  const [allSections, setAllSections] = useState<IRecentPublishedSection[]>([]);
  const [itemCount, setItemCount] = useState<number>(0);
  const [mostViewed, setMostViewed] = useState<IBanHanhLibraryItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState<boolean>(enabled);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [mostViewedErrorMessage, setMostViewedErrorMessage] = useState<string | undefined>(undefined);
  const recentMountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      recentMountedRef.current = false;
    };
  }, []);

  const loadRecentPublished = useCallback(async (): Promise<void> => {
    if (!enabled) {
      setIsLoadingRecent(false);
      return;
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setIsLoadingRecent(false);
      setAllSections([]);
      setFolderCount(0);
      setItemCount(0);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return;
    }

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

      if (!recentMountedRef.current) {
        return;
      }

      setWindowDays(configuredWindowDays);
      setFolderCount(recentData.folders.length);
      setAllSections(orderedSections);
      setItemCount(recentData.items.length);
      setErrorMessage(undefined);
    } catch (error) {
      if (!recentMountedRef.current) {
        return;
      }

      setAllSections([]);
      setFolderCount(0);
      setItemCount(0);
      setErrorMessage(toRuntimeMessage(error, libraryTitle));
    } finally {
      if (recentMountedRef.current) {
        setIsLoadingRecent(false);
      }
    }
  }, [enabled, libraryTitle, siteContext]);

  useEffect(() => {
    if (!autoLoadRecent) {
      return;
    }

    loadRecentPublished().catch(() => undefined);
  }, [autoLoadRecent, loadRecentPublished]);

  useEffect(() => {
    let isMounted = true;

    if (!enabled || !includeMostViewed) {
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setMostViewed([]);
      setMostViewedErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    // Chạy nền: không chờ query xong mới cập nhật UI — widget tự hiện empty-state
    // ngay lập tức rồi âm thầm thay bằng dữ liệu thật khi query trả về.
    phvbDocumentLibraryService.loadMostViewedDocuments(siteContext)
      .then(items => {
        if (!isMounted) {
          return;
        }

        setMostViewed(items);
        setMostViewedErrorMessage(undefined);
      })
      .catch(error => {
        if (!isMounted) {
          return;
        }

        setMostViewed([]);
        setMostViewedErrorMessage(toRuntimeMessage(error, libraryTitle));
      });

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
    errorMessage,
    mostViewedErrorMessage,
    loadRecentPublished
  };
}
