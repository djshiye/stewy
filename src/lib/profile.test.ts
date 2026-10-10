import { describe, expect, it } from 'vitest';
import { FLAVOR_DIMS } from '../data/types';
import { RECIPES } from '../data/recipes';
import { harmony, type Parts } from './harmony';
import {
  AXES, axes8, balancePosition, balanceWord, breakdown, radarRadius, signed, strengthZone, tierTone,
} from './profile';

const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);

describe('axes8', () => {
  it('always returns the eight axes in the fixed order', () => {
    const order = ['Boozy', 'Sweet', 'Sour', 'Bitter', 'Herbal', 'Fruity', 'Spice', 'Rich'];
    expect(axes8({}).map((a) => a.label)).toEqual(order);
    expect(axes8(null).map((a) => a.label)).toEqual(order);
    expect(axes8(harmony([{ id: 'gin', ml: 30 }])!.p).map((a) => a.label)).toEqual(order);
  });

  it('is all zeros for a zero profile', () => {
    expect(axes8({}).every((a) => a.value === 0)).toBe(true);
  });

  it('covers every flavour dimension exactly once', () => {
    const dims = AXES.flatMap((a) => [...a.dims]);
    expect([...dims].sort()).toEqual([...FLAVOR_DIMS].sort());
  });

  it('keeps the total: the axes sum to the profile', () => {
    for (const r of RECIPES) {
      const h = harmony(r.build.map(([id, ml]) => ({ id, ml })))!;
      const profileTotal = sum(Object.values(h.p) as number[]);
      expect(sum(axes8(h.p).map((a) => a.value))).toBeCloseTo(profileTotal, 9);
      expect(profileTotal).toBeCloseTo(1, 9);
    }
  });

  it('merges grouped dimensions', () => {
    const a = axes8({ herbal: 0.1, fresh: 0.1, floral: 0.05, fruity: 0.2, citrus: 0.1, creamy: 0.3, coffee: 0.1 });
    const by = Object.fromEntries(a.map((x) => [x.key, x.value]));
    expect(by.herbal).toBeCloseTo(0.25);
    expect(by.fruity).toBeCloseTo(0.3);
    expect(by.rich).toBeCloseTo(0.4);
    expect(by.spice).toBe(0);
  });
});

describe('radarRadius', () => {
  it('is fixed-scale and bounded', () => {
    expect(radarRadius(0)).toBe(0);
    expect(radarRadius(1)).toBe(1);
    expect(radarRadius(0.2)).toBeGreaterThan(radarRadius(0.1));
  });
});

describe('breakdown', () => {
  it('sums to the ring for every classic', () => {
    for (const r of RECIPES) {
      const h = harmony(r.build.map(([id, ml]) => ({ id, ml })))!;
      const b = breakdown(h.parts, h.score);
      expect(b.base + sum(b.rows.map((x) => x.value))).toBe(b.total);
      if (!b.clamp) expect(b.total).toBe(h.score);
      expect(b.equation.endsWith(`= ${b.total}`)).toBe(true);
    }
  });

  it('writes the equation with signs and drops zero terms', () => {
    const parts: Parts = {
      base: 55, pairing: 22.2, balance: 9, structure: 8.4, sweetSour: 0, oneNote: -3.6, clash: 0, crowd: 0,
    };
    const b = breakdown(parts, 91);
    expect(b.equation).toBe('55 + 22 + 9 + 9 - 4 = 91');
    expect(b.clampNote).toBeNull();
    expect(b.penalties).toEqual([{ key: 'oneNote', label: 'One-note', value: -4 }]);
  });

  it('says so when the score is capped or floored', () => {
    const hi: Parts = { base: 55, pairing: 30, balance: 10, structure: 12, sweetSour: 0, oneNote: 0, clash: 0, crowd: 0 };
    const capped = breakdown(hi, 99);
    expect(capped.clamp).toBe('capped');
    expect(capped.clampNote).toBe('capped at 99');
    expect(capped.total).toBe(107);
    const lo: Parts = { base: 55, pairing: 0, balance: 0, structure: -16, sweetSour: 0, oneNote: 0, clash: -45, crowd: 0 };
    const floored = breakdown(lo, 3);
    expect(floored.clampNote).toBe('floored at 3');
  });

  it('handles the zero parts of a flavourless brew', () => {
    const b = breakdown({ base: 42, pairing: 0, balance: 0, structure: 0, sweetSour: 0, oneNote: 0, clash: 0, crowd: 0 }, 42);
    expect(b.equation).toBe('42 = 42');
  });
});

describe('meters and tiers', () => {
  it('maps tiers to semantic tones', () => {
    expect([tierTone(91), tierTone(80), tierTone(79), tierTone(56), tierTone(55)]).toEqual([
      'good', 'good', 'warn', 'warn', 'bad',
    ]);
  });

  it('puts sweet on the left and sour and bitter on the right', () => {
    expect(balancePosition(1)).toBe(0);
    expect(balancePosition(-1)).toBe(1);
    expect(balancePosition(0)).toBe(0.5);
    expect(balanceWord(0)).toBe('Balanced');
    expect(balanceWord(null)).toMatch(/nothing/i);
  });

  it('zones strength', () => {
    expect([strengthZone(0), strengthZone(11.9), strengthZone(22), strengthZone(30)]).toEqual([
      'light', 'light', 'classic', 'strong',
    ]);
  });

  it('formats signed numbers without dash glyphs', () => {
    expect([signed(4), signed(-4), signed(0)]).toEqual(['+4', '-4', '0']);
    expect(signed(-4)).not.toMatch(/[‒-―−]/);
  });
});
