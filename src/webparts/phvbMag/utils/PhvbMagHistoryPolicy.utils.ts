import { TRANG_THAI_THUC_HIEN, TrangThaiThucHien } from '../config/PhvbMag.configuration';
import { sanitizeUserNoiDung } from './PhvbMagHistoryText.utils';

export type HistoryNoiDungKind = 'user' | 'system' | 'empty';

export interface IHistoryFieldPolicy {
  kind: HistoryNoiDungKind;
  allowEmpty: boolean;
}

const HISTORY_POLICY: Record<TrangThaiThucHien, IHistoryFieldPolicy> = {
  [TRANG_THAI_THUC_HIEN.TAO_BAN_NHAP]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.TAO_YEU_CAU]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.CAP_NHAT_BAN_NHAP]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.CAP_NHAT_YEU_CAU]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.SUA_THONG_TIN]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_GOP_Y]: { kind: 'user', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_THAM_DINH]: { kind: 'user', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.XAC_NHAN_PHE_DUYET]: { kind: 'user', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.TU_CHOI_THAM_DINH]: { kind: 'user', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.TU_CHOI_PHE_DUYET]: { kind: 'user', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH]: { kind: 'empty', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET]: { kind: 'empty', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO]: { kind: 'empty', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.CAP_SO]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.CHUAN_BI_BAN_HANH]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.BAN_HANH]: { kind: 'empty', allowEmpty: true },
  [TRANG_THAI_THUC_HIEN.SUA_THONG_BAO]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.TRA_VE_BAN_HANH]: { kind: 'user', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.CAP_NHAT_THAM_GIA]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.NHAC_HAN]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.THEM_TAI_LIEU]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.XOA_TAI_LIEU]: { kind: 'system', allowEmpty: false },
  [TRANG_THAI_THUC_HIEN.BINH_LUAN]: { kind: 'user', allowEmpty: false }
};

/**
 * Chuẩn hoá NoiDung theo policy của từng trạng thái — nguồn kiểm tra duy nhất,
 * thay cho việc rải `if (!noiDung) throw` ở từng service.
 */
export function validateHistoryNoiDung(trangThaiThucHien: TrangThaiThucHien, noiDung: string): string {
  if (!trangThaiThucHien) {
    throw new Error('TrangThai_ThucHien không được rỗng.');
  }

  const policy = HISTORY_POLICY[trangThaiThucHien];

  if (!policy) {
    throw new Error(`TrangThai_ThucHien không hợp lệ: "${trangThaiThucHien}".`);
  }

  if (policy.kind === 'empty') {
    return '';
  }

  const normalized = policy.kind === 'user' ? sanitizeUserNoiDung(noiDung) : noiDung.trim();

  if (!policy.allowEmpty && !normalized) {
    throw new Error(`NoiDung bắt buộc cho trạng thái "${trangThaiThucHien}".`);
  }

  return normalized;
}
