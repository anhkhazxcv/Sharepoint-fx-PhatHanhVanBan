import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import {
  ATTACHMENT_LIBRARY_TITLE,
  ISSUANCE_LIBRARY_TITLE
} from '../config/PhvbMag.configuration';
import { escapeODataValue, getCandidateSiteUrls, normalizeSiteUrl, resolveSiteDateFieldOrder } from '../infrastructure/SharePointSite.utils';
import { ensureSharePointResponseOk } from '../infrastructure/SharePointHttp.utils';
import type { IAttachmentLibraryItem, IPhvbSiteContext, IVanBanItem } from '../models/PhvbMag.models';
import { formatDateOnlyVi, toSharePointDateOnlyFieldValue, toSharePointDateOnlyIso } from '../utils/PhvbMagDateTime.utils';
import { resolveLibraryDocumentEffectiveStatus } from '../utils/PhvbMagLibrary.utils';
import { buildIssuanceMetadataValues, type IListFormValue } from '../utils/PhvbMagIssuanceMetadata.utils';
import { assertValidateUpdateSucceeded } from '../utils/PhvbMagSharePoint.utils';
import { buildApiLogParams } from './PhvbMagLog.service';
import type { BanHanhPublishAuditLogger } from '../utils/PhvbMagBanHanhPublishAudit.utils';

interface IIssuancePublishContext extends IPhvbSiteContext {
  logContext?: {
    flowRunId?: string;
    userEmail?: string;
    screenName?: string;
    actionName?: string;
    itemId?: string | number;
  };
}

interface ISharePointFileItem {
  Id: number;
  FileLeafRef?: string;
  FileRef?: string;
  FileDirRef?: string;
  FSObjType?: number;
  IsBieuMau?: boolean;
}

interface IIssuancePublishResult {
  siteUrl: string;
  mainFileServerRelativePath: string;
  folderServerRelativePath: string;
  folderListItemId: number;
  expiredFolderServerRelativePath?: string;
}

interface IFolderChildItem {
  name: string;
  serverRelativeUrl: string;
  isFolder: boolean;
}

interface IResolveFileListItemFieldsOptions {
  pollUntilReady?: boolean;
  timeoutMs?: number;
  intervalMs?: number;
}

interface IIssuanceCopyJob {
  itemId: number;
  fileName: string;
  sourcePath: string;
  targetPath: string;
  isFormAttachment?: boolean;
}

interface IIssuanceFolderFileItem {
  id: number;
  fileRef: string;
  fileName: string;
  hieuLucDen?: string;
}

const DEFAULT_COPY_POLL_TIMEOUT_MS = 15000;
const DEFAULT_COPY_POLL_INTERVAL_MS = 200;
const DEFAULT_COPY_POLL_INTERVAL_MAX_MS = 1000;
const DEFAULT_COPY_POLL_INTERVAL_GROWTH = 1.5;
const ISSUANCE_PUBLISH_CHUNK_SIZE = 4;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function nextPollIntervalMs(currentMs: number): number {
  const grown = Math.round(currentMs * DEFAULT_COPY_POLL_INTERVAL_GROWTH);
  return grown > DEFAULT_COPY_POLL_INTERVAL_MAX_MS ? DEFAULT_COPY_POLL_INTERVAL_MAX_MS : grown;
}

async function runInChunks<T>(
  items: ReadonlyArray<T>,
  worker: (item: T) => Promise<void>,
  chunkSize: number = ISSUANCE_PUBLISH_CHUNK_SIZE
): Promise<void> {
  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    await Promise.all(chunk.map(item => worker(item)));
  }
}

const ATTACHMENT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'FileLeafRef',
  'FileRef',
  'FileDirRef',
  'FSObjType',
  'IsBieuMau'
];

function buildODataParameterQuery(parameters: Record<string, string>): string {
  return Object.keys(parameters)
    .map(key => `${encodeURIComponent(key)}='${encodeURIComponent(escapeODataValue(parameters[key]))}'`)
    .join('&');
}

function normalizeServerRelativePath(value: string): string {
  const normalized = value.replace(/\/+/g, '/');
  return normalized.indexOf('/') === 0 ? normalized : `/${normalized}`;
}

function joinServerRelativePath(basePath: string, segment: string): string {
  const normalizedBase = normalizeServerRelativePath(basePath).replace(/\/$/, '');
  const normalizedSegment = segment.replace(/^\/+/, '').replace(/\/+$/, '');
  return `${normalizedBase}/${normalizedSegment}`;
}

function splitRelativePath(value: string): string[] {
  return value
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => Boolean(segment));
}

function normalizeFileRefKey(value: string): string {
  return normalizeServerRelativePath(value).toLowerCase();
}

function fileNameFromServerRelativePath(value: string): string {
  const normalized = normalizeServerRelativePath(value);
  const lastSlashIndex = normalized.lastIndexOf('/');
  return lastSlashIndex >= 0 ? normalized.substring(lastSlashIndex + 1) : normalized;
}

function omitTomTatFormValues(formValues: ReadonlyArray<IListFormValue>): IListFormValue[] {
  const result: IListFormValue[] = [];

  for (let index = 0; index < formValues.length; index += 1) {
    if (formValues[index].FieldName === 'TomTatVanban') {
      continue;
    }

    result.push(formValues[index]);
  }

  return result;
}

function buildGetFolderByServerRelativeUrl(siteUrl: string, folderPath: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)?${buildODataParameterQuery({
    '@folderPath': folderPath
  })}`;
}

function buildCopyToRequestUrl(siteUrl: string, sourcePath: string, targetPath: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@fileUrl)/copyTo(strnewurl=@newUrl,boverwrite=true)?${buildODataParameterQuery({
    '@fileUrl': sourcePath,
    '@newUrl': targetPath
  })}`;
}

function buildMoveFileRequestUrl(siteUrl: string, sourcePath: string, targetPath: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@fileUrl)/moveto(newurl=@newUrl,flags=1)?${buildODataParameterQuery({
    '@fileUrl': sourcePath,
    '@newUrl': targetPath
  })}`;
}

function buildMoveFolderRequestUrl(siteUrl: string, sourcePath: string, targetPath: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderUrl)/moveto(newUrl=@newUrl)?${buildODataParameterQuery({
    '@folderUrl': sourcePath,
    '@newUrl': targetPath
  })}`;
}

