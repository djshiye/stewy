/* HTML effects around the pot: the room's light, steam, rising motes and the pour feedback.
   They are plain divs with gradient backgrounds, so transform and opacity animations run on the
   compositor. Positions are in viewBox units, scaled by --u (one unit in pixels, set in CSS). */
import { memo, type CSSProperties } from 'react';
import type { PourEvent } from '../../app/types';
import { f, rng } from './geometry';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** What the brew lights: bloom above the opening, a soft light shaft and the floor pool.
    One wrapper, so an empty pot can dim all of it at once. */
export const Room = memo(function Room() {
  return (
    <div className="stg-room" aria-hidden="true">
      <div className="stg-bloom" />
      <div className="stg-shaft" />
      <div className="stg-pool" />
    </div>
  );
});

/** The ember bed between the legs: fire is never visible through the brew. */
export const Embers = memo(function Embers() {
  return (
    <div className="stg-embers" aria-hidden="true">
      <i className="stg-ember-bed" />
      <i className="stg-ember-core" />
    </div>
  );
});

const STEAM: Vars[] = [
  { '--x': 326, '--y': 150, '--w': 150, '--h': 62, '--dur': '9s', '--delay': '-1s' },
  { '--x': 392, '--y': 138, '--w': 190, '--h': 74, '--dur': '11s', '--delay': '-5.5s' },
  { '--x': 452, '--y': 152, '--w': 130, '--h': 54, '--dur': '8.5s', '--delay': '-3s' },
];

const MOTES = (() => {
  const r = rng(77);
  return Array.from({ length: 6 }, (_, i): Vars => ({
    '--x': f(210 + r() * 300, 0),
    '--y': f(150 + r() * 26, 0),
    '--s': f(2 + r() * 1.6, 1),
    '--rise': f(150 + r() * 120, 0),
    '--drift': f((r() - 0.5) * 60, 0),
    '--dur': `${f(7 + r() * 5, 1)}s`,
    '--delay': `${f(-i * 1.7, 1)}s`,
  }));
})();

/** Steam as radial-gradient ellipses (no SVG filter regions), and motes of brew light. */
export const Ambient = memo(function Ambient() {
  return (
    <div className="stg-ambient" aria-hidden="true">
      {STEAM.map((s, i) => <i key={i} className="stg-steam" style={s} />)}
      {MOTES.map((m, i) => <i key={i} className="stg-mote" style={m} />)}
    </div>
  );
});

/** A droplet in the ingredient's colour falls into the surface, a ripple pair spreads, a few
    sparks leap. Mounted per PourEvent; the shell unmounts it after about 1.4 s. */
export const PourFx = memo(function PourFx({ pour }: { pour: PourEvent }) {
  const r = rng(pour.id * 9301 + 49297);
  const landX = f(360 + (r() - 0.5) * 120, 0);
  const sparks = Array.from({ length: 6 }, (_, i): Vars => {
    const dir = i % 2 ? 1 : -1;
    return {
      '--dx': f(dir * (14 + r() * 44), 0),
      '--dy': f(-(22 + r() * 34), 0),
      '--s': f(2 + r() * 1.8, 1),
      '--sd': `${f(0.7 + r() * 0.35, 2)}s`,
    };
  });
  return (
    <div className="stg-pour" style={{ '--c': pour.color, '--lx': landX } as Vars} aria-hidden="true">
      <i className="stg-flash" />
      <i className="stg-drop" />
      <i className="stg-ripple" />
      <i className="stg-ripple stg-ripple--2" />
      {sparks.map((s, i) => <i key={i} className="stg-spark" style={s} />)}
    </div>
  );
});
