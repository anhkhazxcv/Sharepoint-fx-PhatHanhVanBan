import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ALL_FILTER_VALUE, cloneDefaultRequestForm, DEPARTMENT_OPTIONS, DOCUMENT_TYPE_OPTIONS } from '../config/PhvbMag.configuration';
import { usePhvbCapSo } from '../hooks/usePhvbCapSo';
import { usePhvbComments } from '../hooks/usePhvbComments';
import { usePhvbDocuments } from '../hooks/usePhvbDocuments';
import { usePhvbDraftEdit } from '../hooks/usePhvbDraftEdit';
import { usePhvbRequestDetail } from '../hooks/usePhvbRequestDetail';
import { usePhvbWorkflowActions } from '../hooks/usePhvbWorkflowActions';
import { usePhvbWorkflowParticipants } from '../hooks/usePhvbWorkflowParticipants';
import type { ICreateRequestInput, IPhvbDirectoryUser, IVanBanItem, SaveRequestMode, TabType } from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { selectFilteredItems } from '../utils/PhvbMag.selectors';
import { isDraftStatus } from '../utils/PhvbMagDraftEdit.utils';
import { ToastService } from '../utils/ToastService';
import { phvbMagGraphService } from '../services/PhvbMagGraph.service';
import styles from './PhvbMag.module.scss';
import type { IPhvbMagProps } from './IPhvbMagProps';
import { PhvbMagCreateModal } from './PhvbMagCreateModal';
import { PhvbMagDetail } from './PhvbMagDetail';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagSidebar } from './PhvbMagSidebar';
import { PhvbMagTable } from './PhvbMagTable';
import { PhvbMagToolbar } from './PhvbMagToolbar';
import { PhvbMagWorkflowParticipantModal } from './PhvbMagWorkflowParticipantModal';

