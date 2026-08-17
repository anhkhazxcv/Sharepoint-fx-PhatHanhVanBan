import { useEffect, useState } from 'react';
import type { IDuplicateRequestData } from '../services/PhvbMagDraftEdit.service';
import { phvbDraftEditService } from '../services/PhvbMagDraftEdit.service';
import type { IPhvbDirectoryUser, IPhvbSiteContext } from '../models/PhvbMag.models';

interface IUsePhvbDuplicateRequestResult {
  duplicateRequest?: IDuplicateRequestData;
  isLoading: boolean;
  errorMessage?: string;
}

export function usePhvbDuplicateRequest(
  siteContext: IPhvbSiteContext,
  duplicateIdYeuCau: string | undefined,
  directoryUsers: ReadonlyArray<IPhvbDirectoryUser>
): IUsePhvbDuplicateRequestResult {
  const [duplicateRequest, setDuplicateRequest] = useState<IDuplicateRequestData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!duplicateIdYeuCau || !duplicateIdYeuCau.trim()) {
      setDuplicateRequest(undefined);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadDuplicateSource = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const result = await phvbDraftEditService.loadReleaseForDuplicate(
          siteContext,
          duplicateIdYeuCau.trim(),
          directoryUsers
        );

        if (!isMounted) {
          return;
        }

        if (!result) {
          setDuplicateRequest(undefined);
          setErrorMessage('Không tìm thấy yêu cầu nguồn hoặc yêu cầu đang ở trạng thái Bản nháp.');
          return;
        }

        setDuplicateRequest(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setDuplicateRequest(undefined);
        setErrorMessage(phvbDraftEditService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDuplicateSource().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext, duplicateIdYeuCau, directoryUsers]);

  return {
    duplicateRequest,
    isLoading,
    errorMessage
  };
}
