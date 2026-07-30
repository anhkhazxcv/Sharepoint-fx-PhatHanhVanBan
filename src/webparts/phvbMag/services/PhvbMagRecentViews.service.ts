import {
  hasSharePointSiteContext,
  RECENT_VIEWS_HYDRATE_CHUNK_SIZE,
  RECENT_VIEWS_LIST_TITLE,
  RECENT_VIEWS_TOP
} from '../config/PhvbMag.configuration';
import { escapeODataValue } from '../infrastructure/SharePointSite.utils';
import type {
  IBanHanhLibraryItem,
  IPhvbSiteContext,
  IRecentViewDisplayItem,
  IRecentViewItem
} from '../models/PhvbMag.models';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { SITE_CONTEXT_ERROR_MESSAGE } from '../services/PhvbMag.error';
import { phvbDocumentLibraryService } from './PhvbMagDocumentLibrary.service';

const RECENT_VIEW_SELECT_FIELDS = [
  'Id',
  'Title',
  'UserEmail',
  'LibraryItemId',
  'FileRef',
  'FileDirRef',
  'Created',
  'Modified'
] as const;

interface IRecentViewListItem {
  Id?: number;
  Title?: string;
  UserEmail?: string;
  LibraryItemId?: number;
  FileRef?: string;
  FileDirRef?: string;
  Created?: string;
  Modified?: string;
}

function toRuntimeMessage(error: unknown, listTitle: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return `Không thể truy cập danh sách ${listTitle}.`;
}

function mapRecentViewItem(row: IRecentViewListItem): IRecentViewItem | undefined {
  const id = Number(row.Id);
  const libraryItemId = Number(row.LibraryItemId);

  if (!row.Id || !libraryItemId || isNaN(libraryItemId)) {
    return undefined;
  }

  return {
    id,
    title: (row.Title || '').trim(),
    userEmail: (row.UserEmail || '').trim().toLowerCase(),
    libraryItemId,
    fileRef: (row.FileRef || '').trim(),
    fileDirRef: (row.FileDirRef || '').trim(),
    created: row.Created,
    modified: row.Modified
  };
}

function buildRecentViewsFilter(userEmail: string): string {
  const normalizedEmail = escapeODataValue(userEmail.trim().toLowerCase());
  return `UserEmail eq '${normalizedEmail}'`;
}

function buildRecentViewLookupFilter(userEmail: string, libraryItemId: number): string {
  const normalizedEmail = escapeODataValue(userEmail.trim().toLowerCase());
  return `UserEmail eq '${normalizedEmail}' and LibraryItemId eq ${libraryItemId}`;
}

function buildRecentViewPayload(userEmail: string, document: IBanHanhLibraryItem): Record<string, string | number> {
  return {
    Title: document.name,
    UserEmail: userEmail.trim().toLowerCase(),
    LibraryItemId: document.id,
    FileRef: document.fileRef,
    FileDirRef: document.fileDirRef
  };
}

class PhvbMagRecentViewsService {
  private readonly listItemIdByLibraryItemId = new Map<number, number>();

  public primeSessionCache(views: IRecentViewItem[]): void {
    views.forEach((view: IRecentViewItem) => {
      this.listItemIdByLibraryItemId.set(view.libraryItemId, view.id);
    });
  }

  public clearSessionCache(): void {
    this.listItemIdByLibraryItemId.clear();
  }

  public loadUserRecentViews(
    context: IPhvbSiteContext,
    userEmail: string,
    top: number = RECENT_VIEWS_TOP
  ): Promise<IRecentViewItem[]> {
    if (!hasSharePointSiteContext(context)) {
      return Promise.reject(new Error(SITE_CONTEXT_ERROR_MESSAGE));
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return Promise.resolve([]);
    }

    return phvbRepository.fetchItems({
      ...context,
      listTitle: RECENT_VIEWS_LIST_TITLE,
      selectFields: RECENT_VIEW_SELECT_FIELDS,
      filter: buildRecentViewsFilter(normalizedEmail),
      orderBy: 'Modified desc',
      top
    }).then(rows => {
      const views = (rows as unknown as IRecentViewListItem[])
        .map(mapRecentViewItem)
        .filter((item): item is IRecentViewItem => Boolean(item));

      this.primeSessionCache(views);
      return views;
    }).catch((error: unknown) => {
      throw new Error(toRuntimeMessage(error, RECENT_VIEWS_LIST_TITLE));
    });
  }

  public async recordView(
    context: IPhvbSiteContext,
    userEmail: string,
    document: IBanHanhLibraryItem
  ): Promise<void> {
    if (!hasSharePointSiteContext(context)) {
      return;
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    const cachedListItemId = this.listItemIdByLibraryItemId.get(document.id);

    if (cachedListItemId) {
      await phvbRepository.updateItem({
        ...context,
        listTitle: RECENT_VIEWS_LIST_TITLE,
        itemId: cachedListItemId,
        payload: buildRecentViewPayload(normalizedEmail, document)
      });
      return;
    }

    const existingRows = await phvbRepository.fetchItems({
      ...context,
      listTitle: RECENT_VIEWS_LIST_TITLE,
      selectFields: ['Id'],
      filter: buildRecentViewLookupFilter(normalizedEmail, document.id),
      top: 1
    });

    const existingId = Number((existingRows[0] as unknown as IRecentViewListItem | undefined)?.Id);

    if (!isNaN(existingId) && existingId > 0) {
      this.listItemIdByLibraryItemId.set(document.id, existingId);
      await phvbRepository.updateItem({
        ...context,
        listTitle: RECENT_VIEWS_LIST_TITLE,
        itemId: existingId,
        payload: buildRecentViewPayload(normalizedEmail, document)
      });
      return;
    }

    const createdId = await phvbRepository.createItem({
      ...context,
      listTitle: RECENT_VIEWS_LIST_TITLE,
      payload: buildRecentViewPayload(normalizedEmail, document)
    });

    this.listItemIdByLibraryItemId.set(document.id, createdId);
  }

  public hydrateRecentViews(
    context: IPhvbSiteContext,
    views: IRecentViewItem[]
  ): Promise<IRecentViewDisplayItem[]> {
    if (views.length === 0) {
      return Promise.resolve([]);
    }

    const libraryItemIds = views.map((view: IRecentViewItem) => view.libraryItemId);

    return phvbDocumentLibraryService.hydrateBanHanhItemsByIds(
      context,
      libraryItemIds,
      RECENT_VIEWS_HYDRATE_CHUNK_SIZE
    ).then((documents: IBanHanhLibraryItem[]) => {
      const documentById: Record<number, IBanHanhLibraryItem> = {};
      documents.forEach((document: IBanHanhLibraryItem) => {
        documentById[document.id] = document;
      });

      return views.map((view: IRecentViewItem) => {
        const document = documentById[view.libraryItemId];
        return {
          recentView: view,
          document,
          isAccessible: Boolean(document)
        };
      });
    });
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, RECENT_VIEWS_LIST_TITLE);
  }
}

export const phvbRecentViewsService = new PhvbMagRecentViewsService();
