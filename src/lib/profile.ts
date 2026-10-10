/* Presentation helpers for the analysis panel: the fixed 8-axis radar, the honest
   score breakdown (integers that sum to the ring), tiers, and meter wording.
   Pure functions, no DOM. */
import type { FlavorDim } from '../data/types';
import type { Archetype, Parts, Profile } from './harmony';
import type { Method } from '../data/types';

export type AxisKey = 'boozy' | 'sweet' | 'sour' | 'bitter' | 'herbal' | 'fruity' | 'spice' | 'rich';

export interface AxisDef {
  key: AxisKey;
  label: string;
  dims: readonly FlavorDim[];
}

/** The radar always draws these eight axes in this order, clockwise from the top. */
export const AXES: readonly AxisDef[] = [
  { key: 'boozy', label: 'Boozy', dims: ['boozy'] },
  { key: 'sweet', label: 'Sweet', dims: ['sweet'] },
  { key: 'sour', label: 'Sour', dims: ['sour'] },
  { key: 'bitter', label: 'Bitter', dims: ['bitter'] },
  { key: 'herbal', label: 'Herbal', dims: ['herbal', 'fresh', 'floral'] },
  { key: 'fruity', label: 'Fruity', dims: ['fruity', 'citrus'] },
  { key: 'spice', label: 'Spice', dims: ['spicy', 'smoky', 'aromatic'] },
  { key: 'rich', label: 'Rich', dims: ['creamy', 'nutty', 'coffee'] },
];

export interface Axis {
  key: AxisKey;
  label: string;
  /** Share of the brew's flavour, 0..1. The eight values sum to the profile's total. */
  value: number;
}

/** Fold the 15 flavour dimensions of a normalised profile into the 8 radar axes. */
export function axes8(p: Profile | null | undefined): Axis[] {
  return AXES.map((a) => ({
    key: a.key,
    label: a.label,
    value: a.dims.reduce((s, d) => s + (p?.[d] ?? 0), 0),
  }));
}

/** Share of the flavour that puts a vertex on the outer ring. Fixed, so the shape never rescales. */
export const RADAR_FULL = 0.45;

/** 0..1 radius for an axis value; a square root eases small shares so they stay visible. */
export function radarRadius(value: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, value) / RADAR_FULL));
}

// ---------------------------------------------------------------------------
// Tiers

export type Tone = 'good' | 'warn' | 'bad';

/** Semantic tone for a score: 80 and up good, 56 to 79 warn, below 56 bad. */
export function tierTone(score: number): Tone {
  if (score >= 80) return 'good';
  if (score >= 56) return 'warn';
  return 'bad';
}

/** Where the tier track changes colour, as shares of 0..100. */
export const TIER_STOPS = { warn: 56, good: 80 } as const;

// ---------------------------------------------------------------------------
// Breakdown

export type PartKey = 'pairing' | 'balance' | 'structure' | 'penalties';

export interface PartRow {
  key: PartKey;
  label: string;
  /** Whole points; the rows plus the base sum to `total`. */
  value: number;
}

export interface Breakdown {
  base: number;
  rows: PartRow[];
  /** What the whole numbers add up to (before capping). */
  total: number;
  /** 'capped' when the engine held the score at 99, 'floored' when it lifted it to 3. */
  clamp: 'capped' | 'floored' | null;
  /** The score the ring shows. */
  score: number;
  /** "55 + 22 + 9 + 9 - 4 = 91", zero terms left out. */
  equation: string;
  /** "capped at 99" or "floored at 3", when the number was clamped. */
  clampNote: string | null;
  /** Penalty terms that took points, largest first. */
  penalties: { key: 'sweetSour' | 'oneNote' | 'clash' | 'crowd'; label: string; value: number }[];
}

const PENALTY_LABEL = {
  sweetSour: 'Lopsided sweetness',
  oneNote: 'One-note',
  clash: 'Clash',
  crowd: 'Crowded',
} as const;

export const SCORE_MIN = 3;
export const SCORE_MAX = 99;

/** Signed whole number for display ("+22", "-4", "0"). ASCII hyphen: no dash glyphs in copy. */
export function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `-${Math.abs(n)}`;
  return '0';
}

/** Round the terms to whole points so that they add to `target` (largest remainder). */
function distribute(raw: number[], target: number): number[] {
  const floors = raw.map(Math.floor);
  let need = target - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = floors.slice();
  for (let k = 0; need > 0 && k < order.length * 2; k++, need--) out[order[k % order.length].i] += 1;
  return out;
}

