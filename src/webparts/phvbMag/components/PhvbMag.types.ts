export interface IVanBanItem {
  Id: number;
  Tenvanban?: string;
  NgayPhatHanh?: string;
  HieuLucTu?: string;
  HieuLucDen?: string;
  NoiLuuBanCung?: string;
  TomTatNoiDung?: string;
  NguoiTao?: string;
  EmailNguoiTao?: string;
  KhoaPhongNguoiTao?: string;
  IdYeuCau?: string;
  PheDuyet?: string;
  LienHe?: string;
  StatusApproved?: string;
  LoaiYeuCau?: string;
  NgayTaoYeuCau?: string;
  ThamDinh?: string;
  NguoiGopY?: string;
  SoVanBan?: string;
  TenVanBan_ENG?: string;
  DC_CapSo_Name?: string;
  DC_CapSo_Email?: string;
  Loai_SLA?: string;
  Date_GopY?: string;
  Date_ThamDinh?: string;
  Date_PheDuyet?: string;
  IsCreateFolderExpire?: boolean;
  ThuMucBanHanh?: string;
  LinkToFolderOld?: string;
}

export type TabType = 'ViecCanLam' | 'YeuCauCuaToi' | 'Admin' | 'CapSo';

export interface ITabCounts {
  viecCanLam: number;
  yeuCauCuaToi: number;
  admin: number;
  capSo: number;
}

export interface ICreateRequestInput {
  title: string;
  code: string;
  type: string;
  department: string;
  summary: string;
  contact: string;
  folder: string;
  hieuLucTu: string;
  hieuLucDen: string;
  noiLuu: string;
}

export const DEFAULT_TAB_COUNTS: ITabCounts = {
  viecCanLam: 0,
  yeuCauCuaToi: 0,
  admin: 0,
  capSo: 0
};

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

export const TAB_LABELS: { [key in TabType]: string } = {
  ViecCanLam: 'Việc cần làm',
  YeuCauCuaToi: 'Yêu cầu của tôi',
  Admin: 'Admin',
  CapSo: 'Cấp số'
};

export const DOCUMENT_TYPE_OPTIONS: string[] = [
  'Tiêu chuẩn',
  'Quy chế',
  'Quyết định',
  'Chính sách',
  'Hướng dẫn',
  'Biểu mẫu'
];

export const DEPARTMENT_OPTIONS: string[] = [
  'Ops. Control',
  'Corporate Gov.',
  'Business Program',
  'Nhân sự',
  'Tài chính',
  'Marketing',
  'Công nghệ TT',
  'Thiết kế'
];

export const FOLDER_OPTIONS: string[] = [
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

export type BadgeVariant = 'badgeTC' | 'badgeQC' | 'badgeQD' | 'badgeCS' | 'badgeHD';

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

export function getUniqueValues(
  items: IVanBanItem[],
  field: 'LoaiYeuCau' | 'KhoaPhongNguoiTao'
): string[] {
  const seen: { [key: string]: boolean } = {};
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