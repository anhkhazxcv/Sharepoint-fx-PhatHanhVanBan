import * as React from 'react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailHeaderProps {
  tabName: TabType;
  title: string;
  className?: string;
}

export const PhvbMagDetailHeader = forwardRef<HTMLDivElement, IPhvbMagDetailHeaderProps>(
  function PhvbMagDetailHeader(props, ref): React.ReactElement {
    const { tabName, title, className } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;

    return (
      <div
        ref={ref}
        className={[styles.detailHeader, className || ''].filter(Boolean).join(' ')}
      >
        <div className={styles.detailHeaderMain}>
          <nav className={styles.detailBreadcrumb} aria-label="Breadcrumb">
            <Link to={`/tab/${tabName}`} className={styles.detailBreadcrumbLink}>
              Trang chủ
            </Link>
            <span className={styles.detailBreadcrumbSep}>&gt;</span>
            <Link to={`/tab/${tabName}`} className={styles.detailBreadcrumbLink}>
              {tabLabel}
            </Link>
            <span className={styles.detailBreadcrumbSep}>&gt;</span>
            <span className={styles.detailBreadcrumbCurrent}>{title}</span>
          </nav>
          <h1 className={styles.detailTitle}>{title}</h1>
        </div>

        <div className={styles.detailActions}>
          <button type="button" className={styles.detailActionApprove} disabled title="Sắp có">
            Phê duyệt
          </button>
          <button type="button" className={styles.detailActionEdit} disabled title="Sắp có">
            Yêu cầu chỉnh sửa
          </button>
          <button type="button" className={styles.detailActionReject} disabled title="Sắp có">
            Từ chối
          </button>
        </div>
      </div>
    );
  }
);
