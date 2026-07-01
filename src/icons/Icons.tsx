/* Parametric SVG icon system — crisp flat icons generated per-ingredient,
   plus the brand mark and the rotating summoning circle. */
import { useId } from 'react';
import type { Ingredient } from '../data/types';
import { shade } from '../lib/color';

const GLASS_FILL = 'rgba(255,255,255,0.10)';
const GLASS_STROKE = 'rgba(255,255,255,0.42)';

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
    {children}
  </svg>
);

const BOTTLE_PATH =
  'M20 5 L20 12 Q16 13 16 18 L16 39 Q16 42 19 42 L29 42 Q32 42 32 39 L32 18 Q32 13 28 12 L28 5 Z';

function BottleIcon({ liquid, cap, label }: { liquid: string; cap?: string; label?: string }) {
  const cid = useId();
  const capC = cap ?? '#41372b';
  const labelC = label ?? 'rgba(244,239,225,0.92)';
  const dark = shade(liquid, -0.28);
  return (
    <Svg>
      <defs><clipPath id={cid}><path d={BOTTLE_PATH} /></clipPath></defs>
      <rect x="19.5" y="2.5" width="9" height="4" rx="1.3" fill={capC} />
      <path d={BOTTLE_PATH} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth="1.2" />
      <g clipPath={`url(#${cid})`}>
        <rect x="14" y="22" width="20" height="22" fill={liquid} />
        <rect x="14" y="22" width="20" height="3" fill={dark} opacity="0.5" />
        <rect x="18.5" y="26" width="11" height="10" rx="1.6" fill={labelC} />
        <rect x="19" y="12" width="2.4" height="30" rx="1.2" fill="rgba(255,255,255,0.4)" />
      </g>
    </Svg>
  );
}

function SyrupIcon({ liquid }: { liquid: string }) {
  const cid = useId();
  const p = 'M17 14 L17 39 Q17 43 21 43 L27 43 Q31 43 31 39 L31 14 Z';
  return (
    <Svg>
      <defs><clipPath id={cid}><path d={p} /></clipPath></defs>
      <rect x="20" y="4" width="8" height="4" rx="1" fill="#caa24a" />
      <rect x="21" y="8" width="6" height="6" fill="rgba(255,255,255,0.12)" stroke={GLASS_STROKE} strokeWidth="1" />
      <path d={p} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth="1.2" />
      <g clipPath={`url(#${cid})`}>
        <rect x="15" y="19" width="18" height="26" fill={liquid} />
        <rect x="19" y="24" width="10" height="12" rx="1.4" fill="rgba(244,239,225,0.9)" />
        <rect x="18" y="14" width="2" height="30" fill="rgba(255,255,255,0.35)" />
      </g>
    </Svg>
  );
}

function DropperIcon({ liquid }: { liquid: string }) {
  const cid = useId();
  const p = 'M18 15 L30 15 L30 38 Q30 42 26 42 L22 42 Q18 42 18 38 Z';
  return (
    <Svg>
      <defs><clipPath id={cid}><path d={p} /></clipPath></defs>
      <rect x="20" y="3" width="8" height="6" rx="1.4" fill="#2c2018" />
      <rect x="22" y="8" width="4" height="7" fill="#2c2018" />
      <path d={p} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth="1.2" />
      <g clipPath={`url(#${cid})`}>
        <rect x="16" y="24" width="16" height="20" fill={liquid} />
        <rect x="20" y="12" width="2" height="30" fill="rgba(255,255,255,0.3)" />
      </g>
    </Svg>
  );
}

