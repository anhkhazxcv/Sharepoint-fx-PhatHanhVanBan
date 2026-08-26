import {
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  REQUEST_STATUS,
  TRANG_THAI_THUC_HIEN,
  TrangThaiThucHien
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { appendHistory } from './PhvbMagExecutionHistory.service';
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

function resolveTransitionHistoryStatus(nextStatus: string): TrangThaiThucHien {
  switch (nextStatus) {
    case REQUEST_STATUS.DANG_THAM_DINH:
      return TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET;
    case REQUEST_STATUS.CHO_CAP_SO:
      return TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO;
    default:
      // Các trường hợp còn lại (chuyển thẳng CHO_ADMIN_THU_HOI/DA_CAP_SO khi bỏ qua
      // bước trung gian) — không có mã trạng thái riêng trong 23 Choice value, dùng
      // CAP_NHAT_YEU_CAU (kind=system, cần NoiDung — xem chỗ gọi appendHistory).
      return TRANG_THAI_THUC_HIEN.CAP_NHAT_YEU_CAU;
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

    const trangThaiThucHien = resolveTransitionHistoryStatus(nextStatus);
    const isEmptyHistoryContent =
      trangThaiThucHien === TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH ||
      trangThaiThucHien === TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET ||
      trangThaiThucHien === TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO;

    await appendHistory(
      { ...options, logContext: options.logContext },
      {
        idYeuCau,
        trangThaiThucHien,
        noiDung: isEmptyHistoryContent ? '' : (options.detail.release.Tenvanban || options.detail.release.IdYeuCau || ''),
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
