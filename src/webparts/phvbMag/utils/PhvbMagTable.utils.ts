import { ALL_FILTER_VALUE, REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';
import { parseExecutionDateTime } from './PhvbMagDateTime.utils';

export type RequestTableSortKey =
  | 'Tenvanban'
  | 'SoVanBan'
  | 'LoaiYeuCau'
  | 'KhoaPhongNguoiTao'
  | 'NgayTaoYeuCau'
  | 'StatusApproved'
  | 'Id';

export type RequestTableSortDirection = 'asc' | 'desc';

export interface IRequestTableFilters {
  status: string;
  loaiYeuCau: string;
  department: string;
  requestCreatedYear: string;
}

export const DEFAULT_REQUEST_TABLE_FILTERS: IRequestTableFilters = {
  status: ALL_FILTER_VALUE,
  loaiYeuCau: ALL_FILTER_VALUE,
  department: ALL_FILTER_VALUE,
  requestCreatedYear: ALL_FILTER_VALUE
};

export type WorkflowBucketKey = 'gopY' | 'thamDinh' | 'pheDuyet' | 'choBanHanh';

export interface IWorkflowMetricCard {
  key: WorkflowBucketKey;
  count: number;
  label: string;
  hint: string;
  tone: 'danger' | 'warning' | 'success' | 'info';
}

const WORKFLOW_BUCKET_LABELS: Record<WorkflowBucketKey, string> = {
  gopY: 'Cần góp ý',
  thamDinh: 'Cần thẩm định',
  pheDuyet: 'Cần phê duyệt',
  choBanHanh: 'Chờ ban hành'
};

const WORKFLOW_BUCKET_ORDER: WorkflowBucketKey[] = ['gopY', 'thamDinh', 'pheDuyet', 'choBanHanh'];

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right, 'vi', { sensitivity: 'base' });
}

function compareOptionalStrings(left?: string, right?: string): number {
  return compareStrings((left || '').trim(), (right || '').trim());
}

function compareDates(left?: string, right?: string): number {
  const leftTime = parseExecutionDateTime(left)?.getTime();
  const rightTime = parseExecutionDateTime(right)?.getTime();

  if (leftTime === undefined && rightTime === undefined) {
    return 0;
  }

  if (leftTime === undefined) {
    return 1;
  }

  if (rightTime === undefined) {
    return -1;
  }

  return leftTime - rightTime;
}

export function resolveWorkflowBucket(item: IVanBanItem): WorkflowBucketKey | undefined {
  const status = (item.StatusApproved || '').trim();

  switch (status) {
    case REQUEST_STATUS.DANG_GOP_Y:
      return 'gopY';
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 'thamDinh';
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'pheDuyet';
    case REQUEST_STATUS.CHO_BAN_HANH:
      return 'choBanHanh';
    default:
      return undefined;
  }
}

export function getWorkflowMetricCards(items: IVanBanItem[]): IWorkflowMetricCard[] {
  const counts: Record<WorkflowBucketKey, number> = {
    gopY: 0,
    thamDinh: 0,
    pheDuyet: 0,
    choBanHanh: 0
  };

  items.forEach(item => {
    const bucket = resolveWorkflowBucket(item);

    if (bucket) {
      counts[bucket] += 1;
    }
  });

  const toneMap: Record<WorkflowBucketKey, IWorkflowMetricCard['tone']> = {
    gopY: 'info',
    thamDinh: 'warning',
    pheDuyet: 'success',
    choBanHanh: 'danger'
  };

  return WORKFLOW_BUCKET_ORDER.map(key => ({
    key,
    count: counts[key],
    label: WORKFLOW_BUCKET_LABELS[key],
    hint: 'Việc cần xử lý',
    tone: toneMap[key]
  }));
}

export function extractRequestCreatedYear(value?: string): string | undefined {
  const parsed = parseExecutionDateTime(value);

  if (!parsed || isNaN(parsed.getTime())) {
    return undefined;
  }

  return `${parsed.getFullYear()}`;
}

export function applyRequestTableFilters(items: IVanBanItem[], filters: IRequestTableFilters): IVanBanItem[] {
  return items.filter(item => {
    const status = (item.StatusApproved || '').trim();

    if (filters.status !== ALL_FILTER_VALUE && status !== filters.status) {
      return false;
    }

    const loaiYeuCau = (item.LoaiYeuCau || '').trim();

    if (filters.loaiYeuCau !== ALL_FILTER_VALUE && loaiYeuCau !== filters.loaiYeuCau) {
      return false;
    }

    const department = (item.KhoaPhongNguoiTao || '').trim();

    if (filters.department !== ALL_FILTER_VALUE && department !== filters.department) {
      return false;
    }

    if (filters.requestCreatedYear !== ALL_FILTER_VALUE) {
      const year = extractRequestCreatedYear(item.NgayTaoYeuCau);

      if (!year || year !== filters.requestCreatedYear) {
        return false;
      }
    }

    return true;
  });
}

export function sortRequestTableItems(
  items: IVanBanItem[],
  sortKey: RequestTableSortKey | undefined,
  direction: RequestTableSortDirection
): IVanBanItem[] {
  if (!sortKey) {
    return items.slice().sort((left, right) => right.Id - left.Id);
  }

  const multiplier = direction === 'asc' ? 1 : -1;
  const sorted = items.slice();

  sorted.sort((left, right) => {
    let result = 0;

    switch (sortKey) {
      case 'Tenvanban':
        result = compareOptionalStrings(left.Tenvanban, right.Tenvanban);
        break;
      case 'SoVanBan':
        result = compareOptionalStrings(left.SoVanBan, right.SoVanBan);
        break;
      case 'LoaiYeuCau':
        result = compareOptionalStrings(left.LoaiYeuCau, right.LoaiYeuCau);
        break;
      case 'KhoaPhongNguoiTao':
        result = compareOptionalStrings(left.KhoaPhongNguoiTao, right.KhoaPhongNguoiTao);
        break;
      case 'NgayTaoYeuCau':
        result = compareDates(left.NgayTaoYeuCau, right.NgayTaoYeuCau);
        break;
      case 'StatusApproved':
        result = compareOptionalStrings(left.StatusApproved, right.StatusApproved);
        break;
      case 'Id':
        result = left.Id - right.Id;
        break;
      default:
        result = 0;
    }

    if (result !== 0) {
      return result * multiplier;
    }

    return right.Id - left.Id;
  });

  return sorted;
}
