import { describe, expect, it } from 'vitest';
import { snapToRow } from './snapScroll';

const rows = [0, 300, 600, 900, 1200, 1500];

describe('snapToRow', () => {
  it('stays at the top when the cell is in the first row', () => {
    expect(snapToRow(rows, 0, 280, 700, 1000)).toBe(0);
  });

  it('lands on a row top, never between rows', () => {
    // centred would be 650 - (700 - 280) / 2 = 440
    expect(snapToRow(rows, 650, 280, 700, 1000)).toBe(300);
    // centred would be 920 - 210 = 710
    expect(rows).toContain(snapToRow(rows, 920, 280, 700, 1000));
  });

  it('keeps the whole cell in view', () => {
    for (const cellTop of rows) {
      const top = snapToRow(rows, cellTop, 280, 700, 1500);
      expect(top).toBeLessThanOrEqual(cellTop);
      expect(top + 700).toBeGreaterThanOrEqual(cellTop + 280);
    }
  });

  it('does not pass the scroll limit, snapping to a reachable row', () => {
    expect(snapToRow(rows, 1500, 280, 700, 1080)).toBe(900);
  });

  it('falls back to the cell row when the viewport is shorter than a row', () => {
    expect(snapToRow(rows, 600, 280, 200, 1500)).toBe(600);
  });
});
