import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS, PHVB_ROLES } from '../config/PhvbMag.configuration';
import { usePhvbBanHanh } from '../hooks/usePhvbBanHanh';
import { usePhvbCapSo } from '../hooks/usePhvbCapSo';
import { usePhvbComments } from '../hooks/usePhvbComments';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import { usePhvbDraftEdit } from '../hooks/usePhvbDraftEdit';
import { usePhvbRemindDeadline } from '../hooks/usePhvbRemindDeadline';
import { usePhvbRequestDetail } from '../hooks/usePhvbRequestDetail';
import { usePhvbRoles } from '../hooks/usePhvbRoles';
import { usePhvbWorkflowActions } from '../hooks/usePhvbWorkflowActions';
import { usePhvbWorkflowParticipants } from '../hooks/usePhvbWorkflowParticipants';
import { usePhvbTenantUsers } from '../hooks/usePhvbTenantUsers';
import type { IBanHanhNotifyDraft, ICreateRequestInput, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { isDraftStatus } from '../utils/PhvbMagDraftEdit.utils';
import { ToastService } from '../utils/ToastService';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDetail } from './PhvbMagDetail';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagTemplateModal } from './PhvbMagTemplateModal';
import { PhvbMagToolbar } from './PhvbMagToolbar';
import { PhvbMagWorkflowParticipantModal } from './PhvbMagWorkflowParticipantModal';

function PhvbMagInner(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, httpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, endPointSendMail } = props;

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
    endPointSendMail
  }), [spHttpClient, httpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle, endPointSendMail]);

  const departmentOptions = useMemo(() => {
    const nextDepartments = DEPARTMENT_OPTIONS.slice();

    if (userDepartment && nextDepartments.indexOf(userDepartment) === -1) {
      nextDepartments.unshift(userDepartment);
    }

    return nextDepartments;
  }, [userDepartment]);

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
    hasRole
  } = usePhvbRoles({
    siteContext,
    userEmail
  });

  const {
    data: detailData,
    isLoading: isDetailLoading,
    errorMessage: detailErrorMessage,
    refetch: refetchDetail
  } = usePhvbRequestDetail(siteContext, idYeuCau);

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
    isSaving: isBanHanhSaving,
    isLoadingNotify: isBanHanhNotifyLoading,
    errorMessage: banHanhErrorMessage,
    loadNotifyDraft,
    prepareForBanHanh,
    publishBanHanh
  } = usePhvbBanHanh({
    documentContext,
    detail: detailData,
    roles,
    onCompleted: handleDetailStatusChanged
  });

  const handleOpenPrepareBanHanh = async (): Promise<void> => {
    setBanHanhNotifyDraft(undefined);
    const draft = await loadNotifyDraft();
    setBanHanhNotifyDraft(draft);
  };

  const handlePrepareBanHanh = async (notify: IBanHanhNotifyDraft): Promise<boolean> => {
    const succeeded = await prepareForBanHanh(notify);

    if (succeeded) {
      setBanHanhNotifyDraft(undefined);
      ToastService.success('Đã chuyển yêu cầu sang Chờ ban hành.');
    }

    return succeeded;
  };

  const handlePublishBanHanh = async (): Promise<boolean> => {
    const succeeded = await publishBanHanh();

    if (succeeded) {
      ToastService.success('Đã ban hành văn bản thành công.');
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
  } = usePhvbDraftEdit(siteContext, editIdYeuCau, tenantUsers);

  useEffect(() => {
    if (tabName && tabName !== activeTab) {
      setActiveTab(tabName as TabType);
    }
  }, [tabName, activeTab, setActiveTab]);

  const processedItems = useMemo(() => selectFilteredItems(items, {
    searchQuery,
    filterType: ALL_FILTER_VALUE,
    filterDept: ALL_FILTER_VALUE
  }), [items, searchQuery]);

  const handleSelectTab = (tab: TabType): void => {
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

  const resolvedTabName = (tabName as TabType) || activeTab;
  const modalDefaultValues = isEditRoute && draftEdit ? draftEdit.form : defaultRequestForm;
  const isModalOpen = isCreateRoute || (isEditRoute && Boolean(draftEdit));

  return (
    <div className={[styles.phvbContainer, isDetailRoute ? styles.phvbContainerDetail : ''].filter(Boolean).join(' ')}>
      <PhvbMagSidebar
        activeTab={activeTab}
        counts={counts}
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
        showCapSoTab={hasRole(PHVB_ROLES.DC)}
      />

      <main
        className={[
          styles.contentPane,
          activeTab === 'TrangChu' && !isDetailRoute ? styles.contentPaneTask : '',
          isDetailRoute ? styles.contentPaneDetail : ''
        ].filter(Boolean).join(' ')}
      >
        {errorMessage && (
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
                isBanHanhSaving={isBanHanhSaving}
                isBanHanhNotifyLoading={isBanHanhNotifyLoading}
                banHanhErrorMessage={banHanhErrorMessage}
                banHanhNotifyDraft={banHanhNotifyDraft}
                onOpenPrepareBanHanh={handleOpenPrepareBanHanh}
                onPrepareBanHanh={handlePrepareBanHanh}
                onPublishBanHanh={handlePublishBanHanh}
                canRemindDeadline={canRemindDeadline}
                remindContext={remindContext}
                isRemindSending={isRemindSending}
                remindErrorMessage={remindErrorMessage}
                onSendRemindDeadline={handleSendRemindDeadline}
                canOpenParticipantModal={canOpenParticipantModal}
                onOpenParticipantModal={() => setIsParticipantModalOpen(true)}
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
  );
}

export default function PhvbMag(props: IPhvbMagProps): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/tab/ViecCanLam/*" element={<Navigate to="/tab/TrangChu" replace />} />
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
