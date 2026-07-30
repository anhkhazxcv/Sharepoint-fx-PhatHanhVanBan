import { SPHttpClient } from '@microsoft/sp-http';
import {
  ATTACHMENT_FORM_SUBFOLDER,
  LIBRARY_CACHE_STALE_MS,
  LIBRARY_FILES_PAGE_SIZE,
  LIBRARY_SEARCH_PAGE_SIZE,
  MOST_VIEWED_LIMIT,
  RECENT_PUBLISHED_FILE_BATCH_TOP,
  RECENT_PUBLISHED_FOLDER_TOP,
  resolveIssuanceLibraryTitle,
  TEMPLATE_LIBRARY_TITLE
} from '../config/PhvbMag.configuration';
import { ensureSharePointResponseOk, tryAcrossCandidateSites } from '../infrastructure/SharePointHttp.utils';
import {
  buildSharePointFileDownloadUrl,
  buildSharePointFileOpenUrl
} from '../infrastructure/SharePointFile.utils';
import { escapeODataValue, getSiteOrigin, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { buildApiLogParams } from '../services/PhvbMagLog.service';
import {
  buildLibrarySearchAbsolutePath,
  buildLibrarySearchKql,
  escapeKqlText,
  resolveLibraryDocumentEffectiveStatus
} from '../utils/PhvbMagLibrary.utils';
import { buildLibraryFolderChildrenIndex } from '../utils/PhvbMagBanHanh.tree';
import {
  getRecentPublishedStartDate,
  isExpiredArchivePath,
  isRecentPublishedFolderCandidate,
  toODataDateTimeLiteral
} from '../utils/PhvbMagRecentPublished.utils';
import type {
  IBanHanhLibraryItem,
  ILibraryPagedFilesResult,
  ILibrarySearchPageResult,
  IPhvbSiteContext,
  IRecentPublishedFolder,
  ITemplateLibraryItem
} from '../models/PhvbMag.models';

interface ISharePointBasePermissions {
  High?: number | string;
  Low?: number | string;
}

interface ISharePointDocumentLibraryItem {
  Id: number;
  Title?: string;
  FileLeafRef?: string;
  FileDirRef?: string;
  FSObjType?: number;
  FileRef?: string;
  UniqueId?: string;
  TomTatVanban?: string;
  NgayPhatHanh?: string;
  HieuLucTu?: string;
  HieuLucDen?: string;
  LienHe?: string;
  EffectiveBasePermissions?: ISharePointBasePermissions;
}

interface ISharePointFileApiItem {
  Name?: string;
  ServerRelativeUrl?: string;
  UniqueId?: string;
  ListItemAllFields?: ISharePointDocumentLibraryItem;
}

interface ISearchResultCell {
  Key?: string;
  Value?: string;
}

interface ISharePointSearchRequest {
  Querytext: string;
  RowLimit: number;
  StartRow?: number;
  SelectProperties: string[];
  TrimDuplicates: boolean;
  SortList?: Array<{
    Property: string;
    Direction: number;
  }>;
}

interface ISharePointSearchPostBody {
  request: ISharePointSearchRequest;
}

interface ISharePointSearchQueryResult {
  PrimaryQueryResult?: {
    RelevantResults?: {
      TotalRows?: number;
      Table?: {
        Rows?: Array<{
          Cells?: ISearchResultCell[];
        }>;
      };
    };
  };
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
  'HieuLucDen',
  'LienHe'
];

const RECENT_PUBLISHED_SELECT_FIELDS: ReadonlyArray<string> = [
  ...BAN_HANH_SELECT_FIELDS,
  'UniqueId',
  'EffectiveBasePermissions'
];

const BAN_HANH_FOLDER_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'FileLeafRef',
  'FileDirRef',
  'FSObjType',
  'FileRef',
  'NgayPhatHanh',
  'TomTatVanban',
  'HieuLucTu',
  'HieuLucDen',
  'LienHe'
];

const TEMPLATE_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'FileLeafRef',
  'FSObjType',
  'FileRef'
];

const SEARCH_SELECT_PROPERTIES = [
  'Path',
  'Filename',
  'Title',
  'ListItemID',
  'IsDocument',
  'ViewsLifeTime',
  'HitHighlightedSummary',
  'FileExtension'
];

const VIEW_COUNT_SELECT_PROPERTIES = ['ListItemID', 'ViewsLifeTime'];

