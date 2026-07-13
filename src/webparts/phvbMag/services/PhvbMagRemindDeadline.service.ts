import {
  EXECUTION_HISTORY_STATUS,
  hasSharePointSiteContext,
  HISTORY_LIST_TITLE
} from '../config/PhvbMag.configuration';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import {
  buildRemindDeadlinePayload,
  canRemindDeadline,
  canRemindDeadlinePermission,
  resolveRemindDeadlineContext,
  resolveRemindDeadlineDocumentInfo,
  resolveSelectedRecipientEmails
} from '../utils/PhvbMagRemindDeadline.utils';
import type {
  IPhvbDirectoryUser,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

interface IRemindDeadlineOptions extends IPhvbDocumentContext {
  detail: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>;
  selectedRecipientIds: ReadonlyArray<string>;
  logContext?: IPhvbLogContext;
}

export class PhvbRemindDeadlineService {
  public async sendReminders(options: IRemindDeadlineOptions): Promise<void> {
    if (!hasSharePointSiteContext(options)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const { detail, roles, tenantUsers, selectedRecipientIds } = options;
    const idYeuCau = (detail.release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    if (!canRemindDeadlinePermission(detail.release, options.userEmail, roles)) {
      throw new Error('Bạn không có quyền nhắc hạn yêu cầu này.');
    }

    const remindContext = resolveRemindDeadlineContext(detail, roles, tenantUsers);

    if (!remindContext) {
      throw new Error('Yêu cầu không ở trạng thái cho phép nhắc hạn hoặc chưa có người nhận.');
    }

    const selectedEmails = resolveSelectedRecipientEmails(remindContext, selectedRecipientIds);

    if (selectedEmails.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một người nhận.');
    }

    const documentInfo = resolveRemindDeadlineDocumentInfo(detail.release);
    const mailPayload = buildRemindDeadlinePayload(
      options.userEmail,
      selectedEmails,
      remindContext,
      documentInfo
    );

    if (!mailPayload) {
      if (remindContext.requiresSoVanBan && !(documentInfo.soVanBan || '').trim()) {
        throw new Error('Yêu cầu chưa có số văn bản nên không thể gửi nhắc hạn.');
      }

      throw new Error('Không thể tạo nội dung email nhắc hạn.');
    }

    await phvbSendMailService.sendMail(options, mailPayload, options.logContext);

    await createExecutionHistoryRecord(
      { ...options, logContext: options.logContext },
      {
        idYeuCau,
        historyStatus: EXECUTION_HISTORY_STATUS.NHAC_HAN,
        noiDung: selectedEmails.join('; '),
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );
  }

  public canRemind(
    detail: IRequestDetailData,
    userEmail: string | undefined,
    roles: ReadonlyArray<IPhvbRoleEntry>,
    tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>
  ): boolean {
    return canRemindDeadline(detail, userEmail, roles, tenantUsers);
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, HISTORY_LIST_TITLE);
  }
}

export const phvbRemindDeadlineService = new PhvbRemindDeadlineService();
