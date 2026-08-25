import { useCallback, useMemo, useState } from 'react';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { phvbDetailInfoEditService } from '../services/PhvbMagDetailInfoEdit.service';
import {
  canEditRequestInfoFields,
  type IRequestInfoFieldsInput
} from '../utils/PhvbMagDetailInfoEdit.utils';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';
import type {
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

interface IUsePhvbDetailInfoEditOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  onCompleted?: () => void;
}

interface IUsePhvbDetailInfoEditResult {
  canEdit: boolean;
  isSaving: boolean;
  errorMessage?: string;
  saveInfoFields: (input: IRequestInfoFieldsInput) => Promise<boolean>;
}

export function usePhvbDetailInfoEdit(
  options: IUsePhvbDetailInfoEditOptions
): IUsePhvbDetailInfoEditResult {
  const { documentContext, detail, roles, onCompleted } = options;
  const { runBusy } = usePhvbBusy();
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canEdit = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canEditRequestInfoFields(detail.release, roles, documentContext.userEmail);
  }, [detail, roles, documentContext.userEmail]);

  const saveInfoFields = useCallback(async (input: IRequestInfoFieldsInput): Promise<boolean> => {
    if (!detail || !canEdit) {
      setErrorMessage('Bạn không có quyền chỉnh sửa thông tin yêu cầu này.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await runBusy('Đang lưu thông tin...', async () => {
        const logContext: IPhvbLogContext = {
          flowRunId: createFlowRunId(),
          screenName: 'PhvbMagDetailInfoTab',
          actionName: 'DetailInfo_Update',
          userEmail: documentContext.userEmail,
          itemId: detail.release.IdYeuCau || detail.release.Id
        };

        await phvbDetailInfoEditService.updateRequestInfoFields(
          documentContext,
          detail.release,
          input,
          logContext
        );
      });

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbDetailInfoEditService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, canEdit, documentContext, onCompleted, runBusy]);

  return {
    canEdit,
    isSaving,
    errorMessage,
    saveInfoFields
  };
}
