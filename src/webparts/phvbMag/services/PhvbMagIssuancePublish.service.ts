import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import {
  ATTACHMENT_FORM_SUBFOLDER,
  ATTACHMENT_LIBRARY_TITLE,
  ISSUANCE_LIBRARY_TITLE
} from '../config/PhvbMag.configuration';
import { escapeODataValue, getCandidateSiteUrls, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { ensureSharePointResponseOk } from '../infrastructure/SharePointHttp.utils';
import type { IAttachmentLibraryItem, IPhvbSiteContext, IVanBanItem } from '../models/PhvbMag.models';
import { resolveLibraryDocumentEffectiveStatus } from '../utils/PhvbMagLibrary.utils';
import { isFormAttachmentPath } from '../utils/PhvbMagRecentPublished.utils';
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
  LoaiVanBan?: string;
}

interface IIssuancePublishResult {
  siteUrl: string;
  mainFileServerRelativePath: string;
  folderServerRelativePath: string;
  expiredFolderServerRelativePath?: string;
}

interface IFolderChildItem {
  name: string;
  serverRelativeUrl: string;
  isFolder: boolean;
}

interface IListFormValue {
  FieldName: string;
  FieldValue: string;
}

function buildMetadataAuditFields(metadataValues: IListFormValue[]): Record<string, string> {
  return {
    TomTatVanban: metadataValues[0].FieldValue,
    NgayPhatHanh: metadataValues[1].FieldValue,
    HieuLucTu: metadataValues[2].FieldValue,
    HieuLucDen: metadataValues[3].FieldValue,
    LienHe: metadataValues[4].FieldValue
  };
}

const MAIN_DOCUMENT_LOAI_VAN_BAN = 'chinh';

const ATTACHMENT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'FileLeafRef',
  'FileRef',
  'FileDirRef',
  'FSObjType',
  'LoaiVanBan'
];

