import { ALL_FILTER_VALUE } from '../config/PhvbMag.configuration';
import type { BadgeVariant, IVanBanItem, UniqueItemField } from '../models/PhvbMag.models';

export interface IPhvbFilterState {
  searchQuery: string;
  filterType: string;
  filterDept: string;
}

function includesCaseInsensitive(value: string | undefined, query: string): boolean {
  return Boolean(value && value.toLowerCase().indexOf(query) > -1);
}

export function selectFilteredItems(items: IVanBanItem[], filters: IPhvbFilterState): IVanBanItem[] {
  const normalizedQuery = filters.searchQuery.trim().toLowerCase();

  return items.filter(item => {
    if (filters.filterType !== ALL_FILTER_VALUE && item.LoaiYeuCau !== filters.filterType) {
      return false;
    }

    if (filters.filterDept !== ALL_FILTER_VALUE && item.KhoaPhongNguoiTao !== filters.filterDept) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      includesCaseInsensitive(item.Tenvanban, normalizedQuery) ||
      includesCaseInsensitive(item.SoVanBan, normalizedQuery) ||
      includesCaseInsensitive(item.TomTatNoiDung, normalizedQuery) ||
      includesCaseInsensitive(item.KhoaPhongNguoiTao, normalizedQuery) ||
      includesCaseInsensitive(item.NguoiTao, normalizedQuery)
    );
  });
}

export function getUniqueFieldValues(items: IVanBanItem[], field: UniqueItemField): string[] {
  const seen: Record<string, boolean> = {};
  const values: string[] = [];

  items.forEach(item => {
    const value = item[field];
    if (value && !seen[value]) {
      seen[value] = true;
      values.push(value);
    }
  });

  return values;
}

export function getBadgeVariant(type?: string): BadgeVariant {
  switch (type) {
    case 'Tiêu chuẩn':
      return 'badgeTC';
    case 'Quy chế':
      return 'badgeQC';
    case 'Quyết định':
      return 'badgeQD';
    case 'Chính sách':
      return 'badgeCS';
    default:
      return 'badgeHD';
  }
}

export function getSummaryPreview(summary?: string, maxLength: number = 80): string | undefined {
  if (!summary) {
    return undefined;
  }

  if (summary.length <= maxLength) {
    return summary;
  }

  return `${summary.substring(0, maxLength)}...`;
}