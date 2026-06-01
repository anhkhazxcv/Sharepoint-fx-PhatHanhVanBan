import * as React from 'react';
import { getBadgeVariant, getSummaryPreview } from '../PhvbMag.selectors';
import type { IVanBanItem } from '../PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagTableProps {
  items: IVanBanItem[];
  isLoading: boolean;
  onSelectItem: (item: IVanBanItem) => void;
}

export function PhvbMagTable(props: IPhvbMagTableProps): React.ReactElement {
  const { items, isLoading, onSelectItem } = props;

  return (
    <div className={styles.tableCard}>
      {isLoading ? (
        <div className={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map(index => (
            <div key={index} className={styles.skeletonRow}>
              <div className={styles.skeletonCell} style={{ width: '40%' }} />
              <div className={styles.skeletonCell} style={{ width: '15%' }} />
              <div className={styles.skeletonCell} style={{ width: '10%' }} />
              <div className={styles.skeletonCell} style={{ width: '15%' }} />
              <div className={styles.skeletonCell} style={{ width: '10%' }} />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Không có dữ liệu phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <table className={styles.docTable}>
          <thead>
            <tr>
              <th>TÊN VĂN BẢN</th>
              <th>MÃ HIỆU</th>
              <th>LOẠI</th>
              <th>PHÒNG BAN</th>
              <th>BAN HÀNH</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const summaryPreview = getSummaryPreview(item.TomTatNoiDung);

              return (
                <tr key={item.Id} onClick={() => onSelectItem(item)} className={styles.tableRow}>
                  <td className={styles.titleColumn}>
                    <div className={styles.docTitleText}>{item.Tenvanban || 'Chưa có tên văn bản'}</div>
                    {summaryPreview && <div className={styles.docSubtitleText}>{summaryPreview}</div>}
                  </td>
                  <td className={styles.codeColumn}>
                    {item.SoVanBan ? <span className={styles.codeText}>{item.SoVanBan}</span> : <span className={styles.missingCode}>Chờ cấp số</span>}
                  </td>
                  <td className={styles.typeColumn}>
                    {item.LoaiYeuCau && <span className={`${styles.badge} ${styles[getBadgeVariant(item.LoaiYeuCau)]}`}>{item.LoaiYeuCau}</span>}
                  </td>
                  <td className={styles.deptColumn}>
                    {item.KhoaPhongNguoiTao && <span className={styles.deptPill}>{item.KhoaPhongNguoiTao}</span>}
                  </td>
                  <td className={styles.dateColumn}>{item.NgayPhatHanh || item.NgayTaoYeuCau || '---'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}