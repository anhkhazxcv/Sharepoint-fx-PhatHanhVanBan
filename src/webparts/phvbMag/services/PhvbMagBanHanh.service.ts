import {
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  PHVB_ROLES,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import { canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import { validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
import { getRoleEmails } from '../utils/PhvbMagRole.utils';
import { buildYeuCauBanHanhPayload, resolveSendMailDocumentInfoFromRelease } from '../utils/PhvbMagSendMail.utils';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import type {
  IBanHanhNotifyDraft,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData,
  ISendMailDocumentInfo,
  IVanBanItem
} from '../models/PhvbMag.models';

const PREPARE_BAN_HANH_HISTORY_STATUS = 'Chuẩn bị ban hành';
const PUBLISH_BAN_HANH_HISTORY_STATUS = 'Ban hành';

function assertBanHanhMailReady(
  context: IPhvbDocumentContext,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  release: IVanBanItem
): ISendMailDocumentInfo {
  if (!(context.endPointSendMail || '').trim()) {
    throw new Error('Chưa cấu hình endpoint gửi mail (endPointSendMail).');
  }

  if (!(context.userEmail || '').trim()) {
    throw new Error('Không xác định được email người thực hiện.');
  }

  if (!getRoleEmails(roles, PHVB_ROLES.SUPER_ADMIN).length) {
    throw new Error('Không tìm thấy email SuperAdmin trong cấu hình vai trò.');
  }

  const documentInfo = resolveSendMailDocumentInfoFromRelease(release);

  if (!(documentInfo.soVanBan || '').trim()) {
    throw new Error('Yêu cầu chưa có số văn bản để gửi thông báo ban hành.');
  }

  if (!(documentInfo.idYeuCau || '').trim()) {
    throw new Error('Yêu cầu chưa có mã IdYeuCau để gửi mail.');
  }

  if (!(documentInfo.tenVanBan || '').trim()) {
    throw new Error('Yêu cầu chưa có tên văn bản để gửi mail.');
  }

  if (!(documentInfo.tomTatNoiDung || '').trim()) {
    throw new Error('Yêu cầu chưa có tóm tắt nội dung để gửi mail.');
  }

  return documentInfo;
}

export class PhvbBanHanhService {
  public async prepareForBanHanh(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    notify: IBanHanhNotifyDraft,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const idYeuCau = (detail.release.IdYeuCau || '').trim();
    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const validationError = validateBanHanhNotifyDraft(notify);
    if (validationError) {
      throw new Error(validationError);
    }

    const roles = await phvbRoleService.loadRoles(context);

    if (!canPrepareBanHanh(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền chuẩn bị ban hành cho yêu cầu này.');
    }

    const documentInfo = assertBanHanhMailReady(context, roles, detail.release);
    const mailPayload = buildYeuCauBanHanhPayload(context.userEmail, roles, documentInfo);

    if (!mailPayload) {
      throw new Error('Không tạo được nội dung email thông báo ban hành.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        StatusApproved: REQUEST_STATUS.CHO_BAN_HANH,
        EmailNhanBanHanh: notify.recipient.trim(),
        SubjectBanHanh: notify.subject.trim(),
        BodyEmail: notify.body.trim()
      }
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: PREPARE_BAN_HANH_HISTORY_STATUS,
        noiDung: notify.subject.trim() || 'Admin đã chuyển yêu cầu sang chờ ban hành.',
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );

    await phvbSendMailService.sendMail(context, mailPayload, logContext);
  }

  public async publishBanHanh(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const idYeuCau = (detail.release.IdYeuCau || '').trim();
    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const roles = await phvbRoleService.loadRoles(context);

    if (!canPublishBanHanh(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền ban hành văn bản cho yêu cầu này.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        StatusApproved: REQUEST_STATUS.BAN_HANH
      }
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: PUBLISH_BAN_HANH_HISTORY_STATUS,
        noiDung: 'SuperAdmin đã ban hành văn bản.',
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbBanHanhService = new PhvbBanHanhService();