function PhvbMagInner(props: IPhvbMagProps): React.ReactElement {
  const { userDisplayName, userEmail, msGraphClientFactory, spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle } = props;

  const { tabName, idYeuCau, editIdYeuCau } = useParams<{ tabName: string; idYeuCau?: string; editIdYeuCau?: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const isCreateRoute = /\/create$/.test(location.pathname);
  const isEditRoute = Boolean(editIdYeuCau);
  const isDetailRoute = Boolean(idYeuCau);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [userDepartment, setUserDepartment] = useState<string>('');
  const [approverUsers, setApproverUsers] = useState<IPhvbDirectoryUser[]>([]);
  const [isLoadingApprovers, setIsLoadingApprovers] = useState<boolean>(true);
  const [graphErrorMessage, setGraphErrorMessage] = useState<string | undefined>(undefined);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState<boolean>(false);

  const defaultRequestForm = useMemo(() => {
    const form = cloneDefaultRequestForm();

    if (userDepartment) {
      form.department = userDepartment;
    }

    return form;
  }, [userDepartment]);

  const siteContext = useMemo(() => ({
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  }), [spHttpClient, currentWebUrl, siteCollectionUrl, sourceSiteUrl, listTitle]);

  const departmentOptions = useMemo(() => {
    const nextDepartments = DEPARTMENT_OPTIONS.slice();

    if (userDepartment && nextDepartments.indexOf(userDepartment) === -1) {
      nextDepartments.unshift(userDepartment);
    }

    return nextDepartments;
  }, [userDepartment]);

  const { activeTab, counts, items, isLoading, isSaving, errorMessage, setActiveTab, saveRequest } = usePhvbDocuments({
    userDisplayName,
    userEmail,
    spHttpClient,
    currentWebUrl,
    siteCollectionUrl,
    sourceSiteUrl,
    listTitle
  });

  const documentContext = useMemo(() => ({
    ...siteContext,
    userDisplayName,
    userEmail
  }), [siteContext, userDisplayName, userEmail]);

  const {
    data: detailData,
    isLoading: isDetailLoading,
    errorMessage: detailErrorMessage,
    refetch: refetchDetail
  } = usePhvbRequestDetail(siteContext, idYeuCau);

  const {
    actionContext,
    isProcessing: isWorkflowProcessing,
    errorMessage: workflowErrorMessage,
    runAction: runWorkflowAction
  } = usePhvbWorkflowActions({
    documentContext,
    detail: detailData,
    onCompleted: () => {
      refetchDetail();
    }
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
    onCompleted: () => {
      refetchDetail();
    }
  });

  const handleAssignDocumentNumber = async (soVanBan: string): Promise<boolean> => {
    const succeeded = await assignNumber(soVanBan);

    if (succeeded) {
      ToastService.success('Đã cấp số văn bản thành công.');
    }

    return succeeded;
  };

  const {
    canOpen: canOpenParticipantModal,
    isSaving: isParticipantSaving,
    errorMessage: participantErrorMessage,
    saveChanges: saveParticipantChanges
  } = usePhvbWorkflowParticipants({
    documentContext: siteContext,
    detail: detailData,
    directoryUsers: approverUsers,
    onCompleted: () => {
      refetchDetail();
    }
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
  } = usePhvbDraftEdit(siteContext, editIdYeuCau, approverUsers);

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

  useEffect(() => {
    let isMounted = true;

    const loadGraphDirectory = async (): Promise<void> => {
      setIsLoadingApprovers(true);

      try {
        const [currentUserProfile, directoryUsers] = await Promise.all([
          phvbMagGraphService.loadCurrentUserProfile(msGraphClientFactory),
          phvbMagGraphService.loadAllUsers(msGraphClientFactory)
        ]);

        if (!isMounted) {
          return;
        }

        setUserDepartment(currentUserProfile.department || '');
        setApproverUsers(directoryUsers);
        setGraphErrorMessage(undefined);
      } catch {
        if (!isMounted) {
          return;
        }

        setApproverUsers([]);
        setGraphErrorMessage('Không tải được Microsoft Graph. Hãy kiểm tra quyền User.Read và User.Read.All của ứng dụng.');
      } finally {
        if (isMounted) {
          setIsLoadingApprovers(false);
        }
      }
    };

    loadGraphDirectory().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [msGraphClientFactory]);

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

    const result = await saveRequest(input, mode, approverUsers, editContext);

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
      {!isDetailRoute && (
        <PhvbMagSidebar
          activeTab={activeTab}
          counts={counts}
          isCollapsed={isSidebarCollapsed}
          onSelectTab={handleSelectTab}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          userDisplayName={userDisplayName}
          userDepartment={userDepartment}
        />
      )}

      <main
        className={[
          styles.contentPane,
          activeTab === 'ViecCanLam' && !isDetailRoute ? styles.contentPaneTask : '',
          isDetailRoute ? styles.contentPaneDetail : ''
        ].filter(Boolean).join(' ')}
      >
        {errorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Kết nối dữ liệu:</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        {graphErrorMessage && (
          <div className={styles.connectionBanner}>
            <strong>Microsoft Graph:</strong>
            <span>{graphErrorMessage}</span>
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
                canOpenParticipantModal={canOpenParticipantModal}
                onOpenParticipantModal={() => setIsParticipantModalOpen(true)}
              />
            )}
            <PhvbMagWorkflowParticipantModal
              isOpen={isParticipantModalOpen}
              detail={detailData}
              directoryUsers={approverUsers}
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

      <PhvbMagCreateModal
        isOpen={isModalOpen}
        isSaving={isSaving}
        isLoadingApprovers={isLoadingApprovers}
        isEditMode={isEditRoute}
        initialExistingTaiLieu={draftEdit?.existingTaiLieuAttachments}
        initialExistingBieuMau={draftEdit?.existingBieuMauAttachments}
        defaultValues={modalDefaultValues}
        documentTypes={DOCUMENT_TYPE_OPTIONS}
        departments={departmentOptions}
        siteContext={siteContext}
        approvers={approverUsers}
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
        <Route path="/tab/:tabName" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/detail/:idYeuCau" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/edit/:editIdYeuCau" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/create" element={<PhvbMagInner {...props} />} />
        <Route path="/tab/:tabName/item/:itemId" element={<Navigate to="../" replace />} />
        <Route path="*" element={<Navigate to="/tab/ViecCanLam" replace />} />
      </Routes>
      <ToastContainer />
    </HashRouter>
  );
}
