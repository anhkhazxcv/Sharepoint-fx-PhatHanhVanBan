import { SPHttpClient } from '@microsoft/sp-http';
import { LOG_LIST_TITLE } from '../config/PhvbMag.configuration';
import { escapeODataValue, getCandidateSiteUrls, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import type { IPhvbLogContext, IPhvbLogEntry, IPhvbSiteContext } from '../models/PhvbMag.models';

export interface IApiLogParams {
  siteContext: IPhvbSiteContext;
  logContext?: IPhvbLogContext;
  listName?: string;
  itemId?: string | number;
  requestFields?: string;
  requestPayload?: string;
  httpMethod?: string;
  requestUrl?: string;
}

const DEFAULT_PAYLOAD_MAX_LENGTH = 12000;

export function createFlowRunId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `run-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

export function serializeLogPayload(value: unknown, maxLength: number = DEFAULT_PAYLOAD_MAX_LENGTH): string {
  if (value === undefined || value === null) {
    return '';
  }

  let serialized = '';

  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    serialized = String(value);
  }

  if (serialized.length <= maxLength) {
    return serialized;
  }

  return `${serialized.substring(0, maxLength)}... [truncated]`;
}

function getLogItemsEndpoint(siteUrl: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(LOG_LIST_TITLE)}')/items`;
}

function mapLogEntryToPayload(entry: IPhvbLogEntry): Record<string, string> {
  return {
    Title: entry.title,
    UserEmail: entry.userEmail || '',
    ScreenName: entry.screenName || '',
    ActionName: entry.actionName || '',
    ListName: entry.listName || '',
    ItemId: entry.itemId !== undefined && entry.itemId !== null ? String(entry.itemId) : '',
    ErrorMessage: entry.errorMessage || '',
    RequestFields: entry.requestFields || '',
    RequestPayload: entry.requestPayload || '',
    FlowRunId: entry.flowRunId || ''
  };
}

function resolveErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const details = 'details' in error ? String((error as { details?: string }).details || '') : '';
    const message = 'message' in error ? String((error as { message?: string }).message || '') : '';
    const requestUrl = 'requestUrl' in error ? String((error as { requestUrl?: string }).requestUrl || '') : '';
    const status = 'status' in error ? Number((error as { status?: number }).status) : 0;

    const parts = [
      status > 0 ? `HTTP ${status}` : '',
      message,
      requestUrl ? `URL: ${requestUrl}` : '',
      details
    ].filter(part => Boolean(part));

    if (parts.length > 0) {
      return parts.join('\n');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export class PhvbMagLogService {
  public async writeErrorLog(context: IPhvbSiteContext, entry: IPhvbLogEntry): Promise<void> {
    const candidates = getCandidateSiteUrls(context);

    if (candidates.length === 0) {
      return;
    }

    const payload = mapLogEntryToPayload(entry);
    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const requestUrl = getLogItemsEndpoint(candidates[index]);

      try {
        const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
          body: JSON.stringify(payload),
          headers: {
            accept: 'application/json;odata=nometadata',
            'content-type': 'application/json;odata=nometadata',
            'odata-version': ''
          }
        });

        if (response.ok) {
          return;
        }

        const details = await response.text();
        lastError = new Error(`Log write failed with status ${response.status}: ${details}`);
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      // Swallow logging failures to avoid impacting user flows.
      return;
    }
  }

  public logApiError(params: IApiLogParams, error: unknown): void {
    const logContext = params.logContext;
    const actionName = logContext?.actionName || params.httpMethod || 'SP_REQUEST';
    const requestPayload = params.requestPayload || (params.requestUrl ? serializeLogPayload({ requestUrl: params.requestUrl }) : '');

    const entry: IPhvbLogEntry = {
      title: `${actionName} Error`,
      userEmail: logContext?.userEmail,
      screenName: logContext?.screenName,
      actionName,
      listName: params.listName,
      itemId: params.itemId ?? logContext?.itemId,
      errorMessage: resolveErrorMessage(error),
      requestFields: params.requestFields,
      requestPayload,
      flowRunId: logContext?.flowRunId
    };

    this.writeErrorLog(params.siteContext, entry).catch(() => undefined);
  }
}

export const phvbLogService = new PhvbMagLogService();

export function buildApiLogParams(
  siteContext: IPhvbSiteContext,
  logContext: IPhvbLogContext | undefined,
  params: {
    httpMethod: string;
    listName?: string;
    itemId?: string | number;
    requestFields?: string;
    requestPayload?: unknown;
    requestUrl?: string;
  }
): IApiLogParams {
  return {
    siteContext,
    logContext,
    listName: params.listName,
    itemId: params.itemId ?? logContext?.itemId,
    requestFields: params.requestFields,
    requestPayload: params.requestPayload ? serializeLogPayload(params.requestPayload) : params.requestUrl,
    httpMethod: logContext?.actionName || params.httpMethod,
    requestUrl: params.requestUrl
  };
}
