import { describe, expect, it } from 'vitest';
import { INGREDIENTS, ING_BY_ID } from './ingredients';
import { RECIPES } from './recipes';
import { harmony, resemblance } from '../lib/harmony';

const asBrew = (build: [string, number][]) => build.map(([id, ml]) => ({ id, ml }));
const DASHES = /[–—]/;

describe('ingredients', () => {
  it('have unique ids', () => {
    const ids = INGREDIENTS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('give every bottle icon a bottle shape', () => {
    for (const i of INGREDIENTS.filter((x) => x.icon === 'bottle')) {
      expect(i.bottle, i.id).toBeTruthy();
    }
  });

  it('mark sparkling drinks as carbonated', () => {
    for (const id of ['soda_water', 'tonic_water', 'cola', 'ginger_beer', 'ginger_ale',
      'lemon_lime_soda', 'prosecco', 'champagne', 'grapefruit_soda']) {
      expect(ING_BY_ID[id]?.carbonated, id).toBe(true);
    }
  });

  it('keep tags on the 0..3 scale', () => {
    for (const i of INGREDIENTS) {
      for (const v of Object.values(i.tags)) expect(v, i.id).toBeLessThanOrEqual(3);
    }
  });

  it('use no em or en dashes in names', () => {
    for (const i of INGREDIENTS) expect(i.name, i.id).not.toMatch(DASHES);
  });
});

describe('recipes', () => {
  it('have unique ids', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only use known ingredients', () => {
    for (const r of RECIPES) {
      for (const [id, ml] of r.build) {
        expect(ING_BY_ID[id], `${r.id}: ${id}`).toBeDefined();
        expect(ml, `${r.id}: ${id}`).toBeGreaterThan(0);
      }
    }
  });

  it('declare glass, method and note, with no legacy emoji', () => {
    for (const r of RECIPES) {
      expect(r.glass, r.id).toBeTruthy();
      expect(r.method, r.id).toBeTruthy();
      expect(r.note.length, r.id).toBeGreaterThan(0);
      expect(r.note.length, r.id).toBeLessThanOrEqual(64);
      expect(r.emoji, r.id).toBeUndefined();
    }
  });

  it('use no em or en dashes in names, notes or garnish', () => {
    for (const r of RECIPES) {
      expect(`${r.name}|${r.note}|${r.garnish ?? ''}`, r.id).not.toMatch(DASHES);
      expect(r.note, r.id).not.toContain(' · ');
    }
  });

  it('score at least 72 on the harmony engine', () => {
    for (const r of RECIPES) {
      const h = harmony(asBrew(r.build));
      expect(h?.score ?? 0, r.id).toBeGreaterThanOrEqual(72);
    }
  });

  it('are each their own closest match', () => {
    for (const r of RECIPES) {
      expect(resemblance(asBrew(r.build))?.recipe.id, r.id).toBe(r.id);
    }
  });

  it('are not too similar to one another', () => {
    for (const a of RECIPES) {
      for (const b of RECIPES) {
        if (a === b) continue;
        const bm = new Map(b.build);
        let dot = 0, na = 0, nb = 0;
        for (const [, ml] of a.build) na += ml * ml;
        for (const [, ml] of b.build) nb += ml * ml;
        for (const [id, ml] of a.build) dot += ml * (bm.get(id) ?? 0);
        expect(dot / Math.sqrt(na * nb), `${a.id} vs ${b.id}`).toBeLessThan(0.98);
      }
    }
  });
});
