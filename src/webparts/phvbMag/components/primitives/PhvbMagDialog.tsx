import * as React from 'react';
import styles from '../PhvbMag.module.scss';

export type PhvbMagDialogSize = 'sm' | 'md' | 'lg';

export interface IPhvbMagDialogProps {
  isOpen: boolean;
  title?: React.ReactNode;
  titleId?: string;
  size?: PhvbMagDialogSize;
  variant?: 'modal' | 'confirm';
  footer?: React.ReactNode;
  children: React.ReactNode;
  onDismiss?: () => void;
  contentClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

function resolveOverlayClassName(variant: 'modal' | 'confirm'): string {
  return variant === 'confirm' ? styles.confirmDialogOverlay : styles.modalOverlay;
}

function resolveContentClassName(
  variant: 'modal' | 'confirm',
  size: PhvbMagDialogSize,
  contentClassName?: string
): string {
  if (contentClassName) {
    return contentClassName;
  }

  if (variant === 'confirm') {
    return styles.confirmDialogContent;
  }

  if (size === 'lg') {
    return styles.modalContentLg;
  }

  return styles.modalContent;
}

export function PhvbMagDialog(props: IPhvbMagDialogProps): React.ReactElement {
  const {
    isOpen,
    title,
    titleId,
    size = 'md',
    variant = 'modal',
    footer,
    children,
    onDismiss,
    contentClassName,
    bodyClassName,
    footerClassName
  } = props;

  if (!isOpen) {
    return <></>;
  }

  const resolvedTitleId = titleId || 'phvb-dialog-title';
  const contentClass = resolveContentClassName(variant, size, contentClassName);

  return (
    <div
      className={resolveOverlayClassName(variant)}
      onClick={onDismiss ? () => onDismiss() : undefined}
      role="presentation"
    >
      <div
        className={contentClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? resolvedTitleId : undefined}
        onClick={event => event.stopPropagation()}
      >
        {title ? (
          variant === 'confirm' ? (
            <h4 id={resolvedTitleId}>{title}</h4>
          ) : (
            <div className={styles.modalHeader}>
              <h4 id={resolvedTitleId}>{title}</h4>
            </div>
          )
        ) : null}
        {variant === 'confirm' && !bodyClassName ? children : bodyClassName ? (
          <div className={bodyClassName}>
            {children}
          </div>
        ) : contentClassName ? (
          children
        ) : (
          <div className={styles.modalBody}>
            {children}
          </div>
        )}
        {footer ? (
          <div className={footerClassName || (variant === 'confirm' ? styles.confirmDialogActions : styles.modalFooter)}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
