import * as React from 'react';
import styles from './PhvbMag.module.scss';

interface IPhvbMagLoadingOverlayProps {
  isOpen: boolean;
  message: string;
}

export function PhvbMagLoadingOverlay(props: IPhvbMagLoadingOverlayProps): React.ReactElement {
  const { isOpen, message } = props;

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className={styles.loadingOverlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loadingPanel}>
        <div className={styles.loadingSpinner} aria-hidden="true" />
        <p className={styles.loadingMessage}>{message}</p>
      </div>
    </div>
  );
}
