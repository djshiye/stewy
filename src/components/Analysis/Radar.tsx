import { motion, useTransform } from 'motion/react';
import { axes8, radarRadius, type Axis } from '../../lib/profile';
import type { Profile } from '../../lib/harmony';
import { useMotionLerp } from './useMotionLerp';

const W = 220;
const H = 180;
const CX = 110;
const CY = 90;
const R = 62;
/** label distance from the centre (horizontal / vertical) */
const LX = 74;
const LY = 78;

const angle = (i: number) => ((-90 + 45 * i) * Math.PI) / 180;
const pt = (i: number, r: number) => [CX + Math.cos(angle(i)) * r, CY + Math.sin(angle(i)) * r] as const;
const poly = (radius: (i: number) => number) =>
  Array.from({ length: 8 }, (_, i) => pt(i, radius(i)).map((n) => n.toFixed(2)).join(' '))
    .map((p, i) => `${i ? 'L' : 'M'}${p}`)
    .join('') + 'Z';

const RINGS = [1 / 3, 2 / 3, 1].map((k) => poly(() => R * k));

function labelStyle(i: number): React.CSSProperties {
  const c = Math.cos(angle(i));
  const s = Math.sin(angle(i));
  const x = CX + c * (Math.abs(c) < 0.3 ? 0 : LX);
  const y = CY + s * (Math.abs(c) < 0.3 ? LY : Math.abs(s) < 0.3 ? 0 : 56);
  const tx = Math.abs(c) < 0.3 ? '-50%' : c > 0 ? '0' : '-100%';
  return {
    left: `${(x / W) * 100}%`,
    top: `${(y / H) * 100}%`,
    transform: `translate(${tx}, -50%)`,
  };
}

interface RadarProps {
  p: Profile | null;
}

/** Eight fixed axes that always render, so the shape never jumps between brews. */
export function Radar({ p }: RadarProps) {
  const axes: Axis[] = axes8(p);
  const radii = useMotionLerp(axes.map((a) => radarRadius(a.value)), 0.5);
  const d = useTransform(radii, (r) => poly((i) => R * r[i]));
  const empty = !p || Object.keys(p).length === 0;
  const summary = empty
    ? 'Flavour profile: nothing in the pot yet'
    : `Flavour profile: ${axes
        .filter((a) => a.value >= 0.05)
        .sort((a, b) => b.value - a.value)
        .map((a) => `${a.label} ${Math.round(a.value * 100)} percent`)
        .join(', ')}`;

  return (
    <div className="radar" role="img" aria-label={summary}>
      <svg viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        {RINGS.map((d0, i) => (
          <path key={i} className="radar__ring" d={d0} />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, R);
          return <line key={a.key} className="radar__axis" x1={CX} y1={CY} x2={x} y2={y} />;
        })}
        <motion.path className="radar__shape" d={d} />
      </svg>
      {axes.map((a, i) => (
        <span key={a.key} className="radar__label" data-hot={a.value >= 0.12} style={labelStyle(i)}>
          {a.label}
        </span>
      ))}
    </div>
  );
}
