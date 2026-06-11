import { useEffect, useMemo, useState } from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { hasSharePointSiteContext, resolveListTitle } from '../config/PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbDocumentsService } from '../services/PhvbMag.service';
import type { ICreateRequestInput, ISaveRequestResult, ITabCounts, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import { DEFAULT_TAB_COUNTS } from '../models/PhvbMag.models';

interface IUsePhvbDocumentsOptions {
  userDisplayName: string;
  userEmail: string;
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
  spHttpClient: SPHttpClient;
}

interface IUsePhvbDocumentsResult {
  activeTab: TabType;
  counts: ITabCounts;
  items: IVanBanItem[];
  isLoading: boolean;
  isSaving: boolean;
  errorMessage?: string;
  setActiveTab: (tab: TabType) => void;
  saveRequest: (input: ICreateRequestInput, mode: SaveRequestMode) => Promise<ISaveRequestResult | undefined>;
}

export function usePhvbDocuments(options: IUsePhvbDocumentsOptions): IUsePhvbDocumentsResult {
  const { userDisplayName, userEmail, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, spHttpClient } = options;
  const [activeTab, setActiveTab] = useState<TabType>('ViecCanLam');
  const [counts, setCounts] = useState<ITabCounts>(DEFAULT_TAB_COUNTS);
  const [items, setItems] = useState<IVanBanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const resolvedListTitle = resolveListTitle(listTitle);
  const siteContext = useMemo(() => ({
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle: resolvedListTitle,
    spHttpClient
  }), [currentWebUrl, resolvedListTitle, siteCollectionUrl, sourceSiteUrl, spHttpClient]);
  const documentContext = useMemo(() => ({
    ...siteContext,
    userDisplayName,
    userEmail
  }), [siteContext, userDisplayName, userEmail]);
  const hasAnySiteContext = hasSharePointSiteContext(siteContext);

  useEffect(() => {
    let isMounted = true;

    if (!hasAnySiteContext) {
      setCounts(DEFAULT_TAB_COUNTS);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    const loadCounts = async (): Promise<void> => {
      try {
        const nextCounts = await phvbDocumentsService.loadTabCounts(documentContext);
        if (!isMounted) {
          return;
        }

        setCounts(nextCounts);
        setErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCounts(DEFAULT_TAB_COUNTS);
        setErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error, resolvedListTitle));
      }
    };

    loadCounts().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [documentContext, hasAnySiteContext, resolvedListTitle]);

  useEffect(() => {
    let isMounted = true;

    if (!hasAnySiteContext) {
      setItems([]);
      setIsLoading(false);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    const loadItems = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const nextItems = await phvbDocumentsService.loadTabItems({
          ...siteContext,
          userEmail,
          tab: activeTab
        });
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
        setErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error, resolvedListTitle));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadItems().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [activeTab, hasAnySiteContext, resolvedListTitle, siteContext, userEmail]);

  const saveRequest = async (input: ICreateRequestInput, mode: SaveRequestMode): Promise<ISaveRequestResult | undefined> => {
    if (!hasAnySiteContext) {
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return undefined;
    }

    setIsSaving(true);

    try {
      const requestReferenceId = await phvbDocumentsService.createRequest({
        ...documentContext,
        input,
        saveMode: mode
      });

      const targetTab: TabType = mode === 'draft' ? 'BanNhap' : activeTab;

      const [nextCounts, nextItems] = await Promise.all([
        phvbDocumentsService.loadTabCounts(documentContext),
        phvbDocumentsService.loadTabItems({
          ...siteContext,
          userEmail,
          tab: targetTab
        })
      ]);

      setActiveTab(targetTab);
      setCounts(nextCounts);
      setItems(nextItems);
      setErrorMessage(undefined);

      return {
        requestReferenceId,
        mode
      };
    } catch (error) {
      setErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error, resolvedListTitle));
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    activeTab,
    counts,
    items,
    isLoading,
    isSaving,
    errorMessage,
    setActiveTab,
    saveRequest
  };
}