import type { SPHttpClient } from '@microsoft/sp-http';

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

export interface IPhvbSiteContext {
  currentWebUrl: string;
  siteCollectionUrl: string;
  sourceSiteUrl?: string;
  listTitle?: string;
  spHttpClient: SPHttpClient;
}

export interface IPhvbUserContext {
  userDisplayName: string;
  userEmail: string;
}

export interface IPhvbDocumentContext extends IPhvbSiteContext, IPhvbUserContext {}

export type BadgeVariant = 'badgeTC' | 'badgeQC' | 'badgeQD' | 'badgeCS' | 'badgeHD';

export type UniqueItemField = 'LoaiYeuCau' | 'KhoaPhongNguoiTao';

export const DEFAULT_TAB_COUNTS: ITabCounts = {
  viecCanLam: 0,
  yeuCauCuaToi: 0,
  admin: 0,
  capSo: 0
};