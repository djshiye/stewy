/* The pot's fill model: how many ml of liquid, how full that reads, and where the gauge marks sit. */
import type { BrewEntry } from '../../data/types';
import { ING_BY_ID } from '../../data/ingredients';

/** Surface depth is h = 1 - exp(-v / 75 ml): the first pours rise quickly, then it eases off. */
export const FILL_SCALE_ML = 75;
export const FILL_CAP = 0.98;
/** At this volume the brew reaches the meniscus and the lip glows brighter. */
export const OVERFLOW_ML = 200;
/** Ticks on the halo's fill gauge. */
export const GAUGE_MARKS = [30, 60, 90, 150, 250] as const;

/** Garnishes that float on the surface, by ingredient id. */
export const FLOATERS = ['orange_slice', 'cherry', 'olive', 'mint', 'cucumber'] as const;
export type Floater = (typeof FLOATERS)[number];

/** Liquid only: pieces of garnish do not raise the level. */
export function liquidMl(brew: BrewEntry[]): number {
  let ml = 0;
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (ing && ing.group !== 'Garnish') ml += e.ml;
  }
  return ml;
}

/** 0 to 0.98: how full the pot reads for `ml` of liquid. */
export function fillFraction(ml: number): number {
  if (!(ml > 0)) return 0;
  return Math.min(FILL_CAP, 1 - Math.exp(-ml / FILL_SCALE_ML));
}

/** How far the surface sits below the lip plane, in viewBox units. */
export const SURFACE_DEPTH_FULL = 2.5;
export const SURFACE_DEPTH_RANGE = 34;
/** Eased so 90 ml sits just under the lip while 30 ml and below clearly drop. */
export function surfaceDepth(ml: number): number {
  return SURFACE_DEPTH_FULL + (1 - fillFraction(ml) / FILL_CAP) ** 1.5 * SURFACE_DEPTH_RANGE;
}

/** Gauge arc: angle in degrees (0 = right, negative = up) for a volume, from the lowest mark up. */
export const GAUGE_FROM = -14;
export const GAUGE_TO = -86;
export function gaugeAngle(ml: number): number {
  return GAUGE_FROM + (GAUGE_TO - GAUGE_FROM) * fillFraction(ml) / FILL_CAP;
}

/** The floating garnishes in a brew, in the order they were added, each at most once. */
export function floatersIn(brew: BrewEntry[]): Floater[] {
  const out: Floater[] = [];
  for (const e of brew) {
    if ((FLOATERS as readonly string[]).includes(e.id) && !out.includes(e.id as Floater)) out.push(e.id as Floater);
  }
  return out;
}
