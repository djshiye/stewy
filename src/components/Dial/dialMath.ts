/* Pure geometry and value maths for the pour dial. No React, no DOM. */
import type { Ingredient } from '../../data/types';
import { amountInfo, nounOf, trim, type UnitKey } from '../../lib/units';

/** The scale starts at the bottom left (135 degrees, clockwise from +x) and sweeps 270 degrees. */
export const DIAL_START = 135;
export const DIAL_SPAN = 270;
export const LED_COUNT = 64;

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** position along the scale, 0..1 (segment centre) */
  t: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Point at `deg` degrees (clockwise from +x, SVG space) and radius `r` around the centre. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

export interface LedRingOptions {
  cx: number;
  cy: number;
  /** inner and outer radius of every segment */
  r1: number;
  r2: number;
  n?: number;
  start?: number;
  span?: number;
}

/** The ring of LED segments as plain line coordinates, in scale order. */
export function ledRing({ cx, cy, r1, r2, n = LED_COUNT, start = DIAL_START, span = DIAL_SPAN }: LedRingOptions): Segment[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const a = start + t * span;
    const [x1, y1] = polar(cx, cy, r1, a);
    const [x2, y2] = polar(cx, cy, r2, a);
    return { x1: round2(x1), y1: round2(y1), x2: round2(x2), y2: round2(y2), t };
  });
}

/** How many LED segments are lit at a scale position (a segment lights once its centre is reached). */
export function litCount(frac: number, n = LED_COUNT): number {
  const f = Math.min(1, Math.max(0, frac));
  return Math.min(n, Math.floor(f * n + 0.5));
}

/** SVG arc path along a circle between two angles (clockwise). */
export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${round2(x0)} ${round2(y0)}A${r} ${r} 0 ${large} 1 ${round2(x1)} ${round2(y1)}`;
}

/** Angle on the scale (degrees, SVG space) for a position 0..1. */
export const fracToAngle = (frac: number) => DIAL_START + frac * DIAL_SPAN;

/**
 * Scale position 0..1 for a pointer offset from the dial centre. The unused bottom gap
 * snaps to the nearer end, and when `prev` is given a jump across the gap is refused, so
 * dragging past either end pins the knob there instead of wrapping around.
 */
export function angleToFrac(dx: number, dy: number, prev?: number): number {
  const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const t = (((deg - DIAL_START) % 360) + 360) % 360; // 0..360 from the scale start
  let frac: number;
  if (t <= DIAL_SPAN) frac = t / DIAL_SPAN;
  else frac = t - DIAL_SPAN < (360 - DIAL_SPAN) / 2 ? 1 : 0;
  if (prev !== undefined && Math.abs(frac - prev) > 0.5) frac = prev > 0.5 ? 1 : 0;
  return frac;
}

export interface DialRange {
  /** top of the scale, in display units */
  max: number;
  /** numeral every this many display units */
  major: number;
  step: number;
  /** step while Shift is held, always exactly representable in the readout */
  fine: number;
  /** most decimals the readout shows */
  dec: number;
  counted: boolean;
  unit: string;
}

/** Where the scale ends and how it is divided, in the active display unit. */
export function dialRange(ing: Ingredient, unit: UnitKey, committedMl: number): DialRange {
  const info = amountInfo(ing, unit);
  let max: number;
  let major: number;
  let fine = info.step;
  if (info.counted) {
    if (ing.id === 'salt') { max = 2; major = 1; }
    else { max = ing.unit === 'dash' ? 8 : 10; major = 2; }
  } else if (unit === 'ml') {
    max = 120; major = 30; fine = 1;
  } else if (unit === 'cl') {
    max = 12; major = 3; fine = 0.25;
  } else if (unit === 'oz') {
    max = 4; major = 1; fine = 0.125;
  } else {
    max = 4; major = 1; fine = 0.25;
  }
  // an existing amount past the usual scale stretches it, so it never sits off the dial
  const committed = committedMl / info.per;
  if (committed > max) max = Math.ceil(committed / major - 1e-9) * major;
  return {
    max, major, step: info.step, fine,
    dec: unit === 'ml' && !info.counted ? 1 : 3,
    counted: info.counted,
    unit: info.counted ? nounOf(ing) : info.label,
  };
}

/** The next grid line above (dir 1) or below (dir -1) a value, clamped to the scale. */
export function stepValue(value: number, dir: 1 | -1, step: number, max: number): number {
  const q = value / step;
  const n = dir > 0 ? Math.floor(q + 1e-9) + 1 : Math.ceil(q - 1e-9) - 1;
  return Math.min(max, Math.max(0, Math.round(n * step * 10000) / 10000));
}

/** Snap a value to the grid, clamped to the scale. */
export function snapValue(value: number, step: number, max: number): number {
  return Math.min(max, Math.max(0, Math.round((Math.round(value / step) * step) * 10000) / 10000));
}

/** Readout text for a display value ("1.25", "37.5", "0.125"). */
export const formatValue = (v: number, dec: number) => trim(v, dec);

export interface Tick {
  frac: number;
  major: boolean;
  label: string | null;
}

/** Engraved ticks: one per step, a numeral on every major one. */
export function scaleTicks(range: Pick<DialRange, 'max' | 'major' | 'step' | 'dec'>): Tick[] {
  const { max, major, step, dec } = range;
  const out: Tick[] = [];
  const n = Math.round(max / step);
  for (let i = 0; i <= n; i++) {
    const v = i * step;
    const isMajor = Math.abs(v / major - Math.round(v / major)) < 1e-6;
    out.push({ frac: v / max, major: isMajor, label: isMajor ? trim(v, dec) : null });
  }
  return out;
}
