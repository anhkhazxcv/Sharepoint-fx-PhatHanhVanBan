import * as React from 'react';
import { useMemo, useState } from 'react';
import type { IAllUserWorkflowItem, IVanBanItem, IWorkflowParticipantItem } from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import {
  buildWorkflowTimelineSteps,
  findCurrentWorkflowStepIndex
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { RemindDeadlineIcon, WorkflowParticipantIcon } from './PhvbMagIcons';
import { PhvbMagDetailWorkflowStepCard } from './PhvbMagDetailWorkflowStepCard';
import { PhvbMagWorkflowActionDialog } from './PhvbMagWorkflowActionDialog';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailWorkflowSidebarProps {
  release: IVanBanItem;
  workflowParticipants: IWorkflowParticipantItem[];
  canOpenParticipantModal?: boolean;
  onOpenParticipantModal?: () => void;
  canRemindDeadline?: boolean;
  isRemindSending?: boolean;
  remindErrorMessage?: string;
  isRemindDialogOpen?: boolean;
  onOpenRemindDeadline?: () => void;
  layout?: 'sidebar' | 'tab';
  approveLabel?: string;
  pendingParticipants?: IAllUserWorkflowItem[];
  canRejectAtActiveStage?: boolean;
  canActOnBehalfOfParticipant?: boolean;
  isWorkflowActionProcessing?: boolean;
  workflowActionErrorMessage?: string;
  onRunWorkflowAction?: (
    action: WorkflowActionKey,
    comment?: string,
    targetParticipantId?: number,
    files?: File[]
  ) => Promise<boolean>;
}

function WorkflowPanelContent(props: {
  allSteps: ReturnType<typeof buildWorkflowTimelineSteps>;
  currentStepIndex: number;
  workflowParticipants: IWorkflowParticipantItem[];
  onBehalfParticipantsById: Map<number, IAllUserWorkflowItem>;
  canRejectOnBehalf: boolean;
  isOnBehalfBusy: boolean;
  onConfirmOnBehalf: (participantId: number) => void;
  onRejectOnBehalf: (participantId: number) => void;
}): React.ReactElement {
  const {
    allSteps,
    currentStepIndex,
    workflowParticipants,
    onBehalfParticipantsById,
    canRejectOnBehalf,
    isOnBehalfBusy,
    onConfirmOnBehalf,
    onRejectOnBehalf
  } = props;

  return (
    <div className={styles.detailWorkflowPanel}>
      {allSteps.length === 0 ? (
        <p className={styles.detailWorkflowEmpty}>Chưa có dữ liệu quy trình phê duyệt.</p>
      ) : (
        <div className={styles.detailWorkflowStepList}>
          {allSteps.map((step, stepIndex) => (
            <PhvbMagDetailWorkflowStepCard
              key={step.id}
              step={step}
              isCurrent={step.statusTone === 'active' || stepIndex === currentStepIndex}
              onBehalfParticipant={
                step.participantId !== undefined ? onBehalfParticipantsById.get(step.participantId) : undefined
              }
              canRejectOnBehalf={canRejectOnBehalf}
              isOnBehalfBusy={isOnBehalfBusy}
              onConfirmOnBehalf={onConfirmOnBehalf}
              onRejectOnBehalf={onRejectOnBehalf}
            />
          ))}
        </div>
      )}

      {workflowParticipants.length === 0 ? (
        <p className={styles.detailWorkflowHint}>
          Chưa có dữ liệu người tham gia từ AllUser_GopY, AllUser_ThamDinh, AllUser_PheDuyet.
        </p>
      ) : null}
    </div>
  );
}

export function PhvbMagDetailWorkflowSidebar(props: IPhvbMagDetailWorkflowSidebarProps): React.ReactElement {
  const {
    release,
    workflowParticipants,
    canOpenParticipantModal,
    onOpenParticipantModal,
    canRemindDeadline = false,
    isRemindSending = false,
    remindErrorMessage,
    isRemindDialogOpen = false,
    onOpenRemindDeadline,
    layout = 'sidebar',
    approveLabel,
    pendingParticipants = [],
    canRejectAtActiveStage = false,
    canActOnBehalfOfParticipant = false,
    isWorkflowActionProcessing = false,
    workflowActionErrorMessage,
    onRunWorkflowAction
  } = props;

  const [onBehalfAction, setOnBehalfAction] = useState<WorkflowActionKey | undefined>(undefined);
  const [onBehalfParticipantId, setOnBehalfParticipantId] = useState<number | undefined>(undefined);

  const allSteps = useMemo(
    () => buildWorkflowTimelineSteps(release, workflowParticipants),
    [release, workflowParticipants]
  );

  const currentStepIndex = findCurrentWorkflowStepIndex(allSteps);
  const showParticipantButton = Boolean(canOpenParticipantModal) && Boolean(onOpenParticipantModal);
  const showRemindButton = canRemindDeadline && Boolean(onOpenRemindDeadline);
  const showWorkflowActions = showRemindButton || showParticipantButton;

  const showOnBehalf = canActOnBehalfOfParticipant && pendingParticipants.length > 0;
  const onBehalfParticipantsById = useMemo(() => {
    const map = new Map<number, IAllUserWorkflowItem>();
    if (showOnBehalf) {
      pendingParticipants.forEach(participant => map.set(participant.Id, participant));
    }
    return map;
  }, [showOnBehalf, pendingParticipants]);

  const isOnBehalfDialogOpen = Boolean(onBehalfAction);

  const openOnBehalfDialog = (action: WorkflowActionKey, participantId: number): void => {
    if (isWorkflowActionProcessing) {
      return;
    }

    setOnBehalfAction(action);
    setOnBehalfParticipantId(participantId);
  };

  const closeOnBehalfDialog = (): void => {
    if (isWorkflowActionProcessing) {
      return;
    }

    setOnBehalfAction(undefined);
    setOnBehalfParticipantId(undefined);
  };

  const handleOnBehalfConfirm = async (comment: string, files: File[]): Promise<void> => {
    if (!onBehalfAction || !onRunWorkflowAction || isWorkflowActionProcessing) {
      return;
    }

    const succeeded = await onRunWorkflowAction(onBehalfAction, comment || undefined, onBehalfParticipantId, files);

    if (succeeded) {
      setOnBehalfAction(undefined);
      setOnBehalfParticipantId(undefined);
    }
  };

  const participantButton = showParticipantButton ? (
    <button
      type="button"
      className={styles.detailWorkflowActionBtn}
      onClick={onOpenParticipantModal}
    >
      <WorkflowParticipantIcon className={styles.detailWorkflowActionBtnIcon} />
      Điều chỉnh người tham gia
    </button>
  ) : null;

  const remindButton = showRemindButton ? (
    <button
      type="button"
      className={styles.detailWorkflowActionBtn}
      disabled={isRemindSending}
      onClick={onOpenRemindDeadline}
    >
      <RemindDeadlineIcon className={styles.detailWorkflowActionBtnIcon} />
      Nhắc hạn
    </button>
  ) : null;

  const workflowActions = showWorkflowActions ? (
    <div className={styles.detailWorkflowTabActions}>
      {remindButton}
      {participantButton}
    </div>
  ) : null;

  const remindError = !isRemindDialogOpen && remindErrorMessage ? (
    <p className={styles.detailWorkflowActionError} role="alert">{remindErrorMessage}</p>
  ) : null;

  const onBehalfError = !isOnBehalfDialogOpen && workflowActionErrorMessage ? (
    <p className={styles.detailWorkflowActionError} role="alert">{workflowActionErrorMessage}</p>
  ) : null;

  const panelContent = (
    <WorkflowPanelContent
      allSteps={allSteps}
      currentStepIndex={currentStepIndex}
      workflowParticipants={workflowParticipants}
      onBehalfParticipantsById={onBehalfParticipantsById}
      canRejectOnBehalf={canRejectAtActiveStage}
      isOnBehalfBusy={isWorkflowActionProcessing}
      onConfirmOnBehalf={participantId => openOnBehalfDialog('approve', participantId)}
      onRejectOnBehalf={participantId => openOnBehalfDialog('reject', participantId)}
    />
  );

  const onBehalfDialog = (
    <PhvbMagWorkflowActionDialog
      isOpen={isOnBehalfDialogOpen}
      action={onBehalfAction}
      approveLabel={approveLabel}
      isProcessing={isWorkflowActionProcessing}
      errorMessage={isOnBehalfDialogOpen ? workflowActionErrorMessage : undefined}
      onCancel={closeOnBehalfDialog}
      onConfirm={(comment, files) => {
        handleOnBehalfConfirm(comment, files).catch(() => undefined);
      }}
    />
  );

  if (layout === 'tab') {
    return (
      <div className={styles.detailWorkflowTabPanel}>
        <div className={styles.detailWorkflowTabHeader}>
          <div className={styles.detailWorkflowTabTitleRow}>
            <h3 className={styles.detailWorkflowTabTitle}>Quy trình phê duyệt</h3>
            {allSteps.length > 0 ? (
              <span className={styles.detailWorkflowTabTitleSuffix}>{allSteps.length} bước</span>
            ) : null}
          </div>
          {workflowActions}
        </div>
        {remindError}
        {onBehalfError}
        {panelContent}
        {onBehalfDialog}
      </div>
    );
  }

  return (
    <PhvbMagSidebarAccordion
      title="Quy trình phê duyệt"
      titleSuffix={allSteps.length > 0 ? `· ${allSteps.length} BƯỚC` : undefined}
      fillHeight
      defaultOpen
      headerActions={workflowActions}
    >
      {remindError}
      {onBehalfError}
      {panelContent}
      {onBehalfDialog}
    </PhvbMagSidebarAccordion>
  );
}
