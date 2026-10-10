import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { RECIPES } from '../data/recipes';
import { harmony } from './harmony';
import { tastingNote } from './tasting';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));
const note = (b: BrewEntry[]) => tastingNote(harmony(b));

describe('tastingNote', () => {
  it('is empty for an empty pot', () => {
    expect(tastingNote(null)).toBe('');
  });

  it('reads bitter for a Negroni', () => {
    expect(note(brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]))).toMatch(/bitter/i);
  });

  it('reads coffee for an Espresso Martini', () => {
    expect(note(brew(['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]))).toMatch(/coffee/i);
  });

  it('reads fresh, herbal or citrus for a Mojito', () => {
    expect(note(brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60])))
      .toMatch(/citrus|fresh|herbal/i);
  });

  it('tells a Daiquiri from a Negroni', () => {
    const a = note(brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]));
    const b = note(brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]));
    expect(a).not.toBe(b);
  });

  it('is deterministic', () => {
    const b = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
    expect(note(b)).toBe(note(b));
  });

  it('is one plain sentence for every classic', () => {
    for (const r of RECIPES) {
      const text = note(r.build.map(([id, ml]) => ({ id, ml })));
      expect(text, r.name).toMatch(/^[A-Z][^.]+\.$/);
      expect(text, r.name).not.toMatch(/[‒-―]|undefined/);
    }
  });
});
