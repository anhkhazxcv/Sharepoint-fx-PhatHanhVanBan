import { useCallback, useState } from 'react';
import { phvbBanHanhService } from '../services/PhvbMagBanHanh.service';
import { phvbDetailService } from '../services/PhvbMagDetail.service';
import { phvbDocumentsService } from '../services/PhvbMag.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { prepareDmvlNotifyDraft } from '../utils/PhvbMagDmvl.utils';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';
import type {
  IBanHanhNotifyDraft,
  ICreateRequestInput,
  IPhvbDirectoryUser,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';

type DmvlFlowMode = 'create' | 'resume';

interface IUsePhvbDmvlFlowOptions {
  documentContext: IPhvbDocumentContext;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  onPublished?: () => void;
}

interface IUsePhvbDmvlFlowResult {
  isDmvlSaving: boolean;
  isDmvlPublishing: boolean;
  isDmvlNotifyLoading: boolean;
  dmvlNotifyDraft?: IBanHanhNotifyDraft;
  dmvlDetail?: IRequestDetailData;
  dmvlErrorMessage?: string;
  isDmvlNotifyOpen: boolean;
  handleDmvlBanHanh: (input: ICreateRequestInput) => Promise<boolean>;
  handleResumeDmvlBanHanh: (detail: IRequestDetailData) => Promise<boolean>;
  handleDmvlNotifyCancel: () => void;
  handleDmvlNotifyConfirm: (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ) => Promise<boolean>;
  resetDmvlFlow: () => void;
}

const DMVL_CREATE_CANCEL_MESSAGE =
  'Yêu cầu đã được lưu ở trạng thái Chờ ban hành. Bạn có thể mở lại yêu cầu từ danh sách và bấm Tiếp tục ban hành DMVL để hoàn tất.';

export function usePhvbDmvlFlow(options: IUsePhvbDmvlFlowOptions): IUsePhvbDmvlFlowResult {
  const { documentContext, roles, directoryUsers, onPublished } = options;
  const { runBusy } = usePhvbBusy();
  const [isDmvlSaving, setIsDmvlSaving] = useState(false);
  const [isDmvlPublishing, setIsDmvlPublishing] = useState(false);
  const [isDmvlNotifyLoading, setIsDmvlNotifyLoading] = useState(false);
  const [dmvlNotifyDraft, setDmvlNotifyDraft] = useState<IBanHanhNotifyDraft | undefined>(undefined);
  const [dmvlDetail, setDmvlDetail] = useState<IRequestDetailData | undefined>(undefined);
  const [dmvlErrorMessage, setDmvlErrorMessage] = useState<string | undefined>(undefined);
  const [isDmvlNotifyOpen, setIsDmvlNotifyOpen] = useState(false);
  const [dmvlFlowMode, setDmvlFlowMode] = useState<DmvlFlowMode | undefined>(undefined);

  const resetDmvlFlow = useCallback((): void => {
    setDmvlNotifyDraft(undefined);
    setDmvlDetail(undefined);
    setDmvlErrorMessage(undefined);
    setIsDmvlNotifyOpen(false);
    setIsDmvlNotifyLoading(false);
    setIsDmvlPublishing(false);
    setIsDmvlSaving(false);
    setDmvlFlowMode(undefined);
  }, []);

  const handleDmvlNotifyCancel = useCallback((): void => {
    setIsDmvlNotifyOpen(false);
    setDmvlNotifyDraft(undefined);
    setDmvlDetail(undefined);

    if (dmvlFlowMode === 'create') {
      setDmvlErrorMessage(DMVL_CREATE_CANCEL_MESSAGE);
    } else {
      setDmvlErrorMessage(undefined);
    }

    setDmvlFlowMode(undefined);
  }, [dmvlFlowMode]);

  const openDmvlNotifyDialog = useCallback(async (detail: IRequestDetailData, mode: DmvlFlowMode): Promise<void> => {
    setDmvlFlowMode(mode);
    setDmvlDetail(detail);
    setIsDmvlNotifyOpen(true);
    setIsDmvlNotifyLoading(true);
    setDmvlNotifyDraft(undefined);
    setDmvlErrorMessage(undefined);

    try {
      const draft = await runBusy('Đang tải nội dung thông báo...', async () => {
        return prepareDmvlNotifyDraft(documentContext, detail.release);
      });
      setDmvlNotifyDraft(draft);
    } catch (error) {
      setDmvlErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error));
      setIsDmvlNotifyOpen(false);
      setDmvlDetail(undefined);
      setDmvlFlowMode(undefined);
      throw error;
    } finally {
      setIsDmvlNotifyLoading(false);
    }
  }, [documentContext, runBusy]);

  const handleDmvlBanHanh = useCallback(async (input: ICreateRequestInput): Promise<boolean> => {
    setIsDmvlSaving(true);
    setDmvlErrorMessage(undefined);

    const logContext: IPhvbLogContext = {
      flowRunId: createFlowRunId(),
      screenName: 'PhvbMagCreateModal',
      actionName: 'Request_Create_Dmvl',
      userEmail: documentContext.userEmail
    };

    try {
      const detail = await runBusy('Đang xử lý Trình DMVL...', async () => {
        const requestReferenceId = await phvbDocumentsService.createRequest({
          ...documentContext,
          input,
          saveMode: 'submit',
          submissionFlow: 'dmvl',
          directoryUsers,
          logContext
        });

        const detailPartial = await phvbDetailService.loadRequestDetailPartial(
          documentContext,
          requestReferenceId,
          ['attachments', 'release']
        );

        if (!detailPartial?.release) {
          throw new Error('Không tải được dữ liệu yêu cầu sau khi tạo.');
        }

        return {
          release: detailPartial.release,
          attachments: detailPartial.attachments || [],
          history: [],
          comments: [],
          workflowParticipants: []
        } as IRequestDetailData;
      });

      await openDmvlNotifyDialog(detail, 'create');
      return true;
    } catch (error) {
      setDmvlErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error));
      setIsDmvlNotifyOpen(false);
      return false;
    } finally {
      setIsDmvlSaving(false);
    }
  }, [directoryUsers, documentContext, openDmvlNotifyDialog, runBusy]);

  const handleResumeDmvlBanHanh = useCallback(async (detail: IRequestDetailData): Promise<boolean> => {
    setDmvlErrorMessage(undefined);

    try {
      await openDmvlNotifyDialog(detail, 'resume');
      return true;
    } catch (error) {
      setDmvlErrorMessage(phvbDocumentsService.getRuntimeErrorMessage(error));
      return false;
    }
  }, [openDmvlNotifyDialog]);

  const handleDmvlNotifyConfirm = useCallback(async (
    notify: IBanHanhNotifyDraft,
    mainDocumentId?: number
  ): Promise<boolean> => {
    if (!dmvlDetail) {
      setDmvlErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsDmvlPublishing(true);
    setDmvlErrorMessage(undefined);

    const logContext: IPhvbLogContext = {
      flowRunId: createFlowRunId(),
      screenName: dmvlFlowMode === 'resume' ? 'PhvbMagDetail' : 'PhvbMagDmvlNotifyDialog',
      actionName: dmvlFlowMode === 'resume' ? 'Dmvl_Resume_Publish' : 'Dmvl_Publish',
      userEmail: documentContext.userEmail,
      itemId: dmvlDetail.release.IdYeuCau
    };

    try {
      await runBusy('Đang ban hành...', async () => {
        await phvbBanHanhService.publishDmvlBanHanh(
          documentContext,
          dmvlDetail,
          notify,
          { mainDocumentId },
          logContext,
          roles
        );
      });

      phvbDocumentsService.invalidateTabCountsCache();
      resetDmvlFlow();
      onPublished?.();
      return true;
    } catch (error) {
      setDmvlErrorMessage(phvbBanHanhService.getPublishRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsDmvlPublishing(false);
    }
  }, [dmvlDetail, dmvlFlowMode, documentContext, onPublished, resetDmvlFlow, roles, runBusy]);

  return {
    isDmvlSaving,
    isDmvlPublishing,
    isDmvlNotifyLoading,
    dmvlNotifyDraft,
    dmvlDetail,
    dmvlErrorMessage,
    isDmvlNotifyOpen,
    handleDmvlBanHanh,
    handleResumeDmvlBanHanh,
    handleDmvlNotifyCancel,
    handleDmvlNotifyConfirm,
    resetDmvlFlow
  };
}
