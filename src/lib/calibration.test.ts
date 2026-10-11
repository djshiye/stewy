import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS, ING_BY_ID } from '../data/ingredients';
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

/** Worst score step per 0.5 ml measured over the sweeps below, plus a point of headroom: every classic
    and every random pot of real size (5 measured), and random pots of any size (8 measured, a 10 ml pot). */
const CLASSIC_STEP = 6;
const SMALL_POT_STEP = 9;

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

/** The biggest score change between neighbouring 0.5 ml steps as each liquid amount in each brew is
    swept from 0.5 ml to 120 ml (or 2.5 times its amount, if more) with the rest held. `minRest` keeps
    only sweeps whose other liquid adds up to at least that many ml. */
function worstStep(brews: [string, [string, number][]][], minRest = 0) {
  let worst = { jump: 0, at: 'none' };
  for (const [name, base] of brews)
    base.forEach(([id, amt], i) => {
      if (ING_BY_ID[id]?.unit) return;
      const rest = base.reduce((t, [x, ml], j) => t + (j === i || ING_BY_ID[x]?.unit ? 0 : ml), 0);
      if (rest < minRest) return;
      const max = Math.max(120, 2.5 * amt);
      let prev = score(base.map(([x, v], j) => [x, j === i ? 0.5 : v] as [string, number]));
      for (let ml = 1; ml <= max; ml += 0.5) {
        const now = score(base.map(([x, v], j) => [x, j === i ? ml : v] as [string, number]));
        if (Math.abs(now - prev) > worst.jump) worst = { jump: Math.abs(now - prev), at: `${name}: ${id} ${ml - 0.5} to ${ml} ml, ${prev} to ${now}` };
        prev = now;
      }
    });
  return worst;
}

