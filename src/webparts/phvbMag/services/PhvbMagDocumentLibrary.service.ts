import { SPHttpClient } from '@microsoft/sp-http';
import { ISSUANCE_LIBRARY_TITLE, TEMPLATE_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { ensureSharePointResponseOk, tryAcrossCandidateSites } from '../infrastructure/SharePointHttp.utils';
import { escapeODataValue, getSiteOrigin, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import type { IBanHanhLibraryItem, IPhvbSiteContext, ITemplateLibraryItem } from '../models/PhvbMag.models';

interface ISharePointDocumentLibraryItem {
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

interface IDocumentLibraryQueryOptions {
  selectFields: ReadonlyArray<string>;
  filter?: string;
  top?: number;
  orderBy?: string;
}

const BAN_HANH_SELECT_FIELDS: ReadonlyArray<string> = [
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

const TEMPLATE_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'FileLeafRef',
  'FSObjType',
  'FileRef'
];

function getLibraryItemsEndpoint(siteUrl: string, libraryTitle: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(libraryTitle)}')/items`;
}

function buildLibraryItemsQuery(options: IDocumentLibraryQueryOptions): string {
  const queryParts = [`$select=${options.selectFields.join(',')}`];

  if (options.filter) {
    queryParts.push(`$filter=${options.filter}`);
  }

  queryParts.push(`$top=${options.top || 500}`);

  if (options.orderBy) {
    queryParts.push(`$orderby=${options.orderBy}`);
  }

  return queryParts.join('&');
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.substring(lastDotIndex).toLowerCase();
}

function mapBanHanhLibraryItem(item: ISharePointDocumentLibraryItem, siteUrl: string): IBanHanhLibraryItem {
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

function mapTemplateLibraryItem(item: ISharePointDocumentLibraryItem, siteUrl: string): ITemplateLibraryItem {
  const name = item.FileLeafRef || item.Title || '';
  const fileRef = item.FileRef || '';
  const origin = getSiteOrigin(siteUrl);

  return {
    id: item.Id,
    name,
    fileExtension: getFileExtension(name),
    fileUrl: fileRef ? `${origin}${fileRef}` : ''
  };
}

async function loadDocumentLibraryItems<TItem>(
  context: IPhvbSiteContext,
  libraryTitle: string,
  options: IDocumentLibraryQueryOptions,
  mapItem: (item: ISharePointDocumentLibraryItem, siteUrl: string) => TItem,
  fallbackMessage: string
): Promise<TItem[]> {
  return tryAcrossCandidateSites(context, async (siteUrl: string) => {
    const requestUrl = `${getLibraryItemsEndpoint(siteUrl, libraryTitle)}?${buildLibraryItemsQuery(options)}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureSharePointResponseOk(response, requestUrl);
    const data = await response.json() as { value?: ISharePointDocumentLibraryItem[] };
    const items = data.value || [];

    return items.map(item => mapItem(item, siteUrl));
  }, fallbackMessage);
}

export class PhvbDocumentLibraryService {
  public loadBanHanhLibraryItems(context: IPhvbSiteContext): Promise<IBanHanhLibraryItem[]> {
    return loadDocumentLibraryItems(
      context,
      ISSUANCE_LIBRARY_TITLE,
      {
        selectFields: BAN_HANH_SELECT_FIELDS,
        top: 5000,
        orderBy: 'FileDirRef,FileLeafRef'
      },
      mapBanHanhLibraryItem,
      'Unable to load issuance library items.'
    );
  }

  public loadTemplateItems(context: IPhvbSiteContext): Promise<ITemplateLibraryItem[]> {
    return loadDocumentLibraryItems(
      context,
      TEMPLATE_LIBRARY_TITLE,
      {
        selectFields: TEMPLATE_SELECT_FIELDS,
        filter: 'FSObjType eq 0',
        top: 500,
        orderBy: 'FileLeafRef'
      },
      mapTemplateLibraryItem,
      'Unable to load template library items.'
    ).then(items => items.filter(item => item.name && item.fileUrl));
  }
}

export const phvbDocumentLibraryService = new PhvbDocumentLibraryService();
