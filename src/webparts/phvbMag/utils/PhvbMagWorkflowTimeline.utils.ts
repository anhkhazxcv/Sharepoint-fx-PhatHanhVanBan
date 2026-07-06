import { WORKFLOW_PARTICIPANT_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem, WorkflowStage } from '../models/PhvbMag.models';
import { formatExecutionDateTime, parseExecutionDateTime } from './PhvbMagDateTime.utils';

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

function formatShortDayMonth(value?: string): string | undefined {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return undefined;
  }

  const day = parsed.getDate();
  const month = parsed.getMonth() + 1;
  return `${day < 10 ? `0${day}` : day}/${month < 10 ? `0${month}` : month}`;
}

function resolveStageDeadline(release: IVanBanItem, stage: WorkflowStage): string | undefined {
  switch (stage) {
    case 'gopy':
      return release.Date_GopY;
    case 'thamdinh':
      return release.Date_ThamDinh;
    case 'pheduyet':
      return release.Date_PheDuyet;
    default:
      return undefined;
  }
}

function buildParticipantSubtitle(
  release: IVanBanItem,
  participant: IWorkflowParticipantItem,
  stage: WorkflowStage
): string | undefined {
  const parts: string[] = [];

  if (participant.PhongBan_ThucHien) {
    parts.push(participant.PhongBan_ThucHien);
  }

  const deadline = formatShortDayMonth(resolveStageDeadline(release, stage));
  if (deadline) {
    parts.push(`HĐ ${deadline}`);
  }

  if (isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien)) {
    const doneDate = formatShortDayMonth(participant.Modified || participant.Ngay_ThucHien);
    if (doneDate) {
      parts.push(`Done ${doneDate}`);
    }
  } else if (isWorkflowParticipantUnconfirmed(participant.TrangThai_ThucHien)) {
    const normalized = normalizeStatusValue(participant.TrangThai_ThucHien);
    if (normalized === 'chua den luot') {
      parts.push(WORKFLOW_PARTICIPANT_STATUS.CHUA_DEN_LUOT);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
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
          subtitle: buildParticipantSubtitle(release, participant, stage),
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
