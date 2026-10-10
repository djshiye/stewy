import { describe, expect, it } from 'vitest';
import type { BrewEntry, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { RECIPE_BY_ID } from '../data/recipes';
import {
  brewStats, DILUTION, inferGarnish, inferGlass, inferMethod, methodLine, recipeText, serveCard,
} from './serve';

const brew = (...xs: [string, number][]): BrewEntry[] => xs.map(([id, ml]) => ({ id, ml }));

const NEGRONI = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30]);
const DAIQUIRI = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15]);
const MOJITO = brew(['white_rum', 45], ['lime_juice', 25], ['simple_syrup', 15], ['mint', 8], ['soda_water', 60]);
const MULE = brew(['vodka', 45], ['lime_juice', 15], ['ginger_beer', 120]);
const SPRITZ = brew(['aperol', 60], ['prosecco', 90], ['soda_water', 30]);
const GIN_TONIC = brew(['gin', 50], ['tonic_water', 150], ['lime_juice', 5]);
const ESPRESSO = brew(['vodka', 40], ['coffee_liqueur', 20], ['espresso', 30], ['simple_syrup', 5]);
const MARTINI = brew(['gin', 60], ['dry_vermouth', 10], ['olive', 3]);
const JULEP = brew(['bourbon', 60], ['simple_syrup', 10], ['mint', 8]);

const infer = (b: BrewEntry[], match: Recipe | null = null) => {
  const method = inferMethod(b, match);
  return { method, glass: inferGlass(b, method, match) };
};

describe('inference from the brew alone (no matched classic)', () => {
  it('stirs spirit-forward drinks into rocks', () => {
    expect(infer(NEGRONI)).toEqual({ method: 'stir', glass: 'rocks' });
  });
  it('shakes citrus drinks into a coupe', () => {
    expect(infer(DAIQUIRI)).toEqual({ method: 'shake', glass: 'coupe' });
    expect(infer(ESPRESSO)).toEqual({ method: 'shake', glass: 'coupe' });
  });
  it('builds fizzy drinks in a highball', () => {
    expect(infer(MOJITO)).toEqual({ method: 'build', glass: 'highball' });
    expect(infer(GIN_TONIC)).toEqual({ method: 'build', glass: 'highball' });
  });
  it('puts vodka and ginger beer in a copper mug', () => {
    expect(infer(MULE)).toEqual({ method: 'build', glass: 'copper-mug' });
  });
  it('serves sparkling wine drinks in wine glass or flute', () => {
    expect(infer(SPRITZ)).toEqual({ method: 'build', glass: 'wine' });
    expect(infer(brew(['prosecco', 120], ['elderflower', 15])).glass).toBe('flute');
  });
  it('stirs a small gin martini into a martini glass', () => {
    expect(infer(MARTINI)).toEqual({ method: 'stir', glass: 'martini' });
  });
  it('knows a julep', () => {
    expect(infer(JULEP).glass).toBe('julep');
  });
  it('uses a hurricane for very big drinks and a tiki mug for rum with orgeat', () => {
    expect(infer(brew(['white_rum', 90], ['pineapple_juice', 150], ['orange_juice', 60])).glass).toBe('hurricane');
    expect(infer(brew(['dark_rum', 45], ['orgeat', 20], ['lime_juice', 20], ['triple_sec', 10])).glass).toBe('tiki');
  });
  it('does not shake over a little citrus garnish', () => {
    expect(inferMethod(brew(['bourbon', 60], ['angostura', 2], ['orange_slice', 3]))).toBe('stir');
  });
  it('needs 35 percent fizz to build', () => {
    expect(inferMethod(brew(['gin', 60], ['soda_water', 20], ['dry_vermouth', 20]))).toBe('stir');
    expect(inferMethod(brew(['gin', 60], ['soda_water', 40]))).toBe('build');
  });
});

describe('matched classics win', () => {
  it('uses the recipe method and glass', () => {
    const r = RECIPE_BY_ID.old_fashioned;
    expect(infer(brew(['bourbon', 60]), r)).toEqual({ method: r.method, glass: r.glass });
    expect(infer(NEGRONI, RECIPE_BY_ID.pina_colada)).toEqual({ method: 'blend', glass: 'hurricane' });
  });

  it('serveCard finds the match for the classics', () => {
    const cases: [BrewEntry[], string, string, string][] = [
      [NEGRONI, 'negroni', 'stir', 'rocks'],
      [DAIQUIRI, 'daiquiri', 'shake', 'coupe'],
      [MOJITO, 'mojito', 'build', 'highball'],
      [MULE, 'moscow_mule', 'build', 'copper-mug'],
    ];
    for (const [b, id, method, glass] of cases) {
      const card = serveCard(b, 'Mine', 'oz');
      expect(card.match?.id).toBe(id);
      expect(card.method).toBe(method);
      expect(card.glass).toBe(glass);
    }
  });
});

