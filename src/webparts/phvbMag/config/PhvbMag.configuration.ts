import type { ICreateRequestInput, IPhvbSiteContext, TabType } from '../models/PhvbMag.models';

export const DEFAULT_LIST_TITLE = 'InDoc_Release';
export const ISSUANCE_LIBRARY_TITLE = 'VanBanBanHanh_Ver02';
export const ATTACHMENT_LIBRARY_TITLE = 'VanBanGopYThamDinh';
export const COMMENT_ATTACHMENT_LIBRARY_TITLE = 'CommentAttach';
export const TEMPLATE_LIBRARY_TITLE = 'BieuMau';
export const HISTORY_LIST_TITLE = 'LichSuThucHien';
export const LOG_LIST_TITLE = 'Log';
export const PHVB_ROLE_LIST_TITLE = 'PHVB_Role';
export const CONFIG_MAIL_BAN_HANH_LIST_TITLE = 'lstConfigMailBanHanh';
export const CONFIG_LABEL_CUSTOM_LIST_TITLE = 'lstConfigLabelCustom';
export const COMMENT_HISTORY_STATUS = 'Bình luận';
export const ALL_USER_GOPY_LIST_TITLE = 'AllUser_GopY';
export const ALL_USER_THAMDINH_LIST_TITLE = 'AllUser_ThamDinh';
export const ALL_USER_PHEDUYET_LIST_TITLE = 'AllUser_PheDuyet';
export const ATTACHMENT_FORM_SUBFOLDER = 'Biểu Mẫu';
export const DRAFT_DOCUMENT_ACCEPT = '.docx,.pdf,.xlsx,.xls';
export const FORM_ATTACHMENT_ACCEPT = '.docx,.pdf,.xlsx,.xls';
export const ALL_FILTER_VALUE = 'All';

export const REQUEST_STATUS = {
  BAN_HANH: 'Ban hành',
  CHO_BAN_HANH: 'Chờ ban hành',
  CHO_CAP_SO: 'Chờ cấp số',
  DA_CAP_SO: 'Đã cấp số',
  DANG_GOP_Y: 'Đang góp ý',
  DANG_PHE_DUYET: 'Đang phê duyệt',
  DANG_THAM_DINH: 'Đang thẩm định',
  CHO_ADMIN_THU_HOI: 'Chờ admin thu hồi',
  CHO_SUPER_ADMIN_THU_HOI: 'Chờ supper admin thu hồi',
  THU_HOI: 'Thu hồi',
  BAN_NHAP: 'Bản nháp',
  TU_CHOI: 'Từ chối',
  YEU_CAU_CHINH_SUA: 'Yêu cầu chỉnh sửa'
} as const;

export type RequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export const PHVB_ROLES = {
  DC: 'dc',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superAdmin'
} as const;

export type PhvbRoleKey = typeof PHVB_ROLES[keyof typeof PHVB_ROLES];

export const SEND_MAIL_TYPE = {
  YEU_CAU_GOP_Y: 'YEU_CAU_GOP_Y',
  XAC_NHAN_GOP_Y: 'XAC_NHAN_GOP_Y',
  YEU_CAU_THAM_DINH: 'YEU_CAU_THAM_DINH',
  XAC_NHAN_THAM_DINH: 'XAC_NHAN_THAM_DINH',
  YEU_CAU_PHE_DUYET: 'YEU_CAU_PHE_DUYET',
  XAC_NHAN_PHE_DUYET: 'XAC_NHAN_PHE_DUYET',
  YEU_CAU_CAP_SO: 'YEU_CAU_CAP_SO',
  XAC_NHAN_CAP_SO: 'XAC_NHAN_CAP_SO',
  YEU_CAU_BAN_HANH: 'YEU_CAU_BAN_HANH'
} as const;

export type SendMailType = typeof SEND_MAIL_TYPE[keyof typeof SEND_MAIL_TYPE];

export const SEND_MAIL_APPROVAL_STATUS = {
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_TU_CHOI: 'Đã từ chối'
} as const;

export const BAN_HANH_MAIL_LABELS = {
  CONTENT_VN: 'contentMailVN',
  CONTENT_ENG: 'contentMailEng'
} as const;

export const BAN_HANH_NOTIFY_DEFAULTS = {
  BO_PHAN_GUI_TV: 'Bộ phận Quản lý VBNB',
  BO_PHAN_GUI_TA: 'Internal Document Management Team',
  PRIORITY_FOLDER: '2.Quản Trị Theo Chức Năng'
} as const;

