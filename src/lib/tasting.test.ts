import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { RECIPES } from '../data/recipes';
import { harmony, suggestions } from './harmony';
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

  it('says a brew only leans sweet when the sweet penalty has only partly set in', () => {
    // the tonic's bitterness sits near the line that lets it balance the syrup, so the penalty is partial
    const b = brew(['simple_syrup', 30], ['tonic_water', 14]);
    const h = harmony(b)!;
    expect(h.parts.sweetSour).toBeLessThan(-1);
    expect(h.parts.sweetSour).toBeGreaterThan(-4);
    expect(noteFor(b)).toBe('It leans too sweet, with too little sharpness to cut through it.');
  });

  it('names cream split in fizz, even when the brew keeps some of its shape', () => {
    for (const b of [
      brew(['heavy_cream', 15], ['mezcal', 45], ['ginger_beer', 120]),
      brew(['heavy_cream', 10], ['gin', 45], ['soda_water', 60]),
      brew(['heavy_cream', 15], ['mezcal', 45], ['cola', 120]),
    ]) {
      expect(harmony(b)!.score, JSON.stringify(b)).toBeGreaterThanOrEqual(40);
      expect(noteFor(b), JSON.stringify(b)).toBe('The cream splits in all that fizz, so it drinks thin and foamy.');
    }
  });

  it('names a curdle only when the score pays for one, and counts a citrus liqueur as the acid', () => {
    // a trace of lemon costs this syrupy brew a point; it is poor for being far too sweet
    expect(noteFor(brew(['heavy_cream', 5], ['simple_syrup', 45], ['lemon_juice', 0.5])))
      .toBe('It is far too sweet, with nothing sharp to cut through it.');
    // triple sec curdles the cream in the score, so the note says so instead of blaming the spirit
    expect(noteFor(brew(['heavy_cream', 10], ['vodka', 45], ['triple_sec', 15])))
      .toBe('The cream splits against the triple sec, so it drinks thin and grainy.');
  });

  it('names coconut cream against the sparkling wine, and coffee against a citrus liqueur', () => {
    expect(noteFor(brew(['coconut_cream', 30], ['champagne', 60], ['tonic_water', 60])))
      .toBe('The coconut cream splits against the champagne, so it drinks thin and grainy.');
    expect(noteFor(brew(['espresso', 25], ['grand_marnier', 30])))
      .toBe('The Grand Marnier turns the espresso sour and harsh.');
  });

  it('names the same dairy and acid as the analysis tip', () => {
    for (const b of [
      brew(['milk', 20], ['cognac', 30], ['creme_de_cacao', 20], ['lemon_juice', 5]),
      brew(['coconut_cream', 30], ['champagne', 60], ['tonic_water', 60]),
      brew(['heavy_cream', 10], ['vodka', 45], ['triple_sec', 15]),
      brew(['coffee_liqueur', 40], ['vodka', 40], ['lime_juice', 20]),
    ]) {
      const tip = suggestions(harmony(b), b).find((t) => /splits against|turns the/.test(t.text))?.text;
      expect(tip, JSON.stringify(b)).toBeDefined();
      // the tip is the note's own first clause, then the advice
      const clause = (tip ?? '').replace('. Pick one or the other.', '');
      expect(noteFor(b), JSON.stringify(b)).toMatch(new RegExp(`^${clause}[,.]`));
    }
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
