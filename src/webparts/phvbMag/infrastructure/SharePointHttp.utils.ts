import { SPHttpClientResponse } from '@microsoft/sp-http';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import { SharePointRequestError } from '../services/PhvbMag.error';
import { phvbLogService, type IApiLogParams } from '../services/PhvbMagLog.service';
import { getCandidateSiteUrls } from './SharePointSite.utils';

export type { IApiLogParams };

export async function ensureSharePointResponseOk(
  response: SPHttpClientResponse,
  requestUrl: string,
  apiLogParams?: IApiLogParams
): Promise<SPHttpClientResponse> {
  if (!response.ok) {
    const details = await response.text();
    const error = new SharePointRequestError(
      `SharePoint request failed with status ${response.status}`,
      response.status,
      requestUrl,
      details
    );

    if (apiLogParams) {
      phvbLogService.logApiError(
        {
          ...apiLogParams,
          requestUrl,
          requestPayload: apiLogParams.requestPayload || apiLogParams.requestUrl || requestUrl
        },
        error
      );
    }

    throw error;
  }

  return response;
}

export async function tryAcrossCandidateSites<T>(
  context: Pick<IPhvbSiteContext, 'sourceSiteUrl' | 'currentWebUrl' | 'siteCollectionUrl'>,
  runner: (siteUrl: string) => Promise<T>,
  fallbackMessage = 'Unable to resolve SharePoint data source.'
): Promise<T> {
  const candidates = getCandidateSiteUrls(context);
  let lastError: unknown = null;

  if (candidates.length === 0) {
    throw new Error('Missing SharePoint site context.');
  }

  for (let index = 0; index < candidates.length; index += 1) {
    try {
      return await runner(candidates[index]);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(fallbackMessage);
}
