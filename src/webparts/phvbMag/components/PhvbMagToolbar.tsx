import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagToolbarProps {
  activeTab: TabType;
  canCreate: boolean;
  onOpenCreate: () => void;
}

export function PhvbMagToolbar(props: IPhvbMagToolbarProps): React.ReactElement {
  const { activeTab, canCreate, onOpenCreate } = props;

  return (
    <header className={[styles.contentHeader, activeTab === 'ViecCanLam' ? styles.contentHeaderTask : ''].filter(Boolean).join(' ')}>
      <div className={styles.pageHeading}>
        <span className={styles.pageEyebrow}>Văn bản nội bộ</span>
        <h2>{TAB_LABELS[activeTab]}</h2>
      </div>

      <div className={styles.headerActions}>
        <button type="button" className={styles.btnTemplate}>
          <span>Template</span>
        </button>

        <button type="button" className={styles.btnCreate} onClick={onOpenCreate} disabled={!canCreate}>
          <span>+ Tạo yêu cầu</span>
        </button>
      </div>
    </header>
  );
}