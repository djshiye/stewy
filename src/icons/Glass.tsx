/* Glassware: ten glasses at true proportions in a shared 120 x 160 box (feet on the
   bottom edge), with a liquid, ice, foam, condensation and garnishes. Pure SVG paths
   and gradients, no filters, so 55 of them can share a screen. */
import { memo, useId, type ReactNode } from 'react';
import type { GlassKind } from '../data/types';
import { shade, type RGB } from '../lib/color';
import { garnishDefs, drawGarnish, type GarnishCtx, type Layers } from './glass/garnishes';
import { CX, geoFor, num as f, ry as persp, type Geo } from './glass/geometry';
import { iceNodes, rnd } from './glass/ice';
import type { GarnishKind, Ice } from './garnish';

export type { GarnishKind, Ice } from './garnish';

export interface GlassProps {
  kind: GlassKind;
  /** CSS colour of the liquid (hex, rgb() or rgba()). */
  color: string;
  /** 0..1 of the cavity; a sensible default per glass when omitted. */
  fill?: number;
  ice?: Ice;
  garnish?: GarnishKind[];
  /** CSS colour of a foam layer on top (egg white, crema), or null. */
  foam?: string | null;
  condensation?: boolean;
  /** Crop the box to the glass and its garnish instead of the shared 120 x 160 grid box. */
  fit?: boolean;
  className?: string;
  /** Accessible name; the glass is decorative (aria-hidden) without it. */
  title?: string;
}

function parseColor(css: string): { rgb: RGB; a: number } {
  const s = css.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { rgb: [+m[1], +m[2], +m[3]], a };
  }
  return { rgb: [210, 205, 190], a: 1 };
}

const GLASS_EDGE = 'rgba(224,238,255,';

/** Spiral-free helper: a closed strip following the cavity wall (for highlights). */
function wallStrip(g: Geo, y0: number, y1: number, inset0: number, inset1: number, side: 1 | -1): string {
  const pts: [number, number][] = [];
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const y = y0 + ((y1 - y0) * i) / n;
    pts.push([y, g.hwIn(y)]);
  }
  const a = pts.map(([y, w]) => `${f(CX + side * (w - inset0))} ${f(y)}`);
  const b = [...pts].reverse().map(([y, w]) => `${f(CX + side * (w - inset1))} ${f(y)}`);
  return `M${a.join('L')}L${b.join('L')}Z`;
}

function lastWide(g: Geo, min: number): number {
  let y = g.floor;
  while (y > g.rimY && g.hwIn(y) < min) y -= 1;
  return y;
}

