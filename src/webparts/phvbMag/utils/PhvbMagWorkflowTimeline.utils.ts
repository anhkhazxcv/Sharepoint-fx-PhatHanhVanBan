import {
  DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT,
  DETAIL_PANEL_EXPANDED_VISIBLE_COUNT,
  WORKFLOW_PARTICIPANT_STATUS
} from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem, WorkflowStage } from '../models/PhvbMag.models';

export type WorkflowStepTone = 'done' | 'active' | 'pending';

export interface IWorkflowTimelineStep {
  id: string;
  stageLabel: string;
  name: string;
  meta?: string;
  status?: string;
  statusTone: WorkflowStepTone;
}

const STAGE_LABELS: Record<WorkflowStage, string> = {
  gopy: 'Góp ý',
  thamdinh: 'Thẩm định',
  pheduyet: 'Phê duyệt'
};

function normalizeStatusValue(status?: string): string {
  return (status || '')
    .trim()
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd');
}

export function isWorkflowParticipantConfirmed(status?: string): boolean {
  const normalized = normalizeStatusValue(status);
  return normalized === 'da xac nhan';
}

export function isWorkflowParticipantUnconfirmed(status?: string): boolean {
  if (!status || !status.trim()) {
    return true;
  }

  if (isWorkflowParticipantConfirmed(status)) {
    return false;
  }

  const normalized = normalizeStatusValue(status);
  return (
    normalized === 'chua xac nhan' ||
    normalized === 'chua den luot' ||
    normalized.indexOf('chua') > -1
  );
}

export function resolveWorkflowParticipantStatusLabel(status?: string): string {
  return isWorkflowParticipantConfirmed(status)
    ? WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN
    : WORKFLOW_PARTICIPANT_STATUS.CHUA_XAC_NHAN;
}

export function resolveWorkflowStepTone(status?: string): WorkflowStepTone {
  if (isWorkflowParticipantConfirmed(status)) {
    return 'done';
  }

  if (isWorkflowParticipantUnconfirmed(status)) {
    return 'pending';
  }

  const normalized = normalizeStatusValue(status);

  if (normalized.indexOf('dang') > -1) {
    return 'active';
  }

  return 'pending';
}

function resolveParticipantMeta(participant: IWorkflowParticipantItem): string | undefined {
  if (!isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien)) {
    return undefined;
  }

  return participant.Modified || undefined;
}

function markCurrentPendingStep(steps: IWorkflowTimelineStep[]): void {
  let assignedCurrent = false;

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];

    if (step.id === 'draft-creator') {
      continue;
    }

    if (step.statusTone === 'pending' && !assignedCurrent) {
      step.statusTone = 'active';
      assignedCurrent = true;
    }
  }
}

export function buildWorkflowTimelineSteps(
  release: IVanBanItem,
  workflowParticipants: IWorkflowParticipantItem[]
): IWorkflowTimelineStep[] {
  const steps: IWorkflowTimelineStep[] = [
    {
      id: 'draft-creator',
      stageLabel: 'Soạn thảo',
      name: release.NguoiTao || '---',
      meta: release.NgayTaoYeuCau,
      status: 'Hoàn thành',
      statusTone: 'done'
    }
  ];

  const stageOrder: WorkflowStage[] = ['gopy', 'thamdinh', 'pheduyet'];

  stageOrder.forEach(stage => {
    workflowParticipants
      .filter(participant => participant.workflowStage === stage)
      .forEach(participant => {
        steps.push({
          id: `participant-${stage}-${participant.Id}`,
          stageLabel: STAGE_LABELS[stage],
          name: participant.PhongBan_ThucHien
            ? `${participant.User_ThucHien || '---'} (${participant.PhongBan_ThucHien})`
            : (participant.User_ThucHien || '---'),
          meta: resolveParticipantMeta(participant),
          status: resolveWorkflowParticipantStatusLabel(participant.TrangThai_ThucHien),
          statusTone: resolveWorkflowStepTone(participant.TrangThai_ThucHien)
        });
      });
  });

  markCurrentPendingStep(steps);

  return steps;
}

function findStepIndex(steps: IWorkflowTimelineStep[], predicate: (step: IWorkflowTimelineStep) => boolean): number {
  for (let index = 0; index < steps.length; index += 1) {
    if (predicate(steps[index])) {
      return index;
    }
  }

  return -1;
}

export function findCurrentWorkflowStepIndex(steps: IWorkflowTimelineStep[]): number {
  if (steps.length === 0) {
    return -1;
  }

  const activeIndex = findStepIndex(steps, step => step.statusTone === 'active');
  if (activeIndex > -1) {
    return activeIndex;
  }

  const pendingIndex = findStepIndex(steps, step => step.statusTone === 'pending');
  if (pendingIndex > -1) {
    return pendingIndex;
  }

  return steps.length - 1;
}

export interface IWorkflowTimelineWindow {
  visibleSteps: IWorkflowTimelineStep[];
  completedHiddenCount: number;
  pendingHiddenCount: number;
  currentIndex: number;
}

const COLLAPSED_VISIBLE_STEP_COUNT = DETAIL_PANEL_COLLAPSED_VISIBLE_COUNT;
const EXPANDED_VISIBLE_STEP_COUNT = DETAIL_PANEL_EXPANDED_VISIBLE_COUNT;

export function getWorkflowTimelineWindow(
  steps: IWorkflowTimelineStep[],
  isExpanded: boolean
): IWorkflowTimelineWindow {
  const currentIndex = findCurrentWorkflowStepIndex(steps);

  if (isExpanded) {
    return {
      visibleSteps: steps,
      completedHiddenCount: 0,
      pendingHiddenCount: Math.max(0, steps.length - EXPANDED_VISIBLE_STEP_COUNT),
      currentIndex
    };
  }

  if (steps.length <= COLLAPSED_VISIBLE_STEP_COUNT) {
    return {
      visibleSteps: steps,
      completedHiddenCount: 0,
      pendingHiddenCount: 0,
      currentIndex
    };
  }

  let start = Math.max(0, currentIndex - 1);
  let end = start + COLLAPSED_VISIBLE_STEP_COUNT;

  if (end > steps.length) {
    end = steps.length;
    start = Math.max(0, end - COLLAPSED_VISIBLE_STEP_COUNT);
  }

  return {
    visibleSteps: steps.slice(start, end),
    completedHiddenCount: start,
    pendingHiddenCount: steps.length - end,
    currentIndex
  };
}
