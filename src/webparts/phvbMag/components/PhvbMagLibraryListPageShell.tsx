import * as React from 'react';
import { PhvbMagEmptyState } from './PhvbMagEmptyState';
import { PhvbMagLoadingOverlay } from './PhvbMagLoadingOverlay';
import { PhvbMagPageHeader } from './PhvbMagPageHeader';
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
      <PhvbMagPageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        count={count}
        headerActions={headerActions}
        className={styles.recentHeader}
      />

      <div className={styles.recentBody}>
        <PhvbMagLoadingOverlay isOpen={isLoading} message={loadingMessage} />

        {!isLoading && errorMessage ? (
          <PhvbMagEmptyState message={errorMessage} role="alert" />
        ) : null}

        {!isLoading && !errorMessage && isEmpty ? (
          <PhvbMagEmptyState message={emptyMessage} />
        ) : null}

        {!isLoading && !errorMessage && !isEmpty ? children : null}
      </div>
    </div>
  );
}
