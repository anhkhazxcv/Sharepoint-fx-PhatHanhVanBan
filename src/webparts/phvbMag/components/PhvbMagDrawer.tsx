import * as React from 'react';
import type { IVanBanItem } from '../models/PhvbMag.models';
import { getBadgeVariant, getRequestStatusDisplayForItem } from '../utils/PhvbMag.selectors';
import styles from './PhvbMag.module.scss';
import { CloseIcon } from './PhvbMagIcons';

interface IPhvbMagDrawerProps {
  item?: IVanBanItem;
  onClose: () => void;
}

export function PhvbMagDrawer(props: IPhvbMagDrawerProps): React.ReactElement {
  const { item, onClose } = props;

  if (!item) {
    return <></>;
  }

  const statusDisplay = getRequestStatusDisplayForItem(item);
  const statusClassName =
    statusDisplay.filterKey === 'approved'
      ? styles.statusApproved
      : statusDisplay.filterKey === 'rejected'
        ? styles.statusPending
        : styles.statusPending;

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div className={styles.drawerContent} onClick={event => event.stopPropagation()}>
        <div className={styles.drawerHeader}>
          <h3>Chi tiết văn bản</h3>
          <button type="button" className={styles.btnClose} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className={styles.drawerBody}>
          <div className={styles.drawerMainTitle}>
            <h4>{item.Tenvanban}</h4>
            {item.TenVanBan_ENG && <p className={styles.engTitle}>{item.TenVanBan_ENG}</p>}
          </div>

          <div className={styles.statusBanner}>
            <span className={styles.label}>Trạng thái hệ thống:</span>
            <span className={`${styles.statusPill} ${statusClassName}`}>
              {statusDisplay.label}
            </span>
          </div>

          <div className={styles.metaSection}>
            <h5>Thông tin chung</h5>
            <table className={styles.metaTable}>
              <tbody>
                <tr>
                  <td className={styles.metaLabel}>Số / Mã văn bản:</td>
                  <td className={styles.metaValue}>{item.SoVanBan ? <strong>{item.SoVanBan}</strong> : <span className={styles.textWarning}>Chưa cấp số</span>}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Loại văn bản:</td>
                  <td className={styles.metaValue}>
                    <span className={`${styles.badge} ${styles[getBadgeVariant(item.LoaiYeuCau)]}`}>{item.LoaiYeuCau || 'Chưa phân loại'}</span>
                  </td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Khoa phòng / Phòng ban:</td>
                  <td className={styles.metaValue}>{item.KhoaPhongNguoiTao || '---'}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Ngày ban hành:</td>
                  <td className={styles.metaValue}>{item.NgayPhatHanh || '---'}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Hiệu lực áp dụng:</td>
                  <td className={styles.metaValue}>Từ {item.HieuLucTu || '---'} đến {item.HieuLucDen || '---'}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Thư mục ban hành:</td>
                  <td className={styles.metaValue}>{item.ThuMucBanHanh || 'Chưa lưu thư mục'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.metaSection}>
            <h5>Tóm tắt nội dung</h5>
            <div className={styles.summaryText}>{item.TomTatNoiDung || 'Không có tóm tắt chi tiết cho tài liệu này.'}</div>
          </div>

          <div className={styles.metaSection}>
            <h5>Kiểm soát & Lưu trữ cứng</h5>
            <table className={styles.metaTable}>
              <tbody>
                <tr>
                  <td className={styles.metaLabel}>Nơi lưu bản cứng:</td>
                  <td className={styles.metaValue}>{item.NoiLuuBanCung || 'Chỉ lưu trữ bản số hóa'}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Liên hệ hỗ trợ:</td>
                  <td className={styles.metaValue}>{item.LienHe || 'Không có'}</td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Người tạo yêu cầu:</td>
                  <td className={styles.metaValue}>
                    <strong>{item.NguoiTao || '---'}</strong>
                    {item.EmailNguoiTao ? ` (${item.EmailNguoiTao})` : ''}
                  </td>
                </tr>
                <tr>
                  <td className={styles.metaLabel}>Ngày nộp yêu cầu:</td>
                  <td className={styles.metaValue}>{item.NgayTaoYeuCau || '---'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {item.PheDuyet && (
            <div className={styles.metaSection}>
              <h5>Quy trình Phê duyệt</h5>
              <div className={styles.approvalWorkflow}>
                <div className={styles.workflowStep}>
                  <span className={styles.stepDot} />
                  <div className={styles.stepInfo}>
                    <h6>Danh sách người phê duyệt:</h6>
                    <p>{item.PheDuyet}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.drawerFooter}>
          <button type="button" className={styles.btnSecondary} onClick={onClose}>
            Đóng chi tiết
          </button>
        </div>
      </div>
    </div>
  );
}