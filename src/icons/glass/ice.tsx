/* Ice for the glassware: real projected cubes (visible faces plus ghost back edges,
   so they read as clear ice) and irregular crushed shards. No filters. */
import type { ReactNode } from 'react';
import type { Ice } from '../garnish';
import { CX, num as f, type Geo } from './geometry';

/** Deterministic pseudo-random in 0..1. */
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const FACES: [number, number, number][][] = [
  // normal-bearing quads as [x, y, z] corners of a unit cube (+-1), with y down
  [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]], // top
  [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]], // front
  [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]], // right
  [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]], // left
  [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]], // back
  [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]], // bottom
];
const NORMALS: [number, number, number][] = [[0, -1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, 1, 0]];

interface Cube { x: number; y: number; s: number; yaw: number; tilt: number; roll: number }

function project(c: Cube) {
  const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), ct = Math.cos(c.tilt), st = Math.sin(c.tilt);
  const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  const h = c.s / 2;
  const rot = ([x, y, z]: [number, number, number]) => {
    const x1 = x * cy + z * sy, z1 = -x * sy + z * cy; // yaw
    const y2 = y * ct + z1 * st, z2 = -y * st + z1 * ct; // tilt, top face toward the viewer
    return [x1, y2, z2] as const;
  };
  const scr = (p: readonly [number, number, number]): [number, number] => [
    c.x + h * (p[0] * cr - p[1] * sr), c.y + h * (p[0] * sr + p[1] * cr),
  ];
  return { rot, scr };
}

const LIGHT = (() => {
  const v = [-0.45, -0.75, 0.5], m = Math.hypot(...v);
  return v.map((n) => n / m);
})();

function cubeNode(c: Cube, key: string): ReactNode {
  const { rot, scr } = project(c);
  const hidden: string[] = [];
  const faces: ReactNode[] = [];
  FACES.forEach((quad, i) => {
    const n = rot(NORMALS[i] as [number, number, number]);
    const pts = quad.map((p) => scr(rot(p)));
    const d = `M${pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z`;
    if (n[2] < 0.03) {
      hidden.push(d);
      return;
    }
    const lit = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    const cxm = pts.reduce((a, p) => a + p[0], 0) / 4, cym = pts.reduce((a, p) => a + p[1], 0) / 4;
    const inner = pts.map((p) => `${f(cxm + (p[0] - cxm) * 0.58)} ${f(cym + (p[1] - cym) * 0.58)}`);
    faces.push(
      <g key={i}>
        <path d={d} fill={`rgba(236,246,255,${(0.1 + 0.36 * lit).toFixed(2)})`} stroke="rgba(255,255,255,.62)" strokeWidth=".7" strokeLinejoin="round" />
        <path d={`M${inner.join('L')}Z`} fill={`rgba(255,255,255,${(0.03 + 0.1 * lit).toFixed(2)})`} stroke="rgba(255,255,255,.22)" strokeWidth=".5" strokeLinejoin="round" />
        {lit > 0.55 && (
          <path d={`M${f(pts[0][0] + (pts[1][0] - pts[0][0]) * 0.18)} ${f(pts[0][1] + (pts[1][1] - pts[0][1]) * 0.18 + 1.2)}L${f(pts[0][0] + (pts[1][0] - pts[0][0]) * 0.5)} ${f(pts[0][1] + (pts[1][1] - pts[0][1]) * 0.5 + 1.2)}`}
            stroke="rgba(255,255,255,.85)" strokeWidth=".9" strokeLinecap="round" fill="none" />
        )}
      </g>,
    );
  });
  return (
    <g key={key}>
      <path d={hidden.join('')} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".5" strokeLinejoin="round" />
      {faces}
    </g>
  );
}

function shardNode(x: number, y: number, r: number, seed: number, key: string): ReactNode {
  const n = 5 + Math.floor(rnd(seed) * 2);
  const a0 = rnd(seed + 1) * Math.PI * 2;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (rnd(seed + 2 + i) - 0.5) * 0.7;
    const rr = r * (0.62 + rnd(seed + 9 + i) * 0.5);
    pts.push(`${f(x + Math.cos(a) * rr)} ${f(y + Math.sin(a) * rr * 0.9)}`);
  }
  const lit = rnd(seed + 5);
  return (
    <path key={key} d={`M${pts.join('L')}Z`} fill={`rgba(238,247,255,${(0.12 + 0.2 * lit).toFixed(2)})`}
      stroke="rgba(255,255,255,.4)" strokeWidth=".45" strokeLinejoin="round" />
  );
}