const SEARCH_POST_JSON_HEADERS = {
  Accept: 'application/json;odata=nometadata',
  'Content-Type': 'application/json;odata=nometadata'
};

const RECENT_PUBLISHED_FOLDER_FILTER_CHUNK_SIZE = 20;
const MOST_VIEWED_SEARCH_SELECT_PROPERTIES = [
  'Path',
  'Filename',
  'Title',
  'ListItemID',
  'IsDocument',
  'ViewsLifeTime',
  'HitHighlightedSummary'
];

interface IRecentPublishedDataCacheEntry {
  windowDays: number;
  folders: IRecentPublishedFolder[];
  items: IBanHanhLibraryItem[];
  fetchedAt: number;
}

interface IMostViewedCacheEntry {
  items: IBanHanhLibraryItem[];
  fetchedAt: number;
}

let recentPublishedDataCache: IRecentPublishedDataCacheEntry | undefined;
let recentPublishedDataPromise: Promise<IRecentPublishedDataCacheEntry> | undefined;
let mostViewedCache: IMostViewedCacheEntry | undefined;
let mostViewedPromise: Promise<IMostViewedCacheEntry> | undefined;

function getLibraryTitle(context: IPhvbSiteContext): string {
  return resolveIssuanceLibraryTitle(context.issuanceLibraryTitle);
}

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

function normalizeServerRelativePath(value: string): string {
  return value.replace(/\/+/g, '/');
}

function toServerRelativePathFromSearchPath(path: string): string {
  const trimmed = (path || '').trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return normalizeServerRelativePath(parsed.pathname);
    } catch {
      return normalizeServerRelativePath(trimmed);
    }
  }

  return normalizeServerRelativePath(trimmed);
}

function buildODataParameterQuery(parameters: Record<string, string>): string {
  return Object.keys(parameters)
    .map(key => `${encodeURIComponent(key)}='${encodeURIComponent(parameters[key])}'`)
    .join('&');
}

function buildListItemAllFieldsSelect(fields: ReadonlyArray<string>): string {
  return fields.map(field => `ListItemAllFields/${field}`).join(',');
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '';
  }

  return fileName.substring(lastDotIndex).toLowerCase();
}

/** PermissionKind.OpenItems = 6 → Low bit (1 << 5) = 32 */
function hasOpenItemsPermission(perms?: ISharePointBasePermissions): boolean {
  if (!perms) {
    return true;
  }

  const low = Number(perms.Low);

  if (isNaN(low)) {
    return true;
  }

  return (low & 32) === 32;
}

function mapBanHanhLibraryItem(
  item: ISharePointDocumentLibraryItem,
  siteUrl: string,
  extras?: {
    viewCount?: number;
    uniqueId?: string;
    canDownload?: boolean;
  }
): IBanHanhLibraryItem {
  const fileRef = item.FileRef || '';
  const name = item.FileLeafRef || item.Title || '';
  const canDownload = extras?.canDownload === true;
  const uniqueId = extras?.uniqueId || item.UniqueId;
  const downloadUrl = canDownload
    ? buildSharePointFileDownloadUrl(siteUrl, { uniqueId, fileRef })
    : undefined;

  return {
    id: item.Id,
    name,
    fileDirRef: item.FileDirRef || '',
    fsObjType: item.FSObjType || 0,
    fileRef,
    tomTatVanban: item.TomTatVanban,
    ngayPhatHanh: item.NgayPhatHanh,
    hieuLucTu: item.HieuLucTu,
    hieuLucDen: item.HieuLucDen,
    lienHe: item.LienHe,
    fileUrl: buildSharePointFileOpenUrl(siteUrl, { fileRef, fileName: name, uniqueId }),
    uniqueId,
    viewCount: extras?.viewCount,
    canDownload,
    downloadUrl: downloadUrl || undefined
  };
}

function mapTemplateLibraryItem(item: ISharePointDocumentLibraryItem, siteUrl: string): ITemplateLibraryItem {
  const name = item.FileLeafRef || item.Title || '';
  const fileRef = item.FileRef || '';

  return {
    id: item.Id,
    name,
    fileExtension: getFileExtension(name),
    fileUrl: buildSharePointFileOpenUrl(siteUrl, { fileRef, fileName: name })
  };
}

