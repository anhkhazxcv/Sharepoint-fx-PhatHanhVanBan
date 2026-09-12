import * as React from 'react';
import type { IVanBanItem } from '../../models/PhvbMag.models';
import { getBadgeVariant } from '../../utils/PhvbMag.selectors';
import { formatExecutionDate } from '../../utils/PhvbMagDateTime.utils';
import styles from '../PhvbMag.module.scss';
import { FolderTreeChevronRightIcon } from '../PhvbMagIcons';
import { PhvbMagRequestStatusBadge } from '../PhvbMagRequestStatusBadge';

interface IPhvbMagMobileRequestCardProps {
  item: IVanBanItem;
  onSelect: (item: IVanBanItem) => void;
}

/**
 * Một dòng của bảng desktop, xếp lại thành card cho khổ điện thoại. Chỉ giữ
 * các cột đọc được trên màn hẹp (tên · loại tác vụ · phòng ban · ngày tạo ·
 * trạng thái); mã hiệu chỉ hiện khi đã cấp số.
 */
export function PhvbMagMobileRequestCard(
  props: IPhvbMagMobileRequestCardProps
): React.ReactElement {
  const { item, onSelect } = props;
  const createdLabel = formatExecutionDate(item.Created);

  return (
    <button
      type="button"
      className={styles.mobileRequestCard}
      onClick={() => onSelect(item)}
    >
      <span className={styles.mobileRequestCardMain}>
        <span className={styles.mobileRequestCardTitle}>
          {item.Tenvanban || 'Chưa có tên văn bản'}
        </span>

        <span className={styles.mobileRequestCardMeta}>
          {item.LoaiYeuCau ? (
            <span
              className={`${styles.badge} ${styles[getBadgeVariant(item.LoaiYeuCau)]}`}
            >
              {item.LoaiYeuCau}
            </span>
          ) : null}
          <span className={styles.mobileRequestCardDept}>
            {item.KhoaPhongNguoiTao || '---'}
          </span>
          {createdLabel ? <span>{createdLabel}</span> : null}
        </span>

        {item.SoVanBan ? (
          <span className={styles.mobileRequestCardMeta}>
            <span>Số VB: {item.SoVanBan}</span>
          </span>
        ) : null}
      </span>

      <span className={styles.mobileRequestCardFooter}>
        <PhvbMagRequestStatusBadge item={item} />
        <span className={styles.mobileRequestCardChevron}>
          <FolderTreeChevronRightIcon />
        </span>
      </span>
    </button>
  );
}
