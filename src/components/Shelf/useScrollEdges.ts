import { useEffect, useState, type RefObject } from 'react';

/** Tracks whether a horizontally scrolling element has more content on either side. */
export function useScrollEdges(ref: RefObject<HTMLElement | null>, key: string) {
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const start = el.scrollLeft > 2;
      const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((p) => (p.start === start && p.end === end ? p : { start, end }));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', queue, { passive: true });
    const ro = new ResizeObserver(queue);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    queue();
    return () => {
      el.removeEventListener('scroll', queue);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref, key]);

  return edges;
}

/** True when the user asked for less motion (JS scroll options ignore the CSS rule). */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
