/* A small arcane radar of the brew's normalised flavour profile. */
import { useId } from 'react';
import { FLAVOR_DIMS } from '../data/types';
import type { Profile } from '../lib/harmony';

const CX = 82, CY = 76, R = 42;

export function FlavorRadar({ p }: { p: Profile }) {
  const gid = useId();
  const dims = FLAVOR_DIMS.filter((d) => (p[d] ?? 0) > 0.015);
  if (dims.length < 3) return null;

  const max = Math.max(...dims.map((d) => p[d] ?? 0));
  const N = dims.length;
  const pt = (i: number, r: number): [number, number] => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  };

  const poly = dims
    .map((d, i) => {
      const v = (p[d] ?? 0) / max;
      const [x, y] = pt(i, 5 + v * (R - 5));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="flavor-radar">
      <svg viewBox="0 0 164 152" xmlns="http://www.w3.org/2000/svg" aria-label="Flavour profile radar">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3ddc97" />
            <stop offset="100%" stopColor="#d9b25e" />
          </linearGradient>
        </defs>
        {[0.33, 0.66, 1].map((k) => (
          <circle key={k} cx={CX} cy={CY} r={R * k} fill="none"
            stroke="rgba(217,178,94,0.18)" strokeWidth="0.8"
            strokeDasharray={k === 1 ? undefined : '2 3'} />
        ))}
        {dims.map((d, i) => {
          const [x, y] = pt(i, R);
          return <line key={d} x1={CX} y1={CY} x2={x} y2={y}
            stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />;
        })}
        <polygon points={poly} fill={`url(#${gid})`} fillOpacity="0.30"
          stroke={`url(#${gid})`} strokeWidth="1.5" strokeLinejoin="round" />
        {dims.map((d, i) => {
          const v = (p[d] ?? 0) / max;
          const [px, py] = pt(i, 5 + v * (R - 5));
          const [lx, ly] = pt(i, R + 11);
          return (
            <g key={d}>
              <circle cx={px} cy={py} r="1.8" fill="#7fe6c4" />
              <text x={lx} y={ly + 2.5} textAnchor="middle" className="radar-label">
                {d}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
