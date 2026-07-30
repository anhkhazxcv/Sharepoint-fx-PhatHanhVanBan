import * as React from 'react';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagPageHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  count?: number;
  headerActions?: React.ReactNode;
  className?: string;
}

export function PhvbMagPageHeader(props: IPhvbMagPageHeaderProps): React.ReactElement {
  const { eyebrow, title, subtitle, count, headerActions, className } = props;

  return (
    <header className={[styles.phvbPageHeader, className].filter(Boolean).join(' ')}>
      <div className={styles.pageHeading}>
        {eyebrow ? <span className={styles.pageEyebrow}>{eyebrow}</span> : null}
        <h2>{title}</h2>
        {subtitle ? <p className={styles.recentSubtitle}>{subtitle}</p> : null}
      </div>

      {headerActions ? (
        headerActions
      ) : count !== undefined && count > 0 ? (
        <span className={styles.recentSectionCount}>{count}</span>
      ) : null}
    </header>
  );
}
