import type { MouseEvent, ReactNode } from 'react';
import './SkipLink.css';

/**
 * The first Tab stop: hidden until it has focus, then jumps past the top bar to the element with
 * `targetId` (which needs tabIndex -1). It moves focus itself rather than following the href, so
 * the address bar never gains a hash.
 */
export function SkipLink({ targetId, children }: { targetId: string; children: ReactNode }) {
  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(targetId)?.focus();
  };
  return (
    <a className="skip-link" href={`#${targetId}`} onClick={go}>
      {children}
    </a>
  );
}
