/* Garnish drawings. Each garnish returns up to three layers so it can sit in the
   glass properly: `sub` (inside the drink, tinted by the liquid), `mid` (on the surface
   or perched on the rim, seen through the front wall) and `over` (in front of the glass). */
import type { ReactNode } from 'react';
import type { GarnishKind, Ice } from '../garnish';
import { CX, num as f, ry as persp, type Geo, type Pt } from './geometry';
import { rnd } from './ice';

export interface GarnishCtx {
  uid: string;
  g: Geo;
  yFill: number;
  ice: Ice;
  /** which side of the glass this garnish prefers */
  side: 1 | -1;
  /** size factor from the glass width */
  k: number;
}

export interface Layers { sub?: ReactNode; mid?: ReactNode; over?: ReactNode }

const id = (c: GarnishCtx, n: string) => `url(#${c.uid}-${n})`;

/* ---------------- shared gradient defs ---------------- */

interface Citrus { rind: string; rindDark: string; pith: string; flesh0: string; flesh1: string }
const CITRUS: Record<string, Citrus> = {
  orange: { rind: '#f0902a', rindDark: '#b75a0b', pith: '#fbe9c4', flesh0: '#ffc14d', flesh1: '#ee8210' },
  lime: { rind: '#6ca82f', rindDark: '#3f7219', pith: '#eaf3c6', flesh0: '#d7ee82', flesh1: '#8cc13f' },
  lemon: { rind: '#f1d21f', rindDark: '#b99806', pith: '#fdf5c9', flesh0: '#fff4a8', flesh1: '#f2d23c' },
  grapefruit: { rind: '#eab84a', rindDark: '#b98414', pith: '#fcefd6', flesh0: '#ffa89a', flesh1: '#e8606b' },
};

const CITRUS_KIND: Partial<Record<GarnishKind, string>> = {
  'orange-wheel': 'orange', 'lime-wheel': 'lime', 'lime-wedge': 'lime', 'lemon-wheel': 'lemon', 'grapefruit-wedge': 'grapefruit',
};

