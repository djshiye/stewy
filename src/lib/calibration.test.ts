import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { harmony } from './harmony';
import { scoreDeltas } from './coach';

const toBrew = (b: [string, number][]): BrewEntry[] => b.map(([id, ml]) => ({ id, ml }));
const score = (b: [string, number][]) => harmony(toBrew(b))?.score ?? 0;

/** Brews that no bartender would pour. The engine must keep them low. */
const CLASH_SUITE: Record<string, [string, number][]> = {
  cream_lime: [['heavy_cream', 40], ['lime_juice', 25]],
  cream_lemon_gin: [['gin', 45], ['heavy_cream', 30], ['lemon_juice', 20]],
  milk_grapefruit_mezcal: [['milk', 45], ['grapefruit_juice', 45], ['mezcal', 45]],
  espresso_lemon_gin: [['espresso', 30], ['lemon_juice', 25], ['gin', 45]],
  cream_tonic: [['heavy_cream', 30], ['tonic_water', 120]],
  cream_mezcal: [['mezcal', 45], ['heavy_cream', 30]],
  coffee_liqueur_lime_tomato: [['coffee_liqueur', 30], ['lime_juice', 25], ['tomato_juice', 60]],
  irish_cream_lemon: [['irish_cream', 45], ['lemon_juice', 30]],
  coconut_cream_lime_scotch: [['coconut_cream', 30], ['lime_juice', 25], ['scotch', 30]],
  espresso_orange: [['espresso', 30], ['orange_juice', 90]],
  milk_cranberry: [['milk', 90], ['cranberry_juice', 60]],
  cream_grapefruit_soda: [['heavy_cream', 40], ['grapefruit_soda', 90]],
  mezcal_cream_lime: [['mezcal', 40], ['heavy_cream', 30], ['lime_juice', 20]],
  coffee_lime_tonic: [['espresso', 30], ['lime_juice', 20], ['tonic_water', 90]],
  sweet_tower: [['simple_syrup', 40], ['grenadine', 20], ['vodka', 10]],
  sour_tower: [['lemon_juice', 60], ['lime_juice', 30], ['gin', 10]],
  bitter_tower: [['campari', 60], ['angostura', 4], ['espresso', 30]],
  kitchen_sink: [
    ['gin', 30], ['mezcal', 15], ['campari', 15], ['heavy_cream', 20], ['lime_juice', 10],
    ['espresso', 15], ['cola', 30], ['tomato_juice', 20],
  ],
  eight_spirits_and_juice: [
    ['vodka', 15], ['gin', 15], ['white_rum', 15], ['tequila', 15], ['scotch', 15],
    ['cognac', 15], ['lemon_juice', 15], ['pineapple_juice', 15],
  ],
  nine_ingredients: [
    ['vodka', 20], ['gin', 20], ['white_rum', 20], ['tequila', 20], ['triple_sec', 15],
    ['lime_juice', 15], ['lemon_juice', 10], ['cola', 30], ['simple_syrup', 5],
  ],
};

/** Small deterministic PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('calibration', () => {
  it('every classic recipe scores 80 or more', () => {
    const low = RECIPES.filter((r) => score(r.build) < 80).map((r) => `${r.id} ${score(r.build)}`);
    expect(low).toEqual([]);
  });

  it('keeps the clash suite at 55 or less', () => {
    const high = Object.entries(CLASH_SUITE).filter(([, b]) => score(b) > 55).map(([k, b]) => `${k} ${score(b)}`);
    expect(high).toEqual([]);
  });

  it('keeps a lone spirit at 62 or less, a lone syrup or juice at 50 or less', () => {
    const bad: string[] = [];
    for (const ing of INGREDIENTS) {
      const lone = score([[ing.id, ing.amt]]);
      if (ing.group === 'Spirits' && lone > 62) bad.push(`${ing.id} ${lone}`);
      if ((ing.group === 'Syrups' || ing.group === 'Juices') && lone > 50) bad.push(`${ing.id} ${lone}`);
    }
    expect(bad).toEqual([]);
  });

  it('stays discerning: random 2 to 5 ingredient brews have a median below 70', () => {
    const r = rng(77);
    const scores: number[] = [];
    for (let i = 0; i < 300; i++) {
      const n = 2 + Math.floor(r() * 4);
      const brew: BrewEntry[] = [];
      for (let k = 0; k < n; k++) {
        const ing = INGREDIENTS[Math.floor(r() * INGREDIENTS.length)];
        brew.push({ id: ing.id, ml: ing.amt * (0.5 + r()) });
      }
      scores.push(harmony(brew)?.score ?? 0);
    }
    scores.sort((a, b) => a - b);
    const median = (scores[149] + scores[150]) / 2;
    if (process.env.CALIB_LOG) console.log('median', median, 'p25', scores[75], 'p75', scores[225]);
    expect(median).toBeLessThan(70);
  });

  it('archetype bonuses sit in structure and the parts still add up', () => {
    for (const r of RECIPES) {
      const h = harmony(toBrew(r.build));
      const total = Object.values(h?.parts ?? {}).reduce((a, v) => a + v, 0);
      expect(Math.round(total), r.id).toBe(h?.score);
    }
    expect(harmony(toBrew([['bourbon', 60], ['simple_syrup', 10], ['angostura', 2]]))?.archetype).toBe('spirit-forward');
    expect(harmony(toBrew([['white_rum', 50], ['cola', 120], ['lime_juice', 10]]))?.archetype).toBe('highball');
    expect(harmony(toBrew([['vodka', 50], ['coffee_liqueur', 20], ['heavy_cream', 30]]))?.archetype).toBe('dessert');
    expect(harmony(toBrew([['heavy_cream', 40], ['lime_juice', 25]]))?.archetype).toBeNull();
  });

  it('scoreDeltas stays fast for a 5-ingredient brew', () => {
    const brew = toBrew([['gin', 30], ['campari', 20], ['sweet_vermouth', 20], ['lime_juice', 10], ['soda_water', 40]]);
    // median of several runs, so a busy test machine does not make this flaky
    const runs: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t0 = performance.now();
      scoreDeltas(brew.map((e) => ({ ...e })));
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    expect(runs[4]).toBeLessThan(3);
  });
});
