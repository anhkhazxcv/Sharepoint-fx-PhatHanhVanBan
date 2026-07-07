import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import { COMMENT_ATTACHMENT_LIBRARY_TITLE } from '../config/PhvbMag.configuration';
import { buildSharePointFileOpenUrl } from '../infrastructure/SharePointFile.utils';
import { escapeODataValue, getCandidateSiteUrls, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { resolveCommentAttachmentFolderName } from '../utils/PhvbMagCommentAttachment.utils';
import { ensureSharePointResponseOk } from '../infrastructure/SharePointHttp.utils';
import { buildApiLogParams } from './PhvbMagLog.service';
import type { ICommentAttachmentItem, IPhvbLogContext, IPhvbSiteContext } from '../models/PhvbMag.models';

interface ICommentAttachmentContext extends IPhvbSiteContext {
  logContext?: IPhvbLogContext;
}

async function ensureCommentAttachmentResponseOk(
  response: SPHttpClientResponse,
  requestUrl: string,
  context: ICommentAttachmentContext,
  httpMethod: string,
  requestPayload?: unknown
): Promise<SPHttpClientResponse> {
  return ensureSharePointResponseOk(
    response,
    requestUrl,
    buildApiLogParams(context, context.logContext, {
      httpMethod,
      listName: COMMENT_ATTACHMENT_LIBRARY_TITLE,
      requestPayload: requestPayload || requestUrl
    })
  );
}

interface ISharePointFolderFile {
  Name?: string;
  ServerRelativeUrl?: string;
  TimeLastModified?: string;
  UniqueId?: string;
  ListItemAllFields?: {
    Id?: number;
    UniqueId?: string;
  };
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

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (): void => resolve(reader.result as ArrayBuffer);
    reader.onerror = (): void => reject(reader.error || new Error('Unable to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function mapFolderFile(item: ISharePointFolderFile, commentId: number, siteUrl: string): ICommentAttachmentItem | undefined {
  const listItemId = item.ListItemAllFields && item.ListItemAllFields.Id ? item.ListItemAllFields.Id : 0;
  const serverRelativeUrl = item.ServerRelativeUrl || '';

  if (!listItemId || !item.Name) {
    return undefined;
  }

  return {
    id: listItemId,
    commentId,
    name: item.Name,
    fileUrl: buildSharePointFileOpenUrl(siteUrl, {
      uniqueId: item.UniqueId || item.ListItemAllFields?.UniqueId,
      fileRef: serverRelativeUrl,
      fileName: item.Name
    }),
    modified: item.TimeLastModified
  };
}

export class PhvbCommentAttachmentService {
  private async getLibraryRootFolder(siteUrl: string, context: ICommentAttachmentContext): Promise<string> {
    const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(COMMENT_ATTACHMENT_LIBRARY_TITLE)}')/RootFolder?$select=ServerRelativeUrl`;
    const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
    await ensureCommentAttachmentResponseOk(response, requestUrl, context, 'SP_GET');
    const data = await response.json() as { ServerRelativeUrl?: string };

    if (!data.ServerRelativeUrl) {
      throw new Error(`Missing root folder for library ${COMMENT_ATTACHMENT_LIBRARY_TITLE}.`);
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
    context: ICommentAttachmentContext,
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

    await ensureCommentAttachmentResponseOk(response, requestUrl, context, 'SP_CREATE');
  }

  private async ensureFolder(
    siteUrl: string,
    context: ICommentAttachmentContext,
    folderPath: string
  ): Promise<void> {
    const normalizedPath = normalizeServerRelativePath(folderPath);
    const folderAlreadyExists = await this.folderExists(siteUrl, context, normalizedPath);

    if (!folderAlreadyExists) {
      await this.createFolder(siteUrl, context, normalizedPath);
    }
  }

  private async ensureFolderPath(
    siteUrl: string,
    context: ICommentAttachmentContext,
    libraryRootPath: string,
    relativePath: string
  ): Promise<string> {
    const segments = splitRelativePath(relativePath);
    let currentPath = libraryRootPath;

    for (let index = 0; index < segments.length; index += 1) {
      currentPath = joinServerRelativePath(currentPath, segments[index]);
      await this.ensureFolder(siteUrl, context, currentPath);
    }

    return currentPath;
  }

  private async uploadFileToFolder(
    siteUrl: string,
    context: ICommentAttachmentContext,
    folderPath: string,
    file: File
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

    await ensureCommentAttachmentResponseOk(response, requestUrl, context, 'SP_CREATE', file.name);
  }

  public async uploadCommentFiles(
    context: IPhvbSiteContext,
    commentId: number,
    files: File[],
    logContext?: IPhvbLogContext
  ): Promise<void> {
    const attachmentContext: ICommentAttachmentContext = {
      ...context,
      logContext
    };
    if (files.length === 0) {
      return;
    }

    if (!commentId) {
      throw new Error('Thiếu Id bình luận để upload file đính kèm.');
    }

    const candidates = getCandidateSiteUrls(context);
    let lastError: unknown = null;

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        const libraryRootPath = await this.getLibraryRootFolder(siteUrl, attachmentContext);
        const commentFolderPath = await this.ensureFolderPath(
          siteUrl,
          attachmentContext,
          libraryRootPath,
          resolveCommentAttachmentFolderName(commentId)
        );

        await Promise.all(
          files.map(file =>
            this.uploadFileToFolder(siteUrl, attachmentContext, commentFolderPath, file)
          )
        );

        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to upload comment attachment files.');
  }

  public async listCommentFiles(
    context: IPhvbSiteContext,
    commentId: number
  ): Promise<ICommentAttachmentItem[]> {
    if (!commentId) {
      return [];
    }

    const candidates = getCandidateSiteUrls(context);
    let lastError: unknown = null;

    if (candidates.length === 0) {
      throw new Error('Missing SharePoint site context.');
    }

    for (let index = 0; index < candidates.length; index += 1) {
      const siteUrl = candidates[index];

      try {
        const libraryRootPath = await this.getLibraryRootFolder(siteUrl, context);
        const folderPath = joinServerRelativePath(
          libraryRootPath,
          resolveCommentAttachmentFolderName(commentId)
        );
        const folderAlreadyExists = await this.folderExists(siteUrl, context, folderPath);

        if (!folderAlreadyExists) {
          return [];
        }

        const requestUrl = `${normalizeSiteUrl(siteUrl)}/_api/web/GetFolderByServerRelativeUrl(@folderPath)/Files?$select=Name,ServerRelativeUrl,TimeLastModified,UniqueId,ListItemAllFields/Id,ListItemAllFields/UniqueId&$expand=ListItemAllFields&${buildODataParameterQuery({
          '@folderPath': folderPath
        })}`;
        const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
        await ensureCommentAttachmentResponseOk(response, requestUrl, { ...context }, 'SP_GET');
        const data = await response.json() as { value?: ISharePointFolderFile[] };
        const items = data.value || [];

        return items
          .map(item => mapFolderFile(item, commentId, siteUrl))
          .filter((item): item is ICommentAttachmentItem => Boolean(item));
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('Unable to load comment attachment files.');
  }

  public async listFilesForComments(
    context: IPhvbSiteContext,
    commentIds: number[]
  ): Promise<ICommentAttachmentItem[]> {
    const uniqueIds = commentIds.filter((id, index, array) => array.indexOf(id) === index && id > 0);

    if (uniqueIds.length === 0) {
      return [];
    }

    const results = await Promise.all(
      uniqueIds.map(commentId => this.listCommentFiles(context, commentId).catch(() => []))
    );

    return results.reduce<ICommentAttachmentItem[]>((merged, items) => merged.concat(items), []);
  }
}

export const phvbCommentAttachmentService = new PhvbCommentAttachmentService();
