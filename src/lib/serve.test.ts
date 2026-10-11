import { describe, expect, it } from 'vitest';
import type { BrewEntry, Recipe } from '../data/types';
import { ING_BY_ID } from '../data/ingredients';
import { RECIPE_BY_ID, RECIPES } from '../data/recipes';
import { resemblance } from './harmony';
import {
  brewStats, DILUTION, inferGarnish, inferGlass, inferMethod, measureLines, methodLine, methodSteps, recipeText, serveCard,
} from './serve';
import { garnishFor } from '../icons/garnish';

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
    expect(inferGarnish(MOJITO)).toBe('Fresh mint, 8 leaves');
    expect(inferGarnish(brew(['gin', 60], ['mint', 1]))).toBe('Fresh mint');
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

  it('does not serve a clashing brew like the classic it happens to resemble', () => {
    const sludge = brew(['heavy_cream', 30], ['lime_juice', 25], ['mezcal', 30], ['ginger_beer', 120]);
    expect(resemblance(sludge)).toBeNull();
    const card = serveCard(sludge, 'Cursed Sludge', 'oz');
    expect(card.match).toBeNull();
    expect(card.glass).not.toBe('copper-mug');
    expect(card.glass).toBe('highball');
    expect(card.garnish).toBe('Lime wheel');
  });

  it('every classic still resembles itself, so none loses its match', () => {
    for (const r of RECIPES) {
      expect(resemblance(brew(...r.build))?.recipe.id, r.id).toBe(r.id);
    }
  });

  it('keeps the Piña Colada match for textbook-ratio variations', () => {
    for (const b of [
      brew(['white_rum', 60], ['coconut_cream', 45], ['pineapple_juice', 90]),
      brew(['white_rum', 60], ['coconut_cream', 30], ['pineapple_juice', 45]),
      brew(['white_rum', 60], ['coconut_cream', 30], ['pineapple_juice', 75]),
    ]) {
      const card = serveCard(b, 'Colada', 'oz');
      expect(card.match?.id).toBe('pina_colada');
      expect(card.glass).toBe('hurricane');
      expect(card.method).toBe('blend');
    }
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
    expect(lines).toContain(`Score ${card.score}, ${card.verdict}`);
    expect(lines[lines.length - 1]).toBe('https://stewy.app/#b=x');
    expect(recipeText(card)).not.toContain('https');
  });

  it('never uses dashes in generated text', () => {
    for (const r of [NEGRONI, DAIQUIRI, MOJITO, MULE, SPRITZ, GIN_TONIC, ESPRESSO, MARTINI]) {
      const text = recipeText(serveCard(r, 'Test', 'cl'), 'https://x.test/');
      expect(text).not.toMatch(/[—–]/);
    }
  });

  it('writes counted lines without repeating the noun', () => {
    const text = recipeText(serveCard(brew(['gin', 60], ['angostura', 1.8], ['orange_slice', 1]), 'Test', 'oz'));
    expect(text).toMatch(/^2 dashes Angostura bitters$/m);
    expect(text).toMatch(/^Garnish: Orange slice$/m);
    expect(text).not.toMatch(/slice Orange slice/);
  });

  it('handles an empty brew', () => {
    const card = serveCard([], 'Nothing', 'oz');
    expect(card.lines).toEqual([]);
    expect(card.tier).toBe('none');
    expect(card.score).toBe(0);
  });
});

