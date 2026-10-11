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

  it('treats a curly apostrophe like a straight one', () => {
    expect(fold('Pimm\u2019s')).toBe("pimm's");
    expect(searchIngredients(INGREDIENTS, "pimm's").length).toBeGreaterThan(0);
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
  it('shows a raise badge from +2', () => {
    expect(indicatorFor({ delta: 2, ml: 30 }).kind).toBe('raise');
    expect(indicatorFor({ delta: 1, ml: 30 }).kind).toBe('none');
    expect(indicatorFor(undefined).kind).toBe('none');
  });

  it('shows the clash dot only for a flagged clash, never for a big drop alone', () => {
    expect(indicatorFor({ delta: -12, ml: 30 }).kind).toBe('none');
    expect(indicatorFor({ delta: -30, ml: 30, clash: false }).kind).toBe('none');
    expect(indicatorFor({ delta: -12, ml: 30, clash: true })).toEqual({ kind: 'clash', delta: -12 });
    expect(indicatorFor({ delta: -2, ml: 30, clash: true }).kind).toBe('clash');
  });

  it('words the delta', () => {
    expect(deltaWords({ delta: 3, ml: 30 })).toBe('Raises the score by 3');
    expect(deltaWords({ delta: -9, ml: 30 })).toBe('Lowers the score by 9');
    expect(deltaWords({ delta: -3, ml: 30 })).toBe('Lowers the score slightly');
    expect(deltaWords(undefined)).toBeNull();
  });

  it('says what a clash means', () => {
    expect(deltaWords({ delta: -12, ml: 30, clash: true })).toBe('Clashes with the brew (curdles or muddies it), -12');
  });

  it('words dairy on a curdled pot as a split, with no marker', () => {
    const d = { delta: 0, ml: 30, curdles: true };
    expect(deltaWords(d)).toBe('Splits against the acid already in the pot');
    expect(indicatorFor(d)).toEqual({ kind: 'none' });
  });

  it('lists the strongest flavour notes first', () => {
    const gin = INGREDIENTS.find((i) => i.id === 'gin')!;
    expect(flavourNotes(gin).length).toBeGreaterThan(0);
    expect(flavourNotes(gin, 1)).toHaveLength(1);
  });
});
