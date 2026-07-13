import * as React from 'react';
import { useState } from 'react';
import type { IBanHanhNotifyDraft, IRequestDetailData, TabType } from '../models/PhvbMag.models';
import type { IRemindDeadlineContext } from '../utils/PhvbMagRemindDeadline.utils';
import type { IWorkflowActionAvailability } from '../utils/PhvbMagWorkflowPermission.utils';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import styles from './PhvbMag.module.scss';
import { PhvbMagDetailActivityFeed } from './PhvbMagDetailActivityFeed';
import { PhvbMagDetailDocumentsTab } from './PhvbMagDetailDocumentsTab';
import { PhvbMagDetailHeader } from './PhvbMagDetailHeader';
import { PhvbMagDetailInfoTab } from './PhvbMagDetailInfoTab';
import { PhvbMagDetailRightPanel } from './PhvbMagDetailRightPanel';
import { PhvbMagDetailStepper } from './PhvbMagDetailStepper';
import { PhvbMagDetailWorkflowSidebar } from './PhvbMagDetailWorkflowSidebar';
import { PhvbMagRemindDeadlineDialog } from './PhvbMagRemindDeadlineDialog';

type DetailTabKey = 'info' | 'documents' | 'workflow';

interface IPhvbMagDetailProps {
  tabName: TabType;
  data: IRequestDetailData;
  approveLabel?: string;
  availableActions?: IWorkflowActionAvailability;
  isWorkflowProcessing?: boolean;
  workflowErrorMessage?: string;
  onRunWorkflowAction?: (action: WorkflowActionKey, comment?: string) => Promise<boolean>;
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
  isBanHanhSaving?: boolean;
  isBanHanhNotifyLoading?: boolean;
  banHanhErrorMessage?: string;
  banHanhNotifyDraft?: IBanHanhNotifyDraft;
  onOpenPrepareBanHanh?: () => void;
  onPrepareBanHanh?: (notify: IBanHanhNotifyDraft) => Promise<boolean>;
  onPublishBanHanh?: () => Promise<boolean>;
  canOpenParticipantModal?: boolean;
  onOpenParticipantModal?: () => void;
  canRemindDeadline?: boolean;
  remindContext?: IRemindDeadlineContext;
  isRemindSending?: boolean;
  remindErrorMessage?: string;
  onSendRemindDeadline?: (selectedRecipientIds: string[]) => Promise<boolean>;
}

const DETAIL_TABS: ReadonlyArray<{ key: DetailTabKey; label: string }> = [
  { key: 'info', label: 'Thông tin' },
  { key: 'documents', label: 'Tài liệu' },
  { key: 'workflow', label: 'Quy trình phê duyệt' }
];

export function PhvbMagDetail(props: IPhvbMagDetailProps): React.ReactElement {
  const {
    tabName,
    data,
    approveLabel,
    availableActions,
    isWorkflowProcessing,
    workflowErrorMessage,
    onRunWorkflowAction,
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
    isBanHanhSaving,
    isBanHanhNotifyLoading,
    banHanhErrorMessage,
    banHanhNotifyDraft,
    onOpenPrepareBanHanh,
    onPrepareBanHanh,
    onPublishBanHanh,
    canOpenParticipantModal,
    onOpenParticipantModal,
    canRemindDeadline,
    remindContext,
    isRemindSending,
    remindErrorMessage,
    onSendRemindDeadline
  } = props;
  const [activeTab, setActiveTab] = useState<DetailTabKey>('info');
  const [isRemindDialogOpen, setIsRemindDialogOpen] = useState<boolean>(false);
  const title = data.release.Tenvanban || data.release.IdYeuCau || 'Chi tiết văn bản';

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
        return <PhvbMagDetailDocumentsTab attachments={data.attachments} />;
      case 'workflow':
        return (
          <PhvbMagDetailWorkflowSidebar
            layout="tab"
            release={data.release}
            workflowParticipants={data.workflowParticipants}
            canOpenParticipantModal={canOpenParticipantModal}
            onOpenParticipantModal={onOpenParticipantModal}
            canRemindDeadline={canRemindDeadline}
            isRemindSending={isRemindSending}
            remindErrorMessage={remindErrorMessage}
            isRemindDialogOpen={isRemindDialogOpen}
            onOpenRemindDeadline={() => setIsRemindDialogOpen(true)}
          />
        );
      default:
        return <PhvbMagDetailInfoTab release={data.release} />;
    }
  };

  return (
    <div className={styles.detailPage}>
      <PhvbMagDetailHeader
        className={styles.detailHeaderArea}
        tabName={tabName}
        title={title}
        approveLabel={approveLabel}
        availableActions={availableActions}
        isProcessing={isWorkflowProcessing}
        errorMessage={workflowErrorMessage}
        onRunAction={onRunWorkflowAction}
        canAssignDocumentNumber={canAssignDocumentNumber}
        isCapSoSaving={isCapSoSaving}
        capSoErrorMessage={capSoErrorMessage}
        onAssignDocumentNumber={onAssignDocumentNumber}
        canPrepareBanHanh={canPrepareBanHanh}
        canPublishBanHanh={canPublishBanHanh}
        isBanHanhSaving={isBanHanhSaving}
        isBanHanhNotifyLoading={isBanHanhNotifyLoading}
        banHanhErrorMessage={banHanhErrorMessage}
        banHanhNotifyDraft={banHanhNotifyDraft}
        onOpenPrepareBanHanh={onOpenPrepareBanHanh}
        onPrepareBanHanh={onPrepareBanHanh}
        onPublishBanHanh={onPublishBanHanh}
      />

      <div className={styles.detailBodySplit}>
        <div className={styles.detailLeftColumn}>
          <div className={styles.detailStepperArea}>
            <PhvbMagDetailStepper statusApproved={data.release.StatusApproved} />
          </div>

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
                </button>
              ))}
            </div>
            <div className={styles.detailTabPanel} role="tabpanel">
              {renderTabContent()}
            </div>
          </div>
        </div>

        <PhvbMagDetailRightPanel>
          <PhvbMagDetailActivityFeed
            history={data.history}
            comments={data.comments}
            selectedFiles={commentSelectedFiles || []}
            isSaving={isCommentSaving}
            errorMessage={commentErrorMessage}
            onAddFiles={onCommentAddFiles || (() => undefined)}
            onRemoveFile={onCommentRemoveFile || (() => undefined)}
            onSubmitComment={onSubmitComment || (async () => false)}
          />
        </PhvbMagDetailRightPanel>
      </div>

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
