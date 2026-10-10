/* The static iron: one SVG, no animation, no filters, no brew variables. Everything that
   catches the brew's light is painted by <Light/> above it, so this layer is rasterised once.
   Hammered grain comes from small patterns (never feTurbulence). */
import { memo } from 'react';
import {
  BODY_PATH, FEET, FLOOR_Y, HANDLE_PATH, HOOP, HOOP_PATH, LEG_PATHS, MOUTH, RIM, RIM_PATH,
  VB_H, VB_W, f, rng,
} from './geometry';

interface Dimple { x: number; y: number; rx: number; ry: number; rot: number }

/** A jittered grid of shallow pits, so coverage is even (no clumps) and no tile edge cuts one. */
function dimples(seed: number, grid: number, tile: number, rMin: number, rMax: number): Dimple[] {
  const r = rng(seed);
  const cell = tile / grid;
  const out: Dimple[] = [];
  for (let gy = 0; gy < grid; gy++) {
    for (let gx = 0; gx < grid; gx++) {
      const rx = rMin + r() * (rMax - rMin);
      const ry = rx * (0.6 + r() * 0.35);
      const pad = rMax * 1.35 + 0.5;
      const x = Math.min(tile - pad, Math.max(pad, (gx + 0.5 + (r() - 0.5) * 0.7) * cell));
      const y = Math.min(tile - pad, Math.max(pad, (gy + 0.5 + (r() - 0.5) * 0.7) * cell));
      out.push({ x, y, rx, ry, rot: r() * 180 });
    }
  }
  return out;
}

const DIMPLES_A = dimples(11, 6, 72, 1.8, 3.4);
const DIMPLES_B = dimples(29, 7, 109, 1.1, 2.2);

/** Fine casting speckle. */
const SPECKS = (() => {
  const r = rng(7);
  return Array.from({ length: 34 }, () => ({ x: 1 + r() * 46, y: 1 + r() * 46, r: 0.4 + r() * 0.7, light: r() > 0.55 }));
})();

/** Rivets along the hoop, bigger toward the front, skipping the nameplate. */
const STUDS = (() => {
  const out: { x: number; y: number; r: number }[] = [];
  const n = 19;
  for (let i = 1; i < n; i++) {
    const t = (Math.PI * i) / n;
    const x = HOOP.cx - HOOP.rx * Math.cos(t);
    const y = HOOP.cy + HOOP.ry * Math.sin(t);
    if (Math.abs(x - 360) < 62) continue;
    out.push({ x: f(x), y: f(y), r: f(2 + 2.6 * Math.sin(t), 2) });
  }
  return out;
})();

const HANDLE_MIRROR = `translate(${VB_W} 0) scale(-1 1)`;

function Handle({ mirror }: { mirror?: boolean }) {
  return (
    <g transform={mirror ? HANDLE_MIRROR : undefined}>
      <path d={HANDLE_PATH} stroke="#030304" strokeWidth="17" strokeLinecap="round" fill="none" opacity=".65" transform="translate(2 5)" />
      <path d={HANDLE_PATH} stroke="#08090b" strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d={HANDLE_PATH} stroke="url(#stg-handle)" strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d={HANDLE_PATH} stroke="url(#stg-handle-hi)" strokeWidth="3.4" strokeLinecap="round" fill="none" transform="translate(1.2 -1.6)" />
    </g>
  );
}

