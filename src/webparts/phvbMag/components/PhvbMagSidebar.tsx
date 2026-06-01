import * as React from 'react';
import { TAB_LABELS } from '../PhvbMag.configuration';
import type { ITabCounts, TabType } from '../PhvbMag.models';
import styles from './PhvbMag.module.scss';
import {
  SidebarAdminIcon,
  SidebarCollapseIcon,
  SidebarExpandIcon,
  SidebarMyRequestsIcon,
  SidebarNumberingIcon,
  SidebarTasksIcon
} from './PhvbMagIcons';

interface IPhvbMagSidebarProps {
  activeTab: TabType;
  counts: ITabCounts;
  isCollapsed: boolean;
  onSelectTab: (tab: TabType) => void;
  onToggleCollapse: () => void;
  userDisplayName: string;
}

interface INavItemProps {
  tab: TabType;
  label: string;
  icon: React.ReactNode;
  activeTab: TabType;
  isCollapsed: boolean;
  onSelectTab: (tab: TabType) => void;
  badgeCount?: number;
  badgeClassName?: string;
}

function NavItem(props: INavItemProps): React.ReactElement {
  const { tab, label, icon, activeTab, isCollapsed, onSelectTab, badgeCount, badgeClassName } = props;
  const classNames = [styles.navItem, activeTab === tab ? styles.active : '', isCollapsed ? styles.navItemCollapsed : '']
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classNames} onClick={() => onSelectTab(tab)} title={label}>
      <span className={styles.iconWrapper}>{icon}</span>
      {!isCollapsed && <span className={styles.navText}>{label}</span>}
      {badgeCount && badgeCount > 0 && (
        <span className={[styles.countBadge, badgeClassName || ''].filter(Boolean).join(' ')}>{badgeCount}</span>
      )}
    </button>
  );
}

export function PhvbMagSidebar(props: IPhvbMagSidebarProps): React.ReactElement {
  const { activeTab, counts, isCollapsed, onSelectTab, onToggleCollapse, userDisplayName } = props;
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
            badgeClassName={styles.blueBadge}
            icon={<SidebarMyRequestsIcon />}
          />

          {!isCollapsed && <div className={styles.navGroupLabel}>QUẢN TRỊ</div>}

          <NavItem
            tab="Admin"
            label={TAB_LABELS.Admin}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.admin}
            icon={<SidebarAdminIcon />}
          />

          <NavItem
            tab="CapSo"
            label={TAB_LABELS.CapSo}
            activeTab={activeTab}
            isCollapsed={isCollapsed}
            onSelectTab={onSelectTab}
            badgeCount={counts.capSo}
            badgeClassName={styles.goldBadge}
            icon={<SidebarNumberingIcon />}
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
            <p>SharePoint user</p>
          </div>
        )}
      </div>
    </aside>
  );
}