import { describe, expect, it, vi } from 'vitest';
import {
  addItem, CELLAR_LIMIT, DUPLICATE_SAVE_MS, makeItem, parseCellar, recentDuplicate, removeItem, renameItem,
  requestPersistence, restoreItem, safariClearsStorage, type CellarInput, type CellarItem,
} from './cellar';
import { DEFAULT_NAME } from './store';

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
    expect(makeItem(input('   ')).name).toBe(DEFAULT_NAME);
    expect(makeItem(input('x'.repeat(60))).name).toHaveLength(40);
    const i = makeItem({ ...input(), brew: [{ id: 'gin', ml: 30 }, { id: 'nope', ml: 5 }] });
    expect(i.brew).toEqual([{ id: 'gin', ml: 30 }]);
  });

  it('moves the old default name to the new one', () => {
    expect(makeItem(input('Untitled Brew')).name).toBe('Untitled brew');
    expect(makeItem(input('Untitled Brew 2')).name).toBe('Untitled Brew 2');
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
    expect(renameItem(list, 'id1', '').find((i) => i.id === 'id1')?.name).toBe(DEFAULT_NAME);
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

describe('recentDuplicate', () => {
  const base = makeItem(input('Sour'), new Date('2026-01-05T10:00:00.000Z'), 'a');
  const later = (ms: number, over: Partial<CellarInput> = {}) =>
    makeItem({ ...input('Sour'), ...over }, new Date(Date.parse(base.savedAt) + ms), 'b');

  it('finds the same name and brew saved within the window', () => {
    expect(recentDuplicate([base], later(400))).toBe(base);
    expect(recentDuplicate([base], later(DUPLICATE_SAVE_MS - 1))).toBe(base);
  });

  it('lets a deliberate later save through', () => {
    expect(recentDuplicate([base], later(DUPLICATE_SAVE_MS))).toBeNull();
    expect(recentDuplicate([base], later(60_000))).toBeNull();
  });

  it('treats a changed name or brew as a new item', () => {
    expect(recentDuplicate([base], later(100, { name: 'Other' }))).toBeNull();
    expect(recentDuplicate([base], later(100, { brew: [{ id: 'gin', ml: 50 }, { id: 'lime_juice', ml: 25 }] }))).toBeNull();
  });
});

const UA = {
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1',
  iphoneFirefox: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/140.0 Mobile/15E148 Safari/605.1.15',
  iphoneEdge: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 EdgiOS/138.0.3351.95 Mobile/15E148 Safari/605.1.15',
  iphoneWebView: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:140.0) Gecko/20100101 Firefox/140.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
  linuxWebKit: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
};

describe('safariClearsStorage', () => {
  it('is true in Safari on macOS, iOS and iPadOS', () => {
    for (const ua of [UA.macSafari, UA.iphoneSafari, UA.ipadSafari]) {
      expect(safariClearsStorage({ userAgent: ua })).toBe(true);
    }
  });

  it('is false in Chrome, Edge and Firefox, wherever they run', () => {
    for (const ua of [UA.iphoneChrome, UA.iphoneFirefox, UA.iphoneEdge, UA.macChrome, UA.macFirefox, UA.androidChrome]) {
      expect(safariClearsStorage({ userAgent: ua })).toBe(false);
    }
  });

  it('is false in an in-app web view and on other platforms', () => {
    expect(safariClearsStorage({ userAgent: UA.iphoneWebView })).toBe(false);
    expect(safariClearsStorage({ userAgent: UA.linuxWebKit })).toBe(false);
    expect(safariClearsStorage({ userAgent: '' })).toBe(false);
  });

  it('is false as a Home Screen or Dock app', () => {
    expect(safariClearsStorage({ userAgent: UA.iphoneSafari, standalone: true })).toBe(false);
    expect(safariClearsStorage({ userAgent: UA.macSafari, displayStandalone: true })).toBe(false);
    expect(safariClearsStorage({ userAgent: UA.macSafari, standalone: false, displayStandalone: false })).toBe(true);
  });
});

describe('requestPersistence', () => {
  it('asks the storage manager once per call', () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist } });
    requestPersistence();
    expect(persist).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('shrugs off a missing API, a throw and a rejection', async () => {
    vi.stubGlobal('navigator', {});
    expect(() => requestPersistence()).not.toThrow();
    vi.stubGlobal('navigator', { storage: { persist: () => { throw new Error('no'); } } });
    expect(() => requestPersistence()).not.toThrow();
    vi.stubGlobal('navigator', { storage: { persist: () => Promise.reject(new Error('no')) } });
    expect(() => requestPersistence()).not.toThrow();
    await Promise.resolve();
    vi.unstubAllGlobals();
  });
});
