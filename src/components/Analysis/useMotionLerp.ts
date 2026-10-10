import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react';

/**
 * Follows `target` with a short ease: the returned motion value holds the current numbers,
 * so consumers (a numeral, a ring, the radar path) update without re-rendering React.
 * Under reduced motion it jumps straight to the target.
 */
export function useMotionLerp(target: number[], seconds = 0.6): MotionValue<number[]> {
  const reduce = useReducedMotion();
  const key = target.join(',');
  const from = useRef(target);
  const to = useRef(target);
  const now = useRef(target);
  const t = useMotionValue(1);

  const out = useTransform(t, (p) => {
    const v = to.current.map((x, i) => (from.current[i] ?? x) + (x - (from.current[i] ?? x)) * p);
    now.current = v;
    return v;
  });

  useEffect(() => {
    const next = key === '' ? [] : key.split(',').map(Number);
    from.current = now.current;
    to.current = next;
    if (reduce) {
      t.set(0);
      t.set(1);
      return;
    }
    t.set(0);
    const controls = animate(t, 1, { duration: seconds, ease: [0.2, 0.8, 0.2, 1] });
    return () => controls.stop();
  }, [key, reduce, seconds, t]);

  return out;
}
