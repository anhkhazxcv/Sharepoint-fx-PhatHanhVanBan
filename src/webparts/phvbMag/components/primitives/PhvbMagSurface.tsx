import * as React from 'react';
import styles from '../PhvbMag.module.scss';

export interface IPhvbMagSurfaceProps {
  children: React.ReactNode;
  className?: string;
  withDocumentSpine?: boolean;
  as?: 'section' | 'article' | 'div';
}

export function PhvbMagSurface(props: IPhvbMagSurfaceProps): React.ReactElement {
  const { children, className, withDocumentSpine = false, as = 'section' } = props;
  const Tag = as;
  const classNames = [
    styles.phvbSurface,
    withDocumentSpine ? styles.phvbSurfaceSpine : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Tag className={classNames}>
      {children}
    </Tag>
  );
}
