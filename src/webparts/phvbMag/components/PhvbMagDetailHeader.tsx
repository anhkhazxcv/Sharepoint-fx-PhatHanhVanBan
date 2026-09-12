import * as React from 'react';
import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { TAB_LABELS } from '../config/PhvbMag.configuration';
import type { TabType } from '../models/PhvbMag.models';
import {
  PhvbMagDetailActionBar,
  type IPhvbMagDetailActionProps
} from './PhvbMagDetailActionBar';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailHeaderProps extends IPhvbMagDetailActionProps {
  tabName: TabType;
  title: string;
  className?: string;
  /**
   * Ẩn cụm nút trong header — mobile render PhvbMagDetailActionBar ở sticky
   * footer thay vì ở đây, nên header chỉ còn breadcrumb.
   */
  hideActions?: boolean;
}

export const PhvbMagDetailHeader = forwardRef<HTMLDivElement, IPhvbMagDetailHeaderProps>(
  function PhvbMagDetailHeader(props, ref): React.ReactElement {
    const { tabName, title, className, hideActions = false, ...actionProps } = props;
    const tabLabel = TAB_LABELS[tabName] || tabName;

    return (
      <div
        ref={ref}
        className={[styles.detailHeader, className || ''].filter(Boolean).join(' ')}
      >
        <div className={styles.detailHeaderMain}>
          <nav className={styles.detailBreadcrumb} aria-label="Breadcrumb">
            <Link to={`/tab/${tabName}`} className={styles.detailBreadcrumbLink}>
              {tabLabel}
            </Link>
            <span className={styles.detailBreadcrumbSep}>&gt;</span>
            <span className={styles.detailBreadcrumbCurrent}>{title}</span>
          </nav>
        </div>

        {!hideActions ? (
          <PhvbMagDetailActionBar variant="header" {...actionProps} />
        ) : null}
      </div>
    );
  }
);
