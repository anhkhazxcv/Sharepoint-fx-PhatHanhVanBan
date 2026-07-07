import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ATTACHMENT_FORM_SUBFOLDER, ATTACHMENT_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { escapeODataValue, getCandidateSiteUrls, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { buildSharePointFileOpenUrl } from '../infrastructure/SharePointFile.utils';
import { ensureSharePointResponseOk } from '../infrastructure/SharePointHttp.utils';
import { buildApiLogParams } from './PhvbMagLog.service';
import type { IAttachmentLibraryItem, ICreateRequestInput, IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';

interface IUploadRequestFilesOptions extends IPhvbSiteContext {
  requestReferenceId: string;
  input: ICreateRequestInput;
  logContext?: IPhvbLogContext;
}

interface IAttachmentServiceContext extends IPhvbSiteContext {
  logContext?: IPhvbLogContext;
}

async function ensureAttachmentResponseOk(
  response: SPHttpClientResponse,
  requestUrl: string,
  context: IAttachmentServiceContext,
  httpMethod: string,
  requestPayload?: unknown
): Promise<SPHttpClientResponse> {
  return ensureSharePointResponseOk(
    response,
    requestUrl,
    buildApiLogParams(context, context.logContext, {
      httpMethod,
      listName: ATTACHMENT_LIBRARY_TITLE,
      requestPayload: requestPayload || requestUrl
    })
  );
}

interface IListFormValue {
  FieldName: string;
  FieldValue: string;
}

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

interface ISharePointAttachmentItem {
  Id: number;
  UniqueId?: string;
  FileLeafRef?: string;
  FileRef?: string;
  FileDirRef?: string;
  Modified?: string;
  FSObjType?: number;
}

const ATTACHMENT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'UniqueId',
  'FileLeafRef',
  'FileRef',
  'FileDirRef',
  'Modified',
  'FSObjType'
];

function buildRequestIdFormValue(requestReferenceId: string): IListFormValue {
  return {
    FieldName: 'IDYeuCau',
    FieldValue: requestReferenceId
  };
}

function sanitizeSharePointFolderName(value: string): string {
  return value
    .trim()
    .replace(/["*:<>?/\\|#%]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.+$/, '')
    .trim();
}

function mapAttachmentItem(item: ISharePointAttachmentItem, siteUrl: string): IAttachmentLibraryItem {
  const fileRef = item.FileRef || '';
  const fileDirRef = item.FileDirRef || '';
  const fileName = item.FileLeafRef || '';

  return {
    id: item.Id,
    name: fileName,
    fileUrl: buildSharePointFileOpenUrl(siteUrl, {
      uniqueId: item.UniqueId,
      fileRef,
      fileName
    }),
    modified: item.Modified,
    folderPath: fileDirRef,
    isFormAttachment: fileDirRef.indexOf(`/${ATTACHMENT_FORM_SUBFOLDER}`) > -1
  };
}

function resolveDocumentFolderName(requestReferenceId: string): string {
  const normalizedId = sanitizeSharePointFolderName(requestReferenceId.trim());
  return normalizedId || requestReferenceId.trim();
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(reader.result as ArrayBuffer);
    reader.onerror = (): void => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export class PhvbAttachmentService {
  private async getLibraryRootFolder(siteUrl: string, context: IAttachmentServiceContext): Promise<string> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/RootFolder?$select=ServerRelativeUrl`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_GET');
    const data = await response.json() as { ServerRelativeUrl?: string };

    if (!data.ServerRelativeUrl) {
      throw new Error(`Missing root folder for library ${ATTACHMENT_LIBRARY_TITLE}.`);
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
    context: IAttachmentServiceContext,
    folderPath: string
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

    await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_CREATE');
  }

  private async resolveFolderListItemId(
    siteUrl: string,
    context: IAttachmentServiceContext,
    folderPath: string
  ): Promise<number> {
    const metadataUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields?$select=Id&${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const metadataResponse = await context.spHttpClient.get(metadataUrl, SPHttpClient.configurations.v1);
    await ensureAttachmentResponseOk(metadataResponse, metadataUrl, context, 'SP_GET');
    const metadata = await metadataResponse.json() as { Id?: number };
    const listItemId = metadata.Id || 0;

    if (!listItemId) {
      throw new Error(`Created folder ${folderPath} but could not resolve list item id.`);
    }

    return listItemId;
  }

  private async applyListItemMetadataOnCreate(
    siteUrl: string,
    context: IAttachmentServiceContext,
    listItemId: number,
    requestReferenceId: string
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items(${listItemId})/ValidateUpdateListItem`;
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      body: JSON.stringify({
        formValues: [buildRequestIdFormValue(requestReferenceId)],
        bNewDocumentUpdate: true
      }),
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/json;odata=nometadata',
        'odata-version': ''
      }
    });

    await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_UPDATE');
  }

  private async ensureFolder(
    siteUrl: string,
    context: IAttachmentServiceContext,
    folderPath: string,
    requestReferenceId: string
  ): Promise<void> {
    const normalizedPath = normalizeServerRelativePath(folderPath);
    const folderAlreadyExists = await this.folderExists(siteUrl, context, normalizedPath);

    if (!folderAlreadyExists) {
      await this.createFolder(siteUrl, context, normalizedPath);
    }

    const listItemId = await this.resolveFolderListItemId(siteUrl, context, normalizedPath);
    await this.applyListItemMetadataOnCreate(siteUrl, context, listItemId, requestReferenceId);
  }

  private async ensureFolderPath(
    siteUrl: string,
    context: IAttachmentServiceContext,
    libraryRootPath: string,
    relativePath: string,
    requestReferenceId: string
  ): Promise<string> {
    const segments = splitRelativePath(relativePath);
    let currentPath = libraryRootPath;

    for (let index = 0; index < segments.length; index += 1) {
      currentPath = joinServerRelativePath(currentPath, segments[index]);
      await this.ensureFolder(siteUrl, context, currentPath, requestReferenceId);
    }

    return currentPath;
  }

  private async uploadFileToFolder(
    siteUrl: string,
    context: IAttachmentServiceContext,
    folderPath: string,
    file: File,
    requestReferenceId: string
  ): Promise<void> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files/add(url=@fileName,overwrite=true)?${buildODataParameterQuery({
      '@folderPath': folderPath,
      '@fileName': file.name
    })}`;
    const fileBuffer = await readFileAsArrayBuffer(file);
    const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
      body: fileBuffer,
      headers: {
        accept: 'application/json;odata=nometadata',
        'content-type': 'application/octet-stream',
        'odata-version': ''
      }
    });

    await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_CREATE', file.name);
    const data = await response.json() as { ListItemAllFields?: { Id?: number } };
    let listItemId = data.ListItemAllFields && data.ListItemAllFields.Id ? data.ListItemAllFields.Id : 0;

    if (!listItemId) {
      const uploadedFilePath = joinServerRelativePath(folderPath, file.name);
      const metadataUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@filePath)/ListItemAllFields?$select=Id&${buildODataParameterQuery({
        '@filePath': uploadedFilePath
      })}`;
      const metadataResponse = await context.spHttpClient.get(metadataUrl, SPHttpClient.configurations.v1);
      await ensureAttachmentResponseOk(metadataResponse, metadataUrl, context, 'SP_GET');
      const metadata = await metadataResponse.json() as { Id?: number };
      listItemId = metadata.Id || 0;
    }

    if (!listItemId) {
      throw new Error(`Uploaded file ${file.name} but could not resolve list item id.`);
    }

    await this.applyListItemMetadataOnCreate(siteUrl, context, listItemId, requestReferenceId);
  }

  public async uploadRequestFiles(options: IUploadRequestFilesOptions): Promise<void> {
    const { input, requestReferenceId } = options;

    const draftFiles = input.taiLieuFiles || [];
    const formFiles = input.bieuMauFiles || [];

    if (draftFiles.length === 0 && formFiles.length === 0) {
      throw new Error('Không có file để upload.');
    }

    if (!requestReferenceId.trim()) {
      throw new Error('Thiếu ID yêu cầu để tạo thư mục upload.');
    }

    const candidates = getCandidateSiteUrls(options);
    let lastError: unknown = null;

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        const documentFolderName = resolveDocumentFolderName(requestReferenceId);
        const libraryRootPath = await this.getLibraryRootFolder(siteUrl, options);
        const documentFolderPath = await this.ensureFolderPath(
          siteUrl,
          options,
          libraryRootPath,
          documentFolderName,
          requestReferenceId
        );

        const draftUpload = Promise.all(
          draftFiles.map(file =>
            this.uploadFileToFolder(siteUrl, options, documentFolderPath, file, requestReferenceId)
          )
        );

        const formUpload = formFiles.length > 0
          ? (async (): Promise<void> => {
            const formFolderPath = await this.ensureFolderPath(
              siteUrl,
              options,
              documentFolderPath,
              ATTACHMENT_FORM_SUBFOLDER,
              requestReferenceId
            );

            await Promise.all(
              formFiles.map(file =>
                this.uploadFileToFolder(siteUrl, options, formFolderPath, file, requestReferenceId)
              )
            );
          })()
          : Promise.resolve();

        await Promise.all([draftUpload, formUpload]);

        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to upload attachment files.');
  }

  public async listRequestFiles(context: IPhvbSiteContext, requestReferenceId: string): Promise<IAttachmentLibraryItem[]> {
    if (!requestReferenceId.trim()) {
      return [];
    }

    const candidates = getCandidateSiteUrls(context);
    let lastError: unknown = null;

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    const filterValue = escapeODataValue(requestReferenceId);
    const filter = `IDYeuCau eq '${filterValue}' and FSObjType eq 0`;

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items?$select=${ATTACHMENT_SELECT_FIELDS.join(',')}&$filter=${filter}&$top=500&$orderby=Modified desc`;
        const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
        await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_GET');
        const data = await response.json() as { value?: ISharePointAttachmentItem[] };
        const items = data.value || [];

        return items.map(item => mapAttachmentItem(item, siteUrl));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to load attachment files.');
  }

  public async deleteRequestFiles(context: IAttachmentServiceContext, itemIds: number[]): Promise<void> {
    const uniqueIds = itemIds.filter((id, index, array) => array.indexOf(id) === index && id > 0);

    if (uniqueIds.length === 0) {
      return;
    }

    const candidates = getCandidateSiteUrls(context);

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    let lastError: unknown = null;

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        for (let idIndex = 0; idIndex < uniqueIds.length; idIndex += 1) {
          const itemId = uniqueIds[idIndex];
          const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/items(${itemId})`;
          const response = await context.spHttpClient.post(requestUrl, SPHttpClient.configurations.v1, {
            headers: {
              accept: 'application/json;odata=nometadata',
              'content-type': 'application/json;odata=nometadata',
              'odata-version': '',
              'IF-MATCH': '*',
              'X-HTTP-Method': 'DELETE'
            }
          });

          await ensureAttachmentResponseOk(response, requestUrl, context, 'SP_DELETE');
        }

        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to delete attachment files.');
  }
}

export const phvbAttachmentService = new PhvbAttachmentService();
