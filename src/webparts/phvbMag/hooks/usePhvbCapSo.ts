import { useCallback, useMemo, useState } from 'react';
import { phvbCapSoService } from '../services/PhvbMagCapSo.service';
import { canAssignDocumentNumber } from '../utils/PhvbMagCapSo.utils';
import type { IPhvbDocumentContext, IRequestDetailData } from '../models/PhvbMag.models';

interface IUsePhvbCapSoOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  onCompleted?: () => void;
}

interface IUsePhvbCapSoResult {
  canAssign: boolean;
  isSaving: boolean;
  errorMessage?: string;
  assignNumber: (soVanBan: string) => Promise<boolean>;
}

export function usePhvbCapSo(options: IUsePhvbCapSoOptions): IUsePhvbCapSoResult {
  const { documentContext, detail, onCompleted } = options;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canAssign = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canAssignDocumentNumber(detail.release);
  }, [detail]);

  const assignNumber = useCallback(async (soVanBan: string): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await phvbCapSoService.assignDocumentNumber(documentContext, detail, soVanBan);

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
