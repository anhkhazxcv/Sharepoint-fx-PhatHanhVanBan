import {
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  HISTORY_LIST_TITLE,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { canAssignDocumentNumber } from '../utils/PhvbMagCapSo.utils';
import type { IPhvbDocumentContext, IRequestDetailData } from '../models/PhvbMag.models';

const CAP_SO_HISTORY_STATUS = 'Cấp số';

async function createHistoryRecord(
  context: IPhvbDocumentContext,
  idYeuCau: string,
  comment: string,
  department?: string
): Promise<void> {
  const performedAt = formatCurrentExecutionDateTime();
  const payload: Record<string, string | boolean | number> = {
    Title: CAP_SO_HISTORY_STATUS,
    IDYeuCau: idYeuCau,
    User_ThucHien: context.userDisplayName || '',
    Email_ThucHien: context.userEmail || '',
    PhongBan_ThucHien: department || '',
    Ngay_ThucHien: performedAt,
    TrangThai_ThucHien: CAP_SO_HISTORY_STATUS,
    NoiDung: comment,
    IsComment: false
  };

  try {
    await phvbRepository.createItem({
      ...context,
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
        listTitle: HISTORY_LIST_TITLE,
        payload: payloadWithoutIsComment
      });
      return;
    }

    throw error;
  }
}

export class PhvbCapSoService {
  public async assignDocumentNumber(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    soVanBan: string
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const normalizedNumber = soVanBan.trim();
    const idYeuCau = (detail.release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    if (!normalizedNumber) {
      throw new Error('Vui lòng nhập số văn bản.');
    }

    if (!canAssignDocumentNumber(detail.release)) {
      throw new Error('Yêu cầu không ở trạng thái cho phép cấp số.');
    }

    if ((detail.release.StatusApproved || '').trim() !== REQUEST_STATUS.DA_CAP_SO) {
      throw new Error('Chỉ có thể cấp số khi yêu cầu đang ở trạng thái Đã cấp số.');
    }

    await phvbRepository.updateItem({
      ...context,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        SoVanBan: normalizedNumber,
        DC_CapSo_Name: context.userDisplayName || '',
        DC_CapSo_Email: context.userEmail || ''
      }
    });

    await createHistoryRecord(
      context,
      idYeuCau,
      normalizedNumber,
      detail.release.KhoaPhongNguoiTao
    );
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbCapSoService = new PhvbCapSoService();
