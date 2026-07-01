import * as React from 'react';
import type { IVanBanItem } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailInfoTabProps {
  release: IVanBanItem;
}

function renderField(label: string, value: React.ReactNode): React.ReactElement {
  return (
    <div className={styles.detailField}>
      <span className={styles.detailFieldLabel}>{label}</span>
      <div className={styles.detailFieldValue}>{value || '---'}</div>
    </div>
  );
}

export function PhvbMagDetailInfoTab(props: IPhvbMagDetailInfoTabProps): React.ReactElement {
  const { release } = props;

  return (
    <div className={styles.detailInfoGrid}>
      {renderField('LOẠI YÊU CẦU', release.LoaiYeuCau)}
      {renderField('MÃ YÊU CẦU', release.IdYeuCau ? <strong>{release.IdYeuCau}</strong> : '---')}
      {renderField('THƯ MỤC', release.ThuMucBanHanh)}
      <div className={`${styles.detailField} ${styles.detailFieldFull}`}>
        <span className={styles.detailFieldLabel}>GHI CHÚ CHO NGƯỜI THẨM ĐỊNH</span>
        <div className={styles.detailFieldValue}>
          {release.GhiChuChoThamDinh?.trim() || <span className={styles.detailPlaceholder}>Không có ghi chú.</span>}
        </div>
      </div>
      <div className={`${styles.detailField} ${styles.detailFieldFull}`}>
        <span className={styles.detailFieldLabel}>TÓM TẮT</span>
        <div className={styles.detailFieldValue}>{release.TomTatNoiDung || 'Không có tóm tắt.'}</div>
      </div>
      {renderField('NGÀY HIỆU LỰC', release.HieuLucTu)}
      {renderField('NGÀY HẾT HIỆU LỰC', release.HieuLucDen)}
      {renderField('LOẠI SLA', release.Loai_SLA)}
      {renderField('SỐ VĂN BẢN', release.SoVanBan || <span className={styles.detailPlaceholder}>Chưa cấp số</span>)}
      {renderField('NGƯỜI LIÊN HỆ', release.LienHe || <span className={styles.detailPlaceholder}>Chưa có</span>)}
      <div className={styles.detailField}>
        <span className={styles.detailFieldLabel}>THÔNG BÁO USER</span>
        <div className={styles.detailFieldValue}>
          <label className={styles.detailCheckboxReadonly}>
            <input type="checkbox" checked={release.IsSendMailNotify === true} readOnly disabled />
            <span>Gửi thông báo email</span>
          </label>
        </div>
      </div>
    </div>
  );
}
