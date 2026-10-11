import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { INGREDIENTS, ING_BY_ID } from '../data/ingredients';
import { RECIPES } from '../data/recipes';
import { harmony, isPoorBrew, suggestions } from './harmony';
import { scoreDeltas, topSuggestions } from './coach';
import { perPiece } from './units';

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

/** Worst score step per 0.5 ml, measured over the sweeps below plus a point of headroom. "Rest" is the
    other liquid in the pot besides the amount being swept.
    - CLASSIC_STEP: every amount of every classic (5 measured) and the absinthe sour (5).
    - REAL_POT_STEP: random pots with 30 ml or more of rest, outside the dairy and acid family (6 measured
      over 20 seeds of 200 pots; the test runs 10 seeds of 100).
    - SMALL_POT_STEP: the same with 10 to 30 ml of rest (12 measured: 0.5 ml of cranberry juice against
      13 ml of syrup is a twenty-sixth of the drink, and turns a lone syrup into a sour). Under 10 ml of
      rest there is no bound: 0.5 ml can be most of the pot, and then the flavour itself changes.
    - DAIRY_ACID_STEP: dairy (cream, milk, Irish cream) with anything sour or citrus. Any real acid
      curdles the dairy, costs its own points and spoils the shape, and that has to happen within a few ml,
      so this family steps harder. Measured on the grid below and the random family: 18, 15, 12 and 8 for
      10, 30, 60 and 90 ml of rest. */
const CLASSIC_STEP = 6;
const REAL_POT_STEP = 7;
const SMALL_POT_STEP = 13;
const DAIRY_ACID_STEP: [minRest: number, step: number][] = [[90, 9], [60, 13], [30, 16], [10, 19]];
/** Worst change per counted piece or dash added to a classic, one to four of them: a sugar cube is 4 ml of
    syrup at once (16 measured, a third cube in a Brandy Alexander); every other piece and dash moves a
    classic far less (5 measured, an orange slice in a White Russian). */
const SUGAR_CUBE_STEP = 17;
const PIECE_STEP = 6;

const DAIRY = new Set(['heavy_cream', 'milk', 'irish_cream']);
/** Dairy with any liquid that is sour or citrus: the curdle family. */
const dairyAcid = (b: [string, number][]) =>
  b.some(([x]) => DAIRY.has(x)) &&
  b.some(([x]) => { const g = ING_BY_ID[x]; return !!g && !g.unit && (g.tags.sour ?? 0) + (g.tags.citrus ?? 0) > 0; });

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

interface Step { jump: number; at: string; rest: number }

/** Every score change between neighbouring 0.5 ml steps as each liquid amount in each brew is swept from
    0.5 ml to `max` ml (by default 120 ml, or 2.5 times its amount if more) with the rest held. */
function steps(brews: [string, [string, number][]][], max?: number): Step[] {
  const out: Step[] = [];
  for (const [name, base] of brews)
    base.forEach(([id, amt], i) => {
      if (ING_BY_ID[id]?.unit) return;
      const rest = base.reduce((t, [x, ml], j) => t + (j === i || ING_BY_ID[x]?.unit ? 0 : ml), 0);
      const top = max ?? Math.max(120, 2.5 * amt);
      let prev = score(base.map(([x, v], j) => [x, j === i ? 0.5 : v] as [string, number]));
      for (let ml = 1; ml <= top; ml += 0.5) {
        const now = score(base.map(([x, v], j) => [x, j === i ? ml : v] as [string, number]));
        out.push({ jump: Math.abs(now - prev), at: `${name}: ${id} ${ml - 0.5} to ${ml} ml, ${prev} to ${now} (rest ${rest} ml)`, rest });
        prev = now;
      }
    });
  return out;
}

