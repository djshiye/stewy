/* Ingredient art: parametric SVG product illustration.

   Two variants share one drawing kit:
   - 'shelf': a tall 48x104 object that stands on the bottom edge (the back-bar glass slab),
     lit from above by a strip light: glass with wall thickness, liquid in the ingredient
     colour, paper labels, caps, collars.
   - 'tile': a 48x48 icon for 40-44px tiles. Standing objects reuse the shelf drawing scaled
     to fit, everything else has a compact dedicated icon in the same style.

   Rules: every gradient and clip id comes from one useId() per icon, and there are no SVG
   filters (up to ~80 icons are on screen at once). Brand marks live at the bottom. */
import { memo, useId } from 'react';
import type { ReactNode } from 'react';
import type { BottleShape, Ingredient } from '../data/types';
import { hexToRgb } from '../lib/color';

/* ------------------------------------------------------------------ */
/* 1. Colour and number helpers                                        */
/* ------------------------------------------------------------------ */

type RGB = [number, number, number];

const toHex = ([r, g, b]: RGB) =>
  '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');

/** amt in [-1,1]: negative darkens toward black, positive lightens toward white. */
const tone = (c: string, amt: number): string => {
  const [r, g, b] = hexToRgb(c);
  return amt < 0
    ? toHex([r * (1 + amt), g * (1 + amt), b * (1 + amt)])
    : toHex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
};
const rgba = (c: string, a: number): string => {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a})`;
};
const luma = (c: string): number => {
  const [r, g, b] = hexToRgb(c);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const f = (n: number) => +n.toFixed(2);

const GOLD = '#d9b45f';
const SILVER = '#c4cad4';
const CORK = '#c9a26a';
const CX = 24; // every object is centred on x = 24
const B = 103.2; // glass bottoms sit just above the slab edge (y = 104)

/** Gradient helpers (objectBoundingBox units). */
type Stop = [offset: number, color: string, opacity?: number];
const Lin = ({ id, stops, v = false }: { id: string; stops: Stop[]; v?: boolean }) => (
  <linearGradient id={id} x1="0" y1="0" x2={v ? 0 : 1} y2={v ? 1 : 0}>
    {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
  </linearGradient>
);
const Rad = ({ id, stops, cx = 0.5, cy = 0.5, r = 0.5 }: { id: string; stops: Stop[]; cx?: number; cy?: number; r?: number }) => (
  <radialGradient id={id} cx={cx} cy={cy} r={r}>
    {stops.map(([o, c, a], i) => <stop key={i} offset={o} stopColor={c} stopOpacity={a ?? 1} />)}
  </radialGradient>
);

/** Metal / enamel gradient for a base colour: lit left, shaded right. */
const metal = (id: string, c: string) => (
  <Lin id={id} stops={[[0, tone(c, 0.4)], [0.28, tone(c, 0.12)], [0.62, c], [1, tone(c, -0.45)]]} />
);

/* ------------------------------------------------------------------ */
/* 2. Silhouettes: a symmetric outline from a half profile              */
/* ------------------------------------------------------------------ */

/** Segments of the right half, top to bottom, as (radius from the axis, y). */
type Seg =
  | readonly ['L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number];

/** Build a closed path from the right half, mirrored about x = CX. The profile must end on the axis. */
function outline(start: [number, number], segs: readonly Seg[]): string {
  const X = (r: number) => f(CX + r);
  const M = (r: number) => f(CX - r);
  let d = `M${X(start[0])} ${start[1]}`;
  const pts: [number, number][] = [start];
  for (const s of segs) {
    if (s[0] === 'L') d += `L${X(s[1])} ${s[2]}`;
    else if (s[0] === 'Q') d += `Q${X(s[1])} ${s[2]} ${X(s[3])} ${s[4]}`;
    else d += `C${X(s[1])} ${s[2]} ${X(s[3])} ${s[4]} ${X(s[5])} ${s[6]}`;
    pts.push([s[s.length - 2] as number, s[s.length - 1] as number]);
  }
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = segs[i];
    const prev = pts[i];
    if (s[0] === 'L') d += `L${M(prev[0])} ${prev[1]}`;
    else if (s[0] === 'Q') d += `Q${M(s[1])} ${s[2]} ${M(prev[0])} ${prev[1]}`;
    else d += `C${M(s[3])} ${s[4]} ${M(s[1])} ${s[2]} ${M(prev[0])} ${prev[1]}`;
  }
  return d + 'Z';
}

/** What a built object reports so the tile variant can scale it to fit. */
interface Built { top: number; el: ReactNode }

/* ------------------------------------------------------------------ */
/* 3. The glass vessel: wall, liquid, sheen, highlights                  */
/* ------------------------------------------------------------------ */

interface VesselProps {
  /** unique id prefix for this vessel */
  p: string;
  d: string;
  /** half width of the straight body (positions the highlights) */
  hw: number;
  /** y where the highlight strip starts, and its length */
  spec?: { y: number; h: number; rot?: number } | false;
  liquid?: { color: string; alpha: number; y: number } | null;
  /** coloured glass (green, amber): painted under the liquid */
  glass?: { color: string; alpha: number } | null;
  wall?: number;
  /** thickness of the solid glass base */
  heavy?: number;
  /** drawn inside the glass clip, under the sheen (labels, contents, texture) */
  inside?: ReactNode;
  /** drawn above the glass, clipped nowhere (oversized labels) */
  over?: ReactNode;
  bubbles?: boolean;
  /** top of the glass, for the top-light fade */
  top: number;
}

function Vessel({ p, d, hw, spec, liquid, glass, wall = 1.05, heavy = 0, inside, over, bubbles, top }: VesselProps) {
  const k = `${p}k`, g = `${p}g`, q = `${p}q`, v = `${p}v`, h = `${p}h`;
  const lc = liquid ? liquid.color : '#cfe0f5';
  const lift = liquid && luma(liquid.color) < 0.2 ? (0.2 - luma(liquid.color)) * 1.4 : 0;
  const col = lift ? tone(lc, lift) : lc;
  const s = spec === undefined ? { y: top + 26, h: 40 } : spec;
  const dots: ReactNode[] = [];
  if (bubbles && liquid) {
    const pts = [[-4, 12], [3, 20], [-2, 31], [5, 38], [-5, 46], [1, 52], [4, 8]];
    pts.forEach(([dx, dy], i) => {
      const y = liquid.y + dy;
      if (y < B - 6) dots.push(<circle key={i} cx={CX + dx * (hw / 10)} cy={y} r={i % 2 ? 0.7 : 1} fill="#fff" opacity={0.5} />);
    });
  }
  return (
    <g>
      <defs>
        <clipPath id={k}><path d={d} /></clipPath>
        <Lin id={g} stops={[[0, '#ffffff', 0.34], [0.14, '#dcecff', 0.13], [0.5, '#ffffff', 0.02], [0.82, '#04070c', 0.14], [1, '#04070c', 0.42]]} />
        <Lin id={v} v stops={[[0, '#ffffff', 0.26], [0.22, '#ffffff', 0.08], [0.5, '#ffffff', 0]]} />
        <Lin id={h} v stops={[[0, '#ffffff', 0.02], [0.18, '#ffffff', 0.62], [0.75, '#ffffff', 0.34], [1, '#ffffff', 0]]} />
        {liquid && (
          <Lin id={q} v stops={[
            [0, tone(col, 0.2), liquid.alpha * 0.92],
            [0.3, col, liquid.alpha],
            [1, tone(col, -0.3), Math.min(1, liquid.alpha + 0.08)],
          ]} />
        )}
      </defs>
      <path d={d} fill={glass ? rgba(glass.color, glass.alpha) : 'rgba(176,200,235,0.1)'} />
      <g clipPath={`url(#${k})`}>
        {liquid && (
          <>
            <rect x="0" y={liquid.y} width="48" height={110 - liquid.y} fill={`url(#${q})`} />
            <rect x="0" y={liquid.y} width="48" height="1.8" fill={tone(col, 0.35)} opacity={0.12 + liquid.alpha * 0.2} />
            {dots}
          </>
        )}
        {heavy > 0 && (
          <>
            <rect x="0" y={B - heavy} width="48" height={heavy + 2} fill="#dcecff" opacity="0.13" />
            <rect x="0" y={B - heavy} width="48" height="0.8" fill="#fff" opacity="0.4" />
          </>
        )}
        {inside}
        <path d={d} fill="none" stroke="#b4d0ec" strokeOpacity="0.3" strokeWidth={wall * 2} />
        <rect x="0" y="0" width="48" height="104" fill={`url(#${g})`} />
        <rect x="0" y={top} width="48" height="104" fill={`url(#${v})`} />
        {liquid && (
          <ellipse cx={CX} cy={liquid.y} rx="30" ry="1.3" fill="none" stroke="#fff" strokeOpacity={0.3 + liquid.alpha * 0.3} strokeWidth="0.8" />
        )}
        {s && (
          <>
            <rect x={CX - hw + wall + 1.3} y={s.y} width="2.1" height={s.h} rx="1.05" fill={`url(#${h})`}
              transform={s.rot ? `rotate(${s.rot} ${CX - hw + wall + 2.3} ${s.y + s.h / 2})` : undefined} />
            <rect x={CX + hw - wall - 2.4} y={s.y + s.h * 0.2} width="0.9" height={s.h * 0.62} rx="0.45" fill="#c9e2ff" opacity="0.26"
              transform={s.rot ? `rotate(${-s.rot} ${CX + hw - wall - 2} ${s.y + s.h / 2})` : undefined} />
          </>
        )}
      </g>
      {over}
      <path d={d} fill="none" stroke="rgba(206,224,248,0.6)" strokeWidth="0.8" strokeLinejoin="round" />
    </g>
  );
}

