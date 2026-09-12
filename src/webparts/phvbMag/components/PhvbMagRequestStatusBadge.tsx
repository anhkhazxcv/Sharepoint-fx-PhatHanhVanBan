import * as React from 'react';
import { REQUEST_STATUS } from '../config/PhvbMag.configuration';
import type { IVanBanItem } from '../models/PhvbMag.models';
import { getRequestStatusDisplayForItem } from '../utils/PhvbMag.selectors';
import styles from './PhvbMag.module.scss';
import {
  StatusDraftIcon,
  StatusGopYIcon,
  StatusNumberedIcon,
  StatusPendingIcon,
  StatusPheDuyetIcon,
  StatusPublishedIcon,
  StatusRejectedIcon,
  StatusRevokedIcon,
  StatusThamDinhIcon
} from './PhvbMagIcons';

/**
 * Pill trạng thái yêu cầu. Tách khỏi PhvbMagTable để bảng desktop và card
 * mobile dùng CÙNG một bảng ánh xạ status → màu/icon — nếu nhân bản thì hai
 * bên sẽ lệch nhau ngay lần thêm status kế tiếp.
 */

export function resolveRequestStatusClassName(statusApproved?: string): string {
  switch (statusApproved) {
    case REQUEST_STATUS.BAN_NHAP:
      return styles.requestStatusBanNhap;
    case REQUEST_STATUS.DANG_GOP_Y:
      return styles.requestStatusDangGopY;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return styles.requestStatusDangThamDinh;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return styles.requestStatusDangPheDuyet;
    case REQUEST_STATUS.CHO_CAP_SO:
      return styles.requestStatusChoCapSo;
    case REQUEST_STATUS.DA_CAP_SO:
      return styles.requestStatusDaCapSo;
    case REQUEST_STATUS.CHO_BAN_HANH:
      return styles.requestStatusChoBanHanh;
    case REQUEST_STATUS.BAN_HANH:
      return styles.requestStatusBanHanh;
    case REQUEST_STATUS.TU_CHOI_THAM_DINH:
      return styles.requestStatusTuChoiThamDinh;
    case REQUEST_STATUS.TU_CHOI_PHE_DUYET:
      return styles.requestStatusTuChoiPheDuyet;
    case REQUEST_STATUS.THU_HOI:
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return styles.requestStatusThuHoi;
    default:
      return styles.requestStatusDefault;
  }
}

export function resolveRequestStatusIcon(
  statusApproved?: string
): React.ReactElement | undefined {
  switch (statusApproved) {
    case REQUEST_STATUS.BAN_NHAP:
      return <StatusDraftIcon />;
    case REQUEST_STATUS.DANG_GOP_Y:
      return <StatusGopYIcon />;
    case REQUEST_STATUS.DANG_THAM_DINH:
      return <StatusThamDinhIcon />;
    case REQUEST_STATUS.DANG_PHE_DUYET:
      return <StatusPheDuyetIcon />;
    case REQUEST_STATUS.CHO_CAP_SO:
    case REQUEST_STATUS.CHO_BAN_HANH:
      return <StatusPendingIcon />;
    case REQUEST_STATUS.DA_CAP_SO:
      return <StatusNumberedIcon />;
    case REQUEST_STATUS.BAN_HANH:
      return <StatusPublishedIcon />;
    case REQUEST_STATUS.TU_CHOI_THAM_DINH:
    case REQUEST_STATUS.TU_CHOI_PHE_DUYET:
      return <StatusRejectedIcon />;
    case REQUEST_STATUS.THU_HOI:
    case REQUEST_STATUS.CHO_ADMIN_THU_HOI:
    case REQUEST_STATUS.CHO_SUPER_ADMIN_THU_HOI:
      return <StatusRevokedIcon />;
    default:
      return undefined;
  }
}

export function getRequestStatusState(item: IVanBanItem): {
  label: string;
  className: string;
  icon: React.ReactElement | undefined;
} {
  return {
    label: getRequestStatusDisplayForItem(item).label,
    className: resolveRequestStatusClassName(item.StatusApproved),
    icon: resolveRequestStatusIcon(item.StatusApproved)
  };
}

interface IPhvbMagRequestStatusBadgeProps {
  item: IVanBanItem;
  className?: string;
}

export function PhvbMagRequestStatusBadge(
  props: IPhvbMagRequestStatusBadgeProps
): React.ReactElement {
  const { item, className } = props;
  const status = getRequestStatusState(item);

  return (
    <span
      className={[styles.requestStatusBadge, status.className, className]
        .filter(Boolean)
        .join(' ')}
    >
      {status.icon}
      {status.label}
    </span>
  );
}
