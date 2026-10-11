/* Measure units + count-based (dash / piece) handling. */
import type { BrewEntry, Ingredient } from '../data/types';

export interface UnitDef {
  label: string;
  toMl: number;
  step: number;
  dec: number;
  chips: number[];
}

export const UNITS = {
  ml:    { label: 'ml',    toMl: 1,  step: 5,    dec: 0, chips: [15, 22, 30, 45, 60, 90] },
  cl:    { label: 'cl',    toMl: 10, step: 0.5,  dec: 1, chips: [1, 1.5, 3, 4.5, 6, 9] },
  oz:    { label: 'oz',    toMl: 30, step: 0.25, dec: 2, chips: [0.5, 0.75, 1, 1.5, 2, 3] },
  parts: { label: 'parts', toMl: 30, step: 0.5,  dec: 1, chips: [0.5, 1, 1.5, 2, 3] },
} as const satisfies Record<string, UnitDef>;

export type UnitKey = keyof typeof UNITS;
export const UNIT_ORDER: UnitKey[] = ['ml', 'cl', 'oz', 'parts'];

/** ml per single piece / dash for count-based ingredients. */
export const PER: Record<string, number> = {
  angostura: 0.9, orange_bitters: 0.9, peychauds: 0.9, mint: 1, cucumber: 2,
  sugar_cube: 4, salt: 1, cherry: 3, orange_slice: 3, olive: 3,
};
export const NOUN: Record<string, string> = {
  angostura: 'dash', orange_bitters: 'dash', peychauds: 'dash', mint: 'leaf', cucumber: 'slice',
  sugar_cube: 'cube', salt: 'rim', cherry: 'cherry', orange_slice: 'slice', olive: 'olive',
};

export const isCounted = (ing: Ingredient) => ing.unit === 'dash' || ing.unit === 'piece';

/** ml per piece for a counted ingredient; ingredients not listed in PER fall back by unit. */
export const perPiece = (ing: Ingredient) => PER[ing.id] ?? (ing.unit === 'dash' ? 0.9 : 1);

/** Singular noun for a counted ingredient ("dash", "leaf"). */
export const nounOf = (ing: Ingredient) => NOUN[ing.id] ?? (ing.unit === 'dash' ? 'dash' : 'piece');

/** Format a number to `dec` decimals with trailing zeros trimmed. */
export function trim(v: number, dec: number): string {
  const n = parseFloat(v.toFixed(dec));
  return Number.isNaN(n) ? '0' : String(n);
}

/** Label for the total volume: ml, cl or oz, or whole-and-fractional parts (30 ml each). */
export function totalLabel(totalMl: number, unit: UnitKey): string {
  if (unit === 'ml') return `${Math.round(totalMl)} ml`;
  return measure(totalMl, unit);
}

/** A volume in a unit ("1.5 oz", "1 part"); a sliver below the unit's precision reads "<0.01 oz", not "0 oz". */
function measure(ml: number, unit: UnitKey): string {
  const u = UNITS[unit];
  const v = trim(ml / u.toMl, u.dec);
  if (ml > 0 && parseFloat(v) === 0) return `<${trim(10 ** -u.dec, u.dec)} ${u.label}`;
  return `${v} ${unit === 'parts' && v === '1' ? 'part' : u.label}`;
}

/** Plural of a count noun ("dash" to "dashes", "cherry" to "cherries"). */
export function plural(noun: string, n: number): string {
  if (n === 1) return noun;
  if (noun === 'leaf') return 'leaves';
  if (/(s|sh|ch|x)$/.test(noun)) return `${noun}es`;
  if (/[^aeiou]y$/.test(noun)) return `${noun.slice(0, -1)}ies`;
  return `${noun}s`;
}

/** Human label for one brew entry ("1.5 oz", "2 dashes", "rim"). */
export function amountLabel(e: BrewEntry, ing: Ingredient, unit: UnitKey): string {
  if (isCounted(ing)) {
    if (e.id === 'salt') return 'rim';
    const cnt = Math.max(1, Math.round(e.ml / perPiece(ing)));
    return `${cnt} ${plural(nounOf(ing), cnt)}`;
  }
  return measure(e.ml, unit);
}

export interface AmountInfo {
  counted: boolean;
  /** ml per displayed unit (per piece for counted items). */
  per: number;
  label: string;
  chips: number[];
  dec: number;
  /** step in display units */
  step: number;
}

/** How the amount picker should behave for an ingredient in a given unit. */
export function amountInfo(ing: Ingredient, unit: UnitKey): AmountInfo {
  if (isCounted(ing)) {
    return {
      counted: true, per: perPiece(ing), label: nounOf(ing),
      chips: [1, 2, 3, 4, 6, 8], dec: 0, step: 1,
    };
  }
  const u = UNITS[unit];
  return { counted: false, per: u.toMl, label: u.label, chips: [...u.chips], dec: u.dec, step: u.step };
}

/** First words that stay capitalised inside a sentence. */
const PROPER_FIRST = new Set(['Campari', 'Aperol', 'Angostura', 'Lillet', 'Grand', 'Bénédictine', 'Irish', 'Peychaud’s', 'Pimm’s']);

/** An ingredient name set inside a sentence ("Sweet vermouth" to "sweet vermouth", "Campari" stays). */
export function inlineName(name: string): string {
  const first = name.split(' ')[0];
  return PROPER_FIRST.has(first) ? name : name.charAt(0).toLowerCase() + name.slice(1);
}
