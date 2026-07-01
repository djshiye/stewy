/* Colour utilities + the cauldron's live pigment mixing. */
import type { BrewEntry } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amt in [-1,1]: negative darkens toward black, positive lightens to white. */
export function shade(color: string | RGB, amt: number): string {
  let [r, g, b] = Array.isArray(color) ? color : hexToRgb(color);
  if (amt < 0) {
    r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
  } else {
    r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
  }
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface Mix {
  css: string;
  r: number; g: number; b: number;
  /** overall liquid opacity 0.34..0.94 */
  a: number;
}

/** Blend every reagent's colour, weighted by volume and pigment opacity. */
export function mixColor(brew: BrewEntry[]): Mix | null {
  let r = 0, g = 0, b = 0, w = 0, opv = 0, vol = 0;
  for (const e of brew) {
    const ing = ING_BY_ID[e.id];
    if (!ing) continue;
    const [ir, ig, ib] = hexToRgb(ing.color);
    const cw = e.ml * (0.25 + (ing.opacity || 0.4)); // pigment weight
    r += ir * cw; g += ig * cw; b += ib * cw; w += cw;
    opv += (ing.opacity || 0.4) * e.ml; vol += e.ml;
  }
  if (w === 0 || vol === 0) return null;
  r /= w; g /= w; b /= w;
  const a = clamp(0.34 + (opv / vol) * 0.58, 0.34, 0.94);
  return { css: `rgb(${r | 0}, ${g | 0}, ${b | 0})`, r, g, b, a };
}

/** Fit / score colour: red → amber → emerald over t in [0,1]; null = neutral. */
export function fitColor(t: number | null): string {
  if (t == null) return 'rgba(255,255,255,0.14)';
  const red: RGB = [229, 72, 77], amber: RGB = [245, 166, 35], green: RGB = [61, 220, 151];
  let a: RGB, b: RGB, k: number;
  if (t < 0.5) { a = red; b = amber; k = t * 2; }
  else { a = amber; b = green; k = (t - 0.5) * 2; }
  const r = a[0] + (b[0] - a[0]) * k, g = a[1] + (b[1] - a[1]) * k, bl = a[2] + (b[2] - a[2]) * k;
  return `rgb(${r | 0}, ${g | 0}, ${bl | 0})`;
}
