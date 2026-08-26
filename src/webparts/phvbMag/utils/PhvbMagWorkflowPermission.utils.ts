import { PHVB_ROLES, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IAllUserWorkflowItem, IPhvbRoleEntry, IRequestDetailData, WorkflowStage } from '../models/PhvbMag.models';
import { normalizeRoleEmail, userHasAnyRole } from './PhvbMagRole.utils';
import { isWorkflowParticipantConfirmed } from './PhvbMagWorkflowTimeline.utils';
import {
  getParticipantsForStage,
  isTerminalWorkflowStatus,
  isWorkflowActionableStatus,
  resolveEffectiveWorkflowStage,
  resolveReadyNextStatus,
  splitWorkflowParticipants,
  type WorkflowDocumentStage
} from './PhvbMagWorkflowState.utils';

export type WorkflowActionKey = 'approve' | 'reject';

export interface IWorkflowActionAvailability {
  approve: boolean;
  reject: boolean;
}

export interface IWorkflowActionContext {
  approveLabel: string;
  rejectLabel: string;
  activeStage: WorkflowDocumentStage;
  pendingParticipant?: IAllUserWorkflowItem;
  pendingParticipants: IAllUserWorkflowItem[];
  canRejectAtActiveStage: boolean;
  availableActions: IWorkflowActionAvailability;
}

function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function matchesUserEmail(participant: IAllUserWorkflowItem, userEmail: string): boolean {
  const normalizedUserEmail = normalizeEmail(userEmail);
  if (!normalizedUserEmail) {
    return false;
  }

  return normalizeEmail(participant.Email_ThucHien) === normalizedUserEmail;
}

function findPendingParticipantForUser(
  participants: ReadonlyArray<IAllUserWorkflowItem>,
  userEmail: string
): IAllUserWorkflowItem | undefined {
  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];

    if (!matchesUserEmail(participant, userEmail)) {
      continue;
    }

    if (isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien)) {
      continue;
    }

    return participant;
  }

  return undefined;
}

export function canRejectAtStage(stage: WorkflowStage): boolean {
  return stage === 'pheduyet' || stage === 'thamdinh';
}

function findPendingParticipantsForOthers(
  participants: ReadonlyArray<IAllUserWorkflowItem>,
  excludeParticipantId: number | undefined
): IAllUserWorkflowItem[] {
  const result: IAllUserWorkflowItem[] = [];

  for (let index = 0; index < participants.length; index += 1) {
    const participant = participants[index];

    if (isWorkflowParticipantConfirmed(participant.TrangThai_ThucHien)) {
      continue;
    }

    if (participant.Id === excludeParticipantId) {
      continue;
    }

    result.push(participant);
  }

  return result;
}

export function resolveWorkflowActionContext(
  data: IRequestDetailData,
  userEmail: string
): IWorkflowActionContext {
  const groupedParticipants = splitWorkflowParticipants(data.workflowParticipants);
  const activeStage = resolveEffectiveWorkflowStage(
    data.release.StatusApproved,
    groupedParticipants,
    data.release.LoaiYeuCau
  );
  const stageParticipants = activeStage === 'none'
    ? []
    : getParticipantsForStage(activeStage, groupedParticipants);
  const pendingParticipant = findPendingParticipantForUser(stageParticipants, userEmail);
  const pendingParticipants = findPendingParticipantsForOthers(stageParticipants, pendingParticipant?.Id);
  const canRejectAtActiveStage = activeStage !== 'none' && canRejectAtStage(activeStage);

  const isActionable = isWorkflowActionableStatus(data.release.StatusApproved)
    && !isTerminalWorkflowStatus(data.release.StatusApproved);

  const availableActions: IWorkflowActionAvailability = {
    approve: Boolean(isActionable && pendingParticipant),
    reject: Boolean(
      isActionable &&
      pendingParticipant &&
      canRejectAtActiveStage
    )
  };

  return {
    approveLabel: activeStage === 'none' ? 'Phê duyệt' : resolveApproveLabelForStage(activeStage),
    rejectLabel: activeStage === 'none' ? 'Từ chối' : resolveRejectLabelForStage(activeStage),
    activeStage,
    pendingParticipant,
    pendingParticipants,
    canRejectAtActiveStage,
    availableActions
  };
}

function resolveApproveLabelForStage(stage: WorkflowDocumentStage): string {
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

function resolveRejectLabelForStage(stage: WorkflowDocumentStage): string {
  switch (stage) {
    case 'thamdinh':
      return 'Từ chối thẩm định';
    case 'pheduyet':
      return 'Từ chối phê duyệt';
    default:
      return 'Từ chối';
  }
}

export interface IWorkflowTransitionContext {
  nextStatus?: string;
  transitionLabel: string;
  canRun: boolean;
}

function resolveTransitionLabelForStatus(nextStatus?: string): string {
  switch (nextStatus) {
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 'Chuyển thẩm định';
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'Chuyển phê duyệt';
    case REQUEST_STATUS.CHO_CAP_SO:
      return 'Chuyển cấp số';
    default:
      return 'Chuyển giai đoạn tiếp theo';
  }
}

export function resolveWorkflowTransitionContext(
  data: IRequestDetailData,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  userEmail: string
): IWorkflowTransitionContext {
  const nextStatus = resolveReadyNextStatus(
    data.release.StatusApproved,
    data.workflowParticipants,
    data.release.LoaiYeuCau
  );

  const hasPermission =
    userHasAnyRole(roles, userEmail, [PHVB_ROLES.ADMIN, PHVB_ROLES.SUPER_ADMIN]) ||
    (normalizeRoleEmail(data.release.EmailNguoiTao) === normalizeRoleEmail(userEmail) &&
      normalizeRoleEmail(userEmail) !== '');

  return {
    nextStatus,
    transitionLabel: resolveTransitionLabelForStatus(nextStatus),
    canRun: Boolean(nextStatus) && hasPermission
  };
}
