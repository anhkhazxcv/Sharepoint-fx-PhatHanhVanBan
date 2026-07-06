import * as React from 'react';
import type { IWorkflowTimelineStep } from '../utils/PhvbMagWorkflowTimeline.utils';
import {
  getWorkflowStepDisplayInitials,
  resolveWorkflowStepStatusChip
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { SuccessIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailWorkflowStepCardProps {
  step: IWorkflowTimelineStep;
  isCurrent: boolean;
}

export function PhvbMagDetailWorkflowStepCard(props: IPhvbMagDetailWorkflowStepCardProps): React.ReactElement {
  const { step, isCurrent } = props;
  const toneClass =
    step.statusTone === 'done'
      ? styles.detailWorkflowStepCardDone
      : step.statusTone === 'active'
        ? styles.detailWorkflowStepCardActive
        : styles.detailWorkflowStepCardPending;

  const statusChip = resolveWorkflowStepStatusChip(step);
  const title = `${step.stageLabel} - ${step.name}`;

  return (
    <div className={[styles.detailWorkflowStepCard, toneClass].filter(Boolean).join(' ')}>
      <div className={styles.detailWorkflowStepCardIcon}>
        {step.statusTone === 'done' ? (
          <span className={styles.detailWorkflowStepCardIconDone} aria-hidden="true">
            <SuccessIcon />
          </span>
        ) : null}
        {step.statusTone === 'active' ? (
          <span className={styles.detailWorkflowStepCardIconActive} aria-hidden="true">
            {getWorkflowStepDisplayInitials(step.name)}
          </span>
        ) : null}
        {step.statusTone === 'pending' ? (
          <span className={styles.detailWorkflowStepCardIconPending} aria-hidden="true">
            {step.stepNumber}
          </span>
        ) : null}
      </div>

      <div className={styles.detailWorkflowStepCardMain}>
        <div className={styles.detailWorkflowStepCardTitleRow}>
          <strong className={styles.detailWorkflowStepCardTitle}>{title}</strong>
          {isCurrent ? (
            <span className={styles.detailWorkflowStepCardCurrentBadge}>HIỆN TẠI</span>
          ) : null}
        </div>
        {step.subtitle ? (
          <div className={styles.detailWorkflowStepCardMeta}>{step.subtitle}</div>
        ) : null}
      </div>

      <div className={styles.detailWorkflowStepCardStatus}>
        <span
          className={[
            styles.detailWorkflowStepCardStatusChip,
            step.statusTone === 'done' ? styles.detailWorkflowStepCardStatusChipDone : '',
            step.statusTone === 'active' ? styles.detailWorkflowStepCardStatusChipActive : '',
            step.statusTone === 'pending' ? styles.detailWorkflowStepCardStatusChipPending : ''
          ].filter(Boolean).join(' ')}
        >
          {statusChip}
        </span>
      </div>
    </div>
  );
}
