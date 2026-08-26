import {
  hasSharePointSiteContext,
  TRANG_THAI_THUC_HIEN
} from '../config/PhvbMag.configuration';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { appendHistory, getExecutionHistoryRuntimeErrorMessage } from './PhvbMagExecutionHistory.service';
import { joinWithLimit } from '../utils/PhvbMagHistoryText.utils';
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

    await appendHistory(
      { ...options, logContext: options.logContext },
      {
        idYeuCau,
        trangThaiThucHien: TRANG_THAI_THUC_HIEN.NHAC_HAN,
        noiDung: `Nhắc ${selectedEmails.length} người: ${joinWithLimit(selectedEmails, { moreLabel: 'người khác' })}`,
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
    return getExecutionHistoryRuntimeErrorMessage(error);
  }
}

export const phvbRemindDeadlineService = new PhvbRemindDeadlineService();
