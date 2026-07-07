import { useCallback, useState } from 'react';
import { phvbCommentService } from '../services/PhvbMagComment.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { appendCommentAttachmentFiles } from '../utils/PhvbMagCommentAttachment.utils';
import type { IPhvbDocumentContext, IPhvbLogContext } from '../models/PhvbMag.models';

interface IUsePhvbCommentsOptions {
  documentContext: IPhvbDocumentContext;
  idYeuCau?: string;
  onCompleted?: () => void;
}

interface IUsePhvbCommentsResult {
  selectedFiles: File[];
  isSaving: boolean;
  errorMessage?: string;
  addFiles: (incomingFiles: FileList | File[]) => string | undefined;
  removeFile: (fileIndex: number) => void;
  clearComposer: () => void;
  submitComment: (text: string) => Promise<boolean>;
}

export function usePhvbComments(options: IUsePhvbCommentsOptions): IUsePhvbCommentsResult {
  const { documentContext, idYeuCau, onCompleted } = options;
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const clearComposer = useCallback((): void => {
    setSelectedFiles([]);
    setErrorMessage(undefined);
  }, []);

  const addFiles = useCallback((incomingFiles: FileList | File[]): string | undefined => {
    const snapshot = Array.prototype.slice.call(incomingFiles) as File[];
    const result = appendCommentAttachmentFiles(selectedFiles, snapshot);

    setSelectedFiles(result.files);
    setErrorMessage(result.error);

    return result.error;
  }, [selectedFiles]);

  const removeFile = useCallback((fileIndex: number): void => {
    setSelectedFiles(previousFiles => previousFiles.filter((_, index) => index !== fileIndex));
    setErrorMessage(undefined);
  }, []);

  const submitComment = useCallback(async (text: string): Promise<boolean> => {
    const normalizedIdYeuCau = (idYeuCau || '').trim();
    const normalizedText = text.trim();

    if (!normalizedIdYeuCau) {
      setErrorMessage('Thiếu mã yêu cầu để gửi bình luận.');
      return false;
    }

    if (!normalizedText) {
      setErrorMessage('Vui lòng nhập nội dung bình luận.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagActivityFeed',
        actionName: 'Comment_Create',
        userEmail: documentContext.userEmail,
        itemId: normalizedIdYeuCau
      };

      await phvbCommentService.createComment(documentContext, normalizedIdYeuCau, {
        text: normalizedText,
        files: selectedFiles
      }, logContext);

      clearComposer();

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbCommentService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [clearComposer, documentContext, idYeuCau, onCompleted, selectedFiles]);

  return {
    selectedFiles,
    isSaving,
    errorMessage,
    addFiles,
    removeFile,
    clearComposer,
    submitComment
  };
}
