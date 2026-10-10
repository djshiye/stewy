import type { ComponentPropsWithoutRef, ElementType } from 'react';

type Props<T extends ElementType> = { as?: T } & Omit<ComponentPropsWithoutRef<T>, 'as'>;

/** Text for assistive tech only. */
export function VisuallyHidden<T extends ElementType = 'span'>({ as, className, ...rest }: Props<T>) {
  const Tag: ElementType = as ?? 'span';
  return <Tag className={['ui-vh', className].filter(Boolean).join(' ')} {...rest} />;
}
