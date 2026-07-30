import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import { CreateActionIcon } from './PhvbMagIcons';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
import styles from './PhvbMag.module.scss';

interface IPhvbMagToolbarProps {
  activeTab: TabType;
  canCreate: boolean;
  onOpenCreate: () => void;
  onOpenTemplate: () => void;
}

export function PhvbMagToolbar(props: IPhvbMagToolbarProps): React.ReactElement {
  const { activeTab, canCreate, onOpenCreate, onOpenTemplate } = props;

  return (
    <PhvbMagPageHeader
      eyebrow="Văn bản nội bộ"
      title={TAB_LABELS[activeTab]}
      className={[styles.contentHeader, activeTab === 'ViecCanLam' ? styles.contentHeaderTask : ''].filter(Boolean).join(' ')}
      headerActions={(
        <div className={styles.headerActions}>
          <button type="button" className={styles.btnTemplate} onClick={onOpenTemplate}>
            <span>Template</span>
          </button>

          <button type="button" className={styles.btnCreate} onClick={onOpenCreate} disabled={!canCreate}>
            <span className={styles.btnCreateContent}>
              <CreateActionIcon />
              Tạo yêu cầu
            </span>
          </button>
        </div>
      )}
    />
  );
}