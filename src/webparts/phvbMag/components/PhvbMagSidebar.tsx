import * as React from 'react';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { ITabCounts, TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';
import {
  SidebarAdminIcon,
  SidebarCollapseIcon,
  SidebarDraftIcon,
  SidebarExpandIcon,
  //SidebarLibraryIcon,
  SidebarMyRequestsIcon,
  SidebarNumberingIcon,
  //SidebarReleaseIcon,
  SidebarTasksIcon
} from './PhvbMagIcons';

interface IPhvbMagSidebarProps {
  activeTab: TabType;
  counts: ITabCounts;
  isCollapsed: boolean;
  onSelectTab: (tab: TabType) => void;
  onToggleCollapse: () => void;
  userDisplayName: string;
  userDepartment?: string;
}

interface INavItemProps {
  tab: TabType;
  label: string;
  icon: React.ReactNode;
  activeTab: TabType;
  isCollapsed: boolean;
  onSelectTab: (tab: TabType) => void;
  badgeCount?: number;
}

function NavItem(props: INavItemProps): React.ReactElement {
  const { tab, label, icon, activeTab, isCollapsed, onSelectTab, badgeCount } = props;
  const classNames = [styles.navItem, activeTab === tab ? styles.active : '', isCollapsed ? styles.navItemCollapsed : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classNames} onClick={() => onSelectTab(tab)} title={label}>
      <span className={styles.iconWrapper}>{icon}</span>
      {!isCollapsed && <span className={styles.navText}>{label}</span>}
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className={styles.countBadge}>{badgeCount}</span>
      )}
    </button>
  );
}

export function PhvbMagSidebar(props: IPhvbMagSidebarProps): React.ReactElement {
  const { activeTab, counts, isCollapsed, onSelectTab, onToggleCollapse, userDisplayName, userDepartment } = props;
  const initials = userDisplayName
    ? userDisplayName.split(' ').pop()?.substring(0, 2).toUpperCase()
    : 'MG';

  return (
    <aside className={[styles.sidebar, isCollapsed ? styles.sidebarCollapsed : ''].filter(Boolean).join(' ')}>
      <div className={styles.sidebarTop}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarBrand}>
            <div className={styles.logoBox}>
              <span className={styles.logoM}>M</span>
            </div>
            {!isCollapsed && (
              <div className={styles.headerTitle}>
                <h3>Văn bản nội bộ</h3>
                <p>Masterise Group</p>
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Mở rộng menu trái' : 'Thu gọn menu trái'}
            title={isCollapsed ? 'Mở rộng menu trái' : 'Thu gọn menu trái'}
          >
            {isCollapsed ? <SidebarExpandIcon /> : <SidebarCollapseIcon />}
          </button>
        </div>

        <nav className={styles.navMenu}>
          <NavItem
            tab="ViecCanLam"
            label={TAB_LABELS.ViecCanLam}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.viecCanLam}
            icon={<SidebarTasksIcon />}
          />

          {!isCollapsed && <div className={styles.navGroupLabel}>YÊU CẦU</div>}

          <NavItem
            tab="YeuCauCuaToi"
            label={TAB_LABELS.YeuCauCuaToi}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.yeuCauCuaToi}
            icon={<SidebarMyRequestsIcon />}
          />

          <NavItem
            tab="BanNhap"
            label={TAB_LABELS.BanNhap}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.banNhap}
            icon={<SidebarDraftIcon />}
          />

          {/* {!isCollapsed && <div className={styles.navGroupLabel}>THƯ VIỆN</div>}

          <NavItem
            tab="ThuVienTaiLieu"
            label={TAB_LABELS.ThuVienTaiLieu}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            icon={<SidebarLibraryIcon />}
          />

          <NavItem
            tab="MoiBanHanh"
            label={TAB_LABELS.MoiBanHanh}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.admin}
            icon={<SidebarReleaseIcon />}
          /> */}

          {!isCollapsed && <div className={styles.navGroupLabel}>QUẢN TRỊ HỆ THỐNG</div>}

          <NavItem
            tab="CapSo"
            label={TAB_LABELS.CapSo}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.capSo}
            icon={<SidebarNumberingIcon />}
          />

          <NavItem
            tab="QLVanBan"
            label={TAB_LABELS.QLVanBan}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.qlVanBan}
            icon={<SidebarAdminIcon />}
          />
        </nav>
      </div>

      <div className={styles.sidebarFooter} title={userDisplayName || 'Người dùng'}>
        <div className={styles.userAvatar}>
          <span>{initials || 'MG'}</span>
        </div>
        {!isCollapsed && (
          <div className={styles.userInfo}>
            <h4>{userDisplayName || 'Người dùng'}</h4>
            <p>{userDepartment || 'SharePoint user'}</p>
          </div>
        )}
      </div>
    </aside>
  );
}