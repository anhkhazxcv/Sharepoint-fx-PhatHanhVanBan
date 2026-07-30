import * as React from 'react';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagLibraryListPageShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  count?: number;
  headerActions?: React.ReactNode;
  isLoading: boolean;
  loadingMessage: string;
  errorMessage?: string;
  isEmpty: boolean;
  emptyMessage: string;
  children?: React.ReactNode;
}

export function PhvbMagLibraryListPageShell(props: IPhvbMagLibraryListPageShellProps): React.ReactElement {
  const {
    eyebrow,
    title,
    subtitle,
    count,
    headerActions,
    isLoading,
    loadingMessage,
    errorMessage,
    isEmpty,
    emptyMessage,
    children
  } = props;

  return (
    <div className={styles.recentView}>
      <header className={styles.recentHeader}>
        <div className={styles.pageHeading}>
          <span className={styles.pageEyebrow}>{eyebrow}</span>
          <h2>{title}</h2>
          <p className={styles.recentSubtitle}>{subtitle}</p>
        </div>

        {headerActions ? (
          headerActions
        ) : count !== undefined && count > 0 ? (
          <span className={styles.recentSectionCount}>{count}</span>
        ) : null}
      </header>

      <div className={styles.recentBody}>
        <PhvbMagLoadingOverlay isOpen={isLoading} message={loadingMessage} />

        {!isLoading && errorMessage ? (
          <div className={styles.recentEmptyState} role="alert">
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && isEmpty ? (
          <div className={styles.recentEmptyState}>
            <p>{emptyMessage}</p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && !isEmpty ? children : null}
      </div>
    </div>
  );
}
