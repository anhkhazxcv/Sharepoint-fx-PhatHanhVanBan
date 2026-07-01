import { useEffect, useState } from 'react';
import type { IDraftEditData } from '../services/PhvbMagDraftEdit.service';
import { phvbDraftEditService } from '../services/PhvbMagDraftEdit.service';
import type { IPhvbDirectoryUser, IPhvbSiteContext } from '../models/PhvbMag.models';

interface IUsePhvbDraftEditResult {
  draftEdit?: IDraftEditData;
  isLoading: boolean;
  errorMessage?: string;
}

export function usePhvbDraftEdit(
  siteContext: IPhvbSiteContext,
  editIdYeuCau: string | undefined,
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>
): IUsePhvbDraftEditResult {
  const [draftEdit, setDraftEdit] = useState<IDraftEditData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!editIdYeuCau || !editIdYeuCau.trim()) {
      setDraftEdit(undefined);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadDraft = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const result = await phvbDraftEditService.loadDraftForEdit(
          siteContext,
          editIdYeuCau.trim(),
          directoryUsers
        );

        if (!isMounted) {
          return;
        }

        if (!result) {
          setDraftEdit(undefined);
          setErrorMessage('Không tìm thấy bản nháp hoặc yêu cầu không còn ở trạng thái Bản nháp.');
          return;
        }

        setDraftEdit(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDraftEdit(undefined);
        setErrorMessage(phvbDraftEditService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDraft().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext, editIdYeuCau, directoryUsers]);

  return {
    draftEdit,
    isLoading,
    errorMessage
  };
}
