/* The harmony engine: a 15-dimension flavour-affinity model that scores a
   brew 0 to 100, explains itself, and rates how well each shelf reagent would
   fit the current mix. Pure functions, no DOM. */
import type { BrewEntry, FlavorDim, Ingredient, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { clamp } from './color';
import { inlineName } from './units';

// Pairwise flavour affinities (-1..1). Missing pairs default to +0.12.
const AFF: Record<string, number> = {
  'bitter|sweet': 0.85, 'citrus|sweet': 0.7, 'boozy|sweet': 0.55, 'spicy|sweet': 0.7,
  'creamy|sweet': 0.6, 'coffee|sweet': 0.8, 'nutty|sweet': 0.75, 'fruity|sweet': 0.55,
  'floral|sweet': 0.5, 'herbal|sweet': 0.4, 'fresh|sweet': 0.45, 'smoky|sweet': 0.4,
  'aromatic|sweet': 0.4, 'sour|sweet': 0.9,
  'boozy|sour': 0.7, 'herbal|sour': 0.55, 'fruity|sour': 0.6, 'floral|sour': 0.5,
  'citrus|sour': 0.4, 'fresh|sour': 0.6, 'aromatic|sour': 0.4, 'sour|spicy': 0.5,
  'creamy|sour': -0.35, 'coffee|sour': -0.45, 'smoky|sour': 0.2, 'nutty|sour': 0.2,
  'bitter|citrus': 0.6, 'bitter|herbal': 0.6, 'bitter|boozy': 0.45, 'aromatic|bitter': 0.55,
  'bitter|fruity': 0.35, 'bitter|floral': 0.3, 'bitter|coffee': 0.6, 'bitter|fresh': 0.4,
  'bitter|spicy': 0.4, 'bitter|smoky': 0.5, 'bitter|nutty': 0.4, 'bitter|creamy': 0.25,
  'citrus|herbal': 0.7, 'fresh|herbal': 0.8, 'fruity|herbal': 0.5, 'floral|herbal': 0.6,
  'aromatic|herbal': 0.6, 'boozy|herbal': 0.4, 'herbal|spicy': 0.45, 'herbal|smoky': 0.35,
  'coffee|herbal': -0.2, 'herbal|nutty': 0.35, 'creamy|herbal': 0.1,
  'citrus|fruity': 0.55, 'floral|fruity': 0.6, 'fresh|fruity': 0.6, 'fruity|spicy': 0.6,
  'aromatic|fruity': 0.45, 'boozy|fruity': 0.4, 'fruity|nutty': 0.5, 'fruity|smoky': 0.1,
  'coffee|fruity': -0.3, 'creamy|fruity': 0.35,
  'citrus|fresh': 0.8, 'citrus|floral': 0.6, 'aromatic|citrus': 0.5, 'boozy|citrus': 0.4,
  'citrus|spicy': 0.6, 'citrus|smoky': 0.5, 'citrus|nutty': 0.3, 'citrus|coffee': -0.4,
  'citrus|creamy': -0.45,
  'aromatic|smoky': 0.4, 'boozy|smoky': 0.3, 'smoky|spicy': 0.4, 'floral|smoky': 0.2,
  'nutty|smoky': 0.4, 'coffee|smoky': 0.4, 'creamy|smoky': -0.35, 'fresh|smoky': 0.2,
  'aromatic|spicy': 0.5, 'boozy|spicy': 0.4, 'floral|spicy': 0.3, 'fresh|spicy': 0.4,
  'nutty|spicy': 0.4, 'coffee|spicy': 0.4, 'creamy|spicy': 0.3,
  'aromatic|floral': 0.55, 'boozy|floral': 0.3, 'floral|fresh': 0.6, 'floral|nutty': 0.3,
  'coffee|floral': 0.1, 'creamy|floral': 0.35,
  'coffee|creamy': 0.9, 'creamy|nutty': 0.8, 'boozy|creamy': 0.3, 'aromatic|creamy': 0.35,
  'aromatic|boozy': 0.45, 'aromatic|nutty': 0.4, 'aromatic|coffee': 0.5, 'aromatic|fresh': 0.45,
  'fresh|nutty': 0.2, 'boozy|fresh': 0.35, 'coffee|fresh': -0.2,
  'coffee|nutty': 0.7, 'boozy|nutty': 0.4, 'boozy|coffee': 0.5,
};

function aff(a: string, b: string): number {
  if (a === b) return 0.1;
  const k = a < b ? `${a}|${b}` : `${b}|${a}`;
  return k in AFF ? AFF[k] : 0.12;
}

export type Profile = Partial<Record<FlavorDim, number>>;

/** Volume-weighted raw flavour totals for a brew. */
export function profile(brew: BrewEntry[]): { F: Profile; tot: number } {
  const F: Profile = {};
  let tot = 0;
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (!ing) continue;
    for (const d in ing.tags) {
      const dim = d as FlavorDim;
      const v = (ing.tags[dim] ?? 0) * e.ml;
      F[dim] = (F[dim] ?? 0) + v;
      tot += v;
    }
  }
  return { F, tot };
}

export type Tier = 'legendary' | 'great' | 'good' | 'ok' | 'poor' | 'bad' | 'none';

export function tierFor(s: number): Tier {
  if (s >= 90) return 'legendary';
  if (s >= 80) return 'great';
  if (s >= 70) return 'good';
  if (s >= 56) return 'ok';
  if (s >= 42) return 'poor';
  return 'bad';
}