export const Iron = memo(function Iron() {
  return (
    <svg className="stg-svg stg-iron" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="stg-iron-body" x1="0" x2="1">
          <stop offset="0" stopColor="#08090b" />
          <stop offset=".14" stopColor="#14151a" />
          <stop offset=".34" stopColor="#22242a" />
          <stop offset=".52" stopColor="#191a1f" />
          <stop offset=".8" stopColor="#0d0e11" />
          <stop offset="1" stopColor="#060709" />
        </linearGradient>
        <linearGradient id="stg-iron-edge" x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".7" />
          <stop offset=".1" stopColor="#000" stopOpacity="0" />
          <stop offset=".9" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".7" />
        </linearGradient>
        <linearGradient id="stg-iron-fall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".1" />
          <stop offset=".45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="stg-neck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".85" />
          <stop offset=".35" stopColor="#000" stopOpacity=".4" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="stg-leg" x1="0" x2="1">
          <stop offset="0" stopColor="#0a0a0d" />
          <stop offset=".4" stopColor="#25272d" />
          <stop offset=".72" stopColor="#15161a" />
          <stop offset="1" stopColor="#08090b" />
        </linearGradient>
        <linearGradient id="stg-leg-fall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".6" />
          <stop offset=".5" stopColor="#000" stopOpacity=".05" />
          <stop offset="1" stopColor="#000" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="stg-band" x1="0" x2="1">
          <stop offset="0" stopColor="#0d0e11" />
          <stop offset=".22" stopColor="#2a2c33" />
          <stop offset=".48" stopColor="#3b3d45" />
          <stop offset=".7" stopColor="#202228" />
          <stop offset="1" stopColor="#0a0b0d" />
        </linearGradient>
        <linearGradient id="stg-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3532" />
          <stop offset=".5" stopColor="#272320" />
          <stop offset="1" stopColor="#14110f" />
        </linearGradient>
        <linearGradient id="stg-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#020304" />
          <stop offset="1" stopColor="#0a0c10" />
        </linearGradient>
        <linearGradient id="stg-handle" gradientUnits="userSpaceOnUse" x1="40" y1="240" x2="130" y2="354">
          <stop offset="0" stopColor="#101115" />
          <stop offset=".35" stopColor="#24262c" />
          <stop offset=".7" stopColor="#15161a" />
          <stop offset="1" stopColor="#0a0b0d" />
        </linearGradient>
        <linearGradient id="stg-handle-hi" gradientUnits="userSpaceOnUse" x1="40" y1="240" x2="130" y2="354">
          <stop offset="0" stopColor="#8d909a" stopOpacity="0" />
          <stop offset=".2" stopColor="#8d909a" stopOpacity=".34" />
          <stop offset=".55" stopColor="#8d909a" stopOpacity=".1" />
          <stop offset="1" stopColor="#8d909a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="stg-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b2d34" />
          <stop offset="1" stopColor="#14151a" />
        </linearGradient>
        <radialGradient id="stg-shadow">
          <stop offset="0" stopColor="#000" stopOpacity=".78" />
          <stop offset=".55" stopColor="#000" stopOpacity=".4" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="stg-pit">
          <stop offset="0" stopColor="#000" stopOpacity=".34" />
          <stop offset=".6" stopColor="#000" stopOpacity=".14" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="stg-glimmer">
          <stop offset="0" stopColor="#9a9da8" stopOpacity=".12" />
          <stop offset="1" stopColor="#9a9da8" stopOpacity="0" />
        </radialGradient>

        <pattern id="stg-hammer-a" width="72" height="72" patternUnits="userSpaceOnUse">
          {DIMPLES_A.map((d, i) => (
            <g key={i} transform={`translate(${f(d.x)} ${f(d.y)}) rotate(${f(d.rot)})`}>
              <ellipse rx={f(d.rx * 1.35, 2)} ry={f(d.ry * 1.35, 2)} fill="url(#stg-pit)" />
            </g>
          ))}
        </pattern>
        <pattern id="stg-hammer-b" width="109" height="109" patternUnits="userSpaceOnUse" patternTransform="rotate(23)">
          {DIMPLES_B.map((d, i) => (
            <g key={i} transform={`translate(${f(d.x)} ${f(d.y)}) rotate(${f(d.rot)})`}>
              <ellipse rx={f(d.rx * 1.35, 2)} ry={f(d.ry * 1.35, 2)} fill="url(#stg-pit)" />
            </g>
          ))}
        </pattern>
        <pattern id="stg-speck" width="48" height="48" patternUnits="userSpaceOnUse">
          {SPECKS.map((s, i) => (
            <circle key={i} cx={f(s.x)} cy={f(s.y)} r={f(s.r, 2)} fill={s.light ? '#d9cbb8' : '#000'} opacity={s.light ? 0.08 : 0.3} />
          ))}
        </pattern>

        <clipPath id="stg-body-clip"><path d={BODY_PATH} /></clipPath>
        <mask id="stg-moon-mask">
          <circle r="17" fill="#fff" />
          <circle cx="7.5" cy="-5.5" r="14" fill="#000" />
        </mask>
      </defs>

      {/* floor: one broad contact shadow under the pot and one under each foot */}
      <ellipse cx="360" cy={FLOOR_Y + 2} rx="300" ry="24" fill="url(#stg-shadow)" opacity=".8" />
      {FEET.map(([x, y], k) => (
        <ellipse key={k} cx={x} cy={y + 1} rx={k === 2 ? 60 : 56} ry="10" fill="url(#stg-shadow)" />
      ))}

      {/* legs: cast, tapered, with a flared foot */}
      {LEG_PATHS.map((d, i) => (
        <g key={i}>
          <path d={d} fill="url(#stg-leg)" />
          <path d={d} fill="url(#stg-leg-fall)" />
          <path d={d} fill="url(#stg-hammer-b)" opacity=".7" />
          <path d={d} fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1" />
        </g>
      ))}
      {/* foot rims */}
      {FEET.map(([x], k) => (
        <path key={k} d={`M${x - 35} 549Q${x - 29} 555 ${x - 20} 553L${x + 20} 553Q${x + 29} 555 ${x + 35} 549`} fill="none" stroke="#7d808b" strokeOpacity=".15" strokeWidth="1.2" />
      ))}

      {/* handles sit behind the belly */}
      <Handle />
      <Handle mirror />

      {/* the bowl */}
      <path d={BODY_PATH} fill="url(#stg-iron-body)" />
      <g clipPath="url(#stg-body-clip)">
        <rect x="80" y="180" width="560" height="350" fill="url(#stg-hammer-a)" />
        <rect x="80" y="180" width="560" height="350" fill="url(#stg-hammer-b)" />
        <rect x="80" y="180" width="560" height="350" fill="url(#stg-speck)" opacity=".8" />
        <rect x="80" y="180" width="560" height="350" fill="url(#stg-iron-edge)" />
        <rect x="80" y="180" width="560" height="350" fill="url(#stg-iron-fall)" />
        {/* a soft, warm-grey sheen on the left belly: broad and low, never a white smear */}
        <ellipse cx="206" cy="372" rx="96" ry="124" fill="url(#stg-glimmer)" />
        {/* the shadow the rolled lip throws down the neck */}
        <rect x="80" y="190" width="560" height="120" fill="url(#stg-neck)" />

        {/* the raised hoop, wrapped around the belly */}
        <path d={HOOP_PATH} stroke="#000" strokeOpacity=".5" strokeWidth="19" fill="none" transform="translate(0 6)" />
        <path d={HOOP_PATH} stroke="url(#stg-band)" strokeWidth="14" fill="none" />
        <path d={HOOP_PATH} stroke="#e9d8c4" strokeOpacity=".12" strokeWidth="1" fill="none" transform="translate(0 -5.5)" />
        <path d={HOOP_PATH} stroke="#000" strokeOpacity=".55" strokeWidth="1" fill="none" transform="translate(0 6.5)" />
        {STUDS.map((s, i) => (
          <g key={i}>
            <circle cx={s.x} cy={s.y + 1.6} r={s.r} fill="#000" opacity=".55" />
            <circle cx={s.x} cy={s.y} r={s.r} fill="#3d3f47" />
            <circle cx={f(s.x - s.r * 0.3)} cy={f(s.y - s.r * 0.35)} r={f(s.r * 0.42, 2)} fill="#d8d0c6" opacity=".4" />
          </g>
        ))}

        {/* the cast nameplate */}
        <g transform={`translate(360 ${HOOP.cy + HOOP.ry})`}>
          <rect x="-53" y="-8" width="106" height="28" rx="6" fill="#000" opacity=".5" transform="translate(0 2.5)" />
          <rect x="-53" y="-12" width="106" height="26" rx="6" fill="url(#stg-plate)" />
          <rect x="-53" y="-12" width="106" height="26" rx="6" fill="none" stroke="#e9d8c4" strokeOpacity=".13" strokeWidth="1" />
          <rect x="-48" y="-7.5" width="96" height="17" rx="3.5" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1" />
          <circle cx="-42" cy="1" r="1.5" fill="#000" opacity=".6" />
          <circle cx="42" cy="1" r="1.5" fill="#000" opacity=".6" />
          <text x="0" y="6.2" textAnchor="middle" fontFamily="var(--font-serif)" fontWeight="600" fontSize="14.5" letterSpacing="4.6" fill="#000" opacity=".7" transform="translate(0 1.1)">STEWY</text>
          <text x="0" y="6.2" textAnchor="middle" fontFamily="var(--font-serif)" fontWeight="600" fontSize="14.5" letterSpacing="4.6" fill="#575a65">STEWY</text>
        </g>

        {/* the engraved moon and star: a shadowed groove with a bright lower lip */}
        <g transform="translate(360 436)">
          <g transform="translate(0 1.4)" opacity=".7"><circle r="17" fill="#d8cbb8" mask="url(#stg-moon-mask)" opacity=".28" /></g>
          <circle r="17" fill="#000" mask="url(#stg-moon-mask)" opacity=".62" transform="translate(-.6 -.6)" />
          <path transform="translate(30 -15)" d="M0-8 2.4-2.4 8 0 2.4 2.4 0 8-2.4 2.4-8 0-2.4-2.4Z" fill="#000" opacity=".6" />
          <path transform="translate(30 -14)" d="M0-8 2.4-2.4 8 0 2.4 2.4 0 8-2.4 2.4-8 0-2.4-2.4Z" fill="#d8cbb8" opacity=".16" />
          <circle cx="-31" cy="9" r="1.9" fill="#000" opacity=".6" />
          <circle cx="-31" cy="10" r="1.9" fill="#d8cbb8" opacity=".12" />
          <circle cx="38" cy="16" r="1.4" fill="#000" opacity=".6" />
          <circle cx="10" cy="-26" r="1.2" fill="#000" opacity=".5" />
        </g>
      </g>

      {/* the opening: dark inner wall, then the rolled lip around it */}
      <ellipse cx={MOUTH.cx} cy={MOUTH.cy} rx={MOUTH.rx} ry={MOUTH.ry} fill="url(#stg-wall)" />
      <path fillRule="evenodd" d={RIM_PATH} fill="url(#stg-lip)" />
      <path fillRule="evenodd" d={RIM_PATH} fill="url(#stg-hammer-b)" opacity=".5" />
      <ellipse cx={RIM.cx} cy={RIM.cy} rx={RIM.rx - 0.6} ry={RIM.ry - 0.6} fill="none" stroke="#000" strokeOpacity=".6" strokeWidth="1.2" />
      <ellipse cx={RIM.cx} cy={RIM.cy} rx="220" ry="60" fill="none" stroke="#f0dcc4" strokeOpacity=".1" strokeWidth="1.6" />
    </svg>
  );
});
