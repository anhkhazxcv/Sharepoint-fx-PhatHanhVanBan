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
import { isFormAttachmentPath } from '../utils/PhvbMagRecentPublished.utils';
import { buildIssuanceMetadataValues, buildMetadataAuditFields, type IListFormValue } from '../utils/PhvbMagIssuanceMetadata.utils';
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

const DEFAULT_COPY_POLL_TIMEOUT_MS = 15000;
const DEFAULT_COPY_POLL_INTERVAL_MS = 400;
const FORM_FILE_PUBLISH_CHUNK_SIZE = 4;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  ): Promise<void> {
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
      return;
    }

    const details = await response.clone().text();
    if (response.status === 409 || /already exists/i.test(details)) {
      return;
    }

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_CREATE', libraryTitle);
  }

  private async ensureFolderPath(
    siteUrl: string,
    context: IIssuancePublishContext,
    libraryRootPath: string,
    relativePath: string,
    libraryTitle: string
  ): Promise<string> {
    const segments = splitRelativePath(relativePath);
    let currentPath = libraryRootPath;

    for (let index = 0; index < segments.length; index += 1) {
      currentPath = joinServerRelativePath(currentPath, segments[index]);
      const exists = await this.folderExists(siteUrl, context, currentPath);

      if (!exists) {
        await this.createFolder(siteUrl, context, currentPath, libraryTitle);
      }
    }

    return currentPath;
  }

  private async listAttachmentFiles(
    siteUrl: string,
    context: IIssuancePublishContext,
    idYeuCau: string
  ): Promise<ISharePointFileItem[]> {
    const filterValue = escapeODataValue(idYeuCau);
    const filter = `IDYeuCau eq '${filterValue}' and FSObjType eq 0`;
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items?$select=${ATTACHMENT_SELECT_FIELDS.join(',')}&$filter=${encodeURIComponent(filter)}&$top=500&$orderby=Modified desc`;
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
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(libraryTitle)}')/items(${listItemId})/ValidateUpdateListItem`;
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
  }

  private async assertMainDocumentInRequest(
    siteUrl: string,
    context: IIssuancePublishContext,
    idYeuCau: string,
    mainDocumentId: number,
    auditLogger?: BanHanhPublishAuditLogger
  ): Promise<ISharePointFileItem> {
    const sourceFiles = await this.listAttachmentFiles(siteUrl, context, idYeuCau);
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
            library: ATTACHMENT_LIBRARY_TITLE,
            itemId: mainDocumentId,
            fileCount: sourceFiles.length,
            field: 'IdVanBanChinh'
          },
          'failed',
          errorMessage
        );
      }

      throw new Error(errorMessage);
    }

    if (auditLogger) {
      await auditLogger.logMarkMainDocument(
        {
          library: ATTACHMENT_LIBRARY_TITLE,
          itemId: mainDocumentId,
          fileName: item.FileLeafRef || '',
          field: 'IdVanBanChinh'
        },
        'success'
      );
    }

    return item;
  }

  private async copyFile(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@fileUrl)/copyTo(strnewurl=@newUrl,boverwrite=true)?${buildODataParameterQuery({
      '@fileUrl': sourcePath,
      '@newUrl': targetPath
    })}`;
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
    const intervalMs = options.intervalMs ?? DEFAULT_COPY_POLL_INTERVAL_MS;
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
    const auditPayload: Record<string, unknown> = {
      targetPath: auditLabel.targetPath,
      fields: buildMetadataAuditFields(metadataValues)
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
      await auditLogger.logUpdateMetadata(auditPayload, 'success');
    } catch (error) {
      await auditLogger.logUpdateMetadata(
        {
          ...auditPayload,
          fields: metadataValues
        },
        'failed',
        error instanceof Error ? error.message : String(error)
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

  private async listFilesRecursive(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<Array<{ name: string; serverRelativeUrl: string }>> {
    const files = await this.listFilesInFolder(siteUrl, context, folderPath);
    const folders = await this.listFoldersInFolder(siteUrl, context, folderPath);
    const nested: Array<{ name: string; serverRelativeUrl: string }> = [];

    for (let index = 0; index < folders.length; index += 1) {
      const nestedFiles = await this.listFilesRecursive(siteUrl, context, folders[index].serverRelativeUrl);
      for (let nestedIndex = 0; nestedIndex < nestedFiles.length; nestedIndex += 1) {
        nested.push(nestedFiles[nestedIndex]);
      }
    }

    return files.concat(nested);
  }

  private async stampExpiredArchiveHieuLucDen(
    siteUrl: string,
    context: IIssuancePublishContext,
    expiredFolderPath: string,
    expiredEndDateFieldValue: string
  ): Promise<{ stampedCount: number; skippedCount: number; stampedPaths: string[]; skippedPaths: string[] }> {
    const files = await this.listFilesRecursive(siteUrl, context, expiredFolderPath);
    let stampedCount = 0;
    let skippedCount = 0;
    const stampedPaths: string[] = [];
    const skippedPaths: string[] = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const fields = await this.resolveFileListItemFields(siteUrl, context, file.serverRelativeUrl);
      const currentStatus = resolveLibraryDocumentEffectiveStatus(undefined, fields.hieuLucDen);

      if (currentStatus === 'expired') {
        skippedCount += 1;
        skippedPaths.push(file.serverRelativeUrl);
        continue;
      }

      await this.validateUpdateListItem(
        siteUrl,
        context,
        ISSUANCE_LIBRARY_TITLE,
        fields.id,
        [{ FieldName: 'HieuLucDen', FieldValue: expiredEndDateFieldValue }]
      );

      stampedCount += 1;
      stampedPaths.push(file.serverRelativeUrl);
    }

    return { stampedCount, skippedCount, stampedPaths, skippedPaths };
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
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@fileUrl)/moveto(newurl=@newUrl,flags=1)?${buildODataParameterQuery({
      '@fileUrl': sourcePath,
      '@newUrl': targetPath
    })}`;
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
  }

  private async moveFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderUrl)/moveto(newUrl=@newUrl)?${buildODataParameterQuery({
      '@folderUrl': sourcePath,
      '@newUrl': targetPath
    })}`;
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

      await this.createFolder(siteUrl, context, expiredFolderPath, ISSUANCE_LIBRARY_TITLE);

      const children = await this.listFolderChildren(siteUrl, context, documentFolderPath);
      const itemsToMove = children.filter(item => item.name !== expiredFolderName);
      const movedItems: Array<{ name: string; sourcePath: string; targetPath: string; isFolder: boolean }> = [];

      for (let index = 0; index < itemsToMove.length; index += 1) {
        const child = itemsToMove[index];
        const targetPath = joinServerRelativePath(expiredFolderPath, child.name);

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
      }

      // New version HieuLucTu = publish date; old version ends the day before.
      const expiredEndDate = dayBeforeLocal();
      const dateFieldOrder = await resolveSiteDateFieldOrder(siteUrl, context.spHttpClient);
      const expiredEndDateFieldValue = toSharePointDateOnlyFieldValue(expiredEndDate, dateFieldOrder);
      const expiredEndDateVi = formatDateOnlyVi(toSharePointDateOnlyIso(expiredEndDate));
      const stampResult = await this.stampExpiredArchiveHieuLucDen(
        siteUrl,
        context,
        expiredFolderPath,
        expiredEndDateFieldValue
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
          movedItems,
          expiredEndDateVi,
          stampedCount: stampResult.stampedCount,
          skippedCount: stampResult.skippedCount,
          stampedPaths: stampResult.stampedPaths,
          skippedPaths: stampResult.skippedPaths
        },
        'success'
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

  private async copySecureAndStampFormFile(
    siteUrl: string,
    context: IIssuancePublishContext,
    formFile: ISharePointFileItem,
    targetFolderPath: string,
    metadataValues: IListFormValue[],
    roleGroupId: number,
    readerRoleDefId: number,
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    const sourcePath = resolveFileServerRelativePath(formFile);
    const fileName = (formFile.FileLeafRef || '').trim();

    if (!sourcePath || !fileName) {
      return;
    }

    const targetPath = joinServerRelativePath(targetFolderPath, fileName);

    try {
      await this.copyFile(siteUrl, context, sourcePath, targetPath);
      const listItemId = await this.resolveMovedListItemId(siteUrl, context, targetPath);

      await this.stampFormFileMetadata(siteUrl, context, listItemId, metadataValues, auditLogger, {
        fileName,
        targetPath
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

      await auditLogger.logCopyFile(
        {
          itemId: formFile.Id,
          fileName,
          sourcePath,
          targetPath,
          isFormAttachment: true
        },
        'success'
      );
    } catch (error) {
      await auditLogger.logCopyFile(
        {
          itemId: formFile.Id,
          fileName,
          sourcePath,
          targetPath,
          isFormAttachment: true
        },
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private async copyAndSecureFormFiles(
    siteUrl: string,
    context: IIssuancePublishContext,
    formFiles: ISharePointFileItem[],
    targetFolderPath: string,
    metadataValues: IListFormValue[],
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<void> {
    if (formFiles.length === 0) {
      return;
    }

    const roleGroupId = parseInt((context.roleGroupID || '').trim(), 10);

    if (!roleGroupId || roleGroupId <= 0) {
      throw new Error('Chưa cấu hình roleGroupID để gán quyền Read cho file Biểu Mẫu.');
    }

    try {
      const readerRoleDefId = await this.resolveReaderRoleDefinitionId(siteUrl, context);

      for (let index = 0; index < formFiles.length; index += FORM_FILE_PUBLISH_CHUNK_SIZE) {
        const chunk = formFiles.slice(index, index + FORM_FILE_PUBLISH_CHUNK_SIZE);

        await Promise.all(
          chunk.map(formFile =>
            this.copySecureAndStampFormFile(
              siteUrl,
              context,
              formFile,
              targetFolderPath,
              metadataValues,
              roleGroupId,
              readerRoleDefId,
              auditLogger
            )
          )
        );
      }

      await auditLogger.logSecureFormFolder(
        {
          targetFolderPath,
          roleGroupID: roleGroupId,
          fileCount: formFiles.length
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
        const attachmentRoot = await this.getLibraryRootFolder(siteUrl, context, ATTACHMENT_LIBRARY_TITLE);
        const issuanceRoot = await this.getLibraryRootFolder(siteUrl, context, ISSUANCE_LIBRARY_TITLE);
        const sourceFolderName = resolveDocumentFolderName(idYeuCau);
        const sourceFolderPath = joinServerRelativePath(attachmentRoot, sourceFolderName);
        const targetRelativePath = `${thuMucBanHanh}/${tenVanBanFolder}`;

        await this.assertMainDocumentInRequest(siteUrl, context, idYeuCau, mainDocumentId, auditLogger);
        progressedOnSite = true;

        let expiredFolderServerRelativePath: string | undefined;

        if (isDieuChinhPublishRequest(release)) {
          expiredFolderServerRelativePath = await this.archiveOldDocumentsIntoExpired(
            siteUrl,
            context,
            release,
            auditLogger
          );
        }

        let targetFolderPath = '';
        try {
          targetFolderPath = await this.ensureFolderPath(
            siteUrl,
            context,
            issuanceRoot,
            targetRelativePath,
            ISSUANCE_LIBRARY_TITLE
          );

          await auditLogger.logCreateTargetFolder(
            {
              targetFolderPath,
              targetRelativePath,
              created: true
            },
            'success'
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

        const sourceFiles = await this.listAttachmentFiles(siteUrl, context, idYeuCau);

        if (sourceFiles.length === 0) {
          throw new Error('Không tìm thấy file đính kèm để chuyển sang thư viện ban hành.');
        }

        const metadataDateFieldOrder = await resolveSiteDateFieldOrder(siteUrl, context.spHttpClient);
        const metadataValues = buildIssuanceMetadataValues(release, metadataDateFieldOrder);
        let mainFileServerRelativePath = '';
        const copiedFiles: Array<{ itemId: number; fileName: string; targetPath: string; listItemId: number }> = [];
        const formFiles: ISharePointFileItem[] = [];

        for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
          const fileItem = sourceFiles[fileIndex];
          const sourcePath = resolveFileServerRelativePath(fileItem);
          const fileName = (fileItem.FileLeafRef || '').trim();

          if (!sourcePath || !fileName) {
            continue;
          }

          const fileDirRef = (fileItem.FileDirRef || '').trim();
          if (fileItem.IsBieuMau === true || isFormAttachmentPath(fileDirRef)) {
            formFiles.push(fileItem);
            continue;
          }

          const relativePath = this.resolveRelativePathFromSourceRoot(sourceFolderPath, sourcePath);
          const targetPath = relativePath
            ? joinServerRelativePath(targetFolderPath, relativePath)
            : joinServerRelativePath(targetFolderPath, fileName);

          try {
            await this.copyFile(siteUrl, context, sourcePath, targetPath);

            const listItemId = await this.resolveMovedListItemId(siteUrl, context, targetPath);
            copiedFiles.push({
              itemId: fileItem.Id,
              fileName,
              targetPath,
              listItemId
            });

            await auditLogger.logCopyFile(
              {
                itemId: fileItem.Id,
                fileName,
                sourcePath,
                targetPath
              },
              'success'
            );

            if (fileItem.Id === mainDocumentId) {
              mainFileServerRelativePath = targetPath;
            }
          } catch (error) {
            await auditLogger.logCopyFile(
              {
                itemId: fileItem.Id,
                fileName,
                sourcePath,
                targetPath
              },
              'failed',
              error instanceof Error ? error.message : String(error)
            );
            throw error;
          }
        }

        if (!mainFileServerRelativePath) {
          throw new Error('Không xác định được đường dẫn văn bản chính sau khi copy file.');
        }

        for (let copiedIndex = 0; copiedIndex < copiedFiles.length; copiedIndex += 1) {
          const copiedFile = copiedFiles[copiedIndex];

          await this.stampListItemMetadata(
            siteUrl,
            context,
            ISSUANCE_LIBRARY_TITLE,
            copiedFile.listItemId,
            metadataValues,
            auditLogger,
            {
              fileName: copiedFile.fileName,
              targetPath: copiedFile.targetPath
            }
          );
        }

        const folderListItemId = await this.stampDocumentFolderMetadata(
          siteUrl,
          context,
          targetFolderPath,
          metadataValues,
          auditLogger
        );

        await this.copyAndSecureFormFiles(
          siteUrl,
          context,
          formFiles,
          targetFolderPath,
          metadataValues,
          auditLogger
        );

        return {
          siteUrl,
          mainFileServerRelativePath,
          folderServerRelativePath: targetFolderPath,
          folderListItemId,
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
