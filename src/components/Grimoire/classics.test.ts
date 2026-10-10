import { describe, expect, it } from 'vitest';
import { RECIPES } from '../../data/recipes';
import { FILTERS, filterClassics, fold, getClassics, scoreColor, type FilterKey } from './classics';

const all = getClassics();
const names = (key: FilterKey, q = '') => filterClassics(all, key, q).map((c) => c.recipe.id);

describe('classics', () => {
  it('describes every recipe once, with a score and three key ingredients', () => {
    expect(all).toHaveLength(RECIPES.length);
    expect(getClassics()).toBe(all);
    for (const c of all) {
      expect(c.score).toBeGreaterThan(0);
      expect(c.key.split(', ').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('lists spirits first and lowers common nouns but keeps brands', () => {
    expect(all.find((c) => c.recipe.id === 'negroni')?.key).toBe('Gin, Campari, sweet vermouth');
    expect(all.find((c) => c.recipe.id === 'margarita')?.key).toBe('Tequila blanco, triple sec, lime juice');
  });
});

describe('filters', () => {
  it('has no empty chip', () => {
    for (const f of FILTERS) expect(names(f.key).length, f.label).toBeGreaterThan(0);
  });

  it('defines each chip by method, archetype, glass or ingredients', () => {
    expect(names('stirred')).toContain('negroni');
    expect(names('shaken')).toContain('margarita');
    expect(names('built')).toContain('mojito');
    expect(names('sours')).toContain('daiquiri');
    expect(names('sours')).not.toContain('negroni');
    expect(names('long')).toContain('gin_tonic');
    expect(names('long')).not.toContain('daiquiri');
    expect(names('tiki')).toContain('mai_tai');
    expect(names('tiki')).not.toContain('french_martini');
    expect(names('after-dinner')).toContain('espresso_martini');
    expect(names('after-dinner')).not.toContain('amaretto_sour');
  });
});

describe('search', () => {
  it('matches names and ingredient names, ignoring case and accents', () => {
    expect(names('all', 'gin')).toContain('negroni');
    expect(names('all', 'pina')).toEqual(['pina_colada']);
    expect(names('all', 'CAMPARI')).toContain('boulevardier');
  });

  it('needs every word, and can come back empty', () => {
    expect(names('all', 'gin campari')).toContain('negroni');
    expect(names('all', 'gin campari')).not.toContain('gimlet');
    expect(names('all', 'zzz')).toEqual([]);
  });

  it('combines with a chip', () => {
    expect(names('tiki', 'gin')).toEqual([]);
    expect(fold('Crème de cassis')).toBe('creme de cassis');
  });
});

describe('scoreColor', () => {
  it('uses the DESIGN thresholds, not the tier names', () => {
    expect(scoreColor(90)).toBe('var(--good)');
    expect(scoreColor(80)).toBe('var(--good)');
    expect(scoreColor(79)).toBe('var(--warn)');
    expect(scoreColor(56)).toBe('var(--warn)');
    expect(scoreColor(55)).toBe('var(--bad)');
  });
});
