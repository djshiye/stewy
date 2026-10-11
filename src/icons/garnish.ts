/* Garnish and ice vocabulary for the glassware, plus the text parsers that map
   a recipe's garnish string, a brew and a mixing method onto it. Pure, no React. */
import type { BrewEntry, GlassKind, Method } from '../data/types';

export const GARNISH_KINDS = [
  'orange-peel', 'orange-wheel', 'lime-wheel', 'lime-wedge', 'lemon-twist', 'mint-sprig',
  'cherry', 'olive-pick', 'pineapple-wedge', 'coffee-beans', 'celery', 'salt-rim', 'sugar-rim',
  'cucumber-ribbon', 'raspberry', 'blackberry', 'nutmeg',
  // Extras that the 56 classics call for and that read differently from the ones above.
  'lemon-wheel', 'grapefruit-wedge', 'ginger', 'passion-fruit', 'bitters',
] as const;

export type GarnishKind = (typeof GARNISH_KINDS)[number];

export type Ice = 'none' | 'cubes' | 'large-cube' | 'crushed';

/** Ordered keyword rules; the first match decides a fragment's kind. */
const RULES: [RegExp, GarnishKind][] = [
  [/\bsalt\b/, 'salt-rim'],
  [/\bsugar\b/, 'sugar-rim'],
  [/\bbitters\b/, 'bitters'],
  [/\b(orange|citrus)\s+(peel|twist|zest)\b/, 'orange-peel'],
  [/\borange\b|\bfruit slice\b/, 'orange-wheel'],
  [/\b(lemon)\s+(twist|peel|zest)\b/, 'lemon-twist'],
  [/\blemon\b/, 'lemon-wheel'],
  [/\blime\s+(wedge|shell|half)\b/, 'lime-wedge'],
  [/\blime\b/, 'lime-wheel'],
  [/\bgrapefruit\b/, 'grapefruit-wedge'],
  [/\bmint\b/, 'mint-sprig'],
  [/\b(cherry|cherries)\b/, 'cherry'],
  [/\bolive/, 'olive-pick'],
  [/\bpineapple\b/, 'pineapple-wedge'],
  [/\bcoffee\b/, 'coffee-beans'],
  [/\bcelery\b/, 'celery'],
  [/\bcucumber\b/, 'cucumber-ribbon'],
  [/\braspberr/, 'raspberry'],
  [/\bblackberr/, 'blackberry'],
  [/\bnutmeg\b/, 'nutmeg'],
  [/\bginger\b/, 'ginger'],
  [/\bpassion/, 'passion-fruit'],
];

/** Garnish kinds for a free-text garnish ("Salt rim, lime wheel"). Alternatives
    ("Olive or lemon twist") keep the first. Unknown text yields an empty list. */
export function garnishFor(text: string | null | undefined): GarnishKind[] {
  if (!text) return [];
  const out: GarnishKind[] = [];
  for (const part of text.toLowerCase().split(/,|\band\b|&/)) {
    const first = part.split(/\bor\b/)[0].trim();
    if (!first) continue;
    const hit = RULES.find(([re]) => re.test(first));
    if (hit && !out.includes(hit[1])) out.push(hit[1]);
  }
  return out;
}

/** Ice a drink is served over, by glass and how it was mixed. */
export function iceFor(glass: GlassKind, method: Method): Ice {
  switch (glass) {
    case 'coupe':
    case 'martini':
    case 'flute':
      return 'none';
    case 'julep':
    case 'tiki':
    case 'hurricane':
      return 'crushed';
    case 'wine':
      return method === 'build' ? 'cubes' : 'none';
    case 'rocks':
      if (method === 'blend') return 'crushed';
      return method === 'stir' ? 'large-cube' : 'cubes';
    case 'highball':
    case 'copper-mug':
      return method === 'blend' ? 'crushed' : 'cubes';
  }
}

export const EGG_FOAM = '#f5efe3';
export const CREMA = '#b98652';

/** Foam colour for a brew, or null. Egg white gives a white foam, espresso a crema. */
export function foamFor(brew: BrewEntry[]): string | null {
  const has = (id: string) => brew.some((e) => e.id === id && e.ml > 0);
  if (has('egg_white')) return EGG_FOAM;
  if (has('espresso')) return CREMA;
  return null;
}
