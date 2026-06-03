import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';
import { SearchIcon } from './PhvbMagIcons';

interface IPhvbMagToolbarProps {
  activeTab: TabType;
  searchQuery: string;
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onOpenCreate: () => void;
}

export function PhvbMagToolbar(props: IPhvbMagToolbarProps): React.ReactElement {
  const { activeTab, searchQuery, canCreate, onSearchChange, onOpenCreate } = props;

  return (
    <header className={styles.contentHeader}>
      <div className={styles.pageHeading}>
        <span className={styles.pageEyebrow}>Văn bản nội bộ</span>
        <h2>{TAB_LABELS[activeTab]}</h2>
      </div>

      <div className={styles.headerActions}>
        <div className={styles.searchBox}>
          <SearchIcon className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm tài liệu, mã số..."
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
          />
        </div>

        <button type="button" className={styles.btnTemplate} onClick={onOpenCreate} disabled={!canCreate}>
          <span>Template</span>
        </button>

        <button type="button" className={styles.btnCreate} onClick={onOpenCreate} disabled={!canCreate}>
          <span>+ Tạo yêu cầu</span>
        </button>
      </div>
    </header>
  );
}