export const EXECUTION_HISTORY_STATUS = {
  TAO_BAN_NHAP: 'Tạo bản nháp',
  TAO_YEU_CAU: 'Tạo yêu cầu',
  XAC_NHAN_GOP_Y: 'Xác nhận góp ý',
  DONG_Y_GOP_Y: 'Đồng ý góp ý',
  XAC_NHAN_THAM_DINH: 'Xác nhận thẩm định',
  PHE_DUYET: 'Phê duyệt',
  TU_CHOI: 'Từ chối',
  YEU_CAU_CHINH_SUA: 'Yêu cầu chỉnh sửa',
  NHAC_HAN: 'Nhắc hạn',
  CAP_NHAT_BAN_NHAP: 'Cập nhật bản nháp',
  CAP_NHAT_YEU_CAU: 'Cập nhật yêu cầu',
  CAP_NHAT_NGUOI_THAM_GIA: 'Cập nhật người tham gia',
  THEM_TAI_LIEU: 'Thêm tài liệu',
  XOA_TAI_LIEU: 'Xóa tài liệu'
} as const;

export type ExecutionHistoryStatus = typeof EXECUTION_HISTORY_STATUS[keyof typeof EXECUTION_HISTORY_STATUS];

export const EXECUTION_HISTORY_STATUS_LIST: ReadonlyArray<ExecutionHistoryStatus> = [
  EXECUTION_HISTORY_STATUS.TAO_BAN_NHAP,
  EXECUTION_HISTORY_STATUS.TAO_YEU_CAU,
  EXECUTION_HISTORY_STATUS.XAC_NHAN_GOP_Y,
  EXECUTION_HISTORY_STATUS.DONG_Y_GOP_Y,
  EXECUTION_HISTORY_STATUS.XAC_NHAN_THAM_DINH,
  EXECUTION_HISTORY_STATUS.PHE_DUYET,
  EXECUTION_HISTORY_STATUS.TU_CHOI,
  EXECUTION_HISTORY_STATUS.YEU_CAU_CHINH_SUA,
  EXECUTION_HISTORY_STATUS.NHAC_HAN,
  EXECUTION_HISTORY_STATUS.CAP_NHAT_BAN_NHAP,
  EXECUTION_HISTORY_STATUS.CAP_NHAT_YEU_CAU,
  EXECUTION_HISTORY_STATUS.CAP_NHAT_NGUOI_THAM_GIA,
  EXECUTION_HISTORY_STATUS.THEM_TAI_LIEU,
  EXECUTION_HISTORY_STATUS.XOA_TAI_LIEU
];

export const WORKFLOW_PARTICIPANT_STATUS = {
  CHUA_XAC_NHAN: 'Chưa xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  /** Trạng thái cũ — tương đương Chưa xác nhận */
  CHUA_DEN_LUOT: 'Chưa đến lượt'
} as const;

export const TAB_LABELS: Record<TabType, string> = {
  TrangChu: 'Trang chủ',
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
  existingTaiLieuAttachments: [],
  existingBieuMauAttachments: [],
  removedAttachmentIds: [],
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
    bieuMauFiles: [],
    existingTaiLieuAttachments: [],
    existingBieuMauAttachments: [],
    removedAttachmentIds: []
  };
}

export function resolveListTitle(listTitle?: string): string {
  return listTitle && listTitle.trim() ? listTitle.trim() : DEFAULT_LIST_TITLE;
}

export function hasSharePointSiteContext(context: Pick<IPhvbSiteContext, 'currentWebUrl' | 'siteCollectionUrl' | 'sourceSiteUrl'>): boolean {
  return Boolean((context.sourceSiteUrl && context.sourceSiteUrl.trim()) || context.currentWebUrl || context.siteCollectionUrl);
}

export interface IWorkflowStep {
  key: string;
  label: string;
  stepIndex: number;
}

export const WORKFLOW_STEPS: ReadonlyArray<IWorkflowStep> = [
  { key: 'draft', label: 'Soạn thảo', stepIndex: 1 },
  { key: 'gopy', label: 'Góp ý', stepIndex: 2 },
  { key: 'thamdinh', label: 'Thẩm định', stepIndex: 3 },
  { key: 'pheduyet', label: 'Phê duyệt', stepIndex: 4 },
  { key: 'capso', label: 'Cấp số', stepIndex: 5 },
  { key: 'banhanh', label: 'Ban hành', stepIndex: 6 }
];

export function getWorkflowStepFromStatus(statusApproved?: string): number {
  const status = (statusApproved || '').trim();

  switch (status) {
    case REQUEST_STATUS.BAN_NHAP:
      return 1;
    case REQUEST_STATUS.YEU_CAU_CHINH_SUA:
      return 1;
    case REQUEST_STATUS.TU_CHOI:
      return 1;
    case REQUEST_STATUS.DANG_GOP_Y:
      return 2;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return 3;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 4;
    case REQUEST_STATUS.CHO_CAP_SO:
    case REQUEST_STATUS.DA_CAP_SO:
      return 5;
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return 5;
    case REQUEST_STATUS.CHO_BAN_HANH:
    case REQUEST_STATUS.BAN_HANH:
      return 6;
    default:
      return 2;
  }
}