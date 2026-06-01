import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { resolveListTitle } from './PhvbMag.configuration';
import { SharePointRequestError } from './PhvbMag.error';
import type { IPhvbSiteContext, IVanBanItem } from './PhvbMag.models';

export interface IFetchPhvbItemsQuery extends IPhvbSiteContext {
  selectFields: ReadonlyArray<string>;
  filter?: string;
  top?: number;
  orderBy?: string;
}

export interface ICreatePhvbItemCommand extends IPhvbSiteContext {
  payload: Record<string, string>;
}

export interface IPhvbRepository {
  fetchItems(query: IFetchPhvbItemsQuery): Promise<IVanBanItem[]>;
  createItem(command: ICreatePhvbItemCommand): Promise<void>;
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function getItemsEndpoint(siteUrl: string, listTitle?: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(resolveListTitle(listTitle))}')/items`;
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

function buildQueryString(query: IFetchPhvbItemsQuery, selectFields: string[]): string {
  const queryParts: string[] = [`$select=${selectFields.join(',')}`];

  if (query.filter) {
    queryParts.push(`$filter=${query.filter}`);
  }

  queryParts.push(`$top=${query.top || 5000}`);

  if (query.orderBy) {
    queryParts.push(`$orderby=${query.orderBy}`);
  }

  return queryParts.join('&');
}

function extractMissingFieldName(error: unknown): string | undefined {
  if (!(error instanceof SharePointRequestError) || !error.details) {
    return undefined;
  }

  const match = /field or property '([^']+)' does not exist/i.exec(error.details);
  return match ? match[1] : undefined;
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

async function runPostRequest(siteUrl: string, command: ICreatePhvbItemCommand): Promise<SPHttpClientResponse> {
  const requestUrl = getItemsEndpoint(siteUrl, command.listTitle);
  const response = await command.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
    body: JSON.stringify(command.payload),
    headers: {
      accept: 'application/json;odata=nometadata',
      'content-type': 'application/json;odata=nometadata',
      'odata-version': ''
    }
  });

  return ensureOk(response, requestUrl);
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

      while (selectFields.length > 0) {
        try {
          const response = await runGetRequest(siteUrl, query, selectFields);
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

  public async createItem(command: ICreatePhvbItemCommand): Promise<void> {
    await tryAcrossCandidateSites(command, async (siteUrl: string) => {
      await runPostRequest(siteUrl, command);
      return undefined;
    });
  }
}

export const phvbRepository: IPhvbRepository = new SharePointPhvbRepository();