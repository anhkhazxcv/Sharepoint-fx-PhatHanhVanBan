import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { resolveListTitle } from '../config/PhvbMag.configuration';
import { DEFAULT_LIST_PAGE_SIZE, escapeODataValue, getCandidateSiteUrls, MAX_LIST_FETCH_TOP, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { SharePointRequestError } from '../services/PhvbMag.error';
import type { IPhvbSiteContext, IVanBanItem } from '../models/PhvbMag.models';

export interface IFetchPhvbItemsQuery extends IPhvbSiteContext {
  selectFields: ReadonlyArray<string>;
  filter?: string;
  top?: number;
  skip?: number;
  orderBy?: string;
}

export interface IFetchPhvbItemsPageResult {
  items: IVanBanItem[];
  hasMore: boolean;
  nextSkip: number;
}

export interface ICreatePhvbItemCommand extends IPhvbSiteContext {
  payload: Record<string, string | boolean | number>;
}

export interface IUpdatePhvbItemCommand extends IPhvbSiteContext {
  itemId: number;
  payload: Record<string, string | boolean | number>;
}

export interface IDeletePhvbItemCommand extends IPhvbSiteContext {
  listTitle: string;
  itemId: number;
}

export interface IPhvbRepository {
  fetchItems(query: IFetchPhvbItemsQuery): Promise<IVanBanItem[]>;
  fetchItemsPage(query: IFetchPhvbItemsQuery): Promise<IFetchPhvbItemsPageResult>;
  createItem(command: ICreatePhvbItemCommand): Promise<number>;
  updateItem(command: IUpdatePhvbItemCommand): Promise<void>;
  deleteItem(command: IDeletePhvbItemCommand): Promise<void>;
}

function getItemsEndpoint(siteUrl: string, listTitle?: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(resolveListTitle(listTitle))}')/items`;
}

function buildQueryString(query: IFetchPhvbItemsQuery, selectFields: string[]): string {
  const queryParts: string[] = [`$select=${selectFields.join(',')}`];

  if (query.filter) {
    queryParts.push(`$filter=${query.filter}`);
  }

  const top = query.top || MAX_LIST_FETCH_TOP;
  queryParts.push(`$top=${top}`);

  if (typeof query.skip === 'number' && query.skip > 0) {
    queryParts.push(`$skip=${query.skip}`);
  }

  if (query.orderBy) {
    queryParts.push(`$orderby=${query.orderBy}`);
  }

  return queryParts.join('&');
}

function extractMissingFieldName(error: unknown): string | undefined {
  if (!(error instanceof SharePointRequestError) || !error.details) {
    return undefined;
  }

  const patterns: RegExp[] = [
    /field or property '([^']+)' does not exist/i,
    /The property '([^']+)' does not exist/i,
    /property '([^']+)' does not exist/i
  ];

  for (let index = 0; index < patterns.length; index += 1) {
    const match = patterns[index].exec(error.details);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

function omitPayloadField(
  payload: Record<string, string | boolean | number>,
  fieldName: string
): Record<string, string | boolean | number> {
  const nextPayload: Record<string, string | boolean | number> = { ...payload };
  delete nextPayload[fieldName];
  return nextPayload;
}

async function runPostRequestWithFallback(siteUrl: string, command: ICreatePhvbItemCommand): Promise<number> {
  let payload = { ...command.payload };

  while (Object.keys(payload).length > 0) {
    try {
      return await runPostRequest(siteUrl, { ...command, payload });
    } catch (error) {
      const missingFieldName = extractMissingFieldName(error);

      if (missingFieldName && Object.prototype.hasOwnProperty.call(payload, missingFieldName)) {
        payload = omitPayloadField(payload, missingFieldName);
        continue;
      }

      throw error;
    }
  }

  throw new Error('SharePoint create payload is empty after removing unsupported fields.');
}

async function runPatchRequestWithFallback(siteUrl: string, command: IUpdatePhvbItemCommand): Promise<void> {
  let payload = { ...command.payload };

  while (Object.keys(payload).length > 0) {
    try {
      await runPatchRequest(siteUrl, { ...command, payload });
      return;
    } catch (error) {
      const missingFieldName = extractMissingFieldName(error);

      if (missingFieldName && Object.prototype.hasOwnProperty.call(payload, missingFieldName)) {
        payload = omitPayloadField(payload, missingFieldName);
        continue;
      }

      throw error;
    }
  }

  throw new Error('SharePoint update payload is empty after removing unsupported fields.');
}

async function readJson<T>(response: SPHttpClientResponse): Promise<T> {
  return response.json() as Promise<T>;
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

async function runGetRequest(siteUrl: string, query: IFetchPhvbItemsQuery, selectFields: string[]): Promise<SPHttpClientResponse> {
  const requestUrl = `${getItemsEndpoint(siteUrl, query.listTitle)}?${buildQueryString(query, selectFields)}`;
  const response = await query.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
  return ensureOk(response, requestUrl);
}

async function runPostRequest(siteUrl: string, command: ICreatePhvbItemCommand): Promise<number> {
  const requestUrl = getItemsEndpoint(siteUrl, command.listTitle);
  const response = await command.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
    body: JSON.stringify(command.payload),
    headers: {
      accept: 'application/json;odata=nometadata',
      'content-type': 'application/json;odata=nometadata',
      'odata-version': ''
    }
  });

  await ensureOk(response, requestUrl);
  const data = await response.json() as { Id?: number; ID?: number };
  const createdId = data.Id || data.ID;

  if (!createdId) {
    throw new SharePointRequestError(
      'SharePoint created item but did not return an Id.',
      response.status,
      requestUrl,
      JSON.stringify(data)
    );
  }

  return createdId;
}

