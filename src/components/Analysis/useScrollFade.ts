import { useEffect, useRef } from 'react';
import './scrollFade.css';

/**
 * Marks a scroll area with `data-more-above` / `data-more-below` while content is hidden
 * past either edge, so CSS can fade that edge. No React state: the attributes are set directly.
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      el.toggleAttribute('data-more-above', el.scrollTop > 2);
      el.toggleAttribute('data-more-below', el.scrollHeight - el.scrollTop - el.clientHeight > 2);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (ro) Array.from(el.children).forEach((c) => ro.observe(c));
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  });

  return ref;
}
