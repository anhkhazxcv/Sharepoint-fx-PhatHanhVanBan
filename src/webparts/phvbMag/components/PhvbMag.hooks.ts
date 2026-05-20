import { useEffect, useState } from 'react';
import type { SPHttpClient } from '@microsoft/sp-http';
import { createRequestItem, fetchTabCounts, fetchTabItems } from './PhvbMag.service';
import type { ICreateRequestInput, ITabCounts, IVanBanItem, TabType } from './PhvbMag.types';
import { DEFAULT_TAB_COUNTS } from './PhvbMag.types';

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
  errorMessage: string | null;
  setActiveTab: (tab: TabType) => void;
  createRequest: (input: ICreateRequestInput) => Promise<boolean>;
}

function toRuntimeMessage(error: unknown, listTitle: string): string {
  if (error && typeof error === 'object') {
    const status = 'status' in error ? Number((error as { status?: number }).status) : 0;
    const requestUrl = 'requestUrl' in error ? String((error as { requestUrl?: string }).requestUrl || '') : '';
    const details = 'details' in error ? String((error as { details?: string }).details || '') : '';

    if (status === 403) {
      return `Bạn chưa có quyền đọc list ${listTitle} hoặc site nguồn. Kiểm tra quyền trên ${requestUrl || 'SharePoint source site'}.`;
    }

    if (status === 404) {
      return `Không tìm thấy list ${listTitle} ở site đang cấu hình. Kiểm tra lại site URL hoặc tên list.`;
    }

    if (status > 0) {
      return `Không tải được dữ liệu SharePoint (HTTP ${status}). ${details || 'Kiểm tra site URL, tên list và quyền truy cập.'}`;
    }
  }

  return `Không thể tải dữ liệu từ SharePoint. Kiểm tra list ${listTitle}, site URL và quyền truy cập.`;
}

const SITE_CONTEXT_ERROR_MESSAGE = 'Chưa có site context SharePoint nên ứng dụng không thể tải dữ liệu thật.';

export function usePhvbDocuments(options: IUsePhvbDocumentsOptions): IUsePhvbDocumentsResult {
  const { userDisplayName, userEmail, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, spHttpClient } = options;
  const [activeTab, setActiveTab] = useState<TabType>('ViecCanLam');
  const [counts, setCounts] = useState<ITabCounts>(DEFAULT_TAB_COUNTS);
  const [items, setItems] = useState<IVanBanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resolvedListTitle = listTitle && listTitle.trim() ? listTitle.trim() : 'InDoc_Release';
  const hasAnySiteContext = Boolean((sourceSiteUrl && sourceSiteUrl.trim()) || currentWebUrl || siteCollectionUrl);

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
        const nextCounts = await fetchTabCounts({
          currentWebUrl,
          siteCollectionUrl,
          sourceSiteUrl,
          listTitle: resolvedListTitle,
          spHttpClient,
          userEmail
        });
        if (!isMounted) {
          return;
        }

        setCounts(nextCounts);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setCounts(DEFAULT_TAB_COUNTS);
        setErrorMessage(toRuntimeMessage(error, resolvedListTitle));
      }
    };

    void loadCounts();

    return () => {
      isMounted = false;
    };
  }, [currentWebUrl, listTitle, resolvedListTitle, siteCollectionUrl, sourceSiteUrl, spHttpClient, userEmail, hasAnySiteContext]);

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
        const nextItems = await fetchTabItems({
          currentWebUrl,
          siteCollectionUrl,
          sourceSiteUrl,
          listTitle: resolvedListTitle,
          spHttpClient,
          userEmail,
          tab: activeTab
        });
        if (!isMounted) {
          return;
        }

        setItems(nextItems);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setItems([]);
        setErrorMessage(toRuntimeMessage(error, resolvedListTitle));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [activeTab, currentWebUrl, hasAnySiteContext, resolvedListTitle, siteCollectionUrl, sourceSiteUrl, spHttpClient, userEmail]);

  const createRequest = async (input: ICreateRequestInput): Promise<boolean> => {
    if (!hasAnySiteContext) {
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return false;
    }

    setIsSaving(true);

    try {
      await createRequestItem({
        currentWebUrl,
        siteCollectionUrl,
        sourceSiteUrl,
        listTitle: resolvedListTitle,
        spHttpClient,
        userDisplayName,
        userEmail,
        input
      });

      const [nextCounts, nextItems] = await Promise.all([
        fetchTabCounts({
          currentWebUrl,
          siteCollectionUrl,
          sourceSiteUrl,
          listTitle: resolvedListTitle,
          spHttpClient,
          userEmail
        }),
        fetchTabItems({
          currentWebUrl,
          siteCollectionUrl,
          sourceSiteUrl,
          listTitle: resolvedListTitle,
          spHttpClient,
          userEmail,
          tab: activeTab
        })
      ]);

      setCounts(nextCounts);
      setItems(nextItems);
      setErrorMessage(null);
      return true;
    } catch (error) {
      setErrorMessage(toRuntimeMessage(error, resolvedListTitle));
      return false;
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
    createRequest
  };
}