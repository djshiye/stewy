/* The celestial halo behind the pot. The ring (moon phases and fine ticks) turns very slowly;
   the fill gauge on its right arc stays put, marks 30 / 60 / 90 / 150 / 250 ml on the same
   non-linear curve as the fill, and carries the current level in the accent. Both are faint. */
import { memo } from 'react';
import { HALO, VB_H, VB_W, f, rng } from './geometry';
import { GAUGE_FROM, GAUGE_MARKS, GAUGE_TO, gaugeAngle } from './fill';

const R = HALO.r;
const TAU = Math.PI * 2;

/** The lit part of a moon of radius r at phase p (0 new, 0.5 full, waxing first). */
function moonLit(r: number, p: number): string | null {
  if (p <= 0 || p >= 1) return null;
  if (Math.abs(p - 0.5) < 1e-6) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
  const cos = Math.cos(p * TAU);
  const rx = f(r * Math.abs(cos), 2);
  const sweep = cos > 0 ? 0 : 1;
  return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx} ${r} 0 0 ${sweep} 0 ${-r}Z`;
}

const MOONS = Array.from({ length: 8 }, (_, i) => {
  const p = i / 8;
  const a = (i / 8) * 360 - 90 + 22.5;
  return { a, p, lit: moonLit(9, p), waning: p > 0.5 };
});

const TICKS = (() => {
  let d = '';
  let major = '';
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * TAU;
    const long = i % 12 === 0;
    const r0 = R - (long ? 15 : i % 3 === 0 ? 10 : 6);
    const x0 = HALO.cx + Math.cos(a) * r0;
    const y0 = HALO.cy + Math.sin(a) * r0;
    const x1 = HALO.cx + Math.cos(a) * R;
    const y1 = HALO.cy + Math.sin(a) * R;
    const seg = `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
    if (long) major += seg; else d += seg;
  }
  return { d, major };
})();

/** A few faint stars over the whole scene. */
const STARS = (() => {
  const r = rng(23);
  return Array.from({ length: 34 }, (_, i) => ({
    x: f(-60 + r() * 840),
    y: f(-30 + r() * 420),
    r: f(0.7 + r() * 0.9, 2),
    o: f(0.2 + r() * 0.4, 2),
    twinkle: i % 3 === 0,
  }));
})();