export const VERDICT: Record<Tier, string> = {
  legendary: 'Legendary elixir', great: 'Masterful brew', good: 'A fine potion',
  ok: 'Drinkable draught', poor: 'Murky concoction', bad: 'Cursed sludge',
  none: 'Waiting for ingredients',
};

/** Points each scoring term contributed (penalties are negative). */
export interface Parts {
  base: number;
  pairing: number;
  balance: number;
  structure: number;
  sweetSour: number;
  oneNote: number;
  clash: number;
  crowd: number;
}

const NO_PARTS: Parts = {
  base: 0, pairing: 0, balance: 0, structure: 0, sweetSour: 0, oneNote: 0, clash: 0, crowd: 0,
};

/** A recognised drink shape. The pairwise model cannot see structure, so these are scored apart. */
export type Archetype = 'sour' | 'spirit-forward' | 'highball' | 'sparkling' | 'dessert';

export interface Harmony {
  score: number;
  tier: Tier;
  /** Normalised flavour profile (fractions sum to 1). */
  p: Profile;
  F: Profile;
  tot: number;
  /** What each scoring term added or took away. */
  parts: Parts;
  /** -1 (sour or bitter dominated) .. 0 (balanced) .. +1 (sweet dominated); null with no sweet, sour or bitter. */
  balance: number | null;
  /** The classic shape this brew follows, if any (its bonus sits in `parts.structure`). */
  archetype: Archetype | null;
  /** Points of the clash that come from cream splitting against acid (dairy, or coconut cream against
      sharp acid): what the clash would give back with no acid in the pot. Part of `parts.clash`. */
  curdle: number;
  /** Points of the clash that come from coffee meeting acid (espresso or coffee liqueur against juice or
      sharp mixer). Part of `parts.clash`. The tip warns from 5 points (`coffeeAcidClashes`); the tasting note
      names a juice or sharp mixer against the coffee at any amount, and any other sour liquid from 5 points. */
  coffeeAcid: number;
}

/** Volumes and ingredient facts the archetype checks work from. Counted pieces and dashes
    (garnish, bitters) are left out of the liquid volume. */
interface Shape {
  liquid: number;
  /** Alcohol as ml of 40% spirit, so a 11% spritz and a neat pour compare fairly. */
  booze: number;
  /** Distinct strong (20% and up) ingredients: spirits and hard liqueurs. */
  strong: number;
  /** Distinct base spirits. */
  spirits: number;
  /** Base spirit volume. */
  spirit: number;
  /** Non-alcoholic long mixer: carbonated, or a big pour of juice. */
  long: number;
  /** Sparkling wine. */
  sparkling: number;
  /** Anything carbonated. */
  fizz: number;
  /** Juice that brings acidity. */
  acid: number;
  /** Sour and citrus flavour weight of the liquid alone: a garnish slice or a dash of bitters adds none. */
  tang: number;
  cream: number;
  /** Curdling dairy (cream, milk, Irish cream). Egg white and coconut cream do not curdle. */
  dairy: number;
  /** Cream and milk only: the dairy a Ramos-style egg white emulsion can hold. */
  richDairy: number;
  eggWhite: number;
  /** Gin, the base of a Ramos. */
  gin: number;
  /** Plain soda water, the top of a Ramos. */
  soda: number;
  /** Creamy flavour weight of the curdling dairy alone (coconut cream and egg white stay out). */
  dairyCreamy: number;
  /** Creamy flavour weight of coconut cream, which only sharp acid sours. */
  coconutCreamy: number;
  /** Sour and citrus flavour weight from mild fruit juice (pineapple, orange, tomato), which coconut cream stands up to. */
  mildAcid: number;
  /** Syrup with real sweetness (2 or more). */
  syrup: number;
  hasLiqueur: boolean;
  /** A non-spirit ingredient that brings real sweetness (2 or more). */
  sweetSrc: boolean;
  /** A non-spirit ingredient that adds any sweetness. */
  sweetMod: boolean;
  /** A non-spirit ingredient that adds bitterness, aromatics or herbs (2 or more, or bitter 1). */
  dryMod: boolean;
  /** Distinct flavour-bearing ingredients. */
  tagged: number;
}

function shapeOf(brew: BrewEntry[]): Shape {
  const s: Shape = {
    liquid: 0, booze: 0, strong: 0, spirits: 0, spirit: 0, long: 0, sparkling: 0, fizz: 0, acid: 0, tang: 0, cream: 0, dairy: 0, richDairy: 0, eggWhite: 0, gin: 0, soda: 0, dairyCreamy: 0, coconutCreamy: 0, mildAcid: 0, syrup: 0,
    hasLiqueur: false, sweetSrc: false, sweetMod: false, dryMod: false, tagged: 0,
  };
  const seen = new Set<string>();
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (!ing || e.ml <= 0) continue;
    addVolume(s, ing, e.ml);
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const t = ing.tags;
    if (Object.keys(t).length) s.tagged++;
    if (!ing.unit && ing.abv >= 20) s.strong++;
    if (ing.group === 'Spirits') { s.spirits++; continue; }
    if (ing.group === 'Liqueurs' && (t.sweet ?? 0) >= 2) s.hasLiqueur = true;
    if ((t.sweet ?? 0) >= 2) s.sweetSrc = true;
    if ((t.sweet ?? 0) >= 1) s.sweetMod = true;
    if ((t.bitter ?? 0) >= 1 || (t.aromatic ?? 0) >= 2 || (t.herbal ?? 0) >= 2) s.dryMod = true;
  }
  return s;
}

