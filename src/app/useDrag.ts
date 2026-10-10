import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import type { Ingredient } from '../data/types';

const THRESHOLD = 6;

/**
 * Pointer drag for bottles (mouse and pen; touch taps open the dial instead).
 * `hitRef` is the drop target box. While a drag is in flight the body carries
 * `is-dragging`, which pauses the ambient loops.
 */
export function useDrag(hitRef: RefObject<HTMLElement | null>, onDrop: (ing: Ingredient) => void) {
  const [dragging, setDragging] = useState<Ingredient | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const ghostEl = useRef<HTMLDivElement | null>(null);
  const pos = useRef({ x: 0, y: 0 });
  const dropRef = useRef(onDrop);
  const teardown = useRef<(() => void) | null>(null);

  useEffect(() => {
    dropRef.current = onDrop;
  });

  // end any drag in flight if the host unmounts
  useEffect(() => () => teardown.current?.(), []);

  /** Ref callback for the ghost element: it is placed at the pointer on mount. */
  const ghostRef = useCallback((el: HTMLDivElement | null) => {
    ghostEl.current = el;
    if (el) el.style.transform = `translate(${pos.current.x}px, ${pos.current.y}px)`;
  }, []);

  const start = useCallback((ing: Ingredient, ev: ReactPointerEvent) => {
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    teardown.current?.();
    const sx = ev.clientX, sy = ev.clientY;
    // only the pointer that started the drag may move, drop or cancel it (a resting palm must not)
    const pid = ev.pointerId;
    let active = false;

    // capture guarantees pointerup/cancel delivery even if released off-window
    try {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    } catch { /* pointer already released: the drag still works, only capture is lost */ }

    const place = (x: number, y: number) => {
      pos.current = { x, y };
      if (ghostEl.current) ghostEl.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    const inPot = (e: PointerEvent) => {
      const box = hitRef.current?.getBoundingClientRect();
      return !!box && e.clientX >= box.left && e.clientX <= box.right
        && e.clientY >= box.top && e.clientY <= box.bottom;
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', onKey);
      try {
        if ((ev.target as Element).hasPointerCapture?.(pid)) (ev.target as Element).releasePointerCapture(pid);
      } catch { /* already released */ }
      document.body.classList.remove('is-dragging');
      teardown.current = null;
      setDragging(null);
      setDragOver(false);
    };
    const cancel = (e: PointerEvent) => {
      if (e.pointerId === pid) cleanup();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup();
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      if (!active && Math.hypot(e.clientX - sx, e.clientY - sy) > THRESHOLD) {
        active = true;
        document.body.classList.add('is-dragging');
        setDragging(ing);
      }
      if (active) {
        place(e.clientX, e.clientY);
        const over = inPot(e);
        setDragOver((prev) => (prev === over ? prev : over));
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      const dropped = active && inPot(e);
      if (active) {
        // swallow the click that follows a completed drag; self-disarm in case
        // the browser never dispatches one
        const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 150);
      }
      cleanup();
      if (dropped) dropRef.current(ing);
    };

    teardown.current = cleanup;
    place(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', onKey);
  }, [hitRef]);

  return { dragging, dragOver, start, ghostRef };
}
