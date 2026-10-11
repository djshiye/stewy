/* A tasting note written from the flavour profile alone: what the drink opens with,
   how sweet the middle is and how it finishes. Pure and deterministic, no DOM. */
import type { BrewEntry, FlavorDim, Ingredient } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { isPoorBrew, type Harmony } from './harmony';
import { inlineName } from './serve';

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

/** Curdling dairy, the same set the scoring uses. */
const DAIRY = new Set(['heavy_cream', 'milk', 'irish_cream']);

type Poured = { ing: Ingredient; ml: number };

/** The biggest pour matching `test`, or null. */
function biggest(xs: Poured[], test: (ing: Ingredient) => boolean): Ingredient | null {
  let best: Poured | null = null;
  for (const x of xs) if (test(x.ing) && (!best || x.ml > best.ml)) best = x;
  return best ? best.ing : null;
}

/** An ingredient set inside a sentence; cream reads "cream", not "heavy cream". */
const said = (ing: Ingredient) => (ing.id === 'heavy_cream' ? 'cream' : inlineName(ing.name));

/** Points the sweet or sour penalty must take before a fault calls the brew "far too" sweet or sharp
    (half the smallest full penalty), and before it mentions the lean at all. */
const FAR_TOO = -4;
const LEANS_TOO = -1;

/** One plain sentence naming what is wrong with a brew, from the same signals the score uses. */
function fault(h: Harmony, brew: BrewEntry[]): string {
  const xs: Poured[] = [];
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (ing && e.ml > 0) xs.push({ ing, ml: e.ml });
  }
  const tag = (ing: Ingredient, d: FlavorDim) => ing.tags[d] ?? 0;
  const isAcid = (ing: Ingredient) => (ing.group === 'Juices' && (tag(ing, 'sour') >= 1 || tag(ing, 'citrus') >= 1)) || tag(ing, 'sour') >= 2;

  const dairy = biggest(xs, (i) => DAIRY.has(i.id));
  const coconut = biggest(xs, (i) => i.id === 'coconut_cream');
  const acid = biggest(xs, (i) => isAcid(i) && i.id !== 'coconut_cream');
  const sharp = biggest(xs, (i) => tag(i, 'sour') >= 2 && i.id !== 'coconut_cream');
  const smoke = biggest(xs, (i) => tag(i, 'smoky') >= 1);
  const coffee = biggest(xs, (i) => tag(i, 'coffee') >= 1);
  const fizzMl = xs.reduce((t, x) => t + (x.ing.carbonated ? x.ml : 0), 0);
  const liquidMl = xs.reduce((t, x) => t + (x.ing.unit ? 0 : x.ml), 0);
  const fizzy = liquidMl > 0 && fizzMl / liquidMl >= 0.4;

  if (dairy && acid) return `The ${said(dairy)} splits against the ${said(acid)}, so it drinks thin and grainy.`;
  if (coconut && sharp) return `The coconut cream splits against the ${said(sharp)}, so it drinks thin and grainy.`;
  if (dairy && fizzy) return `The ${said(dairy)} splits in all that fizz, so it drinks thin and foamy.`;
  if (dairy && smoke) return `The ${said(dairy)} smothers the ${said(smoke)}, so it drinks heavy and muddy.`;
  if (coffee && acid) return `The ${said(acid)} turns the ${said(coffee)} sour and harsh.`;
  if (brew.length === 1) return 'A single ingredient on its own is a pour, not a drink.';
  // the sweet and sour penalties grow in, so only a real share of one says "far too"
  if (h.parts.sweetSour <= FAR_TOO) {
    return (h.p.sweet ?? 0) >= (h.p.sour ?? 0)
      ? 'It is far too sweet, with nothing sharp to cut through it.'
      : 'It is far too sharp, with nothing sweet to soften it.';
  }
  if (h.parts.sweetSour <= LEANS_TOO) {
    return (h.p.sweet ?? 0) >= (h.p.sour ?? 0)
      ? 'It leans too sweet, with too little sharpness to cut through it.'
      : 'It leans too sharp, with too little sweetness to soften it.';
  }
  if ((h.p.boozy ?? 0) >= 0.45) return 'It is almost all spirit, with nothing to balance the burn.';
  if (fizzy && fizzMl / liquidMl >= 0.6) return 'It is mostly mixer, so it drinks long and thin.';
  if (h.parts.crowd < 0) return 'Too many ingredients are fighting, so nothing stands out.';
  return 'The flavours fight each other, so nothing here comes together.';
}

/** One plain sentence about how the drink tastes, or an empty string with nothing in the pot.
    A brew that clashes hard or scores poorly gets its main fault instead of praise; pass the
    brew so the fault can name the ingredients. */
export function tastingNote(h: Harmony | null, brew: BrewEntry[] = []): string {
  if (!h || h.tot <= 0) return '';
  if (isPoorBrew(h)) return fault(h, brew);
  return `${opening(h)}, ${middle(h)}, ${finish(h)}.`;
}
