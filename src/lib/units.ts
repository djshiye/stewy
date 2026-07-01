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
  angostura: 0.9, orange_bitters: 0.9, mint: 1, cucumber: 2,
  sugar_cube: 4, salt: 1, cherry: 3, orange_slice: 3, olive: 3,
};
export const NOUN: Record<string, string> = {
  angostura: 'dash', orange_bitters: 'dash', mint: 'leaf', cucumber: 'slice',
  sugar_cube: 'cube', salt: 'rim', cherry: 'cherry', orange_slice: 'slice', olive: 'olive',
};

export const isCounted = (ing: Ingredient) => ing.unit === 'dash' || ing.unit === 'piece';

/** Format a number to `dec` decimals with trailing zeros trimmed. */
export function trim(v: number, dec: number): string {
  const n = parseFloat(v.toFixed(dec));
  return Number.isNaN(n) ? '0' : String(n);
}

/** Human label for one brew entry ("1.5 oz", "2 dashes", "rim"). */
export function amountLabel(e: BrewEntry, ing: Ingredient, unit: UnitKey): string {
  if (isCounted(ing)) {
    if (e.id === 'salt') return 'rim';
    const per = PER[e.id] ?? 1;
    const cnt = Math.max(1, Math.round(e.ml / per));
    const noun = NOUN[e.id] ?? 'pc';
    return `${cnt} ${noun}${cnt > 1 ? 's' : ''}`;
  }
  const u = UNITS[unit];
  return `${trim(e.ml / u.toMl, u.dec)} ${u.label}`;
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
      counted: true, per: PER[ing.id] ?? 1, label: NOUN[ing.id] ?? 'pc',
      chips: [1, 2, 3, 4, 6, 8], dec: 0, step: 1,
    };
  }
  const u = UNITS[unit];
  return { counted: false, per: u.toMl, label: u.label, chips: [...u.chips], dec: u.dec, step: u.step };
}
