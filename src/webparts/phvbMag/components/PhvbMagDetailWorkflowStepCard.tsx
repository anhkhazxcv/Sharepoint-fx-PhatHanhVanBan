import * as React from 'react';
import type { IAllUserWorkflowItem } from '../models/PhvbMag.models';
import type { IWorkflowTimelineStep } from '../utils/PhvbMagWorkflowTimeline.utils';
import {
  getWorkflowStepDisplayInitials,
  resolveWorkflowStepStatusChip
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { usePhvbAvatarPhotoState } from '../hooks/usePhvbAvatarPhotoState';
import { AvatarBadgeRejectedIcon, SuccessIcon } from './PhvbMagIcons';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailWorkflowStepCardProps {
  step: IWorkflowTimelineStep;
  photoUrl?: string;
  isCurrent: boolean;
  onBehalfParticipant?: IAllUserWorkflowItem;
  canRejectOnBehalf?: boolean;
  isOnBehalfBusy?: boolean;
  onConfirmOnBehalf?: (participantId: number) => void;
  onRejectOnBehalf?: (participantId: number) => void;
}

export function PhvbMagDetailWorkflowStepCard(props: IPhvbMagDetailWorkflowStepCardProps): React.ReactElement {
  const {
    step,
    photoUrl,
    isCurrent,
    onBehalfParticipant,
    canRejectOnBehalf = false,
    isOnBehalfBusy = false,
    onConfirmOnBehalf,
    onRejectOnBehalf
  } = props;
  const toneClass =
    step.statusTone === 'rejected'
      ? styles.detailWorkflowStepCardRejected
      : step.statusTone === 'done'
        ? styles.detailWorkflowStepCardDone
        : step.statusTone === 'active'
          ? styles.detailWorkflowStepCardActive
          : styles.detailWorkflowStepCardPending;

  const avatarCircleClass =
    step.statusTone === 'rejected'
      ? styles.detailWorkflowStepCardIconRejected
      : step.statusTone === 'done'
        ? styles.detailWorkflowStepCardIconDone
        : step.statusTone === 'active'
          ? styles.detailWorkflowStepCardIconActive
          : styles.detailWorkflowStepCardIconPending;

  const { showPhoto, onImageError } = usePhvbAvatarPhotoState(photoUrl);
  const statusChip = resolveWorkflowStepStatusChip(step);
  const title = `${step.stageLabel} - ${step.name}`;

  return (
    <div className={[styles.detailWorkflowStepCard, toneClass].filter(Boolean).join(' ')}>
      <div className={styles.detailWorkflowStepCardIcon}>
        <span className={avatarCircleClass}>
          {showPhoto ? (
            <img
              src={photoUrl}
              alt={step.name}
              className={styles.detailWorkflowStepCardAvatarImage}
              onError={onImageError}
            />
          ) : (
            <span aria-hidden="true">{getWorkflowStepDisplayInitials(step.name)}</span>
          )}
        </span>
        {step.statusTone === 'done' ? (
          <span
            className={[styles.detailWorkflowStepCardBadge, styles.detailWorkflowStepCardBadgeDone].join(' ')}
            aria-hidden="true"
          >
            <SuccessIcon />
          </span>
        ) : null}
        {step.statusTone === 'rejected' ? (
          <span
            className={[styles.detailWorkflowStepCardBadge, styles.detailWorkflowStepCardBadgeRejected].join(' ')}
            aria-hidden="true"
          >
            <AvatarBadgeRejectedIcon />
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
            step.statusTone === 'rejected' ? styles.detailWorkflowStepCardStatusChipRejected : '',
            step.statusTone === 'done' ? styles.detailWorkflowStepCardStatusChipDone : '',
            step.statusTone === 'active' ? styles.detailWorkflowStepCardStatusChipActive : '',
            step.statusTone === 'pending' ? styles.detailWorkflowStepCardStatusChipPending : ''
          ].filter(Boolean).join(' ')}
        >
          {statusChip}
        </span>
      </div>

      {onBehalfParticipant ? (
        <div className={styles.detailWorkflowStepCardOnBehalf}>
          <span className={styles.detailWorkflowStepCardOnBehalfLabel}>
            Xử lý thay {onBehalfParticipant.User_ThucHien || onBehalfParticipant.Email_ThucHien || 'người tham gia'}
          </span>
          <div className={styles.detailWorkflowStepCardOnBehalfActions}>
            <button
              type="button"
              className={styles.detailActionApprove}
              disabled={isOnBehalfBusy}
              onClick={() => onConfirmOnBehalf?.(onBehalfParticipant.Id)}
            >
              Xác nhận thay
            </button>
            {canRejectOnBehalf ? (
              <button
                type="button"
                className={styles.detailActionReject}
                disabled={isOnBehalfBusy}
                onClick={() => onRejectOnBehalf?.(onBehalfParticipant.Id)}
              >
                Từ chối thay
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