function mapRecentPublishedFolder(item: ISharePointDocumentLibraryItem): IRecentPublishedFolder | undefined {
  const fileDirRef = normalizeServerRelativePath(item.FileDirRef || '');
  const name = (item.FileLeafRef || item.Title || '').trim();
  const fileRef = normalizeServerRelativePath(item.FileRef || '');

  if (!fileDirRef || !name || !fileRef || !isRecentPublishedFolderCandidate(fileDirRef, name)) {
    return undefined;
  }

  return {
    id: item.Id,
    name,
    fileDirRef,
    fileRef,
    ngayPhatHanh: item.NgayPhatHanh,
    tomTatVanban: item.TomTatVanban,
    hieuLucTu: item.HieuLucTu,
    hieuLucDen: item.HieuLucDen,
    lienHe: item.LienHe
  };
}

function escapeODataStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function buildRecentPublishedFileDirRefFilter(folderPaths: string[]): string | undefined {
  const clauses: string[] = [];

  folderPaths.forEach(folderPath => {
    const normalizedFolderPath = normalizeServerRelativePath(folderPath);

    if (!normalizedFolderPath) {
      return;
    }

    clauses.push(`FileDirRef eq '${escapeODataStringLiteral(normalizedFolderPath)}'`);
    clauses.push(`FileDirRef eq '${escapeODataStringLiteral(`${normalizedFolderPath}/${ATTACHMENT_FORM_SUBFOLDER}`)}'`);
  });

  if (clauses.length === 0) {
    return undefined;
  }

  return clauses.join(' or ');
}

function isHomeDataCacheFresh(entry: IRecentPublishedDataCacheEntry | undefined, windowDays: number): boolean {
  if (!entry) {
    return false;
  }

  return entry.windowDays === windowDays
    && Date.now() - entry.fetchedAt < LIBRARY_CACHE_STALE_MS;
}

function isMostViewedCacheFresh(entry: IMostViewedCacheEntry | undefined): boolean {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < LIBRARY_CACHE_STALE_MS;
}

function buildMostViewedSearchKql(siteUrl: string, libraryRootPath: string): string {
  const absolutePath = buildLibrarySearchAbsolutePath(siteUrl, libraryRootPath);
  const pathClause = absolutePath
    ? `Path:"${escapeKqlText(absolutePath)}/*"`
    : '*';

  return `${pathClause} AND IsDocument:1 NOT Path:"*Expired_*"`;
}

function mapFileApiItem(item: ISharePointFileApiItem, siteUrl: string): IBanHanhLibraryItem | undefined {
  const listItem = item.ListItemAllFields;

  if (!listItem || !listItem.Id) {
    return undefined;
  }

  const name = (item.Name || listItem.FileLeafRef || listItem.Title || '').trim();
  const fileRef = normalizeServerRelativePath((listItem.FileRef || item.ServerRelativeUrl || '').trim());

  if (!name || !fileRef) {
    return undefined;
  }

  const uniqueId = item.UniqueId || listItem.UniqueId;
  const canDownload = hasOpenItemsPermission(listItem.EffectiveBasePermissions);

  return mapBanHanhLibraryItem({
    ...listItem,
    FileLeafRef: name,
    FileRef: fileRef,
    FSObjType: 0
  }, siteUrl, {
    uniqueId,
    canDownload
  });
}

function parseSearchCellValue(cells: ISearchResultCell[], key: string): string {
  for (let index = 0; index < cells.length; index += 1) {
    if (cells[index].Key === key) {
      return (cells[index].Value || '').trim();
    }
  }

  return '';
}

