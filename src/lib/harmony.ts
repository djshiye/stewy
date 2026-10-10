/* The harmony engine: a 15-dimension flavour-affinity model that scores a
   brew 0 to 100, explains itself, and rates how well each shelf reagent would
   fit the current mix. Pure functions, no DOM. */
import type { BrewEntry, FlavorDim, Ingredient, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { clamp } from './color';

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
  legendary: 'Legendary Elixir', great: 'Masterful Brew', good: 'A Fine Potion',
  ok: 'Drinkable Draught', poor: 'Murky Concoction', bad: 'Cursed Sludge',
  none: 'Awaiting reagents',
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
      parts: { ...NO_PARTS, base: 42 }, balance: null,
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

  const hasBase = (F.boozy ?? 0) > 0;
  const hasBalancer = so > 0 || bi > 0;
  if (hasBase) { score += 5; parts.structure += 5; }
  if (hasBase && hasBalancer) { score += 4; parts.structure += 4; }

  // too sweet / too sour without a counterweight
  const psw = sw / tot, pso = so / tot, pbi = bi / tot;
  if (psw > 0.45 && pso + pbi < 0.1) { score -= 14; parts.sweetSour -= 14; }
  else if (psw > 0.32 && pso + pbi < 0.08) { score -= 8; parts.sweetSour -= 8; }
  if (pso > 0.5 && psw < 0.1 && pbi < 0.1) { score -= 12; parts.sweetSour -= 12; }

  // one-note (dominated by a single dimension)
  let sumsq = 0;
  for (const d of dims) sumsq += (p[d] ?? 0) ** 2;
  if (sumsq > 0.55) { score -= (sumsq - 0.55) * 34; parts.oneNote = -(sumsq - 0.55) * 34; }

  // structural clashes (curdling / muddy pairings) beyond pairwise affinity.
  // Gated on meaningful cream (p>0.10) so egg-white sours & coconut pass.
  const pc = (F.creamy ?? 0) / tot;
  const pacid = ((F.sour ?? 0) + (F.citrus ?? 0)) / tot;
  const psmk = (F.smoky ?? 0) / tot;
  const pcof = (F.coffee ?? 0) / tot;
  let clash = 0;
  if (pc > 0.10) {
    clash += Math.min(pc, pacid);        // cream + acid: curdle
    clash += Math.min(pc, psmk) * 0.7;   // cream + smoke: muddy
  }
  clash += Math.min(pcof, pacid) * 0.8;  // coffee + citrus/acid
  score -= clash * 95;
  parts.clash = -clash * 95;

  // crowd / lonely
  if (n > 6) { score -= (n - 6) * 4; parts.crowd -= (n - 6) * 4; }
  if (n === 1) { score -= 6; parts.crowd -= 6; }

  const final = clamp(Math.round(score), 3, 99);
  return { score: final, tier: tierFor(final), p, F, tot, parts, balance: lean(F) };
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
    return [{ text: 'Add an ingredient to start your drink.', kind: '' }];
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
  if (has('creamy') && (has('citrus') || has('sour')) && (F.creamy ?? 0) > tot * 0.12)
    out.push({ text: 'Cream and citrus can curdle. Pick one or the other.', kind: 'bad' });
  if (n === 1)
    out.push({ text: 'Add a modifier like citrus, something sweet or bitters to make it a cocktail.', kind: '' });
  if (n > 7)
    out.push({ text: 'That is a lot of ingredients. Try removing one or two for clarity.', kind: 'warn' });

  if (!out.length || h.score >= 80)
    out.unshift({
      text: h.score >= 90
        ? 'A masterpiece. Pour it and take a bow.'
        : 'Beautifully balanced and ready to pour.',
      kind: 'good',
    });

  return out.slice(0, 3);
}

/** Closest classic recipe by cosine similarity over ingredient volumes. */
export function resemblance(brew: BrewEntry[]): { recipe: Recipe; sim: number } | null {
  if (brew.length < 2) return null;
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
