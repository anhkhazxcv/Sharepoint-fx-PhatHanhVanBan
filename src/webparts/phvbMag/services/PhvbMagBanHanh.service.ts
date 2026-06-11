import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ISSUANCE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { SharePointRequestError } from './PhvbMag.error';
import type { IBanHanhLibraryItem, IPhvbSiteContext } from '../models/PhvbMag.models';

interface ISharePointLibraryItem {
  Id: number;
  Title?: string;
  FileLeafRef?: string;
  FileDirRef?: string;
  FSObjType?: number;
  FileRef?: string;
  TomTatVanban?: string;
  NgayPhatHanh?: string;
  HieuLucTu?: string;
  LienHe?: string;
}

const LIBRARY_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'FileLeafRef',
  'FileDirRef',
  'FSObjType',
  'FileRef',
  'TomTatVanban',
  'NgayPhatHanh',
  'HieuLucTu',
  'LienHe'
];

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getSiteOrigin(siteUrl: string): string {
  try {
    return new URL(siteUrl).origin;
  } catch {
    return siteUrl.split('/sites/')[0] || siteUrl;
  }
}

function getCandidateSiteUrls(options: IPhvbSiteContext): string[] {
  const candidates = [options.sourceSiteUrl, options.currentWebUrl, options.siteCollectionUrl]
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

function getLibraryItemsEndpoint(siteUrl: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ISSUANCE_LIBRARY_TITLE)}')/items`;
}

function buildLibraryQuery(): string {
  const queryParts = [
    `$select=${LIBRARY_SELECT_FIELDS.join(',')}`,
    '$top=5000',
    '$orderby=FileDirRef,FileLeafRef'
  ];

  return queryParts.join('&');
}

async function ensureOk(response: SPHttpClientResponse, requestUrl: string): Promise<SPHttpClientResponse> {
  if (!response.ok) {
    const details = await response.text();
    throw new SharePointRequestError(
      `SharePoint request failed with status ${response.status}`,
      response.status,
      requestUrl,
      details
    );
  }

  return response;
}

function mapLibraryItem(item: ISharePointLibraryItem, siteUrl: string): IBanHanhLibraryItem {
  const fileRef = item.FileRef || '';
  const origin = getSiteOrigin(siteUrl);

  return {
    id: item.Id,
    name: item.FileLeafRef || item.Title || '',
    fileDirRef: item.FileDirRef || '',
    fsObjType: item.FSObjType || 0,
    fileRef,
    tomTatVanban: item.TomTatVanban,
    ngayPhatHanh: item.NgayPhatHanh,
    hieuLucTu: item.HieuLucTu,
    lienHe: item.LienHe,
    fileUrl: fileRef ? `${origin}${fileRef}` : ''
  };
}

export class PhvbBanHanhService {
  public async loadLibraryItems(context: IPhvbSiteContext): Promise<IBanHanhLibraryItem[]> {
    const candidates = getCandidateSiteUrls(context);
    let lastError: unknown = null;

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        const requestUrl = `${getLibraryItemsEndpoint(siteUrl)}?${buildLibraryQuery()}`;
        const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
        await ensureOk(response, requestUrl);
        const data = await response.json() as { value?: ISharePointLibraryItem[] };
        const items = data.value || [];

        return items.map(item => mapLibraryItem(item, siteUrl));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to load issuance library items.');
  }
}

export const phvbBanHanhService = new PhvbBanHanhService();
