import { useCallback, useMemo, useState } from 'react';
import { phvbCapSoService } from '../services/PhvbMagCapSo.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { canAssignDocumentNumber } from '../utils/PhvbMagCapSo.utils';
import type { IPhvbDocumentContext, IPhvbLogContext, IRequestDetailData } from '../models/PhvbMag.models';

interface IUsePhvbCapSoOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  hasDcRole?: boolean;
  onCompleted?: () => void;
}

interface IUsePhvbCapSoResult {
  canAssign: boolean;
  isSaving: boolean;
  errorMessage?: string;
  assignNumber: (soVanBan: string) => Promise<boolean>;
}

export function usePhvbCapSo(options: IUsePhvbCapSoOptions): IUsePhvbCapSoResult {
  const { documentContext, detail, hasDcRole = false, onCompleted } = options;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canAssign = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canAssignDocumentNumber(detail.release) && hasDcRole;
  }, [detail, hasDcRole]);

  const assignNumber = useCallback(async (soVanBan: string): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagCapSo',
        actionName: 'CapSo_AssignNumber',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbCapSoService.assignDocumentNumber(documentContext, detail, soVanBan, logContext);

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbCapSoService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, documentContext, onCompleted]);

  return {
    canAssign,
    isSaving,
    errorMessage,
    assignNumber
  };
}