function addVolume(s: Shape, ing: Ingredient, ml: number) {
  if (ing.unit) return;
  const t = ing.tags;
  s.liquid += ml;
  if (ing.group === 'Spirits') s.spirit += ml;
  s.booze += (ml * ing.abv) / 40;
  if (ing.abv === 0 && (ing.carbonated || (ing.group === 'Juices' && ing.amt >= 60))) s.long += ml;
  if (ing.carbonated) s.fizz += ml;
  if (ing.carbonated && ing.abv > 0) s.sparkling += ml;
  if ((ing.group === 'Juices' && ((t.sour ?? 0) >= 1 || (t.citrus ?? 0) >= 1)) || (t.sour ?? 0) >= 2) s.acid += ml;
  s.tang += ((t.sour ?? 0) + (t.citrus ?? 0)) * ml;
  if ((t.creamy ?? 0) >= 2) s.cream += ml;
  if (DAIRY.has(ing.id)) { s.dairy += ml; s.dairyCreamy += (t.creamy ?? 0) * ml; }
  if (EMULSIFIABLE.has(ing.id)) s.richDairy += ml;
  if (ing.id === 'egg_white') s.eggWhite += ml;
  if (ing.id === 'coconut_cream') s.coconutCreamy += (t.creamy ?? 0) * ml;
  if (ing.group === 'Juices' && (t.sour ?? 0) < 2) s.mildAcid += ((t.sour ?? 0) + (t.citrus ?? 0)) * ml;
  if (ing.id === 'gin') s.gin += ml;
  if (ing.id === 'soda_water') s.soda += ml;
  if (ing.group === 'Syrups' && (t.sweet ?? 0) >= 2) s.syrup += ml;
}

/** Dairy that splits in acid. Egg white and coconut cream are creamy but stay out of this. */
export const DAIRY: ReadonlySet<string> = new Set(['heavy_cream', 'milk', 'irish_cream']);
/** Dairy an egg white emulsion can hold. Irish cream carries its own whiskey and stays out. */
const EMULSIFIABLE = new Set(['heavy_cream', 'milk']);
const CURDLE = 0.2;
/** Clash a real pour of dairy with real acid always carries, however long the drink is topped. */
const CURDLE_FLOOR = 0.45;
/** Egg white per ml of dairy: nothing below the low end, the full rescue at the high end (a Ramos runs
    from two to three parts of egg white to three of cream, so the top sits just under two thirds). The
    low end sits well under the useful amount so the rescue, and the shape it brings back, fades in gently. */
const EMULSION_EGG_LO = 0.2;
const EMULSION_EGG_HI = 0.66;
/** Clash (as a fraction, 95 points per unit) at which a brew loses its classic shape altogether. Clash
    costs its own points and the shape as well, so this sits wide enough that the two together never
    take more than a few points per 0.5 ml. */
const SHAPE_CLASH = 0.3;
const SHAPELESS = 16;
const TAPER_START = 78;
const TAPER_END = 90;
const LONE_SPIRIT_CAP = 58;
const LONE_CAP = 44;

/** 0 at or below `lo`, 1 at or above `hi`, linear between. */
function ramp(x: number, lo: number, hi: number): number {
  return clamp((x - lo) / (hi - lo), 0, 1);
}

type Band = readonly [lo: number, hi: number];

/** Where each gate on an amount fades in: 0 at or below the low end, 1 at or above the high end.
    Each band sits on the line the gate used to be a hard step at, narrow enough that brews well
    inside or outside it score as before and wide enough that 0.5 ml never jumps the score. A few
    end exactly where a classic sits, so the classic keeps its full shape; those say which. Shares
    are of the liquid volume, flavour weights are of the whole profile. */
const BAND = {
  /** Alcohol share that makes a base, as 40% spirit (was a step at 0.2; full by 0.205 for a Pimm's Cup at 0.208). */
  base: [0.16, 0.205],
  /** Sparkling wine share that makes a base, or a sparkling drink (was 0.4). */
  sparkling: [0.35, 0.45],
  /** Long mixer share that makes a long drink (was 0.5; full at 0.5 for an Americano and a Mimosa). */
  long: [0.43, 0.5],
  /** Sweet weight that is far too sweet (was 0.45), unless the sour and bitter weight passes 0.1. The
      counterweight bands are a little wider than the rest, as a sour and bitter weight moves fast. */
  verySweet: [0.42, 0.48],
  verySweetSharp: [0.07, 0.13],
  /** Sweet weight that leans too sweet (was 0.32; starts just above a Grasshopper at 0.316), unless
      the sour and bitter weight passes 0.08. */
  sweet: [0.317, 0.35],
  sweetSharp: [0.05, 0.11],
  /** Sour weight that is too sour (was 0.5), unless the sweet or the bitter weight passes 0.1. */
  sour: [0.47, 0.53],
  sourSweet: [0.07, 0.13],
  sourBitter: [0.07, 0.13],
  /** Creamy weight that counts as real cream (was 0.10). */
  creamy: [0.04, 0.16],
  /** Sour and citrus weight of the liquid that curdles dairy (was a step at 0.05, counting garnish). */
  tang: [0.01, 0.11],
  /** Share of acid juice that always curdles dairy, however long the drink (was a ramp from 0.02 to 0.08). */
  acid: [0.01, 0.11],
  /** Sour and citrus weight, beyond mild fruit juice, that sours coconut cream (was 0.05). */
  sharpAcid: [0, 0.1],
  /** Sour and citrus weight that turns coffee harsh, from juice or a bitter orange liqueur alike (was 0.05). */
  coffeeAcid: [0, 0.12],
  /** Dairy share that always curdles with acid, however long the drink (was a ramp from 0.02 to 0.08). */
  dairyPour: [0, 0.08],
  /** Fizz share that splits cream (was 0.4). */
  fizz: [0.35, 0.45],
  /** Coffee weight that acid turns harsh (was 0.1). */
  coffee: [0.04, 0.16],
  /** A dessert drink: creamy weight (was 0.15; full by 0.155 for a Grasshopper at 0.158) and no more
      than a trace of sharpness (was 0.04). */
  dessertCream: [0.12, 0.155],
  dessertSharp: [0, 0.12],
  /** A highball: alcohol share (was 0.15; a Mimosa sits right on it and is still more highball than
      not), and long mixer as a share of mixer plus alcohol (was at least 1.2 ml per ml of alcohol, 0.545). */
  highballBooze: [0.12, 0.17],
  highballLong: [0.524, 0.565],
  /** A spirit-forward drink: alcohol share (was 0.5; full by 0.52 for an Espresso Martini at 0.526),
      base spirit share (was 0.3; full by 0.333 for a Negroni at 0.333) and sharpness (was 0.1). */
  stirredBooze: [0.45, 0.52],
  stirredSpirit: [0.245, 0.333],
  stirredSharp: [0.08, 0.12],
  /** A sour: acid juice share, at least (was 0.08) and at most (was 0.6). */
  sourAcid: [0.06, 0.1],
  sourAcidMax: [0.575, 0.625],
} satisfies Record<string, Band>;

