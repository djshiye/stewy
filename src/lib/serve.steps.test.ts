import { describe, expect, it } from 'vitest';
import type { BrewEntry } from '../data/types';
import { RECIPES } from '../data/recipes';
import { inlineName, measureLines, methodSteps, serveCard, serveCaption } from './serve';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));
const steps = (b: BrewEntry[], name = 'Test') => methodSteps(serveCard(b, name, 'oz'));

describe('methodSteps', () => {
  it('stirs a Negroni over one large cube and garnishes with the slice in the brew', () => {
    const s = steps(brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30], ['orange_slice', 3]));
    expect(s[0]).toBe('Add the gin, Campari and sweet vermouth to a mixing glass with ice');
    expect(s[1]).toBe('Stir for 30 seconds until the glass is frosted');
    expect(s[2]).toContain('over one large cube');
    expect(s[s.length - 1]).toBe('Garnish with an orange slice');
    expect(s.join('\n')).not.toMatch(/peel/i);
  });

  it('shakes with a crema for an Espresso Martini', () => {
    const s = steps(brew(['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]));
    expect(s.join('\n')).toMatch(/Shake hard for 15 seconds to build a thick crema/);
    expect(s.join('\n')).toMatch(/Double strain into a chilled coupe/);
  });

  it('builds a Mojito with the soda last, after pressing the mint', () => {
    const s = steps(brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60]));
    expect(s[0]).toMatch(/press the mint/);
    expect(s.some((x) => x === 'Top with soda water')).toBe(true);
    expect(s.findIndex((x) => x === 'Top with soda water')).toBeGreaterThan(s.findIndex((x) => x.startsWith('Add the white rum')));
  });

  it('rims the glass first for a salt rim', () => {
    const s = steps(brew(['tequila_blanco', 45], ['lime_juice', 25], ['triple_sec', 20], ['salt', 1]));
    expect(s[0]).toMatch(/^Rim a (coupe|rocks glass) with salt$/);
  });

  it('says everything except the soda for a long list with a fizzy top', () => {
    const s = steps(brew(['white_rum', 30], ['dark_rum', 20], ['triple_sec', 15], ['orgeat', 15], ['lime_juice', 20], ['soda_water', 30]));
    expect(s[0]).toMatch(/everything except the soda water/);
  });

  it('gives every classic 3 to 7 clean steps', () => {
    for (const r of RECIPES) {
      const card = serveCard(r.build.map(([id, ml]) => ({ id, ml })), r.name, 'oz');
      const s = methodSteps(card);
      expect(s.length, r.name).toBeGreaterThanOrEqual(3);
      expect(s.length, r.name).toBeLessThanOrEqual(7);
      for (const line of s) {
        expect(line, r.name).toMatch(/^[A-Z]/);
        expect(line, r.name).not.toMatch(/[‒-―]|undefined|\.$/);
      }
    }
  });
});

describe('measureLines', () => {
  const NEGRONI = brew(['gin', 30], ['campari', 30], ['orange_slice', 3]);
  it('puts the active unit first and ml second', () => {
    const [gin] = measureLines(NEGRONI, 'oz');
    expect([gin.name, gin.primary, gin.secondary]).toEqual(['Gin', '1 oz', '30 ml']);
  });
  it('falls back to oz beside ml when ml is the active unit', () => {
    const [gin] = measureLines(NEGRONI, 'ml');
    expect([gin.primary, gin.secondary]).toEqual(['30 ml', '1 oz']);
  });
  it('gives counted items no second unit', () => {
    const dashes = measureLines(brew(['gin', 60], ['angostura', 1.8]), 'oz')[1];
    expect(dashes.secondary).toBeNull();
    expect(dashes.primary).toBe('2 dashes');
  });
  it('leaves garnish pieces out of the measures', () => {
    expect(measureLines(NEGRONI, 'oz').map((l) => l.id)).toEqual(['gin', 'campari']);
  });
});

describe('text helpers', () => {
  it('keeps proper names and lowers the rest', () => {
    expect(inlineName('Campari')).toBe('Campari');
    expect(inlineName('Sweet vermouth')).toBe('sweet vermouth');
    expect(inlineName("Pimm's No. 1")).toBe("Pimm's No. 1");
  });
  it('captions the ice', () => {
    expect(serveCaption({ method: 'stir', glass: 'rocks' })).toBe('Served over one large cube');
    expect(serveCaption({ method: 'shake', glass: 'coupe' })).toBe('Served up');
  });
});
