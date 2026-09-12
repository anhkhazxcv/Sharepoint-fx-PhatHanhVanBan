import * as React from 'react';
import { useMemo, useState } from 'react';
import type { MSGraphClientFactory } from '@microsoft/sp-http';
import type { IAllUserWorkflowItem, IBanHanhNotifyDraft, IAttachmentLibraryItem, IPhvbSiteContext, IRequestDetailData, TabType } from '../models/PhvbMag.models';
import type { DetailDocumentUploadKind } from '../hooks/usePhvbDetailDocuments';
import type { IRemindDeadlineContext } from '../utils/PhvbMagRemindDeadline.utils';
import type { IRequestInfoFieldsInput } from '../utils/PhvbMagDetailInfoEdit.utils';
import type { IWorkflowActionAvailability } from '../utils/PhvbMagWorkflowPermission.utils';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { canDuplicateRelease } from '../utils/PhvbMagDraftEdit.utils';
import { buildWorkflowTimelineSteps } from '../utils/PhvbMagWorkflowTimeline.utils';
import styles from './PhvbMag.module.scss';
import { PhvbMagDetailActivityFeed } from './PhvbMagDetailActivityFeed';
import { PhvbMagDetailDocumentsTab } from './PhvbMagDetailDocumentsTab';
import { PhvbMagDetailActionBar, type IPhvbMagDetailActionProps } from './PhvbMagDetailActionBar';
import { PhvbMagDetailHeader } from './PhvbMagDetailHeader';
import { PhvbMagDetailInfoTab } from './PhvbMagDetailInfoTab';
import { PhvbMagDetailRightPanel } from './PhvbMagDetailRightPanel';
import { PhvbMagDetailStepper } from './PhvbMagDetailStepper';
import { PhvbMagDetailWorkflowSidebar } from './PhvbMagDetailWorkflowSidebar';
import { PhvbMagRemindDeadlineDialog } from './PhvbMagRemindDeadlineDialog';
import type { BanHanhNotifyMode } from './PhvbMagBanHanhNotifyDialog';
import { usePhvbIsMobile } from '../hooks/usePhvbViewport';
import { PhvbMagMobileInviteBanner } from './mobile/PhvbMagMobileInviteBanner';
import { PhvbMagMobileSheet } from './mobile/PhvbMagMobileSheet';

type DetailTabKey = 'info' | 'documents' | 'workflow';

