/* The cellar: brews the user chose to keep. Newest first, capped, stored in
   localStorage under stewy.cellar.v1. Pure helpers are exported for tests. */
import { useCallback, useEffect, useState } from 'react';
import type { BrewEntry } from './data/types';
import { cleanBrew, DEFAULT_NAME, migrateName } from './store';

export interface CellarItem {
  id: string;
  name: string;
  brew: BrewEntry[];
  score: number | null;
  color: string | null;
  /** ISO timestamp. */
  savedAt: string;
}

export type CellarInput = Pick<CellarItem, 'name' | 'brew' | 'score' | 'color'>;

export const CELLAR_KEY = 'stewy.cellar.v1';
export const CELLAR_LIMIT = 100;
const MAX_NAME = 40;

const cleanName = (name: string) => migrateName(name.trim().slice(0, MAX_NAME).trim()) || DEFAULT_NAME;

/** Fresh id; falls back to a random string where crypto.randomUUID is missing. */
export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function makeItem(input: CellarInput, now: Date = new Date(), id: string = newId()): CellarItem {
  return {
    id,
    name: cleanName(input.name),
    brew: cleanBrew(input.brew),
    score: input.score,
    color: input.color,
    savedAt: now.toISOString(),
  };
}

/** Newest first, capped; the oldest items fall off the end. */
function normalise(items: CellarItem[]): CellarItem[] {
  return [...items]
    .sort((a, b) => (a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0))
    .slice(0, CELLAR_LIMIT);
}

export function addItem(items: CellarItem[], item: CellarItem): CellarItem[] {
  return [item, ...items.filter((i) => i.id !== item.id)].slice(0, CELLAR_LIMIT);
}

export function renameItem(items: CellarItem[], id: string, name: string): CellarItem[] {
  return items.map((i) => (i.id === id ? { ...i, name: cleanName(name) } : i));
}

export function removeItem(items: CellarItem[], id: string): CellarItem[] {
  return items.filter((i) => i.id !== id);
}

/** Put a removed item back in its place by date (undo for delete). */
export function restoreItem(items: CellarItem[], item: CellarItem): CellarItem[] {
  return normalise([...items.filter((i) => i.id !== item.id), item]);
}

/** Read one stored record; null when it is not a usable item. */
function readItem(raw: unknown): CellarItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id || typeof r.name !== 'string') return null;
  if (typeof r.savedAt !== 'string' || Number.isNaN(Date.parse(r.savedAt))) return null;
  const brew = cleanBrew(r.brew);
  if (!brew.length) return null;
  return {
    id: r.id,
    name: cleanName(r.name),
    brew,
    score: typeof r.score === 'number' && Number.isFinite(r.score) ? r.score : null,
    color: typeof r.color === 'string' ? r.color : null,
    savedAt: r.savedAt,
  };
}

/** Parse stored JSON into items; corrupt data yields an empty cellar. */
export function parseCellar(raw: string | null): CellarItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seen = new Set<string>();
    const items: CellarItem[] = [];
    for (const d of data) {
      const item = readItem(d);
      if (item && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
    return normalise(items);
  } catch {
    return [];
  }
}

const browserStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

function load(): CellarItem[] {
  try {
    return parseCellar(browserStorage()?.getItem(CELLAR_KEY) ?? null);
  } catch {
    return [];
  }
}

export function useCellar() {
  const [items, setItems] = useState<CellarItem[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(CELLAR_KEY, JSON.stringify(items));
    } catch {
      /* private mode or quota: ignore */
    }
  }, [items]);

  const save = useCallback((input: CellarInput) => {
    const item = makeItem(input);
    setItems((prev) => addItem(prev, item));
    return item;
  }, []);
  const rename = useCallback(
    (id: string, name: string) => setItems((prev) => renameItem(prev, id, name)),
    [],
  );
  const remove = useCallback((id: string) => setItems((prev) => removeItem(prev, id)), []);
  const restore = useCallback((item: CellarItem) => setItems((prev) => restoreItem(prev, item)), []);

  return { items, save, rename, remove, restore };
}
