import { describe, expect, it } from 'vitest';
import { mixColor, rgbToOklch } from '../lib/color';
import { brewTheme } from './useBrewTheme';

describe('brewTheme', () => {
  it('uses the emerald family for the empty pot', () => {
    const t = brewTheme(null);
    expect(t.accent[1]).toBeGreaterThan(t.accent[0]);
    expect(t.brew[1]).toBeGreaterThan(t.brew[0]);
    expect(rgbToOklch(t.hi)[0]).toBeGreaterThan(rgbToOklch(t.brew)[0]);
    expect(rgbToOklch(t.deep)[0]).toBeLessThan(rgbToOklch(t.brew)[0]);
  });

  it('lightens and darkens a real blend while keeping its hue', () => {
    const mix = mixColor([{ id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }]);
    expect(mix).not.toBeNull();
    const t = brewTheme(mix);
    const [lb, , hb] = rgbToOklch(t.brew);
    const [lh, , hh] = rgbToOklch(t.hi);
    const [ld, , hd] = rgbToOklch(t.deep);
    expect(lh).toBeGreaterThan(lb);
    expect(ld).toBeLessThan(lb);
    expect(Math.abs(hh - hb)).toBeLessThan(12);
    expect(Math.abs(hd - hb)).toBeLessThan(12);
    t.accent.forEach((c) => expect(c).toBeGreaterThanOrEqual(0));
  });

  it('gives the accent hover state at least the base lightness', () => {
    const t = brewTheme(mixColor([{ id: 'gin', ml: 45 }]));
    expect(rgbToOklch(t.accentHi)[0]).toBeGreaterThanOrEqual(rgbToOklch(t.accent)[0]);
  });
});