type BandName = keyof typeof BAND;

/** The bands on a share of the liquid volume, and the end of each that stays put when a small pot
    widens it: the end the classics sit past, so a recipe halved scores as the whole one, and a brew
    on the safe side of a penalty stays safe at any size. Every other band is a flavour weight, which
    no pot size changes. */
const VOLUME: Partial<Record<BandName, 'lo' | 'hi'>> = {
  base: 'hi', sparkling: 'hi', long: 'hi', highballBooze: 'hi', highballLong: 'hi', stirredBooze: 'hi',
  stirredSpirit: 'hi', sourAcid: 'hi', sourAcidMax: 'lo', acid: 'lo', dairyPour: 'lo', fizz: 'lo',
};

/** A share is only as fine as the pot is big: in a 30 ml pot 0.5 ml moves it by nearly 2%. Every volume
    band is at least as wide as the share twice this much liquid makes, so small pots fade as gently as
    full ones. */
const BLUR_ML = 1.5;
/** Some bands span more liquid. Dairy and acid carry the biggest stakes, the curdle and the shape it
    spoils. On the alcohol shares a 68% absinthe moves twice as fast as a 40% spirit, and the base
    carries its own points and a sour's shape as well. */
const CURDLE_BLUR_ML = 3;
const WIDE_BLUR: Partial<Record<BandName, number>> = {
  acid: CURDLE_BLUR_ML, dairyPour: CURDLE_BLUR_ML, base: 2, highballBooze: 2, stirredBooze: 2,
};
/** Below this the pot is treated as this big, so a few ml mixed in the right proportions still score
    as the drink they make. */
const MIN_POT = 20;

/** How far `x` is into a band, 0..1, the band widened to at least `2 * blur` by moving its free end. */
function fadeIn(x: number, [lo, hi]: Band, blur: number, keep: 'lo' | 'hi'): number {
  const width = Math.max(hi - lo, 2 * blur);
  // never below zero, so a gate that starts above none of something stays shut with none of it
  return keep === 'lo' ? ramp(x, lo, lo + width) : ramp(x, Math.max(hi - width, Math.min(lo, 0)), hi);
}

/** How far a Ramos-style emulsion holds the cream against the acid, 0..1. It is a Ramos, not a
    universal rescue: gin topped with plain soda, a real pour of cream or milk (not Irish cream)
    with egg white in proportion (about two parts to three), a real syrup and a modest dairy share.
    Every condition fades in on its own ramp. */
function emulsion(shape: Shape): number {
  if (shape.dairy <= 0 || shape.liquid <= 0) return 0;
  const egg = ramp(shape.eggWhite / shape.dairy, EMULSION_EGG_LO, EMULSION_EGG_HI);
  const sugar = ramp(shape.syrup / shape.liquid, 0.01, 0.06);
  const modest = 1 - ramp(shape.dairy / shape.liquid, 0.2, 0.28);
  const pure = ramp(shape.richDairy / shape.dairy, 0.85, 1);
  const pour = ramp(shape.dairy, 4, 16);
  const base = ramp(shape.gin / Math.max(shape.spirit, 1e-9), 0.85, 1);
  const top = ramp(shape.soda / shape.liquid, 0.04, 0.1) * ramp(shape.soda / Math.max(shape.fizz, 1e-9), 0.85, 1);
  return egg * sugar * modest * pure * pour * base * top;
}

/** Signed sweet versus sour+bitter lean of a raw profile. */
function lean(F: Profile): number | null {
  const sw = F.sweet ?? 0, so = F.sour ?? 0, bi = F.bitter ?? 0;
  const sum = sw + so + bi;
  return sum > 0 ? (sw - (so + bi)) / sum : null;
}

