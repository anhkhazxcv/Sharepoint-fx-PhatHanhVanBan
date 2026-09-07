import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HttpClient, SPHttpClient } from '@microsoft/sp-http';
import { hasSharePointSiteContext, resolveListTitle } from '../config/PhvbMag.configuration';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbDocumentsService } from '../services/PhvbMag.service';
import { phvbDeleteRequestService } from '../services/PhvbMagDeleteRequest.service';
import type { ICreateRequestInput, IEditRequestContext, IPhvbDirectoryUser, IPhvbLogContext, ISaveRequestResult, ITabCounts, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import { DEFAULT_TAB_COUNTS } from '../models/PhvbMag.models';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';
import { ToastService } from '../utils/ToastService';

const SAVE_REQUEST_ADMIN_CONTACT_MESSAGE = 'Không thể lưu yêu cầu. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
const DELETE_REQUEST_ADMIN_CONTACT_MESSAGE = 'Không thể xóa văn bản. Vui lòng liên hệ quản trị viên để được hỗ trợ.';

interface IUsePhvbDocumentsOptions {
  userDisplayName: string;
  userEmail: string;
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
  endPointSendMail?: string;
  spHttpClient: SPHttpClient;
  httpClient: HttpClient;
  suspendTabItemsLoad?: boolean;
  deferCountsLoad?: boolean;
}

interface IUsePhvbDocumentsResult {
  activeTab: TabType;
  counts: ITabCounts;
  items: IVanBanItem[];
  isLoading: boolean;
  isSaving: boolean;
  errorMessage?: string;
  setActiveTab: (tab: TabType) => void;
  saveRequest: (
    input: ICreateRequestInput,
    mode: SaveRequestMode,
    directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>,
    editContext?: IEditRequestContext,
    duplicateFromIdYeuCau?: string
  ) => Promise<ISaveRequestResult | undefined>;
  deleteVanBan: (item: IVanBanItem) => Promise<boolean>;
  refetchCounts: () => Promise<void>;
  refetchItems: () => Promise<void>;
}

export function usePhvbDocuments(options: IUsePhvbDocumentsOptions): IUsePhvbDocumentsResult {
  const {
    userDisplayName,
    userEmail,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle,
    endPointSendMail,
    spHttpClient,
    httpClient,
    suspendTabItemsLoad = false,
    deferCountsLoad = false
  } = options;
  const [activeTab, setActiveTab] = useState<TabType>('TrangChu');
  const [counts, setCounts] = useState<ITabCounts>(DEFAULT_TAB_COUNTS);
  const [items, setItems] = useState<IVanBanItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const { runBusy } = usePhvbBusy();

  const resolvedListTitle = resolveListTitle(listTitle);
  const siteContext = useMemo(() => ({
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle: resolvedListTitle,
    endPointSendMail,
    spHttpClient,
    httpClient
  }), [currentWebUrl, resolvedListTitle, siteCollectionUrl, sourceSiteUrl, endPointSendMail, spHttpClient, httpClient]);
  const documentContext = useMemo(() => ({
    ...siteContext,
    userDisplayName,
    userEmail
  }), [siteContext, userDisplayName, userEmail]);
  const hasAnySiteContext = hasSharePointSiteContext(siteContext);

  const refetchCounts = useCallback(async (): Promise<void> => {
    if (!hasAnySiteContext) {
      setCounts(DEFAULT_TAB_COUNTS);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return;
    }

    try {
      phvbDocumentsService.invalidateTabCountsCache();
      const nextCounts = await phvbDocumentsService.loadTabCounts(documentContext, true);
      setCounts(nextCounts);
      setErrorMessage(undefined);
    } catch (error) {
      setCounts(DEFAULT_TAB_COUNTS);
      setErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error, resolvedListTitle));
    }
  }, [documentContext, hasAnySiteContext, resolvedListTitle]);

  useEffect(() => {
    if (!deferCountsLoad) {
      refetchCounts().catch(() => undefined);
      return;
    }

    const deferHandle = window.setTimeout(() => {
      refetchCounts().catch(() => undefined);
    }, 0);

    return () => {
      window.clearTimeout(deferHandle);
    };
  }, [deferCountsLoad, refetchCounts]);

  const isListlessTab = activeTab === 'TrangChu'
    || activeTab === 'ThuVienTaiLieu'
    || activeTab === 'MoiBanHanh'
    || activeTab === 'HuongDan'
    || activeTab === 'DaLuu'
    || activeTab === 'XemGanDay';

  const refetchItems = useCallback(async (): Promise<void> => {
    if (!hasAnySiteContext) {
      setItems([]);
      setIsLoading(false);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return;
    }

    if (suspendTabItemsLoad || isListlessTab) {
      setItems([]);
      setIsLoading(false);
      setErrorMessage(undefined);
      return;
    }

    setIsLoading(true);

    try {
      const nextItems = await phvbDocumentsService.loadTabItems({
        ...siteContext,
        userEmail,
        tab: activeTab
      });

      setItems(nextItems);
      setErrorMessage(undefined);
    } catch (error) {
      setItems([]);
      setErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error, resolvedListTitle));
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, hasAnySiteContext, isListlessTab, resolvedListTitle, siteContext, suspendTabItemsLoad, userEmail]);

  useEffect(() => {
    refetchItems().catch(() => undefined);
  }, [refetchItems]);

  const saveRequest = async (
    input: ICreateRequestInput,
    mode: SaveRequestMode,
    directoryUsers?: ReadonlyArray<IPhvbDirectoryUser>,
    editContext?: IEditRequestContext,
    duplicateFromIdYeuCau?: string
  ): Promise<ISaveRequestResult | undefined> => {
    if (!hasAnySiteContext) {
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return undefined;
    }

    setIsSaving(true);

    const logContext: IPhvbLogContext = {
      flowRunId: createFlowRunId(),
      screenName: 'PhvbMagCreateModal',
      actionName: editContext ? 'Request_Update' : 'Request_Create',
      userEmail,
      itemId: editContext?.idYeuCau
    };

    const busyMessage = mode === 'draft' ? 'Đang lưu nháp...' : 'Đang gửi yêu cầu...';

    try {
      return await runBusy(busyMessage, async () => {
        const requestReferenceId = editContext
          ? await phvbDocumentsService.updateRequest({
            ...documentContext,
            input,
            saveMode: mode,
            directoryUsers,
            itemId: editContext.itemId,
            existingIdYeuCau: editContext.idYeuCau,
            logContext
          })
          : await phvbDocumentsService.createRequest({
            ...documentContext,
            input,
            saveMode: mode,
            directoryUsers,
            logContext
          }, duplicateFromIdYeuCau);

        phvbDocumentsService.invalidateTabCountsCache();
        setErrorMessage(undefined);

        return {
          requestReferenceId,
          mode
        };
      });
    } catch (error) {
      console.error('[PhvbMag] saveRequest failed', error);
      ToastService.error(SAVE_REQUEST_ADMIN_CONTACT_MESSAGE);
      return undefined;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteVanBan = async (item: IVanBanItem): Promise<boolean> => {
    if (!hasAnySiteContext) {
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return false;
    }

    setIsSaving(true);

    const logContext: IPhvbLogContext = {
      flowRunId: createFlowRunId(),
      screenName: 'PhvbMagTable',
      actionName: 'Request_Delete',
      userEmail,
      itemId: item.IdYeuCau || item.Id
    };

    try {
      await runBusy('Đang xóa văn bản...', async () => {
        await phvbDeleteRequestService.deleteRequest(documentContext, item, logContext);
      });

      phvbDocumentsService.invalidateTabCountsCache();
      await Promise.all([refetchItems(), refetchCounts()]);
      return true;
    } catch (error) {
      console.error('[PhvbMag] deleteVanBan failed', error);
      ToastService.error(DELETE_REQUEST_ADMIN_CONTACT_MESSAGE);
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
    saveRequest,
    deleteVanBan,
    refetchCounts,
    refetchItems
  };
}