/** Seeded random pots of 2 to 5 distinct ingredients at 0.5 to 1.5 times their default pour. */
function randomPots(seed: number, count: number): [string, [string, number][]][] {
  const r = rng(seed);
  const out: [string, [string, number][]][] = [];
  for (let i = 0; i < count; i++) {
    const n = 2 + Math.floor(r() * 4);
    const b: [string, number][] = [];
    for (let k = 0; k < n; k++) {
      const ing = INGREDIENTS[Math.floor(r() * INGREDIENTS.length)];
      if (b.some(([x]) => x === ing.id)) continue;
      b.push([ing.id, Math.round(ing.amt * (0.5 + r()) * 2) / 2]);
    }
    out.push([b.map(([x, ml]) => `${x} ${ml}`).join(', '), b]);
  }
  return out;
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

  it('is not a universal rescue: only gin, plain soda, cream or milk and a real egg white and syrup make a Ramos', () => {
    const pots: [string, number][][] = [
      [['scotch', 50], ['lemon_juice', 25], ['milk', 15], ['egg_white', 15], ['simple_syrup', 25], ['tonic_water', 90]],
      [['tequila', 50], ['grapefruit_juice', 25], ['milk', 15], ['egg_white', 15], ['simple_syrup', 25]],
      [['mezcal', 50], ['lime_juice', 25], ['heavy_cream', 15], ['egg_white', 15], ['simple_syrup', 25], ['tonic_water', 90]],
      [['mezcal', 50], ['lime_juice', 25], ['heavy_cream', 15], ['egg_white', 15], ['simple_syrup', 25], ['soda_water', 90]],
      [['vodka', 50], ['cranberry_juice', 35], ['milk', 15], ['egg_white', 15], ['simple_syrup', 15], ['cola', 90]],
      swap(RAMOS, 'gin', 'tequila'), swap(RAMOS, 'gin', 'scotch'), swap(RAMOS, 'gin', 'mezcal'),
      swap(RAMOS, 'soda_water', 'tonic_water'), swap(RAMOS, 'soda_water', 'cola'), swap(RAMOS, 'soda_water', 'ginger_beer'),
      without(RAMOS, 'soda_water'),
    ];
    for (const b of pots) expect(score(b), JSON.stringify(b)).toBeLessThanOrEqual(55);
    // a wide grid of dairy, acid, egg white, sweetener, spirit and mixer: only gin with soda is ever rescued
    let worst = 0;
    for (const sp of ['vodka', 'tequila', 'mezcal', 'scotch', 'white_rum', 'bourbon'])
      for (const ac of ['lemon_juice', 'lime_juice', 'grapefruit_juice', 'cranberry_juice'])
        for (const d of ['heavy_cream', 'milk'])
          for (const dm of [10, 15, 20, 30])
            for (const egg of [15, 25, 30])
              for (const sw of ['simple_syrup', 'honey_syrup'])
                for (const mx of [null, 'soda_water', 'tonic_water', 'cola', 'ginger_beer'])
                  for (const spm of [45, 60]) {
                    const b: [string, number][] = [[sp, spm], [ac, 25], [d, dm], ['egg_white', egg], [sw, 20]];
                    if (mx) b.push([mx, 60]);
                    worst = Math.max(worst, score(b));
                  }
    expect(worst).toBeLessThan(70);
    // and gin without the soda is not the Ramos either
    worst = 0;
    for (const ac of ['lemon_juice', 'lime_juice', 'grapefruit_juice'])
      for (const mx of [null, 'tonic_water', 'cola', 'ginger_beer'])
        for (const dm of [10, 20, 30]) {
          const b: [string, number][] = [['gin', 50], [ac, 25], ['heavy_cream', dm], ['egg_white', dm], ['simple_syrup', 20]];
          if (mx) b.push([mx, 60]);
          worst = Math.max(worst, score(b));
        }
    expect(worst).toBeLessThan(70);
  });

  it('does not offer egg white as the cure for a sweetened curdled pot either', () => {
    const pots: [string, number][][] = [
      [['tequila', 45], ['milk', 30], ['grapefruit_juice', 45], ['honey_syrup', 15]],
      [['gin', 45], ['heavy_cream', 30], ['lemon_juice', 20], ['simple_syrup', 15]],
      [['mezcal', 45], ['lime_juice', 25], ['heavy_cream', 30], ['simple_syrup', 15]],
      [['vodka', 45], ['cranberry_juice', 45], ['heavy_cream', 30], ['simple_syrup', 15]],
      [['scotch', 45], ['lemon_juice', 25], ['milk', 15], ['simple_syrup', 25], ['tonic_water', 90]],
    ];
    for (const b of pots) {
      const egg = scoreDeltas(toBrew(b))?.get('egg_white');
      expect(egg?.delta ?? 0, JSON.stringify(b)).toBeLessThanOrEqual(8);
      expect(topSuggestions(toBrew(b), 40).find((t) => t.ing.id === 'egg_white'), JSON.stringify(b)).toBeUndefined();
    }
    // the real thing: a Ramos missing only its egg white is told to add it
    expect(scoreDeltas(toBrew(without(RAMOS, 'egg_white')))?.get('egg_white')?.delta).toBeGreaterThan(20);
  });

  it('moves the score smoothly as a Ramos comes together, with no step of more than 6 points per 0.5 ml', () => {
    const bases: [string, number][][] = [
      RAMOS,
      [['gin', 50], ['lemon_juice', 25], ['simple_syrup', 15], ['heavy_cream', 15], ['egg_white', 15], ['soda_water', 45]],
      swap([['gin', 60], ['lemon_juice', 15], ['lime_juice', 15], ['simple_syrup', 30], ['heavy_cream', 30], ['egg_white', 30], ['soda_water', 60]], 'heavy_cream', 'milk'),
    ];
    for (const base of bases)
      for (const [id] of base.filter(([x]) => ['egg_white', 'simple_syrup', 'heavy_cream', 'milk'].includes(x))) {
        let prev = score(base.map(([x, v]) => [x, x === id ? 0.5 : v] as [string, number]));
        for (let ml = 1; ml <= 45; ml += 0.5) {
          const now = score(base.map(([x, v]) => [x, x === id ? ml : v] as [string, number]));
          expect(Math.abs(now - prev), `${id} ${ml} ml`).toBeLessThanOrEqual(CLASSIC_STEP);
          prev = now;
        }
      }
  });

  it('moves the score smoothly: no 0.5 ml step in any amount of any classic jumps it', () => {
    const worst = worstStep(RECIPES.map((r) => [r.id, r.build]));
    if (process.env.CALIB_LOG) console.log('classics', worst);
    expect(worst.jump, worst.at).toBeLessThanOrEqual(CLASSIC_STEP);
  });

  it('moves the score smoothly for random pots too', () => {
    const pots = randomPots(4242, 200);
    // a pot of real size (30 ml or more besides the amount being swept)
    const real = worstStep(pots, 30);
    // and any pot at all: in a 10 ml pot 0.5 ml is a twentieth of the drink, so the steps are coarser
    const any = worstStep(pots);
    if (process.env.CALIB_LOG) console.log('random', real, any);
    expect(real.jump, real.at).toBeLessThanOrEqual(CLASSIC_STEP);
    expect(any.jump, any.at).toBeLessThanOrEqual(SMALL_POT_STEP);
  });

  it('lets a small clash dim a classic shape instead of dropping it', () => {
    // a Moscow Mule with a few ml of cream is penalised in proportion, never by a 25 point step
    let prev = score([['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120]]);
    for (let ml = 0.5; ml <= 12; ml += 0.5) {
      const now = score([['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120], ['heavy_cream', ml]]);
      expect(Math.abs(now - prev), `${ml} ml cream`).toBeLessThanOrEqual(12);
      prev = now;
    }
  });

  it('lets coconut cream stand up to pineapple, as a Piña Colada does, but still sours with sharp acid', () => {
    for (const rum of [40, 50, 60]) for (const coco of [20, 30, 45]) for (const pine of [45, 60, 90]) {
      const b: [string, number][] = [['white_rum', rum], ['coconut_cream', coco], ['pineapple_juice', pine]];
      expect(score(b), JSON.stringify(b)).toBeGreaterThanOrEqual(75);
      expect(harmony(toBrew(b))?.parts.clash, JSON.stringify(b)).toBeGreaterThan(-6);
    }
    expect(score([['dark_rum', 60], ['pineapple_juice', 60], ['orange_juice', 30], ['coconut_cream', 45]])).toBeGreaterThanOrEqual(75);
    expect(score(CLASH_SUITE.coconut_cream_lime_scotch)).toBeLessThanOrEqual(55);
    const tip = (b: [string, number][]) => suggestions(harmony(toBrew(b)), toBrew(b)).some((x) => /curdle/.test(x.text));
    expect(tip(CLASH_SUITE.coconut_cream_lime_scotch)).toBe(true);
    expect(tip([['white_rum', 60], ['coconut_cream', 45], ['pineapple_juice', 90]])).toBe(false);
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
