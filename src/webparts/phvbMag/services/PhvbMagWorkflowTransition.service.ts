import {
  DEFAULT_LIST_TITLE,
  EXECUTION_HISTORY_STATUS,
  hasSharePointSiteContext,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import {
  buildYeuCauCapSoPayload,
  buildYeuCauPayloadForStage,
  getParticipantEmailsFromWorkflowItems,
  resolveActiveWorkflowStageFromStatus,
  resolveSendMailDocumentInfoFromRelease
} from '../utils/PhvbMagSendMail.utils';
import { resolveWorkflowTransitionContext } from '../utils/PhvbMagWorkflowPermission.utils';
import type {
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

export interface IWorkflowTransitionOptions extends IPhvbDocumentContext {
  detail: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  logContext?: IPhvbLogContext;
}

function resolveTransitionHistoryStatus(nextStatus: string): string {
  switch (nextStatus) {
    case REQUEST_STATUS.DANG_THAM_DINH:
      return EXECUTION_HISTORY_STATUS.CHUYEN_THAM_DINH;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return EXECUTION_HISTORY_STATUS.CHUYEN_PHE_DUYET;
    case REQUEST_STATUS.CHO_CAP_SO:
      return EXECUTION_HISTORY_STATUS.CHUYEN_CAP_SO;
    default:
      return EXECUTION_HISTORY_STATUS.CAP_NHAT_YEU_CAU;
  }
}

async function sendTransitionMail(options: IWorkflowTransitionOptions, nextStatus: string): Promise<void> {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(options.detail.release);

  if (nextStatus === REQUEST_STATUS.CHO_CAP_SO) {
    const roles = await phvbRoleService.loadRoles(options);
    const capSoPayload = buildYeuCauCapSoPayload(options.userEmail, roles, documentInfo);

    if (capSoPayload) {
      await phvbSendMailService.sendMail(options, capSoPayload, options.logContext);
    }

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

export class PhvbWorkflowTransitionService {
  public async executeTransition(options: IWorkflowTransitionOptions): Promise<void> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const idYeuCau = (options.detail.release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const transitionContext = resolveWorkflowTransitionContext(options.detail, options.roles, options.userEmail);

    if (!transitionContext.canRun || !transitionContext.nextStatus) {
      throw new Error('Bạn không có quyền hoặc chưa đủ điều kiện để chuyển giai đoạn này.');
    }

    const { nextStatus } = transitionContext;

    await phvbRepository.updateItem({
      ...options,
      logContext: options.logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: options.detail.release.Id,
      payload: {
        StatusApproved: nextStatus
      }
    });

    await sendTransitionMail(options, nextStatus);

    await createExecutionHistoryRecord(
      { ...options, logContext: options.logContext },
      {
        idYeuCau,
        historyStatus: resolveTransitionHistoryStatus(nextStatus),
        department: options.detail.release.KhoaPhongNguoiTao
      }
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.indexOf('quyền') > -1) {
      return error.message;
    }

    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbWorkflowTransitionService = new PhvbWorkflowTransitionService();
