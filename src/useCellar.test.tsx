import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CELLAR_KEY, useCellar, type CellarInput, type CellarItem } from './cellar';

const input = (name = 'Sour'): CellarInput => ({
  name, brew: [{ id: 'gin', ml: 45 }, { id: 'lime_juice', ml: 25 }], score: 88, color: 'rgb(1, 2, 3)',
});

describe('useCellar', () => {
  beforeEach(() => localStorage.removeItem(CELLAR_KEY));
  afterEach(() => vi.useRealTimers());

  it('saves a double submit once, even when both land before a re-render', () => {
    const { result } = renderHook(() => useCellar());
    let a: CellarItem | null = null;
    let b: CellarItem | null = null;
    act(() => {
      a = result.current.save(input());
      b = result.current.save(input());
    });
    expect(result.current.items).toHaveLength(1);
    expect(b).toBe(a);
  });

  it('keeps a second save once the window has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-05T10:00:00.000Z'));
    const { result } = renderHook(() => useCellar());
    act(() => void result.current.save(input()));
    vi.setSystemTime(new Date('2026-01-05T10:00:05.000Z'));
    act(() => void result.current.save(input()));
    expect(result.current.items).toHaveLength(2);
  });

  it('refuses an empty brew', () => {
    const { result } = renderHook(() => useCellar());
    let saved: CellarItem | null = input() as unknown as CellarItem;
    act(() => {
      saved = result.current.save({ ...input(), brew: [] });
    });
    expect(saved).toBeNull();
    expect(result.current.items).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(CELLAR_KEY) ?? '[]')).toEqual([]);
  });

  it('removes and restores an item', () => {
    const { result } = renderHook(() => useCellar());
    let saved: CellarItem | null = null;
    act(() => {
      saved = result.current.save(input());
    });
    act(() => result.current.remove(saved!.id));
    expect(result.current.items).toHaveLength(0);
    act(() => result.current.restore(saved!));
    expect(result.current.items).toEqual([saved]);
  });
});
