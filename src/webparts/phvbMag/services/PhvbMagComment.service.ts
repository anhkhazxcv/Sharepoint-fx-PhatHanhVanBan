import { COMMENT_HISTORY_STATUS, hasSharePointSiteContext, HISTORY_LIST_TITLE } from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import { phvbCommentAttachmentService } from './PhvbMagCommentAttachment.service';
import { formatCurrentExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import { validateCommentAttachmentFiles } from '../utils/PhvbMagCommentAttachment.utils';
import type { IPhvbDocumentContext } from '../models/PhvbMag.models';

export interface ICreateCommentInput {
  text: string;
  files?: File[];
}

export class PhvbCommentService {
  public async createComment(
    context: IPhvbDocumentContext,
    idYeuCau: string,
    input: ICreateCommentInput
  ): Promise<number> {
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

    const performedAt = formatCurrentExecutionDateTime();
    const payload: Record<string, string | boolean | number> = {
      Title: COMMENT_HISTORY_STATUS,
      IDYeuCau: normalizedIdYeuCau,
      User_ThucHien: context.userDisplayName || '',
      Email_ThucHien: context.userEmail || '',
      PhongBan_ThucHien: '',
      Ngay_ThucHien: performedAt,
      TrangThai_ThucHien: COMMENT_HISTORY_STATUS,
      NoiDung: normalizedText,
      IsComment: true
    };

    let commentId = 0;

    try {
      commentId = await phvbRepository.createItem({
        ...context,
        listTitle: HISTORY_LIST_TITLE,
        payload
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : '';
      if (/IsComment/i.test(details)) {
        const payloadWithoutIsComment = { ...payload };
        delete payloadWithoutIsComment.IsComment;
        commentId = await phvbRepository.createItem({
          ...context,
          listTitle: HISTORY_LIST_TITLE,
          payload: payloadWithoutIsComment
        });
      } else {
        throw error;
      }
    }

    if (files.length > 0) {
      await phvbCommentAttachmentService.uploadCommentFiles(context, commentId, files);
    }

    return commentId;
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, HISTORY_LIST_TITLE);
  }
}

export const phvbCommentService = new PhvbCommentService();
