import type { ComponentPropsWithRef, ReactNode } from 'react';
import './ui.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon (18 px Phosphor icon in chrome, 20 px in the dock). */
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  fullWidth,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const cls = [
    'ui-btn',
    `ui-btn--${variant}`,
    `ui-btn--${size}`,
    fullWidth && 'ui-btn--full',
    className,
  ].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      {icon && <span className="ui-btn__icon" aria-hidden="true">{icon}</span>}
      {children != null && <span className="ui-btn__label">{children}</span>}
    </button>
  );
}
