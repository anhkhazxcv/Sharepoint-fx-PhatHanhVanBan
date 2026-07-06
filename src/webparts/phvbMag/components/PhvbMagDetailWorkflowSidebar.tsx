import * as React from 'react';
import { useMemo } from 'react';
import type { IVanBanItem, IWorkflowParticipantItem } from '../models/PhvbMag.models';
import {
  buildWorkflowTimelineSteps,
  findCurrentWorkflowStepIndex
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { canOpenWorkflowParticipantModal } from '../utils/PhvbMagWorkflowParticipant.utils';
import { Person20Regular } from '@fluentui/react-icons';
import { PhvbMagDetailWorkflowStepCard } from './PhvbMagDetailWorkflowStepCard';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailWorkflowSidebarProps {
  release: IVanBanItem;
  workflowParticipants: IWorkflowParticipantItem[];
  canOpenParticipantModal?: boolean;
  onOpenParticipantModal?: () => void;
}

export function PhvbMagDetailWorkflowSidebar(props: IPhvbMagDetailWorkflowSidebarProps): React.ReactElement {
  const {
    release,
    workflowParticipants,
    canOpenParticipantModal,
    onOpenParticipantModal
  } = props;

  const allSteps = useMemo(
    () => buildWorkflowTimelineSteps(release, workflowParticipants),
    [release, workflowParticipants]
  );

  const currentStepIndex = findCurrentWorkflowStepIndex(allSteps);
  const showParticipantButton = (canOpenParticipantModal ?? canOpenWorkflowParticipantModal(release)) && Boolean(onOpenParticipantModal);

  return (
    <PhvbMagSidebarAccordion
      title="Quy trình phê duyệt"
      titleSuffix={allSteps.length > 0 ? `· ${allSteps.length} BƯỚC` : undefined}
      fillHeight
      defaultOpen
      headerActions={
        showParticipantButton ? (
          <button
            type="button"
            className={styles.detailWorkflowAdjustParticipantsBtn}
            onClick={onOpenParticipantModal}
          >
            <Person20Regular className={styles.detailWorkflowAdjustParticipantsBtnIcon} aria-hidden="true" />
            Điều chỉnh người tham gia
          </button>
        ) : null
      }
    >
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
    </PhvbMagSidebarAccordion>
  );
}
