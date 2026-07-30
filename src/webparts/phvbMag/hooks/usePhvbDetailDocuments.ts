import { useCallback, useMemo, useState } from 'react';
import {
  cloneDefaultRequestForm,
  EXECUTION_HISTORY_STATUS
} from '../config/PhvbMag.configuration';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { phvbAttachmentService } from '../services/PhvbMagAttachment.service';
import { createExecutionHistoryRecord } from '../services/PhvbMagExecutionHistory.service';
import { toRuntimeMessage } from '../services/PhvbMag.error';
import { canManageDetailDocuments } from '../utils/PhvbMagDetailDocuments.utils';
import type {
  IAttachmentLibraryItem,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

export type DetailDocumentUploadKind = 'draft' | 'form';

interface IUsePhvbDetailDocumentsOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  onCompleted?: () => void;
}

interface IUsePhvbDetailDocumentsResult {
  canManage: boolean;
  isMutating: boolean;
  errorMessage?: string;
  uploadFiles: (kind: DetailDocumentUploadKind, files: FileList | File[]) => Promise<boolean>;
  deleteFile: (file: IAttachmentLibraryItem) => Promise<boolean>;
  deleteFiles: (files: IAttachmentLibraryItem[]) => Promise<boolean>;
}

function toFileArray(files: FileList | File[]): File[] {
  if (Array.isArray(files)) {
    return files.filter(file => Boolean(file));
  }

  const result: File[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files.item(index);
    if (file) {
      result.push(file);
    }
  }

  return result;
}

export function usePhvbDetailDocuments(
  options: IUsePhvbDetailDocumentsOptions
): IUsePhvbDetailDocumentsResult {
  const { documentContext, detail, roles, onCompleted } = options;
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canManage = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canManageDetailDocuments(detail.release, roles, documentContext.userEmail);
  }, [detail, roles, documentContext.userEmail]);

  const uploadFiles = useCallback(async (
    kind: DetailDocumentUploadKind,
    files: FileList | File[]
  ): Promise<boolean> => {
    if (!detail || !canManage) {
      setErrorMessage('Bạn không có quyền thêm tài liệu cho yêu cầu này.');
      return false;
    }

    const requestReferenceId = (detail.release.IdYeuCau || '').trim();
    if (!requestReferenceId) {
      setErrorMessage('Yêu cầu chưa có mã IdYeuCau.');
      return false;
    }

    const selectedFiles = toFileArray(files);
    if (selectedFiles.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất một file.');
      return false;
    }

    setIsMutating(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagDetailDocuments',
        actionName: kind === 'form' ? 'Document_UploadForm' : 'Document_UploadDraft',
        userEmail: documentContext.userEmail,
        itemId: requestReferenceId
      };

      const input = cloneDefaultRequestForm();
      input.department = detail.release.KhoaPhongNguoiTao || '';
      if (kind === 'form') {
        input.bieuMauFiles = selectedFiles;
      } else {
        input.taiLieuFiles = selectedFiles;
      }

      await phvbAttachmentService.uploadRequestFiles({
        ...documentContext,
        logContext,
        requestReferenceId,
        input
      });

      await createExecutionHistoryRecord(
        { ...documentContext, logContext },
        {
          idYeuCau: requestReferenceId,
          historyStatus: EXECUTION_HISTORY_STATUS.THEM_TAI_LIEU,
          noiDung: selectedFiles.map(file => file.name).join('; '),
          department: detail.release.KhoaPhongNguoiTao,
          isComment: false
        }
      );

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(toRuntimeMessage(error, 'tài liệu'));
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [canManage, detail, documentContext, onCompleted]);

  const deleteFiles = useCallback(async (files: IAttachmentLibraryItem[]): Promise<boolean> => {
    if (!detail || !canManage) {
      setErrorMessage('Bạn không có quyền xóa tài liệu cho yêu cầu này.');
      return false;
    }

    const requestReferenceId = (detail.release.IdYeuCau || '').trim();
    if (!requestReferenceId) {
      setErrorMessage('Yêu cầu chưa có mã IdYeuCau.');
      return false;
    }

    const targets = files.filter(file => file && file.id > 0);
    if (targets.length === 0) {
      setErrorMessage('Không xác định được tài liệu cần xóa.');
      return false;
    }

    setIsMutating(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagDetailDocuments',
        actionName: 'Document_Delete',
        userEmail: documentContext.userEmail,
        itemId: requestReferenceId
      };

      await phvbAttachmentService.deleteRequestFiles(
        { ...documentContext, logContext },
        targets.map(file => file.id)
      );

      await createExecutionHistoryRecord(
        { ...documentContext, logContext },
        {
          idYeuCau: requestReferenceId,
          historyStatus: EXECUTION_HISTORY_STATUS.XOA_TAI_LIEU,
          noiDung: targets.map(file => file.name || String(file.id)).join('; '),
          department: detail.release.KhoaPhongNguoiTao,
          isComment: false
        }
      );

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(toRuntimeMessage(error, 'tài liệu'));
      return false;
    } finally {
      setIsMutating(false);
    }
  }, [canManage, detail, documentContext, onCompleted]);

  const deleteFile = useCallback(async (file: IAttachmentLibraryItem): Promise<boolean> => {
    return deleteFiles([file]);
  }, [deleteFiles]);

  return {
    canManage,
    isMutating,
    errorMessage,
    uploadFiles,
    deleteFile,
    deleteFiles
  };
}
