import { REQUEST_STATUS, WORKFLOW_PARTICIPANT_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem, IWorkflowParticipantItem, WorkflowStage } from '../models/PhvbMag.models';
import { resolveWorkflowStageFromStatus } from './PhvbMagWorkflowState.utils';
import { formatExecutionDateTime } from './PhvbMagDateTime.utils';

export type WorkflowStepTone = 'done' | 'active' | 'pending' | 'rejected' | 'skipped';

export interface IWorkflowTimelineStep {
  id: string;
  stageLabel: string;
  name: string;
  email?: string;
  meta?: string;
  subtitle?: string;
  status?: string;
  statusTone: WorkflowStepTone;
  stepNumber: number;
  /** Id của IAllUserWorkflowItem gốc — dùng để đối chiếu với pendingParticipants (xử lý thay). Không có ở step 'draft-creator'. */
  participantId?: number;
  /** Raw stage key — dùng để nhóm participant cùng stage khi xác định step nào nên là 'active'. */
  stage?: WorkflowStage;
}

const STAGE_LABELS: Record<WorkflowStage, string> = {
  gopy: 'Góp ý',
  thamdinh: 'Thẩm định',
  pheduyet: 'Phê duyệt'
};

/**
 * Nhãn hiển thị trên chip của card luồng duyệt — chỉ dùng cho UI.
 * KHÔNG dùng WORKFLOW_PARTICIPANT_STATUS ở đây: đó là Choice value lưu trên
 * SharePoint, đổi chữ hiển thị không được kéo theo đổi dữ liệu.
 */
const WORKFLOW_STEP_CHIP_LABEL = {
  DONE: 'Đồng ý',
  DRAFT_DONE: 'Hoàn thành',
  REJECTED: 'Từ chối',
  ACTIVE: 'Đang xử lý',
  PENDING: 'Chưa xử lý',
  SKIPPED: 'Hết hiệu lực'
} as const;

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

export function isWorkflowParticipantRejected(status?: string): boolean {
  const normalized = normalizeStatusValue(status);
  return (
    normalized === 'da tu choi' ||
    normalized.indexOf('tu choi') > -1
  );
}

export function isWorkflowParticipantConfirmed(status?: string): boolean {
  if (isWorkflowParticipantRejected(status)) {
    return false;
  }

  const normalized = normalizeStatusValue(status);
  return normalized === 'da xac nhan';
}

export function isWorkflowParticipantUnconfirmed(status?: string): boolean {
  if (!status || !status.trim()) {
    return true;
  }

  if (isWorkflowParticipantRejected(status)) {
    return false;
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
  if (isWorkflowParticipantRejected(status)) {
    return WORKFLOW_PARTICIPANT_STATUS.DA_TU_CHOI;
  }

  return isWorkflowParticipantConfirmed(status)
    ? WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN
    : WORKFLOW_PARTICIPANT_STATUS.CHUA_XAC_NHAN;
}

export function resolveWorkflowStepTone(status?: string): WorkflowStepTone {
  if (isWorkflowParticipantRejected(status)) {
    return 'rejected';
  }

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
  const status = participant.TrangThai_ThucHien;

  if (!isWorkflowParticipantConfirmed(status) && !isWorkflowParticipantRejected(status)) {
    return undefined;
  }

  const actionDate = participant.Modified;
  return actionDate ? formatExecutionDateTime(actionDate) : undefined;
}

export function resolveWorkflowStepStatusChip(step: IWorkflowTimelineStep): string {
  if (step.statusTone === 'rejected') {
    return WORKFLOW_STEP_CHIP_LABEL.REJECTED;
  }

  if (step.statusTone === 'active') {
    return WORKFLOW_STEP_CHIP_LABEL.ACTIVE;
  }

  if (step.statusTone === 'pending') {
    return WORKFLOW_STEP_CHIP_LABEL.PENDING;
  }

  if (step.statusTone === 'skipped') {
    return WORKFLOW_STEP_CHIP_LABEL.SKIPPED;
  }

  // Còn lại là tone 'done'.
  return step.id === 'draft-creator'
    ? WORKFLOW_STEP_CHIP_LABEL.DRAFT_DONE
    : WORKFLOW_STEP_CHIP_LABEL.DONE;
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

const WORKFLOW_STAGE_ORDER: WorkflowStage[] = ['gopy', 'thamdinh', 'pheduyet'];

/**
 * Vị trí của giai đoạn hiện tại (theo StatusApproved thật của yêu cầu) trong
 * WORKFLOW_STAGE_ORDER. -1: chưa bắt đầu duyệt (Bản nháp). 0-2: đang ở đúng 1
 * trong 3 giai đoạn. WORKFLOW_STAGE_ORDER.length: đã đi qua/đóng cả 3 giai đoạn
 * (Chờ cấp số, Đã cấp số, Ban hành, Từ chối, Thu hồi,...).
 */
function resolveWorkflowStageProgressIndex(statusApproved?: string): number {
  const stage = resolveWorkflowStageFromStatus(statusApproved);

  if (stage !== 'none') {
    return WORKFLOW_STAGE_ORDER.indexOf(stage);
  }

  return (statusApproved || '').trim() === REQUEST_STATUS.BAN_NHAP ? -1 : WORKFLOW_STAGE_ORDER.length;
}

function markCurrentPendingStep(steps: IWorkflowTimelineStep[], statusApproved?: string): void {
  const hasRejectedStep = steps.some(step => step.statusTone === 'rejected');

  if (hasRejectedStep) {
    return;
  }

  const currentStage = resolveWorkflowStageFromStatus(statusApproved);
  const progressIndex = resolveWorkflowStageProgressIndex(statusApproved);

  steps.forEach(step => {
    if (step.stage === undefined || step.statusTone !== 'pending') {
      return;
    }

    if (step.stage === currentStage) {
      step.statusTone = 'active';
      return;
    }

    // Giai đoạn của step đã đóng lại (yêu cầu đã đi tiếp hoặc đã kết thúc) nhưng
    // participant chưa từng xác nhận — vd. Góp ý không bắt buộc bị bỏ qua khi
    // chuyển sang Thẩm định.
    if (WORKFLOW_STAGE_ORDER.indexOf(step.stage) < progressIndex) {
      step.statusTone = 'skipped';
    }
  });
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
      email: release.EmailNguoiTao,
      meta: release.Created,
      subtitle: release.Created ? formatExecutionDateTime(release.Created) : undefined,
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
          email: participant.Email_ThucHien,
          meta: participant.Modified,
          subtitle: buildParticipantSubtitle(participant),
          status: resolveWorkflowParticipantStatusLabel(participant.TrangThai_ThucHien),
          statusTone: resolveWorkflowStepTone(participant.TrangThai_ThucHien),
          stepNumber: steps.length + 1,
          participantId: participant.Id,
          stage
        });
      });
  });

  markCurrentPendingStep(steps, release.StatusApproved);

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

  const rejectedIndex = findStepIndex(steps, step => step.statusTone === 'rejected');
  if (rejectedIndex > -1) {
    return rejectedIndex;
  }

  const activeIndex = findStepIndex(steps, step => step.statusTone === 'active');
  if (activeIndex > -1) {
    return activeIndex;
  }

  const pendingIndex = findStepIndex(steps, step => step.statusTone === 'pending');
  if (pendingIndex > -1) {
    return pendingIndex;
  }

  return -1;
}