/** Contact shadow plus the light the liquid throws onto the slab. */
function Ground({ hw, color, alpha = 0.3 }: { hw: number; color?: string; alpha?: number }) {
  return (
    <g>
      <ellipse cx={CX} cy="103.4" rx={hw + 3.5} ry="1.8" fill="#000" opacity="0.55" />
      {color && <ellipse cx={CX + 2} cy="103.7" rx={hw * 0.85} ry="1.3" fill={color} opacity={alpha} />}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Caps, collars, labels                                             */
/* ------------------------------------------------------------------ */

type CapKind = 'screw' | 'cork' | 'wax' | 'swing' | 'foil' | 'dasher' | 'crown' | 'sphere' | 'lid' | 'stopper' | 'none';

interface CapOpts { y: number; hw: number; color: string; len?: number; cage?: boolean }

/** Draws a closure sitting on the lip at y. Returns the new top. */
function cap(p: string, kind: CapKind, o: CapOpts): Built {
  const { y, hw, color } = o;
  const c = `${p}c`;
  const defs = <defs>{metal(c, color)}</defs>;
  switch (kind) {
    case 'screw':
    case 'lid': {
      const w = 2 * hw + 2.2, x = CX - w / 2, h = o.len ?? (kind === 'lid' ? 7 : 9), yt = y - h + 1.6;
      const ridges: ReactNode[] = [];
      for (let i = 0; i < Math.floor((w - 2) / 1.7); i++) {
        ridges.push(<line key={i} x1={f(x + 1.4 + i * 1.7)} x2={f(x + 1.4 + i * 1.7)} y1={yt + 2.4} y2={yt + h - 1.6} />);
      }
      return {
        top: yt,
        el: (
          <g>
            {defs}
            <rect x={x} y={yt} width={w} height={h} rx="1.6" fill={`url(#${c})`} />
            <g stroke="#000" strokeOpacity="0.26" strokeWidth="0.5">{ridges}</g>
            <rect x={x + 0.7} y={yt + 0.5} width={w - 1.4} height="1.3" rx="0.65" fill="#fff" opacity="0.42" />
            <rect x={x} y={yt + h - 1.7} width={w} height="1.7" fill="#000" opacity="0.28" />
          </g>
        ),
      };
    }
    case 'cork': {
      const sw = 2 * hw - 1.2, hh = 6.2, hwid = 2 * hw + 2.6;
      return {
        top: y - 3.4 - hh,
        el: (
          <g>
            {defs}
            <rect x={CX - sw / 2} y={y - 3.6} width={sw} height="5.4" fill={CORK} />
            <rect x={CX - sw / 2} y={y - 3.6} width={sw} height="5.4" fill="#000" opacity="0.18" />
            <g fill="#7a5a30" opacity="0.5"><circle cx={CX - sw / 4} cy={y - 1} r="0.5" /><circle cx={CX + sw / 5} cy={y - 2.4} r="0.45" /><circle cx={CX + sw / 3} cy={y} r="0.4" /></g>
            <rect x={CX - hwid / 2} y={y - 3.4 - hh} width={hwid} height={hh} rx="2" fill={`url(#${c})`} />
            <rect x={CX - hwid / 2 + 0.8} y={y - 3.4 - hh + 0.6} width={hwid - 1.6} height="1.2" rx="0.6" fill="#fff" opacity="0.4" />
            <rect x={CX - hwid / 2} y={y - 3.4 - 1.2} width={hwid} height="1.2" fill="#000" opacity="0.26" />
          </g>
        ),
      };
    }
    case 'wax': {
      const l = CX - hw - 1.4, r = CX + hw + 1.4, yt = y - 7;
      const d =
        `M${f(l)} ${y + 8}L${f(l)} ${y - 3}Q${f(l)} ${yt} ${CX} ${yt}Q${f(r)} ${yt} ${f(r)} ${y - 3}L${f(r)} ${y + 7}` +
        `Q${f(r - 0.3)} ${y + 10.4} ${f(r - 1.7)} ${y + 8.6}Q${f(CX + hw * 0.5)} ${y + 8.2} ${f(CX + hw * 0.34)} ${y + 12.4}` +
        `Q${f(CX + hw * 0.1)} ${y + 15} ${f(CX - hw * 0.12)} ${y + 11}Q${f(CX - hw * 0.3)} ${y + 7.6} ${f(CX - hw * 0.62)} ${y + 8.4}` +
        `Q${f(l + 0.3)} ${y + 10.4} ${f(l)} ${y + 8}Z`;
      return {
        top: yt,
        el: (
          <g>
            {defs}
            <path d={d} fill={`url(#${c})`} />
            <path d={d} fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="0.5" />
            <path d={`M${f(l + 1.8)} ${y - 3}Q${f(l + 1.8)} ${y - 5.2} ${f(l + 4)} ${y - 5.4}`} stroke="#fff" strokeOpacity="0.5" strokeWidth="1.1" strokeLinecap="round" fill="none" />
            <path d={`M${f(l + 1.6)} ${y - 1.4}L${f(l + 1.6)} ${y + 6}`} stroke="#fff" strokeOpacity="0.28" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        ),
      };
    }
    case 'swing': {
      const sw = 2 * hw - 0.8, yt = y - 9.5;
      return {
        top: y - 13,
        el: (
          <g>
            <defs>
              <Lin id={c} stops={[[0, '#ffffff'], [0.4, '#eef1f6'], [1, '#aeb6c4']]} />
              <Lin id={`${p}w`} stops={[[0, '#dfe5ee'], [1, '#7c8696']]} />
            </defs>
            <rect x={CX - sw / 2} y={yt} width={sw} height="9" rx="2.4" fill={`url(#${c})`} />
            <ellipse cx={CX} cy={yt} rx={sw * 0.28} ry="1.2" fill="#fff" />
            <circle cx={CX} cy={yt - 1.6} r="2.1" fill={`url(#${c})`} />
            <rect x={CX - hw - 0.6} y={y - 1.6} width={2 * hw + 1.2} height="2" rx="1" fill="#b3402e" />
            <path d={`M${f(CX - hw - 1.4)} ${y + 4}L${f(CX - hw - 1.4)} ${y - 5}Q${f(CX - hw - 1.4)} ${y - 12.2} ${CX} ${y - 12.2}Q${f(CX + hw + 1.4)} ${y - 12.2} ${f(CX + hw + 1.4)} ${y - 5}L${f(CX + hw + 1.4)} ${y + 4}`}
              stroke={`url(#${p}w)`} strokeWidth="1.1" fill="none" strokeLinecap="round" />
            <path d={`M${f(CX - hw - 1.5)} ${y + 4.4}L${f(CX + hw + 1.5)} ${y + 4.4}`} stroke="#8a93a3" strokeWidth="0.9" strokeLinecap="round" />
            <circle cx={f(CX - hw - 1.4)} cy={y + 4.4} r="0.9" fill="#aeb6c4" />
            <circle cx={f(CX + hw + 1.4)} cy={y + 4.4} r="0.9" fill="#aeb6c4" />
          </g>
        ),
      };
    }
    case 'foil': {
      const x0 = CX - hw - 0.9, x1 = CX + hw + 0.9, yt = y - 9, yb = y + (o.len ?? 12);
      const d = `M${f(x0)} ${yb}L${f(x0)} ${yt + 2.5}Q${f(x0)} ${yt} ${f(x0 + 2.4)} ${yt}L${f(x1 - 2.4)} ${yt}Q${f(x1)} ${yt} ${f(x1)} ${yt + 2.5}L${f(x1)} ${yb}Q${CX} ${yb + 1.6} ${f(x0)} ${yb}Z`;
      return {
        top: yt,
        el: (
          <g>
            {defs}
            <path d={d} fill={`url(#${c})`} />
            <path d={d} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="0.5" />
            <g stroke="#fff" strokeOpacity="0.22" strokeWidth="0.6">
              <path d={`M${f(x0 + 1.7)} ${yt + 2}L${f(x0 + 1.7)} ${yb - 1}`} />
              <path d={`M${f(x1 - 2.4)} ${yt + 2}L${f(x1 - 2.4)} ${yb - 1}`} />
            </g>
            {o.cage && (
              <g stroke={tone(color, -0.55)} strokeWidth="0.55" strokeOpacity="0.55" fill="none">
                <path d={`M${f(x0 + 0.5)} ${yt + 3.6}L${f(x1 - 0.5)} ${yt + 3.6}`} />
                <path d={`M${f(x0 + 0.5)} ${yb - 3}L${f(x1 - 0.5)} ${yb - 3}`} />
                <path d={`M${f(x0 + 0.8)} ${yt + 3.6}L${f(x1 - 1)} ${yb - 3}M${f(x1 - 0.8)} ${yt + 3.6}L${f(x0 + 1)} ${yb - 3}`} />
              </g>
            )}
            <rect x={x0} y={yt} width={x1 - x0} height="1.1" fill="#fff" opacity="0.4" />
          </g>
        ),
      };
    }
    case 'dasher': {
      const w = 2 * hw + 1.8;
      return {
        top: y - 14,
        el: (
          <g>
            {defs}
            <rect x={CX - w / 2} y={y - 6} width={w} height="7.4" rx="1.4" fill={`url(#${c})`} />
            <path d={`M${f(CX - w / 2 + 0.6)} ${y - 6}L${CX - 2.2} ${y - 10.6}L${CX + 2.2} ${y - 10.6}L${f(CX + w / 2 - 0.6)} ${y - 6}Z`} fill={`url(#${c})`} />
            <rect x={CX - 1.7} y={y - 14} width="3.4" height="3.8" rx="0.9" fill={`url(#${c})`} />
            <rect x={CX - 1.1} y={y - 13.6} width="0.9" height="2.8" rx="0.4" fill="#fff" opacity="0.45" />
            <rect x={CX - w / 2 + 0.7} y={y - 5.4} width={w - 1.4} height="1" rx="0.5" fill="#fff" opacity="0.36" />
            <rect x={CX - w / 2} y={y - 0.8} width={w} height="1.4" fill="#000" opacity="0.3" />
          </g>
        ),
      };
    }
    case 'crown': {
      const w = 2 * hw + 2.8, x = CX - w / 2, n = 8, tw = w / n;
      let teeth = `M${f(x)} ${y + 0.4}`;
      for (let i = 0; i < n; i++) teeth += `l${f(tw / 2)} 1.9l${f(tw / 2)} -1.9`;
      return {
        top: y - 4.2,
        el: (
          <g>
            {defs}
            <path d={`${teeth}Z`} fill={tone(color, -0.35)} />
            <rect x={x} y={y - 4.2} width={w} height="4.8" rx="1.2" fill={`url(#${c})`} />
            <rect x={x + 0.8} y={y - 3.6} width={w - 1.6} height="1" rx="0.5" fill="#fff" opacity="0.5" />
          </g>
        ),
      };
    }
    case 'none':
      return { top: y, el: null };
    case 'stopper': {
      const r = hw + 1.8, cy = y - r + 1;
      return {
        top: cy - r,
        el: (
          <g>
            <rect x={CX - hw + 0.4} y={y - 3} width={2 * hw - 0.8} height="4.4" fill="rgba(190,215,240,0.4)" stroke="rgba(206,224,248,0.5)" strokeWidth="0.5" />
            <circle cx={CX} cy={cy} r={r} fill="rgba(176,206,238,0.3)" stroke="rgba(214,230,250,0.7)" strokeWidth="0.8" />
            <ellipse cx={CX - r * 0.38} cy={cy - r * 0.38} rx={r * 0.24} ry={r * 0.15} fill="#fff" opacity="0.7" transform={`rotate(-35 ${CX - r * 0.38} ${cy - r * 0.38})`} />
          </g>
        ),
      };
    }
    case 'sphere': {
      const r = hw + 2.8, cy = y - r + 1.2;
      return {
        top: cy - r,
        el: (
          <g>
            <defs><Rad id={c} cx={0.34} cy={0.3} r={0.75} stops={[[0, tone(color, 0.5)], [0.45, color], [1, tone(color, -0.55)]]} /></defs>
            <rect x={CX - hw - 0.6} y={y - 1.4} width={2 * hw + 1.2} height="2.6" fill={tone(color, -0.35)} />
            <circle cx={CX} cy={cy} r={r} fill={`url(#${c})`} />
            <ellipse cx={CX - r * 0.36} cy={cy - r * 0.4} rx={r * 0.26} ry={r * 0.17} fill="#fff" opacity="0.55" transform={`rotate(-30 ${CX - r * 0.36} ${cy - r * 0.4})`} />
          </g>
        ),
      };
    }
  }
}

/** A metal band around the neck. */
function collar(p: string, y: number, hw: number, color: string): ReactNode {
  const m = `${p}m`;
  return (
    <g>
      <defs><Lin id={m} stops={[[0, tone(color, 0.5)], [0.3, color], [1, tone(color, -0.5)]]} /></defs>
      <rect x={CX - hw - 1.1} y={y} width={2 * hw + 2.2} height="2.8" rx="1" fill={`url(#${m})`} />
      <rect x={CX - hw - 0.5} y={y + 0.3} width={2 * hw + 1} height="0.7" rx="0.35" fill="#fff" opacity="0.5" />
    </g>
  );
}

type LabelKind = 'rect' | 'round' | 'oval' | 'shield' | 'arch' | 'band' | 'none';
type MarkKind = 'crest' | 'star' | 'stripe' | 'diamond' | 'leaf' | 'dots' | 'none';

interface LabelOpts {
  kind: LabelKind; x: number; y: number; w: number; h: number;
  paper: string; ink: string; accent: string; mark: MarkKind;
}

/** A paper label that wraps the glass: shaded at both edges, lettered with abstract rules. */
function paperLabel(p: string, o: LabelOpts): ReactNode {
  const { kind, x, y, w, h, paper, ink, accent, mark } = o;
  if (kind === 'none') return null;
  const cx = x + w / 2, r = Math.min(w, h);
  let d: string;
  switch (kind) {
    case 'oval': d = `M${f(x)} ${f(y + h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 1 ${f(x + w)} ${f(y + h / 2)}A${f(w / 2)} ${f(h / 2)} 0 1 1 ${f(x)} ${f(y + h / 2)}Z`; break;
    case 'round': { const rr = r * 0.3; d = `M${f(x + rr)} ${y}H${f(x + w - rr)}Q${f(x + w)} ${y} ${f(x + w)} ${f(y + rr)}V${f(y + h - rr)}Q${f(x + w)} ${f(y + h)} ${f(x + w - rr)} ${f(y + h)}H${f(x + rr)}Q${x} ${f(y + h)} ${x} ${f(y + h - rr)}V${f(y + rr)}Q${x} ${y} ${f(x + rr)} ${y}Z`; break; }
    case 'shield': d = `M${f(x)} ${y}H${f(x + w)}V${f(y + h * 0.58)}Q${f(x + w)} ${f(y + h * 0.88)} ${f(cx)} ${f(y + h)}Q${f(x)} ${f(y + h * 0.88)} ${f(x)} ${f(y + h * 0.58)}Z`; break;
    case 'arch': d = `M${f(x)} ${f(y + h)}H${f(x + w)}V${f(y + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 0 ${f(x)} ${f(y + w / 2)}Z`; break;
    default: d = `M${f(x)} ${y}H${f(x + w)}V${f(y + h)}H${f(x)}Z`; break;
  }
  const lg = `${p}l`;
  const u = h / 100; // content scale
  const content: ReactNode[] = [];
  const ty = kind === 'arch' ? y + w * 0.42 : y + h * 0.2;
  content.push(<rect key="t" x={f(x + w * 0.2)} y={f(ty)} width={f(w * 0.6)} height={f(Math.max(1.5, h * 0.1))} rx="0.5" fill={ink} opacity="0.88" />);
  content.push(<rect key="s1" x={f(x + w * 0.28)} y={f(ty + Math.max(1.5, h * 0.1) + 1.4)} width={f(w * 0.44)} height="0.9" rx="0.4" fill={ink} opacity="0.5" />);
  const my = y + h * 0.7;
  if (mark === 'crest') {
    content.push(<circle key="m1" cx={cx} cy={f(my)} r={f(Math.max(2, r * 0.15))} fill={accent} />, <circle key="m2" cx={cx} cy={f(my)} r={f(Math.max(3, r * 0.22))} fill="none" stroke={ink} strokeWidth="0.5" opacity="0.55" />);
  } else if (mark === 'star') {
    const s = Math.max(2.4, r * 0.2);
    content.push(<path key="m" transform={`translate(${cx} ${f(my)})`} d={`M0 ${-s}L${f(s * 0.3)} ${f(-s * 0.3)}L${s} 0L${f(s * 0.3)} ${f(s * 0.3)}L0 ${s}L${f(-s * 0.3)} ${f(s * 0.3)}L${-s} 0L${f(-s * 0.3)} ${f(-s * 0.3)}Z`} fill={accent} />);
  } else if (mark === 'stripe') {
    content.push(<rect key="m" x={x} y={f(y + h * 0.66)} width={w} height={f(Math.max(2.2, h * 0.2))} fill={accent} />, <rect key="m2" x={x} y={f(y + h * 0.62)} width={w} height="0.7" fill={accent} opacity="0.7" />);
  } else if (mark === 'diamond') {
    const s = Math.max(2.4, r * 0.18);
    content.push(<path key="m" transform={`translate(${cx} ${f(my)})`} d={`M0 ${-s}L${s} 0L0 ${s}L${-s} 0Z`} fill={accent} />);
  } else if (mark === 'leaf') {
    const s = Math.max(2.4, r * 0.2);
    content.push(<path key="m" transform={`translate(${cx} ${f(my)}) rotate(-35)`} d={`M0 ${-s}Q${f(s * 0.9)} 0 0 ${s}Q${f(-s * 0.9)} 0 0 ${-s}Z`} fill={accent} />);
  } else if (mark === 'dots') {
    const s = Math.max(0.9, r * 0.07);
    content.push(<circle key="d1" cx={f(cx - s * 3)} cy={f(my)} r={s} fill={accent} />, <circle key="d2" cx={cx} cy={f(my)} r={s} fill={accent} />, <circle key="d3" cx={f(cx + s * 3)} cy={f(my)} r={s} fill={accent} />);
  }
  void u;
  return (
    <g>
      <defs><Lin id={lg} stops={[[0, '#000', 0.4], [0.2, '#000', 0.06], [0.45, '#fff', 0.1], [0.78, '#000', 0.04], [1, '#000', 0.5]]} /></defs>
      <path d={d} fill={paper} />
      {content}
      <path d={d} fill={`url(#${lg})`} />
      <path d={d} fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="0.4" />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Standing bottles: eleven silhouettes + per-ingredient looks        */
/* ------------------------------------------------------------------ */

/** Half-profile geometry of a bottle; `n` lengthens the neck, `w` widens the body. */
interface Shape {
  lip: number; lipY: number;
  segs: Seg[]; hw: number;
  /** liquid surface y */
  fill: number;
  /** default label y and height */
  lab: [number, number];
  heavy?: number;
  spec?: { y: number; h: number; rot?: number };
  /** vertical ridges between these ys */
  ridge?: [number, number];
  /** where the label may reach toward the shoulder (label y shift allowed) */
}

type ShapeFn = (n: number, w: number) => Shape;

const base = (h: number, r = 2.6): Seg[] => [['L', h, B - r], ['Q', h, B, h - r, B], ['L', 0, B]];

const SHAPES: Record<BottleShape, ShapeFn> = {
  /** vodka: tall, slim, straight shoulders */
  tall: (n, w) => { const h = 12.4 + w; return { lip: 3.5, lipY: 14 - n, hw: h, fill: 39, lab: [58, 30], spec: { y: 47, h: 44 },
    segs: [['L', 3.6, 30], ['C', 3.6, 36, h, 38, h, 49], ...base(h)] }; },
  /** gin: square shoulders, faceted, chamfered base */
  gin: (n, w) => { const h = 14.6 + w; return { lip: 4, lipY: 17 - n, hw: h, fill: 38, lab: [56, 32], spec: { y: 44, h: 46 },
    segs: [['L', 4.2, 31], ['C', 4.2, 33.4, h * 0.7, 33.6, h, 37.4], ['L', h, B - 3.4], ['L', h - 3.2, B], ['L', 0, B]] }; },
  /** rum: squat, round-bellied */
  rum: (n, w) => { const h = 18.6 + w; return { lip: 4.3, lipY: 21 - n, hw: h, fill: 43, lab: [60, 30], heavy: 5, spec: { y: 52, h: 38 },
    segs: [['L', 4.5, 34], ['C', 4.5, 41, h, 38, h, 55], ['C', h + 1.4, 70, h + 1.4, 86, h - 0.6, B - 3.4], ['Q', h - 1, B, h - 4.4, B], ['L', 0, B]] }; },
  /** agave: flared base, short neck */
  agave: (n, w) => { const h = 19.2 + w; return { lip: 4, lipY: 15 - n, hw: h, fill: 38, lab: [66, 30], spec: { y: 56, h: 42, rot: 2 },
    segs: [['L', 4.2, 34], ['C', 4.4, 49, 7.4, 58, 10.4, 70], ['C', 13.4, 82, h, 86, h, B - 5], ['Q', h, B, h - 3.8, B], ['L', 0, B]] }; },
  /** whiskey: heavy square decanter, short neck */
  whiskey: (n, w) => { const h = 17.8 + w; return { lip: 6.2, lipY: 29 - n, hw: h, fill: 42, lab: [58, 36], heavy: 6, spec: { y: 51, h: 42 },
    segs: [['L', 6.4, 37], ['C', 6.6, 40.6, h, 38, h, 49], ...base(h, 3.2)] }; },
  /** cognac: round flask */
  cognac: (n, w) => { const h = 19.4 + w; return { lip: 4.2, lipY: 16 - n, hw: h, fill: 36, lab: [66, 26], spec: { y: 58, h: 30, rot: 10 },
    segs: [['L', 4.5, 38], ['C', 4.6, 47, h, 46, h, 69], ['C', h, 90, 13, B, 7, B], ['L', 0, B]] }; },
  /** absinthe: slim with a long neck */
  absinthe: (n, w) => { const h = 11.2 + w; return { lip: 3.2, lipY: 12 - n, hw: h, fill: 62, lab: [74, 22], spec: { y: 62, h: 34 },
    segs: [['L', 3.4, 50], ['C', 3.4, 58, h, 56, h, 66], ...base(h)] }; },
  /** liqueur: bulbous pear with a short neck */
  liqueur: (n, w) => { const h = 17.4 + w; return { lip: 4.2, lipY: 21 - n, hw: h, fill: 42, lab: [58, 26], spec: { y: 52, h: 30, rot: 6 },
    segs: [['L', 4.4, 31], ['C', 4.4, 41, h, 38, h, 58], ['C', h, 70, 13.2, 77, 13.2, 89], ...base(13.2)] }; },
  /** cordial: small stubby apothecary bottle */
  cordial: (n, w) => { const h = 13.8 + w; return { lip: 5.2, lipY: 37 - n, hw: h, fill: 52, lab: [66, 26], heavy: 4, spec: { y: 58, h: 30 },
    segs: [['L', 5.4, 46], ['C', 5.4, 50, h, 48, h, 58], ...base(h, 2.2)] }; },
  /** vermouth: wine-bottle profile */
  vermouth: (n, w) => { const h = 13.8 + w; return { lip: 3.9, lipY: 11 - n, hw: h, fill: 50, lab: [66, 32], spec: { y: 58, h: 36 },
    segs: [['L', 4, 34], ['C', 4.2, 47, h, 45, h, 62], ...base(h)] }; },
  /** aperitivo: tall and ridged, wide mouth */
  aperitivo: (n, w) => { const h = 14.4 + w; return { lip: 5.4, lipY: 27 - n, hw: h, fill: 45, lab: [58, 38], ridge: [47, B - 4], spec: { y: 48, h: 44 },
    segs: [['L', 5.6, 34], ['C', 5.6, 40, h, 37, h, 48], ...base(h)] }; },
};

interface Look {
  cap: CapKind; capColor: string; collar: string | null; foilLen: number; cage: boolean;
  label: LabelKind; paper: string; ink: string; accent: string; mark: MarkKind;
  /** label width as a fraction of the body, y shift and height scale */
  lw: number; ly: number; lh: number;
  neck: number; wide: number;
  /** liquid level shift (positive lowers it) */
  level: number;
  /** coloured glass */
  tint: string | null;
  facets: boolean; straw: boolean; ridges: boolean;
}

const DEFAULT_LOOK: Look = {
  cap: 'screw', capColor: '#41372b', collar: null, foilLen: 12, cage: false,
  label: 'rect', paper: '#ece3cf', ink: '#2a2420', accent: '#a8442e', mark: 'crest',
  lw: 0.72, ly: 0, lh: 1, neck: 0, wide: 0, level: 0, tint: null, facets: false, straw: false, ridges: false,
};

/** Family defaults: what makes a gin bottle look like gin before the brand is chosen. */
const SHAPE_LOOK: Record<BottleShape, Partial<Look>> = {
  tall: { cap: 'screw', label: 'band', lw: 1 },
  gin: { cap: 'screw', label: 'rect', facets: true, lw: 0.7 },
  rum: { cap: 'screw', label: 'oval', lw: 0.7 },
  agave: { cap: 'cork', label: 'arch', lw: 0.62 },
  whiskey: { cap: 'cork', label: 'rect', lw: 0.8 },
  cognac: { cap: 'sphere', label: 'oval', lw: 0.62, collar: GOLD },
  absinthe: { cap: 'cork', label: 'rect', lw: 0.9 },
  liqueur: { cap: 'screw', label: 'round', lw: 0.7 },
  cordial: { cap: 'wax', label: 'rect', lw: 0.8 },
  vermouth: { cap: 'foil', label: 'rect', lw: 0.8 },
  aperitivo: { cap: 'screw', label: 'oval', lw: 0.78, ridges: true },
};

/** Per-ingredient variants so brands of one family read apart. */
const LOOKS: Record<string, Partial<Look>> = {
  // spirits
  vodka: { cap: 'screw', capColor: '#b9bfc9', paper: '#f4f6fa', ink: '#1f3a5f', accent: '#4a8fd0', mark: 'stripe' },
  cachaca: { cap: 'cork', capColor: '#6f9a4a', neck: 2, label: 'oval', lw: 0.62, paper: '#efe7cf', ink: '#2f4a1f', accent: '#6f9a4a', mark: 'leaf' },
  gin: { capColor: '#3f6b57', tint: '#6fb6ac', paper: '#e6efe4', ink: '#1d4a3a', accent: '#3f6b57', mark: 'diamond' },
  white_rum: { capColor: '#c9b06a', label: 'band', lw: 1, paper: '#f2efe3', ink: '#2a4a6a', accent: '#4a9fd0', mark: 'stripe' },
  dark_rum: { cap: 'wax', capColor: '#2a1a10', paper: '#d9c9a0', ink: '#2a1a10', accent: '#a8782a', mark: 'star', lw: 0.66 },
  spiced_rum: { cap: 'screw', capColor: '#8a3a1c', collar: GOLD, label: 'shield', paper: '#d8b87a', ink: '#3a1a0a', accent: '#9a2a1c', mark: 'star', lw: 0.7 },
  tequila: { cap: 'cork', capColor: '#2a2018', paper: '#efe9d4', ink: '#2a3a1a', accent: '#6f8f3a', mark: 'leaf' },
  mezcal: { cap: 'wax', capColor: '#5a4328', label: 'rect', lw: 0.58, paper: '#b89a6a', ink: '#1a1208', accent: '#2a1a0a', mark: 'dots' },
  bourbon: { cap: 'cork', capColor: '#3a2110', paper: '#ecdcb8', ink: '#2a1608', accent: '#a8321e', mark: 'stripe', lw: 0.86 },
  rye: { cap: 'wax', capColor: '#7a1c1c', neck: 6, lw: 0.52, lh: 1.15, paper: '#e8e0cc', ink: '#1a2a4a', accent: '#c9a24a', mark: 'stripe' },
  scotch: { cap: 'cork', capColor: '#5a3a1a', collar: GOLD, neck: 2, wide: -1.6, label: 'shield', lw: 0.74, paper: '#efe6cf', ink: '#1d3a2a', accent: '#2f6a45', mark: 'crest' },
  cognac: { cap: 'sphere', capColor: '#2a1a10', collar: GOLD, paper: '#e9dcb8', ink: '#3a2410', accent: '#b8923a', mark: 'crest' },
  pisco: { cap: 'screw', capColor: '#a8632a', neck: 3, label: 'band', lw: 1, collar: null, paper: '#f3ecdc', ink: '#5a2a10', accent: '#c9722a', mark: 'stripe' },
  absinthe: { cap: 'foil', capColor: '#4f6b28', foilLen: 10, paper: '#1a1d16', ink: '#b8e07a', accent: '#8fbf5a', mark: 'star' },
  // liqueurs
  triple_sec: { capColor: '#c98418', paper: '#f2a03a', ink: '#fff7e0', accent: '#ffffff', mark: 'crest', lw: 0.76 },
  grand_marnier: { cap: 'wax', capColor: '#c9302c', collar: GOLD, label: 'arch', lw: 0.7, paper: '#efe3c4', ink: '#8a1a14', accent: '#c9302c', mark: 'stripe' },
  amaretto: { cap: 'cork', capColor: '#5a2810', facets: true, wide: -1.4, neck: 2, paper: '#ecdcc0', ink: '#4a1c0a', accent: '#c9302c', mark: 'dots', lw: 0.8 },
  coffee_liqueur: { capColor: '#1a0d05', label: 'band', lw: 1, paper: '#2a1810', ink: '#f0e0c0', accent: '#c9302c', mark: 'stripe' },
  irish_cream: { capColor: '#5a4326', label: 'oval', wide: 1, lw: 0.76, paper: '#e8dcc0', ink: '#2a4a2a', accent: '#2f7a4a', mark: 'leaf' },
  blue_curacao: { capColor: '#0a5e91', paper: '#f0f6fa', ink: '#0a4a7a', accent: '#0f8bd6', mark: 'crest' },
  elderflower: { capColor: '#c9b46a', collar: GOLD, neck: 7, wide: -1.6, label: 'arch', lw: 0.62, paper: '#f2eedc', ink: '#5a5030', accent: '#c9b46a', mark: 'dots' },
  maraschino: { cap: 'cork', capColor: '#9e2a2a', straw: true, ly: -8, label: 'round', lw: 0.6, paper: '#efe5d2', ink: '#7a1a1a', accent: '#9e2a2a', mark: 'crest' },
  campari: { capColor: '#7a0c1e', paper: '#f1e6d4', ink: '#a00a22', accent: '#a00a22', mark: 'crest' },
  aperol: { capColor: '#b23a12', ridges: false, wide: 1.4, label: 'round', paper: '#f3e2c8', ink: '#b8420f', accent: '#e8531f', mark: 'stripe' },
  sweet_vermouth: { capColor: '#6a1a18', paper: '#e2cfa8', ink: '#4a0e0c', accent: '#b98a2a', mark: 'star' },
  dry_vermouth: { capColor: '#b8ab74', label: 'oval', lw: 0.72, foilLen: 10, paper: '#eef0dc', ink: '#3a4a22', accent: '#7a9a3a', mark: 'leaf' },
  lillet_blanc: { cap: 'cork', capColor: '#c9a93a', neck: 4, wide: -1, label: 'arch', lw: 0.7, paper: '#f6f1da', ink: '#6a5410', accent: '#c9a93a', mark: 'crest' },
  chartreuse: { cap: 'wax', capColor: '#5f7322', paper: '#e8e4b0', ink: '#2a3a10', accent: '#5f7322', mark: 'crest' },
  benedictine: { cap: 'wax', capColor: '#9e2a1c', collar: GOLD, label: 'shield', lw: 0.78, paper: '#e8d8a8', ink: '#4a1a10', accent: '#c9a24a', mark: 'crest' },
  amaro: { cap: 'wax', capColor: '#5a2c10', label: 'oval', neck: 3, paper: '#d8c498', ink: '#2a1608', accent: '#7a3a1a', mark: 'leaf' },
  pimms: { cap: 'cork', capColor: '#b8860b', neck: 5, wide: -1.6, label: 'arch', lw: 0.7, paper: '#f0e0b8', ink: '#7a2a0a', accent: '#b8860b', mark: 'stripe' },
  peach_schnapps: { capColor: '#d19b12', paper: '#f8dcc0', ink: '#a8441a', accent: '#f08a4a', mark: 'leaf' },
  raspberry_liqueur: { cap: 'wax', capColor: '#2a0a1e', label: 'rect', lw: 0.72, paper: '#f0d8e0', ink: '#5a1038', accent: '#c0386a', mark: 'dots' },
  blackberry_liqueur: { capColor: '#1e0a26', label: 'oval', paper: '#e0d0e8', ink: '#3a1244', accent: '#8a4aaa', mark: 'dots' },
  creme_de_cassis: { cap: 'cork', capColor: '#14051a', neck: 3, label: 'rect', paper: '#e8dce8', ink: '#2a0a2e', accent: '#6a2a7a', mark: 'crest' },
  creme_de_violette: { capColor: '#5a3a8a', label: 'arch', lw: 0.66, paper: '#efe6f4', ink: '#4a2a7a', accent: '#8a5fbf', mark: 'leaf' },
  creme_de_cacao: { capColor: '#4a2a14', label: 'band', lw: 1, paper: '#d8c0a0', ink: '#2a1608', accent: '#4a2a14', mark: 'stripe' },
  creme_de_menthe: { capColor: '#2a8a4a', paper: '#eaf4e8', ink: '#1a5a30', accent: '#2a8a4a', mark: 'leaf' },
};

const lookFor = (ing: Ingredient, shape?: BottleShape, family?: Partial<Look>): Look => ({
  ...DEFAULT_LOOK,
  capColor: ing.cap ?? DEFAULT_LOOK.capColor,
  ...(shape ? SHAPE_LOOK[shape] : null),
  ...family,
  ...LOOKS[ing.id],
  ...BAR_LOOKS[ing.id],
});

interface StandingOpts {
  bubbles?: boolean;
  /** drawn before the glass (contents seen through it, handles) and after the closure */
  behind?: ReactNode;
  front?: ReactNode;
  /** override the liquid (water in a tumbler, brine in a jar) */
  liq?: { color?: string; alpha?: number; y?: number };
  /** label drawn above the glass instead of inside it (oversized paper wraps) */
  wrap?: boolean;
  glassAlpha?: number;
  /** how much of the liquid shows through coloured glass */
  liqMul?: number;
  /** top of anything drawn behind or in front, so the tile can scale to fit */
  top?: number;
}

/** A standing glass vessel with a cap and a label: shared by bottles, mixers, syrups, bitters. */
function standing(p: string, ing: Ingredient, sh: Shape, look: Look, o: StandingOpts = {}): Built {
  const d = outline([sh.lip, sh.lipY], sh.segs);
  const alpha = o.liq?.alpha ?? clampN(0.18 + ing.opacity * 0.95, 0.24, 0.96);
  const fillY = (o.liq?.y ?? sh.fill) + look.level;
  const hw = sh.hw;
  const lw = hw * 2 * look.lw;
  const lh = sh.lab[1] * look.lh;
  const ly = sh.lab[0] + look.ly - (lh - sh.lab[1]) / 2;
  const inside: ReactNode[] = [];
  if (look.straw) {
    const y0 = ly + lh * 0.15 + 10;
    const lines: ReactNode[] = [];
    for (let i = -14; i < 30; i++) {
      lines.push(<line key={`a${i}`} x1={CX - 24 + i * 2.2} y1={y0} x2={CX - 24 + i * 2.2 + (B - y0)} y2={B} />);
      lines.push(<line key={`b${i}`} x1={CX - 24 + i * 2.2 + (B - y0)} y1={y0} x2={CX - 24 + i * 2.2} y2={B} />);
    }
    inside.push(
      <g key="straw">
        <rect x="0" y={y0} width="48" height={110 - y0} fill="#c9a24a" opacity="0.62" />
        <g stroke="#6a4a18" strokeWidth="0.6" opacity="0.55">{lines}</g>
        <rect x="0" y={y0 - 0.5} width="48" height="2" fill="#e8c46a" opacity="0.9" />
        <rect x="0" y={y0 - 0.5} width="48" height="0.8" fill="#fff" opacity="0.35" />
      </g>,
    );
  }
  if (look.facets) {
    const x = hw * 0.4;
    inside.push(
      <g key="facets" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.6">
        <line x1={CX - x} x2={CX - x} y1={sh.lipY + 24} y2={B} />
        <line x1={CX + x} x2={CX + x} y1={sh.lipY + 24} y2={B} />
      </g>,
      <path key="fshade" d={`M${CX + x} ${sh.lipY + 24}H48V${B}H${CX + x}Z`} fill="#000" opacity="0.1" />,
    );
  }
  if (look.ridges && sh.ridge) {
    const rl: ReactNode[] = [];
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = CX - hw + (2 * hw * i) / (n + 1);
      rl.push(<line key={i} x1={f(x)} x2={f(x)} y1={sh.ridge[0]} y2={sh.ridge[1]} />);
    }
    inside.push(
      <g key="ridges">
        <g stroke="#fff" strokeOpacity="0.2" strokeWidth="0.7">{rl}</g>
        <g stroke="#000" strokeOpacity="0.2" strokeWidth="0.7" transform="translate(0.8 0)">{rl}</g>
      </g>,
    );
  }
  const label = paperLabel(p, { kind: look.label, x: CX - lw / 2, y: ly, w: lw, h: lh, paper: look.paper, ink: look.ink, accent: look.accent, mark: look.mark });
  if (!o.wrap) inside.push(<g key="label">{label}</g>);

  const c = cap(p, look.cap, { y: sh.lipY, hw: sh.lip + 0.9, color: look.capColor, len: look.cap === 'foil' ? look.foilLen : undefined, cage: look.cage });
  return {
    top: Math.min(c.top, sh.lipY, o.top ?? 999),
    el: (
      <g>
        <Ground hw={Math.max(hw, o.wrap ? hw * 1.25 : 0)} color={ing.color} alpha={0.12 + ing.opacity * 0.4} />
        {o.behind}
        <Vessel p={p} d={d} hw={hw} top={sh.lipY} spec={sh.spec} heavy={sh.heavy} bubbles={o.bubbles}
          glass={look.tint ? { color: look.tint, alpha: o.glassAlpha ?? 0.3 } : null}
          liquid={{ color: o.liq?.color ?? ing.color, alpha: look.tint ? alpha * (o.liqMul ?? 0.75) : alpha, y: fillY }}
          inside={inside}
          over={o.wrap ? label : undefined} />
        {c.el}
        {look.collar && collar(p, sh.lipY + 3.4, sh.lip + 0.6, look.collar)}
        {o.front}
      </g>
    ),
  };
}

/** One of the eleven spirit and liqueur bottle families. */
function bottle(p: string, ing: Ingredient, shape: BottleShape): Built {
  const look = lookFor(ing, shape);
  return standing(p, ing, SHAPES[shape](look.neck, look.wide), look);
}

/* ------------------------------------------------------------------ */
/* 6. Bar objects: mixers, syrups, bitters, sparkling, juices, jugs      */
/* ------------------------------------------------------------------ */

const MIXER: ShapeFn = (n, w) => { const h = 10.8 + w; return { lip: 3.1, lipY: 44 - n, hw: h, fill: 57, lab: [72, 20], spec: { y: 63, h: 28 },
  segs: [['L', 3.2, 52], ['C', 3.2, 58, h, 58, h, 67], ...base(h, 2.4)] }; };
const SYRUP: ShapeFn = (n, w) => { const h = 13.4 + w; return { lip: 5.2, lipY: 46 - n, hw: h, fill: 56, lab: [72, 24], heavy: 4, spec: { y: 62, h: 28 },
  segs: [['L', 5.3, 51], ['C', 5.3, 57, h, 54, h, 65], ...base(h, 3)] }; };
const DASHER: ShapeFn = (n, w) => { const h = 9.6 + w; return { lip: 3.6, lipY: 54 - n, hw: h, fill: 64, lab: [68, 30], spec: { y: 62, h: 30 },
  segs: [['L', 3.7, 58], ['C', 3.7, 63, h, 61, h, 68], ...base(h, 2.2)] }; };
const SPARK: ShapeFn = (n, w) => { const h = 14.8 + w; return { lip: 4.2, lipY: 14 - n, hw: h, fill: 46, lab: [70, 30], heavy: 6, spec: { y: 56, h: 36 },
  segs: [['L', 4.4, 30], ['C', 4.5, 46, h, 44, h, 63], ...base(h, 3)] }; };
const JUG: ShapeFn = (n, w) => { const h = 12.8 + w; return { lip: 6.4, lipY: 50 - n, hw: h, fill: 60, lab: [72, 20], heavy: 4, spec: { y: 62, h: 28 },
  segs: [['L', 6.6, 54], ['C', 6.8, 60, h, 58, h, 68], ...base(h, 3)] }; };

/** Carafes for juices: one silhouette per fruit family. */
type CarafeKind = 'carafe' | 'ball' | 'decanter' | 'tall';
const CARAFES: Record<CarafeKind, { start: [number, number]; segs: Seg[]; hw: number; fill: number; neck: [number, number]; tag: [number, number]; spec: { y: number; h: number; rot?: number }; cap: CapKind; capHW: number }> = {
  carafe: { start: [7.6, 34], hw: 15.4, fill: 52, neck: [5.6, 42], tag: [10, 74], spec: { y: 56, h: 32 }, cap: 'none', capHW: 6,
    segs: [['L', 5.6, 39], ['C', 5.2, 52, 15.4, 50, 15.4, 68], ...base(15.4, 3.4)] },
  ball: { start: [6.4, 38], hw: 17.4, fill: 60, neck: [4.8, 44], tag: [9, 80], spec: { y: 64, h: 24, rot: 8 }, cap: 'stopper', capHW: 4.8,
    segs: [['L', 4.8, 44], ['C', 4.6, 56, 17.4, 56, 17.4, 78], ['C', 17.4, 94, 12, B, 6, B], ['L', 0, B]] },
  decanter: { start: [5, 28], hw: 13.6, fill: 52, neck: [4.4, 40], tag: [8, 72], spec: { y: 56, h: 34 }, cap: 'stopper', capHW: 4.4,
    segs: [['L', 4.4, 38], ['C', 4.6, 48, 13.6, 46, 13.6, 60], ...base(13.6, 3)] },
  tall: { start: [5.2, 30], hw: 11.8, fill: 48, neck: [4.6, 40], tag: [7, 76], spec: { y: 52, h: 38 }, cap: 'cork', capHW: 5,
    segs: [['L', 4.8, 38], ['C', 4.8, 44, 11.8, 42, 11.8, 54], ...base(11.8, 2.6)] },
};

const CARAFE_OF: Record<string, CarafeKind> = {
  lime_juice: 'carafe', lemon_juice: 'carafe', orange_juice: 'carafe', grapefruit_juice: 'carafe',
  pineapple_juice: 'decanter', cranberry_juice: 'ball', tomato_juice: 'tall',
};

/** Bar-object looks keyed by id: mixers, syrups, bitters, sparkling wines, jugs. */
const BAR_LOOKS: Record<string, Partial<Look>> = {
  // mixers
  soda_water: { capColor: SILVER, label: 'band', lw: 1, paper: '#eef4fb', ink: '#2a5a8a', accent: '#4a9fd0', mark: 'stripe' },
  tonic_water: { capColor: '#2a6a7a', neck: 4, label: 'round', lw: 0.82, paper: '#e8f2ee', ink: '#1a4a5a', accent: '#2a8a9a', mark: 'star' },
  cola: { capColor: '#b01a1a', wide: 0.6, label: 'band', lw: 1, paper: '#c0201c', ink: '#ffffff', accent: '#ffffff', mark: 'stripe' },
  ginger_beer: { capColor: '#7a5a2a', tint: '#8a5a22', neck: -3, wide: 1.2, label: 'round', lw: 0.84, paper: '#e8d078', ink: '#4a2a08', accent: '#b8421e', mark: 'star' },
  ginger_ale: { capColor: '#3a7a4a', label: 'band', lw: 1, paper: '#e8efd0', ink: '#2a5a30', accent: '#c9a02a', mark: 'stripe' },
  lemon_lime_soda: { capColor: '#3a8a3a', tint: '#4a9a4a', label: 'band', lw: 1, paper: '#f0f6d8', ink: '#1a5a20', accent: '#d8e03a', mark: 'dots' },
  grapefruit_soda: { capColor: '#d84a5a', label: 'oval', lw: 0.84, paper: '#fde4e0', ink: '#a8203a', accent: '#f0785a', mark: 'crest' },
  // sparkling wines
  prosecco: { cap: 'foil', capColor: '#8fb86a', cage: true, foilLen: 20, tint: '#6a9a62', label: 'round', lw: 0.7, paper: '#f4f0dc', ink: '#3a5a2a', accent: '#8fb86a', mark: 'crest' },
  champagne: { cap: 'foil', capColor: GOLD, cage: true, foilLen: 22, tint: '#233f2c', label: 'round', lw: 0.66, paper: '#efe4c0', ink: '#5a4410', accent: GOLD, mark: 'crest' },
  // syrups (swing-top)
  simple_syrup: { label: 'round', paper: '#f4f2ea', ink: '#2a4a6a', accent: '#4a8fd0', mark: 'crest' },
  grenadine: { label: 'oval', lw: 0.8, paper: '#f0dcd8', ink: '#8a0a20', accent: '#c8102e', mark: 'dots' },
  orgeat: { label: 'rect', paper: '#e0cfa8', ink: '#4a3418', accent: '#8a6a3a', mark: 'leaf' },
  honey_syrup: { label: 'shield', lw: 0.76, paper: '#f2dca0', ink: '#5a3a08', accent: '#d99a26', mark: 'diamond' },
  ginger_syrup: { label: 'round', paper: '#f0e6b8', ink: '#6a4a08', accent: '#c98a1a', mark: 'leaf' },
  demerara_syrup: { label: 'rect', lw: 0.84, paper: '#cdb48a', ink: '#2a1a08', accent: '#6a3a14', mark: 'stripe' },
  passion_fruit: { label: 'arch', lw: 0.66, wide: 2, paper: '#fbe8a8', ink: '#8a4a08', accent: '#e8531f', mark: 'dots' },
  agave: { label: 'oval', neck: 4, wide: -1, lw: 0.8, paper: '#dfe8c0', ink: '#2a4a20', accent: '#6f8f3a', mark: 'leaf' },
  // bitters
  angostura: { cap: 'dasher', capColor: '#d9b45f', wide: -0.4, label: 'rect', lw: 1.7, lh: 1.05, paper: '#f2ead8', ink: '#3a2410', accent: '#b8321e', mark: 'crest' },
  orange_bitters: { cap: 'dasher', capColor: '#d8741e', wide: 1.4, label: 'round', lw: 0.88, paper: '#f6e2c0', ink: '#7a3a08', accent: '#e8861e', mark: 'leaf' },
  peychauds: { cap: 'dasher', capColor: '#7a1a2a', neck: 5, wide: -1, label: 'oval', lw: 0.78, paper: '#f4ecd8', ink: '#8a1a2a', accent: '#b0233a', mark: 'star' },
  // jugs
  heavy_cream: { cap: 'lid', capColor: GOLD, foilLen: 5, label: 'band', lw: 1, paper: '#cfe0f2', ink: '#2a4a7a', accent: '#4a7ab8', mark: 'stripe' },
  milk: { cap: 'lid', capColor: '#6a9ad8', wide: 1, label: 'oval', lw: 0.7, paper: '#f4f6fa', ink: '#2a4a7a', accent: '#6a9ad8', mark: 'dots' },
};

/** Mixer bottle: small, crown cap, bubbles in the liquid. */
const mixer = (p: string, ing: Ingredient): Built => {
  const look = lookFor(ing, undefined, { cap: 'crown', label: 'band', lw: 1, mark: 'stripe', facets: false });
  return standing(p, ing, MIXER(look.neck, look.wide), look, { bubbles: true });
};

const sparkling = (p: string, ing: Ingredient): Built => {
  const look = lookFor(ing, undefined, { cap: 'foil', label: 'round' });
  return standing(p, ing, SPARK(look.neck, look.wide), look, { glassAlpha: ing.id === 'champagne' ? 0.92 : 0.6, liqMul: ing.id === 'champagne' ? 0.1 : 0.4, bubbles: ing.id === 'prosecco' });
};

const swingTop = (p: string, ing: Ingredient): Built => {
  const look = lookFor(ing, undefined, { cap: 'swing', label: 'round' });
  return standing(p, ing, SYRUP(look.neck, look.wide), look);
};

const dasher = (p: string, ing: Ingredient): Built => {
  const look = lookFor(ing, undefined, { cap: 'dasher', label: 'round' });
  const wrap = look.lw > 1.2;
  return standing(p, ing, DASHER(look.neck, look.wide), look, { wrap });
};

const jug = (p: string, ing: Ingredient): Built => {
  const look = lookFor(ing, undefined, { cap: 'lid', label: 'band' });
  const sh = JUG(look.neck, look.wide);
  const hw = sh.hw;
  const handle = `M${f(CX + hw - 0.6)} ${sh.lipY + 14}C${f(CX + hw + 11)} ${sh.lipY + 11} ${f(CX + hw + 11)} ${sh.lipY + 38} ${f(CX + hw - 1)} ${sh.lipY + 40}`;
  const behind = (
    <g fill="none" strokeLinecap="round">
      <path d={handle} stroke="rgba(176,206,238,0.34)" strokeWidth="3.6" />
      <path d={handle} stroke="rgba(214,230,250,0.62)" strokeWidth="0.7" transform="translate(-1 0)" />
      <path d={handle} stroke="rgba(214,230,250,0.5)" strokeWidth="0.7" transform="translate(1.2 0.2)" />
    </g>
  );
  const b = standing(p, ing, sh, look, { behind, top: sh.lipY - 8 });
  return b;
};

/* Fruit glyphs, drawn around (cx, cy) with scale s (s = 1 is about 12 units across). */
function citrusSlice(p: string, cx: number, cy: number, r: number, flesh: string, rind: string, key = 0): ReactNode {
  const spokes: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + 0.2;
    spokes.push(<line key={i} x1={f(cx + Math.cos(a) * r * 0.14)} y1={f(cy + Math.sin(a) * r * 0.14)} x2={f(cx + Math.cos(a) * r * 0.78)} y2={f(cy + Math.sin(a) * r * 0.78)} />);
  }
  const pith = tone(rind, 0.62);
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill={rind} />
      <circle cx={cx} cy={cy} r={f(r * 0.9)} fill={pith} />
      <circle cx={cx} cy={cy} r={f(r * 0.8)} fill={flesh} />
      <circle cx={cx} cy={cy} r={f(r * 0.8)} fill={`url(#${p}f)`} />
      <g stroke={pith} strokeWidth={f(Math.max(0.5, r * 0.07))} strokeLinecap="round">{spokes}</g>
      <circle cx={cx} cy={cy} r={f(r * 0.1)} fill={pith} />
      <path d={`M${f(cx - r * 0.62)} ${f(cy - r * 0.2)}A${f(r * 0.66)} ${f(r * 0.66)} 0 0 1 ${f(cx - r * 0.1)} ${f(cy - r * 0.64)}`} stroke="#fff" strokeOpacity="0.4" strokeWidth={f(Math.max(0.6, r * 0.08))} strokeLinecap="round" fill="none" />
    </g>
  );
}

/** Radial gradient shared by every citrus slice in an icon. */
const sliceDefs = (p: string) => <Rad id={`${p}f`} cx={0.4} cy={0.35} r={0.7} stops={[[0, '#fff', 0.22], [0.6, '#fff', 0], [1, '#000', 0.2]]} />;

function fruitGlyph(p: string, ing: Ingredient, cx: number, cy: number, s: number): ReactNode {
  switch (ing.icon) {
    case 'pineapple':
      return (
        <g>
          <path d={`M${cx} ${f(cy - 3 * s)}l${f(-2 * s)} ${f(-4.2 * s)}M${cx} ${f(cy - 3 * s)}l${f(2 * s)} ${f(-4.2 * s)}M${cx} ${f(cy - 3 * s)}l0 ${f(-4.8 * s)}`} stroke="#3f8a3a" strokeWidth={f(1.5 * s)} strokeLinecap="round" />
          <ellipse cx={cx} cy={f(cy + 1 * s)} rx={f(3.6 * s)} ry={f(4.6 * s)} fill="#f2b92a" />
          <path d={`M${f(cx - 3 * s)} ${f(cy - 0.5 * s)}L${f(cx + 3 * s)} ${f(cy + 3.5 * s)}M${f(cx - 3 * s)} ${f(cy + 3 * s)}L${f(cx + 3 * s)} ${f(cy - 1 * s)}`} stroke="#b8781a" strokeWidth={f(0.6 * s)} />
        </g>
      );
    case 'cranberry':
      return (
        <g>
          <circle cx={f(cx - 2.2 * s)} cy={f(cy + 1.2 * s)} r={f(3.2 * s)} fill="#b01a3a" />
          <circle cx={f(cx + 2.4 * s)} cy={f(cy - 0.6 * s)} r={f(3 * s)} fill="#8a1230" />
          <circle cx={f(cx - 3 * s)} cy={f(cy + 0.2 * s)} r={f(0.9 * s)} fill="#fff" opacity="0.55" />
        </g>
      );
    case 'tomato':
      return (
        <g>
          <circle cx={cx} cy={f(cy + 0.8 * s)} r={f(4.6 * s)} fill="#c8321e" />
          <path d={`M${cx} ${f(cy - 3.2 * s)}l${f(-2.6 * s)} ${f(-1 * s)}M${cx} ${f(cy - 3.2 * s)}l${f(2.6 * s)} ${f(-1 * s)}M${cx} ${f(cy - 3.2 * s)}l0 ${f(-2.2 * s)}`} stroke="#3f8a3a" strokeWidth={f(1.2 * s)} strokeLinecap="round" />
          <circle cx={f(cx - 1.8 * s)} cy={f(cy - 0.6 * s)} r={f(0.9 * s)} fill="#fff" opacity="0.5" />
        </g>
      );
    default:
      return citrusSlice(p, cx, cy, 5 * s, ing.color, ing.rind ?? tone(ing.color, -0.3));
  }
}

/** A juice carafe with a small paper tag showing the fruit. */
function carafe(p: string, ing: Ingredient): Built {
  const kind = CARAFE_OF[ing.id] ?? 'carafe';
  const c = CARAFES[kind];
  const look = lookFor(ing, undefined, { cap: c.cap, capColor: kind === 'tall' ? '#b3321e' : '#bcd6ea', label: 'none' });
  const sh: Shape = { lip: c.start[0], lipY: c.start[1], segs: c.segs, hw: c.hw, fill: c.fill, lab: [70, 20], spec: c.spec };
  // pour lip: carafe flares at the mouth, so give the closure the neck width, not the lip width
  const tx = CX + c.tag[0], ty = c.tag[1];
  const tag = (
    <g>
      <defs>{sliceDefs(p)}</defs>
      <path d={`M${f(CX + c.neck[0] - 0.4)} ${c.neck[1]}Q${f(tx + 5)} ${c.neck[1] + 8} ${f(tx + 0.6)} ${ty - 6.4}`} stroke="#d9c9a0" strokeWidth="0.7" fill="none" />
      <g transform={`rotate(7 ${tx} ${ty})`}>
        <path d={`M${f(tx - 6)} ${ty - 5}L${f(tx - 2.6)} ${ty - 8}L${f(tx + 6)} ${ty - 8}L${f(tx + 6)} ${ty + 8}L${f(tx - 6)} ${ty + 8}Z`} fill="#f1e7cf" stroke="#000" strokeOpacity="0.3" strokeWidth="0.4" />
        <circle cx={f(tx - 0.2)} cy={ty - 5.6} r="0.9" fill="#3a3024" />
        {fruitGlyph(p, ing, tx, ty + 2, 0.9)}
      </g>
    </g>
  );
  const hwCap = c.capHW;
  const lookCap: Look = { ...look };
  void hwCap;
  const b = standing(p, ing, { ...sh, lip: kind === 'carafe' ? 5.6 : c.start[0] }, lookCap, { front: tag, top: ty - 9 });
  return b;
}

/** Wide-mouth jar with a lid, its contents seen through the glass. */
function jar(p: string, ing: Ingredient): Built {
  const cherry = ing.icon === 'cherry';
  const hw = cherry ? 16.4 : 14.2;
  const lipY = cherry ? 62 : 54;
  const lip = cherry ? 11 : 10.4;
  const sh: Shape = {
    lip, lipY, hw, fill: lipY + 6, lab: cherry ? [86, 11] : [84, 14], heavy: 4, spec: { y: lipY + 8, h: 30 },
    segs: [['L', lip, lipY + 4], ['C', lip, lipY + 8, hw, lipY + 5, hw, lipY + 12], ...base(hw, 3.4)],
  };
  const items: ReactNode[] = [];
  const id = `${p}j`;
  if (cherry) {
    const pos: [number, number][] = [[-9, 73], [0, 72], [9, 73], [-5, 81], [5, 81.5], [-10, 89.5], [0, 90.5], [10, 90]];
    items.push(<defs key="d"><Rad id={id} cx={0.34} cy={0.3} r={0.78} stops={[[0, '#ff7f93'], [0.4, '#c8203e'], [1, '#6a0c1f']]} /></defs>);
    items.push(<path key="stem" d="M9 73C10.4 68 11.4 64 10.6 58" transform={`translate(${CX} 0)`} stroke="#6a8a38" strokeWidth="0.9" fill="none" strokeLinecap="round" />);
    pos.forEach(([x, y], i) => {
      items.push(<g key={i}><circle cx={CX + x} cy={y} r="5.2" fill={`url(#${id})`} /><ellipse cx={CX + x - 1.7} cy={y - 1.8} rx="1.5" ry="1" fill="#fff" opacity="0.62" /></g>);
    });
  } else {
    const pos: [number, number, number][] = [[-8, 75, 0], [1, 73, 20], [8, 76, -10], [-5, 85, 10], [4.5, 86, -25], [-9, 94, -15], [0, 95, 8], [9, 94, 22]];
    items.push(<defs key="d"><Rad id={id} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#b8c24a'], [0.5, '#7d8a2e'], [1, '#3f4a14']]} /></defs>);
    pos.forEach(([x, y, r], i) => {
      items.push(
        <g key={i} transform={`translate(${CX + x} ${y}) rotate(${r})`}>
          <ellipse rx="4.5" ry="5.6" fill={`url(#${id})`} />
          <circle cy="-2.9" r="1.9" fill="#c8202e" />
          <ellipse cx="-1.6" cy="-0.6" rx="1" ry="1.8" fill="#fff" opacity="0.4" />
        </g>,
      );
    });
  }
  const look = lookFor(ing, undefined, cherry
    ? { cap: 'lid', capColor: '#b8923a', foilLen: 8, label: 'rect', lw: 0.7, paper: '#f1e6d4', ink: '#7a1a1a', accent: '#a8202e', mark: 'dots' }
    : { cap: 'lid', capColor: '#5f8f38', foilLen: 8, label: 'rect', lw: 0.76, paper: '#f1ecd0', ink: '#3a4a14', accent: '#7d8a2e', mark: 'dots' });
  return standing(p, ing, sh, look, {
    behind: <g>{items}</g>,
    liq: cherry ? { color: '#8a1428', alpha: 0.34, y: lipY + 8 } : { color: '#cfd68a', alpha: 0.26, y: lipY + 8 },
    top: cherry ? 56 : 50,
  });
}

/** A round of cucumber: dark skin, pale flesh, a ring of seeds. */
function cucumberSlice(p: string, cx: number, cy: number, r: number, key = 0): ReactNode {
  const seeds: ReactNode[] = [];
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    const sx = f(cx + Math.cos(a) * r * 0.42), sy = f(cy + Math.sin(a) * r * 0.42);
    seeds.push(<ellipse key={k} cx={sx} cy={sy} rx={f(r * 0.1)} ry={f(r * 0.17)} fill="#eef5d2" transform={`rotate(${f((a * 180) / Math.PI + 90)} ${sx} ${sy})`} />);
  }
  return (
    <g key={key}>
      <circle cx={cx} cy={cy} r={r} fill="#3d7a2c" />
      <circle cx={cx} cy={cy} r={f(r * 0.9)} fill="#9cc66a" />
      <circle cx={cx} cy={cy} r={f(r * 0.78)} fill="#cfe5a2" />
      <circle cx={cx} cy={cy} r={f(r * 0.5)} fill="#bcd98a" />
      {seeds}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${p}f)`} />
    </g>
  );
}

/** A glass dish of sliced fruit: orange wheels or cucumber rounds, seen through the glass. */
function sliceDish(p: string, ing: Ingredient): Built {
  const cuke = ing.icon === 'cucumber';
  const items: ReactNode[] = [<defs key="d">{sliceDefs(p)}</defs>];
  const pos: [number, number, number][] = [[-8.4, 78, 11], [8.4, 78.6, 11], [0, 84, 11.6]];
  pos.forEach(([x, y, r], i) => {
    if (cuke) {
      items.push(cucumberSlice(p, CX + x, y, r, i));
    } else {
      items.push(citrusSlice(p, CX + x, y, r, ing.color, ing.rind ?? '#c96a10', i));
    }
  });
  const d = outline([19, 90], [['L', 19.4, 92], ['C', 19, 99, 15, B, 9, B], ['L', 0, B]]);
  return {
    top: 66,
    el: (
      <g>
        <Ground hw={19} />
        {items}
        <Vessel p={p} d={d} hw={19} top={86} spec={false} heavy={3.4} wall={1.2} />
        <ellipse cx={CX} cy="90.6" rx="19" ry="2.4" fill="none" stroke="#dcecff" strokeOpacity="0.55" strokeWidth="0.8" />
      </g>
    ),
  };
}

/** Ceramic: flat enamel with a lit left edge and shaded right edge. */
function ceramic(p: string, d: string, color: string, hw: number, spec?: { y: number; h: number }, sfx = ''): ReactNode {
  const e = `${p}e${sfx}`, t = `${p}t${sfx}`;
  return (
    <g>
      <defs>
        <Lin id={e} stops={[[0, tone(color, 0.45)], [0.22, tone(color, 0.14)], [0.6, color], [1, tone(color, -0.5)]]} />
        <Lin id={t} v stops={[[0, '#fff', 0.34], [0.35, '#fff', 0.05], [1, '#000', 0.2]]} />
      </defs>
      <path d={d} fill={`url(#${e})`} />
      <path d={d} fill={`url(#${t})`} />
      <path d={d} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="0.5" />
      {spec && <rect x={CX - hw + 2.4} y={spec.y} width="1.6" height={spec.h} rx="0.8" fill="#fff" opacity="0.5" />}
    </g>
  );
}

/** Salt in a small blue ceramic dish. */
function saltDish(p: string): Built {
  const d = outline([18.4, 86], [['C', 18.4, 95, 15, B, 8, B], ['L', 0, B]]);
  const crystals: ReactNode[] = [];
  [[-9, 82], [-4, 76.5], [3, 75], [8, 80], [-1, 81], [11, 84.5], [-12, 85], [5, 85]].forEach(([x, y], i) => {
    crystals.push(<rect key={i} x={CX + x} y={y} width={i % 2 ? 1.5 : 1.2} height={i % 2 ? 1.5 : 1.2} fill="#fff" opacity="0.9" transform={`rotate(${i * 25} ${CX + x} ${y})`} />);
  });
  return {
    top: 71,
    el: (
      <g>
        <Ground hw={18} />
        {ceramic(p, d, '#3d6a8f', 18, { y: 92, h: 6 })}
        <defs><Lin id={`${p}s`} v stops={[[0, '#ffffff'], [0.6, '#e6ebf2'], [1, '#aeb8c8']]} /></defs>
        <path d={`M${CX - 16.4} 87Q${CX - 13} 76 ${CX - 4} 74.4Q${CX} 70.8 ${CX + 4.6} 73.6Q${CX + 13} 76 ${CX + 16.4} 87Q${CX} 90.4 ${CX - 16.4} 87Z`} fill={`url(#${p}s)`} />
        <path d={`M${CX - 11} 83Q${CX - 8} 77 ${CX - 3} 76`} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.8" />
        {crystals}
        <ellipse cx={CX} cy="86.6" rx="18.4" ry="2.2" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="0.7" />
      </g>
    ),
  };
}

/** An isometric sugar cube whose front bottom corner is at (cx, by). */
function sugarCube(cx: number, by: number, a: number, h: number, k = 0): ReactNode {
  return (
    <g key={k}>
      <path d={`M${f(cx - a)} ${f(by - a / 2)}L${cx} ${by}L${cx} ${f(by - h)}L${f(cx - a)} ${f(by - h - a / 2)}Z`} fill="#dde3ee" />
      <path d={`M${f(cx + a)} ${f(by - a / 2)}L${cx} ${by}L${cx} ${f(by - h)}L${f(cx + a)} ${f(by - h - a / 2)}Z`} fill="#c5cddc" />
      <path d={`M${cx} ${f(by - h - a)}L${f(cx + a)} ${f(by - h - a / 2)}L${cx} ${f(by - h)}L${f(cx - a)} ${f(by - h - a / 2)}Z`} fill="#fbfcff" />
      <path d={`M${f(cx - a + 1)} ${f(by - h - a / 2 + 0.6)}L${cx} ${f(by - h - a + 1.2)}`} stroke="#fff" strokeWidth="0.8" strokeLinecap="round" />
      <g fill="#fff" opacity="0.9"><circle cx={f(cx - a * 0.2)} cy={f(by - h - a / 2 + 0.4)} r="0.5" /><circle cx={f(cx + a * 0.3)} cy={f(by - h - a / 2 - 0.8)} r="0.4" /></g>
    </g>
  );
}

/** Sugar cubes on a glass tray. */
function sugarTray(p: string): Built {
  const a = 6.6, h = 7.4;
  const cube = (cx: number, by: number, k: number) => sugarCube(cx, by, a, h, k);
  const d = outline([19, 92], [['L', 17.4, B - 3], ['Q', 17, B, 14, B], ['L', 0, B]]);
  const y0 = 96;
  return {
    top: y0 - h * 2 - a * 2 - 2,
    el: (
      <g>
        <Ground hw={18} />
        {cube(CX - 6.6, y0, 0)}
        {cube(CX + 6.6, y0, 1)}
        {cube(CX, y0 - 5.8, 2)}
        {cube(CX, y0 - 5.8 - h - 0.6 - 0.4, 3)}
        <Vessel p={p} d={d} hw={19} top={92} spec={false} heavy={3} wall={1.1} />
        <ellipse cx={CX} cy="92" rx="19" ry="2" fill="none" stroke="#dcecff" strokeOpacity="0.5" strokeWidth="0.7" />
      </g>
    ),
  };
}

const mintLeaf = (p: string, x: number, y: number, rot: number, s: number, k: number): ReactNode => (
  <g key={k} transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${s})`}>
    <path d="M0 1C-5.4 -1 -6.2 -8 0 -13.6C6.2 -8 5.4 -1 0 1Z" fill={`url(#${p}a)`} />
    <path d="M0 0.4L0 -11.4M0 -4L-2.6 -6.6M0 -4L2.6 -6.6M0 -7.6L-2 -9.6M0 -7.6L2 -9.6" stroke="#1f6a3a" strokeOpacity="0.55" strokeWidth="0.55" fill="none" />
  </g>
);
const mintDefs = (p: string) => <Lin id={`${p}a`} stops={[[0, '#9be0a0'], [0.5, '#4fb069'], [1, '#237a46']]} />;

/** A tumbler with a sprig of mint standing in water. */
function mintGlass(p: string, ing: Ingredient): Built {
  const leaf = (x: number, y: number, rot: number, sc: number, k: number) => mintLeaf(p, x, y, rot, sc, k);
  const stem = (d: string, k: number) => <path key={k} d={d} stroke="#3d8a4a" strokeWidth="1.3" strokeLinecap="round" fill="none" />;
  const y0 = B - 10;
  const behind = (
    <g>
      <defs>{mintDefs(p)}</defs>
      {stem(`M${CX} ${y0}C${CX - 2} 78 ${CX + 2} 62 ${CX + 0.4} 46`, 0)}
      {stem(`M${CX - 1} ${y0}C${CX - 5} 82 ${CX - 8} 68 ${CX - 10.6} 58`, 1)}
      {stem(`M${CX + 1} ${y0}C${CX + 5} 80 ${CX + 8} 70 ${CX + 10.4} 60`, 2)}
      {leaf(CX - 10.6, 58, -34, 0.95, 0)}
      {leaf(CX + 10.4, 60, 38, 0.95, 1)}
      {leaf(CX - 5.8, 64, -52, 0.82, 2)}
      {leaf(CX + 5.6, 68, 54, 0.8, 3)}
      {leaf(CX + 0.4, 46, 4, 1.1, 4)}
      {leaf(CX - 1.2, 56, -28, 1, 5)}
      {leaf(CX + 2, 58, 30, 1, 6)}
      {leaf(CX - 3.4, 72, -40, 0.9, 7)}
      {leaf(CX + 4, 76, 44, 0.9, 8)}
    </g>
  );
  const sh: Shape = {
    lip: 14, lipY: 62, hw: 13.4, fill: 74, lab: [100, 4], heavy: 7, spec: { y: 68, h: 28 },
    segs: [['L', 12.2, B - 3], ['Q', 12, B, 9.6, B], ['L', 0, B]],
  };
  return standing(p, ing, sh, lookFor(ing, undefined, { cap: 'none', label: 'none' }), {
    behind, liq: { color: '#bfe6ee', alpha: 0.3, y: 74 }, top: 38,
  });
}

/** Coconut cream in a tin with a ring pull. */
function coconutCan(p: string): Built {
  const l = CX - 12.8, w = 25.6, top = 56;
  return {
    top: top - 4,
    el: (
      <g>
        <Ground hw={13} />
        <defs>
          {metal(`${p}m`, '#b9c1cd')}
          <Lin id={`${p}p`} stops={[[0, '#000', 0.36], [0.2, '#000', 0.04], [0.42, '#fff', 0.14], [0.8, '#000', 0.06], [1, '#000', 0.5]]} />
          <Rad id={`${p}c`} cx={0.38} cy={0.32} r={0.7} stops={[[0, '#9a7048'], [1, '#4a2e18']]} />
        </defs>
        <path d={`M${l} ${top}H${l + w}V${B - 1.6}Q${l + w} ${B} ${l + w - 1.6} ${B}H${l + 1.6}Q${l} ${B} ${l} ${B - 1.6}Z`} fill={`url(#${p}m)`} />
        <rect x={l} y={top + 3} width={w} height="1" fill="#000" opacity="0.2" />
        <rect x={l} y={B - 4} width={w} height="1" fill="#000" opacity="0.22" />
        <rect x={l} y={top + 4} width={w} height={B - 4 - top - 4} fill="#f4efe2" />
        <rect x={l} y={top + 4} width={w} height="3.6" fill="#2f7a55" />
        <rect x={l} y={B - 8.6} width={w} height="3.6" fill="#2f7a55" />
        <circle cx={CX} cy="80" r="8" fill={`url(#${p}c)`} />
        <path d={`M${CX - 8} 80A8 8 0 0 1 ${CX + 8} 80Z`} fill="#fffdf6" transform={`rotate(-20 ${CX} 80)`} />
        <ellipse cx={CX - 2.6} cy="77.4" rx="2.4" ry="1.5" fill="#fff" opacity="0.55" />
        <path d={`M${CX + 6} 72Q${CX + 12} 66 ${CX + 9.6} 63`} stroke="#2f7a55" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <rect x={CX - 7} y="87.6" width="14" height="1.4" rx="0.7" fill="#2f4a3a" opacity="0.7" />
        <rect x={l} y={top + 4} width={w} height={B - 4 - top - 4} fill={`url(#${p}p)`} />
        <ellipse cx={CX} cy={top} rx="12.8" ry="2.6" fill="#d8dee8" />
        <ellipse cx={CX} cy={top} rx="10.6" ry="1.9" fill="#a9b3c2" />
        <ellipse cx={CX} cy={top - 0.3} rx="9" ry="1.3" fill="#c9d1dd" />
        <ellipse cx={CX + 2} cy={top - 0.8} rx="3" ry="1.2" fill="none" stroke="#6c7686" strokeWidth="0.9" />
        <rect x={l + 1.4} y={top + 6} width="1.6" height={B - top - 16} rx="0.8" fill="#fff" opacity="0.45" />
      </g>
    ),
  };
}

/** Egg standing in a ceramic egg cup. */
function eggCup(p: string): Built {
  const cup = outline([11, 82], [['C', 11, 90, 5.4, 91, 4.8, 96], ['L', 4.6, 98.6], ['C', 4.6, 101, 11.8, 100.2, 11.8, B], ['L', 0, B]]);
  return {
    top: 54,
    el: (
      <g>
        <Ground hw={12} />
        <defs>
          <Rad id={`${p}g`} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#fffdf7'], [0.55, '#f3ecda'], [1, '#c9bb98']]} />
        </defs>
        <ellipse cx={CX} cy="69" rx="11.4" ry="14.6" fill={`url(#${p}g)`} />
        <ellipse cx={CX - 4.2} cy="62.6" rx="2.6" ry="5.2" fill="#fff" opacity="0.7" transform={`rotate(14 ${CX - 4.2} 62.6)`} />
        <g fill="#c9b690" opacity="0.5"><circle cx={CX + 4} cy="64" r="0.5" /><circle cx={CX + 2} cy="72" r="0.45" /><circle cx={CX - 3} cy="74.4" r="0.5" /></g>
        {ceramic(p, cup, '#e6edf5', 12, { y: 86, h: 10 })}
        <path d={`M${CX - 10.6} 87Q${CX} 91 ${CX + 10.6} 87`} stroke="#4a7ab8" strokeWidth="1.8" fill="none" />
        <ellipse cx={CX} cy="82.2" rx="11" ry="1.7" fill="#fff" opacity="0.7" />
      </g>
    ),
  };
}

/** Espresso cup on its saucer, with a curl of steam. */
function espresso(p: string): Built {
  const cup = 'M10.5 74L37.5 74Q37.4 92 32 98Q24 101.6 16 98Q10.6 92 10.5 74Z';
  const saucer = 'M3 98.4Q4 102.8 24 103.2Q44 102.8 45 98.4Q36 100.6 24 100.6Q12 100.6 3 98.4Z';
  return {
    top: 52,
    el: (
      <g>
        <Ground hw={21} />
        {ceramic(p, saucer, '#eef2f7', 21, undefined, 's')}
        <ellipse cx={CX} cy="98.4" rx="21" ry="3.2" fill="#f4f7fb" />
        <ellipse cx={CX} cy="98.4" rx="21" ry="3.2" fill="none" stroke="#000" strokeOpacity="0.2" strokeWidth="0.5" />
        <ellipse cx={CX} cy="98.2" rx="9.6" ry="1.8" fill="#000" opacity="0.18" />
        <path d="M36.6 78C46 77 46.6 90 34.6 92" stroke="#cfd7e2" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M36.6 78C46 77 46.6 90 34.6 92" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" fill="none" transform="translate(-0.4 -0.6)" />
        {ceramic(p, cup, '#eef2f7', 13, { y: 80, h: 14 })}
        <ellipse cx={CX} cy="74" rx="13.5" ry="3.4" fill="#f4f7fb" stroke="#000" strokeOpacity="0.2" strokeWidth="0.5" />
        <defs><Rad id={`${p}r`} cx={0.4} cy={0.4} r={0.7} stops={[[0, '#b88650'], [0.6, '#6a3f1e'], [1, '#2a170a']]} /></defs>
        <ellipse cx={CX} cy="74.6" rx="11.8" ry="2.6" fill={`url(#${p}r)`} />
        <ellipse cx={CX - 3} cy="74" rx="5" ry="0.9" fill="#e6c08a" opacity="0.55" />
        <g stroke="#dfe8f5" strokeOpacity="0.32" strokeWidth="1.1" fill="none" strokeLinecap="round">
          <path d="M20.5 68C18 64 23 60 20.5 55.4" />
          <path d="M27.5 67C25 63 30 59 27.5 54" />
        </g>
      </g>
    ),
  };
}

/* ------------------------------------------------------------------ */
/* 7. Tile icons (48x48): compact, same lighting as the shelf           */
/* ------------------------------------------------------------------ */

const TileSvg = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">{children}</svg>
);

