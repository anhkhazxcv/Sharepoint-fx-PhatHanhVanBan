import type { IPhvbSiteContext } from '../models/PhvbMag.models';

export function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

export function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

export function getCandidateSiteUrls(context: Pick<IPhvbSiteContext, 'sourceSiteUrl' | 'currentWebUrl' | 'siteCollectionUrl'>): string[] {
  const candidates = [context.sourceSiteUrl, context.currentWebUrl, context.siteCollectionUrl]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map(normalizeSiteUrl);

  const unique: string[] = [];
  candidates.forEach(candidate => {
    if (unique.indexOf(candidate) === -1) {
      unique.push(candidate);
    }
  });

  return unique;
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
