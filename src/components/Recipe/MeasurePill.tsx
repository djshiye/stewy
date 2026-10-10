import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Ingredient } from '../../data/types';
import { amountInfo, amountLabel, type UnitKey } from '../../lib/units';

/** Pointer travel before a press becomes a scrub, and px per unit step afterwards. */
const THRESHOLD = 6;
const STEP_PX = 14;
const TICKS = 12;
/** What the tick bar reads as full: 3 oz of liquid, or 6 pieces. */
const FULL_ML = 90;
const FULL_PIECES = 6;
const MAX_ML = 750;

interface MeasurePillProps {
  ing: Ingredient;
  ml: number;
  unit: UnitKey;
  /** Called with each new amount while scrubbing or stepping. */
  onSet(ml: number): void;
  /** Click or Enter: open the dial. Gets the pill so the card can anchor to the row. */
  onOpen(el: HTMLElement): void;
}

interface Press {
  x: number;
  ml: number;
  steps: number;
  active: boolean;
  pointerId: number;
}

/** A tactile measure: the amount above a mini LED scale. Drag sideways or use the arrow keys. */
export function MeasurePill({ ing, ml, unit, onSet, onOpen }: MeasurePillProps) {
  const info = amountInfo(ing, unit);
  const label = amountLabel({ id: ing.id, ml }, ing, unit);
  const press = useRef<Press | null>(null);
  const swallow = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const hintId = useId();

  /** The amount `k` unit steps away from `from`, never below one step. */
  const shifted = (from: number, k: number) => {
    const step = info.per * info.step;
    const base = info.counted ? Math.round(from / info.per) * info.per : from;
    const next = base + k * step;
    return Math.round(Math.min(MAX_ML, Math.max(step, next)) * 100) / 100;
  };

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    press.current = { x: e.clientX, ml, steps: 0, active: false, pointerId: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const p = press.current;
    if (!p) return;
    const dx = e.clientX - p.x;
    if (!p.active) {
      if (Math.abs(dx) < THRESHOLD) return;
      p.active = true;
      swallow.current = true;
      setScrubbing(true);
      e.currentTarget.setPointerCapture(p.pointerId);
    }
    const steps = Math.sign(dx) * (1 + Math.floor((Math.abs(dx) - THRESHOLD) / STEP_PX));
    if (steps !== p.steps) {
      p.steps = steps;
      onSet(shifted(p.ml, steps));
    }
  };

  const endPress = () => {
    if (press.current?.active) {
      // the click that follows the pointer-up must not open the dial
      window.setTimeout(() => { swallow.current = false; }, 60);
    }
    press.current = null;
    setScrubbing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    onSet(shifted(ml, e.key === 'ArrowRight' ? 1 : -1));
  };

  const frac = info.counted ? ml / (info.per * FULL_PIECES) : ml / FULL_ML;
  const lit = Math.min(TICKS, Math.max(1, Math.ceil(frac * TICKS - 1e-6)));

  return (
    <>
      <button
        type="button"
        className="pill"
        data-scrubbing={scrubbing ? '' : undefined}
        aria-label={`${ing.name}, ${label}`}
        aria-describedby={hintId}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onLostPointerCapture={endPress}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (swallow.current) {
            e.preventDefault();
            return;
          }
          onOpen(e.currentTarget);
        }}
      >
        <span className="pill__amt">{label}</span>
        <span className="pill__ticks" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => (
            <i key={i} data-on={i < lit ? '' : undefined} />
          ))}
        </span>
      </button>
      <span id={hintId} className="ui-vh">
        Press Enter to set the amount precisely. Left and right arrow keys change it, or drag sideways.
      </span>
    </>
  );
}
