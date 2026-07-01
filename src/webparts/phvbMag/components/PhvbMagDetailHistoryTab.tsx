import * as React from 'react';
import type { ILichSuThucHienItem } from '../models/PhvbMag.models';
import { formatExecutionDateTime } from '../utils/PhvbMagDateTime.utils';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailHistoryTabProps {
  history: ILichSuThucHienItem[];
}

export function PhvbMagDetailHistoryTab(props: IPhvbMagDetailHistoryTabProps): React.ReactElement {
  const { history } = props;

  if (history.length === 0) {
    return (
      <div className={styles.detailEmptyState}>
        Chưa có lịch sử thực hiện cho yêu cầu này.
      </div>
    );
  }

  return (
    <div className={styles.detailHistoryList}>
      {history.map(item => (
        <div key={item.Id} className={styles.detailHistoryItem}>
          <div className={styles.detailHistoryHeader}>
            <strong>{item.User_ThucHien || '---'}</strong>
            {item.PhongBan_ThucHien ? <span className={styles.detailHistoryDept}>({item.PhongBan_ThucHien})</span> : null}
            <span className={styles.detailHistoryDate}>
              {formatExecutionDateTime(item.Created)}
            </span>
          </div>
          {item.TrangThai_ThucHien ? (
            <span className={styles.detailHistoryStatus}>{item.TrangThai_ThucHien}</span>
          ) : null}
          {item.NoiDung ? <p className={styles.detailHistoryContent}>{item.NoiDung}</p> : null}
        </div>
      ))}
    </div>
  );
}
