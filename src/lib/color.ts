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

/* ---------- OKLCH helpers + the brew-derived accent ---------- */

export type OKLCH = [l: number, c: number, h: number];

const toLinear = (u: number) => {
  const v = u / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (v: number) => {
  const c = clamp(v, 0, 1);
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
};

/** sRGB (0..255) to OKLCH: lightness 0..1, chroma ~0..0.4, hue in degrees 0..360. */
export function rgbToOklch([r, g, b]: RGB): OKLCH {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.hypot(a, bb);
  const h = c < 1e-6 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return [L, c, h];
}

/** OKLCH to sRGB (0..255), clipped to the gamut. */
export function oklchToRgb(l: number, c: number, h: number): RGB {
  const a = c * Math.cos((h * Math.PI) / 180), b = c * Math.sin((h * Math.PI) / 180);
  const lp = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mp = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const sp = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * lp - 3.3077115913 * mp + 0.2309699292 * sp),
    toSrgb(-1.2684380046 * lp + 2.6097574011 * mp - 0.3413193965 * sp),
    toSrgb(-0.0041960863 * lp - 0.7034186147 * mp + 1.707614701 * sp),
  ];
}

/** CSS `oklch()` string. */
export function oklchToCss(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

/** Brand emerald, used when a brew has no colour of its own. */
export const BRAND_ACCENT = '#3ddc97';

/** A readable accent from the brew colour: same hue, light, with chroma held in 0.06..0.15.
    Near-neutral or empty brews fall back to the brand emerald. */
export function brewAccent(mix: Mix | null): string {
  if (!mix) return BRAND_ACCENT;
  const [, c, h] = rgbToOklch([mix.r, mix.g, mix.b]);
  if (c < 0.035) return BRAND_ACCENT;
  return oklchToCss(0.8, clamp(c, 0.06, 0.15), h);
}