const tileCitrus = (p: string, ing: Ingredient): ReactNode => (
  <TileSvg>
    <defs>{sliceDefs(p)}</defs>
    {citrusSlice(p, 24, 24.5, 19, ing.color, ing.rind ?? tone(ing.color, -0.3))}
  </TileSvg>
);

const tileMint = (p: string): ReactNode => (
  <TileSvg>
    <defs>{mintDefs(p)}</defs>
    <path d="M24 44C24 36 22 28 24 17" stroke="#2f7a45" strokeWidth="2" strokeLinecap="round" />
    {mintLeaf(p, 24, 17, 0, 1.15, 0)}
    {mintLeaf(p, 23.5, 26, -50, 1.1, 1)}
    {mintLeaf(p, 24.5, 28, 52, 1.1, 2)}
    {mintLeaf(p, 23.5, 36, -62, 0.95, 3)}
    {mintLeaf(p, 24.5, 38, 64, 0.95, 4)}
    {mintLeaf(p, 23.8, 21, -24, 0.95, 5)}
  </TileSvg>
);

const tileCherry = (p: string): ReactNode => (
  <TileSvg>
    <defs>
      <Rad id={`${p}r`} cx={0.34} cy={0.3} r={0.78} stops={[[0, '#ff7f93'], [0.4, '#c8203e'], [1, '#6a0c1f']]} />
    </defs>
    <path d="M16.6 31C18 22 22 15 29.6 8.4M32.6 33C31 24 30.4 16 29.6 8.4" stroke="#6a8a38" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    <path d="M29.6 8.4C33 5.4 38 6 40 9.6C36 12 32 11.4 29.6 8.4Z" fill="#4fa04a" />
    <circle cx="16.6" cy="34" r="8.6" fill={`url(#${p}r)`} />
    <circle cx="32.6" cy="35.6" r="8.2" fill={`url(#${p}r)`} />
    <ellipse cx="13.6" cy="30.6" rx="2.6" ry="1.7" fill="#fff" opacity="0.6" transform="rotate(-30 13.6 30.6)" />
    <ellipse cx="29.8" cy="32.4" rx="2.4" ry="1.6" fill="#fff" opacity="0.5" transform="rotate(-30 29.8 32.4)" />
  </TileSvg>
);

