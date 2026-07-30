import { useCallback, useMemo, useState } from 'react';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { phvbBanHanhService } from '../services/PhvbMagBanHanh.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { canEditBanHanhNotify, canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import { buildBanHanhNotifyDraft, buildBanHanhNotifyDraftFromSavedRelease, validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
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
  canEdit: boolean;
  isSaving: boolean;
  isLoadingNotify: boolean;
  errorMessage?: string;
  loadNotifyDraft: () => Promise<IBanHanhNotifyDraft | undefined>;
  loadSavedNotifyDraft: () => Promise<IBanHanhNotifyDraft | undefined>;
  prepareForBanHanh: (notify: IBanHanhNotifyDraft, mainDocumentId?: number) => Promise<boolean>;
  updateBanHanhNotify: (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ) => Promise<boolean>;
  publishBanHanh: (mainDocumentId?: number) => Promise<boolean>;
  returnBanHanhToAdmin: (comment: string) => Promise<boolean>;
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

  const canEdit = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canEditBanHanhNotify(detail.release, roles, documentContext.userEmail);
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

  const loadSavedNotifyDraft = useCallback(async (): Promise<IBanHanhNotifyDraft | undefined> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return undefined;
    }

    setIsLoadingNotify(true);
    setErrorMessage(undefined);

    try {
      const draft = buildBanHanhNotifyDraftFromSavedRelease(detail.release);
      const validationError = validateBanHanhNotifyDraft(draft);

      if (validationError) {
        setErrorMessage(
          validationError === 'Vui lòng nhập nơi nhận email.'
            ? 'Chưa có nội dung ban hành từ Admin. Vui lòng liên hệ Admin để chuẩn bị trước.'
            : validationError
        );
        return undefined;
      }

      return draft;
    } finally {
      setIsLoadingNotify(false);
    }
  }, [detail]);

  const prepareForBanHanh = useCallback(async (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ): Promise<boolean> => {
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

      await phvbBanHanhService.prepareForBanHanh(
        documentContext,
        detail,
        notify,
        { mainDocumentId },
        logContext
      );

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

  const updateBanHanhNotify = useCallback(async (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ): Promise<boolean> => {
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
        actionName: 'BanHanh_EditNotify',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbBanHanhService.updateBanHanhNotifyContent(
        documentContext,
        detail,
        notify,
        { mainDocumentId },
        logContext
      );

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

  const publishBanHanh = useCallback(async (mainDocumentId?: number): Promise<boolean> => {
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

      await phvbBanHanhService.publishBanHanh(
        documentContext,
        detail,
        { mainDocumentId },
        logContext
      );

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbBanHanhService.getPublishRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, documentContext, onCompleted]);

  const returnBanHanhToAdmin = useCallback(async (comment: string): Promise<boolean> => {
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
        actionName: 'BanHanh_ReturnToAdmin',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbBanHanhService.returnBanHanhToAdmin(documentContext, detail, comment, logContext);

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
    canEdit,
    isSaving,
    isLoadingNotify,
    errorMessage,
    loadNotifyDraft,
    loadSavedNotifyDraft,
    prepareForBanHanh,
    updateBanHanhNotify,
    publishBanHanh,
    returnBanHanhToAdmin
  };
}
