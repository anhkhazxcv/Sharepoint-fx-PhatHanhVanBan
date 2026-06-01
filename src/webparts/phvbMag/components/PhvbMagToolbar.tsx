import * as React from 'react';
import { useState } from 'react';
import { ALL_FILTER_VALUE, TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';
import { FilterIcon, SearchIcon } from './PhvbMagIcons';

interface IPhvbMagToolbarProps {
  activeTab: TabType;
  totalResults: number;
  searchQuery: string;
  filterType: string;
  filterDept: string;
  uniqueTypes: string[];
  uniqueDepts: string[];
  canCreate: boolean;
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  onFilterDeptChange: (value: string) => void;
  onOpenCreate: () => void;
}

export function PhvbMagToolbar(props: IPhvbMagToolbarProps): React.ReactElement {
  const {
    activeTab,
    totalResults,
    searchQuery,
    filterType,
    filterDept,
    uniqueTypes,
    uniqueDepts,
    canCreate,
    onSearchChange,
    onFilterTypeChange,
    onFilterDeptChange,
    onOpenCreate
  } = props;
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);

  return (
    <>
      <header className={styles.contentHeader}>
        <h2>Thư viện văn bản</h2>

        <div className={styles.headerActions}>
          <div className={styles.searchBox}>
            <SearchIcon className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Tìm văn bản, mã số..."
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
            />
          </div>

          <button type="button" className={styles.btnCreate} onClick={onOpenCreate} disabled={!canCreate}>
            <span>+ Tạo yêu cầu</span>
          </button>
        </div>
      </header>

      <div className={styles.subHeader}>
        <div className={styles.titleArea}>
          <h3>{TAB_LABELS[activeTab]}</h3>
          <span className={styles.resultsBadge}>{totalResults} văn bản</span>
        </div>

        <div className={styles.filterWrapper}>
          <button
            type="button"
            className={`${styles.btnFilter} ${filterType !== ALL_FILTER_VALUE || filterDept !== ALL_FILTER_VALUE ? styles.filterActive : ''}`}
            onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
          >
            <FilterIcon className={styles.btnIcon} />
            <span>Lọc</span>
          </button>

          {isFilterDropdownOpen && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterGroup}>
                <label>Loại văn bản:</label>
                <select value={filterType} onChange={event => onFilterTypeChange(event.target.value)}>
                  <option value={ALL_FILTER_VALUE}>Tất cả loại</option>
                  {uniqueTypes.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Phòng ban:</label>
                <select value={filterDept} onChange={event => onFilterDeptChange(event.target.value)}>
                  <option value={ALL_FILTER_VALUE}>Tất cả phòng ban</option>
                  {uniqueDepts.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterActions}>
                <button
                  type="button"
                  onClick={() => {
                    onFilterTypeChange(ALL_FILTER_VALUE);
                    onFilterDeptChange(ALL_FILTER_VALUE);
                  }}
                  className={styles.btnClearFilter}
                >
                  Xoá lọc
                </button>
                <button type="button" onClick={() => setIsFilterDropdownOpen(false)} className={styles.btnApplyFilter}>
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}