async function runPatchRequest(siteUrl: string, command: IUpdatePhvbItemCommand): Promise<void> {
  const requestUrl = `${getItemsEndpoint(siteUrl, command.listTitle)}(${command.itemId})`;
  const response = await command.spHttpClient.fetch(requestUrl, SPHttpClient.configurations.v1, {
    method: 'PATCH',
    body: JSON.stringify(command.payload),
    headers: {
      accept: 'application/json;odata=nometadata',
      'content-type': 'application/json;odata=nometadata',
      'odata-version': '',
      'IF-MATCH': '*'
    }
  });

  await ensureOk(response, requestUrl);
}

async function runDeleteRequest(siteUrl: string, command: IDeletePhvbItemCommand): Promise<void> {
  const requestUrl = `${getItemsEndpoint(siteUrl, command.listTitle)}(${command.itemId})`;
  const response = await command.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
    headers: {
      accept: 'application/json;odata=nometadata',
      'content-type': 'application/json;odata=nometadata',
      'odata-version': '',
      'IF-MATCH': '*',
      'X-HTTP-Method': 'DELETE'
    }
  });

  await ensureOk(response, requestUrl);
}

async function tryAcrossCandidateSites<T>(
  context: IPhvbSiteContext,
  runner: (siteUrl: string) => Promise<T>
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

  throw lastError || new Error('Unable to resolve SharePoint data source.');
}

export class SharePointPhvbRepository implements IPhvbRepository {
  public async fetchItems(query: IFetchPhvbItemsQuery): Promise<IVanBanItem[]> {
    return tryAcrossCandidateSites(query, async (siteUrl: string) => {
      let selectFields = query.selectFields.slice();
      const listQuery: IFetchPhvbItemsQuery = {
        ...query,
        top: query.top || MAX_LIST_FETCH_TOP
      };

      while (selectFields.length > 0) {
        try {
          const response = await runGetRequest(siteUrl, listQuery, selectFields);
          const data = await readJson<{ value?: IVanBanItem[] }>(response);
          return data.value || [];
        } catch (error) {
          const missingFieldName = extractMissingFieldName(error);

          if (missingFieldName && selectFields.indexOf(missingFieldName) > -1) {
            selectFields = selectFields.filter(fieldName => fieldName !== missingFieldName);
            continue;
          }

          throw error;
        }
      }

      return [];
    });
  }

  public async fetchItemsPage(query: IFetchPhvbItemsQuery): Promise<IFetchPhvbItemsPageResult> {
    const pageSize = query.top || DEFAULT_LIST_PAGE_SIZE;
    const skip = query.skip || 0;

    return tryAcrossCandidateSites(query, async (siteUrl: string) => {
      let selectFields = query.selectFields.slice();

      while (selectFields.length > 0) {
        try {
          const pagedQuery: IFetchPhvbItemsQuery = {
            ...query,
            top: pageSize + 1,
            skip
          };
          const response = await runGetRequest(siteUrl, pagedQuery, selectFields);
          const data = await readJson<{ value?: IVanBanItem[] }>(response);
          const rawItems = data.value || [];
          const hasMore = rawItems.length > pageSize;
          const items = hasMore ? rawItems.slice(0, pageSize) : rawItems;

          return {
            items,
            hasMore,
            nextSkip: skip + items.length
          };
        } catch (error) {
          const missingFieldName = extractMissingFieldName(error);

          if (missingFieldName && selectFields.indexOf(missingFieldName) > -1) {
            selectFields = selectFields.filter(fieldName => fieldName !== missingFieldName);
            continue;
          }

          throw error;
        }
      }

      return {
        items: [],
        hasMore: false,
        nextSkip: skip
      };
    });
  }

  public async createItem(command: ICreatePhvbItemCommand): Promise<number> {
    return tryAcrossCandidateSites(command, async (siteUrl: string) => runPostRequestWithFallback(siteUrl, command));
  }

  public async updateItem(command: IUpdatePhvbItemCommand): Promise<void> {
    return tryAcrossCandidateSites(command, async (siteUrl: string) => runPatchRequestWithFallback(siteUrl, command));
  }

  public async deleteItem(command: IDeletePhvbItemCommand): Promise<void> {
    return tryAcrossCandidateSites(command, async (siteUrl: string) => runDeleteRequest(siteUrl, command));
  }
}

export const phvbRepository: IPhvbRepository = new SharePointPhvbRepository();