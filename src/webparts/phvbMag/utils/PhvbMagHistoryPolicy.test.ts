import {
  TRANG_THAI_THUC_HIEN,
  TRANG_THAI_THUC_HIEN_VALUES,
  TrangThaiThucHien
} from '../config/PhvbMag.configuration';
import { validateHistoryNoiDung } from './PhvbMagHistoryPolicy.utils';

describe('PhvbMagHistoryPolicy', () => {
  it('keeps exactly the 23 configured history statuses', () => {
    expect(TRANG_THAI_THUC_HIEN_VALUES).toEqual([
      'Tạo bản nháp',
      'Tạo yêu cầu',
      'Cập nhật bản nháp',
      'Cập nhật yêu cầu',
      'Sửa thông tin yêu cầu',
      'Xác nhận góp ý',
      'Xác nhận thẩm định',
      'Xác nhận phê duyệt',
      'Từ chối thẩm định',
      'Từ chối phê duyệt',
      'Chuyển thẩm định',
      'Chuyển phê duyệt',
      'Chuyển cấp số',
      'Cấp số văn bản',
      'Chuẩn bị ban hành',
      'Ban hành văn bản',
      'Sửa thông báo ban hành',
      'Trả về ban hành',
      'Cập nhật người tham gia',
      'Nhắc hạn',
      'Thêm tài liệu',
      'Xoá tài liệu',
      'Bình luận'
    ]);
    expect(new Set(TRANG_THAI_THUC_HIEN_VALUES).size).toBe(23);
  });

  it('throws for empty status', () => {
    expect(() => validateHistoryNoiDung('' as TrangThaiThucHien, 'abc')).toThrow('TrangThai_ThucHien');
  });

  it('requires content for non-empty user statuses', () => {
    expect(() => validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.TU_CHOI_THAM_DINH, '  ')).toThrow('NoiDung');
    expect(() => validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.BINH_LUAN, '')).toThrow('NoiDung');
  });

  it('allows empty approval comments', () => {
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.XAC_NHAN_GOP_Y, '')).toBe('');
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.XAC_NHAN_THAM_DINH, '   ')).toBe('');
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.XAC_NHAN_PHE_DUYET, '   ')).toBe('');
  });

  it('forces empty statuses to an empty string', () => {
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.CHUYEN_THAM_DINH, 'ignored')).toBe('');
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.CHUYEN_PHE_DUYET, undefined as unknown as string)).toBe('');
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.CHUYEN_CAP_SO, 'ignored')).toBe('');
    expect(validateHistoryNoiDung(TRANG_THAI_THUC_HIEN.BAN_HANH, 'ignored')).toBe('');
  });

  it('sanitizes user-entered content in one place', () => {
    const longText = new Array(2105).join('a');
    const result = validateHistoryNoiDung(
      TRANG_THAI_THUC_HIEN.TRA_VE_BAN_HANH,
      `<p>Lý do</p>\n\n\n${longText}`
    );

    expect(result.indexOf('<p>')).toBe(-1);
    expect(result.indexOf('\n\n\n')).toBe(-1);
    expect(result.length).toBe(2001);
    expect(result.charAt(result.length - 1)).toBe('…');
  });
});
