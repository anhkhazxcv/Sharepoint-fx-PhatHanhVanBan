import { useCallback, useMemo, useState } from 'react';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { phvbBanHanhService } from '../services/PhvbMagBanHanh.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import { buildBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
import type {
  IBanHanhNotifyDraft,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

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
  isLoadingNotify: boolean;
  errorMessage?: string;
  loadNotifyDraft: () => Promise<IBanHanhNotifyDraft | undefined>;
  prepareForBanHanh: (notify: IBanHanhNotifyDraft) => Promise<boolean>;
  publishBanHanh: () => Promise<boolean>;
}

export function usePhvbBanHanh(options: IUsePhvbBanHanhOptions): IUsePhvbBanHanhResult {
  const { documentContext, detail, roles, onCompleted } = options;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingNotify, setIsLoadingNotify] = useState<boolean>(false);
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

  const loadNotifyDraft = useCallback(async (): Promise<IBanHanhNotifyDraft | undefined> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return undefined;
    }

    setIsLoadingNotify(true);
    setErrorMessage(undefined);

    const { release } = detail;

    try {
      const [mailConfig, labelConfig] = await Promise.all([
        phvbBanHanhConfigService.loadMailBanHanhConfig(documentContext),
        phvbBanHanhConfigService.loadLabelCustomConfig(documentContext)
      ]);

      const draft = buildBanHanhNotifyDraft(release, mailConfig, labelConfig);
      return draft;
    } catch (error) {
      setErrorMessage(phvbBanHanhConfigService.getRuntimeErrorMessage(error));
      return undefined;
    } finally {
      setIsLoadingNotify(false);
    }
  }, [detail, documentContext]);

  const prepareForBanHanh = useCallback(async (notify: IBanHanhNotifyDraft): Promise<boolean> => {
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

      await phvbBanHanhService.prepareForBanHanh(documentContext, detail, notify, logContext);

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
    isLoadingNotify,
    errorMessage,
    loadNotifyDraft,
    prepareForBanHanh,
    publishBanHanh
  };
}
