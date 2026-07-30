import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { usePhvbHomeData } from './usePhvbHomeData';
import type { IRecentPublishedSection } from '../utils/PhvbMagRecentPublished.utils';

interface IUsePhvbRecentPublishedOptions {
  siteContext: IPhvbSiteContext;
  enabled?: boolean;
  maxFolders?: number;
}

interface IUsePhvbRecentPublishedResult {
  isLoading: boolean;
  errorMessage?: string;
  sections: IRecentPublishedSection[];
  itemCount: number;
  folderCount: number;
  windowDays: number;
}

export function usePhvbRecentPublished(
  siteContext: IPhvbSiteContext,
  options?: Omit<IUsePhvbRecentPublishedOptions, 'siteContext'>
): IUsePhvbRecentPublishedResult {
  const homeData = usePhvbHomeData({
    siteContext,
    enabled: options?.enabled !== false,
    maxFolders: options?.maxFolders
  });

  return {
    isLoading: homeData.isLoadingRecent,
    errorMessage: homeData.errorMessage,
    sections: homeData.sections,
    itemCount: homeData.itemCount,
    folderCount: homeData.folderCount,
    windowDays: homeData.windowDays
  };
}
