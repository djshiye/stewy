import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export type RowDensity = 'comfy' | 'snug' | 'tight';

/** Rendered height of one row per density, border included. Keep in step with RecipeCard.css. */
const ROW_HEIGHT: Record<RowDensity, number> = { comfy: 65, snug: 51, tight: 43 };
/** The "more" strip under the rows: its 28px height plus the 2px above it (`.rc__more`). */
const MORE_STRIP = 30;
const ORDER: RowDensity[] = ['comfy', 'snug', 'tight'];

/**
 * Fits the ingredient rows into the area the card gives them (`wrapRef`). Rows step down in
 * size until all of them fit; when even the tightest does not, `overflow` reserves a strip for
 * a "more" cue and `hidden` counts the rows still past the bottom edge of the scroller
 * (`rowsRef`). The scroller is then cut to a whole number of rows, so a row is never shown
 * half-way down the card (it also snaps to rows, see RecipeCard.css). Switched off (comfortable
 * rows, nothing hidden) when the card is in page flow.
 */
export function useRowFit(
  wrapRef: RefObject<HTMLElement | null>,
  rowsRef: RefObject<HTMLElement | null>,
  count: number,
  enabled: boolean,
) {
  const [density, setDensity] = useState<RowDensity>('comfy');
  const [overflow, setOverflow] = useState(false);
  const [hidden, setHidden] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = rowsRef.current;
    if (!wrap || !el) return;
    const update = () => {
      const avail = wrap.clientHeight;
      if (!enabled || avail === 0) {
        el.style.maxHeight = '';
        setDensity('comfy');
        setOverflow(false);
        setHidden(0);
        return;
      }
      setDensity(ORDER.find((d) => count * ROW_HEIGHT[d] <= avail + 1) ?? 'tight');
      const over = count * ROW_HEIGHT.tight > avail + 1;
      setOverflow(over);
      // measured from the wrapper, not the scroller, so resizing the scroller cannot feed back
      const whole = Math.max(1, Math.floor((avail - MORE_STRIP) / ROW_HEIGHT.tight));
      el.style.maxHeight = over ? `${whole * ROW_HEIGHT.tight}px` : '';
      const bottom = el.getBoundingClientRect().bottom + 2;
      const rows = el.querySelectorAll<HTMLElement>('[data-row]');
      setHidden(Array.from(rows).filter((r) => r.getBoundingClientRect().bottom > bottom).length);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
    ro?.observe(wrap);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [wrapRef, rowsRef, count, enabled]);

  const showMore = useCallback(() => {
    const el = rowsRef.current;
    if (!el) return;
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: calm ? 'auto' : 'smooth' });
  }, [rowsRef]);

  return { density, overflow, hidden, showMore };
}
