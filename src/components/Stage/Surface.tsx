/* The brew surface: the only animated SVG. It is small (just the opening), has no filters and
   no blend modes, and the whole liquid group slides down with the fill level (a transform).
   Colours are live brew variables. Geometry is seeded, never random. */
import { memo } from 'react';
import { ING_BY_ID } from '../../data/ingredients';
import { MOUTH, f, rng } from './geometry';
import type { Floater } from './fill';

const VIEW = { x: 136, y: 134, w: 448, h: 114 };
const SQUASH = MOUTH.ry / MOUTH.rx;
const SURF = { cx: MOUTH.cx, cy: MOUTH.cy, rx: MOUTH.rx - 1, ry: MOUTH.ry - 1 };

interface Arc { d: string; w: number; o: number; tone: 'hi' | 'white' | 'deep' }

/** One partial arc of a circle (centre offset so arcs never share a centre). */
function arc(cx: number, cy: number, r: number, from: number, sweep: number): string {
  const a0 = (from * Math.PI) / 180;
  const a1 = ((from + sweep) * Math.PI) / 180;
  const p = (a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  return `M${p(a0)}A${f(r)} ${f(r)} 0 ${sweep > 180 ? 1 : 0} 1 ${p(a1)}`;
}

/** Irregular, displaced flow: varied radii, centres, sweeps, widths and opacities. */
function flow(seed: number, n: number, drift: number): Arc[] {
  const r = rng(seed);
  const out: Arc[] = [];
  for (let i = 0; i < n; i++) {
    const radius = 34 + r() * 150;
    const thick = r() > 0.72;
    const pick = r();
    out.push({
      d: arc((r() - 0.5) * drift, (r() - 0.5) * drift, radius, r() * 360, 38 + r() * 118),
      w: thick ? 8 + r() * 12 : 1.1 + r() * 3,
      o: thick ? 0.14 + r() * 0.16 : 0.22 + r() * 0.36,
      tone: thick ? (pick > 0.5 ? 'deep' : 'hi') : pick > 0.62 ? 'white' : pick > 0.3 ? 'hi' : 'deep',
    });
  }
  return out;
}

const FLOW_A = flow(5, 10, 46);
const FLOW_B = flow(41, 9, 62);
const TONE = { hi: 'var(--brew-hi)', white: '#fff', deep: 'var(--brew-deep)' } as const;

const BUBBLES = [
  { x: 262, y: 6, r: 8.5, dur: 3.9, delay: -0.4 },
  { x: 330, y: 17, r: 5.5, dur: 3.1, delay: -1.7 },
  { x: 452, y: 1, r: 9.5, dur: 4.7, delay: -2.6 },
  { x: 398, y: 20, r: 4.5, dur: 3.5, delay: -0.9 },
];

/** Where each floating garnish sits on the surface (offsets from the surface centre). */
const SLOTS: [number, number][] = [[84, 8], [-82, -6], [-6, 24], [34, -20]];

function Orange({ color, rind }: { color: string; rind: string }) {
  const segs = Array.from({ length: 9 }, (_, i) => (i / 9) * Math.PI * 2 + 0.2);
  return (
    <g>
      <ellipse cx="0" cy="4" rx="38" ry="12" fill="#000" opacity=".4" />
      <ellipse rx="37" ry="14.5" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.2" transform="translate(0 1)" />
      <ellipse rx="34" ry="14" fill={rind} />
      <ellipse rx="31" ry="12.4" fill="#f4dfae" />
      <ellipse rx="28" ry="11" fill={color} />
      <ellipse rx="19" ry="7.6" fill="#ffd27a" opacity=".42" />
      {segs.map((a, i) => (
        <path key={i} d={`M0 0L${f(Math.cos(a) * 27.5)} ${f(Math.sin(a) * 10.8)}`} stroke="#f4dfae" strokeOpacity=".8" strokeWidth="1.1" />
      ))}
      <ellipse rx="2.6" ry="1.2" fill="#f4dfae" opacity=".9" />
      <ellipse cx="-11" cy="-4.6" rx="8" ry="1.9" fill="#fff" opacity=".32" />
    </g>
  );
}

function Cherry({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="2" cy="5" rx="12" ry="3.6" fill="#000" opacity=".45" />
      <path d="M2-5C6-14 14-18 20-16" fill="none" stroke="#5a4a2e" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="0" cy="-0.5" rx="10.6" ry="8.6" fill={color} />
      <ellipse cx="0" cy="-0.5" rx="10.6" ry="8.6" fill="url(#stg-s-cherry)" />
      <ellipse cx="-3.6" cy="-4.2" rx="3.6" ry="1.9" fill="#fff" opacity=".7" />
      <ellipse cx="3.4" cy="3.2" rx="5" ry="2" fill="#fff" opacity=".1" />
    </g>
  );
}

function Olive({ color }: { color: string }) {
  return (
    <g>
      <ellipse cx="2" cy="5.5" rx="17" ry="4" fill="#000" opacity=".4" />
      <path d="M-34-9L30 6" stroke="#b9bcc6" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="-34" cy="-9" r="2.4" fill="#d6d9e2" />
      <ellipse cx="0" cy="-1" rx="14" ry="8.6" fill={color} />
      <ellipse cx="0" cy="-1" rx="14" ry="8.6" fill="url(#stg-s-olive)" />
      <ellipse cx="9" cy="-0.6" rx="3.6" ry="2.6" fill="#c9302c" />
      <ellipse cx="9.8" cy="-1.1" rx="1.6" ry="1" fill="#f0766a" opacity=".8" />
      <ellipse cx="-5" cy="-5" rx="5" ry="1.6" fill="#fff" opacity=".4" />
    </g>
  );
}

function Mint({ color }: { color: string }) {
  const leaf = (rot: number, s: number, key: string) => (
    <g key={key} transform={`rotate(${rot}) scale(${s})`}>
      <path d="M0 0C6-13 26-14 36-1C26 12 6 10 0 0Z" fill="url(#stg-s-leaf)" />
      <path d="M2 0C12-1 24-1 33-1" stroke="#d6f5cc" strokeOpacity=".55" strokeWidth="1" fill="none" />
      <path d="M12-0.6L20-6M12-0.4L20 4.5M22-0.9L29-4.6M22-0.6L29 2.5" stroke="#d6f5cc" strokeOpacity=".3" strokeWidth=".8" />
    </g>
  );
  return (
    <g transform="scale(1.12 .64)">
      <ellipse cx="6" cy="9" rx="36" ry="10" fill="#000" opacity=".4" />
      <path d="M-6 0C-14 2-20 8-26 8" stroke="#3f7a47" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {leaf(-148, 0.8, 'a')}
      {leaf(-20, 1, 'b')}
      {leaf(32, 0.86, 'c')}
      {leaf(150, 0.7, 'd')}
      <circle r="2.4" fill={color} opacity=".9" />
    </g>
  );
}

function Cucumber() {
  const seeds = Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2);
  return (
    <g>
      <ellipse cx="0" cy="4" rx="26" ry="9" fill="#000" opacity=".4" />
      <ellipse rx="25" ry="10" fill="none" stroke="#fff" strokeOpacity=".26" strokeWidth="1.1" transform="translate(0 1)" />
      <ellipse rx="23" ry="9.6" fill="#4f8a3e" />
      <ellipse rx="21" ry="8.6" fill="#cfe6a8" />
      <ellipse rx="15" ry="6" fill="#e6f2c9" />
      {seeds.map((a, i) => (
        <ellipse key={i} cx={f(Math.cos(a) * 9)} cy={f(Math.sin(a) * 3.6)} rx="2.2" ry="1" fill="#a9cd7a" opacity=".85" />
      ))}
      <ellipse cx="-8" cy="-4" rx="7" ry="1.6" fill="#fff" opacity=".35" />
    </g>
  );
}

