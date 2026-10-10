import { describe, expect, it } from 'vitest';
import { ING_BY_ID } from '../../data/ingredients';
import {
  angleToFrac, dialRange, fracToAngle, ledRing, litCount, scaleTicks, snapValue, stepValue,
} from './dialMath';

describe('ledRing', () => {
  const ring = ledRing({ cx: 120, cy: 120, r1: 80, r2: 95 });

  it('draws 64 segments in scale order across 270 degrees', () => {
    expect(ring).toHaveLength(64);
    expect(ring[0].t).toBeLessThan(ring[63].t);
    expect(ring[0].t).toBeCloseTo(0.5 / 64);
    expect(ring[63].t).toBeCloseTo(63.5 / 64);
  });

  it('keeps every segment between the two radii', () => {
    for (const s of ring) {
      expect(Math.hypot(s.x1 - 120, s.y1 - 120)).toBeCloseTo(80, 1);
      expect(Math.hypot(s.x2 - 120, s.y2 - 120)).toBeCloseTo(95, 1);
    }
  });

  it('starts bottom left and ends bottom right, leaving the bottom open', () => {
    expect(ring[0].x2).toBeLessThan(120);
    expect(ring[0].y2).toBeGreaterThan(120);
    expect(ring[63].x2).toBeGreaterThan(120);
    expect(ring[63].y2).toBeGreaterThan(120);
    expect(ring.every((s) => s.y2 <= 120 + 95 * Math.sin((45 * Math.PI) / 180) + 0.5)).toBe(true);
  });
});

describe('litCount', () => {
  it('lights none at zero, all at full, and half at the middle', () => {
    expect(litCount(0)).toBe(0);
    expect(litCount(1)).toBe(64);
    expect(litCount(0.5)).toBe(32);
    expect(litCount(-1)).toBe(0);
    expect(litCount(2)).toBe(64);
  });
});

describe('angleToFrac', () => {
  it('reads the top as the middle of the scale', () => {
    expect(angleToFrac(0, -10)).toBeCloseTo(0.5);
  });
  it('reads the left as a sixth and the right as five sixths', () => {
    expect(angleToFrac(-10, 0)).toBeCloseTo(1 / 6);
    expect(angleToFrac(10, 0)).toBeCloseTo(5 / 6);
  });
  it('snaps the bottom gap to the nearer end', () => {
    expect(angleToFrac(-3, 10)).toBe(0);
    expect(angleToFrac(3, 10)).toBe(1);
  });
  it('pins at an end instead of wrapping around the gap', () => {
    expect(angleToFrac(-3, 10, 0.95)).toBe(1);
    expect(angleToFrac(3, 10, 0.05)).toBe(0);
  });
  it('round-trips with fracToAngle', () => {
    for (const f of [0, 0.2, 0.5, 0.9, 1]) {
      const a = (fracToAngle(f) * Math.PI) / 180;
      expect(angleToFrac(Math.cos(a), Math.sin(a))).toBeCloseTo(f, 5);
    }
  });
});

describe('dialRange', () => {
  const gin = ING_BY_ID.gin;
  it('uses 0 to 4 oz, 120 ml, 12 cl and 4 parts for volumes', () => {
    expect(dialRange(gin, 'oz', 30).max).toBe(4);
    expect(dialRange(gin, 'ml', 30).max).toBe(120);
    expect(dialRange(gin, 'cl', 30).max).toBe(12);
    expect(dialRange(gin, 'parts', 30).max).toBe(4);
  });
  it('counts dashes to 8 and pieces to 10', () => {
    const d = dialRange(ING_BY_ID.angostura, 'oz', 0.9);
    expect([d.max, d.step, d.counted, d.unit]).toEqual([8, 1, true, 'dash']);
    expect(dialRange(ING_BY_ID.mint, 'ml', 6).max).toBe(10);
  });
  it('stretches the scale for an amount beyond it', () => {
    expect(dialRange(gin, 'oz', 150).max).toBe(5);
    expect(dialRange(gin, 'ml', 130).max).toBe(150);
  });
  it('uses fine steps the readout can show exactly', () => {
    const r = dialRange(gin, 'oz', 30);
    expect(r.fine).toBe(0.125);
    expect(Number(r.fine.toFixed(r.dec))).toBe(r.fine);
  });
});

describe('stepping', () => {
  it('moves to the next grid line, even from an off-grid value', () => {
    expect(stepValue(1, 1, 0.25, 4)).toBe(1.25);
    expect(stepValue(0.667, 1, 0.25, 4)).toBe(0.75);
    expect(stepValue(0.667, -1, 0.25, 4)).toBe(0.5);
  });
  it('clamps at both ends', () => {
    expect(stepValue(4, 1, 0.25, 4)).toBe(4);
    expect(stepValue(0, -1, 0.25, 4)).toBe(0);
  });
  it('snaps to the grid', () => {
    expect(snapValue(1.1, 0.25, 4)).toBe(1);
    expect(snapValue(9, 0.25, 4)).toBe(4);
  });
});

describe('scaleTicks', () => {
  it('numbers every major tick and no others', () => {
    const t = scaleTicks(dialRange(ING_BY_ID.gin, 'oz', 30));
    expect(t.filter((x) => x.label).map((x) => x.label)).toEqual(['0', '1', '2', '3', '4']);
    expect(t).toHaveLength(17);
    expect(t[0].frac).toBe(0);
    expect(t[16].frac).toBe(1);
  });
});