const tileSugar = (): ReactNode => (
  <TileSvg>
    {sugarCube(14, 42, 10, 11, 0)}
    {sugarCube(34, 42, 10, 11, 1)}
    {sugarCube(24, 33.4, 10, 11, 2)}
  </TileSvg>
);

const tileTomato = (p: string): ReactNode => (
  <TileSvg>
    <defs><Rad id={`${p}r`} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#ff7a64'], [0.45, '#d12c1c'], [1, '#7a1008']]} /></defs>
    <path d="M10 28C10 18 17 14 24 15C31 14 38 18 38 28C38 38 31 43 24 43C17 43 10 38 10 28Z" fill={`url(#${p}r)`} />
    <path d="M24 15L17 11M24 15L31 11M24 15L24 8.4M24 15L14.6 15.4M24 15L33.4 15.4" stroke="#3f8a3a" strokeWidth="2.4" strokeLinecap="round" />
    <circle cx="24" cy="15.4" r="2.8" fill="#4fa04a" />
    <ellipse cx="17.2" cy="23" rx="3.6" ry="2.2" fill="#fff" opacity="0.4" transform="rotate(-30 17.2 23)" />
  </TileSvg>
);

const tileCucumber = (p: string): ReactNode => (
  <TileSvg>
    <defs>{sliceDefs(p)}</defs>
    {cucumberSlice(p, 19, 19, 14.5, 0)}
    {cucumberSlice(p, 29.5, 29.5, 16, 1)}
  </TileSvg>
);

