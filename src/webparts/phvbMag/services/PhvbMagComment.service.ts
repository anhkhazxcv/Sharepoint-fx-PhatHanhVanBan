import { hasSharePointSiteContext, TRANG_THAI_THUC_HIEN } from '../config/PhvbMag.configuration';
import { appendHistory, getExecutionHistoryRuntimeErrorMessage } from './PhvbMagExecutionHistory.service';
import { phvbCommentAttachmentService } from './PhvbMagCommentAttachment.service';
import { validateCommentAttachmentFiles } from '../utils/PhvbMagCommentAttachment.utils';
import type { IPhvbDocumentContext, IPhvbLogContext } from '../models/PhvbMag.models';

export interface ICreateCommentInput {
  text: string;
  files?: File[];
}

export class PhvbCommentService {
  public async createComment(
    context: IPhvbDocumentContext,
    idYeuCau: string,
    input: ICreateCommentInput,
    logContext?: IPhvbLogContext
  ): Promise<number | undefined> {
    if (!hasSharePointSiteContext(context)) {
      throw new Error('Missing SharePoint site context.');
    }

    const normalizedIdYeuCau = idYeuCau.trim();
    const normalizedText = input.text.trim();
    const files = input.files || [];

    if (!normalizedIdYeuCau) {
      throw new Error('Thiếu mã yêu cầu để gửi bình luận.');
    }

    if (!normalizedText) {
      throw new Error('Vui lòng nhập nội dung bình luận.');
    }

    const attachmentValidationError = validateCommentAttachmentFiles(files);
    if (attachmentValidationError) {
      throw new Error(attachmentValidationError);
    }

    const result = await appendHistory(
      { ...context, logContext },
      {
        idYeuCau: normalizedIdYeuCau,
        trangThaiThucHien: TRANG_THAI_THUC_HIEN.BINH_LUAN,
        noiDung: normalizedText,
        isComment: true
      }
    );

    if (result.status === 'queued') {
      if (files.length > 0) {
        // Chưa có Id item thật (đang ở hàng chờ ghi lại) nên không thể đính kèm file —
        // báo lỗi để người dùng thử lại, thay vì âm thầm mất file đính kèm.
        throw new Error('Không thể gửi bình luận kèm file lúc này, vui lòng thử lại.');
      }

      return undefined;
    }

    if (files.length > 0) {
      await phvbCommentAttachmentService.uploadCommentFiles(context, result.id, files, logContext);
    }

    return result.id;
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return getExecutionHistoryRuntimeErrorMessage(error);
  }
}

export const phvbCommentService = new PhvbCommentService();