function FizzIcon({ liquid }: { liquid: string }) {
  const cid = useId();
  const p = 'M15 12 L33 12 L30.5 41 Q30.3 44 27.5 44 L20.5 44 Q17.7 44 17.5 41 Z';
  return (
    <Svg>
      <defs><clipPath id={cid}><path d={p} /></clipPath></defs>
      <path d={p} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth="1.2" />
      <g clipPath={`url(#${cid})`}>
        <rect x="14" y="18" width="20" height="28" fill={liquid} />
        <circle cx="21" cy="24" r="1.4" fill="rgba(255,255,255,0.7)" />
        <circle cx="26" cy="20" r="1.1" fill="rgba(255,255,255,0.6)" />
        <circle cx="24" cy="30" r="1.5" fill="rgba(255,255,255,0.7)" />
        <circle cx="27" cy="34" r="1" fill="rgba(255,255,255,0.55)" />
        <circle cx="20" cy="34" r="1.2" fill="rgba(255,255,255,0.6)" />
      </g>
      <ellipse cx="24" cy="12" rx="9" ry="2.2" fill="rgba(255,255,255,0.18)" stroke={GLASS_STROKE} strokeWidth="1" />
    </Svg>
  );
}

function FluteIcon({ liquid }: { liquid: string }) {
  const cid = useId();
  const p = 'M20 6 L28 6 L26.5 22 Q26 27 24 30 Q22 27 21.5 22 Z';
  return (
    <Svg>
      <defs><clipPath id={cid}><path d={p} /></clipPath></defs>
      <path d={p} fill={GLASS_FILL} stroke={GLASS_STROKE} strokeWidth="1.2" />
      <rect x="23.2" y="30" width="1.6" height="10" fill={GLASS_STROKE} />
      <rect x="18" y="41" width="12" height="2.4" rx="1.2" fill={GLASS_STROKE} />
      <g clipPath={`url(#${cid})`}><rect x="18" y="14" width="12" height="18" fill={liquid} /></g>
      <circle cx="23" cy="20" r="0.9" fill="rgba(255,255,255,0.7)" />
      <circle cx="25" cy="16" r="0.7" fill="rgba(255,255,255,0.6)" />
    </Svg>
  );
}

function CitrusIcon({ flesh, rind }: { flesh: string; rind: string }) {
  const spokes = [];
  for (let a = 0; a < 360; a += 45) {
    const r = 12.5;
    const x = 24 + r * Math.cos((a * Math.PI) / 180);
    const y = 24 + r * Math.sin((a * Math.PI) / 180);
    spokes.push(<line key={a} x1="24" y1="24" x2={x.toFixed(1)} y2={y.toFixed(1)} />);
  }
  return (
    <Svg>
      <circle cx="24" cy="24" r="17" fill={rind} />
      <circle cx="24" cy="24" r="14.5" fill={shade(flesh, 0.12)} />
      <circle cx="24" cy="24" r="13" fill={flesh} />
      <g stroke={rind} strokeWidth="1.3" opacity="0.5">{spokes}</g>
      <circle cx="24" cy="24" r="2.3" fill={shade(flesh, 0.2)} />
      <ellipse cx="18" cy="18" rx="4.5" ry="3" fill="rgba(255,255,255,0.28)" />
    </Svg>
  );
}

