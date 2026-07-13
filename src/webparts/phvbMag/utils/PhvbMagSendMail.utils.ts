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
  ISendMailPayload,
  IVanBanItem,
  WorkflowStage
} from '../models/PhvbMag.models';
import { getRequestTypeFormRules } from './PhvbMagRequestForm.utils';
import { getRoleEmails } from './PhvbMagRole.utils';
import {
  getParticipantsForStage,
  type IWorkflowStageParticipants,
  resolveDocumentStatusAfterSkippingEmptyStages,
  resolveStatusForWorkflowStage,
  resolveWorkflowStageFromStatus
} from './PhvbMagWorkflowState.utils';

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

export function buildSendMailPayload(
  nguoiThucHien: string,
  typeSendMail: string,
  emailTo: string,
  approvalStatus: string | undefined,
  documentInfo: ISendMailDocumentInfo
): ISendMailPayload | undefined {
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

  return {
    NguoiThucHien: normalizedActor,
    TypeSendMail: typeSendMail,
    EmailTo: normalizedEmailTo,
    ApprovalStatus: approvalStatus,
    IDYeuCau: normalizedIdYeuCau,
    TenVanBan: normalizedTenVanBan,
    TomTatNoiDung: normalizedTomTat
  };
}

export function buildYeuCauPayloadForStage(
  nguoiThucHien: string,
  stage: WorkflowStage,
  emails: ReadonlyArray<string>,
  documentInfo: ISendMailDocumentInfo
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
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
): ISendMailPayload | undefined {
  return buildAdminSuperAdminPayload(
    nguoiThucHien,
    SEND_MAIL_TYPE.YEU_CAU_BAN_HANH,
    roles,
    PHVB_ROLES.SUPER_ADMIN,
    documentInfo
  );
}

export { SEND_MAIL_APPROVAL_STATUS };
