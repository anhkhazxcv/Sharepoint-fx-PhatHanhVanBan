import * as React from 'react';
import styles from './PhvbMag.module.scss';

export interface IPhvbMagEmptyStateProps {
  message: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  role?: 'status' | 'alert';
  className?: string;
}

export function PhvbMagEmptyState(props: IPhvbMagEmptyStateProps): React.ReactElement {
  const {
    message,
    hint,
    actionLabel,
    onAction,
    role = 'status',
    className
  } = props;

  return (
    <div
      className={[styles.phvbEmptyState, className].filter(Boolean).join(' ')}
      role={role}
    >
      <p className={styles.phvbEmptyStateMessage}>{message}</p>
      {hint ? <p className={styles.phvbEmptyStateHint}>{hint}</p> : null}
      {actionLabel && onAction ? (
        <button type="button" className={styles.phvbEmptyStateAction} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
