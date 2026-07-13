import * as React from 'react';
import styles from './PhvbMag.module.scss';

interface IPhvbMagDetailRightPanelProps {
  children: React.ReactNode;
}

export function PhvbMagDetailRightPanel(props: IPhvbMagDetailRightPanelProps): React.ReactElement {
  const { children } = props;

  return (
    <div className={styles.detailRightColumn}>
      <div className={styles.detailActivitySlot}>
        {children}
      </div>
    </div>
  );
}