describe('garnish in the brew is the garnish', () => {
  const NEGRONI_SLICE = brew(['gin', 30], ['campari', 30], ['sweet_vermouth', 30], ['orange_slice', 3]);
  const steps = (b: BrewEntry[]) => methodSteps(serveCard(b, 'Test', 'oz'));

  it('replaces the matched classic garnish', () => {
    expect(inferGarnish(NEGRONI_SLICE, RECIPE_BY_ID.negroni)).toBe('Orange slice');
    expect(inferGarnish(NEGRONI, RECIPE_BY_ID.negroni)).toBe('Orange peel');
  });

  it('keeps the classic garnish when the brew has none', () => {
    expect(serveCard(NEGRONI, 'Test', 'oz').garnish).toBe('Orange peel');
    expect(steps(NEGRONI).join('\n')).toMatch(/Express an orange peel/);
  });

  it('names, counts and joins the pieces', () => {
    expect(inferGarnish(brew(['gin', 60], ['cherry', 3], ['mint', 6]))).toBe('Maraschino cherry and fresh mint, 6 leaves');
    expect(inferGarnish(brew(['gin', 60], ['olive', 6]))).toBe('2 olives');
    expect(inferGarnish(brew(['gin', 60], ['olive', 3], ['cherry', 6], ['salt', 1]))).toBe('Olive, 2 maraschino cherries and salt rim');
    expect(inferGarnish(brew(['gin', 60], ['orange_slice', 6]))).toBe('2 orange slices');
    expect(inferGarnish(brew(['gin', 60], ['salt', 1]))).toBe('Salt rim');
  });

  it('carries the mint count into the card and the clipboard text', () => {
    const card = serveCard(MOJITO, 'Mojito', 'oz');
    expect(card.garnish).toBe('Fresh mint, 8 leaves');
    expect(recipeText(card)).toContain('Garnish: Fresh mint, 8 leaves');
  });

  it('drops garnish items from the measures and the recipe lines', () => {
    const card = serveCard(NEGRONI_SLICE, 'Test', 'oz');
    expect(measureLines(NEGRONI_SLICE, 'oz').map((l) => l.id)).toEqual(['gin', 'campari', 'sweet_vermouth']);
    const text = recipeText(card).split('\n');
    expect(text).not.toContain('Orange slice');
    expect(text.some((l) => /slice/.test(l) && !l.startsWith('Garnish: '))).toBe(false);
    expect(text).toContain('Garnish: Orange slice');
    expect(text.join('\n')).not.toMatch(/peel/i);
  });

  it('garnishes the last step with a verb per item', () => {
    const last = (b: BrewEntry[]) => steps(b).at(-1);
    expect(last(NEGRONI_SLICE)).toBe('Garnish with an orange slice');
    expect(last(brew(['gin', 60], ['dry_vermouth', 10], ['olive', 3]))).toBe('Spear an olive and drop it in');
    expect(last(brew(['gin', 60], ['dry_vermouth', 10], ['olive', 6]))).toBe('Spear 2 olives and drop them in');
    expect(last(brew(['gin', 60], ['mint', 6]))).toBe('Slap a mint sprig and set it in the glass');
    expect(last(brew(['gin', 60], ['cherry', 3]))).toBe('Drop in a maraschino cherry');
    expect(last(brew(['gin', 60], ['cucumber', 4]))).toBe('Float 2 cucumber slices on top');
    expect(last(brew(['gin', 60], ['cherry', 3], ['mint', 6])))
      .toBe('Drop in a maraschino cherry, then slap a mint sprig and set it in the glass');
  });

  it('rims with salt before pouring and adds no garnish step for it alone', () => {
    const s = steps(brew(['tequila_blanco', 45], ['lime_juice', 25], ['triple_sec', 20], ['salt', 1]));
    expect(s[0]).toMatch(/^Rim a .* with salt$/);
    expect(s.some((x) => /garnish|slap|spear/i.test(x))).toBe(false);
    const withSlice = steps(brew(['tequila_blanco', 45], ['lime_juice', 25], ['salt', 1], ['orange_slice', 3]));
    expect(withSlice[0]).toMatch(/with salt$/);
    expect(withSlice.at(-1)).toBe('Garnish with an orange slice');
  });

  it('maps every brew garnish onto glass art', () => {
    for (const id of ['mint', 'cucumber', 'salt', 'cherry', 'orange_slice', 'olive']) {
      for (const ml of [ING_BY_ID[id].amt, 12]) {
        const text = inferGarnish(brew(['gin', 60], [id, ml]));
        expect(garnishFor(text), `${id} ${ml}: ${text}`).toHaveLength(1);
      }
    }
    expect(garnishFor(inferGarnish(NEGRONI_SLICE, RECIPE_BY_ID.negroni))).toEqual(['orange-wheel']);
    expect(garnishFor('Maraschino cherry and fresh mint')).toEqual(['cherry', 'mint-sprig']);
  });
});
