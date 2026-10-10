/* Serve inference: how a brew would be mixed, glassed, garnished and written
   down. Matched classics win; otherwise plain heuristics. Pure functions. */
import type { BrewEntry, GlassKind, Ingredient, Method, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { harmony, resemblance, VERDICT, type Tier } from './harmony';
import { mixColor } from './color';
import { amountLabel, type UnitKey } from './units';

/** Water added by mixing, as a fraction of the pre-dilution volume. */
export const DILUTION: Record<Method, number> = { stir: 0.22, shake: 0.28, build: 0.12, blend: 0.35 };

/** Grams of ethanol in one standard drink, and ethanol density in g/ml. */
const STANDARD_DRINK_G = 14;
const ETHANOL_DENSITY = 0.789;

export interface BrewStats {
  volumeMl: number;
  abv: number;
  finalVolumeMl: number;
  finalAbv: number;
  standardDrinks: number;
}

export interface ServeLine {
  id: string;
  name: string;
  amount: string;
}

export interface ServeCard {
  name: string;
  glass: GlassKind;
  method: Method;
  garnish: string | null;
  lines: ServeLine[];
  stats: BrewStats;
  score: number;
  tier: Tier;
  verdict: string;
  /** CSS colour of the mixed liquid. */
  color: string;
  match: Recipe | null;
}

type Resolved = { ing: Ingredient; ml: number };

/** Brew entries that exist in the ingredient list. */
function resolve(brew: BrewEntry[]): Resolved[] {
  const out: Resolved[] = [];
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (ing) out.push({ ing, ml: e.ml });
  }
  return out;
}

const sum = (xs: Resolved[], f: (r: Resolved) => number) => xs.reduce((s, r) => s + f(r), 0);
const isFizz = (ing: Ingredient) => ing.carbonated ?? (ing.icon === 'fizz' || ing.icon === 'flute');
const isSparklingWine = (ing: Ingredient) => isFizz(ing) && ing.icon === 'flute';
const has = (xs: Resolved[], id: string) => xs.some((r) => r.ing.id === id);

/** Ingredients that call for a shaker: juices, dairy, egg, coffee, coconut. */
function wantsShaking(ing: Ingredient): boolean {
  if (ing.group === 'Garnish') return false;
  return ing.group === 'Juices' || ['egg', 'cream', 'coffee', 'coconut'].includes(ing.icon);
}

/** Share of the volume made of fizzy ingredients, 0..1. */
function fizzShare(xs: Resolved[]): number {
  const total = sum(xs, (r) => r.ml);
  return total > 0 ? sum(xs, (r) => (isFizz(r.ing) ? r.ml : 0)) / total : 0;
}

export function inferMethod(brew: BrewEntry[], match?: Recipe | null): Method {
  if (match) return match.method;
  const xs = resolve(brew);
  if (fizzShare(xs) >= 0.35) return 'build';
  if (xs.some((r) => wantsShaking(r.ing))) return 'shake';
  return 'stir';
}

export function brewStats(brew: BrewEntry[], method: Method): BrewStats {
  const xs = resolve(brew);
  const volumeMl = sum(xs, (r) => r.ml);
  const ethanolMl = sum(xs, (r) => (r.ml * r.ing.abv) / 100);
  const abv = volumeMl > 0 ? (ethanolMl / volumeMl) * 100 : 0;
  const k = 1 + DILUTION[method];
  return {
    volumeMl,
    abv,
    finalVolumeMl: volumeMl * k,
    finalAbv: abv / k,
    standardDrinks: (ethanolMl * ETHANOL_DENSITY) / STANDARD_DRINK_G,
  };
}

export function inferGlass(brew: BrewEntry[], method: Method, match?: Recipe | null): GlassKind {
  if (match) return match.glass;
  const xs = resolve(brew);
  const total = sum(xs, (r) => r.ml);
  const finalMl = total * (1 + DILUTION[method]);
  const share = (f: (r: Resolved) => boolean) => (total > 0 ? sum(xs, (r) => (f(r) ? r.ml : 0)) / total : 0);

  if ((has(xs, 'bourbon') || has(xs, 'rye')) && has(xs, 'mint')) return 'julep';
  if (has(xs, 'vodka') && has(xs, 'ginger_beer')) return 'copper-mug';
  const sparkling = share((r) => isSparklingWine(r.ing));
  if (sparkling >= 0.6) return 'flute';
  if (sparkling >= 0.3) return 'wine';
  if (fizzShare(xs) > 0 && finalMl > 150) return 'highball';
  if (finalMl > 260 || method === 'blend') return 'hurricane';
  if (xs.some((r) => /rum/.test(r.ing.id)) && (has(xs, 'orgeat') || has(xs, 'pineapple_juice'))) return 'tiki';
  if (method === 'shake' && finalMl <= 140) return 'coupe';
  if (method === 'stir' && finalMl <= 100 && share((r) => r.ing.group === 'Spirits') >= 0.6) return 'martini';
  return 'rocks';
}

