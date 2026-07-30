import { SPHttpClient } from '@microsoft/sp-http';
import {
  hasSharePointSiteContext,
  SAVED_DOCUMENTS_HYDRATE_CHUNK_SIZE,
  SAVED_DOCUMENTS_LIST_TITLE,
  SAVED_DOCUMENTS_TOP
} from '../config/PhvbMag.configuration';
import { ensureSharePointResponseOk, tryAcrossCandidateSites } from '../infrastructure/SharePointHttp.utils';
import { escapeODataValue, normalizeSiteUrl } from '../infrastructure/SharePointSite.utils';
import { buildApiLogParams } from '../services/PhvbMagLog.service';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { SITE_CONTEXT_ERROR_MESSAGE, toRuntimeMessage } from './PhvbMag.error';
import { phvbDocumentLibraryService } from './PhvbMagDocumentLibrary.service';
import type {
  IBanHanhLibraryItem,
  IPhvbSiteContext,
  ISavedDocumentDisplayItem,
  ISavedDocumentItem
} from '../models/PhvbMag.models';

interface ISharePointSavedDocumentItem {
  Id: number;
  Title?: string;
  UserEmail?: string;
  LibraryItemId?: number;
  FileRef?: string;
  FileDirRef?: string;
  UniqueId?: string;
  Notes?: string;
  Created?: string;
}

const SAVED_DOCUMENT_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'UserEmail',
  'LibraryItemId',
  'FileRef',
  'FileDirRef',
  'UniqueId',
  'Notes',
  'Created'
];

function getListItemsEndpoint(siteUrl: string, listTitle: string): string {
  return `${normalizeSiteUrl(siteUrl)}/_api/web/lists/getByTitle('${escapeODataValue(listTitle)}')/items`;
}

function buildSavedDocumentsQuery(userEmail: string): string {
  const normalizedEmail = escapeODataValue(userEmail.trim().toLowerCase());
  return [
    `$select=${SAVED_DOCUMENT_SELECT_FIELDS.join(',')}`,
    `$filter=UserEmail eq '${normalizedEmail}'`,
    `$orderby=Created desc`,
    `$top=${SAVED_DOCUMENTS_TOP}`
  ].join('&');
}

function mapSavedDocumentItem(item: ISharePointSavedDocumentItem): ISavedDocumentItem | undefined {
  const libraryItemId = Number(item.LibraryItemId);

  if (!item.Id || !libraryItemId || isNaN(libraryItemId)) {
    return undefined;
  }

  return {
    id: item.Id,
    title: (item.Title || '').trim(),
    userEmail: (item.UserEmail || '').trim(),
    libraryItemId,
    fileRef: (item.FileRef || '').trim(),
    fileDirRef: (item.FileDirRef || '').trim(),
    uniqueId: (item.UniqueId || '').trim() || undefined,
    notes: (item.Notes || '').trim() || undefined,
    created: item.Created
  };
}

function buildSavedDocumentPayload(
  userEmail: string,
  document: IBanHanhLibraryItem
): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    Title: document.name,
    UserEmail: userEmail.trim().toLowerCase(),
    LibraryItemId: document.id,
    FileRef: document.fileRef,
    FileDirRef: document.fileDirRef
  };

  if (document.uniqueId) {
    payload.UniqueId = document.uniqueId;
  }

  return payload;
}

export class PhvbSavedDocumentsService {
  public loadUserBookmarks(
    context: IPhvbSiteContext,
    userEmail: string
  ): Promise<ISavedDocumentItem[]> {
    if (!hasSharePointSiteContext(context)) {
      return Promise.reject(new Error(SITE_CONTEXT_ERROR_MESSAGE));
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return Promise.resolve([]);
    }

    return tryAcrossCandidateSites(context, async (siteUrl: string) => {
      const requestUrl = `${getListItemsEndpoint(siteUrl, SAVED_DOCUMENTS_LIST_TITLE)}?${buildSavedDocumentsQuery(normalizedEmail)}`;
      const response = await context.spHttpClient.get(requestUrl, SPHttpClient.configurations.v1);
      await ensureSharePointResponseOk(
        response,
        requestUrl,
        buildApiLogParams(context, undefined, {
          httpMethod: 'SP_GET',
          listName: SAVED_DOCUMENTS_LIST_TITLE
        })
      );
      const data = await response.json() as { value?: ISharePointSavedDocumentItem[] };

      return (data.value || [])
        .map(mapSavedDocumentItem)
        .filter((item): item is ISavedDocumentItem => Boolean(item));
    }, 'Unable to load saved documents.');
  }

  public saveBookmark(
    context: IPhvbSiteContext,
    userEmail: string,
    document: IBanHanhLibraryItem
  ): Promise<ISavedDocumentItem> {
    if (!hasSharePointSiteContext(context)) {
      return Promise.reject(new Error(SITE_CONTEXT_ERROR_MESSAGE));
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    return phvbRepository.createItem({
      ...context,
      listTitle: SAVED_DOCUMENTS_LIST_TITLE,
      payload: buildSavedDocumentPayload(normalizedEmail, document)
    }).then(createdId => ({
      id: createdId,
      title: document.name,
      userEmail: normalizedEmail,
      libraryItemId: document.id,
      fileRef: document.fileRef,
      fileDirRef: document.fileDirRef,
      uniqueId: document.uniqueId,
      created: new Date().toISOString()
    }));
  }

  public unsaveBookmark(context: IPhvbSiteContext, bookmarkId: number): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      return Promise.reject(new Error(SITE_CONTEXT_ERROR_MESSAGE));
    }

    return phvbRepository.deleteItem({
      ...context,
      listTitle: SAVED_DOCUMENTS_LIST_TITLE,
      itemId: bookmarkId
    });
  }

  public hydrateSavedDocuments(
    context: IPhvbSiteContext,
    bookmarks: ISavedDocumentItem[]
  ): Promise<ISavedDocumentDisplayItem[]> {
    if (bookmarks.length === 0) {
      return Promise.resolve([]);
    }

    const libraryItemIds = bookmarks.map((bookmark: ISavedDocumentItem) => bookmark.libraryItemId);

    return phvbDocumentLibraryService.hydrateBanHanhItemsByIds(
      context,
      libraryItemIds,
      SAVED_DOCUMENTS_HYDRATE_CHUNK_SIZE
    ).then((documents: IBanHanhLibraryItem[]) => {
      const documentById: Record<number, IBanHanhLibraryItem> = {};
      documents.forEach((document: IBanHanhLibraryItem) => {
        documentById[document.id] = document;
      });

      return bookmarks.map((bookmark: ISavedDocumentItem) => {
        const document = documentById[bookmark.libraryItemId];
        return {
          bookmark,
          document,
          isAccessible: Boolean(document)
        };
      });
    });
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, SAVED_DOCUMENTS_LIST_TITLE);
  }
}

export const phvbSavedDocumentsService = new PhvbSavedDocumentsService();
