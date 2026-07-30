import {
  HOME_CATEGORIES_LIST_TITLE,
  HOME_CATEGORIES_QUERY_TOP,
  HOME_CATEGORIES_TOP,
  HOME_CATEGORY_DEFAULT_ICON,
  LIBRARY_CACHE_STALE_MS
} from '../config/PhvbMag.configuration';
import { phvbRepository } from '../repositories/PhvbMag.repository';
import { toRuntimeMessage } from './PhvbMag.error';
import type { IHomeCategoryItem, IPhvbSiteContext } from '../models/PhvbMag.models';
import { parseHomeCategoryLinkType } from '../utils/PhvbMagHomeCategories.utils';

interface ISharePointHomeCategoryItem {
  Id?: number;
  Title?: string;
  Icon?: string;
  LoaiLienKet?: string;
  IdThuMuc?: number;
  MoTaPhu?: string;
  ThuTu?: number;
}

interface IHomeCategoriesCacheEntry {
  items: IHomeCategoryItem[];
  fetchedAt: number;
}

const HOME_CATEGORY_SELECT_FIELDS: ReadonlyArray<string> = [
  'Id',
  'Title',
  'Icon',
  'LoaiLienKet',
  'IdThuMuc',
  'MoTaPhu',
  'ThuTu'
];

const cacheBySiteUrl = new Map<string, IHomeCategoriesCacheEntry>();
const promiseBySiteUrl = new Map<string, Promise<IHomeCategoryItem[]>>();

function resolveCacheKey(context: IPhvbSiteContext): string {
  return [
    context.sourceSiteUrl || '',
    context.currentWebUrl || '',
    context.siteCollectionUrl || '',
    context.issuanceLibraryTitle || ''
  ].join('|');
}

function isCacheFresh(entry: IHomeCategoriesCacheEntry | undefined): boolean {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < LIBRARY_CACHE_STALE_MS;
}

function mapHomeCategoryItem(item: ISharePointHomeCategoryItem): IHomeCategoryItem | undefined {
  const id = item.Id;
  const title = (item.Title || '').trim();
  const linkType = parseHomeCategoryLinkType(item.LoaiLienKet);

  if (!id || !title || !linkType) {
    return undefined;
  }

  if (linkType === 'ThuMuc') {
    const folderId = Number(item.IdThuMuc);

    if (!folderId || isNaN(folderId) || folderId <= 0) {
      return undefined;
    }

    return {
      id,
      title,
      icon: (item.Icon || '').trim() || HOME_CATEGORY_DEFAULT_ICON,
      linkType,
      folderId,
      subtitle: (item.MoTaPhu || '').trim() || undefined,
      sortOrder: typeof item.ThuTu === 'number' && !isNaN(item.ThuTu) ? item.ThuTu : 100
    };
  }

  return {
    id,
    title,
    icon: (item.Icon || '').trim() || HOME_CATEGORY_DEFAULT_ICON,
    linkType,
    subtitle: (item.MoTaPhu || '').trim() || undefined,
    sortOrder: typeof item.ThuTu === 'number' && !isNaN(item.ThuTu) ? item.ThuTu : 100
  };
}

export class PhvbHomeCategoriesService {
  public loadHomeCategories(context: IPhvbSiteContext): Promise<IHomeCategoryItem[]> {
    const cacheKey = resolveCacheKey(context);
    const cachedEntry = cacheBySiteUrl.get(cacheKey);

    if (isCacheFresh(cachedEntry)) {
      return Promise.resolve(cachedEntry!.items.slice());
    }

    const pendingPromise = promiseBySiteUrl.get(cacheKey);

    if (pendingPromise) {
      return pendingPromise.then(items => items.slice());
    }

    const requestPromise = this.fetchHomeCategories(context).then(items => {
      cacheBySiteUrl.set(cacheKey, {
        items,
        fetchedAt: Date.now()
      });
      return items;
    });

    promiseBySiteUrl.set(cacheKey, requestPromise);

    return requestPromise.then(items => {
      if (promiseBySiteUrl.get(cacheKey) === requestPromise) {
        promiseBySiteUrl.delete(cacheKey);
      }

      return items.slice();
    });
  }

  private async fetchHomeCategories(context: IPhvbSiteContext): Promise<IHomeCategoryItem[]> {
    const items = await phvbRepository.fetchItems({
      ...context,
      listTitle: HOME_CATEGORIES_LIST_TITLE,
      selectFields: HOME_CATEGORY_SELECT_FIELDS,
      filter: 'HienThi eq 1',
      top: HOME_CATEGORIES_QUERY_TOP,
      orderBy: 'ThuTu asc,Id asc'
    }) as ISharePointHomeCategoryItem[];

    const mapped = items
      .map(mapHomeCategoryItem)
      .filter((entry): entry is IHomeCategoryItem => Boolean(entry));

    return mapped.slice(0, HOME_CATEGORIES_TOP);
  }

  public clearCache(): void {
    cacheBySiteUrl.clear();
    promiseBySiteUrl.clear();
  }

  public getRuntimeErrorMessage(error: unknown): string {
    return toRuntimeMessage(error, HOME_CATEGORIES_LIST_TITLE);
  }
}

export const phvbHomeCategoriesService = new PhvbHomeCategoriesService();
