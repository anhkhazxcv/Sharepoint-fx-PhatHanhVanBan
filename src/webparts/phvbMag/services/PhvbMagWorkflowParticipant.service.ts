import { DEFAULT_LIST_TITLE, EXECUTION_HISTORY_STATUS } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { createExecutionHistoryRecord } from './PhvbMagExecutionHistory.service';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import {
  buildFinalStageEmails,
  buildParticipantChangesSummary,
  buildReleaseParticipantFieldValue,
  canRemoveWorkflowParticipant,
  getVisibleParticipantStages,
  IWorkflowParticipantChanges,
  IWorkflowParticipantsByStage,
  WORKFLOW_PARTICIPANT_STAGE_CONFIG
} from '../utils/PhvbMagWorkflowParticipant.utils';
import { toRuntimeMessage } from './PhvbMag.error';
import {
  buildAllUserPayload,
  buildDirectoryUserMap,
  resolveDirectoryUser
} from './PhvbMagWorkflowWrite.service';
import type { IPhvbDirectoryUser, IPhvbLogContext, IPhvbSiteContext, IRequestDetailData } from '../models/PhvbMag.models';

interface IApplyParticipantChangesOptions extends IPhvbSiteContext {
  detail: IRequestDetailData;
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  changes: IWorkflowParticipantChanges;
  finalDraft: IWorkflowParticipantsByStage;
  logContext?: IPhvbLogContext;
  userDisplayName?: string;
  userEmail?: string;
}

export class PhvbWorkflowParticipantService {
  public async applyParticipantChanges(options: IApplyParticipantChangesOptions): Promise<void> {
    const requestReferenceId = (options.detail.release.IdYeuCau || '').trim();
    if (!requestReferenceId) {
      throw new Error('Không tìm thấy mã yêu cầu để cập nhật người tham gia.');
    }

    const visibleStages = getVisibleParticipantStages(options.detail.release.LoaiYeuCau);
    const performedAt = formatCurrentExecutionDateTime();
    const directoryMap = buildDirectoryUserMap(options.directoryUsers);
    const participantById = new Map<number, (typeof options.detail.workflowParticipants)[number]>();

    options.detail.workflowParticipants.forEach(participant => {
      participantById.set(participant.Id, participant);
    });

    for (let stageIndex = 0; stageIndex < visibleStages.length; stageIndex += 1) {
      const stage = visibleStages[stageIndex];
      const stageChanges = options.changes[stage];
      const stageConfig = WORKFLOW_PARTICIPANT_STAGE_CONFIG[stage];

      for (let removeIndex = 0; removeIndex < stageChanges.removedParticipantIds.length; removeIndex += 1) {
        const participantId = stageChanges.removedParticipantIds[removeIndex];
        const participant = participantById.get(participantId);

        if (!participant) {
          throw new Error('Không tìm thấy người tham gia cần xóa.');
        }

        if (participant.workflowStage !== stage) {
          throw new Error('Người tham gia không thuộc vai trò đang chỉnh sửa.');
        }

        if (!canRemoveWorkflowParticipant(participant.TrangThai_ThucHien)) {
          throw new Error('Chỉ có thể xóa người tham gia chưa xác nhận.');
        }

        await phvbRepository.deleteItem({
          ...options,
          listTitle: stageConfig.listTitle,
          itemId: participantId
        });
      }

      const existingEmails = new Set<string>();
      options.detail.workflowParticipants
        .filter(participant => participant.workflowStage === stage)
        .forEach(participant => {
          const email = (participant.Email_ThucHien || '').trim().toLowerCase();
          if (email) {
            existingEmails.add(email);
          }
        });

      stageChanges.removedParticipantIds.forEach(participantId => {
        const participant = participantById.get(participantId);
        const email = (participant?.Email_ThucHien || '').trim().toLowerCase();
        if (email) {
          existingEmails.delete(email);
        }
      });

      for (let addIndex = 0; addIndex < stageChanges.addedEmails.length; addIndex += 1) {
        const email = stageChanges.addedEmails[addIndex].trim();
        const normalizedEmail = email.toLowerCase();

        if (!email || existingEmails.has(normalizedEmail)) {
          continue;
        }

        const resolvedUser = resolveDirectoryUser(email, directoryMap);

        await phvbRepository.createItem({
          ...options,
          listTitle: stageConfig.listTitle,
          payload: buildAllUserPayload(requestReferenceId, resolvedUser, performedAt)
        });

        existingEmails.add(normalizedEmail);
      }
    }

    const releasePayload: Record<string, string> = {};

    visibleStages.forEach(stage => {
      const stageConfig = WORKFLOW_PARTICIPANT_STAGE_CONFIG[stage];
      const emails = buildFinalStageEmails(options.finalDraft[stage]);
      releasePayload[stageConfig.releaseField] = buildReleaseParticipantFieldValue(emails);
    });

    await phvbRepository.updateItem({
      ...options,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: options.detail.release.Id,
      payload: releasePayload
    });

    const changeSummary = buildParticipantChangesSummary(
      options.changes,
      visibleStages,
      participantId => participantById.get(participantId)?.Email_ThucHien
    );

    if (changeSummary) {
      await createExecutionHistoryRecord(
        { ...options, logContext: options.logContext },
        {
          idYeuCau: requestReferenceId,
          historyStatus: EXECUTION_HISTORY_STATUS.CAP_NHAT_NGUOI_THAM_GIA,
          noiDung: changeSummary,
          department: options.detail.release.KhoaPhongNguoiTao,
          isComment: false
        }
      );
    }
  }

  public getRuntimeErrorMessage(error: unknown, listTitle?: string): string {
    return toRuntimeMessage(error, listTitle || DEFAULT_LIST_TITLE);
  }
}

export const phvbWorkflowParticipantService = new PhvbWorkflowParticipantService();