function MintIcon() {
  const leaf = (cx: number, cy: number, rot: number, s: number, key: number) => (
    <g key={key} transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`}>
      <path d="M0 -7 C6 -6 6 6 0 7 C-6 6 -6 -6 0 -7 Z" fill="#3fae6a" />
      <path d="M0 -6 L0 6" stroke="#2c7d4c" strokeWidth="0.9" />
    </g>
  );
  return (
    <Svg>
      <path d="M24 44 C24 34 21 26 24 14" stroke="#2c7d4c" strokeWidth="2" fill="none" />
      {leaf(24, 12, 0, 1, 0)}
      {leaf(17, 20, -38, 1.05, 1)}
      {leaf(31, 20, 38, 1.05, 2)}
      {leaf(16, 30, -30, 1.1, 3)}
      {leaf(32, 30, 30, 1.1, 4)}
    </Svg>
  );
}

function CherryIcon() {
  return (
    <Svg>
      <path d="M18 18 Q26 10 32 22" stroke="#5f8f38" strokeWidth="1.8" fill="none" />
      <circle cx="18" cy="32" r="7.5" fill="#c31f3c" />
      <circle cx="31" cy="34" r="7" fill="#a3182f" />
      <ellipse cx="15.5" cy="29.5" rx="2.4" ry="1.6" fill="rgba(255,255,255,0.5)" />
      <ellipse cx="28.5" cy="31.5" rx="2.1" ry="1.4" fill="rgba(255,255,255,0.4)" />
      <circle cx="32" cy="22" r="2.6" fill="#6fae3f" />
    </Svg>
  );
}

function CartonIcon({ liquid }: { liquid: string }) {
  return (
    <Svg>
      <path d="M15 18 L24 12 L33 18 L33 42 L15 42 Z" fill={shade(liquid, 0.05)} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
      <path d="M15 18 L24 12 L33 18 L24 22 Z" fill={shade(liquid, -0.12)} />
      <rect x="19" y="26" width="10" height="11" rx="1.2" fill="rgba(70,110,150,0.85)" />
      <path d="M20 30 h8 M20 33 h8" stroke="rgba(255,255,255,0.85)" strokeWidth="1.1" />
    </Svg>
  );
}

function EggIcon() {
  return (
    <Svg>
      <ellipse cx="24" cy="26" rx="12" ry="15" fill="#f6f3ea" />
      <ellipse cx="24" cy="26" rx="12" ry="15" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
      <ellipse cx="20" cy="20" rx="4" ry="6" fill="rgba(255,255,255,0.75)" transform="rotate(-20 20 20)" />
      <circle cx="24" cy="28" r="5.5" fill="#f4c430" />
    </Svg>
  );
}

function CoffeeIcon() {
  return (
    <Svg>
      <path d="M20 8 q2 3 0 6 M26 8 q2 3 0 6" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" fill="none" />
      <path d="M13 18 L33 18 L31 34 Q30.5 40 24 40 Q17.5 40 17 34 Z" fill="#f2ede0" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
      <path d="M15 22 L31 22 L29.5 33 Q29 37.5 24 37.5 Q19 37.5 18.5 33 Z" fill="#3a2314" />
      <path d="M33 22 q6 1 5 7 q-1 5 -6 4" stroke="rgba(0,0,0,0.18)" strokeWidth="2" fill="none" />
    </Svg>
  );
}

function SugarIcon() {
  const cube = (x: number, y: number, key: number) => (
    <g key={key} transform={`translate(${x} ${y})`}>
      <path d="M0 4 L8 0 L16 4 L8 8 Z" fill="#ffffff" />
      <path d="M0 4 L0 13 L8 17 L8 8 Z" fill="#dfe3ea" />
      <path d="M16 4 L16 13 L8 17 L8 8 Z" fill="#eef1f6" />
    </g>
  );
  return <Svg>{cube(6, 22, 0)}{cube(18, 22, 1)}{cube(12, 12, 2)}</Svg>;
}

function CoconutIcon() {
  return (
    <Svg>
      <circle cx="24" cy="26" r="15" fill="#6b4a2f" />
      <circle cx="24" cy="26" r="15" fill="none" stroke="#4f3620" strokeWidth="1.4" />
      <path d="M24 11 A15 15 0 0 1 39 26 A11 11 0 0 0 24 15 A11 11 0 0 0 9 26 A15 15 0 0 1 24 11 Z" fill="#f6f2ea" />
      <circle cx="24" cy="26" r="8.5" fill="#fbf8f2" />
      <ellipse cx="24" cy="24" rx="5" ry="3.5" fill="#efe7d8" />
    </Svg>
  );
}

function TomatoIcon() {
  return (
    <Svg>
      <circle cx="24" cy="27" r="14" fill="#c62b1e" />
      <circle cx="24" cy="27" r="14" fill="none" stroke="#9e2115" strokeWidth="1" />
      <ellipse cx="19" cy="22" rx="4" ry="2.6" fill="rgba(255,255,255,0.28)" />
      <path d="M24 13 l-4 -4 M24 13 l4 -4 M24 13 l0 -5 M24 13 l-6 -1 M24 13 l6 -1" stroke="#4f8a3a" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="13" r="2.4" fill="#4f8a3a" />
    </Svg>
  );
}

function CucumberIcon() {
  return (
    <Svg>
      <g transform="rotate(35 24 24)">
        <rect x="18" y="8" width="12" height="32" rx="6" fill="#4f9d3f" />
        <rect x="20.5" y="11" width="7" height="26" rx="3.5" fill="#cfe8a8" />
        <g fill="#8fbf5a"><circle cx="24" cy="18" r="1.1" /><circle cx="24" cy="24" r="1.1" /><circle cx="24" cy="30" r="1.1" /></g>
      </g>
    </Svg>
  );
}

function CranberryIcon() {
  const berry = (x: number, y: number, r: number, key: number) => (
    <g key={key}>
      <circle cx={x} cy={y} r={r} fill="#a3182f" />
      <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.3} fill="rgba(255,255,255,0.45)" />
    </g>
  );
  return (
    <Svg>
      {berry(18, 22, 6, 0)}{berry(30, 20, 5.5, 1)}{berry(24, 31, 6.5, 2)}
      {berry(33, 31, 4.5, 3)}{berry(15, 32, 4.5, 4)}
    </Svg>
  );
}

function PineappleIcon() {
  return (
    <Svg>
      <path d="M24 6 l-3 8 M24 6 l3 8 M24 6 l-7 6 M24 6 l7 6" stroke="#4f9d3f" strokeWidth="2.4" strokeLinecap="round" />
      <ellipse cx="24" cy="30" rx="12" ry="14" fill="#f4c430" />
      <ellipse cx="24" cy="30" rx="12" ry="14" fill="none" stroke="#d19b12" strokeWidth="1" />
      <g stroke="#c98f18" strokeWidth="1.1" opacity="0.8">
        <path d="M14 24 L34 24 M14 30 L34 30 M14 36 L34 36 M18 18 L18 42 M24 16 L24 44 M30 18 L30 42" />
      </g>
    </Svg>
  );
}

function OliveIcon() {
  return (
    <Svg>
      <ellipse cx="22" cy="26" rx="9" ry="12" fill="#7d8a2e" />
      <ellipse cx="22" cy="26" rx="9" ry="12" fill="none" stroke="#5f6a22" strokeWidth="1" />
      <ellipse cx="18.5" cy="20" rx="2.6" ry="3.4" fill="rgba(255,255,255,0.28)" />
      <circle cx="22" cy="20" r="3.4" fill="#c8102e" />
      <line x1="30" y1="10" x2="26" y2="18" stroke="#c9b46a" strokeWidth="1.6" />
    </Svg>
  );
}

function ShakerIcon() {
  return (
    <Svg>
      <path d="M17 20 Q17 14 24 13 Q31 14 31 20 L31 40 Q31 43 28 43 L20 43 Q17 43 17 40 Z" fill="rgba(255,255,255,0.14)" stroke={GLASS_STROKE} strokeWidth="1.2" />
      <path d="M18 12 L30 12 L29 18 L19 18 Z" fill="#b9bec7" />
      <g fill="#7d828b"><circle cx="22" cy="14.5" r="0.9" /><circle cx="26" cy="14.5" r="0.9" /><circle cx="24" cy="16" r="0.9" /></g>
      <rect x="20" y="24" width="8" height="14" rx="1.4" fill="rgba(255,255,255,0.55)" />
    </Svg>
  );
}

/** Dispatch: render the right icon for an ingredient. */
export function IngredientIcon({ ing }: { ing: Ingredient }) {
  switch (ing.icon) {
    case 'bottle': return <BottleIcon liquid={ing.color} cap={ing.cap} />;
    case 'syrup': return <SyrupIcon liquid={ing.color} />;
    case 'dropper': return <DropperIcon liquid={ing.color} />;
    case 'fizz': return <FizzIcon liquid={ing.color} />;
    case 'flute': return <FluteIcon liquid={ing.color} />;
    case 'citrus': return <CitrusIcon flesh={ing.color} rind={ing.rind ?? shade(ing.color, -0.3)} />;
    case 'mint': return <MintIcon />;
    case 'cherry': return <CherryIcon />;
    case 'cream': return <CartonIcon liquid={ing.color} />;
    case 'egg': return <EggIcon />;
    case 'coffee': return <CoffeeIcon />;
    case 'sugar': return <SugarIcon />;
    case 'coconut': return <CoconutIcon />;
    case 'tomato': return <TomatoIcon />;
    case 'cucumber': return <CucumberIcon />;
    case 'cranberry': return <CranberryIcon />;
    case 'pineapple': return <PineappleIcon />;
    case 'olive': return <OliveIcon />;
    case 'shaker': return <ShakerIcon />;
  }
}

/** Brand mark — an enchanted cauldron with glowing brew + gilded rim. */
export function BrandMark() {
  const gid = useId();
  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#a8ffe0" />
          <stop offset="55%" stopColor="#3ddc97" />
          <stop offset="100%" stopColor="#5b3fd0" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="41" rx="13" ry="3" fill="rgba(61,220,151,0.28)" />
      <path d="M9 22 Q7 34 18 39 Q24 41 30 39 Q41 34 39 22 Z" fill="rgba(220,255,240,0.08)" stroke="rgba(217,178,94,0.55)" strokeWidth="1.4" />
      <path d="M12 26 Q11 34 19 37 Q24 39 29 37 Q37 34 36 26 Z" fill={`url(#${gid})`} opacity="0.94" />
      <ellipse cx="24" cy="22" rx="16" ry="4.2" fill="rgba(220,255,240,0.12)" stroke="#d9b25e" strokeWidth="1.5" />
      <circle cx="20" cy="30" r="1.6" fill="rgba(255,255,255,0.9)" />
      <circle cx="27" cy="27" r="1.1" fill="rgba(255,255,255,0.8)" />
      <circle cx="24" cy="33" r="1.3" fill="rgba(255,255,255,0.75)" />
      <path d="M18 15 q3 -5 6 -1 q3 -5 6 0" stroke="#7fe6c4" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.85" />
      <path d="M8 18 l1.4 2.6 l2.6 1.4 l-2.6 1.4 l-1.4 2.6 l-1.4 -2.6 l-2.6 -1.4 l2.6 -1.4 Z" fill="#f2d68c" opacity="0.85" transform="scale(0.7) translate(2 4)" />
    </svg>
  );
}

/** Rotating "summoning circle" behind the cauldron (hexagram + runic ticks). */
export function MagicCircle() {
  const C = 100;
  const P = (deg: number, rad: number): [string, string] => [
    (C + rad * Math.cos((deg * Math.PI) / 180)).toFixed(1),
    (C + rad * Math.sin((deg * Math.PI) / 180)).toFixed(1),
  ];
  const tri = (off: number, rad: number) => {
    const a = P(off - 90, rad), b = P(off + 30, rad), c = P(off + 150, rad);
    return `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${c[0]} ${c[1]} Z`;
  };
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
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">
      <circle cx="100" cy="100" r="94" stroke="rgba(217,178,94,0.5)" strokeWidth="1" />
      <circle cx="100" cy="100" r="90" stroke="rgba(217,178,94,0.28)" strokeWidth="0.6" strokeDasharray="2 4" />
      <circle cx="100" cy="100" r="80" stroke="rgba(127,230,196,0.45)" strokeWidth="1" />
      <circle cx="100" cy="100" r="63" stroke="rgba(154,123,245,0.4)" strokeWidth="0.8" />
      <g stroke="rgba(217,178,94,0.5)" strokeWidth="0.9">{ticks}</g>
      <g fill="rgba(127,230,196,0.6)">{dots}</g>
      <g className="mc-inner" stroke="rgba(154,123,245,0.55)" strokeWidth="1.1" fill="none">
        <path d={tri(0, 63)} />
        <path d={tri(180, 63)} />
      </g>
    </svg>
  );
}