function Garnish({ kind }: { kind: Floater }) {
  const ing = ING_BY_ID[kind];
  switch (kind) {
    case 'orange_slice': return <Orange color={ing?.color ?? '#f6971f'} rind={ing?.rind ?? '#c96a10'} />;
    case 'cherry': return <Cherry color={ing?.color ?? '#b01a34'} />;
    case 'olive': return <Olive color={ing?.color ?? '#7d8a2e'} />;
    case 'mint': return <Mint color={ing?.color ?? '#6fbf73'} />;
    case 'cucumber': return <Cucumber />;
  }
}

export const Surface = memo(function Surface({ floaters }: { floaters: Floater[] }) {
  return (
    <svg
      className="stg-svg stg-surface"
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="stg-s-mouth"><ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx} ry={MOUTH.ry} /></clipPath>
        <radialGradient id="stg-s-surface" cx=".48" cy=".4" r=".62">
          <stop offset="0" style={{ stopColor: 'var(--brew-hi)' }} />
          <stop offset=".46" style={{ stopColor: 'var(--brew)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brew-deep)' }} />
        </radialGradient>
        <radialGradient id="stg-s-vortex" cx=".5" cy=".5" r=".5">
          <stop offset="0" style={{ stopColor: 'var(--brew-deep)', stopOpacity: 0.7 }} />
          <stop offset="1" style={{ stopColor: 'var(--brew-deep)', stopOpacity: 0 }} />
        </radialGradient>
        <radialGradient id="stg-s-sheen" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset=".6" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="stg-s-lipshade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".5" />
          <stop offset=".45" stopColor="#000" stopOpacity="0" />
          <stop offset=".7" stopColor="#000" stopOpacity=".1" />
          <stop offset="1" stopColor="#000" stopOpacity=".7" />
        </linearGradient>
        <radialGradient id="stg-s-cherry" cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".16" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1a0006" stopOpacity=".55" />
        </radialGradient>
        <radialGradient id="stg-s-olive" cx=".36" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#101400" stopOpacity=".5" />
        </radialGradient>
        <linearGradient id="stg-s-leaf" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2f6b3a" />
          <stop offset=".55" stopColor="#6fbf73" />
          <stop offset="1" stopColor="#9bdc92" />
        </linearGradient>
      </defs>

      <g clipPath="url(#stg-s-mouth)">
        {/* empty pot: a faint emerald shimmer ring on the dark interior is drawn in HTML; here only the liquid */}
        <g className="stg-liquid">
          {/* the back wall, lit by the brew just above the meniscus (stacked strokes fake the falloff) */}
          {[10, 20, 32, 46].map((w) => (
            <ellipse key={w} cx={SURF.cx} cy={SURF.cy} rx={SURF.rx} ry={SURF.ry} fill="none" strokeWidth={w}
              style={{ stroke: 'var(--brew)' }} strokeOpacity=".2" />
          ))}
          <ellipse cx={SURF.cx} cy={SURF.cy} rx={SURF.rx} ry={SURF.ry} fill="url(#stg-s-surface)" />

          {/* the flow: displaced partial arcs inside a perspective-squashed frame */}
          <g transform={`translate(${SURF.cx} ${SURF.cy}) scale(1 ${f(SQUASH, 4)})`}>
            <ellipse cx="30" cy="-8" rx="92" ry="92" fill="url(#stg-s-vortex)" />
            <g className="stg-flow stg-flow--a">
              {FLOW_A.map((a, i) => (
                <path key={i} d={a.d} fill="none" strokeLinecap="round" strokeWidth={f(a.w, 1)} opacity={f(a.o, 2)}
                  style={{ stroke: TONE[a.tone] }} />
              ))}
            </g>
            <g className="stg-flow stg-flow--b">
              {FLOW_B.map((a, i) => (
                <path key={i} d={a.d} fill="none" strokeLinecap="round" strokeWidth={f(a.w, 1)} opacity={f(a.o, 2)}
                  style={{ stroke: TONE[a.tone] }} />
              ))}
            </g>
          </g>

          {/* reflection of the room's light, a long low sheen */}
          <ellipse cx="318" cy={SURF.cy - 14} rx="104" ry="16" fill="url(#stg-s-sheen)" />
          <path d="M214 198Q252 176 326 174" stroke="#fff" strokeOpacity=".3" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M236 208Q262 198 296 196" stroke="#fff" strokeOpacity=".22" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {floaters.length > 0 && (
            <g className="stg-garnish">
              {floaters.slice(0, SLOTS.length).map((k, i) => (
                <g key={k} className="stg-garnish-item" transform={`translate(${SURF.cx + SLOTS[i][0]} ${SURF.cy + SLOTS[i][1]})`}>
                  <g className="stg-garnish-pop"><Garnish kind={k} /></g>
                </g>
              ))}
            </g>
          )}

          {BUBBLES.map((b, i) => (
            <g key={i} className="stg-bubble" style={{ animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
              <ellipse cx={b.x} cy={SURF.cy + b.y} rx={b.r} ry={f(b.r * 0.42, 1)} fill="#fff" fillOpacity=".1" stroke="#fff" strokeOpacity=".62" strokeWidth="1.2" />
              <ellipse cx={f(b.x - b.r * 0.32)} cy={f(SURF.cy + b.y - b.r * 0.16)} rx={f(b.r * 0.28, 1)} ry={f(b.r * 0.1, 1)} fill="#fff" opacity=".85" />
            </g>
          ))}

          {/* meniscus: the bright line where the brew meets the iron */}
          <ellipse cx={SURF.cx} cy={SURF.cy} rx={SURF.rx} ry={SURF.ry} fill="none" strokeWidth="2.4" style={{ stroke: 'var(--brew-hi)' }} />
          <ellipse cx={SURF.cx} cy={SURF.cy + 1.4} rx={SURF.rx - 1} ry={SURF.ry - 0.6} fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".8" />
        </g>

        {/* the lip's shadow falls on the brew's near and far edges */}
        <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx - 5} ry={MOUTH.ry - 4} fill="none" stroke="url(#stg-s-lipshade)" strokeWidth="10" />
      </g>
      <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx} ry={MOUTH.ry} fill="none" stroke="#000" strokeOpacity=".6" strokeWidth="1.4" />
    </svg>
  );
});
