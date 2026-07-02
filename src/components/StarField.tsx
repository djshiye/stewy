/* Ambient night sky — warm twinkling stars, two slow aurora blooms, and a
   handful of drifting fireflies. Generated once per mount; pure decoration,
   pointer-transparent. */
import { useMemo, type CSSProperties } from 'react';

interface Star {
  x: number; y: number; size: number; delay: number; dur: number; dim: boolean;
}
interface Firefly {
  x: number; y: number; delay: number; dur: number; dx: number;
}

export function StarField() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 54 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 1.6,
        delay: Math.random() * 6,
        dur: 2.5 + Math.random() * 4,
        dim: Math.random() < 0.5,
      })),
    [],
  );

  const flies = useMemo<Firefly[]>(
    () =>
      Array.from({ length: 7 }, () => ({
        x: 4 + Math.random() * 92,
        y: 35 + Math.random() * 60,
        delay: Math.random() * 14,
        dur: 13 + Math.random() * 9,
        dx: Math.random() * 60 - 30,
      })),
    [],
  );

  return (
    <div className="starfield" aria-hidden="true">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />
      {stars.map((s, i) => (
        <span
          key={i}
          className={`star${s.dim ? ' dim' : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          } as CSSProperties}
        />
      ))}
      {flies.map((f, i) => (
        <span
          key={i}
          className="firefly"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.dur}s`,
            '--dx': `${f.dx}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
