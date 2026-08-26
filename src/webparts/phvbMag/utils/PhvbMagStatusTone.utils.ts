import { LEGACY_TRANG_THAI_THUC_HIEN, REQUEST_STATUS, TRANG_THAI_THUC_HIEN } from '../config/PhvbMag.configuration';

export type StatusTone = 'draft' | 'info' | 'warning' | 'success' | 'error' | 'archived';

export function getRequestStatusTone(status: string): StatusTone {
  switch (status) {
    case REQUEST_STATUS.BAN_NHAP:
      return 'draft';
    case REQUEST_STATUS.DANG_GOP_Y:
    case REQUEST_STATUS.DANG_THAM_DINH:
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return 'info';
    case REQUEST_STATUS.CHO_CAP_SO:
    case REQUEST_STATUS.CHO_BAN_HANH:
      return 'warning';
    case REQUEST_STATUS.DA_CAP_SO:
    case REQUEST_STATUS.BAN_HANH:
      return 'success';
    case REQUEST_STATUS.TU_CHOI:
    case REQUEST_STATUS.TU_CHOI_THAM_DINH:
    case REQUEST_STATUS.TU_CHOI_PHE_DUYET:
      return 'error';
    case REQUEST_STATUS.THU_HOI:
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return 'archived';
    default:
      return 'draft';
  }
}

export function getExecutionHistoryTone(action: string): StatusTone {
  switch (action) {
    case TRANG_THAI_THUC_HIEN.TAO_BAN_NHAP:
    case TRANG_THAI_THUC_HIEN.CAP_NHAT_BAN_NHAP:
      return 'draft';
    case TRANG_THAI_THUC_HIEN.TAO_YEU_CAU:
    case TRANG_THAI_THUC_HIEN.BINH_LUAN:
    case TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH:
    case TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET:
    case TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO:
      return 'info';
    case TRANG_THAI_THUC_HIEN.NHAC_HAN:
    case TRANG_THAI_THUC_HIEN.CHUAN_BI_BAN_HANH:
    case TRANG_THAI_THUC_HIEN.TRA_VE_BAN_HANH:
    case LEGACY_TRANG_THAI_THUC_HIEN.TRA_VE_BAN_HANH:
      return 'warning';
    case TRANG_THAI_THUC_HIEN.XAC_NHAN_GOP_Y:
    case LEGACY_TRANG_THAI_THUC_HIEN.DONG_Y_GOP_Y:
    case TRANG_THAI_THUC_HIEN.XAC_NHAN_THAM_DINH:
    case TRANG_THAI_THUC_HIEN.XAC_NHAN_PHE_DUYET:
    case LEGACY_TRANG_THAI_THUC_HIEN.PHE_DUYET:
    case TRANG_THAI_THUC_HIEN.CAP_SO:
    case LEGACY_TRANG_THAI_THUC_HIEN.CAP_SO:
    case TRANG_THAI_THUC_HIEN.BAN_HANH:
    case LEGACY_TRANG_THAI_THUC_HIEN.BAN_HANH:
      return 'success';
    case TRANG_THAI_THUC_HIEN.TU_CHOI_THAM_DINH:
    case TRANG_THAI_THUC_HIEN.TU_CHOI_PHE_DUYET:
    case LEGACY_TRANG_THAI_THUC_HIEN.TU_CHOI:
      return 'error';
    case TRANG_THAI_THUC_HIEN.CAP_NHAT_YEU_CAU:
    case TRANG_THAI_THUC_HIEN.SUA_THONG_TIN:
    case TRANG_THAI_THUC_HIEN.CAP_NHAT_THAM_GIA:
    case TRANG_THAI_THUC_HIEN.THEM_TAI_LIEU:
    case TRANG_THAI_THUC_HIEN.XOA_TAI_LIEU:
    case TRANG_THAI_THUC_HIEN.SUA_THONG_BAO:
    case LEGACY_TRANG_THAI_THUC_HIEN.SUA_THONG_BAO:
      return 'archived';
    default:
      return 'draft';
  }
}
