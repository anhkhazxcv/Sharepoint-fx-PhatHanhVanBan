import { useCallback, useEffect, useState } from 'react';
import type { DetailRefreshScope, IPhvbSiteContext, IRequestDetailData } from '../models/PhvbMag.models';
import { phvbDetailService } from '../services/PhvbMagDetail.service';

interface IUsePhvbRequestDetailResult {
  data?: IRequestDetailData;
  isLoading: boolean;
  errorMessage?: string;
  refetch: (scope?: DetailRefreshScope | ReadonlyArray<DetailRefreshScope>) => void;
}

function normalizeRefreshScopes(
  scope?: DetailRefreshScope | ReadonlyArray<DetailRefreshScope>
): DetailRefreshScope[] {
  if (!scope) {
    return ['full'];
  }

  return Array.isArray(scope) ? scope.slice() : [scope];
}

export function usePhvbRequestDetail(
  siteContext: IPhvbSiteContext,
  idYeuCau?: string
): IUsePhvbRequestDetailResult {
  const [data, setData] = useState<IRequestDetailData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [reloadRequest, setReloadRequest] = useState<{ token: number; scopes: DetailRefreshScope[] }>({
    token: 0,
    scopes: ['full']
  });

  const refetch = useCallback((scope?: DetailRefreshScope | ReadonlyArray<DetailRefreshScope>): void => {
    setReloadRequest(previous => ({
      token: previous.token + 1,
      scopes: normalizeRefreshScopes(scope)
    }));
  }, []);

  useEffect(() => {
    if (!idYeuCau || !idYeuCau.trim()) {
      setData(undefined);
      setErrorMessage(undefined);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const normalizedId = idYeuCau.trim();
    const scopes = reloadRequest.scopes;
    const isFullReload = scopes.length === 0 || scopes.indexOf('full') > -1;

    const loadDetail = async (): Promise<void> => {
      if (isFullReload) {
        setIsLoading(true);
      }

      setErrorMessage(undefined);

      try {
        if (isFullReload) {
          const result = await phvbDetailService.loadRequestDetail(siteContext, normalizedId);

          if (!isMounted) {
            return;
          }

          if (!result) {
            setData(undefined);
            setErrorMessage('Không tìm thấy yêu cầu với mã đã chọn.');
            return;
          }

          setData(result);
          return;
        }

        const partial = await phvbDetailService.loadRequestDetailPartial(siteContext, normalizedId, scopes);

        if (!isMounted) {
          return;
        }

        setData(previous => {
          if (!previous) {
            if (!partial.release) {
              return undefined;
            }

            return {
              release: partial.release,
              attachments: partial.attachments || [],
              history: partial.history || [],
              comments: partial.comments || [],
              workflowParticipants: partial.workflowParticipants || []
            };
          }

          return {
            ...previous,
            ...partial
          };
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isFullReload) {
          setData(undefined);
        }

        setErrorMessage(phvbDetailService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted && isFullReload) {
          setIsLoading(false);
        }
      }
    };

    loadDetail().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext, idYeuCau, reloadRequest]);

  return {
    data,
    isLoading,
    errorMessage,
    refetch
  };
}
