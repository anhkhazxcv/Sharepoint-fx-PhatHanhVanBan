import { REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IAllUserWorkflowItem, IVanBanItem, WorkflowStage } from '../models/PhvbMag.models';
import { isRevokeRelease } from './PhvbMagCapSo.utils';
import { isWorkflowParticipantConfirmed } from './PhvbMagWorkflowTimeline.utils';

export type WorkflowDocumentStage = WorkflowStage | 'none';

export interface IWorkflowStageParticipants {
  gopY: IAllUserWorkflowItem[];
  thamDinh: IAllUserWorkflowItem[];
  pheDuyet: IAllUserWorkflowItem[];
}

export function resolveWorkflowStageFromStatus(statusApproved?: string): WorkflowDocumentStage {
  const status = (statusApproved || '').trim();

  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      return 'gopy';
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 'thamdinh';
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'pheduyet';
    default:
      return 'none';
  }
}

export function isWorkflowActionableStatus(statusApproved?: string): boolean {
  return resolveWorkflowStageFromStatus(statusApproved) !== 'none';
}

export function getParticipantsForStage(
  stage: WorkflowStage,
  participants: IWorkflowStageParticipants
): IAllUserWorkflowItem[] {
  switch (stage) {
    case 'gopy':
      return participants.gopY;
    case 'thamdinh':
      return participants.thamDinh;
    case 'pheduyet':
      return participants.pheDuyet;
    default:
      return [];
  }
}

export function splitWorkflowParticipants(
  workflowParticipants: ReadonlyArray<{ workflowStage: WorkflowStage } & IAllUserWorkflowItem>
): IWorkflowStageParticipants {
  const gopY: IAllUserWorkflowItem[] = [];
  const thamDinh: IAllUserWorkflowItem[] = [];
  const pheDuyet: IAllUserWorkflowItem[] = [];

  workflowParticipants.forEach(participant => {
    switch (participant.workflowStage) {
      case 'gopy':
        gopY.push(participant);
        break;
      case 'thamdinh':
        thamDinh.push(participant);
        break;
      case 'pheduyet':
        pheDuyet.push(participant);
        break;
      default:
        break;
    }
  });

  return { gopY, thamDinh, pheDuyet };
}

export function areAllParticipantsConfirmed(participants: ReadonlyArray<IAllUserWorkflowItem>): boolean {
  if (participants.length === 0) {
    return true;
  }

  return participants.every(participant => isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien));
}

function resolveNextStageAfter(stage: WorkflowStage, participants: IWorkflowStageParticipants): WorkflowStage | undefined {
  if (stage === 'gopy') {
    if (participants.thamDinh.length > 0) {
      return 'thamdinh';
    }

    if (participants.pheDuyet.length > 0) {
      return 'pheduyet';
    }

    return undefined;
  }

  if (stage === 'thamdinh') {
    if (participants.pheDuyet.length > 0) {
      return 'pheduyet';
    }

    return undefined;
  }

  return undefined;
}

export function resolveStatusForWorkflowStage(stage: WorkflowStage): string {
  switch (stage) {
    case 'gopy':
      return REQUEST_STATUS.DANG_GOP_Y;
    case 'thamdinh':
      return REQUEST_STATUS.DANG_THAM_DINH;
    case 'pheduyet':
      return REQUEST_STATUS.DANG_PHE_DUYET;
    default:
      return REQUEST_STATUS.DANG_GOP_Y;
  }
}

export function resolveNextDocumentStatusAfterStageComplete(
  completedStage: WorkflowStage,
  participants: IWorkflowStageParticipants,
  loaiYeuCau?: string
): string {
  const nextStage = resolveNextStageAfter(completedStage, participants);

  if (nextStage) {
    return resolveStatusForWorkflowStage(nextStage);
  }

  if (isRevokeRelease({ LoaiYeuCau: loaiYeuCau })) {
    return REQUEST_STATUS.CHO_ADMIN_THU_HOI;
  }

  return REQUEST_STATUS.DA_CAP_SO;
}

export function resolveDocumentStatusAfterSkippingEmptyStages(
  currentStatus: string | undefined,
  participants: IWorkflowStageParticipants,
  loaiYeuCau?: string
): string | undefined {
  const currentStage = resolveWorkflowStageFromStatus(currentStatus);

  if (currentStage === 'none') {
    return undefined;
  }

  const stageParticipants = getParticipantsForStage(currentStage, participants);

  if (stageParticipants.length > 0) {
    return undefined;
  }

  return resolveNextDocumentStatusAfterStageComplete(currentStage, participants, loaiYeuCau);
}

export function resolveApproveActionLabel(stage: WorkflowDocumentStage): string {
  switch (stage) {
    case 'gopy':
      return 'Xác nhận góp ý';
    case 'thamdinh':
      return 'Xác nhận thẩm định';
    case 'pheduyet':
      return 'Phê duyệt';
    default:
      return 'Phê duyệt';
  }
}

export function resolveHistoryStatusForApprove(stage: WorkflowStage): string {
  switch (stage) {
    case 'gopy':
      return 'Xác nhận góp ý';
    case 'thamdinh':
      return 'Xác nhận thẩm định';
    case 'pheduyet':
      return 'Phê duyệt';
    default:
      return 'Phê duyệt';
  }
}

export function isTerminalWorkflowStatus(statusApproved?: string): boolean {
  const status = (statusApproved || '').trim();

  return (
    status === REQUEST_STATUS.DA_CAP_SO ||
    status === REQUEST_STATUS.CHO_BAN_HANH ||
    status === REQUEST_STATUS.BAN_HANH ||
    status === REQUEST_STATUS.THU_HOI ||
    status === REQUEST_STATUS.CHO_ADMIN_THU_HOI ||
    status === REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI ||
    status === REQUEST_STATUS.TU_CHOI ||
    status === REQUEST_STATUS.BAN_NHAP
  );
}

export function resolveEffectiveWorkflowStage(
  statusApproved: string | undefined,
  participants: IWorkflowStageParticipants,
  loaiYeuCau?: string
): WorkflowDocumentStage {
  let stage = resolveWorkflowStageFromStatus(statusApproved);
  let guard = 0;

  while (stage !== 'none' && guard < 3) {
    guard += 1;
    const stageParticipants = getParticipantsForStage(stage, participants);

    if (stageParticipants.length > 0) {
      return stage;
    }

    const nextStatus = resolveNextDocumentStatusAfterStageComplete(stage, participants, loaiYeuCau);
    const nextStage = resolveWorkflowStageFromStatus(nextStatus);

    if (nextStage === stage) {
      return 'none';
    }

    stage = nextStage;
  }

  return stage;
}

export function canCreatorEditRelease(release: IVanBanItem): boolean {
  return (release.StatusApproved || '').trim() === REQUEST_STATUS.BAN_NHAP;
}
