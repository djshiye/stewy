/* Glass silhouettes as data. Every glass is a left-half profile (half-width, y) for
   its outside and its inner cavity, in the shared 0 0 120 160 box with the foot on
   y = 156. Splines, clip paths, widths at any height and rim ellipses are derived. */
import type { GlassKind } from '../../data/types';

export type Pt = [number, number];

export const CX = 60;
export const FLOOR_Y = 156;

/** Cubic Bezier segments of a uniform Catmull-Rom spline through the points. */
function bezier(pts: Pt[]): Pt[][] {
  const segs: Pt[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    segs.push([
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ]);
  }
  return segs;
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Spline path through the left half, across the bottom and back up the right half. */
function outline(half: Pt[], close: boolean): string {
  const left = half.map(([w, y]): Pt => [CX - w, y]);
  const right = [...half].reverse().slice(1).map(([w, y]): Pt => [CX + w, y]);
  const all = [...left, ...right];
  let d = `M${f(all[0][0])} ${f(all[0][1])}`;
  for (const [a, b, c] of bezier(all)) d += `C${f(a[0])} ${f(a[1])} ${f(b[0])} ${f(b[1])} ${f(c[0])} ${f(c[1])}`;
  return close ? `${d}Z` : d;
}

/** Flat base: an elliptical floor so the glass sits in the same slight top-down view as its rim. */
const flat = (hw: number, y: number, ry: number): Pt[] => [
  [hw, y], [hw * 0.93, y + ry * 0.55], [hw * 0.62, y + ry * 0.92], [hw * 0.3, y + ry * 0.99], [0, y + ry],
];

export type Body = 'glass' | 'copper' | 'ceramic' | 'metal';

interface Spec {
  body: Body;
  outer: Pt[];
  inner: Pt[];
  /** inner y where the liquid column ends */
  floor: number;
  defaultFill: number;
  stem?: { y0: number; y1: number; hw0: number; hw1: number };
  foot?: { y: number; rx: number };
  handle?: string;
}

const SPECS: Record<GlassKind, Spec> = {
  // wider than tall, heavy base
  rocks: {
    body: 'glass', floor: 145, defaultFill: 0.7,
    outer: [[34, 92], [33.4, 108], [32.4, 126], [31.2, 144], ...flat(30.6, 153.4, 2.6)],
    inner: [[31.5, 92], [31, 108], [30, 126], [28.8, 140], ...flat(28, 143, 2.4)],
  },
  // tall and narrow
  highball: {
    body: 'glass', floor: 148, defaultFill: 0.9,
    outer: [[20, 32], [19.5, 62], [18.8, 100], [18.1, 140], ...flat(17.6, 154.3, 1.7)],
    inner: [[18.2, 32], [17.7, 62], [17, 100], [16.4, 138], ...flat(16, 147, 1.5)],
  },
  // Nick and Nora leaning bowl
  coupe: {
    body: 'glass', floor: 101, defaultFill: 0.86,
    outer: [[33, 66], [32.2, 73], [29, 85], [21.5, 96], [10.5, 103], [0, 105.4]],
    inner: [[31.4, 66], [30.4, 73], [27, 84], [19.5, 94], [9, 100], [0, 102]],
    stem: { y0: 103, y1: 150, hw0: 1.9, hw1: 2.6 },
    foot: { y: 152.6, rx: 22 },
  },
  martini: {
    body: 'glass', floor: 97, defaultFill: 0.88,
    outer: [[41, 52], [28.6, 70.6], [16.2, 89.2], [7, 98], [0, 101.2]],
    inner: [[39.4, 52], [27, 70.5], [14.6, 89], [5.5, 96.5], [0, 98.5]],
    stem: { y0: 99, y1: 150, hw0: 1.8, hw1: 2.6 },
    foot: { y: 152.6, rx: 20 },
  },
  wine: {
    body: 'glass', floor: 97.5, defaultFill: 0.62,
    outer: [[26.8, 44], [29.6, 52], [30.6, 64], [27.9, 79.5], [18.6, 91.6], [8, 98.6], [0, 100.4]],
    inner: [[25, 44], [27.8, 52], [28.8, 64], [26, 78], [17, 90], [7, 96.4], [0, 98]],
    stem: { y0: 99, y1: 150, hw0: 1.9, hw1: 2.7 },
    foot: { y: 152.6, rx: 21 },
  },
  flute: {
    body: 'glass', floor: 101, defaultFill: 0.84,
    outer: [[13, 22], [14.2, 40], [14.8, 60], [14, 81], [10, 96], [4.4, 102.5], [0, 103.6]],
    inner: [[11.4, 22], [12.6, 40], [13.2, 60], [12.4, 80], [8.5, 94], [3.5, 100], [0, 101.5]],
    stem: { y0: 102, y1: 150, hw0: 1.5, hw1: 2.3 },
    foot: { y: 152.6, rx: 18 },
  },
  hurricane: {
    body: 'glass', floor: 136, defaultFill: 0.9,
    outer: [[20.4, 24], [17.6, 38], [16.2, 52], [18.8, 68], [24.8, 84], [28.4, 100], [26.8, 114], [20.8, 126], [11.5, 135], [0, 139.4]],
    inner: [[18.6, 24], [15.8, 38], [14.4, 52], [17, 68], [23, 84], [26.6, 100], [25, 114], [19, 126], [10, 134], [0, 137]],
    stem: { y0: 138, y1: 150, hw0: 3.4, hw1: 4.2 },
    foot: { y: 152.6, rx: 19 },
  },
  // opaque vessels: only the outside and the rim opening matter
  'copper-mug': {
    body: 'copper', floor: 150, defaultFill: 0.95,
    outer: [[30, 72], [29.6, 100], [28.6, 128], ...flat(27.4, 153.4, 2.6)],
    inner: [[28.2, 72.5], [27.8, 100], [26.8, 128], ...flat(26, 150, 2)],
    handle: 'M89 86C112 82 113 130 87.5 135',
  },
  tiki: {
    body: 'ceramic', floor: 148, defaultFill: 0.95,
    outer: [[28.5, 78], [29.2, 92], [30, 115], [29, 140], ...flat(27.6, 153.4, 2.6)],
    inner: [[26.6, 78.5], [27.2, 92], [28, 115], [27, 140], ...flat(25.8, 148, 2)],
    handle: 'M89 94C111 90 112 132 87.5 138',
  },
  julep: {
    body: 'metal', floor: 128, defaultFill: 0.95,
    outer: [[31.4, 74], [29.4, 90], [26.4, 108], [23.6, 124], ...flat(22.6, 130, 2.2)],
    inner: [[29.8, 74.5], [27.8, 90], [24.8, 108], [22, 124], ...flat(21, 128, 2)],
    stem: { y0: 131, y1: 150, hw0: 7, hw1: 10.5 },
    foot: { y: 152.6, rx: 23 },
  },
};

export interface Geo extends Spec {
  kind: GlassKind;
  innerPath: string;
  /** inner wall as an open path (no closing line across the rim) */
  innerStroke: string;
  outerPath: string;
  rimY: number;
  /** half widths of the inner cavity and the outside at the rim */
  rimIn: number;
  rimOut: number;
  /** semi-minor axes of the rim ellipse (outside) and cavity opening */
  ryOut: number;
  ryIn: number;
  opaque: boolean;
  hwIn(y: number): number;
  hwOut(y: number): number;
  /** lowest y of the outside silhouette */
  bottomOut: number;
}

const PERSP = 0.092;

/** Dense sample of the spline through the left half, as [y, halfwidth] sorted by y. */
function sampler(half: Pt[]): (y: number) => number {
  const dense: Pt[] = [];
  const first = half[0];
  dense.push([first[1], first[0]]);
  let prev: Pt = first;
  for (const [a, b, c] of bezier(half)) {
    for (let s = 1; s <= 10; s++) {
      const t = s / 10, u = 1 - t;
      const x = u * u * u * prev[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * c[0];
      const y = u * u * u * prev[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * c[1];
      dense.push([y, x]);
    }
    prev = c;
  }
  return (y: number) => {
    if (y <= dense[0][0]) return dense[0][1];
    for (let i = 1; i < dense.length; i++) {
      const [y1, w1] = dense[i];
      if (y <= y1) {
        const [y0, w0] = dense[i - 1];
        return y1 === y0 ? w1 : w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
      }
    }
    return dense[dense.length - 1][1];
  };
}

const cache = new Map<GlassKind, Geo>();

export function geoFor(kind: GlassKind): Geo {
  const hit = cache.get(kind);
  if (hit) return hit;
  const s = SPECS[kind];
  const rimOut = s.outer[0][0], rimIn = s.inner[0][0];
  const g: Geo = {
    ...s,
    kind,
    outerPath: outline(s.outer, true),
    innerPath: outline(s.inner, true),
    innerStroke: outline(s.inner, false),
    rimY: s.inner[0][1],
    rimIn, rimOut,
    ryOut: Math.max(2, rimOut * PERSP),
    ryIn: Math.max(1.7, rimIn * PERSP),
    opaque: s.body !== 'glass',
    hwIn: sampler(s.inner),
    hwOut: sampler(s.outer),
    bottomOut: s.outer[s.outer.length - 1][1],
  };
  cache.set(kind, g);
  return g;
}

/** Perspective ratio shared by every ellipse on a glass. */
export const ry = (hw: number) => Math.max(1.4, hw * PERSP);

export const num = f;