function buildODataParameterQuery(parameters: Record<string, string>): string {
  return Object.keys(parameters)
    .map(key => `${key}='${escapeODataValue(parameters[key])}'`)
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

function formatPublishDateVi(date: Date = new Date()): string {
  const dayValue = date.getDate();
  const monthValue = date.getMonth() + 1;
  const day = dayValue < 10 ? `0${dayValue}` : `${dayValue}`;
  const month = monthValue < 10 ? `0${monthValue}` : `${monthValue}`;

  return `${day}/${month}/${date.getFullYear()}`;
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

    const details = await response.text();
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
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items?$select=${ATTACHMENT_SELECT_FIELDS.join(',')}&$filter=${filter}&$top=500&$orderby=Modified desc`;
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
  }

  private async markMainDocument(
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
      throw new Error('Văn bản chính đã chọn không thuộc yêu cầu này.');
    }

    try {
      for (let index = 0; index < sourceFiles.length; index += 1) {
        const fileItem = sourceFiles[index];
        const currentLoai = (fileItem.LoaiVanBan || '').trim().toLowerCase();

        if (fileItem.Id === mainDocumentId || currentLoai !== MAIN_DOCUMENT_LOAI_VAN_BAN) {
          continue;
        }

        await this.validateUpdateListItem(siteUrl, context, ATTACHMENT_LIBRARY_TITLE, fileItem.Id, [
          { FieldName: 'LoaiVanBan', FieldValue: '' }
        ]);
      }

      await this.validateUpdateListItem(siteUrl, context, ATTACHMENT_LIBRARY_TITLE, mainDocumentId, [
        { FieldName: 'LoaiVanBan', FieldValue: MAIN_DOCUMENT_LOAI_VAN_BAN }
      ]);

      if (auditLogger) {
        await auditLogger.logMarkMainDocument(
          {
            library: ATTACHMENT_LIBRARY_TITLE,
            itemId: mainDocumentId,
            fileName: item.FileLeafRef || '',
            field: 'LoaiVanBan=chinh'
          },
          'success'
        );
      }
    } catch (error) {
      if (auditLogger) {
        await auditLogger.logMarkMainDocument(
          {
            library: ATTACHMENT_LIBRARY_TITLE,
            itemId: mainDocumentId,
            fileName: item.FileLeafRef || '',
            field: 'LoaiVanBan=chinh'
          },
          'failed',
          error instanceof Error ? error.message : String(error)
        );
      }
      throw error;
    }

    return item;
  }

  /**
   * Mark main document on VanBanGopYThamDinh (used by Admin prepare + SuperAdmin publish).
   */
  public async markMainDocumentForRequest(
    context: IIssuancePublishContext,
    idYeuCau: string,
    mainDocumentId: number,
    auditLogger?: BanHanhPublishAuditLogger
  ): Promise<void> {
    const candidates = getCandidateSiteUrls(context);

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      try {
        await this.markMainDocument(candidates[index], context, idYeuCau, mainDocumentId, auditLogger);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Không thể đánh dấu văn bản chính.');
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
    const fields = await this.resolveFileListItemFields(siteUrl, context, filePath);
    return fields.id;
  }

  private async resolveFileListItemFields(
    siteUrl: string,
    context: IIssuancePublishContext,
    filePath: string
  ): Promise<{ id: number; hieuLucDen?: string }> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@filePath)/ListItemAllFields?$select=Id,HieuLucDen&${buildODataParameterQuery({
      '@filePath': filePath
    })}`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_GET', ISSUANCE_LIBRARY_TITLE);
    const data = await response.json() as { Id?: number; HieuLucDen?: string };
    const listItemId = data.Id || 0;

    if (!listItemId) {
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
  ): Promise<void> {
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
    expiredEndDateVi: string
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
        [{ FieldName: 'HieuLucDen', FieldValue: expiredEndDateVi }]
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
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderUrl)/moveto(newUrl=@newUrl,flags=1)?${buildODataParameterQuery({
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
      const expiredEndDateVi = formatPublishDateVi(dayBeforeLocal());
      const stampResult = await this.stampExpiredArchiveHieuLucDen(
        siteUrl,
        context,
        expiredFolderPath,
        expiredEndDateVi
      );

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

  private async breakFolderRoleInheritance(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields/breakroleinheritance(copyRoleAssignments=false,clearSubscopes=true)?${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_UPDATE', ISSUANCE_LIBRARY_TITLE);
  }

  private async grantFolderReadToGroup(
    siteUrl: string,
    context: IIssuancePublishContext,
    folderPath: string,
    principalId: number,
    roleDefId: number
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields/roleassignments/addroleassignment(principalid=${principalId},roleDefId=${roleDefId})?${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureIssuanceResponseOk(response, requestUrl, context, 'SP_UPDATE', ISSUANCE_LIBRARY_TITLE);
  }

  private async copyAndSecureFormFolder(
    siteUrl: string,
    context: IIssuancePublishContext,
    sourceFolderPath: string,
    targetFolderPath: string,
    metadataValues: IListFormValue[],
    auditLogger: BanHanhPublishAuditLogger
  ): Promise<string | undefined> {
    const sourceFormFolderPath = joinServerRelativePath(sourceFolderPath, ATTACHMENT_FORM_SUBFOLDER);
    const sourceExists = await this.folderExists(siteUrl, context, sourceFormFolderPath);

    if (!sourceExists) {
      return undefined;
    }

    const targetFormFolderPath = joinServerRelativePath(targetFolderPath, ATTACHMENT_FORM_SUBFOLDER);
    const roleGroupId = parseInt((context.roleGroupID || '').trim(), 10);

    if (!roleGroupId || roleGroupId <= 0) {
      throw new Error('Chưa cấu hình roleGroupID để gán quyền Read cho thư mục Biểu Mẫu.');
    }

    try {
      await this.ensureFolderPath(
        siteUrl,
        context,
        targetFolderPath,
        ATTACHMENT_FORM_SUBFOLDER,
        ISSUANCE_LIBRARY_TITLE
      );

      const formFiles = await this.listFilesInFolder(siteUrl, context, sourceFormFolderPath);

      for (let index = 0; index < formFiles.length; index += 1) {
        const formFile = formFiles[index];
        const targetPath = joinServerRelativePath(targetFormFolderPath, formFile.name);
        await this.copyFile(siteUrl, context, formFile.serverRelativeUrl, targetPath);

        await auditLogger.logCopyFile(
          {
            itemId: 0,
            fileName: formFile.name,
            sourcePath: formFile.serverRelativeUrl,
            targetPath,
            isFormAttachment: true
          },
          'success'
        );

        const listItemId = await this.resolveMovedListItemId(siteUrl, context, targetPath);

        await this.stampListItemMetadata(
          siteUrl,
          context,
          ISSUANCE_LIBRARY_TITLE,
          listItemId,
          metadataValues,
          auditLogger,
          {
            fileName: formFile.name,
            targetPath,
            isFormAttachment: true
          }
        );
      }

      await this.breakFolderRoleInheritance(siteUrl, context, targetFormFolderPath);
      const readerRoleDefId = await this.resolveReaderRoleDefinitionId(siteUrl, context);
      await this.grantFolderReadToGroup(
        siteUrl,
        context,
        targetFormFolderPath,
        roleGroupId,
        readerRoleDefId
      );

      await auditLogger.logSecureFormFolder(
        {
          sourceFormFolderPath,
          targetFormFolderPath,
          roleGroupID: roleGroupId,
          fileCount: formFiles.length
        },
        'success'
      );

      return targetFormFolderPath;
    } catch (error) {
      await auditLogger.logSecureFormFolder(
        {
          sourceFormFolderPath,
          targetFormFolderPath,
          roleGroupID: roleGroupId
        },
        'failed',
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private buildIssuanceMetadata(release: IVanBanItem): IListFormValue[] {
    const publishDate = formatPublishDateVi();
    const contact = (release.NguoiTao || release.EmailNguoiTao || '').trim();

    return [
      { FieldName: 'TomTatVanban', FieldValue: (release.TomTatNoiDung || '').trim() },
      { FieldName: 'NgayPhatHanh', FieldValue: publishDate },
      { FieldName: 'HieuLucTu', FieldValue: publishDate },
      { FieldName: 'HieuLucDen', FieldValue: (release.HieuLucDen || '').trim() },
      { FieldName: 'LienHe', FieldValue: contact }
    ];
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

  public async publishVietMoi(
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

      try {
        const attachmentRoot = await this.getLibraryRootFolder(siteUrl, context, ATTACHMENT_LIBRARY_TITLE);
        const issuanceRoot = await this.getLibraryRootFolder(siteUrl, context, ISSUANCE_LIBRARY_TITLE);
        const sourceFolderName = resolveDocumentFolderName(idYeuCau);
        const sourceFolderPath = joinServerRelativePath(attachmentRoot, sourceFolderName);
        const targetRelativePath = `${thuMucBanHanh}/${tenVanBanFolder}`;

        await this.markMainDocument(siteUrl, context, idYeuCau, mainDocumentId, auditLogger);

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

        const sourceFormFolderPath = joinServerRelativePath(sourceFolderPath, ATTACHMENT_FORM_SUBFOLDER);
        const sourceFormFolderExists = await this.folderExists(siteUrl, context, sourceFormFolderPath);

        if (sourceFormFolderExists) {
          await this.ensureFolderPath(
            siteUrl,
            context,
            targetFolderPath,
            ATTACHMENT_FORM_SUBFOLDER,
            ISSUANCE_LIBRARY_TITLE
          );
        }

        const metadataValues = this.buildIssuanceMetadata(release);
        let mainFileServerRelativePath = '';
        const copiedFiles: Array<{ itemId: number; fileName: string; targetPath: string; listItemId: number }> = [];

        for (let fileIndex = 0; fileIndex < sourceFiles.length; fileIndex += 1) {
          const fileItem = sourceFiles[fileIndex];
          const sourcePath = resolveFileServerRelativePath(fileItem);
          const fileName = (fileItem.FileLeafRef || '').trim();

          if (!sourcePath || !fileName) {
            continue;
          }

          const fileDirRef = (fileItem.FileDirRef || '').trim();
          if (isFormAttachmentPath(fileDirRef)) {
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

        await this.stampDocumentFolderMetadata(
          siteUrl,
          context,
          targetFolderPath,
          metadataValues,
          auditLogger
        );

        await this.copyAndSecureFormFolder(
          siteUrl,
          context,
          sourceFolderPath,
          targetFolderPath,
          metadataValues,
          auditLogger
        );

        return {
          siteUrl,
          mainFileServerRelativePath,
          folderServerRelativePath: targetFolderPath,
          expiredFolderServerRelativePath
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to publish issuance documents.');
  }
}

export const phvbIssuancePublishService = new PhvbIssuancePublishService();

export function isVietMoiPublishRequest(release: IVanBanItem): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Viết mới';
}

export function isDieuChinhPublishRequest(release: IVanBanItem): boolean {
  return (release.LoaiYeuCau || '').trim() === 'Điều chỉnh';
}

export function isFullIssuancePublishRequest(release: IVanBanItem): boolean {
  return isVietMoiPublishRequest(release) || isDieuChinhPublishRequest(release);
}

export function resolveMainDocumentId(
  attachments: ReadonlyArray<IAttachmentLibraryItem>,
  preferredId?: number
): number | undefined {
  if (preferredId && preferredId > 0) {
    const preferredError = validateMainDocumentCandidate(attachments, preferredId);
    if (!preferredError) {
      return preferredId;
    }
  }

  for (let index = 0; index < attachments.length; index += 1) {
    const item = attachments[index];

    if (!item.isFormAttachment && (item.loaiVanBan || '').trim().toLowerCase() === MAIN_DOCUMENT_LOAI_VAN_BAN) {
      return item.id;
    }
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
