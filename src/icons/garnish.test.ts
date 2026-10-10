import { describe, expect, it } from 'vitest';
import { RECIPES } from '../data/recipes';
import { ING_BY_ID } from '../data/ingredients';
import { inferGarnish } from '../lib/serve';
import { CREMA, EGG_FOAM, foamFor, garnishFor, GARNISH_KINDS, iceFor } from './garnish';

describe('garnishFor', () => {
  it('maps every recipe garnish to at least one kind', () => {
    for (const r of RECIPES) {
      if (!r.garnish) continue;
      expect(garnishFor(r.garnish), `${r.id}: ${r.garnish}`).not.toHaveLength(0);
    }
  });

  it('maps every garnish ingredient name that inferGarnish can return', () => {
    for (const ing of Object.values(ING_BY_ID)) {
      if (ing.group !== 'Garnish') continue;
      const text = inferGarnish([{ id: ing.id, ml: ing.amt }]);
      expect(garnishFor(text), `${ing.id}: ${text}`).not.toHaveLength(0);
    }
    for (const t of ['Lime wheel', 'Lemon twist', 'Orange slice', 'Citrus twist', 'Three coffee beans',
      'Grated nutmeg', 'Mint sprig', 'Fruit slice', 'Orange peel']) {
      expect(garnishFor(t), t).not.toHaveLength(0);
    }
  });

  it('parses lists, keeps order and drops duplicates', () => {
    expect(garnishFor('Salt rim, lime wheel')).toEqual(['salt-rim', 'lime-wheel']);
    expect(garnishFor('Cucumber, mint, orange')).toEqual(['cucumber-ribbon', 'mint-sprig', 'orange-wheel']);
    expect(garnishFor('Cherry, orange slice')).toEqual(['cherry', 'orange-wheel']);
    expect(garnishFor('Mint sprig, lime shell')).toEqual(['mint-sprig', 'lime-wedge']);
    expect(garnishFor('Cherry, cherry')).toEqual(['cherry']);
  });

  it('distinguishes peels, twists, wheels and wedges', () => {
    expect(garnishFor('Orange peel')).toEqual(['orange-peel']);
    expect(garnishFor('Orange twist')).toEqual(['orange-peel']);
    expect(garnishFor('Lemon twist')).toEqual(['lemon-twist']);
    expect(garnishFor('Lime wedge')).toEqual(['lime-wedge']);
    expect(garnishFor('Orange slice')).toEqual(['orange-wheel']);
    expect(garnishFor('Lemon slice, cherry')).toEqual(['lemon-wheel', 'cherry']);
  });

  it('keeps the first of an either-or garnish', () => {
    expect(garnishFor('Olive or lemon twist')).toEqual(['olive-pick']);
  });

  it('returns nothing for no or unknown garnish', () => {
    expect(garnishFor(null)).toEqual([]);
    expect(garnishFor('')).toEqual([]);
    expect(garnishFor('A sparkler')).toEqual([]);
  });

  it('only returns known kinds', () => {
    for (const r of RECIPES) for (const k of garnishFor(r.garnish ?? null)) expect(GARNISH_KINDS).toContain(k);
  });
});

describe('iceFor', () => {
  it('serves stemmed glasses up', () => {
    expect(iceFor('coupe', 'shake')).toBe('none');
    expect(iceFor('martini', 'stir')).toBe('none');
    expect(iceFor('flute', 'build')).toBe('none');
  });
  it('gives a stirred rocks drink one large cube and a shaken one cubes', () => {
    expect(iceFor('rocks', 'stir')).toBe('large-cube');
    expect(iceFor('rocks', 'shake')).toBe('cubes');
    expect(iceFor('rocks', 'build')).toBe('cubes');
  });
  it('uses cubes for long drinks and crushed ice for julep, tiki and blended drinks', () => {
    expect(iceFor('highball', 'build')).toBe('cubes');
    expect(iceFor('copper-mug', 'build')).toBe('cubes');
    expect(iceFor('wine', 'build')).toBe('cubes');
    expect(iceFor('julep', 'build')).toBe('crushed');
    expect(iceFor('tiki', 'shake')).toBe('crushed');
    expect(iceFor('hurricane', 'blend')).toBe('crushed');
  });
});

describe('foamFor', () => {
  it('is white for egg white and crema for espresso', () => {
    expect(foamFor([{ id: 'bourbon', ml: 45 }, { id: 'egg_white', ml: 20 }])).toBe(EGG_FOAM);
    expect(foamFor([{ id: 'vodka', ml: 40 }, { id: 'espresso', ml: 30 }])).toBe(CREMA);
  });
  it('lets egg white win and ignores empty entries', () => {
    expect(foamFor([{ id: 'espresso', ml: 30 }, { id: 'egg_white', ml: 20 }])).toBe(EGG_FOAM);
    expect(foamFor([{ id: 'egg_white', ml: 0 }])).toBeNull();
  });
  it('is null otherwise', () => {
    expect(foamFor([{ id: 'gin', ml: 50 }])).toBeNull();
    expect(foamFor([])).toBeNull();
  });
  it('matches the recipes that use them', () => {
    for (const r of RECIPES) {
      const foam = foamFor(r.build.map(([id, ml]) => ({ id, ml })));
      const wants = r.build.some(([id]) => id === 'egg_white' || id === 'espresso');
      expect(foam !== null, r.id).toBe(wants);
    }
  });
});