const tileCranberry = (p: string): ReactNode => (
  <TileSvg>
    <defs><Rad id={`${p}r`} cx={0.34} cy={0.3} r={0.8} stops={[[0, '#ff6f8a'], [0.45, '#b01a3a'], [1, '#5a0a1c']]} /></defs>
    {([[16, 20, 7.4], [30, 18, 7], [23.5, 31, 8.2], [35, 32, 5.6], [12.5, 33, 5.6]] as const).map(([x, y, r], i) => (
      <g key={i}>
        <circle cx={x} cy={y} r={r} fill={`url(#${p}r)`} />
        <ellipse cx={x - r * 0.35} cy={y - r * 0.4} rx={r * 0.28} ry={r * 0.2} fill="#fff" opacity="0.6" />
      </g>
    ))}
  </TileSvg>
);

const tilePineapple = (p: string): ReactNode => (
  <TileSvg>
    <defs><Rad id={`${p}r`} cx={0.36} cy={0.34} r={0.8} stops={[[0, '#ffe27a'], [0.5, '#f2b92a'], [1, '#b8781a']]} /></defs>
    <g stroke="#3f8a3a" strokeWidth="2.6" strokeLinecap="round"><path d="M24 17L20 5M24 17L28 5M24 17L14.6 8M24 17L33.4 8M24 17L24 3.6" /></g>
    <ellipse cx="24" cy="31" rx="12.6" ry="14.6" fill={`url(#${p}r)`} />
    <g stroke="#a8641a" strokeWidth="1.1" opacity="0.7">
      <path d="M13 24L35 38M13 31L35 45M13 38L26 46M18 18L35 30M30 17L12 29M35 24L13 38M35 31L21 44" />
    </g>
    <ellipse cx="18" cy="24" rx="2.4" ry="4.4" fill="#fff" opacity="0.35" />
  </TileSvg>
);

