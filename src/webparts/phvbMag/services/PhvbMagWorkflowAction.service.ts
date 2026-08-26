import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE,
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  REQUEST_STATUS,
  TrangThaiThucHien,
  WORKFLOW_PARTICIPANT_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { phvbCommentAttachmentService } from './PhvbMagCommentAttachment.service';
import { appendHistory } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import {
  buildXacNhanPayloadForStage,
  resolveSendMailDocumentInfoFromRelease,
  SEND_MAIL_APPROVAL_STATUS
} from '../utils/PhvbMagSendMail.utils';
import { resolveHistoryStatusForApprove, resolveHistoryStatusForReject } from '../utils/PhvbMagWorkflowState.utils';
import type {
  IAllUserWorkflowItem,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IRequestDetailData,
  WorkflowStage
} from '../models/PhvbMag.models';
import type { IWorkflowActionContext, WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { getWorkflowActionCommentRequiredMessage } from '../utils/PhvbMagWorkflowActionDialog.utils';
import { resolveWorkflowActionContext } from '../utils/PhvbMagWorkflowPermission.utils';

function findParticipantById(
  participants: ReadonlyArray<IAllUserWorkflowItem>,
  participantId: number
): IAllUserWorkflowItem | undefined {
  for (let index = 0; index < participants.length; index += 1) {
    if (participants[index].Id === participantId) {
      return participants[index];
    }
  }

  return undefined;
}

function resolveTargetParticipant(
  actionContext: IWorkflowActionContext,
  input: IWorkflowActionInput
): IAllUserWorkflowItem | undefined {
  if (input.targetParticipantId === undefined) {
    return actionContext.pendingParticipant;
  }

  return findParticipantById(actionContext.pendingParticipants, input.targetParticipantId);
}

export interface IWorkflowActionInput {
  action: WorkflowActionKey;
  comment?: string;
  targetParticipantId?: number;
  files?: File[];
}

interface IWorkflowActionOptions extends IPhvbDocumentContext {
  detail: IRequestDetailData;
  input: IWorkflowActionInput;
  logContext?: IPhvbLogContext;
}

function getAllUserListTitleForStage(stage: WorkflowStage): string {
  switch (stage) {
    case 'gopy':
      return ALL_USER_GOPY_LIST_TITLE;
    case 'thamdinh':
      return ALL_USER_THAMDINH_LIST_TITLE;
    case 'pheduyet':
      return ALL_USER_PHEDUYET_LIST_TITLE;
    default:
      return ALL_USER_PHEDUYET_LIST_TITLE;
  }
}

function resolveHistoryStatusForAction(action: WorkflowActionKey, stage: WorkflowStage): TrangThaiThucHien {
  return action === 'approve'
    ? resolveHistoryStatusForApprove(stage)
    : resolveHistoryStatusForReject(stage);
}

function resolveDocumentStatusForAction(action: WorkflowActionKey, stage: WorkflowStage): string {
  switch (action) {
    case 'reject':
      if (stage === 'thamdinh') {
        return REQUEST_STATUS.TU_CHOI_THAM_DINH;
      }

      if (stage === 'pheduyet') {
        return REQUEST_STATUS.TU_CHOI_PHE_DUYET;
      }

      return REQUEST_STATUS.TU_CHOI;
    default:
      return REQUEST_STATUS.DANG_GOP_Y;
  }
}

async function createHistoryRecord(
  context: IWorkflowActionOptions,
  idYeuCau: string,
  trangThaiThucHien: TrangThaiThucHien,
  comment: string,
  department?: string
): Promise<number | undefined> {
  const result = await appendHistory(
    { ...context, logContext: context.logContext },
    {
      idYeuCau,
      trangThaiThucHien,
      noiDung: comment,
      department,
      isComment: false
    }
  );

  return result.status === 'created' ? result.id : undefined;
}

async function uploadActionAttachmentsIfAny(
  context: IWorkflowActionOptions,
  historyItemId: number | undefined,
  files: ReadonlyArray<File> | undefined
): Promise<void> {
  if (!historyItemId || !files || files.length === 0) {
    return;
  }

  await phvbCommentAttachmentService.uploadCommentFiles(context, historyItemId, files.slice(), context.logContext);
}

async function updateParticipantConfirmation(
  context: IPhvbDocumentContext & { logContext?: IPhvbLogContext },
  stage: WorkflowStage,
  participant: IAllUserWorkflowItem,
  comment: string,
  participantStatus: string = WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN
): Promise<void> {
  await phvbRepository.updateItem({
    ...context,
    listTitle: getAllUserListTitleForStage(stage),
    itemId: participant.Id,
    payload: {
      TrangThai_ThucHien: participantStatus,
      NoiDung: comment
    }
  });
}

async function updateReleaseStatus(
  context: IPhvbDocumentContext & { logContext?: IPhvbLogContext },
  releaseId: number,
  statusApproved: string
): Promise<void> {
  await phvbRepository.updateItem({
    ...context,
    listTitle: DEFAULT_LIST_TITLE,
    itemId: releaseId,
    payload: {
      StatusApproved: statusApproved
    }
  });
}

async function sendApproveWorkflowMails(
  options: IWorkflowActionOptions,
  stage: WorkflowStage
): Promise<void> {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(options.detail.release);
  const creatorEmail = (options.detail.release.EmailNguoiTao || '').trim();
  const xacNhanPayload = buildXacNhanPayloadForStage(
    options.userEmail,
    stage,
    creatorEmail,
    SEND_MAIL_APPROVAL_STATUS.DA_XAC_NHAN,
    documentInfo
  );

  if (xacNhanPayload) {
    await phvbSendMailService.sendMail(options, xacNhanPayload, options.logContext);
  }
}

async function sendRejectWorkflowMail(
  options: IWorkflowActionOptions,
  stage: WorkflowStage
): Promise<void> {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(options.detail.release);
  const creatorEmail = (options.detail.release.EmailNguoiTao || '').trim();
  const rejectPayload = buildXacNhanPayloadForStage(
    options.userEmail,
    stage,
    creatorEmail,
    SEND_MAIL_APPROVAL_STATUS.DA_TU_CHOI,
    documentInfo
  );

  if (rejectPayload) {
    await phvbSendMailService.sendMail(options, rejectPayload, options.logContext);
  }
}

export class PhvbWorkflowActionService {
  public validateAction(
    detail: IRequestDetailData,
    userEmail: string,
    input: IWorkflowActionInput
  ): void {
    const actionContext = resolveWorkflowActionContext(detail, userEmail);

    if (input.targetParticipantId !== undefined) {
      const targetParticipant = findParticipantById(actionContext.pendingParticipants, input.targetParticipantId);

      if (!targetParticipant) {
        throw new Error('Người tham gia này đã được xử lý hoặc không còn hợp lệ.');
      }

      if (input.action === 'reject' && !actionContext.canRejectAtActiveStage) {
        throw new Error('Bạn không có quyền thực hiện thao tác này ở bước hiện tại.');
      }

      return;
    }

    if (!actionContext.availableActions[input.action]) {
      throw new Error('Bạn không có quyền thực hiện thao tác này ở bước hiện tại.');
    }
  }

  public async executeAction(options: IWorkflowActionOptions): Promise<void> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const idYeuCau = (options.detail.release.IdYeuCau || '').trim();
    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    this.validateAction(options.detail, options.userEmail, options.input);

    const comment = (options.input.comment || '').trim();

    if (options.input.action === 'reject' && !comment) {
      throw new Error(getWorkflowActionCommentRequiredMessage(options.input.action));
    }

    const actionContext = resolveWorkflowActionContext(options.detail, options.userEmail);
    const stage = actionContext.activeStage;
    const participant = resolveTargetParticipant(actionContext, options.input);

    if (!participant || stage === 'none') {
      throw new Error('Không tìm thấy nhiệm vụ chờ xử lý của bạn.');
    }

    // Từ đây TypeScript đã loại 'none' khỏi kiểu của stage (WorkflowDocumentStage -> WorkflowStage).
    const trangThaiThucHien = resolveHistoryStatusForAction(options.input.action, stage);

    if (options.input.action === 'approve') {
      await updateParticipantConfirmation(options, stage, participant, comment);
      await sendApproveWorkflowMails(options, stage);

      const approveHistoryItemId = await createHistoryRecord(
        options,
        idYeuCau,
        trangThaiThucHien,
        comment,
        options.detail.release.KhoaPhongNguoiTao
      );
      await uploadActionAttachmentsIfAny(options, approveHistoryItemId, options.input.files);
      return;
    }

    await updateParticipantConfirmation(
      options,
      stage,
      participant,
      comment,
      WORKFLOW_PARTICIPANT_STATUS.DA_TU_CHOI
    );
    await updateReleaseStatus(options, options.detail.release.Id, resolveDocumentStatusForAction(options.input.action, stage));
    await sendRejectWorkflowMail(options, stage);
    const rejectHistoryItemId = await createHistoryRecord(
      options,
      idYeuCau,
      trangThaiThucHien,
      comment,
      options.detail.release.KhoaPhongNguoiTao
    );
    await uploadActionAttachmentsIfAny(options, rejectHistoryItemId, options.input.files);
  }

  public getRuntimeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.indexOf('quyền') > -1) {
      return error.message;
    }

    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbWorkflowActionService = new PhvbWorkflowActionService();
