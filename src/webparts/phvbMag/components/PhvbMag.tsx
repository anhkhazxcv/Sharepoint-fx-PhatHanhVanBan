import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, PHVB_ROLES, resolveIssuanceLibraryTitle } from '../config/PhvbMag.configuration';
import { usePhvbBanHanh } from '../hooks/usePhvbBanHanh';
import { usePhvbCapSo } from '../hooks/usePhvbCapSo';
import { usePhvbComments } from '../hooks/usePhvbComments';
import { usePhvbDetailDocuments, type DetailDocumentUploadKind } from '../hooks/usePhvbDetailDocuments';
import { usePhvbDetailInfoEdit } from '../hooks/usePhvbDetailInfoEdit';
import { usePhvbDmvlFlow } from '../hooks/usePhvbDmvlFlow';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import { usePhvbDraftEdit } from '../hooks/usePhvbDraftEdit';
import { usePhvbDuplicateRequest } from '../hooks/usePhvbDuplicateRequest';
import { usePhvbLabelCustomConfig } from '../hooks/usePhvbLabelCustomConfig';
import { usePhvbNarrowViewport } from '../hooks/usePhvbNarrowViewport';
import { usePhvbRecentPublishedFolderCount } from '../hooks/usePhvbRecentPublishedFolderCount';
import { usePhvbRemindDeadline } from '../hooks/usePhvbRemindDeadline';
import { usePhvbRequestDetail } from '../hooks/usePhvbRequestDetail';
import { usePhvbRoles } from '../hooks/usePhvbRoles';
import { usePhvbWorkflowActions } from '../hooks/usePhvbWorkflowActions';
import { usePhvbWorkflowTransition } from '../hooks/usePhvbWorkflowTransition';
import { usePhvbWorkflowParticipants } from '../hooks/usePhvbWorkflowParticipants';
import { usePhvbTenantUsers } from '../hooks/usePhvbTenantUsers';
import { usePhvbUserPhoto } from '../hooks/usePhvbUserPhoto';
import type { IAttachmentLibraryItem, IBanHanhNotifyDraft, ICreateRequestInput, IRequestDetailData, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { canAccessCapSoTab, canAccessDmvl, canAccessQLVanBanTab } from '../utils/PhvbMagRole.utils';
import { canResumeDmvlBanHanh } from '../utils/PhvbMagDmvl.utils';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { isDraftStatus } from '../utils/PhvbMagDraftEdit.utils';
import { resolveTabFromPathname } from '../utils/PhvbMagRoute.utils';
import { ToastService } from '../utils/ToastService';
import { phvbDetailService } from '../services/PhvbMagDetail.service';
import { drainAllHistoryQueues } from '../services/PhvbMagExecutionHistory.service';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import type { BanHanhNotifyMode } from './PhvbMagBanHanhNotifyDialog';
import { PhvbMagBanHanhNotifyDialog } from './PhvbMagBanHanhNotifyDialog';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDeleteVanBanDialog } from './PhvbMagDeleteVanBanDialog';
import { PhvbMagDetail } from './PhvbMagDetail';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagTemplateModal } from './PhvbMagTemplateModal';
import { PhvbMagToolbar } from './PhvbMagToolbar';
import { PhvbMagWorkflowParticipantModal } from './PhvbMagWorkflowParticipantModal';
import { PhvbMagLibraryView } from './PhvbMagLibraryView';
import { PhvbMagGuideView } from './PhvbMagGuideView';
import { PhvbMagRecentPublishedView } from './PhvbMagRecentPublishedView';
import { PhvbMagSavedDocumentsView } from './PhvbMagSavedDocumentsView';
import { PhvbMagRecentViewsView } from './PhvbMagRecentViewsView';
import { PhvbMagHomeView } from './PhvbMagHomeView';
import { PhvbMagDocumentPreviewOverlay } from './PhvbMagDocumentPreviewOverlay';
import { PhvbSavedDocumentsProvider } from '../context/PhvbMagSavedDocuments.context';
import { PhvbRecentViewsProvider } from '../context/PhvbMagRecentViews.context';
import {
  PhvbDocumentPreviewProvider,
  usePhvbDocumentPreviewOptional
} from '../context/PhvbMagDocumentPreview.context';
import { PhvbBusyProvider } from '../context/PhvbMagBusy.context';

/**
 * PhvbMagInner owns isSidebarCollapsed but renders PhvbDocumentPreviewProvider
 * itself, so it cannot read that provider's context directly — a component
 * calling useContext only sees a Provider above it in the tree, never one it
 * is about to render. This bridge lives inside the provider's subtree instead
 * and reports preview state back up through a callback prop.
 */
function PhvbMagLibrarySidebarAutoCollapseSync(props: {
  isLibraryTab: boolean;
  onPreviewOpenChange: (isOpen: boolean) => void;
}): React.ReactElement {
  const { isLibraryTab, onPreviewOpenChange } = props;
  const preview = usePhvbDocumentPreviewOptional();
  const isPreviewOpen = isLibraryTab && Boolean(preview?.previewDocument);

  useEffect(() => {
    onPreviewOpenChange(isPreviewOpen);
  }, [isPreviewOpen, onPreviewOpenChange]);

  return <></>;
}

