/* The coach: simulates adding each ingredient to the current brew and reports
   how the harmony score would move. Pure functions, no DOM. */
import type { BrewEntry, Ingredient } from '../data/types';
import { INGREDIENTS } from '../data/ingredients';
import { curdles, DAIRY, harmony } from './harmony';
import { isCounted, perPiece } from './units';

export interface Delta {
  /** Score change versus the current brew (can be negative). */
  delta: number;
  /** Amount, in ml, that produced the best result. */
  ml: number;
  /** True when adding it at that amount introduces or worsens a real flavour clash
      (curdling, muddy pairings), as opposed to merely unbalancing the brew. */
  clash?: boolean;
  /** True when this is dairy and the brew already curdles: the pot is told to pick the cream or the
      acid, so more of it is no gain (the delta is held at zero or below, whatever the score would say). */
  curdles?: boolean;
}

export interface CoachSuggestion {
  ing: Ingredient;
  ml: number;
  delta: number;
  /** Score the brew would have after adding. */
  score: number;
  /** True when this adds more of something already in the brew ("More orange slice"). */
  inBrew: boolean;
}

/** Amounts worth trying for an ingredient: half and full default pour, or one piece. */
export function candidateAmounts(ing: Ingredient): number[] {
  if (isCounted(ing)) return [perPiece(ing)];
  const half = Math.round(ing.amt * 5) / 10;
  return half > 0 && half !== ing.amt ? [half, ing.amt] : [ing.amt];
}

/** The brew with `ml` of `id` added (merged into an existing entry). */
export function withAdded(brew: BrewEntry[], id: string, ml: number): BrewEntry[] {
  return brew.some((e) => e.id === id)
    ? brew.map((e) => (e.id === id ? { ...e, ml: e.ml + ml } : e))
    : [...brew, { id, ml }];
}

/** Points the clash term must worsen by before an addition is flagged as clashing. */
const CLASH_FLAG = 5;

const cache = new WeakMap<BrewEntry[], Map<string, Delta> | null>();

/** Best achievable score change from adding each ingredient. Null for an empty brew. */
export function scoreDeltas(brew: BrewEntry[]): Map<string, Delta> | null {
  if (cache.has(brew)) return cache.get(brew) ?? null;
  const base = harmony(brew);
  let out: Map<string, Delta> | null = null;
  if (base) {
    out = new Map();
    // A curdled brew is told to pick the cream or the acid, so more dairy is no gain: it only waters the
    // acid down, and the cream still splits. Every reader of the deltas (shelf, coach) sees that here.
    const curdled = curdles(base);
    for (const ing of INGREDIENTS) {
      let best: Delta | null = null;
      for (const ml of candidateAmounts(ing)) {
        const h = harmony(withAdded(brew, ing.id, ml));
        if (!h) continue;
        const delta = h.score - base.score;
        if (!best || delta > best.delta) {
          best = { delta, ml };
          // a real clash worsens by a few points; mere imbalance never moves this term
          if (h.parts.clash - base.parts.clash <= -CLASH_FLAG) best.clash = true;
        }
      }
      if (best && curdled && DAIRY.has(ing.id)) {
        best.curdles = true;
        best.delta = Math.min(best.delta, 0);
      }
      if (best) out.set(ing.id, best);
    }
  }
  cache.set(brew, out);
  return out;
}

/** From this score up, a suggestion may not change the brew's archetype. */
const KEEP_SHAPE_SCORE = 80;
/** Below this gain an addition is only suggested when the flavours earn it: a point that comes from the
    structure is a shape's membership nudged along its fade, not a better drink. */
const MIN_SHAPE_GAIN = 2;

/** The best few additions, strongest first. Garnish only shows up when nothing else helps. */
export function topSuggestions(brew: BrewEntry[], n = 3): CoachSuggestion[] {
  const deltas = scoreDeltas(brew);
  const base = harmony(brew);
  if (!deltas || !base) return [];
  // A strong brew with a clear shape keeps it: no telling a 90-point Espresso Martini to become a highball.
  const keepShape = base.score >= KEEP_SHAPE_SCORE && base.archetype !== null;
  const all: CoachSuggestion[] = [];
  for (const ing of INGREDIENTS) {
    const d = deltas.get(ing.id);
    if (!d || d.delta <= 0) continue;
    const after = keepShape || d.delta < MIN_SHAPE_GAIN ? harmony(withAdded(brew, ing.id, d.ml)) : null;
    if (keepShape && after?.archetype !== base.archetype) continue;
    if (after && d.delta < MIN_SHAPE_GAIN && after.parts.structure - base.parts.structure >= d.delta / 2) continue;
    all.push({
      ing, ml: d.ml, delta: d.delta, score: base.score + d.delta,
      inBrew: brew.some((e) => e.id === ing.id),
    });
  }
  all.sort((a, b) => b.delta - a.delta);
  const main = all.filter((s) => s.ing.group !== 'Garnish');
  return (main.length ? main : all).slice(0, n);
}

/** Shelf fit hint from a score change: 0..1, 0.5 neutral, logistic over about -15..+15 points. */
export function fitFromDelta(delta: number | undefined): number | null {
  if (delta === undefined) return null;
  return 1 / (1 + Math.exp(-delta / 6));
}
