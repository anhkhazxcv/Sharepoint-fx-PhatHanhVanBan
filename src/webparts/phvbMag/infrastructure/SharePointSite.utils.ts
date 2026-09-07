import { SPHttpClient } from '@microsoft/sp-http';
import type { IPhvbSiteContext } from '../models/PhvbMag.models';
import type { SharePointDateFieldOrder } from '../utils/PhvbMagDateTime.utils';

export function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export function getCandidateSiteUrls(context: Pick<IPhvbSiteContext, 'sourceSiteUrl' | 'currentWebUrl' | 'siteCollectionUrl'>): string[] {
  return context.sourceSiteUrl && context.sourceSiteUrl.trim()
    ? [normalizeSiteUrl(context.sourceSiteUrl)]
    : [];
}

export function getSiteOrigin(siteUrl: string): string {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return siteUrl.split('/sites/')[0] || siteUrl;
  }
}

const US_LOCALE_ID = 1033;
const dateFieldOrderCache = new Map<string, SharePointDateFieldOrder>();

/**
 * ValidateUpdateListItem parses date FieldValues using the target site's regional
 * settings, which differ per site collection (e.g. root site vs /sites/test can each
 * have a different Locale). Resolve and cache the actual order per site instead of
 * assuming en-US everywhere — a mismatch throws "Enter a date like this: ..." errors.
 */
export async function resolveSiteDateFieldOrder(
  siteUrl: string,
  spHttpClient: SPHttpClient
): Promise<SharePointDateFieldOrder> {
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const cached = dateFieldOrderCache.get(normalizedSiteUrl);

  if (cached) {
    return cached;
  }

  try {
    const requestUrl = `${normalizedSiteUrl}/_api/web/regionalsettings?$select=LocaleId`;
    const response = await spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);

    if (response.ok) {
      const data = await response.json() as { LocaleId?: number };
      const order: SharePointDateFieldOrder = data.LocaleId === US_LOCALE_ID ? 'MDY' : 'DMY';
      dateFieldOrderCache.set(normalizedSiteUrl, order);
      return order;
    }
  } catch {
    // Không xác định được locale của site — dùng mặc định bên dưới.
  }

  return 'MDY';
}

export async function resolveDateFieldOrderForContext(
  context: Pick<IPhvbSiteContext, 'sourceSiteUrl' | 'currentWebUrl' | 'siteCollectionUrl' | 'spHttpClient'>
): Promise<SharePointDateFieldOrder> {
  const [siteUrl] = getCandidateSiteUrls(context);

  if (!siteUrl) {
    return 'MDY';
  }

  return resolveSiteDateFieldOrder(siteUrl, context.spHttpClient);
}

export const DEFAULT_LIST_PAGE_SIZE = 100;
export const MAX_LIST_FETCH_TOP = 5000;
