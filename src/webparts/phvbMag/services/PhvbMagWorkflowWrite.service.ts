import {
  ALL_USER_GOPY_LIST_TITLE,
  ALL_USER_PHEDUYET_LIST_TITLE,
  ALL_USER_THAMDINH_LIST_TITLE,
  TRANG_THAI_THUC_HIEN,
  TrangThaiThucHien,
  WORKFLOW_PARTICIPANT_STATUS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbSendMailService } from './PhvbMagSendMail.service';
import { appendHistory } from './PhvbMagExecutionHistory.service';
import { getRequestTypeFormRules } from '../utils/PhvbMagRequestForm.utils';
import {
  buildYeuCauPayloadForStage,
  getParticipantEmailsFromInput,
  resolveActiveWorkflowStageFromStatus,
  resolveInitialSubmitStatus,
  resolveSendMailDocumentInfoFromCreateInput
} from '../utils/PhvbMagSendMail.utils';
import type { ICreateRequestInput, IPhvbDirectoryUser, IPhvbLogContext, IPhvbSiteContext, RequestSubmissionFlow, SaveRequestMode } from '../models/PhvbMag.models';

interface ICreateWorkflowRecordsOptions extends IPhvbSiteContext {
  requestReferenceId: string;
  input: ICreateRequestInput;
  creatorDisplayName: string;
  creatorEmail: string;
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  saveMode: SaveRequestMode;
  submissionFlow?: RequestSubmissionFlow;
  isUpdate?: boolean;
  logContext?: IPhvbLogContext;
}

export interface IResolvedDirectoryUser {
  displayName: string;
  email: string;
  department: string;
}

export function buildDirectoryUserMap(directoryUsers: ReadonlyArray<IPhvbDirectoryUser>): Record<string, IResolvedDirectoryUser> {
  const map: Record<string, IResolvedDirectoryUser> = {};

  directoryUsers.forEach(user => {
    const normalizedEmail = user.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    map[normalizedEmail] = {
      displayName: user.displayName || user.email,
      email: user.email,
      department: user.department || ''
    };
  });

  return map;
}

export function resolveDirectoryUser(email: string, directoryMap: Record<string, IResolvedDirectoryUser>): IResolvedDirectoryUser {
  const normalizedEmail = email.trim().toLowerCase();
  const matchedUser = directoryMap[normalizedEmail];

  if (matchedUser) {
    return matchedUser;
  }

  return {
    displayName: email.trim(),
    email: email.trim(),
    department: ''
  };
}

export function buildAllUserPayload(
  requestReferenceId: string,
  user: IResolvedDirectoryUser
): Record<string, string | boolean | number> {
  return {
    Title: user.displayName,
    IDYeuCau: requestReferenceId,
    User_ThucHien: user.displayName,
    Email_ThucHien: user.email,
    PhongBan_ThucHien: user.department,
    TrangThai_ThucHien: WORKFLOW_PARTICIPANT_STATUS.CHUA_XAC_NHAN,
    NoiDung: ''
  };
}

function resolveHistoryStatusForCreate(options: ICreateWorkflowRecordsOptions): TrangThaiThucHien {
  const isDraft = options.saveMode === 'draft';

  if (options.isUpdate) {
    return isDraft
      ? TRANG_THAI_THUC_HIEN.CAP_NHAT_BAN_NHAP
      : TRANG_THAI_THUC_HIEN.CAP_NHAT_YEU_CAU;
  }

  return isDraft
    ? TRANG_THAI_THUC_HIEN.TAO_BAN_NHAP
    : TRANG_THAI_THUC_HIEN.TAO_YEU_CAU;
}

function buildCreateHistoryNoiDung(options: ICreateWorkflowRecordsOptions): string {
  const title = options.input.title ? options.input.title.trim() : '';
  return title;
}

async function createAllUserItemsForEmails(
  context: IPhvbSiteContext,
  listTitle: string,
  emails: string[],
  requestReferenceId: string,
  directoryMap: Record<string, IResolvedDirectoryUser>
): Promise<void> {
  const uniqueEmails: string[] = [];

  emails.forEach(email => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || uniqueEmails.indexOf(normalizedEmail) > -1) {
      return;
    }
    uniqueEmails.push(normalizedEmail);
  });

  for (let index = 0; index < uniqueEmails.length; index += 1) {
    const resolvedUser = resolveDirectoryUser(uniqueEmails[index], directoryMap);

    await phvbRepository.createItem({
      ...context,
      listTitle,
      payload: buildAllUserPayload(requestReferenceId, resolvedUser)
    });
  }
}

export class PhvbWorkflowWriteService {
  public async createWorkflowRecords(options: ICreateWorkflowRecordsOptions): Promise<void> {
    const isDraft = options.saveMode === 'draft';
    const trangThaiThucHien = resolveHistoryStatusForCreate(options);

    await appendHistory(
      { ...options, logContext: options.logContext, userDisplayName: options.creatorDisplayName, userEmail: options.creatorEmail },
      {
        idYeuCau: options.requestReferenceId,
        trangThaiThucHien,
        noiDung: buildCreateHistoryNoiDung(options),
        department: options.input.department || '',
        isComment: false
      }
    );

    if (isDraft || options.submissionFlow === 'dmvl') {
      return;
    }

    const directoryMap = buildDirectoryUserMap(options.directoryUsers);
    const formRules = getRequestTypeFormRules(options.input.requestType);
    const workflowTasks: Array<Promise<void>> = [];

    if (formRules.includeGopYThamDinhWorkflow) {
      workflowTasks.push(
        createAllUserItemsForEmails(
          options,
          ALL_USER_GOPY_LIST_TITLE,
          options.input.nguoiGopY,
          options.requestReferenceId,
          directoryMap
        ),
        createAllUserItemsForEmails(
          options,
          ALL_USER_THAMDINH_LIST_TITLE,
          options.input.nguoiThamDinh,
          options.requestReferenceId,
          directoryMap
        )
      );
    }

    workflowTasks.push(
      createAllUserItemsForEmails(
        options,
        ALL_USER_PHEDUYET_LIST_TITLE,
        options.input.approvalUsers,
        options.requestReferenceId,
        directoryMap
      )
    );

    await Promise.all(workflowTasks);

    const initialStatus = resolveInitialSubmitStatus(options.input);
    const activeStage = resolveActiveWorkflowStageFromStatus(initialStatus);

    if (activeStage) {
      const documentInfo = resolveSendMailDocumentInfoFromCreateInput(
        options.input,
        options.requestReferenceId
      );
      const mailPayload = buildYeuCauPayloadForStage(
        options.creatorEmail,
        activeStage,
        getParticipantEmailsFromInput(activeStage, options.input),
        documentInfo
      );

      if (mailPayload) {
        await phvbSendMailService.sendMail(options, mailPayload, options.logContext);
      }
    }
  }
}

export const phvbWorkflowWriteService = new PhvbWorkflowWriteService();
