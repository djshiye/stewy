/* A tasting note written from the flavour profile alone: what the drink opens with,
   how sweet the middle is and how it finishes. Pure and deterministic, no DOM. */
import type { FlavorDim } from '../data/types';
import type { Harmony } from './harmony';

/** How a dimension reads at the front of the glass. Sweet and boozy are told apart. */
const FRONT: Partial<Record<FlavorDim, string>> = {
  bitter: 'bitter edge',
  citrus: 'bright citrus',
  sour: 'sharp tartness',
  herbal: 'herbal lift',
  fresh: 'cool freshness',
  fruity: 'ripe fruit',
  floral: 'soft florals',
  smoky: 'drifting smoke',
  spicy: 'warm spice',
  aromatic: 'fragrant botanicals',
  creamy: 'silky cream',
  nutty: 'toasted nuts',
  coffee: 'roasted coffee',
};

/** Bitterness and citrus carry a drink's first impression, so they rank a little higher at equal share. */
const LOUD: Partial<Record<FlavorDim, number>> = { bitter: 1.5, citrus: 1.15, coffee: 1.2 };

/** A dimension needs this share of the profile to be worth naming. */
const NAMEABLE = 0.07;

function opening(h: Harmony): string {
  const named = (Object.keys(FRONT) as FlavorDim[])
    .map((d) => ({ d, v: h.p[d] ?? 0, w: (h.p[d] ?? 0) * (LOUD[d] ?? 1) }))
    .filter((x) => x.v >= NAMEABLE)
    // ties break by name so the note never flips between renders
    .sort((a, b) => b.w - a.w || a.d.localeCompare(b.d))
    .slice(0, 2)
    .map((x) => FRONT[x.d] as string);
  if (!named.length) return (h.p.boozy ?? 0) >= 0.3 ? 'Spirit warmth up front' : 'Gentle flavours up front';
  const text = named.length === 2 ? `${named[0]} and ${named[1]}` : named[0];
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} up front`;
}

function middle(h: Harmony): string {
  const sweet = h.p.sweet ?? 0;
  if (sweet >= 0.3) return 'a rich sweetness through the middle';
  if (sweet >= 0.16) return 'a round sweetness in the middle';
  if (sweet >= 0.06) return 'a little sweetness in the middle';
  return 'a dry middle';
}

function finish(h: Harmony): string {
  switch (h.archetype) {
    case 'highball': return 'a long refreshing finish';
    case 'sparkling': return 'a lively finish';
    case 'sour': return 'a crisp finish';
    case 'dessert': return 'a smooth lingering finish';
    default: break;
  }
  if (h.balance !== null && h.balance <= -0.3) return 'a long dry finish';
  if (h.balance !== null && h.balance >= 0.3) return 'a soft sweet finish';
  if ((h.p.boozy ?? 0) >= 0.28) return 'a warm finish';
  if ((h.p.creamy ?? 0) >= 0.15) return 'a smooth finish';
  if ((h.p.fresh ?? 0) + (h.p.citrus ?? 0) >= 0.25) return 'a clean crisp finish';
  return 'a balanced finish';
}

/** One plain sentence about how the drink tastes, or an empty string with nothing in the pot. */
export function tastingNote(h: Harmony | null): string {
  if (!h || h.tot <= 0) return '';
  return `${opening(h)}, ${middle(h)}, ${finish(h)}.`;
}
