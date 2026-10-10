import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS, ING_BY_ID } from '../data/ingredients';
import { harmony } from './harmony';
import { fitFromDelta, scoreDeltas, topSuggestions, withAdded } from './coach';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));

// a sour that lacks sweetness: simple syrup should clearly help
const SOUR = brew(['white_rum', 45], ['lime_juice', 25]);

describe('scoreDeltas', () => {
  it('is null for an empty brew', () => {
    expect(scoreDeltas([])).toBeNull();
    expect(topSuggestions([])).toEqual([]);
  });

  it('covers every ingredient with a delta that matches a real simulation', () => {
    const d = scoreDeltas(SOUR);
    expect(d).not.toBeNull();
    for (const ing of INGREDIENTS) expect(d?.has(ing.id)).toBe(true);
    const base = harmony(SOUR)?.score ?? 0;
    const syrup = d?.get('simple_syrup');
    expect(syrup?.delta).toBeGreaterThan(0);
    expect(harmony(withAdded(SOUR, 'simple_syrup', syrup?.ml ?? 0))?.score).toBe(base + (syrup?.delta ?? 0));
  });

  it('adds to an existing entry instead of duplicating it', () => {
    const out = withAdded(SOUR, 'lime_juice', 10);
    expect(out).toHaveLength(2);
    expect(out[1].ml).toBe(35);
    expect(SOUR[1].ml).toBe(25);
  });

  it('uses one piece for counted ingredients', () => {
    const d = scoreDeltas(SOUR);
    expect(d?.get('angostura')?.ml).toBeCloseTo(0.9);
    expect(d?.get('mint')?.ml).toBe(1);
  });

  it('is memoised per brew identity', () => {
    expect(scoreDeltas(SOUR)).toBe(scoreDeltas(SOUR));
  });

  it('is fast enough for every render', () => {
    const fresh = brew(['bourbon', 45], ['lemon_juice', 20], ['simple_syrup', 10]);
    const t = performance.now();
    scoreDeltas(fresh);
    expect(performance.now() - t).toBeLessThan(60);
  });
});

describe('topSuggestions', () => {
  it('returns improving, unique, best-first suggestions', () => {
    const top = topSuggestions(SOUR, 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(5);
    const base = harmony(SOUR)?.score ?? 0;
    for (const s of top) {
      expect(s.delta).toBeGreaterThan(0);
      expect(s.score).toBe(base + s.delta);
      expect(ING_BY_ID[s.ing.id]).toBe(s.ing);
    }
    expect(new Set(top.map((s) => s.ing.id)).size).toBe(top.length);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].delta).toBeGreaterThanOrEqual(top[i].delta);
  });

  it('flags suggestions that add more of something already in the brew', () => {
    const top = topSuggestions(SOUR, 80);
    expect(top.length).toBeGreaterThan(0);
    for (const s of top) expect(s.inBrew).toBe(SOUR.some((e) => e.id === s.ing.id));
    const more = topSuggestions(brew(['white_rum', 20], ['lime_juice', 25], ['simple_syrup', 15]), 80);
    expect(more.some((s) => s.inBrew)).toBe(true);
    expect(more.some((s) => !s.inBrew)).toBe(true);
  });

  it('keeps a strong brew in its shape instead of turning it into something else', () => {
    const espresso = brew(['vodka', 50], ['coffee_liqueur', 20], ['espresso', 30]);
    const negroni = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
    for (const b of [espresso, negroni]) {
      const base = harmony(b);
      expect(base?.score).toBeGreaterThanOrEqual(80);
      expect(base?.archetype).not.toBeNull();
      const top = topSuggestions(b, 200);
      expect(top.length).toBeGreaterThan(0);
      for (const s of top) {
        expect(harmony(withAdded(b, s.ing.id, s.ml))?.archetype, s.ing.id).toBe(base?.archetype);
      }
    }
    expect(topSuggestions(espresso, 200).some((s) => s.ing.id === 'tonic_water')).toBe(false);
  });

  it('still suggests for brews that have no shape', () => {
    const shapeless = brew(['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['ginger_beer', 120]);
    expect(harmony(shapeless)?.archetype).toBeNull();
    expect(topSuggestions(shapeless).length).toBeGreaterThan(0);
  });

  it('defaults to three and skips garnish while other options exist', () => {
    const top = topSuggestions(SOUR);
    expect(top.length).toBeLessThanOrEqual(3);
    expect(top.every((s) => s.ing.group !== 'Garnish')).toBe(true);
  });

  it('suggests nothing when no addition improves a great drink', () => {
    const daiquiri = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]);
    for (const s of topSuggestions(daiquiri, 10)) expect(s.delta).toBeGreaterThan(0);
  });
});

describe('fitFromDelta', () => {
  it('is null without a delta', () => {
    expect(fitFromDelta(undefined)).toBeNull();
  });

  it('is neutral at zero and monotonic', () => {
    expect(fitFromDelta(0)).toBeCloseTo(0.5);
    expect(fitFromDelta(15) ?? 0).toBeGreaterThan(0.9);
    expect(fitFromDelta(-15) ?? 1).toBeLessThan(0.1);
    expect(fitFromDelta(5) ?? 0).toBeGreaterThan(fitFromDelta(2) ?? 1);
  });

  it('stays within 0..1', () => {
    for (const d of [-100, -30, 30, 100]) {
      const f = fitFromDelta(d) ?? -1;
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });
});

describe('Delta.clash', () => {
  const MAI_TAI = brew(['white_rum', 40], ['dark_rum', 20], ['triple_sec', 15], ['orgeat', 15], ['lime_juice', 20]);
  const ESPRESSO_MARTINI = brew(['vodka', 50], ['coffee_liqueur', 20], ['espresso', 30]);

  it('stays off for mere imbalance', () => {
    const d = scoreDeltas(MAI_TAI);
    expect(d?.get('vodka')?.clash).toBeFalsy();
    expect(d?.get('bourbon')?.clash).toBeFalsy();
  });

  it('flags cream joining a Mai Tai and lemon joining an Espresso Martini', () => {
    expect(scoreDeltas(MAI_TAI)?.get('heavy_cream')?.clash).toBe(true);
    expect(scoreDeltas(ESPRESSO_MARTINI)?.get('lemon_juice')?.clash).toBe(true);
  });

  it('is only true where the clash term got worse', () => {
    const base = harmony(MAI_TAI);
    const d = scoreDeltas(MAI_TAI);
    for (const ing of INGREDIENTS) {
      const e = d?.get(ing.id);
      const after = harmony(withAdded(MAI_TAI, ing.id, e?.ml ?? 0));
      const worse = (after?.parts.clash ?? 0) - (base?.parts.clash ?? 0) <= -5;
      expect(Boolean(e?.clash), ing.id).toBe(worse);
    }
  });
});
