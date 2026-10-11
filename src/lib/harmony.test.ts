import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { coffeeAcidClashes, curdles, describe as describeIng, flavorNotes, harmony, suggestions, VERDICT } from './harmony';

/** Frozen copies of the 18 original classics, so the lock does not move with recipe data. */
const CLASSICS: Record<string, [string, number][]> = {
  margarita: [['tequila', 50], ['triple_sec', 20], ['lime_juice', 25], ['salt', 1]],
  mojito: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60]],
  old_fashioned: [['bourbon', 60], ['simple_syrup', 10], ['angostura', 2], ['orange_slice', 3]],
  negroni: [['gin', 30], ['campari', 30], ['sweet_vermouth', 30]],
  daiquiri: [['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]],
  cosmopolitan: [['vodka', 40], ['triple_sec', 15], ['cranberry_juice', 30], ['lime_juice', 15]],
  martini: [['gin', 60], ['dry_vermouth', 10], ['olive', 3]],
  whiskey_sour: [['bourbon', 45], ['lemon_juice', 25], ['simple_syrup', 15], ['egg_white', 20]],
  mai_tai: [['white_rum', 40], ['dark_rum', 20], ['triple_sec', 15], ['orgeat', 15], ['lime_juice', 20]],
  moscow_mule: [['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120]],
  aperol_spritz: [['aperol', 60], ['prosecco', 90], ['soda_water', 30]],
  pina_colada: [['white_rum', 50], ['coconut_cream', 30], ['pineapple_juice', 90]],
  espresso_martini: [['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]],
  manhattan: [['rye', 60], ['sweet_vermouth', 30], ['angostura', 2], ['cherry', 3]],
  gin_tonic: [['gin', 50], ['tonic_water', 150], ['lime_juice', 5]],
  bloody_mary: [['vodka', 45], ['tomato_juice', 90], ['lemon_juice', 15]],
  cuba_libre: [['white_rum', 50], ['cola', 120], ['lime_juice', 10]],
  french_martini: [['vodka', 45], ['peach_schnapps', 15], ['pineapple_juice', 45]],
};

const EDGES: Record<string, [string, number][]> = {
  single_vodka: [['vodka', 45]],
  single_syrup: [['simple_syrup', 30]],
  single_lime: [['lime_juice', 30]],
  only_soda: [['soda_water', 120]],
  soda_and_tonic: [['soda_water', 60], ['tonic_water', 60]],
  only_salt: [['salt', 1]],
  salt_and_soda: [['salt', 1], ['soda_water', 90]],
  cream_lime: [['heavy_cream', 40], ['lime_juice', 25]],
  cream_lemon_gin: [['gin', 45], ['heavy_cream', 30], ['lemon_juice', 20]],
  cream_mezcal: [['mezcal', 45], ['heavy_cream', 30]],
  coffee_citrus: [['espresso', 40], ['lemon_juice', 25]],
  coffee_orange: [['espresso', 30], ['orange_juice', 60], ['coffee_liqueur', 20]],
  eight_ingredients: [
    ['gin', 30], ['campari', 15], ['sweet_vermouth', 15], ['lime_juice', 10],
    ['simple_syrup', 10], ['angostura', 2], ['mint', 4], ['soda_water', 40],
  ],
  nine_ingredients: [
    ['vodka', 20], ['gin', 20], ['white_rum', 20], ['tequila', 20], ['triple_sec', 15],
    ['lime_juice', 15], ['lemon_juice', 10], ['cola', 30], ['simple_syrup', 5],
  ],
  seven_ingredients: [
    ['bourbon', 40], ['sweet_vermouth', 20], ['amaretto', 10], ['angostura', 2],
    ['orange_bitters', 1], ['cherry', 3], ['orange_slice', 3],
  ],
  very_sweet: [['simple_syrup', 40], ['grenadine', 20], ['vodka', 10]],
  very_sweet_liqueur: [['amaretto', 45], ['irish_cream', 30], ['honey_syrup', 20]],
  very_sour: [['lemon_juice', 60], ['lime_juice', 30], ['gin', 10]],
  very_bitter: [['campari', 60], ['angostura', 4], ['espresso', 30]],
  bitters_only: [['angostura', 6], ['orange_bitters', 4]],
  empty_tag_mix: [['salt', 1], ['soda_water', 60], ['salt', 1]],
  zero_volume: [['gin', 0]],
  unknown_ids: [['not_an_ingredient', 30], ['gin', 45]],
  only_unknown: [['not_an_ingredient', 30]],
  egg_sour: [['bourbon', 45], ['lemon_juice', 25], ['simple_syrup', 15], ['egg_white', 20]],
  coconut_rum: [['white_rum', 45], ['coconut_cream', 40], ['pineapple_juice', 60]],
  smoky_citrus: [['mezcal', 50], ['lime_juice', 25], ['agave', 15]],
  big_pour: [['gin', 120], ['tonic_water', 300]],
  tiny_amounts: [['gin', 0.5], ['lime_juice', 0.5], ['simple_syrup', 0.5]],
};

const IDS = [
  'vodka', 'gin', 'white_rum', 'dark_rum', 'spiced_rum', 'tequila', 'mezcal', 'bourbon', 'rye', 'scotch',
  'cognac', 'cachaca', 'absinthe', 'triple_sec', 'grand_marnier', 'campari', 'aperol', 'sweet_vermouth',
  'dry_vermouth', 'amaretto', 'coffee_liqueur', 'irish_cream', 'blue_curacao', 'elderflower', 'maraschino',
  'chartreuse', 'peach_schnapps', 'lime_juice', 'lemon_juice', 'orange_juice', 'pineapple_juice',
  'cranberry_juice', 'grapefruit_juice', 'tomato_juice', 'coconut_cream', 'soda_water', 'tonic_water',
  'cola', 'ginger_beer', 'ginger_ale', 'lemon_lime_soda', 'prosecco', 'simple_syrup', 'grenadine', 'orgeat',
  'honey_syrup', 'agave', 'sugar_cube', 'angostura', 'orange_bitters', 'egg_white', 'heavy_cream', 'milk',
  'espresso', 'mint', 'cucumber', 'salt', 'cherry', 'orange_slice', 'olive',
];
const AMOUNTS = [0.9, 1, 2, 3, 5, 8, 10, 15, 20, 25, 30, 45, 60, 90, 120, 200];

/** Small deterministic PRNG (mulberry32) for the sweep. */
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 400 pseudo-random brews of 1..9 original ingredients. */
function sweep(): BrewEntry[][] {
  const r = rng(20240607);
  const out: BrewEntry[][] = [];
  for (let i = 0; i < 400; i++) {
    const n = 1 + Math.floor(r() * 9);
    const brew: BrewEntry[] = [];
    for (let k = 0; k < n; k++) {
      brew.push({ id: IDS[Math.floor(r() * IDS.length)], ml: AMOUNTS[Math.floor(r() * AMOUNTS.length)] });
    }
    out.push(brew);
  }
  return out;
}

const toBrew = (b: [string, number][]): BrewEntry[] => b.map(([id, ml]) => ({ id, ml }));
const sc = (b: BrewEntry[]) => {
  const h = harmony(b);
  return h ? [h.score, h.tier] : null;
};

describe('harmony score lock (must not move across refactors)', () => {
  it('classics', () => {
    const out = Object.fromEntries(Object.entries(CLASSICS).map(([k, v]) => [k, sc(toBrew(v))]));
    expect(out).toMatchSnapshot();
  });

  it('edge brews', () => {
    const out = Object.fromEntries(Object.entries(EDGES).map(([k, v]) => [k, sc(toBrew(v))]));
    expect(Object.keys(EDGES).length).toBeGreaterThanOrEqual(15);
    expect(out).toMatchSnapshot();
  });

  it('empty brew has no harmony', () => {
    expect(harmony([])).toBeNull();
  });

  it('seeded sweep', () => {
    const scores = sweep().map((b) => harmony(b)?.score ?? 0);
    // one line per 20 scores keeps the snapshot readable
    const lines: string[] = [];
    for (let i = 0; i < scores.length; i += 20) lines.push(scores.slice(i, i + 20).join(' '));
    expect(lines).toMatchSnapshot();
  });
});

const allBrews = (): BrewEntry[][] => [
  ...Object.values(CLASSICS).map(toBrew),
  ...Object.values(EDGES).map(toBrew),
  ...sweep(),
];

describe('harmony breakdown', () => {
  it('parts add up to the score (rounded and clamped)', () => {
    for (const b of allBrews()) {
      const h = harmony(b);
      if (!h) continue;
      const total = Object.values(h.parts).reduce((a, v) => a + v, 0);
      expect(Math.min(99, Math.max(3, Math.round(total)))).toBe(h.score);
    }
  });

  it('has the base term of a normal brew and a flat 42 for flavourless ones', () => {
    expect(harmony(toBrew(CLASSICS.negroni))?.parts.base).toBe(55);
    const flat = harmony(toBrew(EDGES.only_soda));
    expect(flat?.score).toBe(42);
    expect(flat?.parts.base).toBe(42);
    expect(flat?.balance).toBeNull();
  });

  it('reports penalties as negative points', () => {
    const creamy = harmony(toBrew(EDGES.cream_lime));
    expect(creamy?.parts.clash).toBeLessThan(0);
    expect(harmony(toBrew(EDGES.single_vodka))?.parts.crowd).toBe(-6);
    expect(harmony(toBrew(EDGES.nine_ingredients))?.parts.crowd).toBe(-12);
    expect(harmony(toBrew(EDGES.very_sweet))?.parts.sweetSour).toBeLessThan(0);
  });

  it('balance leans the right way', () => {
    expect(harmony(toBrew(EDGES.very_sweet_liqueur))?.balance).toBeGreaterThan(0.5);
    expect(harmony(toBrew(EDGES.very_sour))?.balance).toBeLessThan(-0.5);
    expect(harmony(toBrew(EDGES.very_bitter))?.balance).toBeLessThan(-0.5);
    expect(harmony(toBrew(EDGES.single_syrup))?.balance).toBe(1);
    const daiquiri = harmony(toBrew(CLASSICS.daiquiri))?.balance;
    expect(Math.abs(daiquiri ?? 1)).toBeLessThan(0.5);
  });

  it('has no balance without sweet, sour or bitter', () => {
    expect(harmony(toBrew(EDGES.single_vodka))?.balance).toBeNull();
  });
});

describe('copy', () => {
  it('uses plain, sentence-case verdict copy for an empty pot', () => {
    expect(VERDICT.none).toBe('Waiting for ingredients');
  });

  it('describes an ingredient by its top notes without ABV', () => {
    expect(flavorNotes(ING_BY_ID.mezcal)[0]).toBe('boozy');
    expect(flavorNotes(ING_BY_ID.mezcal)).toHaveLength(3);
    expect(describeIng(ING_BY_ID.mezcal)).toBe('Boozy, smoky and herbal');
    expect(describeIng(ING_BY_ID.vodka)).toBe('Boozy');
    expect(describeIng(ING_BY_ID.vodka)).not.toMatch(/ABV|%/);
    expect(flavorNotes(ING_BY_ID.soda_water)).toEqual([]);
    expect(describeIng(ING_BY_ID.soda_water)).toBe('Neutral');
  });

  it('suggestions never contain dashes or dot chains', () => {
    for (const b of allBrews()) {
      for (const sg of suggestions(harmony(b), b)) {
        expect(sg.text).not.toMatch(/[\u2014\u2013]| \u00b7 /);
      }
    }
    expect(suggestions(null, []).length).toBe(1);
  });

  it('praises only a brew that scores 80 or more, whatever is left to warn about', () => {
    // these used to open with 'Beautifully balanced and ready to pour.' under a 'Cursed sludge' verdict
    const sludge = [
      toBrew([['espresso', 30], ['lemon_juice', 25], ['gin', 45]]),
      toBrew([['mezcal', 45], ['heavy_cream', 30]]),
      toBrew([['cranberry_juice', 58.5], ['absinthe', 3], ['espresso', 19]]),
    ];
    const heads = [
      'The lemon juice turns the espresso sour and harsh. Pick one or the other.',
      'The flavours fight each other, so nothing here comes together.',
      'The cranberry juice turns the espresso sour and harsh. Pick one or the other.',
    ];
    sludge.forEach((b, i) => {
      const [head] = suggestions(harmony(b), b);
      expect(harmony(b)!.score, JSON.stringify(b)).toBeLessThan(42);
      expect(head.text, JSON.stringify(b)).toBe(heads[i]);
      expect(head.kind, JSON.stringify(b)).toBe('bad');
    });
    // a White Russian with an orange slice scores in the 70s: plain, not praised
    const russian = toBrew([['vodka', 50], ['coffee_liqueur', 20], ['heavy_cream', 30], ['orange_slice', 3]]);
    expect(suggestions(harmony(russian), russian)[0].text).toBe('A good brew with room to grow.');
    for (const b of allBrews()) {
      const h = harmony(b);
      const praised = suggestions(h, b).some((s) => s.kind === 'good');
      expect(praised, JSON.stringify(b)).toBe((h?.score ?? 0) >= 80);
    }
  });

  it('still warns about curdling when the cream is topped up with a long mixer', () => {
    const b = toBrew([['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['ginger_beer', 120]]);
    expect(suggestions(harmony(b), b).map((s) => s.text)).toContain('The cream splits against the lime juice. Pick one or the other.');
  });

  it('names the dairy and the acid that split, as the tasting note does', () => {
    const tip = (xs: [string, number][]) => {
      const b = toBrew(xs);
      const found = suggestions(harmony(b), b).find((s) => /split/.test(s.text));
      expect(found?.kind, JSON.stringify(xs)).toBe('bad');
      return found?.text;
    };
    expect(tip([['milk', 20], ['cognac', 30], ['creme_de_cacao', 20], ['lemon_juice', 5]]))
      .toBe('The milk splits against the lemon juice. Pick one or the other.');
    expect(tip([['heavy_cream', 30], ['gin', 45], ['grapefruit_juice', 40]]))
      .toBe('The cream splits against the grapefruit juice. Pick one or the other.');
    // coconut cream only splits against sharp acid, and sparkling wine and tonic are not citrus
    expect(tip([['coconut_cream', 30], ['champagne', 60], ['tonic_water', 60]]))
      .toBe('The coconut cream splits against the champagne. Pick one or the other.');
    expect(tip([['irish_cream', 40], ['vodka', 30], ['lime_juice', 25]]))
      .toBe('The Irish cream splits against the lime juice. Pick one or the other.');
  });

  it('names the coffee and the acid when coffee meets acid, with or without a curdle', () => {
    const heads = (xs: [string, number][]) => { const b = toBrew(xs); return suggestions(harmony(b), b); };
    expect(heads([['coffee_liqueur', 40], ['vodka', 40], ['lime_juice', 20]])[0])
      .toEqual({ text: 'The lime juice turns the coffee liqueur sour and harsh. Pick one or the other.', kind: 'bad' });
    // no juice at all: the citrus liqueur is the acid
    expect(heads([['espresso', 25], ['grand_marnier', 30]])[0].text)
      .toBe('The Grand Marnier turns the espresso sour and harsh. Pick one or the other.');
    // a trace of acid costs under 5 points and is not worth a tip
    const trace = toBrew([['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['lemon_juice', 1]]);
    expect(coffeeAcidClashes(harmony(trace)!)).toBe(false);
    expect(suggestions(harmony(trace), trace).some((s) => /harsh/.test(s.text))).toBe(false);
    // the classic Espresso Martini is clean
    const em = toBrew(CLASSICS.espresso_martini);
    expect(coffeeAcidClashes(harmony(em)!)).toBe(false);
  });

  it('puts a warning ahead of the praise, never beside it: a curdle at 80 or more drops the praise', () => {
    // scores 80 or more yet pays more than 5 points of curdle
    const curdled80 = [
      toBrew([['coconut_cream', 28], ['campari', 34.5], ['egg_white', 21.5], ['cognac', 62.5]]),
      toBrew([['cachaca', 47.5], ['campari', 19.5], ['heavy_cream', 42.5], ['tequila', 39]]),
    ];
    for (const b of curdled80) {
      const h = harmony(b)!;
      expect(h.score, JSON.stringify(b)).toBeGreaterThanOrEqual(80);
      expect(curdles(h)).toBe(true);
      const tips = suggestions(h, b);
      expect(tips[0].kind).toBe('bad');
      expect(tips.some((s) => s.kind === 'good')).toBe(false);
    }
    // a mild coffee clash on a brew that still scores 80 is a plain warning, so the praise stays
    const mild = toBrew([['tequila', 42], ['espresso', 16.5], ['pineapple_juice', 64.5]]);
    const hm = harmony(mild)!;
    expect(hm.score).toBeGreaterThanOrEqual(80);
    expect(coffeeAcidClashes(hm)).toBe(true);
    expect(suggestions(hm, mild).map((s) => s.kind)).toEqual(['good', 'warn']);
  });

  it('never praises next to a bad tip, across every brew in the suite', () => {
    for (const b of allBrews()) {
      const tips = suggestions(harmony(b), b);
      if (tips.some((s) => s.kind === 'bad')) expect(tips.some((s) => s.kind === 'good'), JSON.stringify(b)).toBe(false);
    }
  });
});
