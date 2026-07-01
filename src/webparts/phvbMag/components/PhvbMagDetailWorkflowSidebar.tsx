import * as React from 'react';
import { useMemo } from 'react';
import { DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT } from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import {
  buildWorkflowTimelineSteps,
  findCurrentWorkflowStepIndex,
  getWorkflowTimelineWindow,
  type IWorkflowTimelineStep
} from '../utils/PhvbMagWorkflowTimeline.utils';
import { canOpenWorkflowParticipantModal } from '../utils/PhvbMagWorkflowParticipant.utils';
import { PhvbMagSidebarAccordion } from './PhvbMagSidebarAccordion';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailWorkflowSidebarProps {
  release: IVanBanItem;
  workflowParticipants: IWorkflowParticipantItem[];
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  canOpenParticipantModal?: boolean;
  onOpenParticipantModal?: () => void;
}

function renderTimelineStep(
  item: IWorkflowTimelineStep,
  isCurrent: boolean
): React.ReactElement {
  return (
    <div
      key={item.id}
      className={[
        styles.detailWorkflowItem,
        isCurrent ? styles.detailWorkflowItemCurrent : ''
      ].filter(Boolean).join(' ')}
    >
      <div className={styles.detailWorkflowRail}>
        <span
          className={[
            styles.detailWorkflowDot,
            item.statusTone === 'done' ? styles.detailWorkflowDotDone : '',
            item.statusTone === 'active' ? styles.detailWorkflowDotActive : '',
            item.statusTone === 'pending' ? styles.detailWorkflowDotPending : ''
          ].filter(Boolean).join(' ')}
        />
        <span className={styles.detailWorkflowRailLine} aria-hidden="true" />
      </div>

      <div className={styles.detailWorkflowContent}>
        <div className={styles.detailWorkflowStage}>{item.stageLabel}</div>
        <div className={styles.detailWorkflowName}>{item.name}</div>
        {item.meta ? (
          <div className={styles.detailWorkflowMeta}>{formatExecutionDateTime(item.meta)}</div>
        ) : null}
        {item.status ? (
          <span
            className={[
              styles.detailWorkflowStatus,
              item.statusTone === 'done' ? styles.detailWorkflowStatusDone : '',
              item.statusTone === 'active' ? styles.detailWorkflowStatusActive : '',
              item.statusTone === 'pending' ? styles.detailWorkflowStatusPending : ''
            ].filter(Boolean).join(' ')}
          >
            {item.status}
          </span>
        ) : null}
        {isCurrent ? <span className={styles.detailWorkflowCurrentBadge}>Bước hiện tại</span> : null}
      </div>
    </div>
  );
}

export function PhvbMagDetailWorkflowSidebar(props: IPhvbMagDetailWorkflowSidebarProps): React.ReactElement {
  const {
    release,
    workflowParticipants,
    isExpanded,
    onExpandedChange,
    canOpenParticipantModal,
    onOpenParticipantModal
  } = props;

  const allSteps = useMemo(
    () => buildWorkflowTimelineSteps(release, workflowParticipants),
    [release, workflowParticipants]
  );

  const timelineWindow = useMemo(
    () => getWorkflowTimelineWindow(allSteps, isExpanded),
    [allSteps, isExpanded]
  );

  const currentStepIndex = findCurrentWorkflowStepIndex(allSteps);
  const canExpand = allSteps.length > DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT;
  const showParticipantButton = (canOpenParticipantModal ?? canOpenWorkflowParticipantModal(release)) && Boolean(onOpenParticipantModal);

  const handleToggleExpand = (): void => {
    onExpandedChange(!isExpanded);
  };

  return (
    <PhvbMagSidebarAccordion
      title="Quy trình phê duyệt"
      badge={allSteps.length > 0 ? `${allSteps.length} bước` : undefined}
      defaultOpen
    >
      <div className={styles.detailWorkflowPanel}>
        {allSteps.length === 0 ? (
          <p className={styles.detailWorkflowEmpty}>Chưa có dữ liệu quy trình phê duyệt.</p>
        ) : (
          <>
            {timelineWindow.completedHiddenCount > 0 ? (
              <div className={styles.detailWorkflowSummary}>
                Đã hoàn thành {timelineWindow.completedHiddenCount} bước
              </div>
            ) : null}

            <div
              className={[
                styles.detailWorkflowTimeline,
                isExpanded ? styles.detailWorkflowTimelineExpanded : styles.detailWorkflowTimelineCollapsed
              ].filter(Boolean).join(' ')}
            >
              {timelineWindow.visibleSteps.map(step => {
                let stepIndex = -1;
                for (let index = 0; index < allSteps.length; index += 1) {
                  if (allSteps[index].id === step.id) {
                    stepIndex = index;
                    break;
                  }
                }

                return renderTimelineStep(step, stepIndex === currentStepIndex);
              })}
            </div>

            {timelineWindow.pendingHiddenCount > 0 ? (
              <div className={styles.detailWorkflowSummaryMuted}>
                Còn {timelineWindow.pendingHiddenCount} bước tiếp theo
              </div>
            ) : null}

            {workflowParticipants.length === 0 ? (
              <p className={styles.detailWorkflowHint}>
                Chưa có dữ liệu người tham gia từ AllUser_GopY, AllUser_ThamDinh, AllUser_PheDuyet.
              </p>
            ) : null}
          </>
        )}

        {canExpand ? (
          <button
            type="button"
            className={styles.detailSidebarExpandBtn}
            onClick={handleToggleExpand}
          >
            {isExpanded ? 'Thu gọn quy trình' : 'Xem toàn bộ quy trình'}
          </button>
        ) : null}

        {showParticipantButton ? (
          <button
            type="button"
            className={styles.detailWorkflowManageParticipantsBtn}
            onClick={onOpenParticipantModal}
          >
            Thêm người tham gia
          </button>
        ) : null}
      </div>
    </PhvbMagSidebarAccordion>
  );
}
