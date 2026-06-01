import type { ICreateRequestInput, IPhvbSiteContext, TabType } from './PhvbMag.models';

export const DEFAULT_LIST_TITLE = 'InDoc_Release';
export const ALL_FILTER_VALUE = 'All';

export const TAB_LABELS: Record<TabType, string> = {
  ViecCanLam: 'Việc cần làm',
  YeuCauCuaToi: 'Yêu cầu của tôi',
  Admin: 'Admin',
  CapSo: 'Cấp số'
};

export const DOCUMENT_TYPE_OPTIONS: ReadonlyArray<string> = [
  'Tiêu chuẩn',
  'Quy chế',
  'Quyết định',
  'Chính sách',
  'Hướng dẫn',
  'Biểu mẫu'
];

export const DEPARTMENT_OPTIONS: ReadonlyArray<string> = [
  'Ops. Control',
  'Corporate Gov.',
  'Business Program',
  'Nhân sự',
  'Tài chính',
  'Marketing',
  'Công nghệ TT',
  'Thiết kế'
];

export const FOLDER_OPTIONS: ReadonlyArray<string> = [
  '1. Quản trị chung/Tiêu chuẩn',
  '1. Quản trị chung/Quy chế',
  '1. Quản trị chung/Quyết định',
  '1. Quản trị chung/Chính sách',
  '1. Quản trị chung/Hướng dẫn',
  'Nhân sự',
  'Tài chính',
  'Marketing',
  'Công nghệ TT',
  'Thiết kế'
];

export const DEFAULT_REQUEST_FORM: ICreateRequestInput = {
  title: '',
  code: '',
  type: 'Tiêu chuẩn',
  department: 'Ops. Control',
  summary: '',
  contact: '',
  folder: '1. Quản trị chung/Tiêu chuẩn',
  hieuLucTu: '',
  hieuLucDen: '',
  noiLuu: ''
};

export function cloneDefaultRequestForm(): ICreateRequestInput {
  return {
    ...DEFAULT_REQUEST_FORM
  };
}

export function resolveListTitle(listTitle?: string): string {
  return listTitle && listTitle.trim() ? listTitle.trim() : DEFAULT_LIST_TITLE;
}

export function hasSharePointSiteContext(context: Pick<IPhvbSiteContext, 'currentWebUrl' | 'siteCollectionUrl' | 'sourceSiteUrl'>): boolean {
  return Boolean((context.sourceSiteUrl && context.sourceSiteUrl.trim()) || context.currentWebUrl || context.siteCollectionUrl);
}