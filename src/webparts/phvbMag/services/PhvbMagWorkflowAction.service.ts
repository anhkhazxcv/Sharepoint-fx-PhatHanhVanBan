import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE,
  DEFAULT_LIST_TITLE,
  EXECUTION_HISTORY_STATUS,
  hasSharePointSiteContext,
  REQUEST_STATUS,
  WORKFLOW_PARTICIPANT_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import {
  buildXacNhanPayloadForStage,
  buildYeuCauCapSoPayload,
  buildYeuCauPayloadForStage,
  getParticipantEmailsFromWorkflowItems,
  resolveActiveWorkflowStageFromStatus,
  resolveSendMailDocumentInfoFromRelease,
  SEND_MAIL_APPROVAL_STATUS
} from '../utils/PhvbMagSendMail.utils';
import {
  areAllParticipantsConfirmed,
  getParticipantsForStage,
  resolveDocumentStatusAfterSkippingEmptyStages,
  resolveEffectiveWorkflowStage,
  resolveHistoryStatusForApprove,
  resolveNextDocumentStatusAfterStageComplete,
  splitWorkflowParticipants,
  type WorkflowDocumentStage
} from '../utils/PhvbMagWorkflowState.utils';
import type {
  IAllUserWorkflowItem,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IRequestDetailData,
  WorkflowStage
} from '../models/PhvbMag.models';
import type { WorkflowActionKey } from '../utils/PhvbMagWorkflowPermission.utils';
import { getWorkflowActionCommentRequiredMessage } from '../utils/PhvbMagWorkflowActionDialog.utils';
import { resolveWorkflowActionContext } from '../utils/PhvbMagWorkflowPermission.utils';

