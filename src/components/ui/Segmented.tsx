import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import './ui.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when `label` is not text. */
  ariaLabel?: string;
}

export interface SegmentedProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(value: T): void;
  size?: 'sm' | 'md';
  'aria-label': string;
  className?: string;
}

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

/**
 * A radio group drawn as a pill with a sliding thumb. Arrow keys move and select.
 * The thumb is a plain element parked on the first grid cell and slid by whole cells (the columns
 * are equal), not a shared-layout (layoutId) element: Motion keeps those in a global registry
 * that never lets go of a control which mounts and unmounts, like the one inside the pour dial.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...aria
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  const onKey = (e: KeyboardEvent) => {
    const n = options.length;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={aria['aria-label']}
      className={['ui-seg', `ui-seg--${size}`, className].filter(Boolean).join(' ')}
      onKeyDown={onKey}
    >
      <motion.span
        aria-hidden="true"
        className="ui-seg__thumb"
        // an absolutely placed grid child sizes to the cell it is assigned to
        style={{ gridColumn: 1, gridRow: 1 }}
        initial={false}
        animate={{ x: `${idx * 100}%` }}
        transition={SPRING}
      />
      {options.map((o, i) => {
        const on = i === idx;
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.ariaLabel}
            tabIndex={on ? 0 : -1}
            className="ui-seg__opt"
            onClick={() => onChange(o.value)}
          >
            <span className="ui-seg__label">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
