import { useEffect } from 'react';
import {
  BRAND_ACCENT, brewAccent, clamp, hexToRgb, oklchToRgb, rgbToOklch,
  type Mix, type RGB,
} from '../lib/color';

/* The empty pot is the emerald family: mid, hi and deep around the brand green. */
const EMPTY: Record<'brew' | 'hi' | 'deep', RGB> = {
  brew: [37, 166, 114],
  hi: [91, 227, 165],
  deep: [15, 90, 60],
};

const INK_900 = '#0b0e14';

const css = ([r, g, b]: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

/** Same hue and chroma, new lightness. */
function relight(rgb: RGB, dl: number, minL = 0, maxL = 1, chromaScale = 1): RGB {
  const [l, c, h] = rgbToOklch(rgb);
  return oklchToRgb(clamp(l + dl, minL, maxL), c * chromaScale, h);
}

/** Parse what brewAccent() returns: `oklch(l c h)` or a hex colour. */
function parseColor(value: string): RGB {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(value);
  if (m) return oklchToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
  return hexToRgb(value.startsWith('#') ? value : BRAND_ACCENT);
}

export interface BrewTheme {
  brew: RGB;
  hi: RGB;
  deep: RGB;
  accent: RGB;
  accentHi: RGB;
}

/** Colours for a mix (null is the empty pot). Pure, so it is easy to test. */
export function brewTheme(mix: Mix | null): BrewTheme {
  const accent = parseColor(brewAccent(mix));
  const accentHi = relight(accent, 0.06, 0, 0.97);
  if (!mix) return { brew: EMPTY.brew, hi: EMPTY.hi, deep: EMPTY.deep, accent, accentHi };
  const brew: RGB = [mix.r, mix.g, mix.b];
  const [l] = rgbToOklch(brew);
  // lift dark pigments further so the glow reads, and keep light ones from clipping
  const hi = relight(brew, clamp(0.78 - l, 0.1, 0.22), 0, 0.92);
  const deep = relight(brew, -clamp(l - 0.2, 0.14, 0.3), 0.12, 1, 0.9);
  return { brew, hi, deep, accent, accentHi };
}

/** --brew-rgb and --accent-rgb are assembled in tokens.css from these three numbers. */
function setRgb(s: CSSStyleDeclaration, name: 'brew' | 'accent', [r, g, b]: RGB) {
  s.setProperty(`--${name}-r`, String(Math.round(r)));
  s.setProperty(`--${name}-g`, String(Math.round(g)));
  s.setProperty(`--${name}-b`, String(Math.round(b)));
}

/** Writes the live brew and accent variables on :root. They are registered as <color>
    in tokens.css, so the whole scene recolours over 600 ms. */
export function useBrewTheme(mix: Mix | null): void {
  useEffect(() => {
    const t = brewTheme(mix);
    const s = document.documentElement.style;
    s.setProperty('--brew', css(t.brew));
    s.setProperty('--brew-hi', css(t.hi));
    s.setProperty('--brew-deep', css(t.deep));
    setRgb(s, 'brew', t.brew);
    s.setProperty('--accent', css(t.accent));
    s.setProperty('--accent-hi', css(t.accentHi));
    s.setProperty('--on-accent', INK_900);
    setRgb(s, 'accent', t.accent);
  }, [mix]);
}