/** Turn the engine's `parts` into whole-number rows that visibly sum to the score. */
export function breakdown(parts: Parts, score: number): Breakdown {
  const rawPenalties = parts.sweetSour + parts.oneNote + parts.clash + parts.crowd;
  const raw = [parts.pairing, parts.balance, parts.structure, rawPenalties];
  const rawTotal = parts.base + raw.reduce((s, v) => s + v, 0);
  const total = Math.round(rawTotal);
  const clamp = total > SCORE_MAX ? 'capped' : total < SCORE_MIN ? 'floored' : null;
  const target = total - parts.base;
  const ints = distribute(raw, target);

  const rows: PartRow[] = [
    { key: 'pairing', label: 'Pairing', value: ints[0] },
    { key: 'balance', label: 'Balance', value: ints[1] },
    { key: 'structure', label: 'Structure', value: ints[2] },
    { key: 'penalties', label: 'Penalties', value: ints[3] },
  ];

  const terms = rows.filter((r) => r.value !== 0);
  const equation =
    `${parts.base}` +
    terms.map((r) => ` ${r.value < 0 ? '-' : '+'} ${Math.abs(r.value)}`).join('') +
    ` = ${total}`;

  const penalties = (['sweetSour', 'oneNote', 'clash', 'crowd'] as const)
    .map((key) => ({ key, label: PENALTY_LABEL[key], value: Math.round(parts[key]) }))
    .filter((p) => p.value < 0)
    .sort((a, b) => a.value - b.value);

  return {
    base: parts.base,
    rows,
    total,
    clamp,
    score,
    equation,
    clampNote: clamp === 'capped' ? `capped at ${SCORE_MAX}` : clamp === 'floored' ? `floored at ${SCORE_MIN}` : null,
    penalties,
  };
}

/** Name of the classic shape behind a structure bonus. */
export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  sour: 'Sour structure',
  'spirit-forward': 'Spirit-forward structure',
  highball: 'Highball structure',
  sparkling: 'Sparkling structure',
  dessert: 'Dessert structure',
};

/** One line under the Structure row. */
export function structureNote(structure: number, archetype: Archetype | null): string | null {
  if (archetype && structure > 0) return ARCHETYPE_LABEL[archetype];
  if (archetype) return `${ARCHETYPE_LABEL[archetype]}, already credited`;
  if (structure < 0) return 'No classic shape yet';
  if (structure > 0) return 'A real base spirit';
  return null;
}

// ---------------------------------------------------------------------------
// Meters

/** Position of the balance marker, 0 (sweet end) to 1 (sour and bitter end). */
export function balancePosition(balance: number): number {
  return Math.min(1, Math.max(0, (1 - balance) / 2));
}

export function balanceWord(balance: number | null): string {
  if (balance === null) return 'Nothing to weigh yet';
  if (Math.abs(balance) < 0.15) return 'Balanced';
  if (balance >= 0.6) return 'Sweet';
  if (balance > 0) return 'Leans sweet';
  if (balance <= -0.6) return 'Sour and bitter';
  return 'Leans sour and bitter';
}

export type StrengthZone = 'light' | 'classic' | 'strong';

/** ABV (after dilution) where the strength zones change, and the top of the scale. */
export const STRENGTH = { classic: 12, strong: 28, max: 40 } as const;

export function strengthZone(abv: number): StrengthZone {
  if (abv >= STRENGTH.strong) return 'strong';
  if (abv >= STRENGTH.classic) return 'classic';
  return 'light';
}

/** 0..1 marker position on the strength scale. */
export function strengthPosition(abv: number): number {
  return Math.min(1, Math.max(0, abv / STRENGTH.max));
}

export const METHOD_VERB: Record<Method, string> = {
  stir: 'Stir', shake: 'Shake', build: 'Build', blend: 'Blend',
};

/** "after stirring" for the strength figure. */
export const METHOD_AFTER: Record<Method, string> = {
  stir: 'after stirring', shake: 'after shaking', build: 'after building', blend: 'after blending',
};

export const METHOD_TIME: Record<Method, string> = {
  stir: '30 seconds', shake: '15 seconds', build: 'over ice', blend: '20 seconds',
};

/** "Stirred over ice." style sentence for the card's sub line. */
export const METHOD_SENTENCE: Record<Method, string> = {
  stir: 'Stirred over ice.',
  shake: 'Shaken hard over ice.',
  build: 'Built over ice.',
  blend: 'Blended with ice.',
};
