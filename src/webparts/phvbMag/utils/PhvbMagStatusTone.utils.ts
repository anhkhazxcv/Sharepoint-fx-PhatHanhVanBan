import { EXECUTION_HISTORY_STATUS, REQUEST_STATUS } from '../config/PhvbMag.configuration';

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
    case EXECUTION_HISTORY_STATUS.TAO_BAN_NHAP:
    case EXECUTION_HISTORY_STATUS.CAP_NHAT_BAN_NHAP:
      return 'draft';
    case EXECUTION_HISTORY_STATUS.TAO_YEU_CAU:
      return 'info';
    case EXECUTION_HISTORY_STATUS.NHAC_HAN:
      return 'warning';
    case EXECUTION_HISTORY_STATUS.XAC_NHAN_GOP_Y:
    case EXECUTION_HISTORY_STATUS.DONG_Y_GOP_Y:
    case EXECUTION_HISTORY_STATUS.XAC_NHAN_THAM_DINH:
    case EXECUTION_HISTORY_STATUS.PHE_DUYET:
      return 'success';
    case EXECUTION_HISTORY_STATUS.TU_CHOI:
      return 'error';
    case EXECUTION_HISTORY_STATUS.CAP_NHAT_YEU_CAU:
    case EXECUTION_HISTORY_STATUS.CAP_NHAT_NGUOI_THAM_GIA:
    case EXECUTION_HISTORY_STATUS.THEM_TAI_LIEU:
    case EXECUTION_HISTORY_STATUS.XOA_TAI_LIEU:
      return 'archived';
    default:
      return 'draft';
  }
}
