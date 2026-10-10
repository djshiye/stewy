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
    const watch = () => {
      ro?.disconnect();
      ro?.observe(el);
      Array.from(el.children).forEach((c) => ro?.observe(c));
      update();
    };
    watch();
    // Children come and go (the picks, the suggestion list); follow them without re-subscribing per render.
    const mo = typeof MutationObserver === 'function' ? new MutationObserver(watch) : null;
    mo?.observe(el, { childList: true });
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, []);

  return ref;
}
