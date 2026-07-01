import type { IAllUserWorkflowItem, IRequestDetailData, WorkflowStage } from '../models/PhvbMag.models';
import { isWorkflowParticipantConfirmed } from './PhvbMagWorkflowTimeline.utils';
import {
  getParticipantsForStage,
  isTerminalWorkflowStatus,
  isWorkflowActionableStatus,
  resolveEffectiveWorkflowStage,
  splitWorkflowParticipants,
  type WorkflowDocumentStage
} from './PhvbMagWorkflowState.utils';

export type WorkflowActionKey = 'approve' | 'requestRevision' | 'reject';

export interface IWorkflowActionAvailability {
  approve: boolean;
  requestRevision: boolean;
  reject: boolean;
}

export interface IWorkflowActionContext {
  approveLabel: string;
  activeStage: WorkflowDocumentStage;
  pendingParticipant?: IAllUserWorkflowItem;
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

function canRequestRevisionAtStage(stage: WorkflowStage): boolean {
  return stage === 'thamdinh' || stage === 'pheduyet';
}

function canRejectAtStage(stage: WorkflowStage): boolean {
  return stage === 'pheduyet';
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

  const isActionable = isWorkflowActionableStatus(data.release.StatusApproved)
    && !isTerminalWorkflowStatus(data.release.StatusApproved);

  const availableActions: IWorkflowActionAvailability = {
    approve: Boolean(isActionable && pendingParticipant),
    requestRevision: Boolean(
      isActionable &&
      pendingParticipant &&
      activeStage !== 'none' &&
      canRequestRevisionAtStage(activeStage)
    ),
    reject: Boolean(
      isActionable &&
      pendingParticipant &&
      activeStage !== 'none' &&
      canRejectAtStage(activeStage)
    )
  };

  return {
    approveLabel: activeStage === 'none' ? 'Phê duyệt' : resolveApproveLabelForStage(activeStage),
    activeStage,
    pendingParticipant,
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
