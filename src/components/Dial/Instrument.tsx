/* The dial instrument: 64 LED segments, engraved scale, knurled knob. Presentational SVG only. */
import { memo, useId, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  arcPath, DIAL_SPAN, DIAL_START, fracToAngle, ledRing, litCount, polar, scaleTicks, type DialRange,
} from './dialMath';

/** Centre of the 240 x 224 view box (the top is padded for the numeral at 12 o'clock). */
const C = 120;
export const VIEW_BOX = '0 -10 240 224';
/** Where the knob centre sits inside the view box, as a fraction of its height. */
export const CENTER_Y = (C + 10) / 224;

const R = {
  well: 102,
  ledIn: 84,
  ledOut: 96,
  tickIn: 105,
  tickMajor: 112,
  tickMinor: 109,
  label: 123,
  knob: 74,
  knurlIn: 66,
  face: 65,
  recess: 42,
};

const LED = ledRing({ cx: C, cy: C, r1: R.ledIn, r2: R.ledOut });
const KNURL = Array.from({ length: 72 }, (_, i) => {
  const a = i * 5;
  const [x1, y1] = polar(C, C, R.knurlIn, a);
  const [x2, y2] = polar(C, C, R.knob - 0.8, a);
  return { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), odd: i % 2 === 1 };
});
const GROOVES = Array.from({ length: 13 }, (_, i) => R.recess + 2 + i * 1.7);

/** Faint bands of reflected light on the turned face, fixed in space like the light. */
const band = (mid: number, half: number) => {
  const a0 = mid - half;
  const a1 = mid + half;
  const r = R.face - 0.5;
  const [x0, y0] = polar(C, C, r, a0);
  const [x1, y1] = polar(C, C, r, a1);
  return {
    d: `M${C} ${C}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`,
    x1: x0, y1: y0, x2: x1, y2: y1,
  };
};
const BRUSH = [band(222, 24), band(42, 24), band(270, 9)];

const KNOB_SPRING = { type: 'spring', stiffness: 160, damping: 22 } as const;

export interface InstrumentProps {
  /** 0..1 position of the knob */
  frac: number;
  /** committed position in edit mode, or null */
  ghost: number | null;
  range: DialRange;
}

