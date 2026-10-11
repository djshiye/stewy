import { describe, expect, it } from 'vitest';
import { snapToRow, tailPadding } from './snapScroll';

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

describe('tailPadding', () => {
  // six rows of 300 (the last starts at 1500, cells 280 tall); the content is 1800 tall
  const pad = (viewport: number) => tailPadding(rows, 1500, 280, viewport, 1800);

  it('is zero when a reachable row already shows the whole cell', () => {
    expect(pad(900)).toBe(0); // row 900 is reachable (max 900) and reaches 1800
    expect(pad(300)).toBe(0); // the last row itself is reachable (max 1500)
    expect(tailPadding(rows, 0, 280, 700, 1800)).toBe(0);
  });

  it('adds what is missing so the nearest row above can reach the top', () => {
    // viewport 610: max 1190; only the rows at 1200 and 1500 show the cell whole (to 1780), so 10 px short
    expect(pad(610)).toBe(10);
    // viewport 660: max 1140, and row 1200 is 60 short
    expect(pad(660)).toBe(60);
  });

  it('rounds up, and leaves a viewport under two rows alone', () => {
    expect(pad(609.4)).toBe(10);
    expect(pad(500)).toBe(0); // only the cell's own row would show it whole
  });
});