export function harmony(brew: BrewEntry[]): Harmony | null {
  if (!brew.length) return null;
  const { F, tot } = profile(brew);
  const n = brew.length;
  if (tot <= 0) {
    // only flavourless items (soda, salt, ice)
    return {
      score: 42, tier: tierFor(42), p: {}, F, tot,
      parts: { ...NO_PARTS, base: 42 }, balance: null, archetype: null, curdle: 0, coffeeAcid: 0,
    };
  }
  const dims = Object.keys(F) as FlavorDim[];
  const p: Profile = {};
  for (const d of dims) p[d] = (F[d] ?? 0) / tot;
  const parts: Parts = { ...NO_PARTS, base: 55 };

  let pair = 0;
  for (let i = 0; i < dims.length; i++)
    for (let j = i + 1; j < dims.length; j++)
      pair += aff(dims[i], dims[j]) * (p[dims[i]] ?? 0) * (p[dims[j]] ?? 0);

  let score = 55 + pair * 80;
  parts.pairing = pair * 80;

  const sw = F.sweet ?? 0, so = F.sour ?? 0, bi = F.bitter ?? 0;
  if (sw > 0 && (so > 0 || bi > 0)) {
    const bal = 1 - Math.abs(sw - (so + bi)) / (sw + so + bi);
    score += bal * 10;
    parts.balance = bal * 10;
  }

  const shape = shapeOf(brew);
  const share = (ml: number) => (shape.liquid > 0 ? ml / shape.liquid : 0);
  const sBooze = share(shape.booze);
  const pot = Math.max(shape.liquid, MIN_POT);
  /** How far a share of the liquid is into its band; the band widens in a small pot. */
  const fade = (x: number, b: BandName) =>
    fadeIn(x, BAND[b], (WIDE_BLUR[b] ?? BLUR_ML) / pot, VOLUME[b] ?? 'lo');
  /** How far a flavour weight is into its band: the same at any pot size. */
  const fadeF = (x: number, b: BandName) => ramp(x, BAND[b][0], BAND[b][1]);
  // A base is real alcohol (a hard liqueur counts, a splash of vermouth does not) or sparkling wine.
  // Every gate on an amount fades in across a narrow band (see BAND), so 0.5 ml never jumps the score.
  const baseW = Math.max(fade(sBooze, 'base'), fade(share(shape.sparkling), 'sparkling'));
  const hasBalancer = so > 0 || bi > 0;
  const firm = baseW * (hasBalancer ? 9 : 5);
  score += firm; parts.structure += firm;

  // A long drink dilutes its sweetness, so a long mixer is not "too sweet" the way a syrup is.
  const longW = shape.booze > 0 ? fade(share(shape.long), 'long') : 0;

  // too sweet / too sour without a counterweight, each in proportion to how far past its line it is
  const psw = sw / tot, pso = so / tot, pbi = bi / tot;
  const verySweet = fadeF(psw, 'verySweet') * (1 - fadeF(pso + pbi, 'verySweetSharp'));
  const sweet = fadeF(psw, 'sweet') * (1 - fadeF(pso + pbi, 'sweetSharp'));
  const tart = fadeF(pso, 'sour') * (1 - fadeF(psw, 'sourSweet')) * (1 - fadeF(pbi, 'sourBitter'));
  const lopsided = (1 - longW) * Math.max(14 * verySweet, 8 * sweet) + 12 * tart;
  score -= lopsided; parts.sweetSour = -lopsided;
  /** 1 for a brew with no sweet or sour fault, 0 for a full one. */
  const even = 1 - Math.max((1 - longW) * Math.max(verySweet, sweet), tart);

  // one-note (dominated by a single dimension)
  let sumsq = 0;
  for (const d of dims) sumsq += (p[d] ?? 0) ** 2;
  if (sumsq > 0.55) { score -= (sumsq - 0.55) * 34; parts.oneNote = -(sumsq - 0.55) * 34; }

  // structural clashes (curdling / muddy pairings) beyond pairwise affinity.
  // The flavour-share checks below fade in with meaningful cream (about p 0.10) so egg-white sours and
  // coconut pass. They fade as a drink is topped up, so dairy is also judged by volume: a real
  // pour of cream or milk curdles with acid no matter how much mixer sits on top of it.
  const pc = (F.creamy ?? 0) / tot;
  const pcd = shape.dairyCreamy / tot;
  const pacid = ((F.sour ?? 0) + (F.citrus ?? 0)) / tot;
  const psmk = (F.smoky ?? 0) / tot;
  const pcof = (F.coffee ?? 0) / tot;
  let clash = 0;
  // 0 when egg white, sugar and a long hard shake keep the cream whole (a Ramos), 1 otherwise
  const held = 1 - emulsion(shape);
  // Dairy curdles with acid in the liquid; a garnish slice or a dash of bitters brings a citrus note but
  // too little acid to split anything. Tang is a flavour weight, but the curdle bands widen in a small
  // pot like a volume share, since the curdle and the shape it spoils are the biggest stakes there are.
  const ptang = shape.tang / tot;
  const tangW = fadeIn(ptang, BAND.tang, CURDLE_BLUR_ML / pot, 'lo');
  const acidW = fade(share(shape.acid), 'acid');
  let creamClash = fadeF(pc, 'creamy') * Math.min(pc, psmk) * 0.7; // cream + smoke: muddy
  // the same clash with no acid in the pot, so the cost of the curdle alone can be told apart
  let dryClash = creamClash;
  // coconut cream holds up against a mild fruit sour (a Piña Colada) and only sours with sharp acid
  const pcc = shape.coconutCreamy / tot;
  const psharp = Math.max(0, (F.sour ?? 0) + (F.citrus ?? 0) - shape.mildAcid) / tot;
  creamClash += fadeF(pcc, 'creamy') * (Math.min(pcc, psharp) + fadeF(psharp, 'sharpAcid') * CURDLE);
  const dairyFlavour = fadeF(pcd, 'creamy');
  if (dairyFlavour > 0) {
    // dairy + acid curdles (any real acid, however little), and cream in a big fizzy pour splits and foams
    const split = fade(share(shape.fizz), 'fizz') * CURDLE;
    const curdle = Math.min(pcd, ptang) + tangW * CURDLE + split;
    creamClash += dairyFlavour * curdle * held;
    dryClash += dairyFlavour * split * held;
  }
  const dairyW = fade(share(shape.dairy), 'dairyPour');
  if (dairyW > 0) {
    const fizzW = ramp(share(shape.fizz), 0.3, 0.5);
    creamClash = Math.max(creamClash, dairyW * (acidW * CURDLE_FLOOR + fizzW * CURDLE) * held);
    dryClash = Math.max(dryClash, dairyW * fizzW * CURDLE * held);
  }
  // what the acid alone costs the cream, never below none
  const curdleClash = Math.max(0, creamClash - dryClash);
  clash += creamClash;
  // coffee + citrus/acid (added in two steps, as the score always has, so no rounding moves)
  const coffeeAcidPlain = Math.min(pcof, pacid) * 0.8;
  const coffeeAcidFade = fadeF(pcof, 'coffee') * fadeF(pacid, 'coffeeAcid') * CURDLE * 0.8;
  clash += coffeeAcidPlain;
  clash += coffeeAcidFade;
  score -= clash * 95;
  parts.clash = -clash * 95;

  // Classic shapes. Each needs a clean brew (no clash, nothing too sweet or sour) and at most
  // three strong ingredients. Bonuses go in `structure`; a brew with no shape at all loses points there.
  // Each shape is a membership, the product of its fades; the best one sets how shaped the brew is.
  let archetype: Archetype | null = null;
  // A whisper of clash only dims the shape, so the score has no step where a clash ramps to nothing.
  const shapeW = 1 - ramp(clash, 0, SHAPE_CLASH);
  const clean = shapeW * even * (shape.strong <= 3 && shape.spirits <= 2 ? 1 : 0);
  let shaped = 0;
  if (clean > 0 && shape.liquid > 0 && n > 1) {
    const sharpAll = pso + (F.citrus ?? 0) / tot;
    const sAcid = share(shape.acid);
    const cands: [Archetype, number, number][] = [
      ['highball', 5, longW * fade(sBooze, 'highballBooze') * fade(shape.long / Math.max(shape.long + shape.booze, 1e-9), 'highballLong')],
      ['sour', 0, shape.sweetSrc ? fade(sBooze, 'base') * fade(sAcid, 'sourAcid') * (1 - fade(sAcid, 'sourAcidMax')) : 0],
      ['sparkling', 0, shape.tagged > 1 ? fade(share(shape.sparkling), 'sparkling') : 0],
      ['dessert', 8, shape.hasLiqueur && shape.cream > 0 ? fadeF(pc, 'dessertCream') * (1 - fadeF(sharpAll, 'dessertSharp')) : 0],
      ['spirit-forward', 5 + (shape.sweetMod ? 2 : 0), shape.tagged > 1 && shape.dryMod
        ? fade(sBooze, 'stirredBooze') * fade(share(shape.spirit), 'stirredSpirit') * (1 - fadeF(sharpAll, 'stirredSharp')) : 0],
    ];
    // highest bonus first; on a tie the earlier shape wins, as the label always has
    cands.sort((x, y) => y[1] - x[1]);
    let best = 0, bonusW = 0, ahead = 1;
    /** The shape that pays the bonus, and the first one the brew is at least half of. */
    let payer: [Archetype, number] | null = null, half: Archetype | null = null;
    // The bonus covers what the pairwise terms miss, so it tapers off as they already credit the brew.
    const taper = clamp((TAPER_END - score) / (TAPER_END - TAPER_START), 0, 1);
    for (const [type, bonus, m] of cands) {
      best = Math.max(best, m);
      if (m * bonus > bonusW) { bonusW = m * bonus; payer = [type, m]; }
      if (!half && m * clean >= 0.5) half = type;
      // spirit-forward relief counts only as far as no higher-bonus shape claims the brew
      if (type === 'spirit-forward' && m > 0) {
        const relief = -parts.oneNote * 0.6 * clean * m * ahead;
        score += relief;
        parts.oneNote += relief;
      }
      ahead *= 1 - m;
    }
    // The label names the shape that pays the bonus when the brew is at least half that shape. A shape
    // it is less than half of can still pay a little; then the label falls to the first shape it is
    // half of, as before (a full sour with a third of a spirit-forward drink reads as a sour).
    archetype = payer && payer[1] * clean >= 0.5 ? payer[0] : half;
    shaped = clean * best;
    const lift = clean * bonusW * taper;
    score += lift;
    parts.structure += lift;
  }
  if (n > 1 && shaped < 1) {
    // no recognisable shape; the more things thrown in, the muddier it gets
    const pen = (1 - shaped) * (SHAPELESS + 3 * Math.max(0, n - 3));
    score -= pen; parts.structure -= pen;
  }

  // crowd / lonely
  if (n > 6) { score -= (n - 6) * 4; parts.crowd -= (n - 6) * 4; }
  if (n === 1) {
    // one ingredient is a pour, not a cocktail: neat spirits stay presentable, the rest do not
    // a lone pour's alcohol share is its strength over 40%, the same at any amount (the tolerance keeps
    // a 16% liqueur, exactly on the line, from flickering with the rounding of its share)
    const cap = shape.booze > 0 && sBooze >= 0.4 - 1e-9 ? LONE_SPIRIT_CAP : LONE_CAP;
    const pen = Math.max(6, score - cap);
    score -= pen; parts.crowd -= pen;
  }

  const final = clamp(Math.round(score), 3, 99);
  return { score: final, tier: tierFor(final), p, F, tot, parts, balance: lean(F), archetype, curdle: curdleClash * 95, coffeeAcid: (coffeeAcidPlain + coffeeAcidFade) * 95 };
}

