/* Pure helpers for the shelf: search, flavour notes, score-delta wording. */
import type { Ingredient } from '../../data/types';
import { FLAVOR_DIMS } from '../../data/types';
import type { Delta } from '../../lib/coach';

/** Lowercase and strip diacritics so "cachaca" finds Cachaça. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'").toLowerCase();
}

/** Flavour notes for an ingredient, strongest first (at most `n`). */
export function flavourNotes(ing: Ingredient, n = 3): string[] {
  return FLAVOR_DIMS
    .map((dim, i) => ({ dim, w: ing.tags[dim] ?? 0, i }))
    .filter((t) => t.w > 0)
    .sort((a, b) => b.w - a.w || a.i - b.i)
    .slice(0, n)
    .map((t) => t.dim);
}

/** Search every ingredient by name, then flavour notes and group. Name matches rank first. */
export function searchIngredients(all: readonly Ingredient[], query: string): Ingredient[] {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const scored: { ing: Ingredient; rank: number; i: number }[] = [];
  all.forEach((ing, i) => {
    const name = fold(ing.name);
    const words = name.split(/[\s-]+/);
    const notes = FLAVOR_DIMS.filter((d) => (ing.tags[d] ?? 0) > 0);
    const group = fold(ing.group);
    let rank = 0;
    for (const t of tokens) {
      let r: number;
      if (name.startsWith(t)) r = 0;
      else if (words.some((w) => w.startsWith(t))) r = 1;
      else if (name.includes(t)) r = 2;
      else if (notes.some((d) => d.startsWith(t))) r = 3;
      else if (group.startsWith(t)) r = 5;
      else return;
      rank += r;
    }
    scored.push({ ing, rank, i });
  });
  return scored.sort((a, b) => a.rank - b.rank || a.i - b.i).map((s) => s.ing);
}

export type Indicator =
  | { kind: 'raise'; delta: number }
  | { kind: 'clash'; delta: number }
  | { kind: 'none' };

/** The one quiet marker a bottle may carry on its shoulder. A red dot means a real flavour
    clash only; a big score drop from simply unbalancing the brew does not earn one. */
export function indicatorFor(d: Delta | undefined): Indicator {
  if (!d) return { kind: 'none' };
  if (d.clash === true) return { kind: 'clash', delta: d.delta };
  if (d.delta >= 2) return { kind: 'raise', delta: d.delta };
  return { kind: 'none' };
}

/** The delta in plain words, for the tooltip and screen readers. Null when there is no brew. */
export function deltaWords(d: Delta | undefined): string | null {
  if (!d) return null;
  const { delta } = d;
  if (d.clash === true) return delta < 0
    ? `Clashes with the brew (curdles or muddies it), ${delta}`
    : 'Clashes with the brew (curdles or muddies it)';
  if (delta >= 2) return `Raises the score by ${delta}`;
  if (delta === 1) return 'Raises the score slightly';
  if (delta === 0) return 'Leaves the score unchanged';
  if (delta > -8) return 'Lowers the score slightly';
  return `Lowers the score by ${Math.abs(delta)}`;
}

export function sentence(words: string[]): string {
  const s = words.join(', ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
