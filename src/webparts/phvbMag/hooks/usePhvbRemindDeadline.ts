import { useCallback, useMemo, useState } from 'react';
import { phvbRemindDeadlineService } from '../services/PhvbMagRemindDeadline.service';
import { createFlowRunId } from '../services/PhvbMagLog.service';
import { resolveRemindDeadlineContext } from '../utils/PhvbMagRemindDeadline.utils';
import type {
  IPhvbDirectoryUser,
  IPhvbDocumentContext,
  IPhvbLogContext,
  IPhvbRoleEntry,
  IRequestDetailData
} from '../models/PhvbMag.models';
import type { IRemindDeadlineContext } from '../utils/PhvbMagRemindDeadline.utils';

interface IUsePhvbRemindDeadlineOptions {
  documentContext: IPhvbDocumentContext;
  detail?: IRequestDetailData;
  roles: ReadonlyArray<IPhvbRoleEntry>;
  tenantUsers?: ReadonlyArray<IPhvbDirectoryUser>;
  onCompleted?: () => void;
}

interface IUsePhvbRemindDeadlineResult {
  canRemind: boolean;
  remindContext?: IRemindDeadlineContext;
  isSending: boolean;
  errorMessage?: string;
  sendReminders: (selectedRecipientIds: ReadonlyArray<string>) => Promise<boolean>;
}

export function usePhvbRemindDeadline(options: IUsePhvbRemindDeadlineOptions): IUsePhvbRemindDeadlineResult {
  const { documentContext, detail, roles, tenantUsers, onCompleted } = options;
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const remindContext = useMemo(() => {
    if (!detail) {
      return undefined;
    }

    return resolveRemindDeadlineContext(detail, roles, tenantUsers);
  }, [detail, roles, tenantUsers]);

  const canRemind = useMemo(() => {
    if (!detail) {
      return false;
    }

    return phvbRemindDeadlineService.canRemind(detail, documentContext.userEmail, roles, tenantUsers);
  }, [detail, documentContext.userEmail, roles, tenantUsers]);

  const sendReminders = useCallback(async (selectedRecipientIds: ReadonlyArray<string>): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    setIsSending(true);
    setErrorMessage(undefined);

    try {
      const logContext: IPhvbLogContext = {
        flowRunId: createFlowRunId(),
        screenName: 'PhvbMagDetail',
        actionName: 'RemindDeadline',
        userEmail: documentContext.userEmail,
        itemId: detail.release.IdYeuCau || detail.release.Id
      };

      await phvbRemindDeadlineService.sendReminders({
        ...documentContext,
        detail,
        roles,
        tenantUsers,
        selectedRecipientIds,
        logContext
      });

      onCompleted?.();
      return true;
    } catch (error) {
      setErrorMessage(phvbRemindDeadlineService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSending(false);
    }
  }, [detail, documentContext, roles, tenantUsers, onCompleted]);

  return {
    canRemind,
    remindContext,
    isSending,
    errorMessage,
    sendReminders
  };
}