const tileOlive = (p: string): ReactNode => (
  <TileSvg>
    <defs><Rad id={`${p}r`} cx={0.36} cy={0.3} r={0.8} stops={[[0, '#b8c24a'], [0.5, '#7d8a2e'], [1, '#3f4a14']]} /></defs>
    <ellipse cx="22" cy="28" rx="11.4" ry="14" fill={`url(#${p}r)`} />
    <circle cx="22" cy="18.6" r="4.4" fill="#c8202e" />
    <ellipse cx="17.6" cy="26" rx="2.6" ry="4.6" fill="#fff" opacity="0.32" />
    <path d="M36 6L24 24" stroke="#d6c07a" strokeWidth="2" strokeLinecap="round" />
    <circle cx="36.4" cy="5.6" r="2" fill="#e8d28a" />
  </TileSvg>
);

const tileSalt = (p: string): ReactNode => (
  <TileSvg>
    <defs>
      <Lin id={`${p}s`} stops={[[0, '#ffffff', 0.34], [0.2, '#dcecff', 0.1], [0.7, '#04070c', 0.12], [1, '#04070c', 0.36]]} />
      {metal(`${p}m`, '#c4cad4')}
    </defs>
    <path d="M13 17Q13 12 24 11Q35 12 35 17L35 40Q35 44 31 44L17 44Q13 44 13 40Z" fill="rgba(176,200,235,0.14)" stroke="rgba(206,224,248,0.6)" strokeWidth="1" />
    <path d="M14.4 30L33.6 30L33.6 40Q33.6 42.6 31 42.6L17 42.6Q14.4 42.6 14.4 40Z" fill="#f1f4fa" />
    <path d="M13 17Q13 12 24 11Q35 12 35 17L35 40Q35 44 31 44L17 44Q13 44 13 40Z" fill={`url(#${p}s)`} />
    <rect x="12" y="7" width="24" height="9" rx="3" fill={`url(#${p}m)`} />
    <g fill="#4a5262"><circle cx="19" cy="11.5" r="1" /><circle cx="24" cy="11.5" r="1" /><circle cx="29" cy="11.5" r="1" /></g>
    <rect x="14" y="8" width="20" height="1.4" rx="0.7" fill="#fff" opacity="0.5" />
    <rect x="16.4" y="20" width="1.8" height="21" rx="0.9" fill="#fff" opacity="0.4" />
  </TileSvg>
);

