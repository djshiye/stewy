import { describe, expect, it } from 'vitest';
import {
  FILL_CAP, GAUGE_MARKS, OVERFLOW_ML, fillFraction, floatersIn, gaugeAngle, liquidMl, surfaceDepth,
} from './fill';

describe('fill model', () => {
  it('starts empty and rises non-linearly', () => {
    expect(fillFraction(0)).toBe(0);
    expect(fillFraction(-5)).toBe(0);
    expect(fillFraction(30)).toBeCloseTo(0.33, 2);
    expect(fillFraction(60)).toBeCloseTo(0.55, 2);
  });

  it('reads 90 ml as full and caps at 98%', () => {
    expect(fillFraction(90)).toBeCloseTo(0.7, 2);
    expect(fillFraction(250)).toBeCloseTo(0.964, 2);
    expect(fillFraction(2000)).toBe(FILL_CAP);
    expect(OVERFLOW_ML).toBe(200);
  });

  it('is monotonic, and the surface only sinks as the pot empties', () => {
    let prev = -1;
    let prevDepth = Infinity;
    for (let ml = 0; ml <= 300; ml += 5) {
      expect(fillFraction(ml)).toBeGreaterThanOrEqual(prev);
      expect(surfaceDepth(ml)).toBeLessThanOrEqual(prevDepth);
      prev = fillFraction(ml);
      prevDepth = surfaceDepth(ml);
    }
  });

  it('puts 90 ml within a few units of the lip and 30 ml clearly lower', () => {
    expect(surfaceDepth(90)).toBeLessThan(10);
    expect(surfaceDepth(30)).toBeGreaterThan(surfaceDepth(90) + 8);
  });

  it('places gauge marks in order along the arc', () => {
    const angles = GAUGE_MARKS.map(gaugeAngle);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeLessThan(angles[i - 1]);
  });

  it('counts liquid only and finds the floating garnishes', () => {
    const brew = [
      { id: 'gin', ml: 30 },
      { id: 'campari', ml: 30 },
      { id: 'orange_slice', ml: 3 },
      { id: 'mint', ml: 6 },
      { id: 'mint', ml: 2 },
    ];
    expect(liquidMl(brew)).toBe(60);
    expect(floatersIn(brew)).toEqual(['orange_slice', 'mint']);
    expect(floatersIn([{ id: 'gin', ml: 30 }])).toEqual([]);
  });
});
