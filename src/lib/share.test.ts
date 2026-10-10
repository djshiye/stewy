import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../data/ingredients';
import { decodeBrew, encodeBrew, hasShareParam, MAX_SHARED_ENTRIES, shareUrl } from './share';

const brew = [{ id: 'gin', ml: 45 }, { id: 'lime_juice', ml: 22.5 }, { id: 'angostura', ml: 0.9 }];

describe('encodeBrew / decodeBrew', () => {
  it('uses the documented format', () => {
    expect(encodeBrew({ brew, name: 'Garden Sour' })).toBe('b=gin:45,lime_juice:22.5,angostura:0.9&n=Garden%20Sour');
  });

  it('round-trips, including awkward names', () => {
    for (const name of ['Garden Sour', 'Tom & Jerry', "Dino's 100% #1", 'Crème brûlée', 'a+b=c,d']) {
      expect(decodeBrew(encodeBrew({ brew, name }))).toEqual({ brew, name });
    }
  });

  it('rounds amounts to 0.1 ml', () => {
    expect(encodeBrew({ brew: [{ id: 'gin', ml: 30.04 }, { id: 'vodka', ml: 12.36 }], name: '' }))
      .toBe('b=gin:30,vodka:12.4&n=');
  });

  it('accepts a leading # and a missing name', () => {
    expect(decodeBrew('#b=gin:30')).toEqual({ brew: [{ id: 'gin', ml: 30 }], name: '' });
  });

  it('trims the name to 40 characters', () => {
    const out = decodeBrew(encodeBrew({ brew, name: `  ${'x'.repeat(60)}  ` }));
    expect(out?.name).toBe('x'.repeat(40));
  });

  it('survives a name that cannot be encoded', () => {
    expect(decodeBrew(encodeBrew({ brew, name: 'bad\ud800' }))?.brew).toEqual(brew);
  });
});

describe('decodeBrew rejects bad input', () => {
  const bad = [
    '', 'garbage', 'b=', 'n=Name', 'b=gin', 'b=gin:', 'b=gin:abc', 'b=gin:-5', 'b=gin:0', 'b=gin:0.04',
    'b=gin:1001', 'b=gin:1e2', 'b=nope:30', 'b=gin:30,,vodka:30', 'b=gin:30,gin:10', 'b=__proto__:30', 'b=constructor:30',
    'b=gin:Infinity', 'b=gin:NaN', 'b=gin:30,nope:10',
  ];
  for (const f of bad) {
    it(`rejects ${JSON.stringify(f)}`, () => expect(decodeBrew(f)).toBeNull());
  }

  it('accepts every ingredient once and nothing beyond that', () => {
    const all = INGREDIENTS.map((i) => ({ id: i.id, ml: 10 }));
    expect(MAX_SHARED_ENTRIES).toBe(all.length);
    expect(decodeBrew(encodeBrew({ brew: all, name: 'Everything' }))?.brew).toHaveLength(all.length);
    const over = `b=${all.map((e) => `${e.id}:10`).join(',')},${all[0].id}:10`;
    expect(decodeBrew(over)).toBeNull();
  });

  it('round-trips 17 and more ingredients, so a copied link always opens', () => {
    for (const n of [16, 17, 25, 40]) {
      const many = INGREDIENTS.slice(0, n).map((i, k) => ({ id: i.id, ml: 10 + k }));
      expect(decodeBrew(encodeBrew({ brew: many, name: 'Big' }))).toEqual({ brew: many, name: 'Big' });
    }
  });

  it('accepts exactly 1000 ml', () => {
    expect(decodeBrew('b=gin:1000')?.brew[0].ml).toBe(1000);
  });
});

describe('shareUrl', () => {
  it('joins the base and the fragment', () => {
    expect(shareUrl({ brew, name: 'X' }, 'https://stewy.app/')).toBe(`https://stewy.app/#${encodeBrew({ brew, name: 'X' })}`);
  });
});

describe('hasShareParam', () => {
  it('tells an attempted share link from any other hash', () => {
    expect(hasShareParam('#b=gin:30&n=X')).toBe(true);
    expect(hasShareParam('b=nope:30')).toBe(true);
    expect(hasShareParam('#b=')).toBe(true);
    expect(hasShareParam('')).toBe(false);
    expect(hasShareParam('#main')).toBe(false);
    expect(hasShareParam('#n=Name')).toBe(false);
  });
});
