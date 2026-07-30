import { useEffect, useState } from 'react';
import { GUIDE_PDF_URL_LABEL, hasSharePointSiteContext } from '../config/PhvbMag.configuration';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbBanHanhConfigService } from '../services/PhvbMagBanHanhConfig.service';
import { getLabelValue } from '../utils/PhvbMagBanHanhNotify.utils';
import { resolveGuidePdfUrl } from '../utils/PhvbMagGuide.utils';

interface IUsePhvbGuideResult {
  isLoading: boolean;
  errorMessage?: string;
  pdfUrl?: string;
}

export function usePhvbGuide(siteContext: IPhvbSiteContext): IUsePhvbGuideResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    if (!hasSharePointSiteContext(siteContext)) {
      setIsLoading(false);
      setPdfUrl(undefined);
      setErrorMessage(SITE_CONTEXT_ERROR_MESSAGE);
      return () => {
        isMounted = false;
      };
    }

    const loadGuideUrl = async (): Promise<void> => {
      setIsLoading(true);

      try {
        const labelConfig = await phvbBanHanhConfigService.loadLabelCustomConfig(siteContext);
        const rawUrl = getLabelValue(labelConfig, GUIDE_PDF_URL_LABEL);
        const resolvedUrl = resolveGuidePdfUrl(rawUrl);

        if (!isMounted) {
          return;
        }

        if (!resolvedUrl) {
          setPdfUrl(undefined);
          setErrorMessage(
            rawUrl
              ? `URL cấu hình "${GUIDE_PDF_URL_LABEL}" không hợp lệ (chỉ chấp nhận http/https).`
              : `Chưa cấu hình ${GUIDE_PDF_URL_LABEL} trong lstConfigLabelCustom.`
          );
          return;
        }

        setPdfUrl(resolvedUrl);
        setErrorMessage(undefined);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setPdfUrl(undefined);
        setErrorMessage(phvbBanHanhConfigService.getRuntimeErrorMessage(error));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadGuideUrl().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [siteContext]);

  return {
    isLoading,
    errorMessage,
    pdfUrl
  };
}