/** Scale a short object up about the centre of its base so small bar items keep some presence. */
function grow(b: Built, k: number): Built {
  return {
    top: 104 - (104 - b.top) * k,
    el: <g transform={`translate(${CX} 104) scale(${k}) translate(${-CX} -104)`}>{b.el}</g>,
  };
}

/** Objects that stand on a surface reuse the shelf drawing, scaled to the tile. */
function standingTile(b: Built): ReactNode {
  const s = clampN(43 / (104 - b.top), 0.3, 1);
  return (
    <TileSvg>
      <g transform={`translate(${f(24 - 24 * s)} ${f(46.6 - 104 * s)}) scale(${f(s)})`}>{b.el}</g>
    </TileSvg>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Dispatch                                                          */
/* ------------------------------------------------------------------ */

function buildShelf(p: string, ing: Ingredient): Built {
  switch (ing.icon) {
    case 'bottle': return bottle(p, ing, ing.bottle ?? 'tall');
    case 'syrup': return swingTop(p, ing);
    case 'dropper': return dasher(p, ing);
    case 'fizz': return mixer(p, ing);
    case 'flute': return sparkling(p, ing);
    case 'citrus': return ing.group === 'Juices' ? carafe(p, ing) : grow(sliceDish(p, ing), 1.2);
    case 'cucumber': return grow(sliceDish(p, ing), 1.2);
    case 'pineapple':
    case 'cranberry':
    case 'tomato': return carafe(p, ing);
    case 'mint': return grow(mintGlass(p, ing), 1.12);
    case 'cherry':
    case 'olive': return grow(jar(p, ing), 1.12);
    case 'cream': return jug(p, ing);
    case 'egg': return grow(eggCup(p), 1.22);
    case 'coffee': return grow(espresso(p), 1.1);
    case 'sugar': return grow(sugarTray(p), 1.15);
    case 'coconut': return coconutCan(p);
    case 'shaker': return grow(saltDish(p), 1.2);
  }
}

function buildTile(p: string, ing: Ingredient): ReactNode {
  switch (ing.icon) {
    case 'citrus': return tileCitrus(p, ing);
    case 'mint': return tileMint(p);
    case 'cherry': return tileCherry(p);
    case 'sugar': return tileSugar();
    case 'tomato': return tileTomato(p);
    case 'cucumber': return tileCucumber(p);
    case 'cranberry': return tileCranberry(p);
    case 'pineapple': return tilePineapple(p);
    case 'olive': return tileOlive(p);
    case 'shaker': return tileSalt(p);
    default: return standingTile(buildShelf(p, ing));
  }
}

export interface IngredientIconProps {
  ing: Ingredient;
  /** 'tile' is a 48x48 icon for small tiles, 'shelf' a tall 48x104 object that stands on the slab. */
  variant?: 'tile' | 'shelf';
}

/** Dispatch: the right art for an ingredient. */
export const IngredientIcon = memo(function IngredientIcon({ ing, variant = 'tile' }: IngredientIconProps) {
  const p = useId();
  if (variant === 'shelf') {
    return (
      <svg viewBox="0 0 48 104" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
        {buildShelf(p, ing).el}
      </svg>
    );
  }
  return buildTile(p, ing);
});

/* ------------------------------------------------------------------ */
/* 9. Brand (kept until the shell moves BrandMark to Brand.tsx)         */
/* ------------------------------------------------------------------ */

/** Brand mark — the canonical Stewy sigil: a gold-rimmed cauldron of glowing
    brew beneath a crescent moon and star sparkle (matches favicon + logo). */
export function BrandMark() {
  const uid = useId();
  const brewId = `${uid}b`, auraId = `${uid}a`, fireId = `${uid}f`, moonId = `${uid}m`;
  return (
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={brewId} cx="0.5" cy="0.4" r="0.8">
          <stop offset="0" stopColor="#a8ffe0" />
          <stop offset="0.55" stopColor="#3ddc97" />
          <stop offset="1" stopColor="#1c8a61" />
        </radialGradient>
        <radialGradient id={auraId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#3ddc97" stopOpacity="0.4" />
          <stop offset="1" stopColor="#3ddc97" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={fireId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffcf7d" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#ff8a3c" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff8a3c" stopOpacity="0" />
        </radialGradient>
        <mask id={moonId}>
          <circle cx="18" cy="14.5" r="6" fill="#fff" />
          <circle cx="20.6" cy="12.9" r="5.2" fill="#000" />
        </mask>
      </defs>
      <ellipse cx="32" cy="55.5" rx="15" ry="6.5" fill={`url(#${fireId})`} />
      <path d="M15.8 30.5 Q14.5 45 26 51.5 Q32 54 38 51.5 Q49.5 45 48.2 30.5 Z" fill="#201409" stroke="rgba(217,178,94,0.55)" strokeWidth="1.4" />
      <path d="M22.5 52.3 l-2.4 4.6 q-0.7 1.6 1 1.6 h3.6 q1.4 0 1.1 -1.5 l-1 -4.9 Z" fill="#2a1d12" />
      <path d="M41.5 52.3 l2.4 4.6 q0.7 1.6 -1 1.6 h-3.6 q-1.4 0 -1.1 -1.5 l1 -4.9 Z" fill="#2a1d12" />
      <ellipse cx="32" cy="26" rx="11" ry="6.5" fill={`url(#${auraId})`} />
      <ellipse cx="32" cy="29.5" rx="16.4" ry="4.8" fill="#2a1d12" stroke="#d9b25e" strokeWidth="1.8" />
      <ellipse cx="32" cy="29.6" rx="13" ry="3.4" fill={`url(#${brewId})`} />
      <ellipse cx="30" cy="29" rx="6.5" ry="1.7" fill="#a8ffe0" opacity="0.55" />
      <circle cx="26.5" cy="26.3" r="1.7" fill="#bfffe4" opacity="0.9" />
      <circle cx="33.8" cy="24.6" r="1.2" fill="#bfffe4" opacity="0.75" />
      <circle cx="30.2" cy="22" r="0.9" fill="#bfffe4" opacity="0.6" />
      <circle cx="16.5" cy="49" r="1" fill="#ffb45e" opacity="0.9" />
      <circle cx="47.5" cy="47" r="0.8" fill="#ff9a3c" opacity="0.8" />
      <circle cx="18" cy="14.5" r="6" fill="#f2d68c" mask={`url(#${moonId})`} />
      <path d="M47.5 9.5 l1.5 4.2 4.2 1.5 -4.2 1.5 -1.5 4.2 -1.5 -4.2 -4.2 -1.5 4.2 -1.5 Z" fill="#7fe6c4" />
      <circle cx="42" cy="22.5" r="1" fill="#f2d68c" opacity="0.8" />
    </svg>
  );
}

/** Rotating "summoning circle" behind the cauldron — a celestial almanac:
    runic tick ring, a counter-turning ring of moon phases and star sparkles,
    and a soft sunburst at the heart. */
export function MagicCircle() {
  const C = 100;
  const P = (deg: number, rad: number): [string, string] => [
    (C + rad * Math.cos((deg * Math.PI) / 180)).toFixed(1),
    (C + rad * Math.sin((deg * Math.PI) / 180)).toFixed(1),
  ];
  const ticks = [];
  for (let d = 0; d < 360; d += 15) {
    const o = P(d, 90), i = P(d, d % 45 === 0 ? 80 : 85);
    ticks.push(<line key={d} x1={o[0]} y1={o[1]} x2={i[0]} y2={i[1]} />);
  }
  const dots = [];
  for (let d = 0; d < 360; d += 30) {
    const p = P(d, 71);
    dots.push(<circle key={d} cx={p[0]} cy={p[1]} r="1.6" />);
  }

  // moon-phase ring: new → waxing half → full → waning half, twice around
  const MOON = 'rgba(242,214,140,0.75)';
  const moons = [];
  for (let i = 0; i < 8; i++) {
    const deg = i * 45;
    const [x, y] = P(deg, 57);
    const phase = i % 4;
    moons.push(
      <g key={i} transform={`translate(${x} ${y}) rotate(${deg})`}>
        {phase === 0 && <circle r="3.6" fill="none" stroke={MOON} strokeWidth="1" />}
        {phase === 1 && <path d="M0,-3.6 A3.6,3.6 0 0,1 0,3.6 Z" fill={MOON} />}
        {phase === 2 && <circle r="3.6" fill={MOON} />}
        {phase === 3 && <path d="M0,-3.6 A3.6,3.6 0 0,0 0,3.6 Z" fill={MOON} />}
      </g>,
    );
  }
  // four-point star sparkles between the moons
  const sparks = [];
  for (let i = 0; i < 8; i++) {
    const [x, y] = P(i * 45 + 22.5, 57);
    sparks.push(
      <path key={i} transform={`translate(${x} ${y})`}
        d="M0,-4.4 L1.1,-1.1 L4.4,0 L1.1,1.1 L0,4.4 L-1.1,1.1 L-4.4,0 L-1.1,-1.1 Z"
        fill="rgba(127,230,196,0.55)" />,
    );
  }
  // sunburst rays at the heart (mostly veiled by the cauldron)
  const rays = [];
  for (let d = 0; d < 360; d += 30) {
    const a = P(d, 30), b = P(d, 42);
    rays.push(<line key={d} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />);
  }

  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="94" stroke="rgba(217,178,94,0.5)" strokeWidth="1" />
      <circle cx="100" cy="100" r="90" stroke="rgba(217,178,94,0.28)" strokeWidth="0.6" strokeDasharray="2 4" />
      <circle cx="100" cy="100" r="80" stroke="rgba(127,230,196,0.45)" strokeWidth="1" />
      <g stroke="rgba(217,178,94,0.5)" strokeWidth="0.9">{ticks}</g>
      <g fill="rgba(127,230,196,0.6)">{dots}</g>
      <g className="mc-inner">
        <circle cx="100" cy="100" r="65" stroke="rgba(242,214,140,0.32)" strokeWidth="0.8" fill="none" />
        <circle cx="100" cy="100" r="48" stroke="rgba(242,214,140,0.22)" strokeWidth="0.6" strokeDasharray="1.5 5" fill="none" />
        {moons}
        {sparks}
        <g stroke="rgba(242,214,140,0.3)" strokeWidth="1" strokeLinecap="round">{rays}</g>
      </g>
    </svg>
  );
}
