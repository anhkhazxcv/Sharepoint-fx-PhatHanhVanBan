import {
  PHVB_ROLES,
  REQUEST_STATUS,
  SEND_MAIL_APPROVAL_STATUS,
  SEND_MAIL_TYPE
} from '../config/PhvbMag.configuration';
import type {
  IAllUserWorkflowItem,
  ICreateRequestInput,
  IPhvbRoleEntry,
  ISendMailDocumentInfo,
  ISendMailRequest,
  IVanBanItem,
  TabType,
  WorkflowStage
} from '../models/PhvbMag.models';
import { resolveXacNhanBanHanhMailType } from './PhvbMagBanHanhNotify.utils';
import { getRequestTypeFormRules } from './PhvbMagRequestForm.utils';
import { buildYeuCauDetailUrl } from './PhvbMagRoute.utils';
import { getRoleEmails } from './PhvbMagRole.utils';
import {
  getParticipantsForStage,
  type IWorkflowStageParticipants,
  resolveDocumentStatusAfterSkippingEmptyStages,
  resolveStatusForWorkflowStage,
  resolveWorkflowStageFromStatus
} from './PhvbMagWorkflowState.utils';

export const XAC_NHAN_BAN_HANH_TYPES: ReadonlyArray<string> = [
  SEND_MAIL_TYPE.XAC_NHAN_BAN_HANH_VN,
  SEND_MAIL_TYPE.XAC_NHAN_BAN_HANH_EN
];

export function isXacNhanBanHanhType(typeSendMail: string): boolean {
  return XAC_NHAN_BAN_HANH_TYPES.indexOf(typeSendMail) > -1;
}

export function joinEmails(emails: ReadonlyArray<string>): string {
  const unique: string[] = [];

  emails.forEach(email => {
    const trimmed = email.trim();
    if (!trimmed) {
      return;
    }

    const normalized = trimmed.toLowerCase();
    if (unique.some(existing => existing.toLowerCase() === normalized)) {
      return;
    }

    unique.push(trimmed);
  });

  return unique.join(';');
}

export function resolveSendMailDocumentInfoFromRelease(release: IVanBanItem): ISendMailDocumentInfo {
  return {
    idYeuCau: (release.IdYeuCau || '').trim(),
    tenVanBan: (release.Tenvanban || '').trim(),
    tomTatNoiDung: (release.TomTatNoiDung || '').trim(),
    soVanBan: (release.SoVanBan || '').trim()
  };
}

export function withSendMailSoVanBan(
  documentInfo: ISendMailDocumentInfo,
  soVanBan: string
): ISendMailDocumentInfo {
  return {
    ...documentInfo,
    soVanBan: soVanBan.trim()
  };
}

export function resolveSendMailDocumentInfoFromCreateInput(
  input: ICreateRequestInput,
  requestReferenceId: string
): ISendMailDocumentInfo {
  return {
    idYeuCau: requestReferenceId.trim(),
    tenVanBan: (input.title || '').trim(),
    tomTatNoiDung: (input.summary || '').trim()
  };
}

export function resolveYeuCauTypeForStage(stage: WorkflowStage): string {
  switch (stage) {
    case 'gopy':
      return SEND_MAIL_TYPE.YEU_CAU_GOP_Y;
    case 'thamdinh':
      return SEND_MAIL_TYPE.YEU_CAU_THAM_DINH;
    case 'pheduyet':
      return SEND_MAIL_TYPE.YEU_CAU_PHE_DUYET;
    default:
      return SEND_MAIL_TYPE.YEU_CAU_PHE_DUYET;
  }
}

export function resolveXacNhanTypeForStage(stage: WorkflowStage): string {
  switch (stage) {
    case 'gopy':
      return SEND_MAIL_TYPE.XAC_NHAN_GOP_Y;
    case 'thamdinh':
      return SEND_MAIL_TYPE.XAC_NHAN_THAM_DINH;
    case 'pheduyet':
      return SEND_MAIL_TYPE.XAC_NHAN_PHE_DUYET;
    default:
      return SEND_MAIL_TYPE.XAC_NHAN_PHE_DUYET;
  }
}

function buildParticipantSnapshotFromInput(input: ICreateRequestInput): IWorkflowStageParticipants {
  const rules = getRequestTypeFormRules(input.requestType);
  const toPlaceholder = (email: string): IAllUserWorkflowItem => ({
    Id: 0,
    Email_ThucHien: email
  });

  return {
    gopY: rules.includeGopYThamDinhWorkflow ? input.nguoiGopY.map(toPlaceholder) : [],
    thamDinh: rules.includeGopYThamDinhWorkflow ? input.nguoiThamDinh.map(toPlaceholder) : [],
    pheDuyet: input.approvalUsers.map(toPlaceholder)
  };
}

