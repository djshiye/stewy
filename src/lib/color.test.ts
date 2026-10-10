import { describe, expect, it } from 'vitest';
import { mixColor, oklchToCss, oklchToRgb, rgbToOklch, brewAccent, BRAND_ACCENT, type RGB } from './color';

const BG: RGB = [0x12, 0x0d, 0x10];

function luminance([r, g, b]: RGB): number {
  const f = (u: number) => {
    const v = u / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

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

  it('keeps the brew hue and passes 4.5:1 on the page background', () => {
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
      expect(Number(m?.[1])).toBeCloseTo(0.8, 2);
      expect(Number(m?.[2])).toBeGreaterThanOrEqual(0.06);
      expect(Number(m?.[2])).toBeLessThanOrEqual(0.15);
      expect(contrast(toRgb(accent), BG)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('every hue stays readable', () => {
    for (let h = 0; h < 360; h += 15) {
      for (const c of [0.06, 0.15]) {
        expect(contrast(oklchToRgb(0.8, c, h), BG)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('brand accent is readable too', () => {
    expect(contrast(toRgb(BRAND_ACCENT), BG)).toBeGreaterThanOrEqual(4.5);
  });
});
