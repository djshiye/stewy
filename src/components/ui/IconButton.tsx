import type { ComponentPropsWithRef, ReactNode } from 'react';
import './ui.css';

export interface IconButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Accessible name (required). */
  label: string;
  /** Short hover and focus tooltip; shown on fine pointers only. */
  tooltip?: string;
  icon: ReactNode;
  variant?: 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  /** Marks a toggle button. */
  pressed?: boolean;
}

export function IconButton({
  label,
  tooltip,
  icon,
  variant = 'ghost',
  size = 'md',
  pressed,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  const cls = ['ui-ibtn', `ui-ibtn--${variant}`, `ui-ibtn--${size}`, className].filter(Boolean).join(' ');
  return (
    <button
      type={type}
      className={cls}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={tooltip}
      {...rest}
    >
      <span aria-hidden="true" className="ui-ibtn__icon">{icon}</span>
    </button>
  );
}
