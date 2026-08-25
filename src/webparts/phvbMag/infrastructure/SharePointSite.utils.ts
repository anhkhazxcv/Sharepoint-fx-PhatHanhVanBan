import type { IPhvbSiteContext } from '../models/PhvbMag.models';

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

export const DEFAULT_LIST_PAGE_SIZE = 100;
export const MAX_LIST_FETCH_TOP = 5000;
