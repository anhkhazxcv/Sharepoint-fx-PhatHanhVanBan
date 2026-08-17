import * as React from 'react';
import styles from './PhvbMag.module.scss';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const loadingMagGifUrl: string = require('../assets/loadingMAG.gif');

interface IPhvbMagLoadingOverlayProps {
  isOpen: boolean;
  message: string;
  variant?: 'local' | 'global';
}

export function PhvbMagLoadingOverlay(props: IPhvbMagLoadingOverlayProps): React.ReactElement {
  const { isOpen, message, variant = 'local' } = props;

  if (!isOpen) {
    return <></>;
  }

  const className = variant === 'global'
    ? [styles.loadingOverlay, styles.loadingOverlayGlobal].join(' ')
    : styles.loadingOverlay;

  return (
    <div className={className} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.loadingPanel}>
        <img
          src={loadingMagGifUrl}
          className={styles.loadingSpinner}
          alt=""
          aria-hidden="true"
        />
        <p className={styles.loadingMessage}>{message}</p>
      </div>
    </div>
  );
}