export const Halo = memo(function Halo() {
  return (
    <div className="stg-halo">
      <svg className="stg-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
        <g fill="none" style={{ stroke: 'var(--brew-hi)' }}>
          <circle cx={HALO.cx} cy={HALO.cy} r={R} strokeOpacity=".3" strokeWidth="1" />
          <circle cx={HALO.cx} cy={HALO.cy} r={R - 24} strokeOpacity=".14" strokeWidth="1" />
          <circle cx={HALO.cx} cy={HALO.cy} r={R - 54} strokeOpacity=".12" strokeWidth="1" />
          <circle cx={HALO.cx} cy={HALO.cy} r={R - 78} strokeOpacity=".07" strokeWidth="1" strokeDasharray="1 5" />
          <path d={TICKS.d} strokeOpacity=".3" strokeWidth="1" />
          <path d={TICKS.major} strokeOpacity=".5" strokeWidth="1.3" />
        </g>
        {MOONS.map((m, i) => (
          <g key={i} transform={`translate(${HALO.cx} ${HALO.cy}) rotate(${f(m.a)}) translate(${R - 39} 0) rotate(90)`}>
            <circle r="9" strokeWidth="1" strokeOpacity=".42" style={{ stroke: 'var(--brew-hi)', fill: 'rgba(var(--brew-rgb), .14)' }} />
            {m.lit && (
              <path d={m.lit} style={{ fill: 'var(--brew-hi)' }} fillOpacity=".62" transform={m.waning ? 'scale(-1 1)' : undefined} />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
});

/** Faint stars behind everything. A few twinkle together: those are a second <svg>, so the
    animation is an opacity change on a composited element, not a repaint of the sky. */
export const Stars = memo(function Stars() {
  return (
    <>
      <svg className="stg-svg stg-stars" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
        {STARS.filter((s) => !s.twinkle).map((s, i) =>
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe8f7" opacity={s.o} />,
        )}
      </svg>
      <svg className="stg-svg stg-stars stg-twinkle" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
        {STARS.filter((s) => s.twinkle).map((s, i) =>
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe8f7" opacity={s.o + 0.2} />,
        )}
      </svg>
    </>
  );
});

const RG = R + 18;
const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [HALO.cx + Math.cos(a) * r, HALO.cy + Math.sin(a) * r] as const;
};

const GAUGE_TRACK = (() => {
  const [x0, y0] = polar(GAUGE_FROM, RG);
  const [x1, y1] = polar(GAUGE_TO, RG);
  return `M${f(x0)} ${f(y0)}A${RG} ${RG} 0 0 0 ${f(x1)} ${f(y1)}`;
})();

const MINOR = (() => {
  let d = '';
  const vols = [...Array.from({ length: 10 }, (_, i) => (i + 1) * 10), 125, 150, 175, 200, 225, 250];
  for (const v of vols) {
    if ((GAUGE_MARKS as readonly number[]).includes(v)) continue;
    const a = gaugeAngle(v);
    const [x0, y0] = polar(a, RG - 3);
    const [x1, y1] = polar(a, RG + 3);
    d += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
  }
  return d;
})();

const MARKS = GAUGE_MARKS.map((ml) => {
  const a = gaugeAngle(ml);
  const [x0, y0] = polar(a, RG - 7);
  const [x1, y1] = polar(a, RG + 7);
  const [tx, ty] = polar(a, RG + 26);
  return { ml, d: `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`, tx: f(tx), ty: f(ty + 4.5), label: ml === 250 ? '250 ml' : String(ml) };
});

/** The fill gauge. `ml` is the liquid in the pot; only the marker turns (transform only). */
export const Gauge = memo(function Gauge({ ml }: { ml: number }) {
  const angle = ml > 0 ? gaugeAngle(ml) : GAUGE_FROM;
  return (
    <svg className="stg-svg stg-gauge" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true" focusable="false">
      <path d={GAUGE_TRACK} fill="none" stroke="rgba(190,205,230,.22)" strokeWidth="1.2" />
      <path d={MINOR} fill="none" stroke="rgba(190,205,230,.28)" strokeWidth="1" />
      {MARKS.map((m) => {
        const on = ml >= m.ml;
        return (
          <g key={m.ml}>
            <path d={m.d} stroke="rgba(190,205,230,.4)" strokeWidth="1.4" />
            <path className="stg-gauge-on" d={m.d} style={{ stroke: 'var(--accent)', opacity: on ? 1 : 0 }} strokeWidth="2" />
            <text x={m.tx} y={m.ty} textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--tx-2)" className="stg-gauge-label"
              style={{ fill: on ? 'var(--accent)' : 'var(--tx-2)' }}>
              {m.label}
            </text>
          </g>
        );
      })}
      <g
        className="stg-gauge-dot"
        style={{ opacity: ml > 0 ? 1 : 0, transform: `rotate(${f(angle, 2)}deg)`, transformOrigin: `${HALO.cx}px ${HALO.cy}px` }}
      >
        <path d={`M${f(HALO.cx + RG - 22)} ${HALO.cy}L${f(HALO.cx + RG + 22)} ${HALO.cy}`} style={{ stroke: 'var(--accent)' }} strokeWidth="1.2" strokeOpacity=".5" />
        <circle cx={HALO.cx + RG} cy={HALO.cy} r="5.5" style={{ fill: 'var(--accent)', stroke: 'var(--ink-950)' }} strokeWidth="2" />
      </g>
    </svg>
  );
});