/** Ice drawn inside the cavity (transparent glasses) or peeking over the rim (opaque vessels). */
export function iceNodes(g: Geo, ice: Ice, yFill: number): ReactNode {
  if (ice === 'none') return null;
  const nodes: ReactNode[] = [];

  if (g.opaque) {
    const rim = g.rimY;
    if (ice === 'crushed') {
      const mound = g.kind === 'julep' ? 13 : g.kind === 'tiki' ? 8 : 6;
      const hw = g.rimIn - 1.5;
      const top = rim - mound;
      nodes.push(
        <path key="dome" d={`M${f(CX - hw)} ${f(rim + 1)}C${f(CX - hw)} ${f(top + 3)} ${f(CX - hw * 0.5)} ${f(top)} ${f(CX)} ${f(top)}S${f(CX + hw)} ${f(top + 3)} ${f(CX + hw)} ${f(rim + 1)}Z`}
          fill="rgba(214,232,246,.55)" />,
      );
      for (let row = 0; row < 4; row++) {
        for (let col = -4; col <= 4; col++) {
          const px = CX + col * 6.4 + (row % 2) * 3.2 + (rnd(row * 13 + col) - 0.5) * 3;
          const d = Math.abs(px - CX) / hw;
          if (d > 1) continue;
          const reach = mound * (1 - d * d * 0.9);
          const py = rim + 1.5 - row * 3.6 - (rnd(col + row * 7) * 2);
          if (rim - py > reach) continue;
          nodes.push(shardNode(px, py, 3.7, row * 37 + col * 11 + 5, `s${row}-${col}`));
        }
      }
    } else {
      const s = ice === 'large-cube' ? 20 : 12;
      const spots = ice === 'large-cube' ? [[0, 1]] : [[-11, 1], [5, -1.5], [16, 2]];
      spots.forEach(([dx, dy], i) => {
        nodes.push(cubeNode({ x: CX + dx, y: rim + dy, s, yaw: 0.3 + i * 0.5, tilt: 0.42, roll: (i - 1) * 0.12 }, `c${i}`));
      });
    }
    return <g>{nodes}</g>;
  }

  const floor = g.floor;
  if (ice === 'large-cube') {
    const s = Math.min(g.hwIn(floor - 14) * 2 * 0.64, 34);
    nodes.push(cubeNode({ x: CX + 1, y: floor - s * 0.58, s, yaw: 0.26, tilt: 0.4, roll: -0.04 }, 'big'));
  } else if (ice === 'cubes') {
    const hwMid = g.hwIn(floor - 14);
    const s = Math.max(9, Math.min(hwMid * 2 * 0.4, 22));
    let y = floor - s * 0.6, row = 0;
    const cubes: Cube[] = [];
    while (row < 6 && y > yFill - s * 0.15) {
      const hw = g.hwIn(Math.min(y + s * 0.5, floor)) - s * 0.55;
      const n = Math.max(1, Math.round((hw * 2) / (s * 1.25)));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5;
        const seed = row * 17 + i * 5 + g.kind.length;
        cubes.push({
          x: CX + (n === 1 ? (rnd(seed) - 0.5) * hw : t * hw * 2) + (row % 2 ? 1.5 : -1.5),
          y: y + (rnd(seed + 3) - 0.5) * 2.4,
          s: s * (0.9 + rnd(seed + 1) * 0.2),
          yaw: 0.2 + rnd(seed + 2) * 0.7, tilt: 0.38 + rnd(seed + 4) * 0.12, roll: (rnd(seed + 6) - 0.5) * 0.45,
        });
      }
      y -= s * 0.82;
      row++;
    }
    cubes.sort((a, b) => a.y - b.y).forEach((c, i) => nodes.push(cubeNode(c, `c${i}`)));
  } else {
    const top = yFill - 2;
    const rows = Math.ceil((floor - top) / 5.4);
    for (let row = 0; row < rows; row++) {
      const py = floor - 2.4 - row * 5.4;
      const hw = g.hwIn(Math.min(py, floor)) - 1.2;
      const cols = Math.max(1, Math.round((hw * 2) / 6));
      for (let c = 0; c < cols; c++) {
        const px = CX - hw + ((c + 0.5 + (row % 2) * 0.35) * (hw * 2)) / cols + (rnd(row * 31 + c) - 0.5) * 2.4;
        nodes.push(shardNode(px, py + (rnd(c + row * 3) - 0.5) * 2, 3.9, row * 53 + c * 7 + 1, `s${row}-${c}`));
      }
    }
  }
  return <g>{nodes}</g>;
}