function parseSearchViewCount(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function buildSearchPostBody(options: {
  queryText: string;
  rowLimit: number;
  selectProperties: ReadonlyArray<string>;
  startRow?: number;
  trimDuplicates?: boolean;
  sortList?: Array<{
    Property: string;
    Direction: number;
  }>;
}): string {
  const request: ISharePointSearchRequest = {
    Querytext: options.queryText,
    RowLimit: options.rowLimit,
    SelectProperties: options.selectProperties.slice(),
    TrimDuplicates: options.trimDuplicates !== undefined ? options.trimDuplicates : false
  };

  if (options.startRow !== undefined && options.startRow > 0) {
    request.StartRow = options.startRow;
  }

  if (options.sortList && options.sortList.length > 0) {
    request.SortList = options.sortList.slice();
  }

  const body: ISharePointSearchPostBody = { request };
  return JSON.stringify(body);
}

function getSearchResultRows(data: ISharePointSearchQueryResult): Array<ISearchResultCell[]> {
  const rows = data.PrimaryQueryResult?.RelevantResults?.Table?.Rows || [];

  return rows.map(row => row.Cells || []);
}

async function executeSharePointSearchPost(
  context: IPhvbSiteContext,
  siteUrl: string,
  body: string,
  apiLogParams?: {
    listName?: string;
    httpMethod?: 'SP_POST';
  }
): Promise<ISharePointSearchQueryResult> {
  const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/search/postquery`;
  const response = await context.spHttpClient.post(
    requestUrl,
    SPHttpClient.configurations.v1,
    {
      headers: SEARCH_POST_JSON_HEADERS,
      body
    }
  );

  await ensureSharePointResponseOk(
    response,
    requestUrl,
    apiLogParams
      ? buildApiLogParams(context, undefined, {
        httpMethod: apiLogParams.httpMethod || 'SP_POST',
        listName: apiLogParams.listName,
        requestPayload: body
      })
      : undefined
  );

  return response.json() as Promise<ISharePointSearchQueryResult>;
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
    await ensureSharePointResponseOk(
      response,
      requestUrl,
      buildApiLogParams(context, undefined, {
        httpMethod: 'SP_GET',
        listName: libraryTitle
      })
    );
    const data = await response.json() as { value?: ISharePointDocumentLibraryItem[] };
    const items = data.value || [];

    return items.map(item => mapItem(item, siteUrl));
  }, fallbackMessage);
}

async function hydrateLibraryItemsByIds(
  context: IPhvbSiteContext,
  libraryTitle: string,
  siteUrl: string,
  itemIds: number[],
  viewCountById: Record<number, number | undefined>
): Promise<IBanHanhLibraryItem[]> {
  if (itemIds.length === 0) {
    return [];
  }

  const filter = itemIds.map(id => `Id eq ${id}`).join(' or ');
  const requestUrl = `${getLibraryItemsEndpoint(siteUrl, libraryTitle)}?${buildLibraryItemsQuery({
    selectFields: BAN_HANH_SELECT_FIELDS,
    filter,
    top: itemIds.length
  })}`;
  const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
  await ensureSharePointResponseOk(
    response,
    requestUrl,
    buildApiLogParams(context, undefined, {
      httpMethod: 'SP_GET',
      listName: libraryTitle
    })
  );
  const data = await response.json() as { value?: ISharePointDocumentLibraryItem[] };
  const itemMap = new Map<number, IBanHanhLibraryItem>();

  (data.value || []).forEach(item => {
    if (!item.Id) {
      return;
    }

    itemMap.set(item.Id, mapBanHanhLibraryItem(item, siteUrl, {
      viewCount: viewCountById[item.Id],
      canDownload: false
    }));
  });

  return itemIds
    .map(id => itemMap.get(id))
    .filter((item): item is IBanHanhLibraryItem => Boolean(item));
}

export class PhvbDocumentLibraryService {
  public loadBanHanhLibraryItems(context: IPhvbSiteContext): Promise<IBanHanhLibraryItem[]> {
    const libraryTitle = getLibraryTitle(context);

    return loadDocumentLibraryItems(
      context,
      libraryTitle,
      {
        selectFields: BAN_HANH_SELECT_FIELDS,
        top: 5000,
        orderBy: 'FileDirRef,FileLeafRef'
      },
      mapBanHanhLibraryItem,
      'Unable to load issuance library items.'
    );
  }

  public loadRecentPublishedFolders(
    context: IPhvbSiteContext,
    windowDays: number
  ): Promise<IRecentPublishedFolder[]> {
    const libraryTitle = getLibraryTitle(context);
    const startDateLiteral = toODataDateTimeLiteral(getRecentPublishedStartDate(windowDays));

    return loadDocumentLibraryItems(
      context,
      libraryTitle,
      {
        selectFields: BAN_HANH_FOLDER_SELECT_FIELDS,
        filter: `FSObjType eq 1 and NgayPhatHanh ge ${startDateLiteral}`,
        top: RECENT_PUBLISHED_FOLDER_TOP,
        orderBy: 'NgayPhatHanh desc,Id desc'
      },
      item => mapRecentPublishedFolder(item),
      'Unable to load recently published folders.'
    ).then(folders =>
      folders.filter((folder): folder is IRecentPublishedFolder => Boolean(folder))
    );
  }

  private loadRecentPublishedFilesForFolders(
    context: IPhvbSiteContext,
    folderPaths: string[]
  ): Promise<IBanHanhLibraryItem[]> {
    const libraryTitle = getLibraryTitle(context);
    const normalizedPaths = folderPaths
      .map(path => normalizeServerRelativePath(path))
      .filter(path => Boolean(path));

    if (normalizedPaths.length === 0) {
      return Promise.resolve([]);
    }

    const chunks: string[][] = [];
    for (let index = 0; index < normalizedPaths.length; index += RECENT_PUBLISHED_FOLDER_FILTER_CHUNK_SIZE) {
      chunks.push(normalizedPaths.slice(index, index + RECENT_PUBLISHED_FOLDER_FILTER_CHUNK_SIZE));
    }

    const chunkPromises = chunks.map(chunk => {
      const dirRefFilter = buildRecentPublishedFileDirRefFilter(chunk);

      if (!dirRefFilter) {
        return Promise.resolve([] as IBanHanhLibraryItem[]);
      }

      return loadDocumentLibraryItems(
        context,
        libraryTitle,
        {
          selectFields: RECENT_PUBLISHED_SELECT_FIELDS,
          filter: `FSObjType eq 0 and (${dirRefFilter})`,
          top: RECENT_PUBLISHED_FILE_BATCH_TOP,
          orderBy: 'FileDirRef,FileLeafRef'
        },
        (item, siteUrl) => mapBanHanhLibraryItem(item, siteUrl, {
          uniqueId: item.UniqueId,
          canDownload: hasOpenItemsPermission(item.EffectiveBasePermissions)
        }),
        'Unable to load recently published documents.'
      );
    });

    return Promise.all(chunkPromises).then(chunkResults => {
      const merged: IBanHanhLibraryItem[] = [];

      chunkResults.forEach(items => {
        items.forEach(item => {
          if (
            item.fsObjType === 0
            && Boolean(item.name)
            && Boolean(item.fileRef)
            && !isExpiredArchivePath(item.fileDirRef)
            && !isExpiredArchivePath(item.fileRef)
          ) {
            merged.push(item);
          }
        });
      });

      return merged;
    });
  }

  public loadRecentPublishedData(
    context: IPhvbSiteContext,
    windowDays: number
  ): Promise<{ folders: IRecentPublishedFolder[]; items: IBanHanhLibraryItem[] }> {
    if (isHomeDataCacheFresh(recentPublishedDataCache, windowDays)) {
      return Promise.resolve({
        folders: recentPublishedDataCache!.folders.slice(),
        items: recentPublishedDataCache!.items.slice()
      });
    }

    if (!recentPublishedDataPromise) {
      recentPublishedDataPromise = this.fetchRecentPublishedData(context, windowDays).then(entry => {
        recentPublishedDataCache = entry;
        return entry;
      });
    }

    const pendingPromise = recentPublishedDataPromise;

    return pendingPromise.then(entry => {
      if (recentPublishedDataPromise === pendingPromise) {
        recentPublishedDataPromise = undefined;
      }

      return {
        folders: entry.folders.slice(),
        items: entry.items.slice()
      };
    });
  }

  private fetchRecentPublishedData(
    context: IPhvbSiteContext,
    windowDays: number
  ): Promise<IRecentPublishedDataCacheEntry> {
    return this.loadRecentPublishedFolders(context, windowDays).then(folders =>
      this.loadRecentPublishedFilesForFolders(
        context,
        folders.map(folder => folder.fileRef)
      ).then(items => ({
        windowDays,
        folders,
        items,
        fetchedAt: Date.now()
      }))
    );
  }

  public loadRecentPublishedDocuments(
    context: IPhvbSiteContext,
    windowDays: number
  ): Promise<IBanHanhLibraryItem[]> {
    return this.loadRecentPublishedData(context, windowDays).then(data => data.items);
  }

  public loadMostViewedDocuments(
    context: IPhvbSiteContext,
    limit: number = MOST_VIEWED_LIMIT
  ): Promise<IBanHanhLibraryItem[]> {
    if (isMostViewedCacheFresh(mostViewedCache)) {
      return Promise.resolve(mostViewedCache!.items.slice(0, limit));
    }

    if (!mostViewedPromise) {
      mostViewedPromise = this.fetchMostViewedDocuments(context, limit).then(entry => {
        mostViewedCache = entry;
        return entry;
      });
    }

    const pendingPromise = mostViewedPromise;

    return pendingPromise.then(entry => {
      if (mostViewedPromise === pendingPromise) {
        mostViewedPromise = undefined;
      }

      return entry.items.slice(0, limit);
    });
  }

  private fetchMostViewedDocuments(
    context: IPhvbSiteContext,
    limit: number
  ): Promise<IMostViewedCacheEntry> {
    const libraryTitle = getLibraryTitle(context);

    return tryAcrossCandidateSites(context, async (siteUrl: string) => {
      const folders = await this.loadBanHanhLibraryFolders(context);
      const folderIndex = buildLibraryFolderChildrenIndex(folders);
      const libraryRootPath = folderIndex.libraryRootPath;

      const queryText = buildMostViewedSearchKql(siteUrl, libraryRootPath);
      const body = buildSearchPostBody({
        queryText,
        rowLimit: Math.max(limit * 3, limit),
        selectProperties: MOST_VIEWED_SEARCH_SELECT_PROPERTIES,
        trimDuplicates: true,
        sortList: [{ Property: 'ViewsLifeTime', Direction: 1 }]
      });
      const data = await executeSharePointSearchPost(context, siteUrl, body, {
        listName: libraryTitle,
        httpMethod: 'SP_POST'
      });
      const rows = getSearchResultRows(data);
      const viewCountById: Record<number, number | undefined> = {};
      const itemIds: number[] = [];

      rows.forEach(cells => {
        const listItemIdValue = parseSearchCellValue(cells, 'ListItemID');
        const listItemId = parseInt(listItemIdValue, 10);

        if (!listItemId || isNaN(listItemId)) {
          return;
        }

        itemIds.push(listItemId);
        viewCountById[listItemId] = parseSearchViewCount(parseSearchCellValue(cells, 'ViewsLifeTime'));
      });

      const hydratedItems = await hydrateLibraryItemsByIds(
        context,
        libraryTitle,
        siteUrl,
        itemIds,
        viewCountById
      );

      const effectiveItems = hydratedItems.filter(item =>
        item.fsObjType === 0
        && Boolean(item.name)
        && Boolean(item.fileRef)
        && !isExpiredArchivePath(item.fileDirRef)
        && !isExpiredArchivePath(item.fileRef)
        && resolveLibraryDocumentEffectiveStatus(item.hieuLucTu, item.hieuLucDen) === 'effective'
      );

      return {
        items: effectiveItems.slice(0, limit),
        fetchedAt: Date.now()
      };
    }, 'Unable to load most viewed documents.');
  }

  public clearHomeDataCache(): void {
    recentPublishedDataCache = undefined;
    recentPublishedDataPromise = undefined;
    mostViewedCache = undefined;
    mostViewedPromise = undefined;
  }

  public loadBanHanhLibraryFolders(context: IPhvbSiteContext): Promise<IBanHanhLibraryItem[]> {
    const libraryTitle = getLibraryTitle(context);

    return loadDocumentLibraryItems(
      context,
      libraryTitle,
      {
        selectFields: BAN_HANH_FOLDER_SELECT_FIELDS,
        filter: 'FSObjType eq 1',
        top: 5000,
        orderBy: 'FileDirRef,FileLeafRef'
      },
      mapBanHanhLibraryItem,
      'Unable to load issuance library folders.'
    ).then(folders =>
      folders.filter(folder => folder.name.toLowerCase() !== 'forms')
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

  public listFolderFilesPage(
    context: IPhvbSiteContext,
    folderPath: string,
    page: number,
    pageSize: number = LIBRARY_FILES_PAGE_SIZE
  ): Promise<ILibraryPagedFilesResult> {
    const libraryTitle = getLibraryTitle(context);
    const normalizedPath = normalizeServerRelativePath(folderPath);
    const safePage = Math.max(1, page);

    return tryAcrossCandidateSites(context, async (siteUrl: string) => {
      let nextLink: string | undefined =
        `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files` +
        `?$select=Name,ServerRelativeUrl,UniqueId,${buildListItemAllFieldsSelect(BAN_HANH_SELECT_FIELDS)},ListItemAllFields/EffectiveBasePermissions` +
        `&$expand=ListItemAllFields` +
        `&$top=${pageSize}&${buildODataParameterQuery({
          '@folderPath': normalizedPath
        })}`;
      let currentPage = 1;
      let items: IBanHanhLibraryItem[] = [];
      let hasNextPage = false;

      while (nextLink) {
        const response = await context.spHttpClient.get(nextLink, SPHttpClient.configurations.v1);
        await ensureSharePointResponseOk(
          response,
          nextLink,
          buildApiLogParams(context, undefined, {
            httpMethod: 'SP_GET',
            listName: libraryTitle
          })
        );
        const data = await response.json() as {
          value?: ISharePointFileApiItem[];
          '@odata.nextLink'?: string;
        };

        if (currentPage === safePage) {
          items = (data.value || [])
            .map(item => mapFileApiItem(item, siteUrl))
            .filter((item): item is IBanHanhLibraryItem => Boolean(item))
            .sort((left, right) => left.name.localeCompare(right.name, 'vi'));
          hasNextPage = Boolean(data['@odata.nextLink']);
          break;
        }

        if (!data['@odata.nextLink']) {
          break;
        }

        nextLink = data['@odata.nextLink'];
        currentPage += 1;
      }

      const viewCountById = await this.getViewCountsByItemIds(
        context,
        siteUrl,
        items.map(item => ({ id: item.id, fileRef: item.fileRef }))
      );

      return {
        items: items.map(item => ({
          ...item,
          viewCount: viewCountById[item.id]
        })),
        page: safePage,
        pageSize,
        hasNextPage,
        nextPageCursor: hasNextPage ? `${safePage + 1}` : undefined
      };
    }, 'Unable to load folder files.');
  }

  public searchLibraryDocuments(
    context: IPhvbSiteContext,
    options: {
      query?: string;
      page: number;
      pageSize?: number;
      libraryRootPath: string;
    }
  ): Promise<ILibrarySearchPageResult> {
    const libraryTitle = getLibraryTitle(context);
    const pageSize = options.pageSize || LIBRARY_SEARCH_PAGE_SIZE;
    const safePage = Math.max(1, options.page);
    const startRow = (safePage - 1) * pageSize;

    return tryAcrossCandidateSites(context, async (siteUrl: string) => {
      const queryText = buildLibrarySearchKql(siteUrl, options.libraryRootPath, options.query);

      console.log('[PhvbLibrarySearch] request', {
        siteUrl,
        libraryRootPath: options.libraryRootPath,
        query: options.query,
        page: safePage,
        pageSize,
        startRow,
        queryText
      });

      const body = buildSearchPostBody({
        queryText,
        rowLimit: pageSize,
        startRow,
        selectProperties: SEARCH_SELECT_PROPERTIES,
        trimDuplicates: false
      });
      const data = await executeSharePointSearchPost(context, siteUrl, body, {
        httpMethod: 'SP_POST',
        listName: libraryTitle
      });
      const rows = getSearchResultRows(data);
      const totalCount = data.PrimaryQueryResult?.RelevantResults?.TotalRows || 0;
      const viewCountById: Record<number, number | undefined> = {};
      const itemIds: number[] = [];
      const isDocumentById: Record<number, boolean> = {};

      rows.forEach(cells => {
        const listItemIdValue = parseSearchCellValue(cells, 'ListItemID');
        const listItemId = parseInt(listItemIdValue, 10);

        if (!listItemId || isNaN(listItemId)) {
          return;
        }

        itemIds.push(listItemId);
        viewCountById[listItemId] = parseSearchViewCount(parseSearchCellValue(cells, 'ViewsLifeTime'));
        const isDocumentValue = parseSearchCellValue(cells, 'IsDocument').toLowerCase();
        isDocumentById[listItemId] = isDocumentValue === 'true' || isDocumentValue === '1';
      });

      const hydratedItems = await hydrateLibraryItemsByIds(
        context,
        libraryTitle,
        siteUrl,
        itemIds,
        viewCountById
      );

      const fallbackItems: IBanHanhLibraryItem[] = rows
        .map(cells => {
          const path = parseSearchCellValue(cells, 'Path');
          const filename = parseSearchCellValue(cells, 'Filename') || parseSearchCellValue(cells, 'Title');
          const listItemIdValue = parseSearchCellValue(cells, 'ListItemID');
          const listItemId = parseInt(listItemIdValue, 10);
          const isDocumentValue = parseSearchCellValue(cells, 'IsDocument').toLowerCase();
          const isDocument = isDocumentValue === 'true' || isDocumentValue === '1';

          if (!path || !filename || !listItemId || isNaN(listItemId)) {
            return undefined;
          }

          if (filename.toLowerCase() === 'forms') {
            return undefined;
          }

          const serverRelativeRef = toServerRelativePathFromSearchPath(path);

          return {
            id: listItemId,
            name: filename,
            fileDirRef: serverRelativeRef.substring(0, serverRelativeRef.lastIndexOf('/')),
            fsObjType: isDocument ? 0 : 1,
            fileRef: serverRelativeRef,
            tomTatVanban: parseSearchCellValue(cells, 'HitHighlightedSummary') || undefined,
            fileUrl: isDocument
              ? buildSharePointFileOpenUrl(siteUrl, { fileRef: serverRelativeRef, fileName: filename })
              : '',
            viewCount: parseSearchViewCount(parseSearchCellValue(cells, 'ViewsLifeTime')),
            canDownload: false
          } as IBanHanhLibraryItem;
        })
        .filter((item): item is IBanHanhLibraryItem => Boolean(item));

      const hydratedOrFallback = hydratedItems.length > 0 ? hydratedItems : fallbackItems;
      const items = hydratedOrFallback.filter(item => item.name.toLowerCase() !== 'forms');

      console.log('[PhvbLibrarySearch] response', {
        totalCount,
        rowCount: rows.length,
        itemIds,
        hydratedCount: hydratedItems.length,
        fallbackCount: fallbackItems.length,
        resultCount: items.length,
        isDocumentById
      });

      return {
        items,
        page: safePage,
        pageSize,
        totalCount,
        query: (options.query || '').trim()
      };
    }, 'Unable to search issuance library.');
  }

  public getViewCountsByItemIds(
    context: IPhvbSiteContext,
    siteUrl: string,
    items: Array<{ id: number; fileRef: string }>
  ): Promise<Record<number, number | undefined>> {
    const uniqueById = new Map<number, string>();

    items.forEach(item => {
      if (!item.id || !item.fileRef || !item.fileRef.trim()) {
        return;
      }

      if (!uniqueById.has(item.id)) {
        uniqueById.set(item.id, normalizeServerRelativePath(item.fileRef.trim()));
      }
    });

    if (uniqueById.size === 0) {
      return Promise.resolve({});
    }

    const origin = getSiteOrigin(siteUrl);
    const pathClauses: string[] = [];

    uniqueById.forEach(fileRef => {
      const absolutePath = `${origin}${fileRef.charAt(0) === '/' ? fileRef : `/${fileRef}`}`;
      pathClauses.push(`Path:"${absolutePath.replace(/"/g, '\\"')}"`);
    });

    const queryText = `(${pathClauses.join(' OR ')})`;
    const body = buildSearchPostBody({
      queryText,
      rowLimit: uniqueById.size,
      selectProperties: VIEW_COUNT_SELECT_PROPERTIES,
      trimDuplicates: false
    });

    return executeSharePointSearchPost(context, siteUrl, body).then(data => {
      const rows = getSearchResultRows(data);
      const result: Record<number, number | undefined> = {};

      rows.forEach(cells => {
        const listItemId = parseInt(parseSearchCellValue(cells, 'ListItemID'), 10);
        const viewCount = parseSearchViewCount(parseSearchCellValue(cells, 'ViewsLifeTime'));

        if (!listItemId || isNaN(listItemId)) {
          return;
        }

        result[listItemId] = viewCount;
      });

      return result;
    }).catch(() => ({}));
  }

  public hydrateBanHanhItemsByIds(
    context: IPhvbSiteContext,
    itemIds: number[],
    chunkSize: number = 25
  ): Promise<IBanHanhLibraryItem[]> {
    const libraryTitle = getLibraryTitle(context);
    const uniqueIds: number[] = [];
    itemIds.forEach((id: number) => {
      if (id && uniqueIds.indexOf(id) === -1) {
        uniqueIds.push(id);
      }
    });

    if (uniqueIds.length === 0) {
      return Promise.resolve([]);
    }

    return tryAcrossCandidateSites(context, async (siteUrl: string) => {
      const hydratedItems: IBanHanhLibraryItem[] = [];

      for (let index = 0; index < uniqueIds.length; index += chunkSize) {
        const chunk = uniqueIds.slice(index, index + chunkSize);
        const chunkItems = await hydrateLibraryItemsByIds(
          context,
          libraryTitle,
          siteUrl,
          chunk,
          {}
        );
        chunkItems.forEach((item: IBanHanhLibraryItem) => {
          hydratedItems.push(item);
        });
      }

      return hydratedItems;
    }, 'Unable to hydrate issuance library items.');
  }
}

export const phvbDocumentLibraryService = new PhvbDocumentLibraryService();
