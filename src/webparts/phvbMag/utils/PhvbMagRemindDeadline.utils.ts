import {
  PHVB_ROLES,
  REQUEST_STATUS,
  SEND_MAIL_TYPE,
  type SendMailType
} from '../config/PhvbMag.configuration';
import type {
  IPhvbDirectoryUser,
  IPhvbRoleEntry,
  IRequestDetailData,
  ISendMailDocumentInfo,
  ISendMailPayload,
  IVanBanItem,
  WorkflowStage
} from '../models/PhvbMag.models';
import { getRoleEmails, userHasRole } from './PhvbMagRole.utils';
import {
  buildSendMailPayload,
  joinEmails,
  resolveSendMailDocumentInfoFromRelease
} from './PhvbMagSendMail.utils';
import { isWorkflowParticipantUnconfirmed } from './PhvbMagWorkflowTimeline.utils';

export interface IRemindDeadlineRecipient {
  id: string;
  email: string;
  displayName: string;
  subtitle?: string;
}

export interface IRemindDeadlineContext {
  statusLabel: string;
  description: string;
  mailType: SendMailType;
  recipients: IRemindDeadlineRecipient[];
  requiresSoVanBan: boolean;
}

const REMINDABLE_STATUSES: ReadonlyArray<string> = [
  REQUEST_STATUS.DANG_GOP_Y,
  REQUEST_STATUS.DANG_THAM_DINH,
  REQUEST_STATUS.DANG_PHE_DUYET,
  REQUEST_STATUS.CHO_CAP_SO,
  REQUEST_STATUS.DA_CAP_SO,
  REQUEST_STATUS.CHO_BAN_HANH
];

const STAGE_LABELS: Record<WorkflowStage, string> = {
  gopy: 'Góp ý',
  thamdinh: 'Thẩm định',
  pheduyet: 'Phê duyệt'
};

function normalizeEmail(value?: string): string {
  return (value || '').trim().toLowerCase();
}

function buildRecipientId(email: string): string {
  return normalizeEmail(email);
}

function findDirectoryUser(
  tenantUsers: ReadonlyArray<IPhvbDirectoryUser> | undefined,
  email: string
): IPhvbDirectoryUser | undefined {
  const normalized = normalizeEmail(email);
  if (!normalized || !tenantUsers) {
    return undefined;
  }

  for (let index = 0; index < tenantUsers.length; index += 1) {
    const user = tenantUsers[index];
    if (normalizeEmail(user.email) === normalized) {
      return user;
    }
  }

  return undefined;
}

function enrichRecipient(
  email: string,
  displayName: string,
  subtitle: string | undefined,
  tenantUsers: ReadonlyArray<IPhvbDirectoryUser> | undefined
): IRemindDeadlineRecipient | undefined {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return undefined;
  }

  const directoryUser = findDirectoryUser(tenantUsers, trimmedEmail);
  const resolvedName = (directoryUser?.displayName || displayName || trimmedEmail).trim();

  return {
    id: buildRecipientId(trimmedEmail),
    email: trimmedEmail,
    displayName: resolvedName,
    subtitle
  };
}

function dedupeRecipients(recipients: IRemindDeadlineRecipient[]): IRemindDeadlineRecipient[] {
  const seen = new Set<string>();
  const unique: IRemindDeadlineRecipient[] = [];

  recipients.forEach(recipient => {
    if (seen.has(recipient.id)) {
      return;
    }

    seen.add(recipient.id);
    unique.push(recipient);
  });

  return unique;
}

function resolveMailTypeForStatus(status: string): SendMailType | undefined {
  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      return SEND_MAIL_TYPE.YEU_CAU_GOP_Y;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return SEND_MAIL_TYPE.YEU_CAU_THAM_DINH;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return SEND_MAIL_TYPE.YEU_CAU_PHE_DUYET;
    case REQUEST_STATUS.CHO_CAP_SO:
      return SEND_MAIL_TYPE.YEU_CAU_CAP_SO;
    case REQUEST_STATUS.DA_CAP_SO:
      return SEND_MAIL_TYPE.XAC_NHAN_CAP_SO;
    case REQUEST_STATUS.CHO_BAN_HANH:
      return SEND_MAIL_TYPE.YEU_CAU_BAN_HANH;
    default:
      return undefined;
  }
}

function resolveDescriptionForStatus(status: string): string {
  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      return 'Nhắc người tham gia góp ý chưa xác nhận.';
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 'Nhắc người tham gia thẩm định chưa xác nhận.';
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'Nhắc người tham gia phê duyệt chưa xác nhận.';
    case REQUEST_STATUS.CHO_CAP_SO:
      return 'Nhắc văn thư (DC) thực hiện cấp số.';
    case REQUEST_STATUS.DA_CAP_SO:
      return 'Nhắc quản trị viên chuẩn bị ban hành.';
    case REQUEST_STATUS.CHO_BAN_HANH:
      return 'Nhắc super admin ban hành văn bản.';
    default:
      return '';
  }
}

