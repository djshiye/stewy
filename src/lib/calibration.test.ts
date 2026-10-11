import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { harmony, suggestions } from './harmony';
import { scoreDeltas, topSuggestions } from './coach';

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
  curdled_ginger_beer: [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['ginger_beer', 120]],
  curdled_cola: [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['cola', 120]],
  curdled_soda: [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['soda_water', 120]],
  curdled_tonic: [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['tonic_water', 120]],
  ramos_without_egg_white: [
    ['gin', 50], ['lemon_juice', 15], ['lime_juice', 15], ['simple_syrup', 25], ['heavy_cream', 25], ['soda_water', 45],
  ],
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

const RAMOS: [string, number][] = [
  ['gin', 50], ['lemon_juice', 15], ['lime_juice', 15], ['simple_syrup', 25], ['heavy_cream', 25], ['egg_white', 25],
  ['soda_water', 45],
];
const without = (b: [string, number][], id: string) => b.filter(([x]) => x !== id);
const swap = (b: [string, number][], from: string, to: string): [string, number][] => b.map(([x, ml]) => [x === from ? to : x, ml]);
const curdleTip = (b: [string, number][]) => suggestions(harmony(toBrew(b)), toBrew(b)).some((s) => /curdle/.test(s.text));

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

  it('keeps dairy plus acid penalised however far the brew is topped up', () => {
    const base: [string, number][] = [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30]];
    const clashOf = (mixer: number) => harmony(toBrew([...base, ['soda_water', mixer]]))?.parts.clash ?? 0;
    for (const ml of [0, 30, 60, 120, 240]) expect(clashOf(ml), `${ml} ml soda`).toBeLessThan(-30);
    // a smooth ramp, not a cliff: nearby amounts of cream move the clash by a few points at most
    let prev = harmony(toBrew([['mezcal', 45], ['lime_juice', 25], ['heavy_cream', 0.5]]))?.parts.clash ?? 0;
    for (let ml = 1; ml <= 30; ml += 0.5) {
      const c = harmony(toBrew([['mezcal', 45], ['lime_juice', 25], ['heavy_cream', ml]]))?.parts.clash ?? 0;
      expect(Math.abs(c - prev), `${ml} ml cream`).toBeLessThan(12);
      prev = c;
    }
    // egg white and coconut cream are creamy but do not curdle
    expect(harmony(toBrew([['bourbon', 45], ['lemon_juice', 25], ['simple_syrup', 15], ['egg_white', 20], ['soda_water', 120]]))?.parts.clash).toBeCloseTo(0);
  });

  it('never suggests a fix for a curdled brew that is really a bigger mixer', () => {
    const tops = topSuggestions(toBrew([['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30]]));
    expect(tops.filter((t) => t.delta > 20).map((t) => `${t.ing.id} +${t.delta}`)).toEqual([]);
  });

  it('never offers egg white as a fix, or lights it green, for a sugarless curdled brew', () => {
    const sugarless = [
      CLASH_SUITE.cream_lime, CLASH_SUITE.cream_lemon_gin, CLASH_SUITE.cream_mezcal, CLASH_SUITE.mezcal_cream_lime,
      CLASH_SUITE.milk_grapefruit_mezcal, CLASH_SUITE.curdled_soda, CLASH_SUITE.curdled_ginger_beer,
      [['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30]] as [string, number][],
    ];
    for (const b of sugarless) {
      const egg = scoreDeltas(toBrew(b))?.get('egg_white');
      expect(egg?.delta ?? 0, JSON.stringify(b)).toBeLessThanOrEqual(5);
      expect(topSuggestions(toBrew(b), 40).find((t) => t.ing.id === 'egg_white'), JSON.stringify(b)).toBeUndefined();
    }
  });

  it('lets egg white, sugar and a long shake carry cream through citrus, in the shape of a Ramos Gin Fizz', () => {
    expect(score(RAMOS)).toBeGreaterThanOrEqual(80);
    expect(harmony(toBrew(RAMOS))?.parts.clash).toBeCloseTo(0);
    expect(score(swap(RAMOS, 'heavy_cream', 'milk'))).toBeGreaterThanOrEqual(80);
    // spec range of a Ramos: gin 45 to 60, syrup 20 to 30, cream 20 to 30, egg white 20 to 30, soda 30 to 60
    const low: string[] = [];
    for (const gin of [45, 60]) for (const syrup of [20, 25, 30]) for (const cream of [20, 25, 30])
      for (const egg of [20, 25, 30]) for (const soda of [30, 45, 60]) {
        const b: [string, number][] = [
          ['gin', gin], ['lemon_juice', 15], ['lime_juice', 15], ['simple_syrup', syrup], ['heavy_cream', cream],
          ['egg_white', egg], ['soda_water', soda],
        ];
        if (score(b) < 80) low.push(`${gin}/${syrup}/${cream}/${egg}/${soda} ${score(b)}`);
      }
    expect(low).toEqual([]);
  });

  it('keeps the Ramos exception narrow: no egg white, no sugar, Irish cream or too little egg all stay curdled', () => {
    expect(score(without(RAMOS, 'egg_white'))).toBeLessThanOrEqual(55);
    expect(score(without(RAMOS, 'simple_syrup'))).toBeLessThanOrEqual(55);
    expect(score(swap(RAMOS, 'heavy_cream', 'irish_cream'))).toBeLessThanOrEqual(55);
    expect(score([['irish_cream', 45], ['lemon_juice', 30], ['egg_white', 30]])).toBeLessThanOrEqual(55);
    expect(score([['irish_cream', 45], ['lemon_juice', 30], ['egg_white', 30], ['simple_syrup', 20]])).toBeLessThanOrEqual(55);
    expect(score([['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['egg_white', 30]])).toBeLessThanOrEqual(55);
    expect(score([['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['egg_white', 30], ['simple_syrup', 20]])).toBeLessThanOrEqual(55);
    expect(score(RAMOS.map(([id, ml]) => [id, id === 'egg_white' ? 6 : ml] as [string, number]))).toBeLessThanOrEqual(55);
    expect(score(RAMOS.map(([id, ml]) => [id, id === 'heavy_cream' ? 60 : ml] as [string, number]))).toBeLessThanOrEqual(55);
  });

  it('ramps the Ramos exception in smoothly as egg white and syrup come in', () => {
    for (const id of ['egg_white', 'simple_syrup']) {
      let prev = 0;
      for (let ml = 0; ml <= 30; ml += 0.5) {
        const b = toBrew(RAMOS.map(([x, v]) => [x, x === id ? ml : v] as [string, number]));
        const c = harmony(b)?.parts.clash ?? 0;
        if (ml > 0) expect(Math.abs(c - prev), `${id} ${ml} ml`).toBeLessThan(6);
        prev = c;
      }
    }
  });

  it('says nothing about curdling for a Ramos, and still does for the curdled brews', () => {
    expect(curdleTip(RAMOS)).toBe(false);
    expect(curdleTip(without(RAMOS, 'egg_white'))).toBe(true);
    expect(curdleTip(without(RAMOS, 'simple_syrup'))).toBe(true);
    expect(curdleTip(swap(RAMOS, 'heavy_cream', 'irish_cream'))).toBe(true);
    // every dairy plus acid brew in the clash suite, none of which has egg white
    for (const k of [
      'cream_lime', 'cream_lemon_gin', 'milk_grapefruit_mezcal', 'irish_cream_lemon', 'mezcal_cream_lime',
      'curdled_ginger_beer', 'curdled_cola', 'curdled_soda', 'curdled_tonic', 'ramos_without_egg_white',
    ]) expect(curdleTip(CLASH_SUITE[k]), k).toBe(true);
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
    // best of many runs: a busy machine (parallel test files) only ever makes a run slower,
    // so the fastest run is the honest measure of the work itself
    const runs: number[] = [];
    for (let i = 0; i < 25; i++) {
      const t0 = performance.now();
      scoreDeltas(brew.map((e) => ({ ...e })));
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    expect(runs[0]).toBeLessThan(3);
  });
});