/** Short serving names for pieces that read well in a recipe. */
const GARNISH_NAME: Record<string, string> = {
  mint: 'Mint sprig', cucumber: 'Cucumber slice', salt: 'Salt rim', cherry: 'Cherry',
  orange_slice: 'Orange slice', olive: 'Olive',
};

export function inferGarnish(brew: BrewEntry[], match?: Recipe | null): string | null {
  if (match?.garnish) return match.garnish;
  const xs = resolve(brew);
  const own = xs.filter((r) => r.ing.group === 'Garnish').map((r) => GARNISH_NAME[r.ing.id] ?? r.ing.name);
  if (own.length) return own.join(', ');
  if (has(xs, 'lime_juice')) return 'Lime wheel';
  if (has(xs, 'lemon_juice')) return 'Lemon twist';
  if (has(xs, 'orange_juice') || has(xs, 'grapefruit_juice')) return 'Orange slice';

  const h = harmony(brew);
  if (!h) return null;
  const p = (d: keyof typeof h.p) => h.p[d] ?? 0;
  if (p('citrus') >= 0.15) return 'Citrus twist';
  if (p('coffee') >= 0.1) return 'Three coffee beans';
  if (p('creamy') >= 0.15) return 'Grated nutmeg';
  if (p('herbal') + p('fresh') >= 0.3) return 'Mint sprig';
  if (p('fruity') >= 0.2) return 'Fruit slice';
  if (p('boozy') >= 0.2) return 'Orange peel';
  return null;
}

export function serveCard(brew: BrewEntry[], name: string, unit: UnitKey): ServeCard {
  const match = resemblance(brew)?.recipe ?? null;
  const method = inferMethod(brew, match);
  const h = harmony(brew);
  const tier = h ? h.tier : 'none';
  return {
    name,
    glass: inferGlass(brew, method, match),
    method,
    garnish: inferGarnish(brew, match),
    lines: resolve(brew).map(({ ing, ml }) => ({
      id: ing.id, name: ing.name, amount: amountLabel({ id: ing.id, ml }, ing, unit),
    })),
    stats: brewStats(brew, method),
    score: h ? h.score : 0,
    tier,
    verdict: VERDICT[tier],
    color: mixColor(brew)?.css ?? 'rgba(255, 255, 255, 0.14)',
    match,
  };
}

/** Reader-friendly glass names for instructions. */
export const GLASS_LABEL: Record<GlassKind, string> = {
  coupe: 'coupe', martini: 'martini glass', rocks: 'rocks glass', highball: 'highball glass',
  'copper-mug': 'copper mug', wine: 'wine glass', flute: 'flute', hurricane: 'hurricane glass',
  julep: 'julep cup', tiki: 'tiki mug',
};

/** One-line instruction, e.g. "Stir with ice and strain into a rocks glass." */
export function methodLine(card: Pick<ServeCard, 'method' | 'glass'>): string {
  const glass = GLASS_LABEL[card.glass];
  const article = /^[aeiou]/.test(glass) ? 'an' : 'a';
  switch (card.method) {
    case 'stir': return `Stir with ice and strain into ${article} ${glass}.`;
    case 'shake': return `Shake with ice and strain into ${article} ${glass}.`;
    case 'blend': return `Blend with ice and pour into ${article} ${glass}.`;
    case 'build': return `Build over ice in ${article} ${glass} and stir gently.`;
  }
}

/** Plain-text recipe for the clipboard. */
export function recipeText(card: ServeCard, url?: string): string {
  const out = [card.name, '', ...card.lines.map((l) => `${l.amount} ${l.name}`), '', methodLine(card)];
  if (card.garnish) out.push(`Garnish: ${card.garnish}`);
  out.push('', `Harmony ${card.score}, ${card.verdict}`);
  if (url) out.push(url);
  return out.join('\n');
}
