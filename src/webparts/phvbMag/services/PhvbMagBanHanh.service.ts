import {
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  HISTORY_LIST_TITLE,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import { phvbRoleService } from './PhvbMagRole.service';
import type { IPhvbDocumentContext, IPhvbLogContext, IRequestDetailData } from '../models/PhvbMag.models';

const PREPARE_BAN_HANH_HISTORY_STATUS = 'Chuẩn bị ban hành';
const PUBLISH_BAN_HANH_HISTORY_STATUS = 'Ban hành';

async function createHistoryRecord(
  context: IPhvbDocumentContext & { logContext?: IPhvbLogContext },
  idYeuCau: string,
  historyStatus: string,
  comment: string,
  department?: string
): Promise<void> {
  const performedAt = formatCurrentExecutionDateTime();
  const payload: Record<string, string | boolean | number> = {
    Title: historyStatus,
    IDYeuCau: idYeuCau,
    User_ThucHien: context.userDisplayName || '',
    Email_ThucHien: context.userEmail || '',
    PhongBan_ThucHien: department || '',
    Ngay_ThucHien: performedAt,
    TrangThai_ThucHien: historyStatus,
    NoiDung: comment,
    IsComment: false
  };

  try {
    await phvbRepository.createItem({
      ...context,
      logContext: context.logContext,
      listTitle: HISTORY_LIST_TITLE,
      payload
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : '';
    if (/IsComment/i.test(details)) {
      const payloadWithoutIsComment = { ...payload };
      delete payloadWithoutIsComment.IsComment;
      await phvbRepository.createItem({
        ...context,
        logContext: context.logContext,
        listTitle: HISTORY_LIST_TITLE,
        payload: payloadWithoutIsComment
      });
      return;
    }

    throw error;
  }
}

export class PhvbBanHanhService {
  public async prepareForBanHanh(
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

    if (!canPrepareBanHanh(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền chuẩn bị ban hành cho yêu cầu này.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        StatusApproved: REQUEST_STATUS.CHO_BAN_HANH
      }
    });

    await createHistoryRecord(
      { ...context, logContext },
      idYeuCau,
      PREPARE_BAN_HANH_HISTORY_STATUS,
      'Admin đã chuyển yêu cầu sang chờ ban hành.',
      detail.release.KhoaPhongNguoiTao
    );
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

    await createHistoryRecord(
      { ...context, logContext },
      idYeuCau,
      PUBLISH_BAN_HANH_HISTORY_STATUS,
      'SuperAdmin đã ban hành văn bản.',
      detail.release.KhoaPhongNguoiTao
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbBanHanhService = new PhvbBanHanhService();