describe('brewStats', () => {
  it('does the maths for one pour', () => {
    const s = brewStats(brew(['vodka', 60]), 'shake');
    expect(s.volumeMl).toBe(60);
    expect(s.abv).toBeCloseTo(40);
    expect(s.finalVolumeMl).toBeCloseTo(60 * 1.28);
    expect(s.finalAbv).toBeCloseTo(40 / 1.28);
    expect(s.standardDrinks).toBeCloseTo((60 * 0.4 * 0.789) / 14);
  });

  it('blends abv by volume', () => {
    const s = brewStats(brew(['vodka', 30], ['simple_syrup', 30]), 'stir');
    expect(s.abv).toBeCloseTo(20);
    expect(s.finalAbv).toBeCloseTo(20 / 1.22);
  });

  it('dilution never changes the amount of alcohol', () => {
    for (const method of Object.keys(DILUTION) as (keyof typeof DILUTION)[]) {
      const s = brewStats(NEGRONI, method);
      expect((s.finalVolumeMl * s.finalAbv) / 100).toBeCloseTo((s.volumeMl * s.abv) / 100);
    }
  });

  it('handles soft drinks and empty brews', () => {
    expect(brewStats(brew(['soda_water', 100]), 'build').standardDrinks).toBe(0);
    expect(brewStats([], 'stir')).toMatchObject({ volumeMl: 0, abv: 0, standardDrinks: 0 });
  });

  it('has the documented dilution table', () => {
    expect(DILUTION).toEqual({ stir: 0.22, shake: 0.28, build: 0.12, blend: 0.35 });
  });
});

describe('inferGarnish', () => {
  it('prefers the matched classic', () => {
    expect(inferGarnish(NEGRONI, RECIPE_BY_ID.negroni)).toBe('Orange peel');
  });
  it('uses garnish ingredients in the brew', () => {
    expect(inferGarnish(MOJITO)).toBe('Mint sprig');
    expect(inferGarnish(brew(['gin', 60], ['olive', 3]))).toBe('Olive');
  });
  it('suggests from the ingredients otherwise', () => {
    expect(inferGarnish(DAIQUIRI)).toBe('Lime wheel');
    expect(inferGarnish(brew(['bourbon', 60], ['lemon_juice', 20]))).toBe('Lemon twist');
    expect(inferGarnish(brew(['vodka', 40], ['espresso', 30], ['coffee_liqueur', 20]))).toBe('Three coffee beans');
  });
  it('can have none', () => {
    expect(inferGarnish([])).toBeNull();
    expect(inferGarnish(brew(['soda_water', 100]))).toBeNull();
  });
});

describe('serveCard, methodLine and recipeText', () => {
  it('builds a full card', () => {
    const card = serveCard(NEGRONI, 'House Negroni', 'oz');
    expect(card.name).toBe('House Negroni');
    expect(card.lines.map((l) => l.amount)).toEqual(['1 oz', '1 oz', '1 oz']);
    expect(card.lines[0]).toMatchObject({ id: 'gin', name: ING_BY_ID.gin.name });
    expect(card.score).toBeGreaterThan(0);
    expect(card.verdict).toBeTruthy();
    expect(card.color).toMatch(/^rgb/);
    expect(card.stats.volumeMl).toBe(90);
  });

  it('writes instructions', () => {
    expect(methodLine({ method: 'stir', glass: 'rocks' })).toBe('Stir with ice and strain into a rocks glass.');
    expect(methodLine({ method: 'shake', glass: 'coupe' })).toBe('Shake with ice and strain into a coupe.');
    expect(methodLine({ method: 'build', glass: 'highball' })).toBe('Build over ice in a highball glass and stir gently.');
    expect(methodLine({ method: 'blend', glass: 'hurricane' })).toBe('Blend with ice and pour into a hurricane glass.');
    expect(methodLine({ method: 'shake', glass: 'wine' })).toContain('a wine glass');
  });

  it('writes the clipboard recipe', () => {
    const card = serveCard(NEGRONI, 'House Negroni', 'oz');
    const text = recipeText(card, 'https://stewy.app/#b=x');
    const lines = text.split('\n');
    expect(lines[0]).toBe('House Negroni');
    expect(lines).toContain('1 oz Gin');
    expect(lines).toContain('Stir with ice and strain into a rocks glass.');
    expect(lines).toContain('Garnish: Orange peel');
    expect(lines).toContain(`Harmony ${card.score}, ${card.verdict}`);
    expect(lines[lines.length - 1]).toBe('https://stewy.app/#b=x');
    expect(recipeText(card)).not.toContain('https');
  });

  it('never uses dashes in generated text', () => {
    for (const r of [NEGRONI, DAIQUIRI, MOJITO, MULE, SPRITZ, GIN_TONIC, ESPRESSO, MARTINI]) {
      const text = recipeText(serveCard(r, 'Test', 'cl'), 'https://x.test/');
      expect(text).not.toMatch(/[—–]/);
    }
  });

  it('handles an empty brew', () => {
    const card = serveCard([], 'Nothing', 'oz');
    expect(card.lines).toEqual([]);
    expect(card.tier).toBe('none');
    expect(card.score).toBe(0);
  });
});