export interface IWorkflowActionInput {
  action: WorkflowActionKey;
  comment?: string;
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

function resolveHistoryStatusForAction(action: WorkflowActionKey, stage: WorkflowStage): string {
  switch (action) {
    case 'approve':
      return resolveHistoryStatusForApprove(stage);
    case 'reject':
      return EXECUTION_HISTORY_STATUS.TU_CHOI;
    case 'requestRevision':
      return EXECUTION_HISTORY_STATUS.YEU_CAU_CHINH_SUA;
    default:
      return EXECUTION_HISTORY_STATUS.PHE_DUYET;
  }
}

function resolveDocumentStatusForAction(action: WorkflowActionKey): string {
  switch (action) {
    case 'reject':
      return REQUEST_STATUS.TU_CHOI;
    case 'requestRevision':
      return REQUEST_STATUS.YEU_CAU_CHINH_SUA;
    default:
      return REQUEST_STATUS.DANG_GOP_Y;
  }
}

async function createHistoryRecord(
  context: IWorkflowActionOptions,
  idYeuCau: string,
  historyStatus: string,
  comment: string,
  department?: string
): Promise<void> {
  await createExecutionHistoryRecord(
    { ...context, logContext: context.logContext },
    {
      idYeuCau,
      historyStatus,
      noiDung: comment,
      department,
      isComment: false
    }
  );
}

async function updateParticipantConfirmation(
  context: IPhvbDocumentContext & { logContext?: IPhvbLogContext },
  stage: WorkflowStage,
  participant: IAllUserWorkflowItem,
  comment: string
): Promise<void> {
  const performedAt = formatCurrentExecutionDateTime();

  await phvbRepository.updateItem({
    ...context,
    listTitle: getAllUserListTitleForStage(stage),
    itemId: participant.Id,
    payload: {
      TrangThai_ThucHien: WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN,
      Ngay_ThucHien: performedAt,
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

function buildStageParticipantSnapshot(detail: IRequestDetailData): ReturnType<typeof splitWorkflowParticipants> {
  return splitWorkflowParticipants(detail.workflowParticipants);
}

async function resolveNextStatusAfterApprove(
  detail: IRequestDetailData,
  stage: WorkflowDocumentStage
): Promise<string | undefined> {
  if (stage === 'none') {
    return undefined;
  }

  const participants = buildStageParticipantSnapshot(detail);
  const loaiYeuCau = detail.release.LoaiYeuCau;
  const effectiveStage = resolveEffectiveWorkflowStage(detail.release.StatusApproved, participants, loaiYeuCau);

  if (effectiveStage === 'none') {
    return undefined;
  }

  const skippedStatus = resolveDocumentStatusAfterSkippingEmptyStages(
    detail.release.StatusApproved,
    participants,
    loaiYeuCau
  );

  if (skippedStatus && skippedStatus !== (detail.release.StatusApproved || '').trim()) {
    return skippedStatus;
  }

  const stageParticipants = getParticipantsForStage(effectiveStage, participants);

  if (!areAllParticipantsConfirmed(stageParticipants)) {
    return undefined;
  }

  return resolveNextDocumentStatusAfterStageComplete(effectiveStage, participants, loaiYeuCau);
}

function isWorkflowStageStatus(status: string): boolean {
  return (
    status === REQUEST_STATUS.DANG_GOP_Y ||
    status === REQUEST_STATUS.DANG_THAM_DINH ||
    status === REQUEST_STATUS.DANG_PHE_DUYET
  );
}

async function sendApproveWorkflowMails(
  options: IWorkflowActionOptions,
  stage: WorkflowStage,
  participant: IAllUserWorkflowItem,
  nextStatus?: string
): Promise<void> {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(options.detail.release);
  const participantEmail = (participant.Email_ThucHien || '').trim();
  const xacNhanPayload = buildXacNhanPayloadForStage(
    options.userEmail,
    stage,
    participantEmail,
    SEND_MAIL_APPROVAL_STATUS.DA_XAC_NHAN,
    documentInfo
  );

  if (xacNhanPayload) {
    await phvbSendMailService.sendMail(options, xacNhanPayload, options.logContext);
  }

  if (!nextStatus) {
    return;
  }

  if (nextStatus === REQUEST_STATUS.CHO_CAP_SO) {
    const roles = await phvbRoleService.loadRoles(options);
    const capSoPayload = buildYeuCauCapSoPayload(options.userEmail, roles, documentInfo);

    if (capSoPayload) {
      await phvbSendMailService.sendMail(options, capSoPayload, options.logContext);
    }

    return;
  }

  if (!isWorkflowStageStatus(nextStatus)) {
    return;
  }

  const nextStage = resolveActiveWorkflowStageFromStatus(nextStatus);

  if (!nextStage) {
    return;
  }

  const yeuCauPayload = buildYeuCauPayloadForStage(
    options.userEmail,
    nextStage,
    getParticipantEmailsFromWorkflowItems(nextStage, options.detail.workflowParticipants),
    documentInfo
  );

  if (yeuCauPayload) {
    await phvbSendMailService.sendMail(options, yeuCauPayload, options.logContext);
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

    if ((options.input.action === 'reject' || options.input.action === 'requestRevision') && !comment) {
      throw new Error(getWorkflowActionCommentRequiredMessage(options.input.action));
    }

    const actionContext = resolveWorkflowActionContext(options.detail, options.userEmail);
    const stage = actionContext.activeStage;
    const participant = actionContext.pendingParticipant;
    const historyStatus = stage === 'none'
      ? EXECUTION_HISTORY_STATUS.PHE_DUYET
      : resolveHistoryStatusForAction(options.input.action, stage);

    if (options.input.action === 'approve') {
      if (!participant || stage === 'none') {
        throw new Error('Không tìm thấy nhiệm vụ chờ xử lý của bạn.');
      }

      await updateParticipantConfirmation(options, stage, participant, comment);

      const refreshedParticipants = options.detail.workflowParticipants.map(item => {
        if (item.Id !== participant.Id) {
          return item;
        }

        return {
          ...item,
          TrangThai_ThucHien: WORKFLOW_PARTICIPANT_STATUS.DA_XAC_NHAN,
          NoiDung: comment || item.NoiDung
        };
      });

      const nextDetail: IRequestDetailData = {
        ...options.detail,
        workflowParticipants: refreshedParticipants
      };

      const nextStatus = await resolveNextStatusAfterApprove(nextDetail, stage);

      if (nextStatus) {
        await updateReleaseStatus(options, options.detail.release.Id, nextStatus);
      }

      await sendApproveWorkflowMails(options, stage, participant, nextStatus);

      await createHistoryRecord(
        options,
        idYeuCau,
        historyStatus,
        comment,
        options.detail.release.KhoaPhongNguoiTao
      );
      return;
    }

    if (!participant || stage === 'none') {
      throw new Error('Không tìm thấy nhiệm vụ chờ xử lý của bạn.');
    }

    if (options.input.action === 'requestRevision') {
      await createHistoryRecord(
        options,
        idYeuCau,
        historyStatus,
        comment,
        options.detail.release.KhoaPhongNguoiTao
      );
      return;
    }

    await updateParticipantConfirmation(options, stage, participant, comment);
    await updateReleaseStatus(options, options.detail.release.Id, resolveDocumentStatusForAction(options.input.action));
    await sendRejectWorkflowMail(options, stage);
    await createHistoryRecord(
      options,
      idYeuCau,
      historyStatus,
      comment,
      options.detail.release.KhoaPhongNguoiTao
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.indexOf('quyền') > -1) {
      return error.message;
    }

    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbWorkflowActionService = new PhvbWorkflowActionService();
