import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { ATTACHMENT_FORM_SUBFOLDER, ATTACHMENT_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { SharePointRequestError } from './PhvbMag.error';
import type { ICreateRequestInput, IPhvbSiteContext } from '../models/PhvbMag.models';

interface IUploadRequestFilesOptions extends IPhvbSiteContext {
  requestReferenceId: string;
  input: ICreateRequestInput;
}

interface IListFormValue {
  FieldName: string;
  FieldValue: string;
}

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/$/, '');
}

function escapeODataValue(value: string): string {
  return value.replace(/'/g, "''");
}

function buildODataParameterQuery(parameters: Record<string, string>): string {
  return Object.keys(parameters)
    .map(key => `${key}='${escapeODataValue(parameters[key])}'`)
    .join('&');
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

function resolveDocumentFolderName(input: ICreateRequestInput, requestReferenceId: string): string {
  const sanitizedTitle = sanitizeSharePointFolderName(input.title || '');
  return sanitizedTitle || requestReferenceId;
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

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(reader.result as ArrayBuffer);
    reader.onerror = (): void => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

export class PhvbAttachmentService {
  private async getLibraryRootFolder(siteUrl: string, context: IPhvbSiteContext): Promise<string> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(ATTACHMENT_LIBRARY_TITLE)}')/RootFolder?$select=ServerRelativeUrl`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureOk(response, requestUrl);
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
    context: IPhvbSiteContext,
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

    throw new SharePointRequestError(
      `SharePoint request failed with status ${response.status}`,
      response.status,
      requestUrl,
      details
    );
  }

  private async resolveFolderListItemId(
    siteUrl: string,
    context: IPhvbSiteContext,
    folderPath: string
  ): Promise<number> {
    const metadataUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/ListItemAllFields?$select=Id&${buildODataParameterQuery({
      '@folderPath': normalizeServerRelativePath(folderPath)
    })}`;
    const metadataResponse = await context.spHttpClient.get(metadataUrl, SPHttpClient.configurations.v1);
    await ensureOk(metadataResponse, metadataUrl);
    const metadata = await metadataResponse.json() as { Id?: number };
    const listItemId = metadata.Id || 0;

    if (!listItemId) {
      throw new Error(`Created folder ${folderPath} but could not resolve list item id.`);
    }

    return listItemId;
  }

  private async applyListItemMetadataOnCreate(
    siteUrl: string,
    context: IPhvbSiteContext,
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

    await ensureOk(response, requestUrl);
  }

  private async ensureFolder(
    siteUrl: string,
    context: IPhvbSiteContext,
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
    context: IPhvbSiteContext,
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
    context: IPhvbSiteContext,
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

    await ensureOk(response, requestUrl);
    const data = await response.json() as { ListItemAllFields?: { Id?: number } };
    let listItemId = data.ListItemAllFields && data.ListItemAllFields.Id ? data.ListItemAllFields.Id : 0;

    if (!listItemId) {
      const uploadedFilePath = joinServerRelativePath(folderPath, file.name);
      const metadataUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFileByServerRelativeUrl(@filePath)/ListItemAllFields?$select=Id&${buildODataParameterQuery({
        '@filePath': uploadedFilePath
      })}`;
      const metadataResponse = await context.spHttpClient.get(metadataUrl, SPHttpClient.configurations.v1);
      await ensureOk(metadataResponse, metadataUrl);
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
        const documentFolderName = resolveDocumentFolderName(input, requestReferenceId);
        const libraryRootPath = await this.getLibraryRootFolder(siteUrl, options);
        const documentFolderPath = await this.ensureFolderPath(
          siteUrl,
          options,
          libraryRootPath,
          documentFolderName,
          requestReferenceId
        );

        for (let fileIndex = 0; fileIndex < draftFiles.length; fileIndex += 1) {
          await this.uploadFileToFolder(
            siteUrl,
            options,
            documentFolderPath,
            draftFiles[fileIndex],
            requestReferenceId
          );
        }

        if (formFiles.length > 0) {
          const formFolderPath = await this.ensureFolderPath(
            siteUrl,
            options,
            documentFolderPath,
            ATTACHMENT_FORM_SUBFOLDER,
            requestReferenceId
          );

          for (let fileIndex = 0; fileIndex < formFiles.length; fileIndex += 1) {
            await this.uploadFileToFolder(
              siteUrl,
              options,
              formFolderPath,
              formFiles[fileIndex],
              requestReferenceId
            );
          }
        }

        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to upload attachment files.');
  }
}

export const phvbAttachmentService = new PhvbAttachmentService();
