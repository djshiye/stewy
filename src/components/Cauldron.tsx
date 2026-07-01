/* The enchanted cauldron — glass body over a hearth fire and a rotating
   summoning circle. The liquid blends every reagent's colour, fills as you
   pour, glows from beneath, bubbles, and breathes steam. */
import { useMemo, type CSSProperties, type RefObject } from 'react';
import type { BrewEntry } from '../data/types';
import { clamp, mixColor, shade } from '../lib/color';
import { MagicCircle } from '../icons/Icons';

const CAP = 320;   // ml that visually "fills" the cauldron
const TOP = 96;    // interior top y (SVG units)
const BOT = 250;   // interior bottom y

export interface SplashSpec {
  id: number;
  color: string;
}

interface Props {
  brew: BrewEntry[];
  splashes: SplashSpec[];
  dragOver: boolean;
  boxRef: RefObject<HTMLDivElement | null>;
}

const BUBBLES: [number, number, number, string, string][] = [
  [128, 236, 3,   '0s',    '3.2s'],
  [150, 238, 2.2, '0.7s',  '2.7s'],
  [172, 236, 3.4, '1.4s',  '3.6s'],
  [192, 238, 2,   '0.4s',  '2.9s'],
  [140, 240, 2.6, '2.1s',  '3.3s'],
  [182, 240, 2.4, '1.1s',  '2.5s'],
  [160, 242, 3,   '1.8s',  '3.8s'],
];

const EMBERS: [string, string, string][] = [
  ['-24px', '0s',   '3.4s'],
  ['12px',  '1.1s', '2.8s'],
  ['30px',  '2s',   '3.1s'],
  ['-8px',  '0.6s', '3.7s'],
];

function SplashFx({ color }: { color: string }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const ang = Math.random() * Math.PI * 2;
        const dist = 26 + Math.random() * 44;
        return {
          c: i % 2 ? '#f2d68c' : shade(color, 0.45),
          sx: `${(Math.cos(ang) * dist).toFixed(1)}px`,
          sy: `${(Math.sin(ang) * dist - 22).toFixed(1)}px`,
          delay: `${(0.18 + Math.random() * 0.22).toFixed(2)}s`,
        };
      }),
    [color],
  );
  return (
    <>
      <span className="droplet" style={{ '--c': color } as CSSProperties} />
      <span className="ripple" style={{ '--c': shade(color, 0.2) } as CSSProperties} />
      {sparks.map((s, i) => (
        <span
          key={i}
          className="sparkle"
          style={{ '--c': s.c, '--sx': s.sx, '--sy': s.sy, top: '50%', animationDelay: s.delay } as CSSProperties}
        />
      ))}
    </>
  );
}

