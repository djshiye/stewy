import { describe, expect, it } from 'vitest';
import { relativeDate, savedGlass } from './cellarView';

const NOW = new Date(2026, 9, 10, 9, 30); // 10 Oct 2026, local time

describe('relativeDate', () => {
  it('says Today and Yesterday by calendar day, not by 24 hour windows', () => {
    expect(relativeDate(new Date(2026, 9, 10, 0, 5).toISOString(), NOW)).toBe('Today');
    expect(relativeDate(new Date(2026, 9, 9, 23, 55).toISOString(), NOW)).toBe('Yesterday');
    expect(relativeDate(new Date(2026, 9, 9, 0, 1).toISOString(), NOW)).toBe('Yesterday');
  });

  it('writes older dates as day and short month', () => {
    expect(relativeDate(new Date(2026, 9, 3, 12).toISOString(), NOW)).toBe('3 Oct');
    expect(relativeDate(new Date(2026, 8, 1, 12).toISOString(), NOW)).toBe('1 Sep');
  });

  it('adds the year for another year, and tolerates junk', () => {
    expect(relativeDate(new Date(2025, 11, 24, 12).toISOString(), NOW)).toBe('24 Dec 2025');
    expect(relativeDate('not a date', NOW)).toBe('');
  });
});

describe('savedGlass', () => {
  const negroni = [{ id: 'gin', ml: 30 }, { id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }];

  it('draws a matched classic in its own glass', () => {
    const g = savedGlass(negroni, 'rgb(170, 40, 50)');
    expect(g.kind).toBe('rocks');
    expect(g.color).toBe('rgb(170, 40, 50)');
    expect(g.ice).toBe('large-cube');
  });

  it('falls back to the mixed colour when none was saved', () => {
    expect(savedGlass(negroni, null).color).toMatch(/^rgb\(/);
  });
});
