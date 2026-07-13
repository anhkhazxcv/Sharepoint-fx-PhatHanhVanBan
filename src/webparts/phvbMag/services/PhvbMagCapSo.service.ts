import {
  DEFAULT_LIST_TITLE,
  hasSharePointSiteContext,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import { canAssignDocumentNumber } from '../utils/PhvbMagCapSo.utils';
import { buildXacNhanCapSoPayload, resolveSendMailDocumentInfoFromRelease, withSendMailSoVanBan } from '../utils/PhvbMagSendMail.utils';
import type { IPhvbDocumentContext, IPhvbLogContext, IRequestDetailData } from '../models/PhvbMag.models';

const CAP_SO_HISTORY_STATUS = 'Cấp số';

export class PhvbCapSoService {
  public async assignDocumentNumber(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    soVanBan: string,
    logContext?: IPhvbLogContext
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

    if ((detail.release.StatusApproved || '').trim() !== REQUEST_STATUS.CHO_CAP_SO) {
      throw new Error('Chỉ có thể cấp số khi yêu cầu đang ở trạng thái Chờ cấp số.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        SoVanBan: normalizedNumber,
        DC_CapSo_Name: context.userDisplayName || '',
        DC_CapSo_Email: context.userEmail || '',
        StatusApproved: REQUEST_STATUS.DA_CAP_SO
      }
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: CAP_SO_HISTORY_STATUS,
        noiDung: normalizedNumber,
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );

    const roles = await phvbRoleService.loadRoles(context);
    const documentInfo = withSendMailSoVanBan(
      resolveSendMailDocumentInfoFromRelease(detail.release),
      normalizedNumber
    );
    const mailPayload = buildXacNhanCapSoPayload(context.userEmail, roles, documentInfo);

    if (mailPayload) {
      await phvbSendMailService.sendMail(context, mailPayload, logContext);
    }
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbCapSoService = new PhvbCapSoService();
