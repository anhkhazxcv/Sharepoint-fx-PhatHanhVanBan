import {
  DEFAULT_LIST_TITLE,
  DMVL_DEFAULT_SO_VAN_BAN,
  hasSharePointSiteContext,
  PHVB_ROLES,
  REQUEST_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import {
  canEditBanHanhNotify,
  canPrepareBanHanh,
  canPublishBanHanh
} from '../utils/PhvbMagBanHanh.utils';
import {
  replaceBanHanhLinkTokens,
  validateBanHanhNotifyDraft
} from '../utils/PhvbMagBanHanhNotify.utils';
import { RETURN_BAN_HANH_TO_ADMIN_COMMENT_REQUIRED_MESSAGE } from '../utils/PhvbMagWorkflowActionDialog.utils';
import { getRoleEmails } from '../utils/PhvbMagRole.utils';
import { isDmvlBanHanhActor, isDmvlSubmissionRelease } from '../utils/PhvbMagDmvl.utils';
import {
  buildThongBaoLuuTruPayload,
  buildTraLaiAdminBanHanhPayload,
  buildXacNhanBanHanhPayload,
  buildYeuCauBanHanhPayload,
  resolveSendMailDocumentInfoFromRelease
} from '../utils/PhvbMagSendMail.utils';
import { phvbRoleService } from './PhvbMagRole.service';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { phvbBanHanhConfigService } from './PhvbMagBanHanhConfig.service';
import { phvbDetailService } from './PhvbMagDetail.service';
import {
  isFullIssuancePublishRequest,
  parseStoredMainDocumentId,
  phvbIssuancePublishService,
  resolveMainDocumentId,
  validateMainDocumentCandidate
} from './PhvbMagIssuancePublish.service';
import { phvbShortUrlService } from './PhvbMagShortUrl.service';
import { createBanHanhPublishAuditLogger } from '../utils/PhvbMagBanHanhPublishAudit.utils';
import { mapBanHanhPublishToastError } from '../utils/PhvbMagBanHanhPublish.utils';
import {
  buildDirectFileUrl,
  buildIssuanceLibraryViewUrl,
  resolveShortUrlApiKey
} from '../utils/PhvbMagShortUrl.utils';
import type {
  IBanHanhNotifyDraft,
  IBanHanhPublishOptions,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData,
  ISendMailDocumentInfo,
  IVanBanItem
} from '../models/PhvbMag.models';

const PREPARE_BAN_HANH_HISTORY_STATUS = 'Chuẩn bị ban hành';
const PUBLISH_BAN_HANH_HISTORY_STATUS = 'Ban hành';
const RETURN_BAN_HANH_TO_ADMIN_HISTORY_STATUS = 'Trả về admin ban hành';
const EDIT_BAN_HANH_NOTIFY_HISTORY_STATUS = 'Sửa nội dung ban hành';

function appendIdVanBanChinh(
  payload: Record<string, string | boolean | number>,
  mainDocumentId?: number
): Record<string, string | boolean | number> {
  const parsed = parseStoredMainDocumentId(mainDocumentId);

  if (parsed) {
    payload.IdVanBanChinh = parsed;
  }

  return payload;
}

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

function assertReturnToAdminMailReady(
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

  if (!getRoleEmails(roles, PHVB_ROLES.ADMIN).length) {
    throw new Error('Không tìm thấy email Admin trong cấu hình vai trò.');
  }

  const documentInfo = resolveSendMailDocumentInfoFromRelease(release);

  if (!(documentInfo.soVanBan || '').trim()) {
    throw new Error('Yêu cầu chưa có số văn bản để gửi thông báo trả về admin.');
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

const DMVL_PUBLISH_HISTORY_NOI_DUNG = 'Đã trình DMVL và ban hành văn bản.';

function assertPublishNotifyReady(release: IVanBanItem): void {
  const draft: IBanHanhNotifyDraft = {
    recipient: (release.EmailNhanBanHanh || '').trim(),
    subject: (release.SubjectBanHanh || '').trim(),
    body: (release.BodyEmail || '').trim()
  };
  const validationError = validateBanHanhNotifyDraft(draft);

  if (validationError) {
    throw new Error(
      validationError === 'Vui lòng nhập nơi nhận email.'
        ? 'Chưa có nội dung ban hành từ Admin. Vui lòng liên hệ Admin để chuẩn bị trước.'
        : validationError
    );
  }
}

async function sendThongBaoLuuTruMail(
  context: IPhvbDocumentContext,
  release: IVanBanItem,
  logContext: IPhvbLogContext | undefined,
  auditLogger: ReturnType<typeof createBanHanhPublishAuditLogger>
): Promise<void> {
  const mailPayload = buildThongBaoLuuTruPayload(context.userEmail, release);

  if (!mailPayload) {
    return;
  }

  try {
    await phvbSendMailService.sendMail(context, mailPayload, logContext);
    await auditLogger.logSendMail(
      {
        TypeSendMail: mailPayload.TypeSendMail,
        EmailTo: mailPayload.EmailTo
      },
      'success'
    );
  } catch (error) {
    await auditLogger.logSendMail(
      {
        TypeSendMail: mailPayload.TypeSendMail,
        EmailTo: mailPayload.EmailTo
      },
      'failed',
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function publishIssuanceWithNotify(
  context: IPhvbDocumentContext,
  detail: IRequestDetailData,
  options: IBanHanhPublishOptions | undefined,
  logContext: IPhvbLogContext | undefined,
  auditLogger: ReturnType<typeof createBanHanhPublishAuditLogger>
): Promise<void> {
  const idYeuCau = (detail.release.IdYeuCau || '').trim();
  const mainDocumentId = resolveMainDocumentId(
    detail.attachments,
    options?.mainDocumentId,
    detail.release.IdVanBanChinh
  );
  const mainDocumentError = validateMainDocumentCandidate(detail.attachments, mainDocumentId);

  if (mainDocumentError) {
    throw new Error(mainDocumentError);
  }

  assertPublishNotifyReady(detail.release);

  if (!(context.endPointSendMail || '').trim()) {
    throw new Error('Chưa cấu hình endpoint gửi mail (endPointSendMail).');
  }

  const publishResult = await phvbIssuancePublishService.publishVietMoi(
    { ...context, logContext },
    detail.release,
    mainDocumentId as number,
    auditLogger
  );

  const labelConfig = await phvbBanHanhConfigService.loadLabelCustomConfig(context);
  const { apiKey, source: apiKeySource } = resolveShortUrlApiKey(labelConfig);

  const mainFileLongUrl = buildDirectFileUrl(
    publishResult.siteUrl,
    publishResult.mainFileServerRelativePath
  );
  const folderLongUrl = buildIssuanceLibraryViewUrl(
    publishResult.siteUrl,
    publishResult.folderServerRelativePath
  );

  let linkFile = '';
  let linkTatCaTaiLieu = '';

  try {
    linkFile = await phvbShortUrlService.createShortUrl(context, mainFileLongUrl, apiKey, logContext);
    await auditLogger.logCreateShortUrl(
      'BanHanh_CreateShortUrl_LinkFile',
      auditLogger.buildShortUrlAuditPayload(mainFileLongUrl, linkFile, apiKeySource, apiKey),
      'success'
    );
  } catch (error) {
    await auditLogger.logCreateShortUrl(
      'BanHanh_CreateShortUrl_LinkFile',
      auditLogger.buildShortUrlAuditPayload(mainFileLongUrl, '', apiKeySource, apiKey),
      'failed',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  try {
    linkTatCaTaiLieu = await phvbShortUrlService.createShortUrl(context, folderLongUrl, apiKey, logContext);
    await auditLogger.logCreateShortUrl(
      'BanHanh_CreateShortUrl_LinkTatCaTaiLieu',
      auditLogger.buildShortUrlAuditPayload(folderLongUrl, linkTatCaTaiLieu, apiKeySource, apiKey),
      'success'
    );
  } catch (error) {
    await auditLogger.logCreateShortUrl(
      'BanHanh_CreateShortUrl_LinkTatCaTaiLieu',
      auditLogger.buildShortUrlAuditPayload(folderLongUrl, '', apiKeySource, apiKey),
      'failed',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  const resolvedBody = replaceBanHanhLinkTokens((detail.release.BodyEmail || '').trim(), {
    linkFile,
    linkTatCaTaiLieu
  });
  const lienHe = (detail.release.NguoiTao || detail.release.EmailNguoiTao || '').trim();
  const releaseUpdatePayload: Record<string, string | boolean | number> = {
    StatusApproved: REQUEST_STATUS.BAN_HANH,
    BodyEmail: resolvedBody,
    LienHe: lienHe
  };

  try {
    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: releaseUpdatePayload
    });

    await auditLogger.logUpdateRelease(
      {
        StatusApproved: REQUEST_STATUS.BAN_HANH,
        itemId: detail.release.Id,
        LienHe: lienHe,
        hasReplacedBodyLinks: true,
        linkFile,
        linkTatCaTaiLieu
      },
      'success'
    );
  } catch (error) {
    await auditLogger.logUpdateRelease(
      {
        StatusApproved: REQUEST_STATUS.BAN_HANH,
        itemId: detail.release.Id,
        LienHe: lienHe,
        hasReplacedBodyLinks: true,
        linkFile,
        linkTatCaTaiLieu
      },
      'failed',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  await createExecutionHistoryRecord(
    { ...context, logContext },
    {
      idYeuCau,
      historyStatus: PUBLISH_BAN_HANH_HISTORY_STATUS,
      noiDung: (options?.historyNoiDung || '').trim() || 'SuperAdmin đã ban hành văn bản.',
      department: detail.release.KhoaPhongNguoiTao,
      isComment: false
    }
  );

  const mailPayload = buildXacNhanBanHanhPayload(context.userEmail, detail.release, resolvedBody);

  if (!mailPayload) {
    throw new Error('Không tạo được nội dung email xác nhận ban hành.');
  }

  try {
    await phvbSendMailService.sendMail(context, mailPayload, logContext);
    await auditLogger.logSendMail(
      {
        TypeSendMail: mailPayload.TypeSendMail,
        EmailTo: mailPayload.EmailTo,
        hasLinkFile: Boolean(linkFile),
        hasLinkTatCaTaiLieu: Boolean(linkTatCaTaiLieu)
      },
      'success'
    );
  } catch (error) {
    await auditLogger.logSendMail(
      {
        TypeSendMail: mailPayload.TypeSendMail,
        EmailTo: mailPayload.EmailTo
      },
      'failed',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }

  await sendThongBaoLuuTruMail(context, detail.release, logContext, auditLogger);

  await auditLogger.logSuccess({
    loaiYeuCau: detail.release.LoaiYeuCau,
    mainDocumentId,
    linkFile,
    linkTatCaTaiLieu,
    mainFileServerRelativePath: publishResult.mainFileServerRelativePath,
    folderServerRelativePath: publishResult.folderServerRelativePath,
    expiredFolderServerRelativePath: publishResult.expiredFolderServerRelativePath
  });
}

export class PhvbBanHanhService {
  public async prepareForBanHanh(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    notify: IBanHanhNotifyDraft,
    options?: IBanHanhPublishOptions,
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

    if (isFullIssuancePublishRequest(detail.release)) {
      const mainDocumentError = validateMainDocumentCandidate(detail.attachments, options?.mainDocumentId);
      if (mainDocumentError) {
        throw new Error(mainDocumentError);
      }
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
      payload: appendIdVanBanChinh(
        {
          StatusApproved: REQUEST_STATUS.CHO_BAN_HANH,
          EmailNhanBanHanh: notify.recipient.trim(),
          SubjectBanHanh: notify.subject.trim(),
          BodyEmail: notify.body.trim()
        },
        isFullIssuancePublishRequest(detail.release) ? options?.mainDocumentId : undefined
      )
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

  public async updateBanHanhNotifyContent(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    notify: IBanHanhNotifyDraft,
    options?: IBanHanhPublishOptions,
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

    if (!canEditBanHanhNotify(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền chỉnh sửa nội dung ban hành cho yêu cầu này.');
    }

    if (isFullIssuancePublishRequest(detail.release)) {
      const mainDocumentError = validateMainDocumentCandidate(
        detail.attachments,
        options?.mainDocumentId
      );

      if (mainDocumentError) {
        throw new Error(mainDocumentError);
      }
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: appendIdVanBanChinh(
        {
          SubjectBanHanh: notify.subject.trim(),
          BodyEmail: notify.body.trim()
        },
        isFullIssuancePublishRequest(detail.release) ? options?.mainDocumentId : undefined
      )
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: EDIT_BAN_HANH_NOTIFY_HISTORY_STATUS,
        noiDung: notify.subject.trim() || 'Admin đã chỉnh sửa nội dung ban hành.',
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );
  }

  public async returnBanHanhToAdmin(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    comment: string,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    const normalizedComment = (comment || '').trim();
    if (!normalizedComment) {
      throw new Error(RETURN_BAN_HANH_TO_ADMIN_COMMENT_REQUIRED_MESSAGE);
    }

    const idYeuCau = (detail.release.IdYeuCau || '').trim();
    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const roles = await phvbRoleService.loadRoles(context);

    if (!canPublishBanHanh(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền trả yêu cầu về Admin.');
    }

    const documentInfo = assertReturnToAdminMailReady(context, roles, detail.release);
    const mailPayload = buildTraLaiAdminBanHanhPayload(
      context.userEmail,
      roles,
      documentInfo,
      normalizedComment
    );

    if (!mailPayload) {
      throw new Error('Không tạo được nội dung email trả về Admin.');
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: detail.release.Id,
      payload: {
        StatusApproved: REQUEST_STATUS.DA_CAP_SO
      }
    });

    await createExecutionHistoryRecord(
      { ...context, logContext },
      {
        idYeuCau,
        historyStatus: RETURN_BAN_HANH_TO_ADMIN_HISTORY_STATUS,
        noiDung: normalizedComment,
        department: detail.release.KhoaPhongNguoiTao,
        isComment: false
      }
    );

    await phvbSendMailService.sendMail(context, mailPayload, logContext);
  }

  public async publishBanHanh(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    options: IBanHanhPublishOptions | undefined,
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

    const auditLogger = createBanHanhPublishAuditLogger(context, logContext || {}, idYeuCau);
    const isFullIssuancePublish = isFullIssuancePublishRequest(detail.release);

    await auditLogger.logStart(options?.mainDocumentId);

    try {
      if (isFullIssuancePublish) {
        await publishIssuanceWithNotify(context, detail, options, logContext, auditLogger);
        return;
      }

      const lienHe = (detail.release.NguoiTao || detail.release.EmailNguoiTao || '').trim();

      await phvbRepository.updateItem({
        ...context,
        logContext,
        listTitle: DEFAULT_LIST_TITLE,
        itemId: detail.release.Id,
        payload: {
          StatusApproved: REQUEST_STATUS.BAN_HANH,
          LienHe: lienHe
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

      await sendThongBaoLuuTruMail(context, detail.release, logContext, auditLogger);

      await auditLogger.logSuccess({
        loaiYeuCau: detail.release.LoaiYeuCau,
        mode: 'simple',
        LienHe: lienHe
      });
    } catch (error) {
      await auditLogger.logFailed(isFullIssuancePublish ? 'publish_issuance' : 'publish_simple', error);
      throw error;
    }
  }

  public async publishDmvlBanHanh(
    context: IPhvbDocumentContext,
    detail: IRequestDetailData,
    notify: IBanHanhNotifyDraft,
    options: IBanHanhPublishOptions | undefined,
    logContext: IPhvbLogContext | undefined,
    roles: ReadonlyArray<IPhvbRoleEntry>
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Chưa có site context SharePoint.');
    }

    if (!isDmvlSubmissionRelease(detail.release)) {
      throw new Error('Yêu cầu không thuộc luồng DMVL.');
    }

    const status = (detail.release.StatusApproved || '').trim();
    if (status !== REQUEST_STATUS.CHO_BAN_HANH) {
      throw new Error('Yêu cầu không ở trạng thái Chờ ban hành.');
    }

    if (!isDmvlBanHanhActor(detail.release, roles, context.userEmail)) {
      throw new Error('Bạn không có quyền trình DMVL cho yêu cầu này.');
    }

    const idYeuCau = (detail.release.IdYeuCau || '').trim();
    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const validationError = validateBanHanhNotifyDraft(notify);
    if (validationError) {
      throw new Error(validationError);
    }

    const refreshedPartial = await phvbDetailService.loadRequestDetailPartial(
      context,
      idYeuCau,
      ['release', 'attachments']
    );
    const refreshedRelease = refreshedPartial.release;

    if (!refreshedRelease) {
      throw new Error('Không tải được dữ liệu yêu cầu trước khi ban hành.');
    }

    const refreshedAttachments = refreshedPartial.attachments || detail.attachments;
    const mainDocumentError = validateMainDocumentCandidate(refreshedAttachments, options?.mainDocumentId);
    if (mainDocumentError) {
      throw new Error(mainDocumentError);
    }

    await phvbRepository.updateItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: refreshedRelease.Id,
      payload: appendIdVanBanChinh(
        {
          EmailNhanBanHanh: notify.recipient.trim(),
          SubjectBanHanh: notify.subject.trim(),
          BodyEmail: notify.body.trim(),
          SoVanBan: DMVL_DEFAULT_SO_VAN_BAN
        },
        options?.mainDocumentId
      )
    });

    const publishDetail: IRequestDetailData = {
      ...detail,
      release: {
        ...refreshedRelease,
        EmailNhanBanHanh: notify.recipient.trim(),
        SubjectBanHanh: notify.subject.trim(),
        BodyEmail: notify.body.trim(),
        SoVanBan: DMVL_DEFAULT_SO_VAN_BAN,
        IdVanBanChinh: parseStoredMainDocumentId(options?.mainDocumentId)
      },
      attachments: refreshedAttachments
    };

    const auditLogger = createBanHanhPublishAuditLogger(context, logContext || {}, idYeuCau);

    await auditLogger.logStart(options?.mainDocumentId);

    try {
      await publishIssuanceWithNotify(
        context,
        publishDetail,
        {
          ...options,
          historyNoiDung: DMVL_PUBLISH_HISTORY_NOI_DUNG
        },
        logContext,
        auditLogger
      );
    } catch (error) {
      await auditLogger.logFailed('publish_issuance', error);
      throw error;
    }
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }

  public getPublishRuntimeErrorMessage(error: unknown): string {
    return mapBanHanhPublishToastError(error);
  }
}

export const phvbBanHanhService = new PhvbBanHanhService();
