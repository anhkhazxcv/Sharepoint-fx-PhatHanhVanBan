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
  GhiChuChoThamDinh?: string;
  IsSendMailNotify?: boolean;
}

export interface ILichSuThucHienItem {
  Id: number;
  IDYeuCau?: string;
  User_ThucHien?: string;
  Email_ThucHien?: string;
  PhongBan_ThucHien?: string;
  Ngay_ThucHien?: string;
  TrangThai_ThucHien?: string;
  NoiDung?: string;
  /** Thời điểm tạo item trên SharePoint (list LichSuThucHien) */
  Created?: string;
  /** Chỉ có trên list LichSuThucHien */
  IsComment?: boolean;
}

export interface IAllUserWorkflowItem {
  Id: number;
  IDYeuCau?: string;
  User_ThucHien?: string;
  Email_ThucHien?: string;
  PhongBan_ThucHien?: string;
  Ngay_ThucHien?: string;
  TrangThai_ThucHien?: string;
  NoiDung?: string;
  Modified?: string;
}

export type WorkflowStage = 'gopy' | 'thamdinh' | 'pheduyet';

export interface IWorkflowParticipantItem extends IAllUserWorkflowItem {
  workflowStage: WorkflowStage;
  workflowStageLabel: string;
}

export interface IAttachmentLibraryItem {
  id: number;
  name: string;
  fileUrl: string;
  modified?: string;
  folderPath?: string;
  isFormAttachment?: boolean;
}

export interface ICommentAttachmentItem {
  id: number;
  commentId: number;
  name: string;
  fileUrl: string;
  modified?: string;
}

export interface ICommentWithAttachments extends ILichSuThucHienItem {
  attachments: ICommentAttachmentItem[];
}

export interface IRequestDetailData {
  release: IVanBanItem;
  attachments: IAttachmentLibraryItem[];
  history: ILichSuThucHienItem[];
  comments: ICommentWithAttachments[];
  workflowParticipants: IWorkflowParticipantItem[];
}

export type SaveRequestMode = 'submit' | 'draft';

export interface ISaveRequestResult {
  requestReferenceId: string;
  mode: SaveRequestMode;
}

export interface IEditRequestContext {
  itemId: number;
  idYeuCau: string;
}

export type TabType = 'TrangChu' | 'YeuCauCuaToi' | 'BanNhap' | 'ThuVienTaiLieu' | 'MoiBanHanh' | 'CapSo' | 'QLVanBan';

export interface ITabCounts {
  trangChu: number;
  yeuCauCuaToi: number;
  banNhap: number;
  capSo: number;
  qlVanBan: number;
  admin: number;
}

export interface IPhvbRoleEntry {
  role: string;
  email: string;
}

export interface ICreateRequestInput {
  title: string;
  code: string;
  type: string;
  department: string;
  approvalUsers: string[];
  summary: string;
  contact: string;
  folder: string;
  hieuLucTu: string;
  hieuLucDen: string;
  noiLuu: string;

  // New fields for the redesigned UI dialog:
  requestType: 'Viết mới' | 'Điều chỉnh' | 'Thu hồi';
  titleEn?: string;
  folderLuuTru: string;
  taiLieuFiles: File[];
  bieuMauFiles: File[];
  /** File đã lưu trên SharePoint (chỉ dùng khi chỉnh sửa bản nháp) */
  existingTaiLieuAttachments: IAttachmentLibraryItem[];
  existingBieuMauAttachments: IAttachmentLibraryItem[];
  /** Id file SharePoint đánh dấu xóa — chỉ gọi API khi lưu/gửi */
  removedAttachmentIds: number[];
  folderBieuMauDinhKem?: string;
  loaiSla?: string;
  nguoiGopY: string[];
  deadlineGopY?: string;
  nguoiThamDinh: string[];
  deadlineThamDinh?: string;
  deadlinePheDuyet?: string;
  ghiChuThamDinh?: string;
  isSendMailNotify: boolean;
  idFolderOld?: number;
}

export interface IBanHanhLibraryItem {
  id: number;
  name: string;
  fileDirRef: string;
  fsObjType: number;
  fileRef: string;
  tomTatVanban?: string;
  ngayPhatHanh?: string;
  hieuLucTu?: string;
  lienHe?: string;
  fileUrl: string;
}

export interface ITemplateLibraryItem {
  id: number;
  name: string;
  fileExtension: string;
  fileUrl: string;
}

export interface IBanHanhFolderNode {
  id: number;
  name: string;
  serverRelativePath: string;
  children: IBanHanhFolderNode[];
}

export interface ISelectedBanHanhFolder {
  id: number;
  name: string;
  serverRelativePath: string;
  storagePath: string;
}

export interface IPhvbDirectoryUser {
  id: string;
  displayName: string;
  email: string;
  department?: string;
  jobTitle?: string;
}

export interface IPhvbCurrentUserProfile {
  displayName: string;
  email: string;
  department?: string;
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

export interface IPhvbLogEntry {
  title: string;
  userEmail?: string;
  screenName?: string;
  actionName?: string;
  listName?: string;
  itemId?: string | number;
  errorMessage?: string;
  requestFields?: string;
  requestPayload?: string;
  flowRunId?: string;
}

export interface IPhvbLogContext {
  userEmail?: string;
  screenName?: string;
  actionName?: string;
  flowRunId?: string;
  itemId?: string | number;
}

export type BadgeVariant = 'badgeTC' | 'badgeQC' | 'badgeQD' | 'badgeCS' | 'badgeHD';

export type UniqueItemField = 'LoaiYeuCau' | 'KhoaPhongNguoiTao';

export const DEFAULT_TAB_COUNTS: ITabCounts = {
  trangChu: 0,
  yeuCauCuaToi: 0,
  banNhap: 0,
  capSo: 0,
  qlVanBan: 0,
  admin: 0
};