/** Fit of a candidate ingredient against the current mix profile → 0..1. */
export function fit(ing: Ingredient, p: Profile | null): number | null {
  if (!p || Object.keys(p).length === 0) return null;
  let ct = 0;
  const c: Profile = {};
  for (const d in ing.tags) {
    const dim = d as FlavorDim;
    c[dim] = ing.tags[dim] ?? 0;
    ct += ing.tags[dim] ?? 0;
  }
  if (ct === 0) return 0.5; // flavourless → neutral
  for (const d in c) c[d as FlavorDim] = (c[d as FlavorDim] ?? 0) / ct;
  let s = 0;
  for (const dm in p)
    for (const dc in c)
      s += aff(dm, dc) * (p[dm as FlavorDim] ?? 0) * (c[dc as FlavorDim] ?? 0);
  return clamp((s + 0.3) / 0.8, 0, 1);
}

export interface Suggestion {
  text: string;
  kind: '' | 'good' | 'warn' | 'bad';
}

export function suggestions(h: Harmony | null, brew: BrewEntry[]): Suggestion[] {
  if (!brew.length || !h)
    return [{ text: 'Add an ingredient to start your brew.', kind: '' }];
  const F = h.F, tot = h.tot || 1;
  const out: Suggestion[] = [];
  const p = (d: FlavorDim) => (F[d] ?? 0) / tot;
  const has = (d: FlavorDim) => (F[d] ?? 0) > 0;
  const n = brew.length;

  if (!has('boozy') && brew.some((e) => ING_BY_ID[e.id]?.abv === 0))
    out.push({ text: 'No base spirit yet. Add one for backbone, or keep it a mocktail.', kind: 'warn' });
  if (p('sweet') > 0.32 && p('sour') + p('bitter') < 0.1)
    out.push({ text: 'Leans sweet. A splash of citrus or bitters would balance it.', kind: 'warn' });
  if (p('sour') > 0.45 && p('sweet') < 0.1)
    out.push({ text: 'Very sharp. A little syrup would soften it.', kind: 'warn' });
  if (p('bitter') > 0.4 && p('sweet') < 0.08)
    out.push({ text: 'Quite bitter. A touch of sweetness would round it out.', kind: 'warn' });
  // the engine's own curdle, so the tip shows exactly when the score pays for one
  if (curdles(h)) {
    const sides = curdleSides(brew);
    out.push({
      text: sides
        ? `The ${said(sides.dairy)} splits against the ${said(sides.acid)}. Pick one or the other.`
        : 'Cream and acid split in the pot. Pick one or the other.',
      kind: 'bad',
    });
  }
  // coffee turned harsh by acid, named like the tasting note names it
  const roast = coffeeAcidClashes(h) ? coffeeAcidSides(brew, h) : null;
  if (roast)
    out.push({
      text: `The ${said(roast.acid)} turns the ${said(roast.coffee)} sour and harsh. Pick one or the other.`,
      kind: 'bad',
    });
  if (n === 1)
    out.push({ text: 'Add a modifier like citrus, something sweet or bitters to make it a cocktail.', kind: '' });
  if (n > 7)
    out.push({ text: 'That is a lot of ingredients. Try removing one or two for clarity.', kind: 'warn' });

  // praise only a brew that earns it, and never next to a warning: a curdle or a harsh coffee leads instead.
  // With nothing to warn about, a weaker brew gets a plain line instead.
  if (h.score >= 80 && !out.some((s) => s.kind === 'bad'))
    out.unshift({
      text: h.score >= 90
        ? 'A masterpiece. Pour it and take a bow.'
        : 'Beautifully balanced and ready to pour.',
      kind: 'good',
    });
  else if (!out.length)
    out.push(h.score >= 70
      ? { text: 'A good brew with room to grow.', kind: '' }
      : h.score >= 56
        ? { text: 'Drinkable, but it does not quite come together yet.', kind: 'warn' }
        : { text: 'The flavours fight each other, so nothing here comes together.', kind: 'bad' });

  return out.slice(0, 3);
}