function PhvbMagInner(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, httpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, issuanceLibraryTitle, endPointSendMail, endPointShortUrl, roleGroupID } = props;

  const { tabName, idYeuCau, editIdYeuCau, duplicateIdYeuCau } = useParams<{ tabName: string; idYeuCau?: string; editIdYeuCau?: string; duplicateIdYeuCau?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateRoute = /\/create$/.test(location.pathname);
  const isDmvlCreateRoute = /\/create-dmvl$/.test(location.pathname);
  const isEditRoute = Boolean(editIdYeuCau);
  const isDuplicateRoute = Boolean(duplicateIdYeuCau);
  const isDetailRoute = Boolean(idYeuCau);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDetailSidebarCollapsed, setIsDetailSidebarCollapsed] = useState<boolean>(true);
  // Restore-on-close only if the sidebar was expanded right before the auto-collapse.
  const wasSidebarExpandedBeforeAutoCollapseRef = useRef<boolean>(false);
  const isLibraryPreviewOpenRef = useRef<boolean>(false);
  const handleLibraryPreviewOpenChange = useCallback((isPreviewOpen: boolean): void => {
    if (isPreviewOpen === isLibraryPreviewOpenRef.current) {
      return;
    }

    isLibraryPreviewOpenRef.current = isPreviewOpen;

    if (isPreviewOpen) {
      setIsSidebarCollapsed(previous => {
        wasSidebarExpandedBeforeAutoCollapseRef.current = !previous;
        return true;
      });
      return;
    }

    if (wasSidebarExpandedBeforeAutoCollapseRef.current) {
      setIsSidebarCollapsed(false);
    }
  }, []);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [banHanhNotifyDraft, setBanHanhNotifyDraft] = useState<IBanHanhNotifyDraft | undefined>(undefined);
  const [banHanhNotifyMode, setBanHanhNotifyMode] = useState<BanHanhNotifyMode>('prepare');
  const [pendingDeleteItem, setPendingDeleteItem] = useState<IVanBanItem | undefined>(undefined);
  const [isDeletingVanBan, setIsDeletingVanBan] = useState<boolean>(false);

  const {
    tenantUsers,
    isLoading: isLoadingTenantUsers,
    errorMessage: tenantUsersErrorMessage,
    currentUserDepartment
  } = usePhvbTenantUsers({ msGraphClientFactory });

  const { photoUrl: userPhotoUrl } = usePhvbUserPhoto({ msGraphClientFactory });

  const userDepartment = currentUserDepartment || '';

  const defaultRequestForm = useMemo(() => {
    const form = cloneDefaultRequestForm();

    if (userDepartment) {
      form.department = userDepartment;
    }

    return form;
  }, [userDepartment]);

  const siteContext = useMemo(() => ({
    spHttpClient,
    httpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle,
    issuanceLibraryTitle: resolveIssuanceLibraryTitle(issuanceLibraryTitle),
    endPointSendMail,
    endPointShortUrl,
    roleGroupID
  }), [spHttpClient, httpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, issuanceLibraryTitle, endPointSendMail, endPointShortUrl, roleGroupID]);

  const { workflowFilters, recentPublishedWindowDays } = usePhvbLabelCustomConfig({
    siteContext,
    enabled: true
  });

  const { folderCount: moiBanHanhFolderCount } = usePhvbRecentPublishedFolderCount({
    siteContext,
    windowDays: recentPublishedWindowDays,
    enabled: true
  });

  const suspendTabItemsLoad = isDetailRoute || isEditRoute || isDuplicateRoute || isCreateRoute || isDmvlCreateRoute;

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, saveRequest, deleteVanBan, refetchCounts } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    httpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle,
    endPointSendMail,
    suspendTabItemsLoad,
    deferCountsLoad: suspendTabItemsLoad
  });

  const documentContext = useMemo(() => ({
    ...siteContext,
    userDisplayName,
    userEmail
  }), [siteContext, userDisplayName, userEmail]);

  useEffect(() => {
    drainAllHistoryQueues(documentContext).catch(() => undefined);
  }, [documentContext]);

  const {
    roles,
    isLoading: isRolesLoading,
    hasRole
  } = usePhvbRoles({
    siteContext,
    userEmail
  });
  const canAccessCapSo = canAccessCapSoTab(roles, userEmail);
  const canAccessQLVanBan = canAccessQLVanBanTab(roles, userEmail);
  const canAccessDmvlFeature = canAccessDmvl(userDisplayName, roles, userEmail);
  const canActOnBehalfOfParticipant = hasRole(PHVB_ROLES.ADMIN);
  const isProtectedRouteBlocked =
    (tabName === 'CapSo' && (isRolesLoading || !canAccessCapSo)) ||
    (tabName === 'QLVanBan' && (isRolesLoading || !canAccessQLVanBan));

  const {
    data: detailData,
    isLoading: isDetailLoading,
    errorMessage: detailErrorMessage,
    refetch: refetchDetail
  } = usePhvbRequestDetail(siteContext, isProtectedRouteBlocked ? undefined : idYeuCau);

  const handleDetailStatusChanged = useCallback((): void => {
    refetchDetail(['release', 'activity', 'workflow']);
    refetchCounts().catch(() => undefined);
  }, [refetchDetail, refetchCounts]);

  const handleDmvlPublished = useCallback((): void => {
    refetchCounts().catch(() => undefined);

    if (idYeuCau) {
      refetchDetail(['release', 'activity', 'workflow']);
    }
  }, [idYeuCau, refetchCounts, refetchDetail]);

  const {
    isDmvlSaving,
    isDmvlPublishing,
    isDmvlNotifyLoading,
    dmvlNotifyDraft,
    dmvlDetail,
    dmvlErrorMessage,
    isDmvlNotifyOpen,
    handleDmvlBanHanh,
    handleResumeDmvlBanHanh,
    handleDmvlNotifyCancel,
    handleDmvlNotifyConfirm,
    resetDmvlFlow
  } = usePhvbDmvlFlow({
    documentContext,
    roles,
    directoryUsers: tenantUsers,
    onPublished: handleDmvlPublished
  });

  const canResumeDmvl = useMemo(() => {
    if (!detailData?.release) {
      return false;
    }

    return canResumeDmvlBanHanh(detailData.release, roles, userEmail);
  }, [detailData, roles, userEmail]);

  const handleOpenResumeDmvlBanHanh = useCallback((): void => {
    if (!detailData || !idYeuCau) {
      return;
    }

    const resumeWithFreshAttachments = async (): Promise<void> => {
      const partial = await phvbDetailService.loadRequestDetailPartial(
        siteContext,
        idYeuCau.trim(),
        ['attachments']
      );

      const freshDetail: IRequestDetailData = {
        ...detailData,
        attachments: partial.attachments ?? detailData.attachments
      };

      refetchDetail(['attachments']);
      await handleResumeDmvlBanHanh(freshDetail);
    };

    resumeWithFreshAttachments().catch(() => undefined);
  }, [detailData, handleResumeDmvlBanHanh, idYeuCau, refetchDetail, siteContext]);

  const handleDmvlNotifyConfirmWrapper = async (
    notify: IBanHanhNotifyDraft,
    options?: { mainDocumentId?: number }
  ): Promise<void> => {
    const succeeded = await handleDmvlNotifyConfirm(notify, options?.mainDocumentId);

    if (succeeded) {
      ToastService.success('Đã trình DMVL và ban hành văn bản thành công.');

      if (isDmvlCreateRoute) {
        navigate(`/tab/${activeTab}`);
      }
    }
  };

  const handleDmvlCreateClose = (): void => {
    resetDmvlFlow();
    navigate(`/tab/${activeTab}`);
  };

  const {
    actionContext,
    isProcessing: isWorkflowProcessing,
    errorMessage: workflowErrorMessage,
    runAction: runWorkflowAction
  } = usePhvbWorkflowActions({
    documentContext,
    detail: detailData,
    onCompleted: handleDetailStatusChanged
  });

  const {
    transitionContext,
    isProcessing: isTransitionProcessing,
    errorMessage: transitionErrorMessage,
    runTransition
  } = usePhvbWorkflowTransition({
    documentContext,
    detail: detailData,
    roles,
    onCompleted: handleDetailStatusChanged
  });

  const {
    selectedFiles: commentSelectedFiles,
    isSaving: isCommentSaving,
    errorMessage: commentErrorMessage,
    addFiles: addCommentFiles,
    removeFile: removeCommentFile,
    submitComment
  } = usePhvbComments({
    documentContext,
    idYeuCau,
    onCompleted: () => {
      refetchDetail('activity');
    }
  });

  const handleSubmitComment = async (text: string): Promise<boolean> => {
    const succeeded = await submitComment(text);

    if (succeeded) {
      ToastService.success('Đã gửi bình luận thành công.');
    }

    return succeeded;
  };

  const {
    canAssign: canAssignDocumentNumber,
    isSaving: isCapSoSaving,
    errorMessage: capSoErrorMessage,
    assignNumber
  } = usePhvbCapSo({
    documentContext,
    detail: detailData,
    hasDcRole: hasRole(PHVB_ROLES.DC),
    onCompleted: handleDetailStatusChanged
  });

  const handleAssignDocumentNumber = async (soVanBan: string): Promise<boolean> => {
    const succeeded = await assignNumber(soVanBan);

    if (succeeded) {
      ToastService.success('Đã cấp số văn bản thành công.');
    }

    return succeeded;
  };

  const {
    canPrepare: canPrepareBanHanh,
    canPublish: canPublishBanHanh,
    canEdit: canEditBanHanhNotify,
    isSaving: isBanHanhSaving,
    isLoadingNotify: isBanHanhNotifyLoading,
    errorMessage: banHanhErrorMessage,
    loadNotifyDraft,
    loadSavedNotifyDraft,
    prepareForBanHanh,
    updateBanHanhNotify,
    publishBanHanh,
    returnBanHanhToAdmin
  } = usePhvbBanHanh({
    documentContext,
    detail: detailData,
    roles,
    onCompleted: handleDetailStatusChanged
  });

  const {
    canManage: canManageDocuments,
    isMutating: isDocumentMutating,
    errorMessage: documentErrorMessage,
    uploadFiles: uploadDetailDocuments,
    deleteFile: deleteDetailDocument,
    deleteFiles: deleteDetailDocuments
  } = usePhvbDetailDocuments({
    documentContext,
    detail: detailData,
    roles,
    onCompleted: () => {
      refetchDetail('attachments');
    }
  });

  const {
    canEdit: canEditInfo,
    isSaving: isInfoSaving,
    errorMessage: infoErrorMessage,
    saveInfoFields: onSaveInfoFields
  } = usePhvbDetailInfoEdit({
    documentContext,
    detail: detailData,
    roles,
    onCompleted: handleDetailStatusChanged
  });

  const handleOpenPrepareBanHanh = async (): Promise<void> => {
    setBanHanhNotifyMode('prepare');
    setBanHanhNotifyDraft(undefined);
    const draft = await loadNotifyDraft();
    setBanHanhNotifyDraft(draft);
  };

  const handleOpenPublishBanHanh = async (): Promise<void> => {
    setBanHanhNotifyMode('publish');
    setBanHanhNotifyDraft(undefined);
    const draft = await loadSavedNotifyDraft();
    setBanHanhNotifyDraft(draft);
  };

  const handleOpenEditBanHanhNotify = async (): Promise<void> => {
    setBanHanhNotifyMode('edit');
    setBanHanhNotifyDraft(undefined);
    const draft = await loadSavedNotifyDraft();
    setBanHanhNotifyDraft(draft);
  };

  const handlePrepareBanHanh = async (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ): Promise<boolean> => {
    const succeeded = await prepareForBanHanh(notify, mainDocumentId);

    if (succeeded) {
      setBanHanhNotifyDraft(undefined);
      ToastService.success('Đã chuyển yêu cầu sang Chờ ban hành.');
    }

    return succeeded;
  };

  const handleUpdateBanHanhNotify = async (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ): Promise<boolean> => {
    const succeeded = await updateBanHanhNotify(notify, mainDocumentId);

    if (succeeded) {
      setBanHanhNotifyDraft(undefined);
      ToastService.success('Đã cập nhật nội dung ban hành.');
    }

    return succeeded;
  };

  const handlePublishBanHanh = async (mainDocumentId?: number): Promise<boolean> => {
    const succeeded = await publishBanHanh(mainDocumentId);

    if (succeeded) {
      setBanHanhNotifyDraft(undefined);
      ToastService.success('Đã ban hành văn bản thành công.');
    }

    return succeeded;
  };

  const handleReturnBanHanhToAdmin = async (comment: string): Promise<boolean> => {
    const succeeded = await returnBanHanhToAdmin(comment);

    if (succeeded) {
      setBanHanhNotifyDraft(undefined);
      ToastService.success('Đã trả yêu cầu về Admin.');
    }

    return succeeded;
  };

  const handleDeleteVanBanRequest = (item: IVanBanItem): void => {
    setPendingDeleteItem(item);
  };

  const handleCancelDeleteVanBan = (): void => {
    if (isDeletingVanBan) {
      return;
    }

    setPendingDeleteItem(undefined);
  };

  const handleConfirmDeleteVanBan = async (): Promise<void> => {
    if (!pendingDeleteItem) {
      return;
    }

    setIsDeletingVanBan(true);

    try {
      const succeeded = await deleteVanBan(pendingDeleteItem);

      if (succeeded) {
        ToastService.success('Đã xóa văn bản.');
        setPendingDeleteItem(undefined);
      }
    } finally {
      setIsDeletingVanBan(false);
    }
  };

  const handleUploadDocuments = async (
    kind: DetailDocumentUploadKind,
    files: FileList | File[]
  ): Promise<boolean> => {
    const succeeded = await uploadDetailDocuments(kind, files);

    if (succeeded) {
      ToastService.success('Đã thêm tài liệu thành công.');
    }

    return succeeded;
  };

  const handleDeleteDocument = async (file: IAttachmentLibraryItem): Promise<boolean> => {
    const succeeded = await deleteDetailDocument(file);

    if (succeeded) {
      ToastService.success('Đã xóa tài liệu thành công.');
    }

    return succeeded;
  };

  const handleDeleteDocuments = async (files: IAttachmentLibraryItem[]): Promise<boolean> => {
    const succeeded = await deleteDetailDocuments(files);

    if (succeeded) {
      ToastService.success(
        files.length > 1
          ? `Đã xóa ${files.length} tài liệu thành công.`
          : 'Đã xóa tài liệu thành công.'
      );
    }

    return succeeded;
  };

  const {
    canRemind: canRemindDeadline,
    remindContext,
    isSending: isRemindSending,
    errorMessage: remindErrorMessage,
    sendReminders
  } = usePhvbRemindDeadline({
    documentContext,
    detail: detailData,
    roles,
    tenantUsers,
    onCompleted: handleDetailStatusChanged
  });

  const handleSendRemindDeadline = async (selectedRecipientIds: string[]): Promise<boolean> => {
    const succeeded = await sendReminders(selectedRecipientIds);

    if (succeeded) {
      ToastService.success('Đã gửi nhắc hạn thành công.');
    }

    return succeeded;
  };

  const {
    canOpen: canOpenParticipantModal,
    isSaving: isParticipantSaving,
    errorMessage: participantErrorMessage,
    saveChanges: saveParticipantChanges
  } = usePhvbWorkflowParticipants({
    documentContext,
    detail: detailData,
    directoryUsers: tenantUsers,
    roles,
    onCompleted: handleDetailStatusChanged
  });

  const handleSaveParticipants = async (
    initialDraft: Parameters<typeof saveParticipantChanges>[0],
    currentDraft: Parameters<typeof saveParticipantChanges>[1]
  ): Promise<boolean> => {
    const succeeded = await saveParticipantChanges(initialDraft, currentDraft);

    if (succeeded) {
      ToastService.success('Đã cập nhật người tham gia quy trình thành công.');
    }

    return succeeded;
  };

  const handleDuplicateRequest = (): void => {
    if (!detailData) {
      return;
    }

    navigate(`/tab/${activeTab}/duplicate/${detailData.release.IdYeuCau}`);
  };

  const handleWorkflowAction = async (
    action: WorkflowActionKey,
    comment?: string,
    targetParticipantId?: number,
    files?: File[]
  ): Promise<boolean> => {
    const succeeded = await runWorkflowAction(action, comment, targetParticipantId, files);

    if (succeeded) {
      ToastService.success('Đã cập nhật trạng thái yêu cầu thành công.');
    }

    return succeeded;
  };

  const handleWorkflowTransition = async (): Promise<boolean> => {
    const succeeded = await runTransition();

    if (succeeded) {
      ToastService.success('Đã chuyển giai đoạn yêu cầu thành công.');
    }

    return succeeded;
  };

  const {
    draftEdit,
    isLoading: isDraftLoading,
    errorMessage: draftEditErrorMessage
  } = usePhvbDraftEdit(
    siteContext,
    isProtectedRouteBlocked ? undefined : editIdYeuCau,
    tenantUsers
  );

  const {
    duplicateRequest,
    isLoading: isDuplicateLoading,
    errorMessage: duplicateErrorMessage
  } = usePhvbDuplicateRequest(
    siteContext,
    isProtectedRouteBlocked ? undefined : duplicateIdYeuCau,
    tenantUsers
  );

  useEffect(() => {
    if (isRolesLoading) {
      return;
    }

    const isUnauthorizedTab =
      (tabName === 'CapSo' && !canAccessCapSo) ||
      (tabName === 'QLVanBan' && !canAccessQLVanBan);

    if (isUnauthorizedTab) {
      navigate('/tab/ViecCanLam', { replace: true });
      return;
    }

    const routeTab = resolveTabFromPathname(location.pathname, tabName, activeTab);

    if (routeTab !== activeTab) {
      setActiveTab(routeTab);
    }
  }, [
    tabName,
    activeTab,
    setActiveTab,
    isRolesLoading,
    canAccessCapSo,
    canAccessQLVanBan,
    navigate,
    location.pathname
  ]);

  const processedItems = useMemo(() => selectFilteredItems(items, {
    searchQuery,
    filterType: ALL_FILTER_VALUE,
    filterDept: ALL_FILTER_VALUE
  }), [items, searchQuery]);

  const handleSelectTab = (tab: TabType): void => {
    if (tab === 'ThuVienTaiLieu') {
      navigate('/tab/ThuVienTaiLieu/all');
      return;
    }

    navigate(`/tab/${tab}`);
  };

  const handleSelectItem = (item: IVanBanItem): void => {
    if (!item.IdYeuCau || !item.IdYeuCau.trim()) {
      ToastService.error('Yêu cầu chưa có mã IdYeuCau.');
      return;
    }

    const normalizedId = encodeURIComponent(item.IdYeuCau.trim());

    if (isDraftStatus(item.StatusApproved)) {
      navigate(`/tab/${activeTab}/edit/${normalizedId}`);
      return;
    }

    navigate(`/tab/${activeTab}/detail/${normalizedId}`);
  };

  const handleSaveRequest = async (input: ICreateRequestInput, mode: SaveRequestMode): Promise<boolean> => {
    const editContext = draftEdit
      ? { itemId: draftEdit.itemId, idYeuCau: draftEdit.idYeuCau }
      : undefined;
    const duplicateFromIdYeuCau = !editContext && isDuplicateRoute ? duplicateRequest?.sourceIdYeuCau : undefined;

    const result = await saveRequest(input, mode, tenantUsers, editContext, duplicateFromIdYeuCau);

    if (!result) {
      return false;
    }

    const successMessage = mode === 'draft'
      ? editContext
        ? `Cập nhật bản nháp thành công. ID yêu cầu: ${result.requestReferenceId}`
        : `Lưu nháp thành công. ID yêu cầu: ${result.requestReferenceId}`
      : editContext
        ? `Gửi yêu cầu thành công. ID yêu cầu: ${result.requestReferenceId}`
        : `Gửi yêu cầu thành công. ID yêu cầu: ${result.requestReferenceId}`;

    ToastService.success(successMessage);

    const targetTab = mode === 'draft' ? 'YeuCauCuaToi' : activeTab;
    navigate(`/tab/${targetTab}`);

    return true;
  };

  const resolvedTabName = useMemo((): TabType => {
    return resolveTabFromPathname(location.pathname, tabName, activeTab);
  }, [activeTab, location.pathname, tabName]);
  const isLibraryTab = resolvedTabName === 'ThuVienTaiLieu';
  const isNarrowViewport = usePhvbNarrowViewport();
  const isGuideTab = resolvedTabName === 'HuongDan';
  const isRecentTab = resolvedTabName === 'MoiBanHanh';
  const isSavedTab = resolvedTabName === 'DaLuu';
  const isRecentViewsTab = resolvedTabName === 'XemGanDay';
  const isHomeTab = resolvedTabName === 'TrangChu';
  const modalDefaultValues = isEditRoute && draftEdit
    ? draftEdit.form
    : isDuplicateRoute && duplicateRequest
      ? duplicateRequest.form
      : defaultRequestForm;
  const isModalOpen = isCreateRoute
    || isDmvlCreateRoute
    || (isEditRoute && Boolean(draftEdit))
    || (isDuplicateRoute && Boolean(duplicateRequest));
  const createModalVariant = isDmvlCreateRoute ? 'dmvl' : 'standard';

  return (
    <PhvbRecentViewsProvider documentContext={documentContext} activeTab={resolvedTabName}>
    <PhvbSavedDocumentsProvider documentContext={documentContext} activeTab={resolvedTabName}>
    <PhvbDocumentPreviewProvider documentContext={documentContext}>
    <div className={[styles.phvbContainer, isDetailRoute ? styles.phvbContainerDetail : ''].filter(Boolean).join(' ')}>
      <PhvbMagLibrarySidebarAutoCollapseSync
        isLibraryTab={isLibraryTab}
        onPreviewOpenChange={handleLibraryPreviewOpenChange}
      />
      <PhvbMagSidebar
        activeTab={resolvedTabName}
        counts={counts}
        moiBanHanhFolderCount={moiBanHanhFolderCount}
        isCollapsed={isDetailRoute ? isDetailSidebarCollapsed : isSidebarCollapsed}
        onSelectTab={handleSelectTab}
        onToggleCollapse={() => {
          if (isDetailRoute) {
            setIsDetailSidebarCollapsed(previous => !previous);
            return;
          }

          setIsSidebarCollapsed(previous => !previous);
        }}
        userDisplayName={userDisplayName}
        userDepartment={userDepartment}
        userPhotoUrl={userPhotoUrl}
        showCapSoTab={canAccessCapSo}
        showQLVanBanTab={canAccessQLVanBan}
      />

      <main
        className={[
          styles.contentPane,
          resolvedTabName === 'ViecCanLam' && !isDetailRoute ? styles.contentPaneTask : '',
          isLibraryTab && !isDetailRoute ? styles.contentPaneLibrary : '',
          isGuideTab && !isDetailRoute ? styles.contentPaneRecent : '',
          isRecentTab && !isDetailRoute ? styles.contentPaneRecent : '',
          isSavedTab && !isDetailRoute ? styles.contentPaneRecent : '',
          isRecentViewsTab && !isDetailRoute ? styles.contentPaneRecent : '',
          isHomeTab && !isDetailRoute ? styles.contentPaneHome : '',
          isDetailRoute ? styles.contentPaneDetail : ''
        ].filter(Boolean).join(' ')}
      >
        {errorMessage && !isLibraryTab && !isGuideTab && !isRecentTab && !isSavedTab && !isRecentViewsTab && !isHomeTab && (
          <div className={styles.connectionBanner}>
            <strong>Kết nối dữ liệu:</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {tenantUsersErrorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Microsoft Graph:</strong>
            <span>{tenantUsersErrorMessage}</span>
          </div>
        )}

        {isEditRoute && draftEditErrorMessage && !isDraftLoading && (
          <div className={styles.connectionBanner}>
            <strong>Chỉnh sửa bản nháp:</strong>
            <span>{draftEditErrorMessage}</span>
          </div>
        )}

        {isDuplicateRoute && duplicateErrorMessage && !isDuplicateLoading && (
          <div className={styles.connectionBanner}>
            <strong>Tạo bản sao yêu cầu:</strong>
            <span>{duplicateErrorMessage}</span>
          </div>
        )}

        {isDetailRoute ? (
          <>
            <PhvbMagLoadingOverlay isOpen={isDetailLoading} message="Đang tải chi tiết yêu cầu..." />
            {!isDetailLoading && detailErrorMessage && (
              <div className={styles.detailErrorState}>
                <p>{detailErrorMessage}</p>
                <button type="button" className={styles.btnSecondary} onClick={() => navigate(`/tab/${activeTab}`)}>
                  Quay lại danh sách
                </button>
              </div>
            )}
            {!isDetailLoading && detailData && (
              <PhvbMagDetail
                tabName={resolvedTabName}
                data={detailData}
                msGraphClientFactory={msGraphClientFactory}
                approveLabel={actionContext?.approveLabel}
                rejectLabel={actionContext?.rejectLabel}
                availableActions={actionContext?.availableActions}
                pendingParticipants={actionContext?.pendingParticipants}
                canRejectAtActiveStage={actionContext?.canRejectAtActiveStage}
                canActOnBehalfOfParticipant={canActOnBehalfOfParticipant}
                isWorkflowProcessing={isWorkflowProcessing}
                workflowErrorMessage={workflowErrorMessage}
                onRunWorkflowAction={handleWorkflowAction}
                transitionLabel={transitionContext?.transitionLabel}
                canRunTransition={transitionContext?.canRun}
                isTransitionProcessing={isTransitionProcessing}
                transitionErrorMessage={transitionErrorMessage}
                onRunTransition={handleWorkflowTransition}
                commentSelectedFiles={commentSelectedFiles}
                isCommentSaving={isCommentSaving}
                commentErrorMessage={commentErrorMessage}
                onCommentAddFiles={addCommentFiles}
                onCommentRemoveFile={removeCommentFile}
                onSubmitComment={handleSubmitComment}
                canAssignDocumentNumber={canAssignDocumentNumber}
                isCapSoSaving={isCapSoSaving}
                capSoErrorMessage={capSoErrorMessage}
                onAssignDocumentNumber={handleAssignDocumentNumber}
                canPrepareBanHanh={canPrepareBanHanh}
                canPublishBanHanh={canPublishBanHanh}
                canEditBanHanhNotify={canEditBanHanhNotify}
                isBanHanhSaving={isBanHanhSaving}
                isBanHanhNotifyLoading={isBanHanhNotifyLoading}
                banHanhErrorMessage={banHanhErrorMessage}
                banHanhNotifyDraft={banHanhNotifyDraft}
                banHanhNotifyMode={banHanhNotifyMode}
                onOpenPrepareBanHanh={handleOpenPrepareBanHanh}
                onOpenPublishBanHanh={handleOpenPublishBanHanh}
                onOpenEditBanHanhNotify={handleOpenEditBanHanhNotify}
                onPrepareBanHanh={handlePrepareBanHanh}
                onPublishBanHanh={handlePublishBanHanh}
                onUpdateBanHanhNotify={handleUpdateBanHanhNotify}
                onReturnBanHanhToAdmin={handleReturnBanHanhToAdmin}
                canRemindDeadline={canRemindDeadline}
                remindContext={remindContext}
                isRemindSending={isRemindSending}
                remindErrorMessage={remindErrorMessage}
                onSendRemindDeadline={handleSendRemindDeadline}
                canOpenParticipantModal={canOpenParticipantModal}
                onOpenParticipantModal={() => setIsParticipantModalOpen(true)}
                canManageDocuments={canManageDocuments}
                isDocumentMutating={isDocumentMutating}
                documentErrorMessage={documentErrorMessage}
                onUploadDocuments={handleUploadDocuments}
                onDeleteDocument={handleDeleteDocument}
                onDeleteDocuments={handleDeleteDocuments}
                siteContext={documentContext}
                canEditInfo={canEditInfo}
                isInfoSaving={isInfoSaving}
                infoErrorMessage={infoErrorMessage}
                onSaveInfoFields={onSaveInfoFields}
                canResumeDmvlBanHanh={canResumeDmvl}
                isDmvlResumeBusy={isDmvlNotifyLoading || isDmvlPublishing}
                dmvlResumeErrorMessage={!isDmvlNotifyOpen ? dmvlErrorMessage : undefined}
                onOpenResumeDmvlBanHanh={handleOpenResumeDmvlBanHanh}
                onDuplicate={handleDuplicateRequest}
              />
            )}
            <PhvbMagWorkflowParticipantModal
              isOpen={isParticipantModalOpen}
              detail={detailData}
              directoryUsers={tenantUsers}
              isLoadingTenantUsers={isLoadingTenantUsers}
              isSaving={isParticipantSaving}
              errorMessage={participantErrorMessage}
              onClose={() => setIsParticipantModalOpen(false)}
              onSave={handleSaveParticipants}
            />
          </>
        ) : isLibraryTab ? (
          <PhvbMagLibraryView documentContext={documentContext} />
        ) : isGuideTab ? (
          <PhvbMagGuideView
            siteContext={siteContext}
            canCreate={Boolean(currentWebUrl || siteCollectionUrl || sourceSiteUrl)}
            onOpenTemplate={() => setIsTemplateModalOpen(true)}
            onOpenCreate={() => navigate('/tab/ViecCanLam/create')}
          />
        ) : isHomeTab ? (
          <PhvbMagHomeView siteContext={siteContext} documentContext={documentContext} />
        ) : isRecentTab ? (
          <PhvbMagRecentPublishedView siteContext={siteContext} />
        ) : isSavedTab ? (
          <PhvbMagSavedDocumentsView documentContext={documentContext} />
        ) : isRecentViewsTab ? (
          <PhvbMagRecentViewsView documentContext={documentContext} />
        ) : (
          <>
            <PhvbMagToolbar
              activeTab={activeTab}
              canCreate={Boolean(currentWebUrl || siteCollectionUrl || sourceSiteUrl)}
              canAccessDmvl={canAccessDmvlFeature}
              onOpenCreate={() => navigate(`/tab/${activeTab}/create`)}
              onOpenDmvl={() => navigate(`/tab/${activeTab}/create-dmvl`)}
              onOpenTemplate={() => setIsTemplateModalOpen(true)}
            />

            <PhvbMagTable
              activeTab={activeTab}
              items={processedItems}
              isLoading={isLoading}
              searchQuery={searchQuery}
              filterOptions={workflowFilters}
              onSearchChange={setSearchQuery}
              onSelectItem={handleSelectItem}
              canDeleteItem={activeTab === 'QLVanBan' && canAccessQLVanBan}
              onDeleteItem={handleDeleteVanBanRequest}
            />
          </>
        )}
      </main>

      <PhvbMagLoadingOverlay isOpen={isEditRoute && isDraftLoading} message="Đang tải bản nháp..." />
      <PhvbMagLoadingOverlay isOpen={isDuplicateRoute && isDuplicateLoading} message="Đang tải dữ liệu để tạo bản sao..." />

      <PhvbMagDeleteVanBanDialog
        isOpen={Boolean(pendingDeleteItem)}
        item={pendingDeleteItem}
        isDeleting={isDeletingVanBan}
        onCancel={handleCancelDeleteVanBan}
        onConfirm={handleConfirmDeleteVanBan}
      />

      <PhvbMagTemplateModal
        isOpen={isTemplateModalOpen}
        siteContext={siteContext}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <PhvbMagCreateModal
        isOpen={isModalOpen}
        isSaving={isDmvlCreateRoute ? isDmvlSaving : isSaving}
        isLoadingApprovers={isLoadingTenantUsers}
        isEditMode={isEditRoute}
        variant={createModalVariant}
        initialExistingTaiLieu={draftEdit?.existingTaiLieuAttachments || duplicateRequest?.form.existingTaiLieuAttachments}
        initialExistingBieuMau={draftEdit?.existingBieuMauAttachments || duplicateRequest?.form.existingBieuMauAttachments}
        defaultValues={modalDefaultValues}
        siteContext={siteContext}
        approvers={tenantUsers}
        onClose={isDmvlCreateRoute ? handleDmvlCreateClose : () => navigate(`/tab/${activeTab}`)}
        onSubmit={handleSaveRequest}
        onDmvlBanHanh={handleDmvlBanHanh}
        externalSubmitError={isDmvlCreateRoute && !isDmvlNotifyOpen ? dmvlErrorMessage : undefined}
      />

      <PhvbMagBanHanhNotifyDialog
        isOpen={isDmvlNotifyOpen}
        mode="prepare"
        requireMainDocument={true}
        mainDocumentCandidates={dmvlDetail?.attachments || []}
        storedMainDocumentId={dmvlDetail?.release.IdVanBanChinh}
        isLoading={isDmvlNotifyLoading}
        isProcessing={isDmvlPublishing}
        errorMessage={dmvlErrorMessage}
        draft={dmvlNotifyDraft}
        confirmLabel="Ban hành"
        onCancel={handleDmvlNotifyCancel}
        onConfirm={handleDmvlNotifyConfirmWrapper}
      />

      <PhvbMagDocumentPreviewOverlay
        documentContext={documentContext}
        isEnabled={!isLibraryTab || isNarrowViewport}
      />
    </div>
    </PhvbDocumentPreviewProvider>
    </PhvbSavedDocumentsProvider>
    </PhvbRecentViewsProvider>
  );
}

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  return (
    <HashRouter>
      <PhvbBusyProvider>
        <Routes>
          <Route path="/tab/TrangChu/*" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/TrangChu" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/ThuVienTaiLieu/*" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/ThuVienTaiLieu" element={<Navigate to="/tab/ThuVienTaiLieu/all" replace />} />
          <Route path="/tab/:tabName" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/detail/:idYeuCau" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/edit/:editIdYeuCau" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/duplicate/:duplicateIdYeuCau" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/create-dmvl" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/create" element={<PhvbMagInner {...props} />} />
          <Route path="/tab/:tabName/item/:itemId" element={<Navigate to="../" replace />} />
          <Route path="*" element={<Navigate to="/tab/TrangChu" replace />} />
        </Routes>
        <ToastContainer />
      </PhvbBusyProvider>
    </HashRouter>
  );
}
