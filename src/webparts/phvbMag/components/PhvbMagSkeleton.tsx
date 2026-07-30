import * as React from 'react';
import styles from './PhvbMag.module.scss';

export type PhvbMagSkeletonVariant = 'line' | 'card' | 'tile' | 'tableRow';

export interface IPhvbMagSkeletonProps {
  variant?: PhvbMagSkeletonVariant;
  count?: number;
  className?: string;
}

function SkeletonLine(): React.ReactElement {
  return <div className={styles.phvbSkeletonLine} />;
}

function SkeletonCard(): React.ReactElement {
  return (
    <div className={styles.phvbSkeletonCard}>
      <div className={[styles.phvbSkeletonLine, styles.phvbSkeletonLineShort].join(' ')} />
      <div className={styles.phvbSkeletonLine} />
      <div className={[styles.phvbSkeletonLine, styles.phvbSkeletonLineMedium].join(' ')} />
    </div>
  );
}

function SkeletonTile(): React.ReactElement {
  return <div className={styles.phvbSkeletonTile} />;
}

function SkeletonTableRow(): React.ReactElement {
  return (
    <div className={styles.phvbSkeletonTableRow}>
      <div className={[styles.phvbSkeletonLine, styles.phvbSkeletonLineShort].join(' ')} />
      <div className={styles.phvbSkeletonLine} />
    </div>
  );
}

export function PhvbMagSkeleton(props: IPhvbMagSkeletonProps): React.ReactElement {
  const { variant = 'line', count = 1, className } = props;
  const items: number[] = [];

  for (let index = 0; index < count; index += 1) {
    items.push(index);
  }

  const renderItem = (index: number): React.ReactElement => {
    switch (variant) {
      case 'card':
        return <SkeletonCard key={index} />;
      case 'tile':
        return <SkeletonTile key={index} />;
      case 'tableRow':
        return <SkeletonTableRow key={index} />;
      default:
        return <SkeletonLine key={index} />;
    }
  };

  const gridClass = variant === 'tile' ? styles.phvbSkeletonTileGrid : styles.phvbSkeletonStack;

  return (
    <div className={[gridClass, className].filter(Boolean).join(' ')} aria-hidden="true">
      {items.map(renderItem)}
    </div>
  );
}
