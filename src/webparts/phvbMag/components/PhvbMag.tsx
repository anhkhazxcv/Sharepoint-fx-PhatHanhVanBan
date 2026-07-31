import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS, PHVB_ROLES, resolveIssuanceLibraryTitle } from '../config/PhvbMag.configuration';
import { usePhvbBanHanh } from '../hooks/usePhvbBanHanh';
import { usePhvbCapSo } from '../hooks/usePhvbCapSo';
import { usePhvbComments } from '../hooks/usePhvbComments';
import { usePhvbDetailDocuments, type DetailDocumentUploadKind } from '../hooks/usePhvbDetailDocuments';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import { usePhvbDraftEdit } from '../hooks/usePhvbDraftEdit';
import { usePhvbLabelCustomConfig } from '../hooks/usePhvbLabelCustomConfig';
import { usePhvbRecentPublishedFolderCount } from '../hooks/usePhvbRecentPublishedFolderCount';
import { usePhvbRemindDeadline } from '../hooks/usePhvbRemindDeadline';
import { usePhvbRequestDetail } from '../hooks/usePhvbRequestDetail';
import { usePhvbRoles } from '../hooks/usePhvbRoles';
import { usePhvbWorkflowActions } from '../hooks/usePhvbWorkflowActions';
import { usePhvbWorkflowParticipants } from '../hooks/usePhvbWorkflowParticipants';
import { usePhvbTenantUsers } from '../hooks/usePhvbTenantUsers';
import type { IAttachmentLibraryItem, IBanHanhNotifyDraft, ICreateRequestInput, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { canAccessCapSoTab, canAccessQLVanBanTab } from '../utils/PhvbMagRole.utils';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { isDraftStatus } from '../utils/PhvbMagDraftEdit.utils';
import { resolveTabFromPathname } from '../utils/PhvbMagRoute.utils';
import { ToastService } from '../utils/ToastService';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import type { BanHanhNotifyMode } from './PhvbMagBanHanhNotifyDialog';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
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
import { PhvbSavedDocumentsProvider } from '../context/PhvbMagSavedDocuments.context';
import { PhvbRecentViewsProvider } from '../context/PhvbMagRecentViews.context';

function PhvbMagInner(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, httpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, issuanceLibraryTitle, endPointSendMail, endPointShortUrl, roleGroupID } = props;

  const { tabName, idYeuCau, editIdYeuCau } = useParams<{ tabName: string; idYeuCau?: string; editIdYeuCau?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateRoute = /\/create$/.test(location.pathname);
  const isEditRoute = Boolean(editIdYeuCau);
  const isDetailRoute = Boolean(idYeuCau);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isDetailSidebarCollapsed, setIsDetailSidebarCollapsed] = useState<boolean>(true);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [banHanhNotifyDraft, setBanHanhNotifyDraft] = useState<IBanHanhNotifyDraft | undefined>(undefined);
  const [banHanhNotifyMode, setBanHanhNotifyMode] = useState<BanHanhNotifyMode>('prepare');

  const {
    tenantUsers,
    isLoading: isLoadingTenantUsers,
    errorMessage: tenantUsersErrorMessage,
    currentUserDepartment
  } = usePhvbTenantUsers({ msGraphClientFactory });

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

  const departmentOptions = useMemo(() => {
    const nextDepartments = DEPARTMENT_OPTIONS.slice();

    if (userDepartment && nextDepartments.indexOf(userDepartment) === -1) {
      nextDepartments.unshift(userDepartment);
    }

    return nextDepartments;
  }, [userDepartment]);

  const { workflowFilters, recentPublishedWindowDays } = usePhvbLabelCustomConfig({
    siteContext,
    enabled: true
  });

  const { folderCount: moiBanHanhFolderCount } = usePhvbRecentPublishedFolderCount({
    siteContext,
    windowDays: recentPublishedWindowDays,
    enabled: true
  });

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, saveRequest, refetchCounts } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    httpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle,
    endPointSendMail
  });

  const documentContext = useMemo(() => ({
    ...siteContext,
    userDisplayName,
    userEmail
  }), [siteContext, userDisplayName, userEmail]);

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
    refetchDetail();
    refetchCounts().catch(() => undefined);
  }, [refetchDetail, refetchCounts]);

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
      refetchDetail();
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
      refetchDetail();
    }
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

  const handleWorkflowAction = async (action: WorkflowActionKey, comment?: string): Promise<boolean> => {
    const succeeded = await runWorkflowAction(action, comment);

    if (succeeded) {
      ToastService.success('Đã cập nhật trạng thái yêu cầu thành công.');
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

    const result = await saveRequest(input, mode, tenantUsers, editContext);

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

    const targetTab = mode === 'draft' ? 'BanNhap' : activeTab;
    navigate(`/tab/${targetTab}`);

    return true;
  };

  const resolvedTabName = useMemo((): TabType => {
    return resolveTabFromPathname(location.pathname, tabName, activeTab);
  }, [activeTab, location.pathname, tabName]);
  const isLibraryTab = resolvedTabName === 'ThuVienTaiLieu';
  const isGuideTab = resolvedTabName === 'HuongDan';
  const isRecentTab = resolvedTabName === 'MoiBanHanh';
  const isSavedTab = resolvedTabName === 'DaLuu';
  const isRecentViewsTab = resolvedTabName === 'XemGanDay';
  const isHomeTab = resolvedTabName === 'TrangChu';
  const modalDefaultValues = isEditRoute && draftEdit ? draftEdit.form : defaultRequestForm;
  const isModalOpen = isCreateRoute || (isEditRoute && Boolean(draftEdit));

  return (
    <PhvbRecentViewsProvider documentContext={documentContext} activeTab={resolvedTabName}>
    <PhvbSavedDocumentsProvider documentContext={documentContext} activeTab={resolvedTabName}>
    <div className={[styles.phvbContainer, isDetailRoute ? styles.phvbContainerDetail : ''].filter(Boolean).join(' ')}>
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
                approveLabel={actionContext?.approveLabel}
                availableActions={actionContext?.availableActions}
                isWorkflowProcessing={isWorkflowProcessing}
                workflowErrorMessage={workflowErrorMessage}
                onRunWorkflowAction={handleWorkflowAction}
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
          <PhvbMagGuideView siteContext={siteContext} />
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
              onOpenCreate={() => navigate(`/tab/${activeTab}/create`)}
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
            />
          </>
        )}
      </main>

      <PhvbMagLoadingOverlay isOpen={isEditRoute && isDraftLoading} message="Đang tải bản nháp..." />

      <PhvbMagTemplateModal
        isOpen={isTemplateModalOpen}
        siteContext={siteContext}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <PhvbMagCreateModal
        isOpen={isModalOpen}
        isSaving={isSaving}
        isLoadingApprovers={isLoadingTenantUsers}
        isEditMode={isEditRoute}
        initialExistingTaiLieu={draftEdit?.existingTaiLieuAttachments}
        initialExistingBieuMau={draftEdit?.existingBieuMauAttachments}
        defaultValues={modalDefaultValues}
        documentTypes={DOCUMENT_TYPE_OPTIONS}
        departments={departmentOptions}
        siteContext={siteContext}
        approvers={tenantUsers}
        onClose={() => navigate(`/tab/${activeTab}`)}
        onSubmit={handleSaveRequest}
      />
    </div>
    </PhvbSavedDocumentsProvider>
    </PhvbRecentViewsProvider>
  );
}

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/tab/TrangChu/*" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/TrangChu" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/ThuVienTaiLieu/*" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/ThuVienTaiLieu" element={<Navigate to="/tab/ThuVienTaiLieu/all" replace />} />
        <Route path="/tab/:tabName" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/detail/:idYeuCau" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/edit/:editIdYeuCau" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/create" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/item/:itemId" element={<Navigate to="../" replace />} />
        <Route path="*" element={<Navigate to="/tab/TrangChu" replace />} />
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}
