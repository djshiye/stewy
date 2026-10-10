import { describe, expect, it } from 'vitest';
import { decodeBrew, encodeBrew, shareUrl } from './share';

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

  it('rejects more than 16 entries', () => {
    const ids = ['vodka', 'gin', 'white_rum', 'dark_rum', 'spiced_rum', 'tequila', 'mezcal', 'bourbon', 'rye',
      'scotch', 'cognac', 'cachaca', 'absinthe', 'triple_sec', 'grand_marnier', 'campari', 'aperol'];
    const make = (n: number) => `b=${ids.slice(0, n).map((id) => `${id}:10`).join(',')}`;
    expect(decodeBrew(make(16))?.brew).toHaveLength(16);
    expect(decodeBrew(make(17))).toBeNull();
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
