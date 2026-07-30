import type { TabType } from '../models/PhvbMag.models';

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
