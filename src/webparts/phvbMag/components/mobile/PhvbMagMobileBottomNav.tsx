import * as React from 'react';
import { TAB_LABELS } from '../../config/PhvbMag.configuration';
import type { ITabCounts, TabType } from '../../models/PhvbMag.models';
import styles from '../PhvbMag.module.scss';
import {
  SidebarAdminIcon,
  SidebarHomeIcon,
  SidebarLibraryIcon,
  SidebarMyRequestsIcon,
  SidebarNumberingIcon,
  SidebarTasksIcon
} from '../PhvbMagIcons';

type TabCountKey = keyof ITabCounts;

interface IMobileNavEntry {
  tab: TabType;
  /** Nhãn ngắn cho bottom bar — nhãn desktop trong TAB_LABELS quá dài. */
  label: string;
  icon: React.ReactNode;
  countKey?: TabCountKey;
}

/**
 * Bottom nav là cách trình bày khác của cùng state `activeTab` mà sidebar
 * desktop đang dùng — không có state riêng, nên hai bên không thể lệch nhau.
 *
 * Ba entry dưới đây ai cũng thấy; tab thư viện / quản trị là opt-in qua prop,
 * thêm bằng cách bổ sung entry chứ không phải sửa shell.
 */
const MOBILE_NAV_ENTRIES: ReadonlyArray<IMobileNavEntry> = [
  {
    tab: 'TrangChu',
    label: 'Trang chủ',
    icon: <SidebarHomeIcon />
  },
  {
    tab: 'ViecCanLam',
    label: 'Chờ xử lý',
    icon: <SidebarTasksIcon />,
    countKey: 'viecCanLam'
  },
  {
    tab: 'YeuCauCuaToi',
    label: 'Của tôi',
    icon: <SidebarMyRequestsIcon />,
    countKey: 'yeuCauCuaToi'
  }
];

/** Tab đọc-thêm, bật khi mở rộng scope sang tra cứu thư viện. */
export const MOBILE_LIBRARY_NAV_ENTRY: IMobileNavEntry = {
  tab: 'ThuVienTaiLieu',
  label: TAB_LABELS.ThuVienTaiLieu,
  icon: <SidebarLibraryIcon />
};

/** Tab quản trị — chỉ bật khi user đủ quyền (canAccessCapSoTab). */
const MOBILE_CAP_SO_NAV_ENTRY: IMobileNavEntry = {
  tab: 'CapSo',
  label: 'Cấp số',
  icon: <SidebarNumberingIcon />,
  countKey: 'capSo'
};

/**
 * Tab quản trị — chỉ bật khi user đủ quyền (canAccessQLVanBanTab).
 * Không gắn countKey: counts.qlVanBan là TỔNG số văn bản chứ không phải số
 * việc tồn, badge sẽ luôn là 99+ nên vô nghĩa ở kích thước mobile.
 */
const MOBILE_QL_VAN_BAN_NAV_ENTRY: IMobileNavEntry = {
  tab: 'QLVanBan',
  label: 'Quản trị',
  icon: <SidebarAdminIcon />
};

interface IPhvbMagMobileBottomNavProps {
  activeTab: TabType;
  counts: ITabCounts;
  onSelectTab: (tab: TabType) => void;
  /** Bật tab Thư viện (ngoài scope phase 1, mặc định tắt). */
  showLibraryTab?: boolean;
  /** Tab quản trị — mặc định tắt, chỉ bật khi shell xác nhận đủ quyền. */
  showCapSoTab?: boolean;
  showQLVanBanTab?: boolean;
}

export function PhvbMagMobileBottomNav(
  props: IPhvbMagMobileBottomNavProps
): React.ReactElement {
  const {
    activeTab,
    counts,
    onSelectTab,
    showLibraryTab = false,
    showCapSoTab = false,
    showQLVanBanTab = false
  } = props;

  // Nhóm quản trị nằm cuối, khớp thứ tự nhóm "QUẢN TRỊ HỆ THỐNG" của sidebar.
  const entries: IMobileNavEntry[] = [...MOBILE_NAV_ENTRIES];

  if (showLibraryTab) {
    entries.push(MOBILE_LIBRARY_NAV_ENTRY);
  }

  if (showCapSoTab) {
    entries.push(MOBILE_CAP_SO_NAV_ENTRY);
  }

  if (showQLVanBanTab) {
    entries.push(MOBILE_QL_VAN_BAN_NAV_ENTRY);
  }

  return (
    <nav className={styles.mobileBottomNav} aria-label="Điều hướng chính">
      {entries.map(entry => {
        const isActive = activeTab === entry.tab;
        const badgeCount = entry.countKey ? counts[entry.countKey] : 0;

        return (
          <button
            key={entry.tab}
            type="button"
            className={[
              styles.mobileBottomNavItem,
              isActive ? styles.mobileBottomNavItemActive : ''
            ]
              .filter(Boolean)
              .join(' ')}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectTab(entry.tab)}
          >
            {entry.icon}
            <span>{entry.label}</span>
            {badgeCount > 0 ? (
              <span className={styles.mobileBottomNavBadge}>
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
