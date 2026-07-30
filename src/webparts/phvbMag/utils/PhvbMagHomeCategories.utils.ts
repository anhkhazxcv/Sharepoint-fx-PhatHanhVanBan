import type { HomeCategoryLinkType, IHomeCategoryItem } from '../models/PhvbMag.models';
import { buildLibraryAllPath, buildLibraryFolderPath } from './PhvbMagLibrary.utils';

const HOME_CATEGORY_LINK_TYPES: ReadonlyArray<HomeCategoryLinkType> = ['TatCa', 'ThuMuc'];

export function parseHomeCategoryLinkType(value?: string): HomeCategoryLinkType | undefined {
  const normalized = (value || '').trim();

  if (HOME_CATEGORY_LINK_TYPES.indexOf(normalized as HomeCategoryLinkType) === -1) {
    return undefined;
  }

  return normalized as HomeCategoryLinkType;
}

export function buildHomeCategoryNavigatePath(item: IHomeCategoryItem): string {
  if (item.linkType === 'ThuMuc' && item.folderId) {
    return buildLibraryFolderPath(item.folderId, 1);
  }

  return buildLibraryAllPath(1);
}

export function buildHomeCategoryAriaLabel(item: IHomeCategoryItem): string {
  if (item.subtitle) {
    return `${item.title} — ${item.subtitle}`;
  }

  return item.title;
}
