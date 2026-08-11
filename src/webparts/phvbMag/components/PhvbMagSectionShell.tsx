import * as React from 'react';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagSectionShellProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  withDocumentSpine?: boolean;
}

export function PhvbMagSectionShell(props: IPhvbMagSectionShellProps): React.ReactElement {
  const { title, icon, action, children, className, withDocumentSpine = false } = props;

  return (
    <section
      className={[
        styles.phvbSectionCard,
        withDocumentSpine ? styles.phvbSurfaceSpine : '',
        className
      ].filter(Boolean).join(' ')}
    >
      <header className={styles.phvbSectionCardHeader}>
        <div className={styles.homeSectionTitleWrap}>
          {icon}
          <h2 className={styles.homeSectionTitle}>{title}</h2>
        </div>
        {action}
      </header>
      <div className={styles.phvbSectionCardBody}>
        {children}
      </div>
    </section>
  );
}
