import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../../data/ingredients';
import { deltaWords, flavourNotes, fold, indicatorFor, searchIngredients } from './shelfUtils';

describe('shelf search', () => {
  it('finds rums by name and ranks name matches first', () => {
    const r = searchIngredients(INGREDIENTS, 'rum').map((i) => i.id);
    expect(r).toContain('white_rum');
    expect(r).toContain('dark_rum');
    expect(r.indexOf('white_rum')).toBeLessThan(r.length);
  });

  it('ignores diacritics', () => {
    expect(fold('Cachaça')).toBe('cachaca');
    expect(searchIngredients(INGREDIENTS, 'cachaca').length).toBeGreaterThan(0);
  });

  it('matches flavour notes', () => {
    const r = searchIngredients(INGREDIENTS, 'smoky');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((i) => (i.tags.smoky ?? 0) > 0 || /smoky/i.test(i.name) || i.group.toLowerCase().startsWith('smoky'))).toBe(true);
  });

  it('returns nothing for gibberish and for blank queries', () => {
    expect(searchIngredients(INGREDIENTS, 'zzz')).toEqual([]);
    expect(searchIngredients(INGREDIENTS, '   ')).toEqual([]);
  });

  it('requires every word to match', () => {
    const r = searchIngredients(INGREDIENTS, 'white rum');
    expect(r[0]?.id).toBe('white_rum');
    expect(searchIngredients(INGREDIENTS, 'white qqq')).toEqual([]);
  });
});

describe('shelf indicators', () => {
  it('shows a raise badge from +2 and a clash dot from -8', () => {
    expect(indicatorFor(2).kind).toBe('raise');
    expect(indicatorFor(1).kind).toBe('none');
    expect(indicatorFor(-7).kind).toBe('none');
    expect(indicatorFor(-8).kind).toBe('clash');
    expect(indicatorFor(undefined).kind).toBe('none');
  });

  it('words the delta', () => {
    expect(deltaWords(3)).toBe('Raises the score by 3');
    expect(deltaWords(-9)).toBe('Lowers the score by 9');
    expect(deltaWords(undefined)).toBeNull();
  });

  it('lists the strongest flavour notes first', () => {
    const gin = INGREDIENTS.find((i) => i.id === 'gin')!;
    expect(flavourNotes(gin).length).toBeGreaterThan(0);
    expect(flavourNotes(gin, 1)).toHaveLength(1);
  });
});