export function resolveInitialSubmitStatus(input: ICreateRequestInput): string {
  const rules = getRequestTypeFormRules(input.requestType);

  if (!rules.includeGopYThamDinhWorkflow) {
    return resolveStatusForWorkflowStage('pheduyet');
  }

  const skippedStatus = resolveDocumentStatusAfterSkippingEmptyStages(
    REQUEST_STATUS.DANG_GOP_Y,
    buildParticipantSnapshotFromInput(input),
    input.requestType
  );

  return skippedStatus || REQUEST_STATUS.DANG_GOP_Y;
}

export function getParticipantEmailsFromInput(stage: WorkflowStage, input: ICreateRequestInput): string[] {
  const participants = buildParticipantSnapshotFromInput(input);
  return getParticipantEmailsForStage(stage, participants);
}

export function getParticipantEmailsForStage(
  stage: WorkflowStage,
  participants: IWorkflowStageParticipants
): string[] {
  return getParticipantsForStage(stage, participants)
    .map(item => (item.Email_ThucHien || '').trim())
    .filter(email => Boolean(email));
}

export function getParticipantEmailsFromWorkflowItems(
  stage: WorkflowStage,
  workflowParticipants: ReadonlyArray<{ workflowStage: WorkflowStage } & IAllUserWorkflowItem>
): string[] {
  const stageParticipants = workflowParticipants.filter(item => item.workflowStage === stage);

  return stageParticipants
    .map(item => (item.Email_ThucHien || '').trim())
    .filter(email => Boolean(email));
}

export function resolveActiveWorkflowStageFromStatus(statusApproved?: string): WorkflowStage | undefined {
  const stage = resolveWorkflowStageFromStatus(statusApproved);
  return stage === 'none' ? undefined : stage;
}

export function resolveTabForSendMailType(
  typeSendMail: string,
  approvalStatus: string | undefined
): TabType | undefined {
  switch (typeSendMail) {
    case SEND_MAIL_TYPE.YEU_CAU_GOP_Y:
    case SEND_MAIL_TYPE.YEU_CAU_THAM_DINH:
    case SEND_MAIL_TYPE.YEU_CAU_PHE_DUYET:
      return 'ViecCanLam';

    case SEND_MAIL_TYPE.XAC_NHAN_GOP_Y:
    case SEND_MAIL_TYPE.XAC_NHAN_THAM_DINH:
    case SEND_MAIL_TYPE.XAC_NHAN_PHE_DUYET:
      return approvalStatus === SEND_MAIL_APPROVAL_STATUS.DA_TU_CHOI ? 'BanNhap' : 'YeuCauCuaToi';

    case SEND_MAIL_TYPE.YEU_CAU_CAP_SO:
      return 'CapSo';

    case SEND_MAIL_TYPE.XAC_NHAN_CAP_SO:
    case SEND_MAIL_TYPE.YEU_CAU_BAN_HANH:
    case SEND_MAIL_TYPE.TRA_LAI_ADMIN_BAN_HANH:
      return 'QLVanBan';

    default:
      return undefined;
  }
}

export function buildSendMailPayload(
  nguoiThucHien: string,
  typeSendMail: string,
  emailTo: string,
  approvalStatus: string | undefined,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  const normalizedActor = nguoiThucHien.trim();
  const normalizedEmailTo = emailTo.trim();
  const normalizedIdYeuCau = documentInfo.idYeuCau.trim();
  const normalizedTenVanBan = documentInfo.tenVanBan.trim();
  const normalizedTomTat = documentInfo.tomTatNoiDung.trim();

  if (
    !normalizedActor ||
    !typeSendMail ||
    !normalizedEmailTo ||
    !normalizedIdYeuCau ||
    !normalizedTenVanBan ||
    !normalizedTomTat
  ) {
    return undefined;
  }

  const tabForLink = resolveTabForSendMailType(typeSendMail, approvalStatus);
  const linkYeuCau = tabForLink ? buildYeuCauDetailUrl(tabForLink, normalizedIdYeuCau) : undefined;

  return {
    NguoiThucHien: normalizedActor,
    TypeSendMail: typeSendMail,
    EmailTo: normalizedEmailTo,
    ApprovalStatus: approvalStatus,
    IDYeuCau: normalizedIdYeuCau,
    TenVanBan: normalizedTenVanBan,
    TomTatNoiDung: normalizedTomTat,
    LinkYeuCau: linkYeuCau
  };
}