/** Points the cream splitting against acid must cost before the brew counts as curdled: the tip warns
    about it, the tasting note names it and the coach offers no more dairy. A trace of juice or a garnish
    slice costs a point or two and counts as nothing. */
const CURDLE_NOTICE = 5;

/** True when the brew pays a real curdle: cream or milk against acid, or coconut cream against sharp acid. */
export function curdles(h: Harmony): boolean {
  return h.curdle >= CURDLE_NOTICE;
}

/** Points the coffee meeting acid must cost before the tip warns about it and the tasting note names it. */
const COFFEE_ACID_NOTICE = 5;

/** True when the brew pays a real coffee and acid clash (espresso or coffee liqueur against juice). */
export function coffeeAcidClashes(h: Harmony): boolean {
  return h.coffeeAcid >= COFFEE_ACID_NOTICE;
}

/** The biggest pour matching `test` (by `size`, ml unless told otherwise), or null. */
function biggest(brew: BrewEntry[], test: (ing: Ingredient) => boolean, size = (_: Ingredient, ml: number) => ml): Ingredient | null {
  let best: { ing: Ingredient; size: number } | null = null;
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (!ing || e.ml <= 0 || !test(ing)) continue;
    const sz = size(ing, e.ml);
    if (!best || sz > best.size) best = { ing, size: sz };
  }
  return best ? best.ing : null;
}

