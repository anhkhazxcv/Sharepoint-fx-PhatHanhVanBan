import { SHORT_URL_API_KEY_LABEL } from '../config/PhvbMag.configuration';
import { getSiteOrigin } from '../infrastructure/SharePointSite.utils';
import type { ILabelCustomConfigItem } from '../models/PhvbMag.models';
import { getLabelValue } from './PhvbMagBanHanhNotify.utils';

export type ShortUrlApiKeySource = 'fromConfig' | 'missing';

export function resolveShortUrlApiKey(
  labelConfig: ReadonlyArray<ILabelCustomConfigItem>
): { apiKey: string; source: ShortUrlApiKeySource } {
  const fromConfig = getLabelValue(labelConfig, SHORT_URL_API_KEY_LABEL).trim();

  if (fromConfig) {
    return {
      apiKey: fromConfig,
      source: 'fromConfig'
    };
  }

  return {
    apiKey: '',
    source: 'missing'
  };
}


export function buildDirectFileUrl(siteUrl: string, serverRelativePath: string): string {
  const origin = getSiteOrigin(siteUrl);
  const normalizedPath = (serverRelativePath || '').trim();

  if (!origin || !normalizedPath) {
    return '';
  }

  const pathWithLeadingSlash = `/${normalizedPath.replace(/^\/+/, '')}`;
  const encodedPath = pathWithLeadingSlash
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  return `${origin}${encodedPath}?web=1`;
}
