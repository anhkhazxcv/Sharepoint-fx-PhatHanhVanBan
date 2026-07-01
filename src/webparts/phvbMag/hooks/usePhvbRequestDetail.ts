import { useCallback, useEffect, useState } from 'react';
import type { IPhvbSiteContext, IRequestDetailData } from '../models/PhvbMag.models';
import { phvbDetailService } from '../services/PhvbMagDetail.service';

interface IUsePhvbRequestDetailResult {
  data?: IRequestDetailData;
  isLoading: boolean;
  errorMessage?: string;
  refetch: () => void;
}

export function usePhvbRequestDetail(
  siteContext: IPhvbSiteContext,
  idYeuCau?: string
): IUsePhvbRequestDetailResult {
  const [data, setData] = useState<IRequestDetailData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const refetch = useCallback((): void => {
    setReloadToken(previous => previous + 1);
  }, []);

  useEffect(() => {
    if (!idYeuCau || !idYeuCau.trim()) {
      setData(undefined);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadDetail = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(undefined);

      try {
        const result = await phvbDetailService.loadRequestDetail(siteContext, idYeuCau.trim());

        if (!isMounted) {
          return;
        }

        if (!result) {
          setData(undefined);
          setErrorMessage('Không tìm thấy yêu cầu với mã đã chọn.');
          return;
        }

        setData(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setData(undefined);
        setErrorMessage(phvbDetailService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDetail().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext, idYeuCau, reloadToken]);

  return {
    data,
    isLoading,
    errorMessage,
    refetch
  };
}
