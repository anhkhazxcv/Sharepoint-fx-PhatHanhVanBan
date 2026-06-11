import type { ICreateRequestInput, IPhvbSiteContext, TabType } from '../models/PhvbMag.models';

export const DEFAULT_LIST_TITLE = 'InDoc_Release';
export const ISSUANCE_LIBRARY_TITLE = 'VanBanBanHanh_Ver02';
export const ATTACHMENT_LIBRARY_TITLE = 'VanBanGopYThamDinh';
export const ATTACHMENT_FORM_SUBFOLDER = 'Biểu Mẫu';
export const DRAFT_DOCUMENT_ACCEPT = '.docx,.pdf,.xlsx,.xls';
export const FORM_ATTACHMENT_ACCEPT = '.docx,.pdf,.xlsx,.xls';
export const ALL_FILTER_VALUE = 'All';

export const REQUEST_STATUS = {
  BAN_HANH: 'Ban hành',
  CHO_BAN_HANH: 'Chờ ban hành',
  DA_CAP_SO: 'Đã cấp số',
  DANG_GOP_Y: 'Đang góp ý',
  DANG_PHE_DUYET: 'Đang phê duyệt',
  DANG_THAM_DINH: 'Đang thẩm định',
  CHO_ADMIN_THU_HOI: 'Chờ admin thu hồi',
  CHO_SUPER_ADMIN_THU_HOI: 'Chờ supper admin thu hồi',
  THU_HOI: 'Thu hồi',
  BAN_NHAP: 'Bản nháp'
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const TAB_LABELS: Record<TabType, string> = {
  ViecCanLam: 'Việc cần làm',
  YeuCauCuaToi: 'Yêu cầu của tôi',
  BanNhap: 'Bản nháp',
  ThuVienTaiLieu: 'Thư viện tài liệu',
  MoiBanHanh: 'Mới ban hành',
  CapSo: 'DC cấp số',
  QLVanBan: 'QL văn bản'
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

export interface ISlaOption {
  value: string;
  label: string;
  totalDays: number;
  description: string;
}

export const SLA_OPTIONS: ReadonlyArray<ISlaOption> = [
  {
    value: 'Văn bản nội khối',
    label: 'Văn bản nội khối',
    totalDays: 3,
    description: 'Thời hạn xử lý là 3 ngày.'
  },
  {
    value: 'Văn bản Liên khối',
    label: 'Văn bản Liên khối',
    totalDays: 7,
    description: 'Thời hạn xử lý là 7 ngày.'
  },
  {
    value: 'SLA ngoại lệ',
    label: 'SLA ngoại lệ',
    totalDays: 21,
    description: 'Thời hạn xử lý là 21 ngày.'
  }
];

export const DEFAULT_REQUEST_FORM: ICreateRequestInput = {
  title: '',
  code: '',
  type: 'Tiêu chuẩn',
  department: 'Ops. Control',
  approvalUsers: [],
  summary: '',
  contact: '',
  folder: '',
  hieuLucTu: '',
  hieuLucDen: '',
  noiLuu: '',

  // New fields default values:
  requestType: 'Viết mới',
  titleEn: '',
  folderLuuTru: '',
  taiLieuFiles: [],
  bieuMauFiles: [],
  folderBieuMauDinhKem: '',
  loaiSla: 'Văn bản nội khối',
  nguoiGopY: [],
  deadlineGopY: '',
  nguoiThamDinh: [],
  deadlineThamDinh: '',
  deadlinePheDuyet: '',
  ghiChuThamDinh: '',
  isSendMailNotify: true,
  idFolderOld: undefined
};

export function cloneDefaultRequestForm(): ICreateRequestInput {
  return {
    ...DEFAULT_REQUEST_FORM,
    approvalUsers: [],
    nguoiGopY: [],
    nguoiThamDinh: [],
    taiLieuFiles: [],
    bieuMauFiles: []
  };
}

export function resolveListTitle(listTitle?: string): string {
  return listTitle && listTitle.trim() ? listTitle.trim() : DEFAULT_LIST_TITLE;
}

export function hasSharePointSiteContext(context: Pick<IPhvbSiteContext, 'currentWebUrl' | 'siteCollectionUrl' | 'sourceSiteUrl'>): boolean {
  return Boolean((context.sourceSiteUrl && context.sourceSiteUrl.trim()) || context.currentWebUrl || context.siteCollectionUrl);
}