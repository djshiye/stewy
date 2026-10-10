import { VisuallyHidden } from './VisuallyHidden';

/** A polite live region; change `message` to announce it. */
export function LiveRegion({ message, className }: { message: string; className?: string }) {
  return (
    <VisuallyHidden as="div" aria-live="polite" aria-atomic="true" className={className}>
      {message}
    </VisuallyHidden>
  );
}
