import { useCallback, useMemo, useState } from 'react';
import { phvbWorkflowActionService, type IWorkflowActionInput } from '../services/PhvbMagWorkflowAction.service';
import type { IPhvbDocumentContext, IRequestDetailData } from '../models/PhvbMag.models';
import {
  resolveWorkflowActionContext,
  type WorkflowActionKey
} from '../utils/PhvbMagWorkflowPermission.utils';

interface IUsePhvbWorkflowActionsOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  onCompleted?: () => void;
}

interface IUsePhvbWorkflowActionsResult {
  actionContext: ReturnType<typeof resolveWorkflowActionContext> | undefined;
  isProcessing: boolean;
  errorMessage?: string;
  runAction: (action: WorkflowActionKey, comment?: string) => Promise<boolean>;
}

export function usePhvbWorkflowActions(options: IUsePhvbWorkflowActionsOptions): IUsePhvbWorkflowActionsResult {
  const { documentContext, detail, onCompleted } = options;
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const actionContext = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return resolveWorkflowActionContext(detail, documentContext.userEmail);
  }, [detail, documentContext.userEmail]);

  const runAction = useCallback(async (action: WorkflowActionKey, comment?: string): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsProcessing(true);
    setErrorMessage(undefined);

    const input: IWorkflowActionInput = {
      action,
      comment
    };

    try {
      await phvbWorkflowActionService.executeAction({
        ...documentContext,
        detail,
        input
      });

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbWorkflowActionService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [detail, documentContext, onCompleted]);

  return {
    actionContext,
    isProcessing,
    errorMessage,
    runAction
  };
}