export function Cauldron({ brew, splashes, dragOver, boxRef }: Props) {
  const totalMl = brew.reduce((s, e) => s + e.ml, 0);
  const mix = useMemo(() => mixColor(brew), [brew]);

  let frac = clamp(totalMl / CAP, 0, 1);
  if (totalMl > 0 && frac < 0.08) frac = 0.08;
  const fillY = BOT - frac * (BOT - TOP);
  const rx = 52 + frac * 52;

  const glow = mix
    ? `rgba(${mix.r | 0}, ${mix.g | 0}, ${mix.b | 0}, ${(0.28 + mix.a * 0.4).toFixed(2)})`
    : 'rgba(61,220,151,0)';
  const steamC = mix ? shade([mix.r, mix.g, mix.b], 0.6) : 'rgba(255,255,255,0.5)';

  return (
    <div
      ref={boxRef}
      className={`cauldron${dragOver ? ' drag-over' : ''}${splashes.length ? ' pulse' : ''}`}
      style={{ '--glow': glow, '--brew': mix?.css ?? '#22304a' } as CSSProperties}
    >
      <div className="magic-circle" aria-hidden="true"><MagicCircle /></div>
      <div className="cauldron-glow" />

      <div className="cauldron-fire" aria-hidden="true">
        <span className="flame f1" />
        <span className="flame f2" />
        <span className="flame f3" />
        {EMBERS.map(([ex, ed, et], i) => (
          <span key={i} className="ember"
            style={{ '--ex': ex, '--ed': ed, '--et': et } as CSSProperties} />
        ))}
      </div>

      {mix && (
        <div className="cauldron-steam" aria-hidden="true">
          <span className="steam s1" style={{ '--c': steamC } as CSSProperties} />
          <span className="steam s2" style={{ '--c': steamC } as CSSProperties} />
          <span className="steam s3" style={{ '--c': steamC } as CSSProperties} />
        </div>
      )}

      <svg className="cauldron-svg" viewBox="0 0 320 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="interiorClip">
            <path d="M62 90 C44 150 62 226 114 239 C142 246 178 246 206 239 C258 226 276 150 258 90 Z" />
          </clipPath>
          <linearGradient id="glassGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(220,255,240,0.20)" />
            <stop offset="1" stopColor="rgba(160,140,220,0.05)" />
          </linearGradient>
          <linearGradient id="interiorShadow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(8,6,16,0.66)" />
            <stop offset="1" stopColor="rgba(8,6,16,0.12)" />
          </linearGradient>
        </defs>

        {/* feet */}
        <g fill="#241c14" stroke="#0c0805" strokeWidth="1.5">
          <path d="M100 242 l-9 26 q-1 6 6 6 h12 q6 0 5 -6 l-4 -26 Z" />
          <path d="M220 242 l9 26 q1 6 -6 6 h-12 q-6 0 -5 -6 l4 -26 Z" />
          <path d="M150 250 l-5 30 q-1 6 6 6 h18 q7 0 6 -6 l-5 -30 Z" />
        </g>

        {/* side handles */}
        <g fill="none" stroke="#3a2f22" strokeWidth="7" strokeLinecap="round">
          <path d="M54 148 q-30 8 -26 42 q2 18 22 22" />
          <path d="M266 148 q30 8 26 42 q-2 18 -22 22" />
        </g>

        {/* glass body */}
        <path className="cauldron-body"
          d="M52 84 C30 150 52 232 110 246 C140 253 180 253 210 246 C268 232 290 150 268 84 Z"
          fill="url(#glassGrad)" stroke="rgba(217,178,94,0.4)" strokeWidth="2" />

        {/* interior + liquid */}
        <g clipPath="url(#interiorClip)">
          <rect x="30" y="82" width="260" height="180" fill="url(#interiorShadow)" />
          <rect
            className="liquid"
            x="30" width="260"
            y={fillY.toFixed(1)}
            height={(BOT + 6 - fillY).toFixed(1)}
            fill={mix?.css ?? '#22304a'}
            fillOpacity={mix ? mix.a.toFixed(2) : 0}
          />
          <ellipse
            className="liquid-surface"
            cx="160" ry="7"
            cy={fillY.toFixed(1)}
            rx={rx.toFixed(1)}
            fill={mix ? shade([mix.r, mix.g, mix.b], 0.18) : '#33456a'}
            fillOpacity={mix ? Math.min(1, mix.a + 0.1).toFixed(2) : 0}
          />
          <ellipse
            className="liquid-shine"
            cx="160" ry="5"
            cy={(fillY - 1).toFixed(1)}
            rx={(rx * 0.6).toFixed(1)}
            fill="rgba(255,255,255,0.35)"
            fillOpacity={mix && frac > 0 ? 0.4 : 0}
          />
          {mix && (
            <g opacity="0.85" fill={shade([mix.r, mix.g, mix.b], 0.55)}>
              {BUBBLES.map(([cx, cy, r, d, t], i) => (
                <circle key={i} className="bubble" cx={cx} cy={cy} r={r}
                  style={{ '--d': d, '--t': t } as CSSProperties} />
              ))}
            </g>
          )}
        </g>

        {/* glass shine over everything */}
        <path className="glass-shine" d="M74 102 C62 150 72 208 100 230"
          stroke="rgba(255,255,255,0.5)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* iron rim (stroke only, so the surface shows) */}
        <ellipse cx="160" cy="84" rx="112" ry="20" fill="none" stroke="#3a2f22" strokeWidth="9" />
        <ellipse cx="160" cy="84" rx="112" ry="20" fill="none" stroke="rgba(217,178,94,0.55)" strokeWidth="1.6" />
        {/* gold rivets */}
        <g fill="#d9b25e">
          <circle cx="160" cy="64.2" r="2.4" /><circle cx="160" cy="103.8" r="2.4" />
          <circle cx="48.5" cy="84" r="2.4" /><circle cx="271.5" cy="84" r="2.4" />
          <circle cx="90" cy="70" r="1.8" /><circle cx="230" cy="70" r="1.8" />
          <circle cx="90" cy="98" r="1.8" /><circle cx="230" cy="98" r="1.8" />
        </g>
      </svg>

      <div className="cauldron-fx">
        {splashes.map((s) => <SplashFx key={s.id} color={s.color} />)}
      </div>
      <div className="drop-hint">release to add</div>
    </div>
  );
}
