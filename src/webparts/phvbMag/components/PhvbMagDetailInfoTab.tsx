import * as React from 'react';
import { Pin20Regular } from '@fluentui/react-icons';
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

function renderNoteBody(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.length > 4 && part.indexOf('**') === 0 && part.lastIndexOf('**') === part.length - 2) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export function PhvbMagDetailInfoTab(props: IPhvbMagDetailInfoTabProps): React.ReactElement {
  const { release } = props;
  const noteText = release.GhiChuChoThamDinh?.trim();

  return (
    <div className={styles.detailInfoLayout}>
      <div className={styles.detailInfoGrid}>
        {renderField('LOẠI YÊU CẦU', release.LoaiYeuCau)}
        {renderField('MÃ YÊU CẦU', release.IdYeuCau ? <strong>{release.IdYeuCau}</strong> : '---')}
        {renderField('THƯ MỤC', release.ThuMucBanHanh)}
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

      <section className={styles.detailInfoSummaryBlock} aria-label="Tóm tắt nội dung">
        <span className={styles.detailInfoSummaryTitle}>TÓM TẮT NỘI DUNG</span>
        <div className={styles.detailInfoSummaryBody}>
          {release.TomTatNoiDung?.trim() || <span className={styles.detailPlaceholder}>Không có tóm tắt.</span>}
        </div>
      </section>

      <section className={styles.detailInfoNoteCallout} aria-label="Ghi chú cho cấp TĐ / PD">
        <div className={styles.detailInfoNoteHeader}>
          <Pin20Regular className={styles.detailInfoNoteIcon} aria-hidden="true" />
          <span className={styles.detailInfoNoteTitle}>GHI CHÚ CHO CẤP TĐ / PD</span>
        </div>
        <div className={styles.detailInfoNoteBody}>
          {noteText ? renderNoteBody(noteText) : <span className={styles.detailPlaceholder}>Không có ghi chú.</span>}
        </div>
      </section>
    </div>
  );
}