/** The biggest step among those with at least `minRest` ml of rest (and below `maxRest`). */
function worst(xs: Step[], minRest = 0, maxRest = Infinity): Step {
  return xs.reduce((w, x) => (x.rest >= minRest && x.rest < maxRest && x.jump > w.jump ? x : w), { jump: 0, at: 'none', rest: 0 });
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
    const w = worst(steps(RECIPES.map((r) => [r.id, r.build])));
    if (process.env.CALIB_LOG) console.log('classics', w);
    expect(w.jump, w.at).toBeLessThanOrEqual(CLASSIC_STEP);
  });

  it('moves the score smoothly for random pots too, across many seeds', () => {
    const pots: [string, [string, number][]][] = [];
    for (let seed = 1; seed <= 10; seed++) pots.push(...randomPots(seed, 100));
    const plain = steps(pots.filter(([, b]) => !dairyAcid(b)));
    const curdle = steps(pots.filter(([, b]) => dairyAcid(b)));
    const real = worst(plain, 30), small = worst(plain, 10, 30);
    if (process.env.CALIB_LOG) console.log('random', real, small, DAIRY_ACID_STEP.map(([r]) => worst(curdle, r)));
    expect(real.jump, real.at).toBeLessThanOrEqual(REAL_POT_STEP);
    expect(small.jump, small.at).toBeLessThanOrEqual(SMALL_POT_STEP);
    for (const [rest, bound] of DAIRY_ACID_STEP) {
      const w = worst(curdle, rest);
      expect(w.jump, w.at).toBeLessThanOrEqual(bound);
    }
  }, 60000);

  it('bounds the dairy and acid family where it steps hardest: the first ml of acid into dairy, and back', () => {
    // Kahlua and milk, Irish cream, a White Russian and friends, each met by every kind of acid
    const companions: [string, number][][] = [
      [], [['coffee_liqueur', 15]], [['vodka', 45]], [['vodka', 50], ['coffee_liqueur', 20]], [['gin', 45], ['simple_syrup', 15]],
      [['amaretto', 30]], [['bourbon', 60]],
    ];
    const acids = ['lemon_juice', 'lime_juice', 'orange_juice', 'grapefruit_juice', 'cranberry_juice', 'pineapple_juice', 'passion_fruit'];
    const xs: Step[] = [];
    for (const d of ['heavy_cream', 'milk', 'irish_cream']) for (const ml of [10, 15, 20, 30, 45, 90]) for (const c of companions)
      for (const ac of acids) {
        // the acid swept into the dairy, and the dairy swept into the acid
        const into = steps([[`${d} ${ml}, ${ac}`, [[d, ml], ...c, [ac, 15]]]], 30).filter((x) => x.at.includes(`: ${ac} `));
        const back = steps([[`${ac} ${ml}, ${d}`, [[d, 15], ...c, [ac, ml]]]], 30).filter((x) => x.at.includes(`: ${d} `));
        xs.push(...into, ...back);
      }
    if (process.env.CALIB_LOG) console.log('dairy and acid', DAIRY_ACID_STEP.map(([r]) => worst(xs, r)));
    for (const [rest, bound] of DAIRY_ACID_STEP) {
      const w = worst(xs, rest);
      expect(w.jump, w.at).toBeLessThanOrEqual(bound);
    }
    // the first half ml of lemon into Kahlua and milk was an 18 point step, and Irish cream with lime 17
    for (const b of [[['milk', 20], ['coffee_liqueur', 15]], [['irish_cream', 30]]] as [string, number][][]) {
      const acid = b.length > 1 ? 'lemon_juice' : 'lime_juice';
      const jump = Math.abs(score([...b, [acid, 1]]) - score([...b, [acid, 0.5]]));
      expect(jump, JSON.stringify(b)).toBeLessThanOrEqual(16);
    }
  }, 60000);

  it('fades a strong absinthe into a sour as gently as any spirit', () => {
    // at 68% a 0.5 ml step moves the alcohol share nearly twice as fast as a 40% spirit does
    const w = worst(steps([['absinthe sour', [['absinthe', 5], ['lemon_juice', 25], ['simple_syrup', 15]]]], 40).filter((x) => x.at.includes(': absinthe ')));
    expect(w.jump, w.at).toBeLessThanOrEqual(CLASSIC_STEP);
  });

  it('scores a classic halved, or made at two thirds, as the whole one', () => {
    const off: string[] = [];
    for (const r of RECIPES) for (const k of [0.5, 0.67]) {
      // the Ramos needs a real pour of cream (16 ml or more) for its egg white to hold, so it is not
      // made by the half; counted pieces and dashes stay as they are
      if (r.id === 'ramos_gin_fizz' && k === 0.5) continue;
      const scaled = r.build.map(([id, ml]) => [id, ING_BY_ID[id]?.unit ? ml : ml * k] as [string, number]);
      const a = harmony(toBrew(r.build)), b = harmony(toBrew(scaled));
      if (b?.archetype !== a?.archetype || Math.abs((b?.score ?? 0) - (a?.score ?? 0)) > 1)
        off.push(`${r.id} at ${k}: ${a?.score} ${a?.archetype} to ${b?.score} ${b?.archetype}`);
    }
    expect(off).toEqual([]);
    // the Grasshopper at 20 ml each scored 77, not 83, when small pots widened its flavour bands
    expect(score([['creme_de_menthe', 20], ['creme_de_cacao', 20], ['heavy_cream', 20]])).toBe(score(RECIPES.find((r) => r.id === 'grasshopper')!.build));
  });

  it('moves a classic by a bounded amount per counted piece or dash', () => {
    let cube = { jump: 0, at: 'none' }, other = { jump: 0, at: 'none' };
    for (const r of RECIPES) for (const ing of INGREDIENTS.filter((i) => i.unit)) {
      const held = r.build.find(([x]) => x === ing.id)?.[1] ?? 0;
      const rest = r.build.filter(([x]) => x !== ing.id);
      const at = (k: number) => score(held + k * perPiece(ing) > 0 ? [...rest, [ing.id, held + k * perPiece(ing)]] : rest);
      for (let k = 1; k <= 4; k++) {
        const jump = Math.abs(at(k) - at(k - 1));
        const step = { jump, at: `${r.id} + ${k} ${ing.id}: ${at(k - 1)} to ${at(k)}` };
        if (ing.id === 'sugar_cube') { if (jump > cube.jump) cube = step; } else if (jump > other.jump) other = step;
      }
    }
    if (process.env.CALIB_LOG) console.log('pieces', cube, other);
    expect(cube.jump, cube.at).toBeLessThanOrEqual(SUGAR_CUBE_STEP);
    expect(other.jump, other.at).toBeLessThanOrEqual(PIECE_STEP);
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

  it('labels a brew with the shape that pays its bonus', () => {
    // more than half a dessert (bonus 8) but all of a spirit-forward drink (bonus 7): the spirit-forward
    // shape pays more, so it names the brew, where the first shape at half used to
    expect(harmony(toBrew([['creme_de_menthe', 29], ['vodka', 44.5], ['irish_cream', 28]]))?.archetype).toBe('spirit-forward');
    // a third of a spirit-forward drink pays a little bonus, but a brew that is all sour reads as a sour
    expect(harmony(toBrew([['lillet_blanc', 22.5], ['pineapple_juice', 63], ['bourbon', 56]]))?.archetype).toBe('sour');
    // a Mimosa is all sparkling (no bonus) and most of a highball, which pays
    expect(harmony(toBrew([['champagne', 75], ['orange_juice', 75]]))?.archetype).toBe('highball');
  });

  it('curdles nothing with a garnish slice, a dash of bitters or a trace of juice', () => {
    const russian: [string, number][] = [['vodka', 50], ['coffee_liqueur', 20], ['heavy_cream', 30]];
    for (const extra of [['orange_slice', 3], ['orange_slice', 6], ['orange_bitters', 1.8], ['lemon_juice', 0.5]] as [string, number][]) {
      const h = harmony(toBrew([...russian, extra]));
      // the coffee and citrus still pull apart a little, but there is no curdle (19 points or more)
      expect(h?.parts.clash, extra.join(' ')).toBeGreaterThan(-4);
      expect(h?.score, extra.join(' ')).toBeGreaterThanOrEqual(74);
    }
  });

  it('always counts cream split in fizz as a poor brew, however much shape it keeps', () => {
    let poor = 0, all = 0;
    for (const d of ['heavy_cream', 'milk']) for (const dm of [10, 15, 20, 30])
      for (const sp of ['vodka', 'gin', 'mezcal', 'white_rum', 'bourbon']) for (const mx of ['soda_water', 'tonic_water', 'ginger_beer', 'cola'])
        for (const mm of [60, 90, 120]) {
          const h = harmony(toBrew([[d, dm], [sp, 45], [mx, mm]]))!;
          all++;
          if (isPoorBrew(h)) poor++;
          // a full split clashes 19 points; anything that clashes that hard is poor
          if (h.parts.clash <= -19) expect(isPoorBrew(h), `${d} ${dm} ${sp} ${mx} ${mm}`).toBe(true);
        }
    // 161 of 480 were poor before the shape learnt to survive a clash, and 48 just after
    expect(poor).toBeGreaterThanOrEqual(161);
    expect(all).toBe(480);
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
