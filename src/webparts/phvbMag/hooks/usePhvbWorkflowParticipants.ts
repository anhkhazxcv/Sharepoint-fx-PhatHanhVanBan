import { useCallback, useMemo, useState } from 'react';
import { phvbWorkflowParticipantService } from '../services/PhvbMagWorkflowParticipant.service';
import {
  canOpenWorkflowParticipantModal,
  collectParticipantChanges,
  IWorkflowParticipantChanges,
  IWorkflowParticipantsByStage
} from '../utils/PhvbMagWorkflowParticipant.utils';
import type { IPhvbDirectoryUser, IPhvbSiteContext, IRequestDetailData } from '../models/PhvbMag.models';

interface IUsePhvbWorkflowParticipantsOptions {
  documentContext: IPhvbSiteContext;
  detail?: IRequestDetailData;
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>;
  onCompleted?: () => void;
}

interface IUsePhvbWorkflowParticipantsResult {
  canOpen: boolean;
  isSaving: boolean;
  errorMessage?: string;
  saveChanges: (
    initialDraft: IWorkflowParticipantsByStage,
    currentDraft: IWorkflowParticipantsByStage
  ) => Promise<boolean>;
}

export function usePhvbWorkflowParticipants(
  options: IUsePhvbWorkflowParticipantsOptions
): IUsePhvbWorkflowParticipantsResult {
  const { documentContext, detail, directoryUsers, onCompleted } = options;
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const canOpen = useMemo(() => {
    if (!detail) {
      return false;
    }

    return canOpenWorkflowParticipantModal(detail.release);
  }, [detail]);

  const saveChanges = useCallback(async (
    initialDraft: IWorkflowParticipantsByStage,
    currentDraft: IWorkflowParticipantsByStage
  ): Promise<boolean> => {
    if (!detail) {
      setErrorMessage('Chưa tải được dữ liệu chi tiết yêu cầu.');
      return false;
    }

    const changes: IWorkflowParticipantChanges = collectParticipantChanges(initialDraft, currentDraft);
    const hasChanges =
      changes.gopy.addedEmails.length > 0 ||
      changes.gopy.removedParticipantIds.length > 0 ||
      changes.thamdinh.addedEmails.length > 0 ||
      changes.thamdinh.removedParticipantIds.length > 0 ||
      changes.pheduyet.addedEmails.length > 0 ||
      changes.pheduyet.removedParticipantIds.length > 0;

    if (!hasChanges) {
      return true;
    }

    setIsSaving(true);
    setErrorMessage(undefined);

    try {
      await phvbWorkflowParticipantService.applyParticipantChanges({
        ...documentContext,
        detail,
        directoryUsers,
        changes,
        finalDraft: currentDraft
      });

      if (onCompleted) {
        onCompleted();
      }

      return true;
    } catch (error) {
      setErrorMessage(phvbWorkflowParticipantService.getRuntimeErrorMessage(error));
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [detail, documentContext, directoryUsers, onCompleted]);

  return {
    canOpen,
    isSaving,
    errorMessage,
    saveChanges
  };
}
