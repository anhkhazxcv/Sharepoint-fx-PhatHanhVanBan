import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import { CreateActionIcon, DownloadIcon, SidebarNumberingIcon } from './PhvbMagIcons';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
import styles from './PhvbMag.module.scss';

interface IPhvbMagToolbarProps {
  activeTab: TabType;
  canCreate: boolean;
  canAccessDmvl?: boolean;
  onOpenCreate: () => void;
  onOpenDmvl?: () => void;
  onOpenTemplate: () => void;
}

export function PhvbMagToolbar(props: IPhvbMagToolbarProps): React.ReactElement {
  const { activeTab, canCreate, canAccessDmvl = false, onOpenCreate, onOpenDmvl, onOpenTemplate } = props;

  return (
    <PhvbMagPageHeader
      eyebrow="Văn bản nội bộ"
      title={TAB_LABELS[activeTab]}
      className={[styles.contentHeader, activeTab === 'ViecCanLam' ? styles.contentHeaderTask : ''].filter(Boolean).join(' ')}
      headerActions={(
        <div className={styles.headerActions}>
          {canAccessDmvl && onOpenDmvl ? (
            <button type="button" className={styles.btnDmvl} onClick={onOpenDmvl}>
              <span className={styles.btnDmvlContent}>
                <SidebarNumberingIcon />
                DMVL
              </span>
            </button>
          ) : null}

          <button type="button" className={styles.btnTemplate} onClick={onOpenTemplate}>
            <DownloadIcon className={styles.iconSizeSm} />
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