export function garnishDefs(kinds: GarnishKind[], uid: string): ReactNode {
  const out: ReactNode[] = [];
  const seen = new Set<string>();
  const once = (key: string, node: ReactNode) => { if (!seen.has(key)) { seen.add(key); out.push(node); } };
  for (const kind of kinds) {
    const cit = CITRUS_KIND[kind];
    if (cit) {
      const c = CITRUS[cit];
      once(`c-${cit}`, (
        <radialGradient key={`c-${cit}`} id={`${uid}-flesh-${cit}`} cx=".42" cy=".4" r=".7">
          <stop offset="0" stopColor={c.flesh0} /><stop offset="1" stopColor={c.flesh1} />
        </radialGradient>
      ));
    }
    if (kind === 'mint-sprig' || kind === 'celery') {
      once('leaf', (
        <linearGradient key="leaf" id={`${uid}-leaf`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2c7a40" /><stop offset=".6" stopColor="#4fa653" /><stop offset="1" stopColor="#8fd37a" />
        </linearGradient>
      ));
      once('leaf2', (
        <linearGradient key="leaf2" id={`${uid}-celeryleaf`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#5d9a2e" /><stop offset="1" stopColor="#b6dc6c" />
        </linearGradient>
      ));
    }
    if (kind === 'cherry') {
      once('cherry', (
        <radialGradient key="cherry" id={`${uid}-cherry`} cx=".34" cy=".3" r=".8">
          <stop offset="0" stopColor="#f0505f" /><stop offset=".45" stopColor="#c11a35" /><stop offset="1" stopColor="#5e0716" />
        </radialGradient>
      ));
    }
    if (kind === 'olive-pick') {
      once('olive', (
        <radialGradient key="olive" id={`${uid}-olive`} cx=".36" cy=".32" r=".8">
          <stop offset="0" stopColor="#c3cd5f" /><stop offset=".5" stopColor="#8b9a2f" /><stop offset="1" stopColor="#4b5716" />
        </radialGradient>
      ));
      once('steel', (
        <linearGradient key="steel" id={`${uid}-steel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5f7fa" /><stop offset=".5" stopColor="#aeb7c3" /><stop offset="1" stopColor="#e9edf2" />
        </linearGradient>
      ));
    }
    if (kind === 'coffee-beans') {
      once('bean', (
        <radialGradient key="bean" id={`${uid}-bean`} cx=".38" cy=".3" r=".85">
          <stop offset="0" stopColor="#8a5a34" /><stop offset=".55" stopColor="#4d2c16" /><stop offset="1" stopColor="#21110a" />
        </radialGradient>
      ));
    }
    if (kind === 'raspberry' || kind === 'blackberry') {
      once(kind, (
        <radialGradient key={kind} id={`${uid}-${kind}`} cx=".35" cy=".3" r=".85">
          {kind === 'raspberry'
            ? <><stop offset="0" stopColor="#f0506c" /><stop offset=".6" stopColor="#c01c40" /><stop offset="1" stopColor="#780a24" /></>
            : <><stop offset="0" stopColor="#6a4c84" /><stop offset=".55" stopColor="#35204a" /><stop offset="1" stopColor="#150b20" /></>}
        </radialGradient>
      ));
    }
    if (kind === 'pineapple-wedge') {
      once('pine', (
        <radialGradient key="pine" id={`${uid}-pine`} cx=".5" cy=".85" r=".95">
          <stop offset="0" stopColor="#ffe97a" /><stop offset="1" stopColor="#f0bd2a" />
        </radialGradient>
      ));
    }
    if (kind === 'passion-fruit') {
      once('pulp', (
        <radialGradient key="pulp" id={`${uid}-pulp`} cx=".45" cy=".4" r=".7">
          <stop offset="0" stopColor="#ffd21a" /><stop offset="1" stopColor="#f08a00" />
        </radialGradient>
      ));
    }
    if (kind === 'ginger') {
      once('ginger', (
        <linearGradient key="ginger" id={`${uid}-ginger`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0c36a" /><stop offset="1" stopColor="#c68a2c" />
        </linearGradient>
      ));
    }
  }
  return out;
}

/* ---------------- ribbons (peel, twist, cucumber) ---------------- */

interface Run { d: string; face: 1 | -1; mid: Pt[] }

function ribbon(centre: (t: number) => Pt, half: (t: number) => number, face: (t: number) => number, n = 30): Run[] {
  const L: Pt[] = [], R: Pt[] = [], C: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = centre(Math.max(0, t - 0.01)), b = centre(Math.min(1, t + 0.01)), p = centre(t);
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    const nx = -dy / m, ny = dx / m, h = half(t);
    L.push([p[0] + nx * h, p[1] + ny * h]);
    R.push([p[0] - nx * h, p[1] - ny * h]);
    C.push(p);
  }
  const runs: Run[] = [];
  let start = 0;
  const sign = (i: number) => (face((i + 0.5) / n) >= 0 ? 1 : -1);
  for (let i = 1; i <= n; i++) {
    if (i === n || sign(i) !== sign(start)) {
      const idx: number[] = [];
      for (let j = start; j <= i; j++) idx.push(j);
      const fwd = idx.map((j) => `${f(L[j][0])} ${f(L[j][1])}`);
      const back = [...idx].reverse().map((j) => `${f(R[j][0])} ${f(R[j][1])}`);
      runs.push({ d: `M${fwd.join('L')}L${back.join('L')}Z`, face: sign(start) as 1 | -1, mid: idx.map((j) => C[j]) });
      start = i;
    }
  }
  return runs;
}

/** Zest on the outside, pith on the inside; the pale edge shows where the knife went. */
interface PeelPalette { zest: string; zestEdge: string; pith: string; pithEdge: string; shade: string }

const ORANGE_PEEL: PeelPalette = { zest: '#f48a17', zestEdge: '#fde7b4', pith: '#fbf0cf', pithEdge: '#e4c585', shade: 'rgba(86,34,0,.38)' };
const LEMON_PEEL: PeelPalette = { zest: '#f4d422', zestEdge: '#fff6c4', pith: '#fbf3c3', pithEdge: '#d9c35a', shade: 'rgba(92,70,0,.36)' };

const CUCUMBER_PEEL: PeelPalette = { zest: '#4f9a43', zestEdge: '#c4e6a2', pith: '#e8f3c8', pithEdge: '#a9c97b', shade: 'rgba(16,56,18,.3)' };

/** A peel strip: a soft shadow, back faces first, then front faces with a pale edge and a fine highlight. */
function peelNode(runs: Run[], pal: PeelPalette, w: number, key: string): ReactNode {
  const back = runs.filter((r) => r.face < 0), front = runs.filter((r) => r.face > 0);
  const line = (r: Run, dx: number, dy: number, a: number, b: number) => {
    const pts = r.mid.slice(Math.floor(r.mid.length * a), Math.max(2, Math.ceil(r.mid.length * b)));
    return `M${pts.map((p) => `${f(p[0] + dx)} ${f(p[1] + dy)}`).join('L')}`;
  };
  return (
    <g key={key} strokeLinejoin="round" strokeLinecap="round">
      <g transform={`translate(${f(w * 0.9)} ${f(w * 1.4)})`} fill={pal.shade}>
        {runs.map((r, i) => <path key={i} d={r.d} />)}
      </g>
      {back.map((r, i) => <path key={`b${i}`} d={r.d} fill={pal.pith} stroke={pal.pithEdge} strokeWidth={w} />)}
      {front.map((r, i) => (
        <g key={`f${i}`}>
          <path d={r.d} fill={pal.zest} stroke={pal.zestEdge} strokeWidth={w} />
          {r.mid.length > 3 && (
            <path d={line(r, -0.35, -0.45, 0.1, 0.9)} stroke="rgba(255,255,255,.8)" strokeWidth={w * 0.55} fill="none" />
          )}
        </g>
      ))}
    </g>
  );
}

const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt) => (t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/* ---------------- fruit shapes ---------------- */

function wheel(c: GarnishCtx, cit: string, x: number, y: number, r: number, rot: number, key: string): ReactNode {
  const col = CITRUS[cit];
  const segs = 8;
  const lines: string[] = [];
  const sacs: string[] = [];
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    lines.push(`M${f(Math.cos(a) * r * 0.1)} ${f(Math.sin(a) * r * 0.1)}L${f(Math.cos(a) * r * 0.84)} ${f(Math.sin(a) * r * 0.84)}`);
    const m = a + Math.PI / segs;
    for (const q of [0.42, 0.62]) {
      sacs.push(`M${f(Math.cos(m - 0.1) * r * q)} ${f(Math.sin(m - 0.1) * r * q)}L${f(Math.cos(m + 0.1) * r * (q + 0.12))} ${f(Math.sin(m + 0.1) * r * (q + 0.12))}`);
    }
  }
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(1 .92)`}>
      <circle r={r} fill={col.rind} stroke={col.rindDark} strokeWidth=".5" />
      <circle r={r * 0.9} fill={col.pith} />
      <circle r={r * 0.82} fill={id(c, `flesh-${cit}`)} />
      <path d={lines.join('')} stroke={col.pith} strokeWidth={Math.max(0.7, r * 0.075)} strokeLinecap="round" />
      <path d={sacs.join('')} stroke="rgba(255,255,255,.4)" strokeWidth=".45" strokeLinecap="round" />
      <circle r={r * 0.09} fill={col.pith} />
      <path d={`M${f(-r * 0.78)} ${f(-r * 0.3)}A${f(r * 0.84)} ${f(r * 0.84)} 0 0 1 ${f(-r * 0.2)} ${f(-r * 0.8)}`} stroke="rgba(255,255,255,.4)" strokeWidth={r * 0.07} fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A wedge: a 100 degree sector, apex down, rind arc up. */
function wedge(c: GarnishCtx, cit: string, x: number, y: number, r: number, rot: number, key: string): ReactNode {
  const col = CITRUS[cit];
  const half = (52 * Math.PI) / 180;
  const sec = (rr: number, a: number) => {
    const px = Math.sin(a) * rr, py = -Math.cos(a) * rr;
    return `M0 0L${f(-px)} ${f(py)}A${f(rr)} ${f(rr)} 0 0 1 ${f(px)} ${f(py)}Z`;
  };
  const lines: string[] = [];
  for (const a of [-0.45, 0, 0.45]) lines.push(`M0 ${f(-r * 0.08)}L${f(Math.sin(a) * r * 0.86)} ${f(-Math.cos(a) * r * 0.86)}`);
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`}>
      <path d={sec(r, half)} fill={col.rind} stroke={col.rindDark} strokeWidth=".5" strokeLinejoin="round" />
      <path d={sec(r * 0.92, half * 0.97)} fill={col.pith} />
      <path d={sec(r * 0.85, half * 0.9)} fill={id(c, `flesh-${cit}`)} />
      <path d={lines.join('')} stroke={col.pith} strokeWidth={Math.max(0.7, r * 0.06)} strokeLinecap="round" />
      <path d={`M${f(-r * 0.5)} ${f(-r * 0.62)}Q${f(-r * 0.2)} ${f(-r * 0.86)} ${f(r * 0.1)} ${f(-r * 0.86)}`} stroke="rgba(255,255,255,.45)" strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
    </g>
  );
}

function leafPath(l: number, w: number) {
  return `M0 0C${f(w * 0.95)} ${f(-l * 0.22)} ${f(w * 0.85)} ${f(-l * 0.74)} 0 ${f(-l)}C${f(-w * 0.85)} ${f(-l * 0.74)} ${f(-w * 0.95)} ${f(-l * 0.22)} 0 0Z`;
}

function berry(c: GarnishCtx, kind: 'raspberry' | 'blackberry', x: number, y: number, r: number, key: string): ReactNode {
  const dr = r * (kind === 'raspberry' ? 0.42 : 0.4);
  const pts: Pt[] = [[0, 0]];
  const rings = kind === 'raspberry' ? [[6, 0.62], [5, 1.12]] : [[6, 0.6], [6, 1.15], [3, 1.6]];
  rings.forEach(([n, rad], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ri * 0.5;
      pts.push([Math.cos(a) * r * rad, Math.sin(a) * r * rad * 0.9 - (rad > 1.4 ? r * 0.2 : 0)]);
    }
  });
  const fill = id(c, kind);
  const dark = kind === 'raspberry' ? '#6c0720' : '#0f0618';
  return (
    <g key={key} transform={`translate(${f(x)} ${f(y)})`}>
      <ellipse rx={r * 1.2} ry={r * 1.05} fill={dark} />
      {pts.sort((a, b) => a[1] - b[1]).map((p, i) => (
        <g key={i}>
          <circle cx={f(p[0])} cy={f(p[1])} r={f(dr)} fill={fill} stroke={dark} strokeWidth=".3" />
          <circle cx={f(p[0] - dr * 0.3)} cy={f(p[1] - dr * 0.35)} r={f(dr * 0.28)} fill="rgba(255,255,255,.6)" />
        </g>
      ))}
    </g>
  );
}

function cherryNode(c: GarnishCtx, x: number, y: number, r: number, stemTo: Pt, key: string): ReactNode {
  const sx = x + (stemTo[0] - x) * 0.2;
  return (
    <g key={key}>
      <path d={`M${f(sx)} ${f(y - r * 0.7)}C${f(sx + (stemTo[0] - x) * 0.1)} ${f(y - r * 2)} ${f(stemTo[0] - (stemTo[0] - x) * 0.3)} ${f(stemTo[1] + 6)} ${f(stemTo[0])} ${f(stemTo[1])}`}
        fill="none" stroke="#7a4e2c" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx={f(x)} cy={f(y)} r={f(r)} fill={id(c, 'cherry')} />
      <path d={`M${f(x - r * 0.15)} ${f(y - r * 0.85)}Q${f(x + r * 0.1)} ${f(y - r * 0.55)} ${f(x + r * 0.05)} ${f(y - r * 0.3)}`} fill="none" stroke="rgba(60,0,10,.5)" strokeWidth=".8" strokeLinecap="round" />
      <ellipse cx={f(x - r * 0.38)} cy={f(y - r * 0.38)} rx={f(r * 0.3)} ry={f(r * 0.2)} transform={`rotate(-35 ${f(x - r * 0.38)} ${f(y - r * 0.38)})`} fill="rgba(255,255,255,.65)" />
    </g>
  );
}

/* ---------------- placement ---------------- */

function surfaceHw(c: GarnishCtx) { return c.g.hwIn(c.yFill); }

/** The garnish, drawn for a glass. */
export function drawGarnish(kind: GarnishKind, c: GarnishCtx): Layers {
  const { g, side, k } = c;
  const rim = g.rimY, rx = g.rimOut;
  const hwS = surfaceHw(c);
  const ryS = persp(hwS);
  const L = CX + side * rx; // rim edge on the preferred side
  const key = kind;

  switch (kind) {
    case 'orange-wheel':
    case 'lime-wheel':
    case 'lemon-wheel': {
      const cit = CITRUS_KIND[kind]!;
      const r = Math.min(11.5 * k, rx * 0.62);
      return { mid: wheel(c, cit, CX + side * rx * 0.5, rim - 2.5 * k, r, side * 14, key) };
    }
    case 'lime-wedge':
    case 'grapefruit-wedge': {
      const cit = CITRUS_KIND[kind]!;
      const r = Math.min(14.5 * k, rx * 0.74);
      return { mid: wedge(c, cit, CX + side * rx * 0.48, rim + 3 * k, r, side * 16, key) };
    }
    case 'orange-peel': {
      // A thin expressed strip: in over the drink, an arch across the rim, a half twist at the tail.
      const inward = -side * Math.min(rx * 0.5, 17);
      const centre = bez(
        [L + inward, rim + 4.5], [L + inward * 0.45, rim - 9 * k], [L + side * 3 * k, rim - 9.5 * k], [L + side * 7 * k, rim + 9 * k],
      );
      const cen = (t: number): Pt => {
        const p = centre(t);
        return [p[0] + Math.sin(t * Math.PI * 2.1) * 0.9 * side, p[1]];
      };
      const half = 2.3 * k;
      const taper = (t: number) => Math.pow(Math.sin(Math.PI * (0.02 + 0.96 * t)), 0.45);
      const face = (t: number) => Math.cos(((Math.PI * 0.5) * t) / 0.8);
      const runs = ribbon(cen, (t) => half * taper(t) * (0.3 + 0.7 * Math.abs(face(t))), face, 40);
      const oil: ReactNode[] = [[3, -12, 0.7], [-1.5, -14.5, 0.5], [6, -14.5, 0.45]].map(([dx, dy, r], i) => (
        <circle key={i} cx={f(L + side * dx * k)} cy={f(rim + dy * k)} r={r} fill="#ffb347" opacity={0.42 - i * 0.07} />
      ));
      return { over: <g key={key}>{peelNode(runs, ORANGE_PEEL, 0.6, 'p')}{oil}</g> };
    }
    case 'lemon-twist': {
      // A hook over the rim, then a real spiral coil that hangs down the outside wall.
      const rc = 3.2 * k, turns = 3, tH = 0.2, y0 = rim + 2, len = 25 * k;
      const axisX = (y: number) => CX + side * (g.hwOut(Math.min(g.floor, Math.max(rim, y))) + rc * 0.4);
      const hook = bez(
        [L - side * 8 * k, rim + 4], [L - side * 3 * k, rim - 8 * k], [axisX(y0) - side * 1, rim - 6 * k], [axisX(y0), y0],
      );
      const cen = (t: number): Pt => {
        if (t < tH) return hook(t / tH);
        const u = (t - tH) / (1 - tH);
        const y = y0 + len * u;
        const ph = Math.PI * 2 * turns * u;
        const env = Math.min(1, u * 5);
        return [axisX(y) + Math.sin(ph) * rc * env, y + Math.cos(ph) * rc * 0.6 * env];
      };
      const face = (t: number) => (t < tH ? 1 : Math.cos(Math.PI * 2 * turns * ((t - tH) / (1 - tH))));
      const taper = (t: number) => Math.pow(Math.sin(Math.PI * (0.02 + 0.96 * t)), 0.4);
      const runs = ribbon(cen, (t) => 1.45 * k * taper(t) * (t < tH ? 1 : 0.55 + 0.45 * Math.abs(face(t))), face, 100);
      return { over: <g key={key}>{peelNode(runs, LEMON_PEEL, 0.5, 'p')}</g> };
    }
    case 'mint-sprig': {
      const by = rim + 8;
      const sc = Math.min(1, (by - 2) / 48) * k * 0.82;
      const drop = Math.max(0, c.yFill + 5 - by) / sc;
      const leaves: [number, number, number, number, number][] = [
        // x, y, length, width, rotation
        [-1, -17, 9, 4.8, -52], [3.5, -19, 9, 4.8, 54],
        [-9.5, -22, 11.5, 5.8, -50], [11, -20, 11.5, 5.8, 48],
        [-4.5, -29, 12, 6, -22], [5.5, -30, 12, 6, 24],
        [1, -32, 12.6, 6.4, 2], [-6.5, -15, 8, 4.2, -86], [8, -14, 8, 4.2, 84],
      ];
      return {
        sub: (
          <g key={key} transform={`translate(${f(CX + side * hwS * 0.22)} ${f(by)}) scale(${f(sc)})`}>
            <g stroke="#3d7a3a" strokeWidth="1.1" strokeLinecap="round" fill="none">
              <path d={`M0 ${f(drop)}L0 0C0 -10 1 -22 1 -32`} />
              <path d="M0.4 -9Q6 -15 11 -20" />
              <path d="M0 -13Q-5 -18 -9.5 -22" />
            </g>
            {leaves.map(([x, y, l0, w0, r], i) => {
              const l = l0 * 1.22, w = w0 * 1.22;
              return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
                <path d={leafPath(l, w)} fill={id(c, 'leaf')} stroke="#1f5a2c" strokeWidth=".35" strokeLinejoin="round" />
                <path d={`M0 0L0 ${f(-l * 0.86)}`} stroke="rgba(214,245,190,.6)" strokeWidth=".5" strokeLinecap="round" />
                <path d={`M0 ${f(-l * 0.3)}L${f(w * 0.5)} ${f(-l * 0.5)}M0 ${f(-l * 0.3)}L${f(-w * 0.5)} ${f(-l * 0.5)}M0 ${f(-l * 0.55)}L${f(w * 0.42)} ${f(-l * 0.72)}M0 ${f(-l * 0.55)}L${f(-w * 0.42)} ${f(-l * 0.72)}`}
                  stroke="rgba(214,245,190,.3)" strokeWidth=".35" strokeLinecap="round" />
              </g>
              );
            })}
          </g>
        ),
      };
    }
    case 'cherry': {
      const r = 5.6 * k;
      const sunk = g.kind === 'coupe' || g.kind === 'martini';
      if (sunk) {
        const y = g.floor - r - 1.2;
        return { sub: cherryNode(c, CX + side * 3, y, r, [CX + side * 11, rim - 7 * k], key) };
      }
      const x = CX + side * hwS * 0.34, y = Math.min(c.yFill, rim + 6) - r * 0.35;
      return { mid: cherryNode(c, x, y, r, [x + side * 9, Math.max(6, rim - 9 * k)], key) };
    }
    case 'olive-pick': {
      const A: Pt = [CX - side * hwS * 0.5, c.yFill + (g.floor - c.yFill) * 0.55];
      const B: Pt = [CX + side * (rx + 5), Math.max(5, rim - 17 * k)];
      const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
      const at = (t: number): Pt => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
      const o = [at(0.2), at(0.43)];
      return {
        sub: (
          <g key={key}>
            <path d={`M${f(A[0])} ${f(A[1])}L${f(B[0])} ${f(B[1])}`} stroke="#8d97a5" strokeWidth="1.5" strokeLinecap="round" />
            <path d={`M${f(A[0])} ${f(A[1] - 0.4)}L${f(B[0])} ${f(B[1] - 0.4)}`} stroke="#eef2f7" strokeWidth=".6" strokeLinecap="round" />
            <circle cx={f(B[0])} cy={f(B[1])} r="2.1" fill={id(c, 'steel')} stroke="#7d8896" strokeWidth=".4" />
            {o.map((p, i) => (
              <g key={i} transform={`translate(${f(p[0])} ${f(p[1])}) rotate(${f(ang)})`}>
                <ellipse rx={f(6 * k)} ry={f(4.6 * k)} fill={id(c, 'olive')} stroke="#3c4610" strokeWidth=".4" />
                <ellipse cx={f(-5.2 * k)} rx={f(1.4 * k)} ry={f(2 * k)} fill="#d2402f" stroke="#7f1c12" strokeWidth=".3" />
                <ellipse cx={f(-1.5 * k)} cy={f(-2.2 * k)} rx={f(2.2 * k)} ry={f(1 * k)} fill="rgba(255,255,255,.45)" />
              </g>
            ))}
          </g>
        ),
      };
    }
    case 'pineapple-wedge': {
      const r = Math.min(16 * k, rx * 0.8);
      const x = CX + side * rx * 0.5, y = rim + 3 * k;
      const rot = side * 18;
      const blades: ReactNode[] = [];
      for (let i = 0; i < 5; i++) {
        const a = -60 + i * 30;
        blades.push(
          <path key={i} transform={`rotate(${a})`} d={`M0 ${f(-r * 0.92)}C${f(3)} ${f(-r * 1.1)} ${f(2.2)} ${f(-r * 1.3)} 0 ${f(-r * 1.5)}C${f(-2.2)} ${f(-r * 1.3)} ${f(-3)} ${f(-r * 1.1)} 0 ${f(-r * 0.92)}Z`}
            fill={i % 2 ? '#3f8f3f' : '#58a548'} stroke="#2a6a2c" strokeWidth=".3" />,
        );
      }
      const half = (50 * Math.PI) / 180;
      const sec = (rr: number, a: number) => {
        const px = Math.sin(a) * rr, py = -Math.cos(a) * rr;
        return `M0 0L${f(-px)} ${f(py)}A${f(rr)} ${f(rr)} 0 0 1 ${f(px)} ${f(py)}Z`;
      };
      const fibres: string[] = [];
      for (let i = -3; i <= 3; i++) {
        const a = i * 0.2;
        fibres.push(`M${f(Math.sin(a) * r * 0.25)} ${f(-Math.cos(a) * r * 0.25)}L${f(Math.sin(a) * r * 0.8)} ${f(-Math.cos(a) * r * 0.8)}`);
      }
      const bumps: string[] = [];
      for (let i = -4; i <= 4; i++) {
        const a = i * 0.19;
        bumps.push(`M${f(Math.sin(a - 0.07) * r * 0.97)} ${f(-Math.cos(a - 0.07) * r * 0.97)}L${f(Math.sin(a) * r * 0.9)} ${f(-Math.cos(a) * r * 0.9)}L${f(Math.sin(a + 0.07) * r * 0.97)} ${f(-Math.cos(a + 0.07) * r * 0.97)}`);
      }
      return {
        mid: (
          <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${rot})`}>
            <g transform="translate(0 0)">{blades}</g>
            <path d={sec(r, half)} fill="#c99a2c" stroke="#8a6414" strokeWidth=".5" strokeLinejoin="round" />
            <path d={bumps.join('')} stroke="#7a5510" strokeWidth=".45" fill="none" />
            <path d={sec(r * 0.88, half * 0.94)} fill={id(c, 'pine')} />
            <path d={fibres.join('')} stroke="rgba(255,250,200,.55)" strokeWidth=".5" strokeLinecap="round" />
            <path d={`M${f(-r * 0.45)} ${f(-r * 0.55)}Q${f(-r * 0.2)} ${f(-r * 0.78)} ${f(r * 0.1)} ${f(-r * 0.78)}`} stroke="rgba(255,255,255,.5)" strokeWidth=".7" fill="none" strokeLinecap="round" />
          </g>
        ),
      };
    }
    case 'coffee-beans': {
      const spots: [number, number, number][] = [[-0.34, 0.15, -25], [0.02, -0.5, 18], [0.36, 0.2, 62]];
      const s = Math.min(1, hwS / 20) * k;
      return {
        mid: (
          <g key={key}>
            {spots.map(([dx, dy, rot], i) => {
              const x = CX + dx * hwS, y = c.yFill + dy * ryS * 1.2;
              return (
                <g key={i} transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(s)})`}>
                  <ellipse rx="3.9" ry="2.6" fill={id(c, 'bean')} stroke="#1a0d06" strokeWidth=".35" />
                  <path d="M-3.4 .2C-1.2 -1.6 1.2 1.6 3.4 -.2" stroke="#150a05" strokeWidth=".75" fill="none" strokeLinecap="round" />
                  <ellipse cx="-1.2" cy="-1.3" rx="1.6" ry=".7" fill="rgba(255,235,200,.35)" />
                </g>
              );
            })}
          </g>
        ),
      };
    }
    case 'celery': {
      const S: Pt = [CX + side * hwS * 0.3, c.yFill + (g.floor - c.yFill) * 0.7];
      const T: Pt = [CX + side * Math.min(hwS * 0.95, 16), Math.max(16, rim - 24 * k)];
      const Q: Pt = [S[0] + (T[0] - S[0]) * 0.3 - side * 2, S[1] + (T[1] - S[1]) * 0.55];
      const stalk = `M${f(S[0])} ${f(S[1])}Q${f(Q[0])} ${f(Q[1])} ${f(T[0])} ${f(T[1])}`;
      const leaves: [number, number][] = [[12, 0], [10, -22], [10, 24], [8, -48], [8, 50]];
      return {
        sub: (
          <g key={key} strokeLinecap="round" fill="none">
            <path d={stalk} stroke="#5e8f2c" strokeWidth={f(6 * k)} />
            <path d={stalk} stroke="#a8cf62" strokeWidth={f(4.4 * k)} />
            <path d={stalk} stroke="rgba(70,110,30,.5)" strokeWidth=".5" strokeDasharray="0" transform="translate(-1.2 0)" />
            <path d={stalk} stroke="rgba(70,110,30,.5)" strokeWidth=".5" transform="translate(1.2 0)" />
            <path d={stalk} stroke="rgba(255,255,230,.45)" strokeWidth=".9" transform="translate(-.6 0)" />
            {leaves.map(([l, r], i) => (
              <g key={i} transform={`translate(${f(T[0])} ${f(T[1] + 1)}) rotate(${r + side * 6})`}>
                <path d={leafPath(l * k, 4.2 * k)} fill={id(c, 'celeryleaf')} stroke="#4a7a22" strokeWidth=".35" />
                <path d={`M0 0L0 ${f(-l * k * 0.8)}`} stroke="rgba(230,250,190,.6)" strokeWidth=".45" />
              </g>
            ))}
          </g>
        ),
      };
    }
    case 'salt-rim':
    case 'sugar-rim': {
      const salt = kind === 'salt-rim';
      const ryo = g.ryOut;
      const grains: ReactNode[] = [];
      const n = salt ? 46 : 70;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (0.02 + 0.96 * rnd(i * 3 + 1));
        const off = (rnd(i * 3 + 2) - 0.5) * 3.2;
        const gx = CX + (rx + off * 0.7) * Math.cos(a);
        const gy = rim + (ryo + off * 0.4) * Math.sin(a) + rnd(i * 3 + 3) * (salt ? 3 : 2.2);
        const gr = salt ? 0.45 + rnd(i + 70) * 0.65 : 0.3 + rnd(i + 70) * 0.4;
        grains.push(
          salt
            ? <rect key={i} x={f(gx)} y={f(gy)} width={f(gr * 1.8)} height={f(gr * 1.8)} transform={`rotate(${f(rnd(i) * 90)} ${f(gx)} ${f(gy)})`} fill="#fff" opacity={0.7 + rnd(i + 5) * 0.3} />
            : <circle key={i} cx={f(gx)} cy={f(gy)} r={f(gr)} fill="#fffdf6" opacity={0.75 + rnd(i + 5) * 0.25} />,
        );
      }
      const sparkles: ReactNode[] = salt ? [] : [0.18, 0.5, 0.82].map((u, i) => {
        const a = Math.PI * u;
        const gx = CX + rx * Math.cos(a), gy = rim + ryo * Math.sin(a) + 2;
        return <path key={i} d={`M${f(gx - 1.6)} ${f(gy)}L${f(gx + 1.6)} ${f(gy)}M${f(gx)} ${f(gy - 1.6)}L${f(gx)} ${f(gy + 1.6)}`} stroke="#fff" strokeWidth=".4" opacity=".9" />;
      });
      return {
        over: (
          <g key={key}>
            <path d={`M${f(CX - rx)} ${f(rim)}A${f(rx)} ${f(ryo)} 0 0 0 ${f(CX + rx)} ${f(rim)}`} fill="none"
              stroke={salt ? 'rgba(255,255,255,.62)' : 'rgba(255,250,236,.58)'} strokeWidth={salt ? 3.4 : 2.8} strokeLinecap="round" />
            {grains}{sparkles}
          </g>
        ),
      };
    }
    case 'cucumber-ribbon': {
      const y0 = c.yFill + (g.floor - c.yFill) * 0.8;
      const yTop = Math.max(4, rim - 8 * k);
      const cen = (t: number): Pt => {
        const y = y0 + (yTop - y0) * t;
        const w = g.hwIn(Math.min(Math.max(y, rim), g.floor));
        return [CX + side * w * (0.55 + 0.22 * Math.sin(Math.PI * 2 * 1.25 * t)), y];
      };
      const taper = (t: number) => Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * t)), 0.5);
      const runs = ribbon(cen, (t) => 3.4 * k * taper(t) * (0.4 + 0.6 * Math.abs(Math.cos(Math.PI * 2.2 * t))), (t) => Math.cos(Math.PI * 2.2 * t), 56);
      return { sub: peelNode(runs, CUCUMBER_PEEL, 0.45, key) };
    }
    case 'raspberry':
    case 'blackberry': {
      const r = (kind === 'raspberry' ? 6.8 : 7) * k;
      const onIce = c.ice !== 'none';
      const y = (onIce ? rim + 1 : c.yFill) - r * 0.45;
      const x = CX + side * Math.min(hwS * 0.3, 14);
      return { mid: berry(c, kind, x, y, r, key) };
    }
    case 'nutmeg': {
      const dots: ReactNode[] = [];
      for (let i = 0; i < 44; i++) {
        const a = rnd(i * 2 + 1) * Math.PI * 2, d = Math.sqrt(rnd(i * 2 + 2));
        dots.push(
          <circle key={i} cx={f(CX + Math.cos(a) * d * hwS * 0.82)} cy={f(c.yFill + Math.sin(a) * d * ryS * 0.8)} r={f(0.35 + rnd(i + 90) * 0.55)}
            fill={rnd(i + 30) > 0.5 ? '#8a5527' : '#5f3a18'} opacity={0.75 + rnd(i) * 0.25} />,
        );
      }
      return { mid: <g key={key}>{dots}</g> };
    }
    case 'bitters': {
      const x0 = CX - hwS * 0.42, x1 = CX + hwS * 0.42;
      const xs = [x0, CX, x1];
      const r = Math.min(2.2, hwS * 0.1);
      return {
        mid: (
          <g key={key} fill="#7b2216">
            <path d={`M${f(x0 - r * 1.8)} ${f(c.yFill)}L${f(x1 + r * 1.8)} ${f(c.yFill)}`} stroke="#7b2216" strokeWidth=".5" fill="none" opacity=".8" strokeLinecap="round" />
            {xs.map((x, i) => (
              <g key={i}>
                <ellipse cx={f(x)} cy={f(c.yFill)} rx={f(r)} ry={f(r * 0.62)} />
                <ellipse cx={f(x - r * 0.3)} cy={f(c.yFill - r * 0.2)} rx={f(r * 0.3)} ry={f(r * 0.18)} fill="rgba(255,200,170,.6)" />
              </g>
            ))}
          </g>
        ),
      };
    }
    case 'passion-fruit': {
      const r = Math.min(9.5 * k, rx * 0.5);
      const seeds: ReactNode[] = [];
      for (let i = 0; i < 12; i++) {
        const a = rnd(i + 1) * Math.PI * 2, d = 0.18 + Math.sqrt(rnd(i + 20)) * 0.52;
        seeds.push(<ellipse key={i} cx={f(Math.cos(a) * r * d)} cy={f(Math.sin(a) * r * d)} rx={f(r * 0.1)} ry={f(r * 0.07)} transform={`rotate(${f(a * 57)} ${f(Math.cos(a) * r * d)} ${f(Math.sin(a) * r * d)})`} fill="#2a1608" />);
      }
      return {
        mid: (
          <g key={key} transform={`translate(${f(CX + side * rx * 0.5)} ${f(rim - 2 * k)}) rotate(${side * 12})`}>
            <circle r={r} fill="#5a2a56" stroke="#33142f" strokeWidth=".5" />
            <circle r={r * 0.88} fill="#efe3c2" />
            <circle r={r * 0.76} fill={id(c, 'pulp')} />
            {seeds}
            <ellipse cx={f(-r * 0.3)} cy={f(-r * 0.4)} rx={f(r * 0.28)} ry={f(r * 0.12)} fill="rgba(255,255,255,.4)" />
          </g>
        ),
      };
    }
    case 'ginger': {
      const x = CX + side * rx * 0.5, y = rim - 1;
      const crystals: ReactNode[] = [];
      for (let i = 0; i < 18; i++) {
        crystals.push(<circle key={i} cx={f((rnd(i + 1) - 0.5) * 11)} cy={f((rnd(i + 30) - 0.5) * 7)} r={f(0.35 + rnd(i + 60) * 0.35)} fill="#fff6dc" opacity=".85" />);
      }
      return {
        mid: (
          <g key={key} transform={`translate(${f(x)} ${f(y)}) rotate(${side * 18}) scale(${f(k)})`}>
            <path d="M-6.4 -1.2Q-6 -4.4 -1.8 -4.2Q2 -5.6 5.6 -3Q7.2 .4 5.2 3.2Q1 4.6 -3.2 3.8Q-6.8 3 -6.4 -1.2Z" fill={id(c, 'ginger')} stroke="#8d5d18" strokeWidth=".45" />
            {crystals}
          </g>
        ),
      };
    }
  }
}