function GlassImpl({ kind, color, fill, ice = 'none', garnish = [], foam = null, condensation = false, fit = false, className, title }: GlassProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const g = geoFor(kind);
  const liquid = parseColor(color);
  const rgb = liquid.rgb;
  const fl = Math.min(1, Math.max(0.05, fill ?? g.defaultFill));
  const rim = g.rimY;
  const opaque = g.opaque;

  // liquid surface height (opaque vessels show it just below the rim)
  const yFill = opaque ? rim + g.ryIn * (0.5 + (1 - fl) * 1.6) : g.floor - (g.floor - (rim + 3.2)) * fl;
  const hwS = g.hwIn(yFill);
  const ryS = persp(hwS);
  const depth = g.floor - rim;
  const foamH = foam ? Math.min(10, Math.max(5, depth * 0.13)) : 0;

  const cTop = shade(rgb, 0.1), cMid = shade(rgb, 0), cBot = shade(rgb, -0.26), cHi = shade(rgb, 0.42), cLow = shade(rgb, -0.45);
  const alpha = Math.min(1, Math.max(0.55, liquid.a));
  const foamRgb = foam ? parseColor(foam).rgb : null;

  const kinds = Array.from(new Set(garnish));
  const ctxBase = { uid, g, yFill: foam ? yFill : yFill, ice };
  const sides: (1 | -1)[] = [1, -1];
  const k = Math.min(1.12, Math.max(0.86, g.rimOut / 30));
  const layers: Layers[] = kinds.map((kd, i) => {
    const c: GarnishCtx = { ...ctxBase, side: sides[i % 2], k };
    return drawGarnish(kd, c);
  });
  const gSub = layers.map((l, i) => <g key={i}>{l.sub}</g>);
  const gMid = layers.map((l, i) => <g key={i}>{l.mid}</g>);
  const gOver = layers.map((l, i) => <g key={i}>{l.over}</g>);

  const vbTop = Math.max(0, rim - 38);
  const flatBase = kind === 'rocks' || kind === 'highball';
  const sw = g.rimOut;

  /* ---------- opaque vessel bodies ---------- */
  const bodyArc = `A${f(sw)} ${f(g.ryOut)} 0 0 1 ${f(CX - sw)} ${f(rim)}Z`;
  const bodyPath = g.outerPath.replace(/Z$/, '') + bodyArc;
  const metal: Record<string, [number, string][]> = {
    copper: [[0, '#5f280f'], [0.1, '#97471b'], [0.26, '#dd8f56'], [0.38, '#f6c597'], [0.5, '#d8814a'], [0.74, '#9a4a1d'], [0.92, '#6a2e12'], [1, '#4a1e0a']],
    ceramic: [[0, '#150d09'], [0.14, '#2f1f15'], [0.32, '#6a4a32'], [0.42, '#8a6446'], [0.55, '#4f3523'], [0.82, '#24160e'], [1, '#120a06']],
    metal: [[0, '#555d69'], [0.12, '#8d96a3'], [0.3, '#e6ebf2'], [0.4, '#fafcff'], [0.56, '#b6bfcb'], [0.8, '#79828f'], [1, '#444b56']],
  };
  const stops = metal[g.body];

  const frost: ReactNode[] = [];
  if (g.body === 'metal') {
    for (let i = 0; i < 90; i++) {
      const y = rim + 6 + rnd(i * 2 + 1) * (g.floor - rim - 6);
      const w = g.hwOut(y) - 1.5;
      frost.push(<circle key={i} cx={f(CX + (rnd(i * 2 + 2) * 2 - 1) * w)} cy={f(y)} r={f(0.3 + rnd(i + 99) * 0.7)} fill="#fff" opacity={0.25 + rnd(i + 7) * 0.5} />);
    }
  }
  const hammer: ReactNode[] = [];
  if (g.body === 'copper') {
    for (let i = 0; i < 26; i++) {
      const y = rim + 8 + rnd(i * 3 + 1) * (g.floor - rim - 12);
      const w = g.hwOut(y) - 3;
      const x = CX + (rnd(i * 3 + 2) * 2 - 1) * w;
      const r = 1.6 + rnd(i + 40) * 1.5;
      hammer.push(
        <g key={i}>
          <ellipse cx={f(x)} cy={f(y)} rx={f(r)} ry={f(r * 0.8)} fill="rgba(60,20,5,.16)" />
          <path d={`M${f(x - r * 0.8)} ${f(y - r * 0.1)}Q${f(x - r * 0.4)} ${f(y - r * 0.8)} ${f(x + r * 0.5)} ${f(y - r * 0.75)}`} stroke="rgba(255,225,190,.35)" strokeWidth=".5" fill="none" />
        </g>,
      );
    }
  }
  const tikiFace = g.body === 'ceramic' ? (() => {
    const t = rim + 14;
    return (
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={`M${f(CX - 28.5)} ${f(rim + 7)}Q${f(CX)} ${f(rim + 12)} ${f(CX + 28.5)} ${f(rim + 7)}`} stroke="rgba(255,225,180,.22)" strokeWidth=".9" />
        <path d={`M${f(CX - 29)} ${f(rim + 10)}Q${f(CX)} ${f(rim + 15)} ${f(CX + 29)} ${f(rim + 10)}`} stroke="rgba(0,0,0,.45)" strokeWidth=".9" />
        <path d={`M${f(CX - 17)} ${f(t + 5)}Q${f(CX - 9)} ${f(t + 1)} ${f(CX - 2)} ${f(t + 6)}M${f(CX + 17)} ${f(t + 5)}Q${f(CX + 9)} ${f(t + 1)} ${f(CX + 2)} ${f(t + 6)}`} stroke="rgba(255,225,180,.3)" strokeWidth="1.6" />
        <ellipse cx={f(CX - 9)} cy={f(t + 10)} rx="4.4" ry="3.1" fill="rgba(0,0,0,.5)" stroke="rgba(255,225,180,.25)" strokeWidth=".7" />
        <ellipse cx={f(CX + 9)} cy={f(t + 10)} rx="4.4" ry="3.1" fill="rgba(0,0,0,.5)" stroke="rgba(255,225,180,.25)" strokeWidth=".7" />
        <path d={`M${f(CX)} ${f(t + 9)}L${f(CX - 3.4)} ${f(t + 21)}Q${f(CX)} ${f(t + 23)} ${f(CX + 3.4)} ${f(t + 21)}Z`} fill="rgba(255,225,180,.1)" stroke="rgba(255,225,180,.26)" strokeWidth=".7" />
        <rect x={f(CX - 13)} y={f(t + 28)} width="26" height="9" rx="4.5" fill="rgba(0,0,0,.55)" stroke="rgba(255,225,180,.28)" strokeWidth=".8" />
        <path d={`M${f(CX - 8)} ${f(t + 28.4)}L${f(CX - 8)} ${f(t + 32)}M${f(CX - 2.6)} ${f(t + 28.4)}L${f(CX - 2.6)} ${f(t + 32)}M${f(CX + 2.6)} ${f(t + 28.4)}L${f(CX + 2.6)} ${f(t + 32)}M${f(CX + 8)} ${f(t + 28.4)}L${f(CX + 8)} ${f(t + 32)}`} stroke="rgba(255,225,180,.5)" strokeWidth="1" />
        <path d={`M${f(CX - 29.4)} ${f(g.floor - 14)}Q${f(CX)} ${f(g.floor - 9)} ${f(CX + 29.4)} ${f(g.floor - 14)}`} stroke="rgba(0,0,0,.4)" strokeWidth=".9" />
        <path d={`M${f(CX - 29.2)} ${f(g.floor - 11)}Q${f(CX)} ${f(g.floor - 6)} ${f(CX + 29.2)} ${f(g.floor - 11)}`} stroke="rgba(255,225,180,.18)" strokeWidth=".8" />
      </g>
    );
  })() : null;

  /* ---------- glass details ---------- */
  const yHi1 = rim + 6, yHi2 = Math.min(g.floor - 8, lastWide(g, 8));
  const leftHi = wallStrip(g, yHi1, yHi2, 2.2, 4.6, -1);
  const rightHi = wallStrip(g, rim + 12, Math.max(rim + 14, yHi2 - 10), 3.8, 2.6, 1);

  const beads: ReactNode[] = [];
  if (condensation) {
    const n = Math.round(14 + depth / 8);
    const bot = flatBase || opaque ? g.floor - 6 : Math.min(g.floor - 6, rim + depth * 0.7);
    for (let i = 0; i < n; i++) {
      const y = rim + 9 + rnd(i * 3 + 1) * (bot - rim - 9);
      const w = g.hwOut(y) - 2.6;
      const x = CX + (rnd(i * 3 + 2) * 2 - 1) * w;
      const r = 0.55 + rnd(i * 3 + 3) * rnd(i + 17) * 1.5;
      beads.push(
        <g key={i}>
          {r > 1.1 && <path d={`M${f(x)} ${f(y + r)}L${f(x)} ${f(y + r + 3 + r * 4)}`} stroke="rgba(255,255,255,.14)" strokeWidth={f(r * 0.7)} strokeLinecap="round" />}
          <circle cx={f(x)} cy={f(y)} r={f(r)} fill="rgba(235,245,255,.2)" stroke="rgba(255,255,255,.28)" strokeWidth=".3" />
          <circle cx={f(x - r * 0.3)} cy={f(y - r * 0.35)} r={f(Math.max(0.28, r * 0.3))} fill="rgba(255,255,255,.9)" />
        </g>,
      );
    }
  }

  const foamNodes = foam && foamRgb ? (() => {
    const fTop = shade(foamRgb, 0.12), fLow = shade(foamRgb, -0.14);
    let wave = `M0 ${f(yFill)}H120V${f(yFill + foamH)}`;
    for (let x = 120; x > 0; x -= 10) wave += `Q${x - 5} ${f(yFill + foamH + (x % 20 ? 2.4 : -1.6))} ${x - 10} ${f(yFill + foamH)}`;
    wave += 'Z';
    const bubbles: ReactNode[] = [];
    for (let i = 0; i < 7; i++) {
      const a = rnd(i + 3) * Math.PI * 2, d = Math.sqrt(rnd(i + 11));
      bubbles.push(<circle key={i} cx={f(CX + Math.cos(a) * d * hwS * 0.8)} cy={f(yFill + Math.sin(a) * d * ryS * 0.7)} r={f(0.4 + rnd(i + 30) * 0.5)} fill="rgba(255,255,255,.7)" />);
    }
    return (
      <g>
        <path d={wave} fill={`url(#${uid}-foam)`} />
        <ellipse cx={CX} cy={f(yFill)} rx={f(hwS)} ry={f(ryS)} fill={`url(#${uid}-foamtop)`} />
        <ellipse cx={CX} cy={f(yFill)} rx={f(hwS * 0.96)} ry={f(ryS * 0.9)} fill="none" stroke={fLow} strokeWidth=".5" opacity=".55" />
        {bubbles}
        <path d={`M${f(CX - hwS)} ${f(yFill)}A${f(hwS)} ${f(ryS)} 0 0 0 ${f(CX + hwS)} ${f(yFill)}`} fill="none" stroke={fTop} strokeWidth=".9" />
      </g>
    );
  })() : null;

  return (
    <svg
      viewBox={fit ? `0 ${f(vbTop)} 120 ${f(160 - vbTop)}` : '0 0 120 160'}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      preserveAspectRatio="xMidYMax meet"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`${uid}-cav`}><path d={g.innerPath} /></clipPath>
        <clipPath id={`${uid}-sub`}><rect x="0" y="0" width="120" height={f(rim + 0.5)} /><path d={g.innerPath} /></clipPath>
        <clipPath id={`${uid}-out`}><path d={opaque ? bodyPath : g.outerPath} /></clipPath>
        <linearGradient id={`${uid}-liq`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cTop} /><stop offset=".45" stopColor={cMid} /><stop offset="1" stopColor={cBot} />
        </linearGradient>
        <linearGradient id={`${uid}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".4" /><stop offset=".13" stopColor="#000" stopOpacity=".1" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".14" /><stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset=".82" stopColor="#000" stopOpacity=".14" /><stop offset="1" stopColor="#000" stopOpacity=".42" />
        </linearGradient>
        <radialGradient id={`${uid}-surf`} cx=".4" cy=".35" r=".75">
          <stop offset="0" stopColor={cHi} /><stop offset="1" stopColor={shade(rgb, 0.08)} />
        </radialGradient>
        <linearGradient id={`${uid}-tint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".2" /><stop offset=".2" stopColor="#fff" stopOpacity=".05" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".02" /><stop offset=".86" stopColor="#fff" stopOpacity=".07" />
          <stop offset="1" stopColor="#fff" stopOpacity=".24" />
        </linearGradient>
        <linearGradient id={`${uid}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".35" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".7" stopColor="#fff" stopOpacity=".08" /><stop offset="1" stopColor="#fff" stopOpacity=".42" />
        </linearGradient>
        <linearGradient id={`${uid}-hi`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset=".6" stopColor="#fff" stopOpacity=".3" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-hi2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".4" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {stops && (
          <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
            {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
          </linearGradient>
        )}
        {foamRgb && (
          <>
            <linearGradient id={`${uid}-foam`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={shade(foamRgb, 0.06)} /><stop offset="1" stopColor={shade(foamRgb, -0.16)} />
            </linearGradient>
            <radialGradient id={`${uid}-foamtop`} cx=".4" cy=".35" r=".8">
              <stop offset="0" stopColor={shade(foamRgb, 0.22)} /><stop offset="1" stopColor={shade(foamRgb, 0)} />
            </radialGradient>
          </>
        )}
        {garnishDefs(kinds, uid)}
      </defs>

      {/* stem, foot and handle sit under the bowl */}
      {g.handle && (
        <g>
          <path d={g.handle} stroke={g.body === 'copper' ? '#5a230c' : '#120a06'} strokeWidth="7" strokeLinecap="round" />
          <path d={g.handle} stroke={g.body === 'copper' ? '#c8733a' : '#4a3222'} strokeWidth="5" strokeLinecap="round" />
          <path d={g.handle} stroke={g.body === 'copper' ? '#f2b27c' : '#8a6446'} strokeWidth="1.2" strokeLinecap="round" transform="translate(-.4 -.9)" opacity=".8" />
        </g>
      )}
      {g.stem && g.foot && (() => {
        const { y0, y1, hw0, hw1 } = g.stem!;
        const d = `M${f(CX - hw0)} ${f(y0)}C${f(CX - hw0)} ${f(y0 + (y1 - y0) * 0.5)} ${f(CX - hw0 * 0.8)} ${f(y1 - 7)} ${f(CX - hw1 - 3.5)} ${f(y1 + 0.5)}L${f(CX + hw1 + 3.5)} ${f(y1 + 0.5)}C${f(CX + hw0 * 0.8)} ${f(y1 - 7)} ${f(CX + hw0)} ${f(y0 + (y1 - y0) * 0.5)} ${f(CX + hw0)} ${f(y0)}Z`;
        const fy = g.foot!.y, fx = g.foot!.rx, fry = Math.max(2.6, fx * 0.15);
        const mt = !!stops;
        return (
          <g>
            <path d={d} fill={mt ? `url(#${uid}-body)` : `url(#${uid}-stem)`} stroke={mt ? 'none' : `${GLASS_EDGE}.55)`} strokeWidth=".9" />
            <ellipse cx={CX} cy={f(fy + 0.7)} rx={fx} ry={f(fry)} fill={mt ? `url(#${uid}-body)` : `url(#${uid}-stem)`} stroke={mt ? 'rgba(0,0,0,.35)' : `${GLASS_EDGE}.6)`} strokeWidth=".9" />
            <ellipse cx={CX} cy={f(fy - 0.5)} rx={f(fx * 0.9)} ry={f(fry * 0.8)} fill={mt ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.1)'} stroke={mt ? 'none' : `${GLASS_EDGE}.38)`} strokeWidth=".6" />
            <path d={`M${f(CX - fx * 0.7)} ${f(fy + 0.8)}A${f(fx * 0.7)} ${f(fry * 0.7)} 0 0 0 ${f(CX - fx * 0.2)} ${f(fy + fry * 0.7)}`} stroke="rgba(255,255,255,.55)" strokeWidth=".8" strokeLinecap="round" />
          </g>
        );
      })()}

      {/* back of the rim */}
      <ellipse cx={CX} cy={rim} rx={f(sw)} ry={f(g.ryOut)} fill={opaque ? '#0a0605' : 'rgba(255,255,255,.05)'}
        stroke={opaque ? 'none' : `${GLASS_EDGE}.3)`} strokeWidth=".8" />

      {opaque ? (
        <>
          <ellipse cx={CX} cy={rim + 0.4} rx={f(g.rimIn)} ry={f(g.ryIn)} fill={g.body === 'copper' ? '#3a170a' : g.body === 'ceramic' ? '#120a06' : '#2b323c'} />
          {/* liquid surface seen through the opening */}
          <g clipPath={`url(#${uid}-cav)`}>
            <ellipse cx={CX} cy={f(yFill)} rx={f(hwS * 0.98)} ry={f(ryS)} fill={`url(#${uid}-surf)`} />
            {foamNodes}
          </g>
          {iceNodes(g, ice, yFill)}
          {gSub}
          <path d={bodyPath} fill={`url(#${uid}-body)`} />
          <g clipPath={`url(#${uid}-out)`}>
            {frost}{hammer}{tikiFace}
            {g.body === 'metal' && <rect x="0" y={rim} width="120" height={f(g.floor - rim)} fill="rgba(255,255,255,.1)" />}
            <path d={wallStrip(g, rim + 4, g.floor - 10, 2, 6.5, -1)} fill={`url(#${uid}-hi)`} opacity={g.body === 'ceramic' ? 0.35 : 0.7} />
            <path d={wallStrip(g, rim + 10, g.floor - 20, 4.2, 2.6, 1)} fill={`url(#${uid}-hi2)`} opacity=".55" />
            {beads}
          </g>
          <path d={`M${f(CX - sw)} ${f(rim)}A${f(sw)} ${f(g.ryOut)} 0 0 0 ${f(CX + sw)} ${f(rim)}`} stroke={g.body === 'copper' ? '#f6c08a' : g.body === 'ceramic' ? '#a47a54' : '#fafcff'} strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${f(CX - g.rimIn)} ${f(rim)}A${f(g.rimIn)} ${f(g.ryIn)} 0 0 0 ${f(CX + g.rimIn)} ${f(rim)}`} stroke="rgba(0,0,0,.35)" strokeWidth=".6" />
          {gMid}
        </>
      ) : (
        <>
          <path d={g.outerPath} fill={`url(#${uid}-tint)`} />
          <g clipPath={`url(#${uid}-cav)`}>
            <g opacity={alpha}>
              <rect x="0" y={f(yFill)} width="120" height={f(160 - yFill)} fill={`url(#${uid}-liq)`} />
              <rect x="0" y={f(yFill)} width="120" height={f(160 - yFill)} fill={`url(#${uid}-side)`} />
            </g>
            {/* base lens: thick glass magnifies the colour at the bottom */}
            <ellipse cx={CX} cy={f(g.floor - 1.5)} rx={f(g.hwIn(g.floor - 2) * 0.82)} ry={flatBase ? 3 : 2.4} fill={cHi} opacity=".3" />
            {!foam && (
              <g>
                <ellipse cx={CX} cy={f(yFill)} rx={f(hwS)} ry={f(ryS)} fill={`url(#${uid}-surf)`} opacity={alpha} />
                <ellipse cx={CX} cy={f(yFill)} rx={f(hwS * 0.94)} ry={f(ryS * 0.82)} fill="none" stroke={cLow} strokeWidth=".5" opacity=".35" />
                <path d={`M${f(CX - hwS)} ${f(yFill)}A${f(hwS)} ${f(ryS)} 0 0 0 ${f(CX + hwS)} ${f(yFill)}`} stroke={cHi} strokeWidth="1.1" strokeLinecap="round" />
                <path d={`M${f(CX - hwS + 1)} ${f(yFill + 1.4)}A${f(hwS - 1)} ${f(ryS)} 0 0 0 ${f(CX + hwS - 1)} ${f(yFill + 1.4)}`} stroke={cLow} strokeWidth=".7" opacity=".45" />
              </g>
            )}
            {iceNodes(g, ice, yFill)}
          </g>
          <g clipPath={`url(#${uid}-sub)`}>{gSub}</g>
          <g clipPath={`url(#${uid}-cav)`}>
            {/* what is under the surface is seen through the drink */}
            <rect x="0" y={f(yFill + ryS * 0.6)} width="120" height={f(160 - yFill)} fill={cMid} opacity=".32" />
            {foamNodes}
          </g>
          {flatBase && (
            <g clipPath={`url(#${uid}-out)`}>
              <rect x="0" y={f(g.floor + 2)} width="120" height="20" fill="rgba(255,255,255,.1)" />
              <path d={`M${f(CX - g.hwIn(g.floor))} ${f(g.floor)}A${f(g.hwIn(g.floor))} ${f(persp(g.hwIn(g.floor)))} 0 0 0 ${f(CX + g.hwIn(g.floor))} ${f(g.floor)}`} stroke="rgba(255,255,255,.45)" strokeWidth=".8" />
            </g>
          )}
          {gMid}
          {/* glass edges, thickness and refraction highlights */}
          <path d={g.outerPath} stroke={`${GLASS_EDGE}.5)`} strokeWidth="1.1" strokeLinejoin="round" />
          <path d={g.innerStroke} stroke={`${GLASS_EDGE}.2)`} strokeWidth=".6" />
          <path d={leftHi} fill={`url(#${uid}-hi)`} />
          <path d={rightHi} fill={`url(#${uid}-hi2)`} />
          <g clipPath={`url(#${uid}-out)`}>{beads}</g>
          <path d={`M${f(CX - sw)} ${f(rim)}A${f(sw)} ${f(g.ryOut)} 0 0 0 ${f(CX + sw)} ${f(rim)}`} stroke={`${GLASS_EDGE}.85)`} strokeWidth="1.4" strokeLinecap="round" />
          <path d={`M${f(CX - g.rimIn)} ${f(rim)}A${f(g.rimIn)} ${f(g.ryIn)} 0 0 0 ${f(CX + g.rimIn)} ${f(rim)}`} stroke={`${GLASS_EDGE}.35)`} strokeWidth=".6" />
        </>
      )}
      {gOver}
    </svg>
  );
}

export const Glass = memo(GlassImpl);
