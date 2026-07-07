import { WORKFLOW_PARTICIPANT_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem, WorkflowStage } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from './PhvbMagDateTime.utils';

export type WorkflowStepTone = 'done' | 'active' | 'pending';

export interface IWorkflowTimelineStep {
  id: string;
  stageLabel: string;
  name: string;
  meta?: string;
  subtitle?: string;
  status?: string;
  statusTone: WorkflowStepTone;
  stepNumber: number;
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

function buildParticipantSubtitle(participant: IWorkflowParticipantItem): string | undefined {
  if (!isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien)) {
    return undefined;
  }

  const approvalDate = participant.Modified || participant.Ngay_ThucHien;
  return approvalDate ? formatExecutionDateTime(approvalDate) : undefined;
}

export function resolveWorkflowStepStatusChip(step: IWorkflowTimelineStep): string {
  if (step.statusTone === 'active') {
    return 'Đang xử lý';
  }

  if (step.statusTone === 'pending') {
    return 'Chờ';
  }

  if (step.id === 'draft-creator') {
    return step.status || 'Hoàn thành';
  }

  if (step.stageLabel === 'Góp ý' && step.status === WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN) {
    return 'Đồng ý';
  }

  return step.status || WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN;
}

export function getWorkflowStepDisplayInitials(name: string): string {
  const normalized = name.trim();

  if (!normalized) {
    return '?';
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
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
      subtitle: release.NgayTaoYeuCau ? formatExecutionDateTime(release.NgayTaoYeuCau) : undefined,
      status: 'Hoàn thành',
      statusTone: 'done',
      stepNumber: 1
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
          name: participant.User_ThucHien || '---',
          meta: participant.Modified || participant.Ngay_ThucHien,
          subtitle: buildParticipantSubtitle(participant),
          status: resolveWorkflowParticipantStatusLabel(participant.TrangThai_ThucHien),
          statusTone: resolveWorkflowStepTone(participant.TrangThai_ThucHien),
          stepNumber: steps.length + 1
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
