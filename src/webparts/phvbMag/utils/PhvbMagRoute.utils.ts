import type { TabType } from '../models/PhvbMag.models';
import { buildLibraryFolderPath, buildPreviewSearch } from './PhvbMagLibrary.utils';

export function resolveTabFromPathname(
  pathname: string,
  tabName: string | undefined,
  fallback: TabType
): TabType {
  if (pathname.indexOf('/tab/TrangChu') === 0) {
    return 'TrangChu';
  }

  if (pathname.indexOf('/tab/ThuVienTaiLieu') === 0) {
    return 'ThuVienTaiLieu';
  }

  return (tabName as TabType) || fallback;
}

export function buildYeuCauDetailUrl(tab: TabType, idYeuCau: string): string {
  const baseUrl = window.location.href.split('#')[0];
  const normalizedId = encodeURIComponent(idYeuCau.trim());
  return `${baseUrl}#/tab/${tab}/detail/${normalizedId}`;
}

export function buildLibraryFolderDeepLinkUrl(folderId: number): string {
  const baseUrl = window.location.href.split('#')[0];
  return `${baseUrl}#${buildLibraryFolderPath(folderId, 1)}`;
}

/** Shareable link that reopens the preview on top of the current browse state. */
export function buildPreviewDeepLinkUrl(pathname: string, search: string, itemId: number): string {
  const baseUrl = window.location.href.split('#')[0];
  return `${baseUrl}#${pathname}${buildPreviewSearch(search, itemId)}`;
}
