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

describe('tastingNote for a brew that goes wrong', () => {
  const PRAISE = /up front|sweetness|finish|warm spice|botanicals/i;
  const sludge = brew(['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['ginger_beer', 120]);
  const noteFor = (b: BrewEntry[]) => tastingNote(harmony(b), b);

  it('names the curdle in the sludge brew and praises nothing', () => {
    const h = harmony(sludge)!;
    expect(h.score).toBeLessThan(40);
    const text = noteFor(sludge);
    expect(text).toBe('The cream splits against the lime juice, so it drinks thin and grainy.');
    expect(text).not.toMatch(PRAISE);
  });

  it('names the milk and the lemon, not the cream and the lime', () => {
    expect(noteFor(brew(['gin', 30], ['milk', 60], ['lemon_juice', 30]))).toBe('The milk splits against the lemon juice, so it drinks thin and grainy.');
  });

  it('names coffee against acid, and cream against smoke', () => {
    expect(noteFor(brew(['espresso', 40], ['lemon_juice', 30], ['vodka', 20]))).toBe('The lemon juice turns the espresso sour and harsh.');
    expect(noteFor(brew(['mezcal', 45], ['heavy_cream', 45]))).toBe('The cream smothers the mezcal, so it drinks heavy and muddy.');
  });

  it('calls out a brew that is all acid', () => {
    expect(noteFor(brew(['lemon_juice', 60], ['lime_juice', 40]))).toBe('It is far too sharp, with nothing sweet to soften it.');
  });

  it('is always one plain sentence, even without the brew to name things', () => {
    expect(tastingNote(harmony(sludge))).toMatch(/^[A-Z][^.]+\.$/);
    expect(tastingNote(harmony(sludge))).not.toMatch(PRAISE);
  });

  it('keeps today\'s line, byte for byte, for brews that score 40 or more', () => {
    const negroni = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
    expect(noteFor(negroni)).toBe(tastingNote(harmony(negroni)));
    expect(noteFor(negroni)).toBe('Bitter edge and fragrant botanicals up front, a little sweetness in the middle, a balanced finish.');
    const daiquiri = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]);
    expect(noteFor(daiquiri)).toBe(tastingNote(harmony(daiquiri)));
    expect(noteFor(daiquiri)).toBe('Sharp tartness and bright citrus up front, a round sweetness in the middle, a crisp finish.');
  });

  it('never hands a classic a fault line', () => {
    for (const r of RECIPES) {
      const b = r.build.map(([id, ml]) => ({ id, ml }));
      expect(noteFor(b), r.name).toMatch(/up front/);
    }
  });
});
