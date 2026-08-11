import * as React from 'react';
import styles from '../PhvbMag.module.scss';

export type PhvbMagButtonVariant = 'secondary' | 'submit' | 'ghost';

export interface IPhvbMagButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PhvbMagButtonVariant;
  children: React.ReactNode;
}

function resolveButtonClassName(variant: PhvbMagButtonVariant, className?: string): string {
  const baseClass = variant === 'submit'
    ? styles.btnSubmit
    : variant === 'ghost'
      ? styles.btnIcon
      : styles.btnSecondary;

  return [baseClass, className].filter(Boolean).join(' ');
}

export function PhvbMagButton(props: IPhvbMagButtonProps): React.ReactElement {
  const { variant = 'secondary', className, children, type = 'button', ...rest } = props;

  return (
    <button
      type={type}
      className={resolveButtonClassName(variant, className)}
      {...rest}
    >
      {children}
    </button>
  );
}