const tagOf = (ing: Ingredient, d: FlavorDim) => ing.tags[d] ?? 0;
const isAcid = (ing: Ingredient) =>
  (ing.group === 'Juices' && (tagOf(ing, 'sour') >= 1 || tagOf(ing, 'citrus') >= 1)) || tagOf(ing, 'sour') >= 2;
/** The scoring curdles dairy with any sour or citrus liquid, a citrus liqueur too. */
const isTangy = (ing: Ingredient) => !ing.unit && tagOf(ing, 'sour') + tagOf(ing, 'citrus') > 0;

/** An ingredient set inside a sentence; cream reads "cream", not "heavy cream". */
export const said = (ing: Ingredient) => (ing.id === 'heavy_cream' ? 'cream' : inlineName(ing.name));

/** The dairy and the acid that split, for a brew that curdles (check `curdles(h)` first): cream or milk
    against the biggest acid, or failing that any sour or citrus liquid; coconut cream against sharp acid.
    Null when the pot holds no such pair to name. */
export function curdleSides(brew: BrewEntry[]): { dairy: Ingredient; acid: Ingredient } | null {
  const dairy = biggest(brew, (i) => DAIRY.has(i.id));
  const acid = biggest(brew, (i) => isAcid(i) && i.id !== 'coconut_cream')
    ?? biggest(brew, (i) => isTangy(i) && i.id !== 'coconut_cream');
  if (dairy && acid) return { dairy, acid };
  const coconut = biggest(brew, (i) => i.id === 'coconut_cream');
  // what the score counts as sharp for coconut cream: sour or citrus weight that is not a mild fruit juice
  // (lemon or lime, but also the tonic, wine or liqueur), named by how much of it the pot holds
  const sharp = biggest(
    brew,
    (i) => tagOf(i, 'sour') + tagOf(i, 'citrus') > 0 && !(i.group === 'Juices' && tagOf(i, 'sour') < 2) && i.id !== 'coconut_cream',
    (i, ml) => (tagOf(i, 'sour') + tagOf(i, 'citrus')) * ml,
  );
  return coconut && sharp ? { dairy: coconut, acid: sharp } : null;
}

/** The coffee and the acid that clash, or null when the pot holds no such pair. A juice or sharp mixer is
    named first; a pot that pays a real clash (check `coffeeAcidClashes(h)`) with only a citrus liqueur,
    sparkling wine, soda or a slice for acid names the one that carries the most sour and citrus. */
export function coffeeAcidSides(brew: BrewEntry[], h: Harmony): { coffee: Ingredient; acid: Ingredient } | null {
  const coffee = biggest(brew, (i) => tagOf(i, 'coffee') >= 1);
  if (!coffee) return null;
  const acid = biggest(brew, (i) => isAcid(i) && i.id !== 'coconut_cream')
    ?? (coffeeAcidClashes(h)
      ? biggest(brew, (i) => i !== coffee && tagOf(i, 'sour') + tagOf(i, 'citrus') > 0 && i.id !== 'coconut_cream', (i, ml) => (tagOf(i, 'sour') + tagOf(i, 'citrus')) * ml)
      : null);
  return acid ? { coffee, acid } : null;
}

/** A brew that clashes hard or scores below this is not "close to" any classic, whatever its volumes
    say, and its tasting note names the fault instead of praising it. A full curdle, or cream split in
    fizz, always clashes this hard, however much of its shape survives the clash. */
const POOR_SCORE = 40;
const POOR_CLASH = -CURDLE * 95;

export function isPoorBrew(h: Harmony): boolean {
  // the tolerance keeps a clash of exactly one full curdle from missing by a rounding error
  return h.parts.clash <= POOR_CLASH + 1e-6 || h.score < POOR_SCORE;
}

/** Closest classic recipe by cosine similarity over ingredient volumes. A clashing or poorly
    scoring brew resembles nothing, so the serve card, the UI and the coach all agree. */
export function resemblance(brew: BrewEntry[]): { recipe: Recipe; sim: number } | null {
  if (brew.length < 2) return null;
  const h = harmony(brew);
  if (!h || isPoorBrew(h)) return null;
  const mine = new Map(brew.map((e) => [e.id, e.ml]));
  let best: { recipe: Recipe; sim: number } | null = null;
  for (const r of RECIPES) {
    let dot = 0, ra = 0, rb = 0;
    const theirs = new Map(r.build);
    for (const [, ml] of mine) ra += ml * ml;
    for (const [, ml] of theirs) rb += ml * ml;
    for (const [id, ml] of mine) {
      const t = theirs.get(id);
      if (t) dot += ml * t;
    }
    const sim = dot / (Math.sqrt(ra) * Math.sqrt(rb) || 1);
    if (!best || sim > best.sim) best = { recipe: r, sim };
  }
  return best && best.sim >= 0.85 ? best : null;
}

/** Top three flavour notes of an ingredient (value 1 or more), strongest first. */
export function flavorNotes(ing: Ingredient): FlavorDim[] {
  return (Object.keys(ing.tags) as FlavorDim[])
    .sort((a, b) => (ing.tags[b] ?? 0) - (ing.tags[a] ?? 0))
    .slice(0, 3)
    .filter((d) => (ing.tags[d] ?? 0) >= 1);
}

/** Short flavour blurb for an ingredient ("Boozy, smoky and herbal"). */
export function describe(ing: Ingredient): string {
  const notes = flavorNotes(ing);
  if (!notes.length) return 'Neutral';
  const text = notes.length > 1
    ? `${notes.slice(0, -1).join(', ')} and ${notes[notes.length - 1]}`
    : notes[0];
  return text.charAt(0).toUpperCase() + text.slice(1);
}
