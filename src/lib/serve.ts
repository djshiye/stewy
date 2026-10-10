/* Serve inference: how a brew would be mixed, glassed, garnished and written
   down. Matched classics win; otherwise plain heuristics. Pure functions. */
import type { BrewEntry, GlassKind, Ingredient, Method, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { harmony, resemblance, VERDICT, type Tier } from './harmony';
import { mixColor } from './color';
import { amountLabel, isCounted, trim, type UnitKey } from './units';

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

/** One clipboard line: "1.5 oz Gin", "2 dashes Angostura bitters", "Orange slice", "Cherry (2 pieces)". */
function recipeLine(l: ServeCard['lines'][number]): string {
  const ing = ING_BY_ID[l.id];
  if (!ing || !isCounted(ing)) return `${l.amount} ${l.name}`;
  if (ing.unit === 'dash') return `${l.amount} ${l.name}`;
  if (l.id === 'salt' || /^1 /.test(l.amount)) return l.name;
  return `${l.name} (${l.amount})`;
}

/** Plain-text recipe for the clipboard. */
export function recipeText(card: ServeCard, url?: string): string {
  const out = [card.name, '', ...card.lines.map(recipeLine), '', methodLine(card)];
  if (card.garnish) out.push(`Garnish: ${card.garnish}`);
  out.push('', `Harmony ${card.score}, ${card.verdict}`);
  if (url) out.push(url);
  return out.join('\n');
}

/* ---------- additions for the serve sheet ---------- */

/** First words that stay capitalised inside a sentence. */
const PROPER_FIRST = new Set(['Campari', 'Aperol', 'Angostura', 'Lillet', 'Grand', 'Bénédictine', 'Irish', "Peychaud's", "Pimm's"]);

/** An ingredient name set inside a sentence ("Sweet vermouth" to "sweet vermouth", "Campari" stays). */
export function inlineName(name: string): string {
  const first = name.split(' ')[0];
  return PROPER_FIRST.has(first) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}

/** "a, b and c". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** Past-tense method word for a pill ("Stirred"). */
export const METHOD_PAST: Record<Method, string> = {
  stir: 'Stirred', shake: 'Shaken', build: 'Built over ice', blend: 'Blended',
};

export const STIR_SECONDS = 30;
export const SHAKE_SECONDS = 15;
export const BLEND_SECONDS = 20;

type ServeIce = 'none' | 'large-cube' | 'cubes' | 'crushed';

/** Ice a glass is served over (mirrors the glassware drawing, without importing it). */
function serveIce(glass: GlassKind, method: Method): ServeIce {
  switch (glass) {
    case 'coupe': case 'martini': case 'flute': return 'none';
    case 'julep': case 'tiki': case 'hurricane': return 'crushed';
    case 'wine': return method === 'build' ? 'cubes' : 'none';
    case 'rocks':
      if (method === 'blend') return 'crushed';
      return method === 'stir' ? 'large-cube' : 'cubes';
    case 'highball': case 'copper-mug': return method === 'blend' ? 'crushed' : 'cubes';
  }
}

/** The ice a serve is caption-worthy for ("Served over one large cube"). */
export function serveCaption(card: Pick<ServeCard, 'method' | 'glass'>): string {
  switch (serveIce(card.glass, card.method)) {
    case 'large-cube': return 'Served over one large cube';
    case 'cubes': return 'Served over ice';
    case 'crushed': return 'Served over crushed ice';
    default: return 'Served up';
  }
}

/** "a lime wheel", "three coffee beans", "grated nutmeg": a garnish fragment with its article. */
const MASS_GARNISH = new Set(['mint', 'cucumber', 'orange', 'lemon', 'lime', 'grapefruit', 'celery', 'ginger']);

function withArticle(fragment: string): string {
  const f = fragment.trim().toLowerCase();
  if (/^(an?|the|one|two|three|four|five|\d|grated|fresh|dried|crushed|candied|some)\b/.test(f)) return f;
  if (/[^s]s$/.test(f) || MASS_GARNISH.has(f)) return f;
  return `${article(f)} ${f}`;
}

/** Garnish text split into its rim and its pieces ("Salt rim, lime wheel"). */
function garnishParts(garnish: string | null): { rim: string | null; pieces: string[] } {
  if (!garnish) return { rim: null, pieces: [] };
  let rim: string | null = null;
  const pieces: string[] = [];
  for (const part of garnish.split(/,|\band\b/)) {
    const p = part.split(/\bor\b/)[0].trim();
    if (!p) continue;
    if (/\brim\b/i.test(p)) rim = /sugar/i.test(p) ? 'sugar' : 'salt';
    else pieces.push(p);
  }
  return { rim, pieces };
}

/** Numbered-list instructions for a serve, e.g. "Add the gin, Campari and sweet vermouth to a mixing glass with ice". */
export function methodSteps(
  card: Pick<ServeCard, 'method' | 'glass' | 'garnish' | 'lines'>,
): string[] {
  const rows = card.lines
    .map((l) => ING_BY_ID[l.id])
    .filter((ing): ing is Ingredient => Boolean(ing))
    .filter((ing) => ing.group !== 'Garnish');
  const tops = rows.filter((ing) => isFizz(ing));
  const mixed = rows.filter((ing) => !isFizz(ing));
  const topText = joinList(tops.map((i) => inlineName(i.name)));
  const hasId = (id: string) => rows.some((i) => i.id === id);
  const glass = GLASS_LABEL[card.glass];
  const ice = serveIce(card.glass, card.method);
  const { rim, pieces } = garnishParts(card.garnish);
  const mint = card.lines.find((l) => l.id === 'mint');
  const muddled = card.method === 'build' && !!mint && parseInt(mint.amount, 10) >= 4;

  const everything = (list: Ingredient[]) => {
    if (!list.length) return 'everything';
    if (tops.length && list.length >= 1 && mixed.length > 3) return `everything except the ${topText}`;
    if (list.length > 5) return 'everything';
    return `the ${joinList(list.map((i) => inlineName(i.name)))}`;
  };
  const all = tops.length && mixed.length > 3 ? mixed : mixed.length ? mixed : rows;

  const steps: string[] = [];
  if (rim) steps.push(`Rim ${article(glass)} ${glass} with ${rim}`);

  const strain = (double: boolean) => {
    const verb = double ? 'Double strain' : 'Strain';
    switch (ice) {
      case 'none': return `${verb} into a chilled ${glass}`;
      case 'large-cube': return `${verb} into a chilled ${glass} over one large cube`;
      case 'cubes': return `${verb} into ${article(glass)} ${glass} over fresh ice`;
      case 'crushed': return `${verb} into ${article(glass)} ${glass} over crushed ice`;
    }
  };

  switch (card.method) {
    case 'stir':
      steps.push(`Add ${everything(all)} to a mixing glass with ice`);
      steps.push(`Stir for ${STIR_SECONDS} seconds until the glass is frosted`);
      steps.push(strain(false));
      if (tops.length) steps.push(`Top with ${topText}`);
      break;
    case 'shake':
      if (hasId('egg_white')) {
        steps.push(`Add ${everything(all)} to a shaker`);
        steps.push('Shake without ice for 8 seconds to foam the egg white');
        steps.push(`Add ice and shake hard for ${SHAKE_SECONDS} seconds`);
      } else {
        steps.push(`Add ${everything(all)} to a shaker with ice`);
        steps.push(hasId('espresso')
          ? `Shake hard for ${SHAKE_SECONDS} seconds to build a thick crema`
          : `Shake hard for ${SHAKE_SECONDS} seconds`);
      }
      steps.push(strain(hasId('espresso') || hasId('egg_white')));
      if (tops.length) steps.push(`Top with ${topText}`);
      break;
    case 'build':
      if (muddled) steps.push(`Gently press the mint in ${article(glass)} ${glass} to release its oil`);
      if (ice === 'none') {
        steps.push(`Add ${everything(all)} to a chilled ${glass}`);
      } else {
        steps.push(`Fill ${article(glass)} ${glass} with ice`);
        if (mixed.length) steps.push(`Add ${everything(mixed)}`);
      }
      if (tops.length) steps.push(`Top with ${topText}`);
      steps.push('Stir gently to combine');
      break;
    case 'blend':
      steps.push(`Add ${everything(all)} to a blender with a cup of ice`);
      steps.push(`Blend for ${BLEND_SECONDS} seconds until smooth`);
      steps.push(`Pour into ${article(glass)} ${glass}`);
      if (tops.length) steps.push(`Top with ${topText}`);
      break;
  }

  const peels = pieces.filter((p) => /\b(peel|twist|zest)\b/i.test(p));
  const dots = pieces.filter((p) => /\bbitters\b/i.test(p));
  const rest = pieces.filter((p) => !peels.includes(p) && !dots.includes(p));
  for (const p of peels) steps.push(`Express ${withArticle(p)} over the drink, then drop it in`);
  if (dots.length) steps.push('Dot the top with a few drops of bitters');
  if (rest.length) steps.push(`Garnish with ${joinList(rest.map(withArticle))}`);
  return steps;
}

export interface MeasureLine {
  id: string;
  name: string;
  /** Amount in the active unit ("1 oz", "3 dashes"). */
  primary: string;
  /** The same volume in a second unit (ml, or oz when ml is active); null for counted items. */
  secondary: string | null;
}

/** Menu lines for a brew: the active unit first, a second unit beside it. */
export function measureLines(brew: BrewEntry[], unit: UnitKey): MeasureLine[] {
  const out: MeasureLine[] = [];
  for (const { ing, ml } of resolve(brew)) {
    const primary = amountLabel({ id: ing.id, ml }, ing, unit);
    let secondary: string | null = null;
    if (!isCounted(ing)) {
      secondary = unit === 'ml' ? amountLabel({ id: ing.id, ml }, ing, 'oz') : `${trim(ml, 1)} ml`;
    }
    out.push({ id: ing.id, name: ing.name, primary, secondary });
  }
  return out;
}
