import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import { buildLibraryFolderPath, buildPreviewSearch } from './PhvbMagLibrary.utils';

/**
 * Chặn cast bừa từ param `:tabName`. TAB_LABELS là Record<TabType, string> nên
 * whitelist tự đồng bộ khi thêm tab, không phải nuôi danh sách thứ hai.
 */
export function isTabType(value: string | undefined): value is TabType {
  return Boolean(value) && Object.keys(TAB_LABELS).indexOf(value as string) > -1;
}

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

  // URL lạ (sai hoa thường, tab không tồn tại) phải rơi về fallback: nếu cast
  // bừa, loadTabItems rơi vào nhánh default và trả nguyên list không lọc.
  return isTabType(tabName) ? tabName : fallback;
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
