import * as React from 'react';
import { useMemo } from 'react';
import type { IVanBanItem, IWorkflowParticipantItem } from '../models/PhvbMag.models';
import {
  buildWorkflowTimelineSteps,
  findCurrentWorkflowStepIndex
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { canOpenWorkflowParticipantModal } from '../utils/PhvbMagWorkflowParticipant.utils';
import { ClockAlarm20Regular, Person20Regular } from '@fluentui/react-icons';
import { PhvbMagDetailWorkflowStepCard } from './PhvbMagDetailWorkflowStepCard';
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
}

function WorkflowPanelContent(props: {
  allSteps: ReturnType<typeof buildWorkflowTimelineSteps>;
  currentStepIndex: number;
  workflowParticipants: IWorkflowParticipantItem[];
}): React.ReactElement {
  const { allSteps, currentStepIndex, workflowParticipants } = props;

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
              isCurrent={stepIndex === currentStepIndex}
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
    layout = 'sidebar'
  } = props;

  const allSteps = useMemo(
    () => buildWorkflowTimelineSteps(release, workflowParticipants),
    [release, workflowParticipants]
  );

  const currentStepIndex = findCurrentWorkflowStepIndex(allSteps);
  const showParticipantButton = (canOpenParticipantModal ?? canOpenWorkflowParticipantModal(release)) && Boolean(onOpenParticipantModal);
  const showRemindButton = canRemindDeadline && Boolean(onOpenRemindDeadline);
  const showWorkflowActions = showRemindButton || showParticipantButton;

  const participantButton = showParticipantButton ? (
    <button
      type="button"
      className={styles.detailWorkflowActionBtn}
      onClick={onOpenParticipantModal}
    >
      <Person20Regular className={styles.detailWorkflowActionBtnIcon} aria-hidden="true" />
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
      <ClockAlarm20Regular className={styles.detailWorkflowActionBtnIcon} aria-hidden="true" />
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

  const panelContent = (
    <WorkflowPanelContent
      allSteps={allSteps}
      currentStepIndex={currentStepIndex}
      workflowParticipants={workflowParticipants}
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
        {panelContent}
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
      {panelContent}
    </PhvbMagSidebarAccordion>
  );
}