function resolveWorkflowStageRecipients(
  detail: IRequestDetailData,
  stage: WorkflowStage,
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>
): IRemindDeadlineRecipient[] {
  const recipients = detail.workflowParticipants
    .filter(participant => participant.workflowStage === stage)
    .filter(participant => isWorkflowParticipantUnconfirmed(participant.TrangThai_ThucHien))
    .map(participant =>
      enrichRecipient(
        participant.Email_ThucHien || '',
        participant.User_ThucHien || participant.Email_ThucHien || '',
        STAGE_LABELS[stage],
        tenantUsers
      )
    )
    .filter((recipient): recipient is IRemindDeadlineRecipient => Boolean(recipient));

  return dedupeRecipients(recipients);
}

function resolveRoleRecipients(
  roles: ReadonlyArray<IPhvbRoleEntry>,
  role: string,
  subtitle: string,
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>
): IRemindDeadlineRecipient[] {
  const recipients = getRoleEmails(roles, role)
    .map(email => enrichRecipient(email, email, subtitle, tenantUsers))
    .filter((recipient): recipient is IRemindDeadlineRecipient => Boolean(recipient));

  return dedupeRecipients(recipients);
}

export function isRemindableStatus(statusApproved?: string): boolean {
  const status = (statusApproved || '').trim();
  return REMINDABLE_STATUSES.indexOf(status) > -1;
}

export function canRemindDeadlinePermission(
  release: IVanBanItem,
  userEmail: string | undefined,
  roles: ReadonlyArray<IPhvbRoleEntry>
): boolean {
  const normalizedUserEmail = normalizeEmail(userEmail);
  const creatorEmail = normalizeEmail(release.EmailNguoiTao);

  if (!normalizedUserEmail) {
    return false;
  }

  return normalizedUserEmail === creatorEmail || userHasRole(roles, userEmail, PHVB_ROLES.ADMIN);
}

export function resolveRemindDeadlineContext(
  detail: IRequestDetailData,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>
): IRemindDeadlineContext | undefined {
  const status = (detail.release.StatusApproved || '').trim();
  const mailType = resolveMailTypeForStatus(status);

  if (!mailType) {
    return undefined;
  }

  let recipients: IRemindDeadlineRecipient[] = [];

  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      recipients = resolveWorkflowStageRecipients(detail, 'gopy', tenantUsers);
      break;
    case REQUEST_STATUS.DANG_THAM_DINH:
      recipients = resolveWorkflowStageRecipients(detail, 'thamdinh', tenantUsers);
      break;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      recipients = resolveWorkflowStageRecipients(detail, 'pheduyet', tenantUsers);
      break;
    case REQUEST_STATUS.CHO_CAP_SO:
      recipients = resolveRoleRecipients(roles, PHVB_ROLES.DC, 'Văn thư (DC)', tenantUsers);
      break;
    case REQUEST_STATUS.DA_CAP_SO:
      recipients = resolveRoleRecipients(roles, PHVB_ROLES.ADMIN, 'Quản trị viên', tenantUsers);
      break;
    case REQUEST_STATUS.CHO_BAN_HANH:
      recipients = resolveRoleRecipients(roles, PHVB_ROLES.SUPER_ADMIN, 'Super Admin', tenantUsers);
      break;
    default:
      return undefined;
  }

  if (recipients.length === 0) {
    return undefined;
  }

  const requiresSoVanBan =
    mailType === SEND_MAIL_TYPE.XAC_NHAN_CAP_SO ||
    mailType === SEND_MAIL_TYPE.YEU_CAU_BAN_HANH;

  return {
    statusLabel: status,
    description: resolveDescriptionForStatus(status),
    mailType,
    recipients,
    requiresSoVanBan
  };
}

export function canRemindDeadline(
  detail: IRequestDetailData,
  userEmail: string | undefined,
  roles: ReadonlyArray<IPhvbRoleEntry>,
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>
): boolean {
  if (!isRemindableStatus(detail.release.StatusApproved)) {
    return false;
  }

  if (!canRemindDeadlinePermission(detail.release, userEmail, roles)) {
    return false;
  }

  return Boolean(resolveRemindDeadlineContext(detail, roles, tenantUsers));
}

export function buildRemindDeadlinePayload(
  actorEmail: string,
  selectedEmails: ReadonlyArray<string>,
  context: IRemindDeadlineContext,
  documentInfo: ISendMailDocumentInfo
): ISendMailPayload | undefined {
  const emailTo = joinEmails(selectedEmails);

  if (!emailTo) {
    return undefined;
  }

  const payload = buildSendMailPayload(
    actorEmail,
    context.mailType,
    emailTo,
    undefined,
    documentInfo
  );

  if (!payload) {
    return undefined;
  }

  if (context.requiresSoVanBan) {
    const normalizedSoVanBan = (documentInfo.soVanBan || '').trim();
    if (!normalizedSoVanBan) {
      return undefined;
    }

    return {
      ...payload,
      SoVanBan: normalizedSoVanBan
    };
  }

  return payload;
}

export function resolveSelectedRecipientEmails(
  context: IRemindDeadlineContext,
  selectedRecipientIds: ReadonlyArray<string>
): string[] {
  const selectedIds = new Set(selectedRecipientIds.map(id => id.trim().toLowerCase()).filter(Boolean));

  return context.recipients
    .filter(recipient => selectedIds.has(recipient.id))
    .map(recipient => recipient.email);
}

export function resolveRemindDeadlineDocumentInfo(release: IVanBanItem): ISendMailDocumentInfo {
  return {
    ...resolveSendMailDocumentInfoFromRelease(release),
    soVanBan: (release.SoVanBan || '').trim()
  };
}