function InstrumentImpl({ frac, ghost, range }: InstrumentProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (n: string) => `${uid}-${n}`;
  const ticks = useMemo(() => scaleTicks(range), [range]);
  const lit = litCount(frac);
  const endAngle = fracToAngle(frac);

  let ghostMark: React.ReactNode = null;
  if (ghost !== null) {
    const a = fracToAngle(ghost);
    const [tx, ty] = polar(C, C, R.well - 1, a);
    const [bx1, by1] = polar(C, C, R.tickMajor + 1, a - 2.6);
    const [bx2, by2] = polar(C, C, R.tickMajor + 1, a + 2.6);
    const [lx1, ly1] = polar(C, C, R.ledIn - 3, a);
    const [lx2, ly2] = polar(C, C, R.ledOut + 1, a);
    ghostMark = (
      <g className="dial__ghost">
        <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} />
        <path d={`M${tx.toFixed(2)} ${ty.toFixed(2)}L${bx1.toFixed(2)} ${by1.toFixed(2)}L${bx2.toFixed(2)} ${by2.toFixed(2)}Z`} />
      </g>
    );
  }

  return (
    <svg className="dial__svg" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={id('well')} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0.6" stopColor="#0d1118" />
          <stop offset="1" stopColor="#090c11" />
        </radialGradient>
        <radialGradient id={id('shadow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('metal')} x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#8e99b4" />
          <stop offset="0.28" stopColor="#4f586d" />
          <stop offset="0.6" stopColor="#2b3242" />
          <stop offset="1" stopColor="#171b25" />
        </linearGradient>
        <radialGradient id={id('face')} cx="0.36" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#6b7691" />
          <stop offset="0.45" stopColor="#3c4559" />
          <stop offset="1" stopColor="#1b202b" />
        </radialGradient>
        <radialGradient id={id('recess')} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#0a0d13" />
          <stop offset="1" stopColor="#05070a" />
        </radialGradient>
        <radialGradient id={id('vignette')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.5" />
        </radialGradient>
        {BRUSH.map((b, i) => (
          <linearGradient key={i} id={id(`brush${i}`)} gradientUnits="userSpaceOnUse" x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}>
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity={i === 2 ? 0.1 : 0.16} />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        ))}
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* the recessed plate the LED ring is set into */}
      <circle cx={C} cy={C} r={R.well} fill={`url(#${id('well')})`} />
      <circle cx={C} cy={C} r={R.well} className="dial__well-edge" />

      {/* LED segments: all dim, then the lit ones over them */}
      <g className="dial__leds">
        {LED.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} className="dial__led" />
        ))}
      </g>
      {lit > 0 && (
        <g className="dial__halo" fill="none" strokeLinecap="butt">
          <path d={arcPath(C, C, 89, DIAL_START, Math.max(DIAL_START + 1, endAngle))} className="dial__halo-wide" />
          <path d={arcPath(C, C, 89, DIAL_START, Math.max(DIAL_START + 1, endAngle))} className="dial__halo-near" />
        </g>
      )}
      <g className="dial__leds-on">
        {LED.map((s, i) => (
          <line
            key={i}
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            className={i < lit ? 'dial__led dial__led--on is-on' : 'dial__led dial__led--on'}
          />
        ))}
      </g>

      {/* engraved scale */}
      <g className="dial__ticks">
        {ticks.map((t, i) => {
          const a = fracToAngle(t.frac);
          const [x1, y1] = polar(C, C, R.tickIn, a);
          const [x2, y2] = polar(C, C, t.major ? R.tickMajor : R.tickMinor, a);
          return (
            <line
              key={i}
              x1={x1.toFixed(2)}
              y1={y1.toFixed(2)}
              x2={x2.toFixed(2)}
              y2={y2.toFixed(2)}
              className={t.major ? 'dial__tick dial__tick--major' : 'dial__tick'}
            />
          );
        })}
      </g>
      <g className="dial__numerals" textAnchor="middle">
        {ticks.filter((t) => t.label).map((t) => {
          const [x, y] = polar(C, C, R.label, fracToAngle(t.frac));
          return (
            <text key={t.frac} x={x.toFixed(1)} y={(y + 4).toFixed(1)}>{t.label}</text>
          );
        })}
      </g>
      {ghostMark}

      {/* the knob */}
      <circle cx={C} cy={C + 7} r={R.knob + 10} fill={`url(#${id('shadow')})`} />
      <motion.g
        className="dial__knob"
        initial={false}
        animate={{ rotate: -DIAL_SPAN / 2 + frac * DIAL_SPAN }}
        transition={KNOB_SPRING}
      >
        <circle cx={C} cy={C} r={R.knob} fill={`url(#${id('metal')})`} />
        <g>
          {KNURL.map((k, i) => (
            <line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} className={k.odd ? 'dial__knurl dial__knurl--odd' : 'dial__knurl'} />
          ))}
        </g>
        <circle cx={C} cy={C} r={R.face} fill={`url(#${id('face')})`} className="dial__face" />
        <g className="dial__grooves">
          {GROOVES.map((r, i) => (
            <circle key={i} cx={C} cy={C} r={r} className={i % 3 === 0 ? 'dial__groove dial__groove--deep' : 'dial__groove'} />
          ))}
        </g>
        <rect x={C - 4.6} y={C - R.face + 2.4} width="9.2" height="17" rx="4.6" className="dial__notch-halo" />
        <rect x={C - 2.4} y={C - R.face + 4.4} width="4.8" height="13" rx="2.4" className="dial__notch" />
      </motion.g>

      {/* fixed light from the top left, so it does not turn with the knob */}
      <circle cx={C} cy={C} r={R.knob} fill={`url(#${id('vignette')})`} />
      <path d={arcPath(C, C, R.knob - 0.6, 195, 285)} className="dial__rim-light" stroke={`url(#${id('sheen')})`} />
      <path d={arcPath(C, C, R.face - 1, 205, 275)} className="dial__face-light" />
      <g className="dial__brush">
        {BRUSH.map((b, i) => <path key={i} d={b.d} fill={`url(#${id(`brush${i}`)})`} />)}
      </g>
      <circle cx={C} cy={C} r={R.recess + 1.2} className="dial__recess-lip" />
      <circle cx={C} cy={C} r={R.recess} fill={`url(#${id('recess')})`} className="dial__recess" />
      <path d={arcPath(C, C, R.recess + 0.4, 25, 155)} className="dial__recess-light" />
    </svg>
  );
}

export const Instrument = memo(InstrumentImpl);
