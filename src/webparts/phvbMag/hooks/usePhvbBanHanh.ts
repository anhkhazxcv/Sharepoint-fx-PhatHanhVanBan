import { useCallback, useMemo, useState } from 'react';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { phvbMailContentConfigService } from '../services/PhvbMagMailContentConfig.service';
import { phvbBanHanhService } from '../services/PhvbMagBanHanh.service';
import { phvbDocumentLibraryService } from '../services/PhvbMagDocumentLibrary.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { canEditBanHanhNotify, canPrepareBanHanh, canPublishBanHanh } from '../utils/PhvbMagBanHanh.utils';
import { buildBanHanhNotifyDraft, buildBanHanhNotifyDraftFromSavedRelease, validateBanHanhNotifyDraft } from '../utils/PhvbMagBanHanhNotify.utils';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';
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
  const { runBusy } = usePhvbBusy();
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
      return await runBusy('Đang tải nội dung thông báo...', async () => {
        const [mailConfig, mailContentConfig] = await Promise.all([
          phvbBanHanhConfigService.loadMailBanHanhConfig(documentContext),
          phvbMailContentConfigService.loadMailContentConfig(documentContext)
        ]);

        return buildBanHanhNotifyDraft(release, mailConfig, mailContentConfig);
      });
    } catch (error) {
      setErrorMessage(phvbBanHanhConfigService.getRuntimeErrorMessage(error));
      return undefined;
    } finally {
      setIsLoadingNotify(false);
    }
  }, [detail, documentContext, runBusy]);

  const loadSavedNotifyDraft = useCallback(async (): Promise<IBanHanhNotifyDraft | undefined> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return undefined;
    }

    setIsLoadingNotify(true);
    setErrorMessage(undefined);

    try {
      return await runBusy('Đang tải nội dung thông báo...', async () => {
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
      });
    } finally {
      setIsLoadingNotify(false);
    }
  }, [detail, runBusy]);

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
      await runBusy('Đang chuẩn bị ban hành...', async () => {
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
      });

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
  }, [detail, documentContext, onCompleted, runBusy]);

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
      await runBusy('Đang lưu...', async () => {
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
      });

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
  }, [detail, documentContext, onCompleted, runBusy]);

  const publishBanHanh = useCallback(async (mainDocumentId?: number): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await runBusy('Đang ban hành...', async () => {
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

        phvbDocumentLibraryService.clearHomeDataCache();
      });

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
  }, [detail, documentContext, onCompleted, runBusy]);

  const returnBanHanhToAdmin = useCallback(async (comment: string): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await runBusy('Đang trả về admin...', async () => {
        const logContext: IPhvbLogContext = {
          flowRunId: createFlowRunId(),
          screenName: 'PhvbMagBanHanh',
          actionName: 'BanHanh_ReturnToAdmin',
          userEmail: documentContext.userEmail,
          itemId: detail.release.IdYeuCau || detail.release.Id
        };

        await phvbBanHanhService.returnBanHanhToAdmin(documentContext, detail, comment, logContext);
      });

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
  }, [detail, documentContext, onCompleted, runBusy]);

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