interface IPhvbMagDetailProps {
  tabName: TabType;
  data: IRequestDetailData;
  msGraphClientFactory: MSGraphClientFactory;
  approveLabel?: string;
  rejectLabel?: string;
  availableActions?: IWorkflowActionAvailability;
  pendingParticipants?: IAllUserWorkflowItem[];
  canRejectAtActiveStage?: boolean;
  canActOnBehalfOfParticipant?: boolean;
  isWorkflowProcessing?: boolean;
  workflowErrorMessage?: string;
  onRunWorkflowAction?: (
    action: WorkflowActionKey,
    comment?: string,
    targetParticipantId?: number,
    files?: File[]
  ) => Promise<boolean>;
  transitionLabel?: string;
  canRunTransition?: boolean;
  isTransitionProcessing?: boolean;
  transitionErrorMessage?: string;
  onRunTransition?: () => Promise<boolean>;
  commentSelectedFiles?: File[];
  isCommentSaving?: boolean;
  commentErrorMessage?: string;
  onCommentAddFiles?: (files: FileList | File[]) => string | undefined;
  onCommentRemoveFile?: (fileIndex: number) => void;
  onSubmitComment?: (text: string) => Promise<boolean>;
  canAssignDocumentNumber?: boolean;
  isCapSoSaving?: boolean;
  capSoErrorMessage?: string;
  onAssignDocumentNumber?: (soVanBan: string) => Promise<boolean>;
  canPrepareBanHanh?: boolean;
  canPublishBanHanh?: boolean;
  canEditBanHanhNotify?: boolean;
  isBanHanhSaving?: boolean;
  isBanHanhNotifyLoading?: boolean;
  banHanhErrorMessage?: string;
  banHanhNotifyDraft?: IBanHanhNotifyDraft;
  banHanhNotifyMode?: BanHanhNotifyMode;
  onOpenPrepareBanHanh?: () => void;
  onOpenPublishBanHanh?: () => void;
  onOpenEditBanHanhNotify?: () => void;
  onPrepareBanHanh?: (notify: IBanHanhNotifyDraft, mainDocumentId?: number) => Promise<boolean>;
  onPublishBanHanh?: (mainDocumentId?: number) => Promise<boolean>;
  onUpdateBanHanhNotify?: (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ) => Promise<boolean>;
  onReturnBanHanhToAdmin?: (comment: string) => Promise<boolean>;
  canOpenParticipantModal?: boolean;
  onOpenParticipantModal?: () => void;
  canRemindDeadline?: boolean;
  remindContext?: IRemindDeadlineContext;
  isRemindSending?: boolean;
  remindErrorMessage?: string;
  onSendRemindDeadline?: (selectedRecipientIds: string[]) => Promise<boolean>;
  canManageDocuments?: boolean;
  isDocumentMutating?: boolean;
  documentErrorMessage?: string;
  onUploadDocuments?: (kind: DetailDocumentUploadKind, files: FileList | File[]) => Promise<boolean>;
  onDeleteDocument?: (file: IAttachmentLibraryItem) => Promise<boolean>;
  onDeleteDocuments?: (files: IAttachmentLibraryItem[]) => Promise<boolean>;
  siteContext?: IPhvbSiteContext;
  canEditInfo?: boolean;
  isInfoSaving?: boolean;
  infoErrorMessage?: string;
  onSaveInfoFields?: (input: IRequestInfoFieldsInput) => Promise<boolean>;
  canResumeDmvlBanHanh?: boolean;
  isDmvlResumeBusy?: boolean;
  dmvlResumeErrorMessage?: string;
  onOpenResumeDmvlBanHanh?: () => void;
  onDuplicate?: () => void;
  /** Bottom sheet bình luận đang mở — chỉ có nghĩa trên mobile. */
  isCommentSheetOpen?: boolean;
  onCloseCommentSheet?: () => void;
}

const DETAIL_TABS: ReadonlyArray<{ key: DetailTabKey; label: string }> = [
  { key: 'info', label: 'Thông tin' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'workflow', label: 'Luồng thẩm định' }
];

