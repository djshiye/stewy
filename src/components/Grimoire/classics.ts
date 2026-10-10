/* The Grimoire's data layer: one record per classic with everything the index needs
   (mixed colour, score, glass props, key ingredients, search text), computed once,
   plus the filter table. Pure, so it is unit-tested apart from the UI. */
import type { BrewEntry, GlassKind, Method, Recipe } from '../../data/types';
import { RECIPES } from '../../data/recipes';
import { ING_BY_ID } from '../../data/ingredients';
import { harmony, type Archetype } from '../../lib/harmony';
import { mixColor } from '../../lib/color';
import { isCounted } from '../../lib/units';
import { foamFor, garnishFor, iceFor, type GarnishKind, type Ice } from '../../icons/garnish';

export interface Classic {
  recipe: Recipe;
  brew: BrewEntry[];
  /** Harmony of the build, 0 when the engine has nothing to say. */
  score: number;
  archetype: Archetype | null;
  /** CSS colour of the mixed liquid. */
  color: string;
  garnish: GarnishKind[];
  ice: Ice;
  foam: string | null;
  /** The three ingredients that define the drink, as a short line ("Gin, Campari, sweet vermouth"). */
  key: string;
  /** Lower-case, accent-free text the search matches against (name and every ingredient). */
  haystack: string;
}

export const METHOD_LABEL: Record<Method, string> = {
  stir: 'Stirred', shake: 'Shaken', build: 'Built', blend: 'Blended',
};

/** Fallback liquid colour for a build the colour engine cannot read. */
const NO_COLOR = 'rgba(255, 255, 255, 0.14)';

/** Lower-case and strip accents, so "pina" finds Piña Colada. */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[‘’]/g, "'").toLowerCase();

const GROUP_RANK: Partial<Record<string, number>> = { Spirits: 0, Liqueurs: 1, Bitters: 3 };
/** Words that stay capitalised mid-sentence ("Gin, Campari, sweet vermouth"). */
const PROPER = new Set(['Campari', 'Aperol', 'Bénédictine', 'Angostura', 'Irish']);

/** Sentence-case an ingredient name for a list: keeps brands, lowers the rest. */
function inline(name: string): string {
  const word = name.split(' ')[0];
  if (PROPER.has(word) || /[A-Z]/.test(name.slice(1))) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** The ingredients that name a drink: spirits first, then liqueurs and mixers by size, small pieces last. */
function keyIngredients(brew: BrewEntry[]): string {
  const ings = brew.flatMap((e) => {
    const ing = ING_BY_ID[e.id];
    return ing && ing.group !== 'Garnish' ? [{ ing, ml: e.ml }] : [];
  });
  const rank = (g: string) => GROUP_RANK[g] ?? 2;
  const liquids = ings
    .filter((x) => !isCounted(x.ing))
    .sort((a, b) => rank(a.ing.group) - rank(b.ing.group) || b.ml - a.ml);
  const pieces = ings.filter((x) => isCounted(x.ing));
  return [...liquids, ...pieces]
    .slice(0, 3)
    .map((x, i) => (i === 0 ? x.ing.name : inline(x.ing.name)))
    .join(', ');
}

function describe(recipe: Recipe): Classic {
  const brew = recipe.build.map(([id, ml]): BrewEntry => ({ id, ml }));
  const h = harmony(brew);
  const names = brew.map((e) => ING_BY_ID[e.id]?.name ?? e.id);
  return {
    recipe,
    brew,
    score: h?.score ?? 0,
    archetype: h?.archetype ?? null,
    color: mixColor(brew)?.css ?? NO_COLOR,
    garnish: garnishFor(recipe.garnish),
    ice: iceFor(recipe.glass, recipe.method),
    foam: foamFor(brew),
    key: keyIngredients(brew),
    haystack: fold([recipe.name, ...names].join(' ')),
  };
}

let cache: Classic[] | null = null;

/** All classics, computed on first use and then reused for the life of the page. */
export function getClassics(): Classic[] {
  return (cache ??= RECIPES.map(describe));
}

/* ---------- filters ---------- */

export type FilterKey = 'all' | 'stirred' | 'shaken' | 'built' | 'sours' | 'long' | 'tiki' | 'after-dinner';

export interface FilterDef {
  key: FilterKey;
  label: string;
  /** How the chip is defined, in plain words (also read by tests). */
  rule: string;
  test(c: Classic): boolean;
}

const LONG_GLASSES: GlassKind[] = ['highball', 'copper-mug', 'hurricane', 'wine'];
const TIKI_GLASSES: GlassKind[] = ['tiki', 'hurricane'];
const TIKI_MARKERS = ['orgeat', 'coconut_cream'];
const RUMS = ['white_rum', 'dark_rum', 'spiced_rum'];
const CITRUS = ['lemon_juice', 'lime_juice', 'grapefruit_juice'];
const SOUR_GLASSES: GlassKind[] = ['coupe', 'rocks', 'martini'];
const DESSERT_MARKERS = [
  'coffee_liqueur', 'espresso', 'irish_cream', 'heavy_cream', 'milk', 'creme_de_cacao', 'creme_de_menthe',
];

const uses = (c: Classic, ids: string[]) => c.brew.some((e) => ids.includes(e.id));

/** The single source of truth for the chips: edit a definition here and the UI follows. */
export const FILTERS: FilterDef[] = [
  { key: 'all', label: 'All', rule: 'Every classic.', test: () => true },
  { key: 'stirred', label: 'Stirred', rule: 'Mixed by stirring over ice.', test: (c) => c.recipe.method === 'stir' },
  { key: 'shaken', label: 'Shaken', rule: 'Mixed in a shaker.', test: (c) => c.recipe.method === 'shake' },
  {
    key: 'built', label: 'Built', rule: 'Made in the glass, or blended.',
    test: (c) => c.recipe.method === 'build' || c.recipe.method === 'blend',
  },
  {
    key: 'sours', label: 'Sours', rule: 'Spirit, citrus juice and sweetener, served short (the engine reads it as a sour).',
    test: (c) => c.archetype === 'sour' && SOUR_GLASSES.includes(c.recipe.glass) && uses(c, CITRUS),
  },
  {
    key: 'long', label: 'Long drinks', rule: 'Served tall, in a highball, mug, hurricane or wine glass, or topped with a mixer.',
    test: (c) => LONG_GLASSES.includes(c.recipe.glass) || c.archetype === 'highball',
  },
  {
    key: 'tiki', label: 'Tiki', rule: 'Tiki mug or hurricane glass, or rum with orgeat, coconut or pineapple.',
    test: (c) =>
      TIKI_GLASSES.includes(c.recipe.glass) || uses(c, TIKI_MARKERS) || (uses(c, RUMS) && uses(c, ['pineapple_juice'])),
  },
  {
    key: 'after-dinner', label: 'After dinner', rule: 'Creamy, coffee or chocolate drinks (the engine reads them as dessert).',
    test: (c) => c.archetype === 'dessert' || uses(c, DESSERT_MARKERS),
  },
];

/** Classics that pass a chip and a search ("gin", "pina colada"). Every word must match. */
export function filterClassics(all: Classic[], filter: FilterKey, query: string): Classic[] {
  const def = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const words = fold(query).split(/\s+/).filter(Boolean);
  return all.filter((c) => def.test(c) && words.every((w) => c.haystack.includes(w)));
}

/** Score dot colour by the DESIGN thresholds (not by tier name: "good" starts at 70). */
export const scoreColor = (score: number) =>
  score >= 80 ? 'var(--good)' : score >= 56 ? 'var(--warn)' : 'var(--bad)';

export const classicCount = () => getClassics().length;
