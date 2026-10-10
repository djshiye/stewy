import { describe, expect, it } from 'vitest';
import {
  addItem, CELLAR_LIMIT, makeItem, parseCellar, removeItem, renameItem, restoreItem, type CellarInput,
  type CellarItem,
} from './cellar';

const input = (name = 'Sour', score: number | null = 88): CellarInput => ({
  name, brew: [{ id: 'gin', ml: 45 }, { id: 'lime_juice', ml: 25 }], score, color: 'rgb(1, 2, 3)',
});
const at = (day: number) => new Date(Date.UTC(2026, 0, day));
const item = (n: number): CellarItem => makeItem(input(`Brew ${n}`), at(1 + (n % 28)), `id${n}`);

describe('makeItem', () => {
  it('builds a clean item', () => {
    const i = makeItem(input('  Garden Sour  '), at(5), 'abc');
    expect(i).toEqual({
      id: 'abc', name: 'Garden Sour', brew: input().brew, score: 88, color: 'rgb(1, 2, 3)',
      savedAt: '2026-01-05T00:00:00.000Z',
    });
  });

  it('defaults and trims the name, and drops unknown ingredients', () => {
    expect(makeItem(input('   ')).name).toBe('Untitled Brew');
    expect(makeItem(input('x'.repeat(60))).name).toHaveLength(40);
    const i = makeItem({ ...input(), brew: [{ id: 'gin', ml: 30 }, { id: 'nope', ml: 5 }] });
    expect(i.brew).toEqual([{ id: 'gin', ml: 30 }]);
  });

  it('makes unique ids', () => {
    expect(makeItem(input()).id).not.toBe(makeItem(input()).id);
  });
});

describe('list operations', () => {
  it('adds newest first', () => {
    const list = addItem(addItem([], item(1)), item(2));
    expect(list.map((i) => i.id)).toEqual(['id2', 'id1']);
  });

  it('caps at the limit, dropping the oldest', () => {
    let list: CellarItem[] = [];
    for (let n = 0; n < CELLAR_LIMIT + 5; n++) list = addItem(list, item(n));
    expect(list).toHaveLength(CELLAR_LIMIT);
    expect(list[0].id).toBe(`id${CELLAR_LIMIT + 4}`);
    expect(list.some((i) => i.id === 'id0')).toBe(false);
  });

  it('renames and removes', () => {
    const list = [item(2), item(1)];
    expect(renameItem(list, 'id1', ' Better ').map((i) => i.name)).toEqual(['Brew 2', 'Better']);
    expect(renameItem(list, 'id1', '').find((i) => i.id === 'id1')?.name).toBe('Untitled Brew');
    expect(removeItem(list, 'id2').map((i) => i.id)).toEqual(['id1']);
    expect(removeItem(list, 'zzz')).toHaveLength(2);
  });

  it('restores a removed item to its place by date', () => {
    const list = [item(3), item(2), item(1)];
    const removed = list[1];
    const without = removeItem(list, removed.id);
    expect(restoreItem(without, removed).map((i) => i.id)).toEqual(['id3', 'id2', 'id1']);
    expect(restoreItem(list, removed)).toHaveLength(3);
  });
});

describe('parseCellar', () => {
  it('round-trips', () => {
    const list = [item(3), item(2), item(1)];
    expect(parseCellar(JSON.stringify(list))).toEqual(list);
  });

  it('survives corrupt storage', () => {
    for (const raw of [null, '', 'nope', '{}', '"x"', '[1,2]', '[null]', '{"a":1}']) {
      expect(parseCellar(raw)).toEqual([]);
    }
  });

  it('keeps good records and drops bad ones', () => {
    const good = item(1);
    const raw = JSON.stringify([
      good,
      { ...good, id: 'dup-date', savedAt: 'yesterday' },
      { ...good, id: 'no-brew', brew: [] },
      { ...good, id: 'unknown', brew: [{ id: 'nope', ml: 3 }] },
      { ...good, id: 7 },
      { ...good, id: 'ok', score: 'high', color: 5 },
      good,
    ]);
    const out = parseCellar(raw);
    expect(out.map((i) => i.id).sort()).toEqual(['id1', 'ok']);
    expect(out.find((i) => i.id === 'ok')).toMatchObject({ score: null, color: null });
  });

  it('caps oversized stores', () => {
    const many = Array.from({ length: CELLAR_LIMIT + 20 }, (_, n) => item(n));
    expect(parseCellar(JSON.stringify(many))).toHaveLength(CELLAR_LIMIT);
  });
});