export function buildYeuCauPayloadForStage(
  nguoiThucHien: string,
  stage: WorkflowStage,
  emails: ReadonlyArray<string>,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  const emailTo = joinEmails(emails);

  if (!emailTo) {
    return undefined;
  }

  return buildSendMailPayload(
    nguoiThucHien,
    resolveYeuCauTypeForStage(stage),
    emailTo,
    undefined,
    documentInfo
  );
}

export function buildXacNhanPayloadForStage(
  nguoiThucHien: string,
  stage: WorkflowStage,
  emailTo: string,
  approvalStatus: string,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  const normalizedEmailTo = emailTo.trim();

  if (!normalizedEmailTo) {
    return undefined;
  }

  return buildSendMailPayload(
    nguoiThucHien,
    resolveXacNhanTypeForStage(stage),
    normalizedEmailTo,
    approvalStatus,
    documentInfo
  );
}

export function buildRoleBasedPayload(
  nguoiThucHien: string,
  typeSendMail: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  role: string,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  const emailTo = joinEmails(getRoleEmails(roles, role));

  if (!emailTo) {
    return undefined;
  }

  return buildSendMailPayload(nguoiThucHien, typeSendMail, emailTo, undefined, documentInfo);
}

function buildAdminSuperAdminPayload(
  nguoiThucHien: string,
  typeSendMail: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  role: string,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  const basePayload = buildRoleBasedPayload(nguoiThucHien, typeSendMail, roles, role, documentInfo);
  const normalizedSoVanBan = (documentInfo.soVanBan || '').trim();

  if (!basePayload || !normalizedSoVanBan) {
    return undefined;
  }

  return {
    ...basePayload,
    SoVanBan: normalizedSoVanBan
  };
}

export function buildYeuCauCapSoPayload(
  nguoiThucHien: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  return buildRoleBasedPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.YEU_CAU_CAP_SO,
    roles,
    PHVB_ROLES.DC,
    documentInfo
  );
}

export function buildXacNhanCapSoPayload(
  nguoiThucHien: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  return buildAdminSuperAdminPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.XAC_NHAN_CAP_SO,
    roles,
    PHVB_ROLES.ADMIN,
    documentInfo
  );
}

export function buildYeuCauBanHanhPayload(
  nguoiThucHien: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  documentInfo: ISendMailDocumentInfo
): ISendMailRequest | undefined {
  return buildAdminSuperAdminPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.YEU_CAU_BAN_HANH,
    roles,
    PHVB_ROLES.SUPER_ADMIN,
    documentInfo
  );
}

export function buildTraLaiAdminBanHanhPayload(
  nguoiThucHien: string,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  documentInfo: ISendMailDocumentInfo,
  comment?: string
): ISendMailRequest | undefined {
  const basePayload = buildAdminSuperAdminPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.TRA_LAI_ADMIN_BAN_HANH,
    roles,
    PHVB_ROLES.ADMIN,
    documentInfo
  );
  const normalizedComment = (comment || '').trim();

  if (!basePayload) {
    return undefined;
  }

  if (!normalizedComment) {
    return basePayload;
  }

  return {
    ...basePayload,
    ApprovalStatus: normalizedComment
  };
}

export function buildXacNhanBanHanhPayload(
  nguoiThucHien: string,
  release: IVanBanItem,
  resolvedBody: string
): ISendMailRequest | undefined {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(release);
  const emailTo = (release.EmailNhanBanHanh || '').trim();
  const subject = (release.SubjectBanHanh || '').trim();
  const body = (resolvedBody || '').trim();
  const normalizedSoVanBan = (documentInfo.soVanBan || '').trim();

  const basePayload = buildSendMailPayload(
    nguoiThucHien,
    resolveXacNhanBanHanhMailType(release),
    emailTo,
    undefined,
    documentInfo
  );

  if (!basePayload || !subject || !body || !normalizedSoVanBan) {
    return undefined;
  }

  return {
    ...basePayload,
    SoVanBan: normalizedSoVanBan,
    Subject: subject,
    Body: body
  };
}

export function buildThongBaoLuuTruPayload(
  nguoiThucHien: string,
  release: IVanBanItem
): ISendMailRequest | undefined {
  const documentInfo = resolveSendMailDocumentInfoFromRelease(release);
  const emailTo = (release.EmailNguoiTao || '').trim();
  const nguoiTao = (release.NguoiTao || '').trim();

  const basePayload = buildSendMailPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.THONG_BAO_LUU_TRU,
    emailTo,
    undefined,
    documentInfo
  );

  if (!basePayload || !nguoiTao) {
    return undefined;
  }

  return {
    ...basePayload,
    NguoiTao: nguoiTao
  };
}

export { SEND_MAIL_APPROVAL_STATUS };
