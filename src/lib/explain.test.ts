import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { explainChange } from './explain';
import { harmony } from './harmony';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));
const NEGRONI = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
const explain = (a: BrewEntry[], b: BrewEntry[], name: string, kind?: Parameters<typeof explainChange>[3]) =>
  explainChange(harmony(a), harmony(b), name, kind);

describe('explainChange', () => {
  it('says more Campari tips a Negroni toward bitter and costs its shape', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 45], ['sweet_vermouth', 30]), 'Campari');
    expect(text).toMatch(/^More Campari tips the balance toward bitter/);
  });

  it('says less Campari pushes the balance toward sweet', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 15], ['sweet_vermouth', 30]), 'Campari', 'less');
    expect(text).toBe('Less Campari pushes the balance toward sweet.');
  });

  it('names the sour side when lime pulls a sour toward sour', () => {
    const daiquiri = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]);
    const text = explain(daiquiri, brew(['white_rum', 45], ['lime_juice', 60], ['simple_syrup', 15]), 'Lime juice');
    expect(text).toBe('More lime juice tips the balance toward sour.');
  });

  it('keeps sentence case: proper names stay capitalised, others drop to lower case mid sentence', () => {
    const text = explain(NEGRONI, brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 60]), 'Sweet vermouth');
    expect(text.startsWith('More sweet vermouth')).toBe(true);
  });

  it('calls out a clash', () => {
    const before = brew(['heavy_cream', 30], ['mezcal', 30]);
    const text = explain(before, [...before, { id: 'lime_juice', ml: 25 }], 'Lime juice', 'add');
    expect(text).toBe('Adding lime juice clashes with something already in the pot.');
  });

  it('explains a first pour without a before score', () => {
    const text = explainChange(null, harmony(brew(['gin', 30])), 'Gin', 'add');
    expect(text).toMatch(/Gin/);
    expect(text.length).toBeGreaterThan(10);
  });

  it('says so when nothing changes', () => {
    expect(explainChange(harmony(NEGRONI), harmony(NEGRONI), 'Gin', 'same')).toBe('This is the amount already in the pot.');
    const text = explain(NEGRONI, brew(['gin', 45], ['campari', 30], ['sweet_vermouth', 30]), 'Gin');
    expect(text).toBe('More gin barely changes the balance, so the score holds.');
  });

  it('describes a lone ingredient after a removal, not a crowd', () => {
    const text = explain(NEGRONI, brew(['gin', 30]), 'Campari', 'remove');
    expect(text).toBe('Taking out Campari leaves a lone ingredient, which is a pour, not a drink.');
  });

  it('handles an empty result', () => {
    expect(explainChange(harmony(brew(['gin', 30])), null, 'Gin', 'remove')).toBe('The pot would be empty.');
  });

  it('never uses dashes, emoji or all caps', () => {
    const cases: [BrewEntry[], BrewEntry[], string][] = [
      [NEGRONI, brew(['gin', 30], ['campari', 45], ['sweet_vermouth', 30]), 'Campari'],
      [NEGRONI, brew(['gin', 30], ['campari', 15], ['sweet_vermouth', 30]), 'Campari'],
      [brew(['heavy_cream', 30], ['mezcal', 30]), brew(['heavy_cream', 30], ['mezcal', 30], ['lime_juice', 25]), 'Lime juice'],
      [brew(['vodka', 45]), brew(['vodka', 45], ['coffee_liqueur', 20], ['espresso', 30]), 'Espresso'],
    ];
    for (const [a, b, name] of cases) {
      const text = explain(a, b, name);
      expect(text).not.toMatch(/[‒-―]/);
      expect(text).toMatch(/\.$/);
    }
  });
});