export function PhvbMagDetail(props: IPhvbMagDetailProps): React.ReactElement {
  const {
    tabName,
    data,
    msGraphClientFactory,
    approveLabel,
    rejectLabel,
    availableActions,
    pendingParticipants,
    canRejectAtActiveStage,
    canActOnBehalfOfParticipant,
    isWorkflowProcessing,
    workflowErrorMessage,
    onRunWorkflowAction,
    transitionLabel,
    canRunTransition,
    isTransitionProcessing,
    transitionErrorMessage,
    onRunTransition,
    commentSelectedFiles,
    isCommentSaving,
    commentErrorMessage,
    onCommentAddFiles,
    onCommentRemoveFile,
    onSubmitComment,
    canAssignDocumentNumber,
    isCapSoSaving,
    capSoErrorMessage,
    onAssignDocumentNumber,
    canPrepareBanHanh,
    canPublishBanHanh,
    canEditBanHanhNotify,
    isBanHanhSaving,
    isBanHanhNotifyLoading,
    banHanhErrorMessage,
    banHanhNotifyDraft,
    banHanhNotifyMode,
    onOpenPrepareBanHanh,
    onOpenPublishBanHanh,
    onOpenEditBanHanhNotify,
    onPrepareBanHanh,
    onPublishBanHanh,
    onUpdateBanHanhNotify,
    onReturnBanHanhToAdmin,
    canOpenParticipantModal,
    onOpenParticipantModal,
    canRemindDeadline,
    remindContext,
    isRemindSending,
    remindErrorMessage,
    onSendRemindDeadline,
    canManageDocuments,
    isDocumentMutating,
    documentErrorMessage,
    onUploadDocuments,
    onDeleteDocument,
    onDeleteDocuments,
    siteContext,
    canEditInfo,
    isInfoSaving,
    infoErrorMessage,
    onSaveInfoFields,
    canResumeDmvlBanHanh,
    isDmvlResumeBusy,
    dmvlResumeErrorMessage,
    onOpenResumeDmvlBanHanh,
    onDuplicate,
    isCommentSheetOpen = false,
    onCloseCommentSheet
  } = props;
  const isMobile = usePhvbIsMobile();
  const [activeTab, setActiveTab] = useState<DetailTabKey>('info');
  const [isRemindDialogOpen, setIsRemindDialogOpen] = useState<boolean>(false);
  const title = data.release.Tenvanban || data.release.IdYeuCau || 'Chi tiết văn bản';
  const canDuplicate = canDuplicateRelease(data.release.StatusApproved);
  const isFullIssuancePublish =
    (data.release.LoaiYeuCau || '').trim() === 'Tạo mới' ||
    (data.release.LoaiYeuCau || '').trim() === 'Điều chỉnh';
  const requireMainDocument =
    isFullIssuancePublish && (banHanhNotifyMode === 'prepare' || banHanhNotifyMode === 'edit');
  const mainDocumentReadOnly = isFullIssuancePublish && banHanhNotifyMode === 'publish';
  const mainDocumentCandidates = useMemo(
    () => data.attachments.filter(item => !item.isFormAttachment),
    [data.attachments]
  );
  const documentsCount = data.attachments.length;
  const workflowStepsCount = useMemo(
    () => buildWorkflowTimelineSteps(data.release, data.workflowParticipants).length,
    [data.release, data.workflowParticipants]
  );
  const tabCountByKey: Partial<Record<DetailTabKey, number>> = {
    documents: documentsCount,
    workflow: workflowStepsCount
  };

  const handleRemindConfirm = async (selectedRecipientIds: string[]): Promise<void> => {
    if (!onSendRemindDeadline || isRemindSending) {
      return;
    }

    const succeeded = await onSendRemindDeadline(selectedRecipientIds);

    if (succeeded) {
      setIsRemindDialogOpen(false);
    }
  };

  const renderTabContent = (): React.ReactElement => {
    switch (activeTab) {
      case 'documents':
        return (
          <PhvbMagDetailDocumentsTab
            attachments={data.attachments}
            canManage={canManageDocuments}
            isMutating={isDocumentMutating}
            errorMessage={documentErrorMessage}
            onUploadFiles={onUploadDocuments}
            onDeleteFile={onDeleteDocument}
            onDeleteFiles={onDeleteDocuments}
          />
        );
      case 'workflow':
        return (
          <PhvbMagDetailWorkflowSidebar
            layout="tab"
            msGraphClientFactory={msGraphClientFactory}
            release={data.release}
            workflowParticipants={data.workflowParticipants}
            canOpenParticipantModal={canOpenParticipantModal}
            onOpenParticipantModal={onOpenParticipantModal}
            canRemindDeadline={canRemindDeadline}
            isRemindSending={isRemindSending}
            remindErrorMessage={remindErrorMessage}
            isRemindDialogOpen={isRemindDialogOpen}
            onOpenRemindDeadline={() => setIsRemindDialogOpen(true)}
            approveLabel={approveLabel}
            rejectLabel={rejectLabel}
            pendingParticipants={pendingParticipants}
            canRejectAtActiveStage={canRejectAtActiveStage}
            canActOnBehalfOfParticipant={canActOnBehalfOfParticipant}
            isWorkflowActionProcessing={isWorkflowProcessing}
            workflowActionErrorMessage={workflowErrorMessage}
            onRunWorkflowAction={onRunWorkflowAction}
          />
        );
      default:
        return (
          <PhvbMagDetailInfoTab
            release={data.release}
            siteContext={siteContext}
            canEdit={canEditInfo}
            isSaving={isInfoSaving}
            errorMessage={infoErrorMessage}
            onSave={onSaveInfoFields}
          />
        );
    }
  };

  // Gom prop action MỘT LẦN: header (desktop) và sticky footer (mobile) đọc
  // cùng object này, nên điều kiện hiện nút không thể lệch nhau.
  const actionProps: IPhvbMagDetailActionProps = {
    approveLabel,
    rejectLabel,
    availableActions,
    isProcessing: isWorkflowProcessing,
    errorMessage: workflowErrorMessage,
    onRunAction: onRunWorkflowAction,
    transitionLabel,
    canRunTransition,
    isTransitionProcessing,
    transitionErrorMessage,
    onRunTransition,
    canAssignDocumentNumber,
    isCapSoSaving,
    capSoErrorMessage,
    onAssignDocumentNumber,
    canPrepareBanHanh,
    canPublishBanHanh,
    canEditBanHanhNotify,
    isBanHanhSaving,
    isBanHanhNotifyLoading,
    banHanhErrorMessage,
    banHanhNotifyDraft,
    banHanhNotifyMode,
    requireMainDocument,
    mainDocumentReadOnly,
    mainDocumentCandidates,
    storedMainDocumentId: data.release.IdVanBanChinh,
    onOpenPrepareBanHanh,
    onOpenPublishBanHanh,
    onOpenEditBanHanhNotify,
    onPrepareBanHanh,
    onPublishBanHanh,
    onUpdateBanHanhNotify,
    onReturnBanHanhToAdmin,
    canResumeDmvlBanHanh,
    isDmvlResumeBusy,
    dmvlResumeErrorMessage,
    canDuplicate,
    onDuplicate,
    onOpenResumeDmvlBanHanh
  };

  const activityFeed = (
    <PhvbMagDetailActivityFeed
      msGraphClientFactory={msGraphClientFactory}
      history={data.history}
      comments={data.comments}
      selectedFiles={commentSelectedFiles || []}
      isSaving={isCommentSaving}
      errorMessage={commentErrorMessage}
      onAddFiles={onCommentAddFiles || (() => undefined)}
      onRemoveFile={onCommentRemoveFile || (() => undefined)}
      onSubmitComment={onSubmitComment || (async () => false)}
      chromeless={isMobile}
    />
  );

  return (
    <div className={styles.detailPage}>
      <PhvbMagDetailHeader
        className={styles.detailHeaderArea}
        tabName={tabName}
        title={title}
        hideActions={isMobile}
        {...actionProps}
      />

      <div className={styles.detailBodySplit}>
        <div className={styles.detailLeftColumn}>
          {isMobile ? (
            <PhvbMagMobileInviteBanner
              release={data.release}
              isInvited={Boolean(availableActions?.approve)}
            />
          ) : null}

          {/* Mobile: bỏ stepper để nhường chiều cao cho nội dung tab. */}
          {!isMobile ? (
            <div className={styles.detailStepperArea}>
              <PhvbMagDetailStepper statusApproved={data.release.StatusApproved} />
            </div>
          ) : null}

          <div className={styles.detailMain}>
            <div className={styles.detailTabs} role="tablist" aria-label="Chi tiết yêu cầu">
              {DETAIL_TABS.map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={[
                    styles.detailTab,
                    activeTab === tab.key ? styles.detailTabActive : ''
                  ].filter(Boolean).join(' ')}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {tabCountByKey[tab.key] ? (
                    <span className={styles.detailTabCount}>{tabCountByKey[tab.key]}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <div className={styles.detailTabPanel} role="tabpanel">
              {renderTabContent()}
            </div>
          </div>
        </div>

        {!isMobile ? (
          <PhvbMagDetailRightPanel>{activityFeed}</PhvbMagDetailRightPanel>
        ) : null}
      </div>

      {/* Mobile: nhóm nút xuống sticky footer thay vì canh phải header. */}
      {isMobile ? <PhvbMagDetailActionBar variant="footer" {...actionProps} /> : null}

      {/* Mobile: rail phải thành bottom sheet, mở từ badge trên app bar. */}
      {isMobile ? (
        <PhvbMagMobileSheet
          isOpen={isCommentSheetOpen}
          title="Bình luận & Hoạt động"
          onDismiss={() => onCloseCommentSheet?.()}
        >
          {activityFeed}
        </PhvbMagMobileSheet>
      ) : null}

      <PhvbMagRemindDeadlineDialog
        isOpen={isRemindDialogOpen}
        isProcessing={isRemindSending}
        errorMessage={isRemindDialogOpen ? remindErrorMessage : undefined}
        context={remindContext}
        onCancel={() => {
          if (!isRemindSending) {
            setIsRemindDialogOpen(false);
          }
        }}
        onConfirm={selectedRecipientIds => {
          handleRemindConfirm(selectedRecipientIds).catch(() => undefined);
        }}
      />
    </div>
  );
}