function buildValidateUpdateListItemUrl(siteUrl: string, libraryTitle: string, itemId: number): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(libraryTitle)}')/items(${itemId})/ValidateUpdateListItem`;
}

function buildAttachmentFilesRequestUrl(siteUrl: string, folderPath: string): string {
  const filter = `FileDirRef eq '${escapeODataValue(normalizeServerRelativePath(folderPath))}' and FSObjType eq 0`;
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items?$select=${ATTACHMENT_SELECT_FIELDS.join(',')}&$filter=${encodeURIComponent(filter)}&$top=500&$orderby=Modified desc`;
}

function sanitizeSharePointFolderName(value: string): string {
  return value
    .trim()
    .replace(/["*:<>?/\\|#%]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();
}

function resolveDocumentFolderName(requestReferenceId: string): string {
  const normalizedId = sanitizeSharePointFolderName(requestReferenceId.trim());
  return normalizedId || requestReferenceId.trim();
}

function dayBeforeLocal(date: Date = new Date()): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - 1);
  return result;
}

function formatExpiredDateStamp(date: Date = new Date()): string {
  const year = date.getFullYear();
  const monthValue = date.getMonth() + 1;
  const dayValue = date.getDate();
  const month = monthValue < 10 ? `0${monthValue}` : `${monthValue}`;
  const day = dayValue < 10 ? `0${dayValue}` : `${dayValue}`;

  return `${year}${month}${day}`;
}

export function buildExpiredFolderName(tenVanBan: string, date: Date = new Date()): string {
  const sanitizedName = sanitizeSharePointFolderName(tenVanBan);

  if (!sanitizedName) {
    throw new Error('Không tạo được tên thư mục Expired vì thiếu tên văn bản.');
  }

  return `Expired_${formatExpiredDateStamp(date)}_${sanitizedName}`;
}

function resolveFileServerRelativePath(item: ISharePointFileItem): string {
  const fileRef = (item.FileRef || '').trim();

  if (fileRef) {
    return normalizeServerRelativePath(fileRef);
  }

  const fileName = (item.FileLeafRef || '').trim();
  const fileDirRef = (item.FileDirRef || '').trim();

  if (!fileName || !fileDirRef) {
    return '';
  }

  return joinServerRelativePath(fileDirRef, fileName);
}

async function ensureIssuanceResponseOk(
  response: SPHttpClientResponse,
  requestUrl: string,
  context: IIssuancePublishContext,
  httpMethod: string,
  listName: string,
  requestPayload?: unknown
): Promise<SPHttpClientResponse> {
  return ensureSharePointResponseOk(
    response,
    requestUrl,
    buildApiLogParams(context, context.logContext, {
      httpMethod,
      listName,
      requestPayload: requestPayload || requestUrl
    })
  );
}

export class PhvbIssuancePublishService {
  private async getLibraryRootFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    libraryTitle: string
  ): Promise<string> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(libraryTitle)}')/RootFolder?$select=ServerRelativeUrl`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', libraryTitle);
    const data = await response.json() as { ServerRelativeUrl?: string };

    if (!data.ServerRelativeUrl) {
      throw new Error(`Missing root folder for library ${libraryTitle}.`);
    }

    return normalizeServerRelativePath(data.ServerRelativeUrl);
  }

  private async folderExists(siteUrl: string, context: IPhvbSiteContext, folderPath: string): Promise<boolean> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)?${buildODataParameterQuery({
      '@folderPath': folderPath
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    return response.ok;
  }

  private async createFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string,
    libraryTitle: string
  ): Promise<string> {
    const normalizedPath = normalizeServerRelativePath(folderPath);
    const lastSlashIndex = normalizedPath.lastIndexOf('/');

    if (lastSlashIndex <= 0) {
      throw new Error(`Invalid folder path: ${folderPath}`);
    }

    const parentPath = normalizedPath.substring(0, lastSlashIndex);
    const folderName = normalizedPath.substring(lastSlashIndex + 1);
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@parentPath)/folders/add(@folderName)?${buildODataParameterQuery({
      '@parentPath': parentPath,
      '@folderName': folderName
    })}`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    if (response.ok) {
      return requestUrl;
    }

    const details = await response.clone().text();
    if (response.status === 409 || /already exists/i.test(details)) {
      return requestUrl;
    }

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_CREATE', libraryTitle);
    return requestUrl;
  }

  private async ensureFolderPath(
    siteUrl: string,
    context: IIssuancePublishContext,
    libraryRootPath: string,
    relativePath: string,
    libraryTitle: string
  ): Promise<{ folderPath: string; requestUrl: string }> {
    const segments = splitRelativePath(relativePath);
    let fullPath = libraryRootPath;

    for (let index = 0; index < segments.length; index += 1) {
      fullPath = joinServerRelativePath(fullPath, segments[index]);
    }

    const existsUrl = buildGetFolderByServerRelativeUrl(siteUrl, fullPath);
    if (await this.folderExists(siteUrl, context, fullPath)) {
      return { folderPath: fullPath, requestUrl: existsUrl };
    }

    const lastSlashIndex = fullPath.lastIndexOf('/');
    const parentPath = lastSlashIndex > 0 ? fullPath.substring(0, lastSlashIndex) : '';

    if (parentPath && await this.folderExists(siteUrl, context, parentPath)) {
      const requestUrl = await this.createFolder(siteUrl, context, fullPath, libraryTitle);
      return { folderPath: fullPath, requestUrl };
    }

    let currentPath = libraryRootPath;
    let lastRequestUrl = existsUrl;

    for (let index = 0; index < segments.length; index += 1) {
      currentPath = joinServerRelativePath(currentPath, segments[index]);
      const segmentExistsUrl = buildGetFolderByServerRelativeUrl(siteUrl, currentPath);

      if (await this.folderExists(siteUrl, context, currentPath)) {
        lastRequestUrl = segmentExistsUrl;
        continue;
      }

      lastRequestUrl = await this.createFolder(siteUrl, context, currentPath, libraryTitle);
    }

    return { folderPath: currentPath, requestUrl: lastRequestUrl };
  }

  private async listAttachmentFiles(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<ISharePointFileItem[]> {
    const requestUrl = buildAttachmentFilesRequestUrl(siteUrl, folderPath);
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ATTACHMENT_LIBRARY_TITLE);
    const data = await response.json() as { value?: ISharePointFileItem[] };
    return data.value || [];
  }

  private async validateUpdateListItem(
    siteUrl: string,
    context: IIssuancePublishContext,
    libraryTitle: string,
    listItemId: number,
    formValues: IListFormValue[]
  ): Promise<string> {
    const requestUrl = buildValidateUpdateListItemUrl(siteUrl, libraryTitle, listItemId);
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      body: JSON.stringify({
        formValues,
        bNewDocumentUpdate: false
      }),
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_UPDATE', libraryTitle, formValues);
    const payload = await response.json();
    assertValidateUpdateSucceeded(payload);
    return requestUrl;
  }

  private async assertMainDocumentInRequest(
    sourceFiles: ReadonlyArray<ISharePointFileItem>,
    mainDocumentId: number,
    auditLogger?: BanHanhPublishAuditLogger,
    requestUrl?: string
  ): Promise<ISharePointFileItem> {
    let item: ISharePointFileItem | undefined;

    for (let index = 0; index < sourceFiles.length; index += 1) {
      if (sourceFiles[index].Id === mainDocumentId) {
        item = sourceFiles[index];
        break;
      }
    }

    if (!item || !item.Id) {
      const errorMessage =
        `Văn bản chính đã chọn không thuộc yêu cầu này. (mainDocumentId=${mainDocumentId}, fileCount=${sourceFiles.length})`;

      if (auditLogger) {
        await auditLogger.logMarkMainDocument(
          {
            mainDocumentId
          },
          'failed',
          errorMessage,
          requestUrl
        );
      }

      throw new Error(errorMessage);
    }

    if (auditLogger) {
      await auditLogger.logMarkMainDocument(
        {
          mainDocumentId: item.Id
        },
        'success',
        undefined,
        requestUrl
      );
    }

    return item;
  }

  private async copyFile(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourcePath: string,
    targetPath: string
  ): Promise<string> {
    const requestUrl = buildCopyToRequestUrl(siteUrl, sourcePath, targetPath);
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_COPY', ISSUANCE_LIBRARY_TITLE, {
      sourcePath,
      targetPath
    });
    return requestUrl;
  }

  private async listIssuanceFilesUnderFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<IIssuanceFolderFileItem[]> {
    const prefix = `${normalizeServerRelativePath(folderPath)}/`;
    const filter = `FSObjType eq 0 and startswith(FileRef,'${escapeODataValue(prefix)}')`;
    const requestUrl =
      `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ISSUANCE_LIBRARY_TITLE)}')` +
      `/items?$select=Id,FileRef,FileLeafRef,HieuLucDen&$filter=${encodeURIComponent(filter)}&$top=500`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as {
      value?: Array<{ Id?: number; FileRef?: string; FileLeafRef?: string; HieuLucDen?: string }>;
    };

    const items: IIssuanceFolderFileItem[] = [];
    const rows = data.value || [];

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const id = row.Id || 0;
      const fileRef = normalizeServerRelativePath((row.FileRef || '').trim());

      if (!id || !fileRef) {
        continue;
      }

      items.push({
        id,
        fileRef,
        fileName: (row.FileLeafRef || '').trim() || fileNameFromServerRelativePath(fileRef),
        hieuLucDen: (row.HieuLucDen || '').trim() || undefined
      });
    }

    return items;
  }

  private async resolveCopiedListItemIds(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string,
    targetPaths: ReadonlyArray<string>
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    if (targetPaths.length === 0) {
      return result;
    }

    const items = await this.listIssuanceFilesUnderFolder(siteUrl, context, folderPath);
    const byRef: Record<string, number> = {};

    for (let index = 0; index < items.length; index += 1) {
      byRef[normalizeFileRefKey(items[index].fileRef)] = items[index].id;
    }

    for (let index = 0; index < targetPaths.length; index += 1) {
      const targetPath = targetPaths[index];
      const mappedId = byRef[normalizeFileRefKey(targetPath)];

      if (mappedId) {
        result[targetPath] = mappedId;
        continue;
      }

      result[targetPath] = await this.resolveMovedListItemId(siteUrl, context, targetPath);
    }

    return result;
  }

  private async resolveMovedListItemId(
    siteUrl: string,
    context: IIssuancePublishContext,
    filePath: string
  ): Promise<number> {
    const fields = await this.resolveFileListItemFields(siteUrl, context, filePath, {
      pollUntilReady: true
    });
    return fields.id;
  }

  private async resolveFileListItemFields(
    siteUrl: string,
    context: IIssuancePublishContext,
    filePath: string,
    options?: IResolveFileListItemFieldsOptions
  ): Promise<{ id: number; hieuLucDen?: string }> {
    if (!options?.pollUntilReady) {
      const fields = await this.fetchFileListItemFields(siteUrl, context, filePath);
      if (!fields) {
        throw new Error(`Không xác định được list item id cho file ${filePath}.`);
      }

      return fields;
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_COPY_POLL_TIMEOUT_MS;
    let intervalMs = options.intervalMs ?? DEFAULT_COPY_POLL_INTERVAL_MS;
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown = new Error(`Không xác định được list item id cho file ${filePath} sau khi copy.`);

    while (Date.now() < deadline) {
      try {
        const fields = await this.fetchFileListItemFields(siteUrl, context, filePath, true);
        if (fields) {
          return fields;
        }
      } catch (error) {
        lastError = error;
      }

      await sleep(intervalMs);
      intervalMs = nextPollIntervalMs(intervalMs);
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async fetchFileListItemFields(
    siteUrl: string,
    context: IIssuancePublishContext,
    filePath: string,
    allowNotReady: boolean = false
  ): Promise<{ id: number; hieuLucDen?: string } | undefined> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@filePath)/ListItemAllFields?$select=Id,HieuLucDen&${buildODataParameterQuery({
      '@filePath': filePath
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);

    if (!response.ok) {
      if (allowNotReady) {
        return undefined;
      }

      await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    }

    const data = await response.json() as { Id?: number; HieuLucDen?: string };
    const listItemId = data.Id || 0;

    if (!listItemId) {
      if (allowNotReady) {
        return undefined;
      }

      throw new Error(`Không xác định được list item id cho file ${filePath}.`);
    }

    return {
      id: listItemId,
      hieuLucDen: (data.HieuLucDen || '').trim() || undefined
    };
  }

  private async resolveFolderListItemId(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<number> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields?$select=Id&${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as { Id?: number };
    const listItemId = data.Id || 0;

    if (!listItemId) {
      throw new Error(`Không xác định được list item id cho thư mục ${folderPath}.`);
    }

    return listItemId;
  }

  private async stampListItemMetadata(
    siteUrl: string,
    context: IIssuancePublishContext,
    libraryTitle: string,
    listItemId: number,
    metadataValues: IListFormValue[],
    auditLogger: BanHanhPublishAuditLogger,
    auditLabel: {
      targetPath: string;
      fileName?: string;
      isFolder?: boolean;
      isFormAttachment?: boolean;
    }
  ): Promise<void> {
    const requestUrl = buildValidateUpdateListItemUrl(siteUrl, libraryTitle, listItemId);
    const auditPayload: Record<string, unknown> = {
      formValues: omitTomTatFormValues(metadataValues)
    };

    if (auditLabel.fileName) {
      auditPayload.fileName = auditLabel.fileName;
    }

    if (auditLabel.isFolder) {
      auditPayload.isFolder = true;
    }

    if (auditLabel.isFormAttachment) {
      auditPayload.isFormAttachment = true;
    }

    try {
      await this.validateUpdateListItem(siteUrl, context, libraryTitle, listItemId, metadataValues);
      await auditLogger.logUpdateMetadata(auditPayload, 'success', undefined, requestUrl);
    } catch (error) {
      await auditLogger.logUpdateMetadata(
        auditPayload,
        'failed',
        error instanceof Error ? error.message : String(error),
        requestUrl
      );
      throw error;
    }
  }

  private async stampDocumentFolderMetadata(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string,
    metadataValues: IListFormValue[],
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<number> {
    const folderListItemId = await this.resolveFolderListItemId(siteUrl, context, folderPath);

    await this.stampListItemMetadata(
      siteUrl,
      context,
      ISSUANCE_LIBRARY_TITLE,
      folderListItemId,
      metadataValues,
      auditLogger,
      {
        targetPath: folderPath,
        isFolder: true
      }
    );

    return folderListItemId;
  }

  private async stampExpiredArchiveHieuLucDen(
    siteUrl: string,
    context: IIssuancePublishContext,
    expiredFolderPath: string,
    expiredEndDateFieldValue: string,
    auditLogger: BanHanhPublishAuditLogger,
    options?: { pollIfEmpty?: boolean }
  ): Promise<{ stampedCount: number; skippedCount: number; stampedPaths: string[]; skippedPaths: string[] }> {
    let files = await this.listIssuanceFilesUnderFolder(siteUrl, context, expiredFolderPath);

    if (options?.pollIfEmpty && files.length === 0) {
      const deadline = Date.now() + DEFAULT_COPY_POLL_TIMEOUT_MS;
      let intervalMs = DEFAULT_COPY_POLL_INTERVAL_MS;

      while (Date.now() < deadline) {
        await sleep(intervalMs);
        files = await this.listIssuanceFilesUnderFolder(siteUrl, context, expiredFolderPath);
        if (files.length > 0) {
          break;
        }

        intervalMs = nextPollIntervalMs(intervalMs);
      }
    }
    const filesToStamp: IIssuanceFolderFileItem[] = [];
    const stampedPaths: string[] = [];
    const skippedPaths: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const currentStatus = resolveLibraryDocumentEffectiveStatus(undefined, file.hieuLucDen);

      if (currentStatus === 'expired') {
        skippedPaths.push(file.fileRef);
        continue;
      }

      filesToStamp.push(file);
    }

    const formValues: IListFormValue[] = [{ FieldName: 'HieuLucDen', FieldValue: expiredEndDateFieldValue }];

    await runInChunks(filesToStamp, async (file) => {
      await this.stampListItemMetadata(
        siteUrl,
        context,
        ISSUANCE_LIBRARY_TITLE,
        file.id,
        formValues,
        auditLogger,
        {
          targetPath: file.fileRef,
          fileName: file.fileName
        }
      );
      stampedPaths.push(file.fileRef);
    });

    return {
      stampedCount: stampedPaths.length,
      skippedCount: skippedPaths.length,
      stampedPaths,
      skippedPaths
    };
  }

  private async listFilesInFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<Array<{ name: string; serverRelativeUrl: string }>> {
    const exists = await this.folderExists(siteUrl, context, folderPath);

    if (!exists) {
      return [];
    }

    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files?$select=Name,ServerRelativeUrl&${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ATTACHMENT_LIBRARY_TITLE);
    const data = await response.json() as {
      value?: Array<{ Name?: string; ServerRelativeUrl?: string }>;
    };

    return (data.value || [])
      .map(item => ({
        name: (item.Name || '').trim(),
        serverRelativeUrl: normalizeServerRelativePath((item.ServerRelativeUrl || '').trim())
      }))
      .filter(item => Boolean(item.name) && Boolean(item.serverRelativeUrl));
  }

  private async listFoldersInFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<Array<{ name: string; serverRelativeUrl: string }>> {
    const exists = await this.folderExists(siteUrl, context, folderPath);

    if (!exists) {
      return [];
    }

    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/Folders?$select=Name,ServerRelativeUrl&${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as {
      value?: Array<{ Name?: string; ServerRelativeUrl?: string }>;
    };

    return (data.value || [])
      .map(item => ({
        name: (item.Name || '').trim(),
        serverRelativeUrl: normalizeServerRelativePath((item.ServerRelativeUrl || '').trim())
      }))
      .filter(item => {
        const name = item.name;
        return Boolean(name) && Boolean(item.serverRelativeUrl) && name !== 'Forms';
      });
  }

  private async listFolderChildren(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<IFolderChildItem[]> {
    const [files, folders] = await Promise.all([
      this.listFilesInFolder(siteUrl, context, folderPath),
      this.listFoldersInFolder(siteUrl, context, folderPath)
    ]);

    return files
      .map(item => ({ ...item, isFolder: false }))
      .concat(folders.map(item => ({ ...item, isFolder: true })));
  }

  private async resolveFolderPathByListItemId(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderItemId: number
  ): Promise<string> {
    const requestUrl =
      `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ISSUANCE_LIBRARY_TITLE)}')` +
      `/items(${folderItemId})?$select=Id,FileRef,FileLeafRef,FSObjType`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as {
      Id?: number;
      FileRef?: string;
      FileLeafRef?: string;
      FSObjType?: number;
    };

    if (!data.Id || data.FSObjType !== 1) {
      throw new Error(`IDFolderOld ${folderItemId} không phải thư mục văn bản ban hành hợp lệ.`);
    }

    const folderPath = normalizeServerRelativePath((data.FileRef || '').trim());

    if (!folderPath) {
      throw new Error(`Không xác định được đường dẫn thư mục từ IDFolderOld ${folderItemId}.`);
    }

    return folderPath;
  }

  private async moveFile(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourcePath: string,
    targetPath: string
  ): Promise<string> {
    const requestUrl = buildMoveFileRequestUrl(siteUrl, sourcePath, targetPath);
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_MOVE', ISSUANCE_LIBRARY_TITLE, {
      sourcePath,
      targetPath
    });
    return requestUrl;
  }

  private async moveFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourcePath: string,
    targetPath: string
  ): Promise<string> {
    const requestUrl = buildMoveFolderRequestUrl(siteUrl, sourcePath, targetPath);
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_MOVE', ISSUANCE_LIBRARY_TITLE, {
      sourcePath,
      targetPath
    });
    return requestUrl;
  }

  private async archiveOldDocumentsIntoExpired(
    siteUrl: string,
    context: IIssuancePublishContext,
    release: IVanBanItem,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<string> {
    const folderOldId = Number(release.IDFolderOld || 0);
    const tenVanBan = sanitizeSharePointFolderName((release.Tenvanban || '').trim());

    if (!folderOldId || folderOldId <= 0) {
      throw new Error('Yêu cầu điều chỉnh thiếu IDFolderOld để archive văn bản cũ.');
    }

    if (!tenVanBan) {
      throw new Error('Yêu cầu điều chỉnh thiếu tên văn bản để tạo thư mục Expired.');
    }

    const documentFolderPath = await this.resolveFolderPathByListItemId(siteUrl, context, folderOldId);
    const expiredFolderName = buildExpiredFolderName(tenVanBan);
    const expiredFolderPath = joinServerRelativePath(documentFolderPath, expiredFolderName);

    try {
      if (await this.folderExists(siteUrl, context, expiredFolderPath)) {
        throw new Error(`Thư mục Expired đã tồn tại: ${expiredFolderName}`);
      }

      const createExpiredFolderUrl = await this.createFolder(siteUrl, context, expiredFolderPath, ISSUANCE_LIBRARY_TITLE);

      const children = await this.listFolderChildren(siteUrl, context, documentFolderPath);
      const itemsToMove = children.filter(item => item.name !== expiredFolderName);
      const movedItems: Array<{ name: string; sourcePath: string; targetPath: string; isFolder: boolean }> = [];

      await runInChunks(itemsToMove, async (child) => {
        const targetPath = joinServerRelativePath(expiredFolderPath, child.name);
        const requestUrl = child.isFolder
          ? buildMoveFolderRequestUrl(siteUrl, child.serverRelativeUrl, targetPath)
          : buildMoveFileRequestUrl(siteUrl, child.serverRelativeUrl, targetPath);

        try {
          if (child.isFolder) {
            await this.moveFolder(siteUrl, context, child.serverRelativeUrl, targetPath);
          } else {
            await this.moveFile(siteUrl, context, child.serverRelativeUrl, targetPath);
          }

          movedItems.push({
            name: child.name,
            sourcePath: child.serverRelativeUrl,
            targetPath,
            isFolder: child.isFolder
          });

          await auditLogger.logMoveFile(
            {
              fileName: child.name,
              sourcePath: child.serverRelativeUrl,
              targetPath
            },
            'success',
            undefined,
            requestUrl
          );
        } catch (error) {
          await auditLogger.logMoveFile(
            {
              fileName: child.name,
              sourcePath: child.serverRelativeUrl,
              targetPath
            },
            'failed',
            error instanceof Error ? error.message : String(error),
            requestUrl
          );
          throw error;
        }
      });

      // New version HieuLucTu = publish date; old version ends the day before.
      const expiredEndDate = dayBeforeLocal();
      const dateFieldOrder = await resolveSiteDateFieldOrder(siteUrl, context.spHttpClient);
      const expiredEndDateFieldValue = toSharePointDateOnlyFieldValue(expiredEndDate, dateFieldOrder);
      const expiredEndDateVi = formatDateOnlyVi(toSharePointDateOnlyIso(expiredEndDate));
      const stampResult = await this.stampExpiredArchiveHieuLucDen(
        siteUrl,
        context,
        expiredFolderPath,
        expiredEndDateFieldValue,
        auditLogger,
        { pollIfEmpty: itemsToMove.length > 0 }
      );

      // Khoá hoàn toàn quyền xem thư mục Expired: break kế thừa, không cấp lại quyền cho ai —
      // chỉ Site Collection Administrator (luôn bỏ qua permission item-level) mới xem được.
      const expiredFolderListItemId = await this.resolveFolderListItemId(siteUrl, context, expiredFolderPath);
      await this.breakItemRoleInheritance(siteUrl, context, ISSUANCE_LIBRARY_TITLE, expiredFolderListItemId);

      await auditLogger.logArchiveOldFolder(
        {
          idFolderOld: folderOldId,
          documentFolderPath,
          expiredFolderPath,
          movedCount: movedItems.length,
          expiredEndDateVi,
          stampedCount: stampResult.stampedCount,
          skippedCount: stampResult.skippedCount
        },
        'success',
        undefined,
        createExpiredFolderUrl
      );

      return expiredFolderPath;
    } catch (error) {
      await auditLogger.logArchiveOldFolder(
        {
          idFolderOld: folderOldId,
          documentFolderPath,
          expiredFolderPath
        },
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private async resolveReaderRoleDefinitionId(
    siteUrl: string,
    context: IIssuancePublishContext
  ): Promise<number> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/roledefinitions/getByType(2)?$select=Id`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as { Id?: number };
    const roleDefId = data.Id || 0;

    if (!roleDefId) {
      throw new Error('Không xác định được Role Definition Read trên site.');
    }

    return roleDefId;
  }

  private async breakItemRoleInheritance(
    siteUrl: string,
    context: IIssuancePublishContext,
    listTitle: string,
    itemId: number
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(listTitle)}')/items(${itemId})/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_UPDATE', listTitle);
  }

  private async grantItemReadToGroup(
    siteUrl: string,
    context: IIssuancePublishContext,
    listTitle: string,
    itemId: number,
    principalId: number,
    roleDefId: number
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(listTitle)}')/items(${itemId})/roleassignments/addroleassignment(principalid=${principalId},roleDefId=${roleDefId})`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_UPDATE', listTitle);
  }

  private async stampFormFileMetadata(
    siteUrl: string,
    context: IIssuancePublishContext,
    listItemId: number,
    metadataValues: IListFormValue[],
    auditLogger: BanHanhPublishAuditLogger,
    auditLabel: { fileName: string; targetPath: string }
  ): Promise<void> {
    const bieuMauMetadataValues = [...metadataValues, { FieldName: 'IsBieuMau', FieldValue: '1' }];

    try {
      await this.stampListItemMetadata(
        siteUrl,
        context,
        ISSUANCE_LIBRARY_TITLE,
        listItemId,
        bieuMauMetadataValues,
        auditLogger,
        { ...auditLabel, isFormAttachment: true }
      );
    } catch (error) {
      const details = error instanceof Error ? error.message : '';

      if (!/IsBieuMau/i.test(details)) {
        throw error;
      }

      // Cột IsBieuMau có thể chưa tồn tại — vẫn ghi các field metadata còn lại.
      await this.stampListItemMetadata(
        siteUrl,
        context,
        ISSUANCE_LIBRARY_TITLE,
        listItemId,
        metadataValues,
        auditLogger,
        { ...auditLabel, isFormAttachment: true }
      );
    }
  }

  private async copyJobsInChunks(
    siteUrl: string,
    context: IIssuancePublishContext,
    jobs: ReadonlyArray<IIssuanceCopyJob>,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    await runInChunks(jobs, async (job) => {
      const requestUrl = buildCopyToRequestUrl(siteUrl, job.sourcePath, job.targetPath);
      const payload: Record<string, unknown> = {
        fileName: job.fileName,
        sourcePath: job.sourcePath,
        targetPath: job.targetPath
      };

      if (job.isFormAttachment) {
        payload.isFormAttachment = true;
      }

      try {
        await this.copyFile(siteUrl, context, job.sourcePath, job.targetPath);
        await auditLogger.logCopyFile(payload, 'success', undefined, requestUrl);
      } catch (error) {
        await auditLogger.logCopyFile(
          payload,
          'failed',
          error instanceof Error ? error.message : String(error),
          requestUrl
        );
        throw error;
      }
    });
  }

  private async ensureCopyParentFolders(
    siteUrl: string,
    context: IIssuancePublishContext,
    targetFolderPath: string,
    jobs: ReadonlyArray<IIssuanceCopyJob>
  ): Promise<void> {
    const uniqueParents: string[] = [];
    const seen: Record<string, boolean> = {};
    const rootKey = normalizeFileRefKey(targetFolderPath);

    for (let index = 0; index < jobs.length; index += 1) {
      const targetPath = normalizeServerRelativePath(jobs[index].targetPath);
      const lastSlashIndex = targetPath.lastIndexOf('/');

      if (lastSlashIndex <= 0) {
        continue;
      }

      const parentPath = targetPath.substring(0, lastSlashIndex);
      const parentKey = normalizeFileRefKey(parentPath);

      if (parentKey === rootKey || seen[parentKey]) {
        continue;
      }

      seen[parentKey] = true;
      uniqueParents.push(parentPath);
    }

    uniqueParents.sort((left, right) => splitRelativePath(left).length - splitRelativePath(right).length);

    for (let index = 0; index < uniqueParents.length; index += 1) {
      const relativePath = this.resolveRelativePathFromSourceRoot(targetFolderPath, uniqueParents[index]);

      if (!relativePath) {
        continue;
      }

      await this.ensureFolderPath(
        siteUrl,
        context,
        targetFolderPath,
        relativePath,
        ISSUANCE_LIBRARY_TITLE
      );
    }
  }

  private async stampAndSecureFormFile(
    siteUrl: string,
    context: IIssuancePublishContext,
    job: IIssuanceCopyJob,
    listItemId: number,
    metadataValues: IListFormValue[],
    roleGroupId: number,
    readerRoleDefId: number,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    await this.stampFormFileMetadata(siteUrl, context, listItemId, metadataValues, auditLogger, {
      fileName: job.fileName,
      targetPath: job.targetPath
    });

    await this.breakItemRoleInheritance(siteUrl, context, ISSUANCE_LIBRARY_TITLE, listItemId);
    await this.grantItemReadToGroup(
      siteUrl,
      context,
      ISSUANCE_LIBRARY_TITLE,
      listItemId,
      roleGroupId,
      readerRoleDefId
    );
  }

  private buildFormCopyJobs(
    formFiles: ReadonlyArray<ISharePointFileItem>,
    targetFolderPath: string
  ): IIssuanceCopyJob[] {
    const jobs: IIssuanceCopyJob[] = [];

    for (let index = 0; index < formFiles.length; index += 1) {
      const formFile = formFiles[index];
      const sourcePath = resolveFileServerRelativePath(formFile);
      const fileName = (formFile.FileLeafRef || '').trim();

      if (!sourcePath || !fileName) {
        continue;
      }

      jobs.push({
        itemId: formFile.Id,
        fileName,
        sourcePath,
        targetPath: joinServerRelativePath(targetFolderPath, fileName),
        isFormAttachment: true
      });
    }

    return jobs;
  }

  private async copyFormFiles(
    siteUrl: string,
    context: IIssuancePublishContext,
    jobs: ReadonlyArray<IIssuanceCopyJob>,
    targetFolderPath: string,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    await this.ensureCopyParentFolders(siteUrl, context, targetFolderPath, jobs);
    await this.copyJobsInChunks(siteUrl, context, jobs, auditLogger);
  }

  private async secureFormFiles(
    siteUrl: string,
    context: IIssuancePublishContext,
    jobs: ReadonlyArray<IIssuanceCopyJob>,
    targetFolderPath: string,
    idByPath: Record<string, number>,
    metadataValues: IListFormValue[],
    roleGroupId: number,
    readerRoleDefId: number,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    if (jobs.length === 0) {
      return;
    }

    try {
      await runInChunks(jobs, async (job) => {
        const listItemId = idByPath[job.targetPath];

        if (!listItemId) {
          throw new Error(`Không xác định được list item id cho file ${job.targetPath}.`);
        }

        await this.stampAndSecureFormFile(
          siteUrl,
          context,
          job,
          listItemId,
          metadataValues,
          roleGroupId,
          readerRoleDefId,
          auditLogger
        );
      });

      await auditLogger.logSecureFormFolder(
        {
          targetFolderPath,
          roleGroupID: roleGroupId,
          fileCount: jobs.length
        },
        'success'
      );
    } catch (error) {
      await auditLogger.logSecureFormFolder(
        {
          targetFolderPath,
          roleGroupID: roleGroupId
        },
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private resolveRelativePathFromSourceRoot(sourceRootPath: string, filePath: string): string {
    const normalizedRoot = normalizeServerRelativePath(sourceRootPath).toLowerCase();
    const normalizedFilePath = normalizeServerRelativePath(filePath);
    const normalizedFileLower = normalizedFilePath.toLowerCase();

    if (normalizedFileLower.indexOf(`${normalizedRoot}/`) !== 0 && normalizedFileLower !== normalizedRoot) {
      throw new Error(`File ${filePath} không thuộc thư mục nguồn ${sourceRootPath}.`);
    }

    if (normalizedFileLower === normalizedRoot) {
      return '';
    }

    return normalizedFilePath.substring(normalizedRoot.length + 1);
  }

  public async publishTaoMoi(
    context: IIssuancePublishContext,
    release: IVanBanItem,
    mainDocumentId: number,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<IIssuancePublishResult> {
    const idYeuCau = (release.IdYeuCau || '').trim();

    if (!idYeuCau) {
      throw new Error('Yêu cầu chưa có mã IdYeuCau.');
    }

    if (!mainDocumentId || mainDocumentId <= 0) {
      throw new Error('Vui lòng chọn văn bản chính.');
    }

    const thuMucBanHanh = (release.ThuMucBanHanh || '').trim();
    const tenVanBanFolder = sanitizeSharePointFolderName((release.Tenvanban || '').trim());

    if (!thuMucBanHanh) {
      throw new Error('Yêu cầu chưa có thư mục ban hành.');
    }

    if (!tenVanBanFolder) {
      throw new Error('Yêu cầu chưa có tên văn bản để tạo thư mục đích.');
    }

    const candidates = getCandidateSiteUrls(context);

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];
      let progressedOnSite = false;

      try {
        const [attachmentRoot, issuanceRoot] = await Promise.all([
          this.getLibraryRootFolder(siteUrl, context, ATTACHMENT_LIBRARY_TITLE),
          this.getLibraryRootFolder(siteUrl, context, ISSUANCE_LIBRARY_TITLE)
        ]);
        const sourceFolderName = resolveDocumentFolderName(idYeuCau);
        const sourceFolderPath = joinServerRelativePath(attachmentRoot, sourceFolderName);
        const targetRelativePath = `${thuMucBanHanh}/${tenVanBanFolder}`;
        const sourceFiles = await this.listAttachmentFiles(siteUrl, context, sourceFolderPath);
        const attachmentFilesUrl = buildAttachmentFilesRequestUrl(siteUrl, sourceFolderPath);

        if (sourceFiles.length === 0) {
          throw new Error('Không tìm thấy file đính kèm để chuyển sang thư viện ban hành.');
        }

        await this.assertMainDocumentInRequest(sourceFiles, mainDocumentId, auditLogger, attachmentFilesUrl);
        progressedOnSite = true;

        const archiveTask = isDieuChinhPublishRequest(release)
          ? this.archiveOldDocumentsIntoExpired(siteUrl, context, release, auditLogger)
          : Promise.resolve(undefined as string | undefined);

        const restTask = (async (): Promise<{
          targetFolderPath: string;
          mainFileServerRelativePath: string;
          folderListItemId: number;
        }> => {
          let targetFolderPath = '';
          try {
            const ensuredFolder = await this.ensureFolderPath(
              siteUrl,
              context,
              issuanceRoot,
              targetRelativePath,
              ISSUANCE_LIBRARY_TITLE
            );
            targetFolderPath = ensuredFolder.folderPath;

            await auditLogger.logCreateTargetFolder(
              {
                targetFolderPath
              },
              'success',
              undefined,
              ensuredFolder.requestUrl
            );
          } catch (error) {
            await auditLogger.logCreateTargetFolder(
              {
                targetRelativePath
              },
              'failed',
              error instanceof Error ? error.message : String(error)
            );
            throw error;
          }

          const draftJobs: IIssuanceCopyJob[] = [];
          const formFiles: ISharePointFileItem[] = [];
          let mainFileServerRelativePath = '';

          for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
            const fileItem = sourceFiles[fileIndex];
            const sourcePath = resolveFileServerRelativePath(fileItem);
            const fileName = (fileItem.FileLeafRef || '').trim();

            if (!sourcePath || !fileName) {
              continue;
            }

            if (fileItem.IsBieuMau === true) {
              formFiles.push(fileItem);
              continue;
            }

            const relativePath = this.resolveRelativePathFromSourceRoot(sourceFolderPath, sourcePath);
            const targetPath = relativePath
              ? joinServerRelativePath(targetFolderPath, relativePath)
              : joinServerRelativePath(targetFolderPath, fileName);

            draftJobs.push({
              itemId: fileItem.Id,
              fileName,
              sourcePath,
              targetPath
            });

            if (fileItem.Id === mainDocumentId) {
              mainFileServerRelativePath = targetPath;
            }
          }

          if (!mainFileServerRelativePath) {
            throw new Error('Không xác định được đường dẫn văn bản chính sau khi copy file.');
          }

          const formJobs = this.buildFormCopyJobs(formFiles, targetFolderPath);
          let roleGroupId = 0;

          if (formJobs.length > 0) {
            roleGroupId = parseInt((context.roleGroupID || '').trim(), 10);

            if (!roleGroupId || roleGroupId <= 0) {
              throw new Error('Chưa cấu hình roleGroupID để gán quyền Read cho file Biểu Mẫu.');
            }
          }

          const copyDraftTask = (async (): Promise<void> => {
            await this.ensureCopyParentFolders(siteUrl, context, targetFolderPath, draftJobs);
            await this.copyJobsInChunks(siteUrl, context, draftJobs, auditLogger);
          })();
          const copyFormTask = this.copyFormFiles(siteUrl, context, formJobs, targetFolderPath, auditLogger);
          const readerRoleTask = formJobs.length > 0
            ? this.resolveReaderRoleDefinitionId(siteUrl, context)
            : Promise.resolve(0);
          const dateFieldTask = resolveSiteDateFieldOrder(siteUrl, context.spHttpClient);

          const [, , readerRoleDefId, metadataDateFieldOrder] = await Promise.all([
            copyDraftTask,
            copyFormTask,
            readerRoleTask,
            dateFieldTask
          ]);

          const copiedTargetPaths: string[] = [];
          for (let jobIndex = 0; jobIndex < draftJobs.length; jobIndex += 1) {
            copiedTargetPaths.push(draftJobs[jobIndex].targetPath);
          }
          for (let jobIndex = 0; jobIndex < formJobs.length; jobIndex += 1) {
            copiedTargetPaths.push(formJobs[jobIndex].targetPath);
          }

          const idByPath = await this.resolveCopiedListItemIds(
            siteUrl,
            context,
            targetFolderPath,
            copiedTargetPaths
          );
          const metadataValues = buildIssuanceMetadataValues(release, metadataDateFieldOrder);

          const stampDraftTask = runInChunks(draftJobs, async (job) => {
            const listItemId = idByPath[job.targetPath];

            if (!listItemId) {
              throw new Error(`Không xác định được list item id cho file ${job.targetPath}.`);
            }

            await this.stampListItemMetadata(
              siteUrl,
              context,
              ISSUANCE_LIBRARY_TITLE,
              listItemId,
              metadataValues,
              auditLogger,
              {
                fileName: job.fileName,
                targetPath: job.targetPath
              }
            );
          });
          const stampFolderTask = this.stampDocumentFolderMetadata(
            siteUrl,
            context,
            targetFolderPath,
            metadataValues,
            auditLogger
          );
          const secureFormTask = this.secureFormFiles(
            siteUrl,
            context,
            formJobs,
            targetFolderPath,
            idByPath,
            metadataValues,
            roleGroupId,
            readerRoleDefId,
            auditLogger
          );

          const [, folderListItemId] = await Promise.all([
            stampDraftTask,
            stampFolderTask,
            secureFormTask
          ]);

          return {
            targetFolderPath,
            mainFileServerRelativePath,
            folderListItemId
          };
        })();

        const [expiredFolderServerRelativePath, rest] = await Promise.all([archiveTask, restTask]);

        return {
          siteUrl,
          mainFileServerRelativePath: rest.mainFileServerRelativePath,
          folderServerRelativePath: rest.targetFolderPath,
          folderListItemId: rest.folderListItemId,
          expiredFolderServerRelativePath
        };
      } catch (error) {
        lastError = error;
        if (progressedOnSite) {
          throw error;
        }
      }
    }

    throw lastError || new Error('Unable to publish issuance documents.');
  }
}

export const phvbIssuancePublishService = new PhvbIssuancePublishService();

export function isTaoMoiPublishRequest(release: IVanBanItem): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Tạo mới';
}

export function isDieuChinhPublishRequest(release: IVanBanItem): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Điều chỉnh';
}

export function isFullIssuancePublishRequest(release: IVanBanItem): boolean {
  return isTaoMoiPublishRequest(release) || isDieuChinhPublishRequest(release);
}

export function parseStoredMainDocumentId(value: number | string | undefined): number | undefined {
  const parsed = Number(value);

  if (!parsed || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export function resolveMainDocumentId(
  attachments: ReadonlyArray<IAttachmentLibraryItem>,
  preferredId?: number,
  storedId?: number
): number | undefined {
  const preferred = parseStoredMainDocumentId(preferredId);
  if (preferred && !validateMainDocumentCandidate(attachments, preferred)) {
    return preferred;
  }

  const stored = parseStoredMainDocumentId(storedId);
  if (stored && !validateMainDocumentCandidate(attachments, stored)) {
    return stored;
  }

  return undefined;
}

export function validateMainDocumentCandidate(
  attachments: ReadonlyArray<IAttachmentLibraryItem>,
  mainDocumentId?: number
): string | undefined {
  if (!mainDocumentId || mainDocumentId <= 0) {
    return 'Vui lòng chọn văn bản chính.';
  }

  const normalizedId = mainDocumentId;

  for (let index = 0; index < attachments.length; index += 1) {
    const item = attachments[index];

    if (item.id === normalizedId && !item.isFormAttachment) {
      return undefined;
    }
  }

  return 'Văn bản chính phải là tài liệu dự thảo hợp lệ.';
}
