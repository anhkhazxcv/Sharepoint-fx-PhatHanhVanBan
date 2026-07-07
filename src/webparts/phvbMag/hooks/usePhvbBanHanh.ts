import { useCallback, useMemo, useState } from 'react';
import { phvbBanHanhService } from '../services/PhvbMagBanHanh.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import type { IPhvbDocumentContext, IPhvbLogContext, IPhvbRoleEntry, IRequestDetailData } from '../models/PhvbMag.models';

interface IUsePhvbBanHanhOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  onCompleted?: () => void;
}

interface IUsePhvbBanHanhResult {
  canPrepare: boolean;
  canPublish: boolean;
  isSaving: boolean;
  errorMessage?: string;
  prepareForBanHanh: () => Promise<boolean>;
  publishBanHanh: () => Promise<boolean>;
}

export function usePhvbBanHanh(options: IUsePhvbBanHanhOptions): IUsePhvbBanHanhResult {
  const { documentContext, detail, roles, onCompleted } = options;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canPrepare = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canPrepareBanHanh(detail.release, roles, documentContext.userEmail);
  }, [detail, roles, documentContext.userEmail]);

  const canPublish = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canPublishBanHanh(detail.release, roles, documentContext.userEmail);
  }, [detail, roles, documentContext.userEmail]);

  const prepareForBanHanh = useCallback(async (): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagBanHanh',
        actionName: 'BanHanh_Prepare',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbBanHanhService.prepareForBanHanh(documentContext, detail, logContext);

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbBanHanhService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, documentContext, onCompleted]);

  const publishBanHanh = useCallback(async (): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagBanHanh',
        actionName: 'BanHanh_Publish',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbBanHanhService.publishBanHanh(documentContext, detail, logContext);

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbBanHanhService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, documentContext, onCompleted]);

  return {
    canPrepare,
    canPublish,
    isSaving,
    errorMessage,
    prepareForBanHanh,
    publishBanHanh
  };
}
