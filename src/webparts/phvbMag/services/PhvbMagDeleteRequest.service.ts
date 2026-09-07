import { DEFAULT_LIST_TITLE } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { phvbAttachmentService } from './PhvbMagAttachment.service';
import { phvbCommentAttachmentService } from './PhvbMagCommentAttachment.service';
import { phvbDetailService } from './PhvbMagDetail.service';
import { deleteHistoryItems } from './PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from './PhvbMag.error';
import { WORKFLOW_PARTICIPANT_STAGE_CONFIG } from '../utils/PhvbMagWorkflowParticipant.utils';
import type { IPhvbDocumentContext, IPhvbLogContext, IVanBanItem } from '../models/PhvbMag.models';

export class PhvbDeleteRequestService {
  /**
   * Xóa yêu cầu ở bất kỳ trạng thái nào (kể cả đã Ban hành) cùng toàn bộ dữ liệu vệ tinh.
   * Cố ý KHÔNG đụng tới thư viện phát hành chính thức (ISSUANCE_LIBRARY_TITLE) — file đã
   * ban hành cho người dùng khác xem/tải vẫn giữ nguyên.
   */
  public async deleteRequest(
    context: IPhvbDocumentContext,
    release: IVanBanItem,
    logContext?: IPhvbLogContext
  ): Promise<void> {
    const idYeuCau = (release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    const detail = await phvbDetailService.loadRequestDetail(context, idYeuCau);

    if (!detail) {
      throw new Error('Không tìm thấy dữ liệu yêu cầu cần xóa.');
    }

    const historyAndComments = [...detail.history, ...detail.comments];

    await Promise.all([
      Promise.all(detail.workflowParticipants.map(participant =>
        phvbRepository.deleteItem({
          ...context,
          logContext,
          listTitle: WORKFLOW_PARTICIPANT_STAGE_CONFIG[participant.workflowStage].listTitle,
          itemId: participant.Id
        })
      )),
      deleteHistoryItems({ ...context, logContext }, historyAndComments.map(item => item.Id)),
      phvbCommentAttachmentService.deleteCommentFolders(context, historyAndComments.map(item => item.Id)),
      phvbAttachmentService.deleteRequestFolder({ ...context, logContext }, idYeuCau)
    ]);

    await phvbRepository.deleteItem({
      ...context,
      logContext,
      listTitle: DEFAULT_LIST_TITLE,
      itemId: release.Id
    });
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, DEFAULT_LIST_TITLE);
  }
}

export const phvbDeleteRequestService = new PhvbDeleteRequestService();
