import { useCallback, useMemo, useState } from 'react';
import { phvbWorkflowTransitionService } from '../services/PhvbMagWorkflowTransition.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import type { IPhvbDocumentContext, IPhvbLogContext, IPhvbRoleEntry, IRequestDetailData } from '../models/PhvbMag.models';
import {
  resolveWorkflowTransitionContext,
  type IWorkflowTransitionContext
} from '../utils/PhvbMagWorkflowPermission.utils';
import { usePhvbBusy } from '../context/PhvbMagBusy.context';

interface IUsePhvbWorkflowTransitionOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  onCompleted?: () => void;
}

interface IUsePhvbWorkflowTransitionResult {
  transitionContext?: IWorkflowTransitionContext;
  isProcessing: boolean;
  errorMessage?: string;
  runTransition: () => Promise<boolean>;
}

function buildTransitionLogContext(
  documentContext: IPhvbDocumentContext,
  detail: IRequestDetailData
): IPhvbLogContext {
  return {
    flowRunId: createFlowRunId(),
    screenName: 'PhvbMagDetail',
    actionName: 'Workflow_AdvanceStage',
    userEmail: documentContext.userEmail,
    itemId: detail.release.IdYeuCau || detail.release.Id
  };
}

export function usePhvbWorkflowTransition(
  options: IUsePhvbWorkflowTransitionOptions
): IUsePhvbWorkflowTransitionResult {
  const { documentContext, detail, roles, onCompleted } = options;
  const { runBusy } = usePhvbBusy();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const transitionContext = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return resolveWorkflowTransitionContext(detail, roles, documentContext.userEmail);
  }, [detail, roles, documentContext.userEmail]);

  const runTransition = useCallback(async (): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsProcessing(true);
    setErrorMessage(undefined);

    try {
      await runBusy('Đang chuyển giai đoạn...', async () => {
        await phvbWorkflowTransitionService.executeTransition({
          ...documentContext,
          detail,
          roles,
          logContext: buildTransitionLogContext(documentContext, detail)
        });
      });

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbWorkflowTransitionService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [detail, documentContext, roles, onCompleted, runBusy]);

  return {
    transitionContext,
    isProcessing,
    errorMessage,
    runTransition
  };
}
