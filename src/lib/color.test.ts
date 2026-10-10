import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import {
  brewAccent, BRAND_ACCENT, contrastRatio, hexToRgb, INK_800, mixColor, oklchToCss, oklchToRgb, rgbToOklch,
  type RGB,
} from './color';

const BG: RGB = hexToRgb(INK_800);
const contrast = (a: RGB, b: RGB) => contrastRatio(a.map(Math.round) as RGB, b);

/** Parse "oklch(L C H)" or "#rrggbb" into sRGB. */
function toRgb(css: string): RGB {
  const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(css);
  if (m) return oklchToRgb(Number(m[1]), Number(m[2]), Number(m[3]));
  const n = parseInt(css.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe('oklch', () => {
  it('round-trips sRGB', () => {
    for (const rgb of [[200, 40, 60], [20, 160, 90], [250, 250, 250], [12, 13, 16]] as RGB[]) {
      const [l, c, h] = rgbToOklch(rgb);
      const back = oklchToRgb(l, c, h);
      back.forEach((v, i) => expect(Math.abs(v - rgb[i])).toBeLessThan(1.5));
    }
  });

  it('treats greys as chroma-free and white as full lightness', () => {
    expect(rgbToOklch([128, 128, 128])[1]).toBeLessThan(0.001);
    expect(rgbToOklch([255, 255, 255])[0]).toBeCloseTo(1, 2);
  });

  it('formats css', () => {
    expect(oklchToCss(0.8, 0.1, 150)).toBe('oklch(0.800 0.100 150.0)');
  });
});

describe('brewAccent', () => {
  it('falls back to the brand colour for no brew or neutral brews', () => {
    expect(brewAccent(null)).toBe(BRAND_ACCENT);
    expect(brewAccent(mixColor([{ id: 'vodka', ml: 45 }]))).toBe(BRAND_ACCENT);
    expect(brewAccent(mixColor([{ id: 'soda_water', ml: 100 }]))).toBe(BRAND_ACCENT);
  });

  it('keeps the brew hue, holds chroma in range and passes 7:1 on --ink-800', () => {
    const brews = [
      [{ id: 'campari', ml: 30 }, { id: 'gin', ml: 30 }],
      [{ id: 'blue_curacao', ml: 30 }, { id: 'vodka', ml: 30 }],
      [{ id: 'espresso', ml: 30 }],
      [{ id: 'grenadine', ml: 20 }, { id: 'lime_juice', ml: 20 }],
      [{ id: 'tomato_juice', ml: 90 }, { id: 'vodka', ml: 45 }],
      [{ id: 'chartreuse', ml: 30 }, { id: 'pineapple_juice', ml: 30 }],
    ];
    for (const b of brews) {
      const mix = mixColor(b);
      const accent = brewAccent(mix);
      if (accent === BRAND_ACCENT) continue;
      const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(accent);
      expect(m).not.toBeNull();
      expect(Number(m?.[1])).toBeGreaterThanOrEqual(0.62);
      expect(Number(m?.[2])).toBeLessThanOrEqual(0.15);
      expect(Number(m?.[2])).toBeGreaterThan(0.03);
      const [, , hue] = rgbToOklch([mix?.r ?? 0, mix?.g ?? 0, mix?.b ?? 0]);
      expect(Math.abs(Number(m?.[3]) - hue)).toBeLessThan(0.1);
      expect(contrast(toRgb(accent), BG)).toBeGreaterThanOrEqual(7);
    }
  });

  it('chroma follows 0.7 x the brew, clamped to 0.07..0.15, when the gamut allows', () => {
    const mix = mixColor([{ id: 'campari', ml: 30 }]);
    const [, c] = rgbToOklch([mix?.r ?? 0, mix?.g ?? 0, mix?.b ?? 0]);
    const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(brewAccent(mix));
    expect(Number(m?.[2])).toBeCloseTo(Math.min(0.15, Math.max(0.07, 0.7 * c)), 2);
  });

  it('every recipe blend and every single-ingredient blend meets 7:1 on --ink-800', () => {
    const brews = [
      ...RECIPES.map((r) => r.build.map(([id, ml]) => ({ id, ml }))),
      ...INGREDIENTS.map((i) => [{ id: i.id, ml: i.amt }]),
    ];
    const low: string[] = [];
    for (const b of brews) {
      const accent = brewAccent(mixColor(b));
      const ratio = contrast(toRgb(accent), BG);
      if (ratio < 7) low.push(`${b.map((e) => e.id).join('+')} ${accent} ${ratio.toFixed(2)}`);
    }
    expect(low).toEqual([]);
  });

  it('every hue stays readable at the accent lightness range', () => {
    for (let h = 0; h < 360; h += 15) {
      for (const c of [0.07, 0.15]) {
        const mix = { css: '', ...(() => { const [r, g, b] = oklchToRgb(0.6, c, h); return { r, g, b }; })(), a: 1 };
        const accent = brewAccent(mix);
        if (accent === BRAND_ACCENT) continue;
        expect(contrast(toRgb(accent), BG), `${h} ${c}`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('brand accent is readable too', () => {
    expect(contrast(toRgb(BRAND_ACCENT), BG)).toBeGreaterThanOrEqual(7);
  });
});
