import { useEffect, useState } from 'react';
import { hasSharePointSiteContext } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';

interface IUsePhvbRecentPublishedFolderCountOptions {
  siteContext: IPhvbSiteContext;
  windowDays: number;
  enabled?: boolean;
}

interface IUsePhvbRecentPublishedFolderCountResult {
  folderCount: number;
}

export function usePhvbRecentPublishedFolderCount(
  options: IUsePhvbRecentPublishedFolderCountOptions
): IUsePhvbRecentPublishedFolderCountResult {
  const { siteContext, windowDays, enabled = true } = options;
  const [folderCount, setFolderCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    if (!enabled) {
      return () => {
        isMounted = false;
      };
    }

    if (!hasSharePointSiteContext(siteContext)) {
      setFolderCount(0);
      return () => {
        isMounted = false;
      };
    }

    const loadFolderCount = async (): Promise<void> => {
      try {
        const recentData = await phvbDocumentLibraryService.loadRecentPublishedData(
          siteContext,
          windowDays
        );

        if (!isMounted) {
          return;
        }

        setFolderCount(recentData.folders.length);
      } catch {
        if (!isMounted) {
          return;
        }

        setFolderCount(0);
      }
    };

    loadFolderCount().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [enabled, siteContext, windowDays]);

  return {
    folderCount
  };
}
