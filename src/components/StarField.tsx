/* Ambient night sky — twinkling stars + two slow aurora blooms.
   Generated once per mount; pure decoration, pointer-transparent. */
import { useMemo, type CSSProperties } from 'react';

interface Star {
  x: number; y: number; size: number; delay: number; dur: number; dim: boolean;
}

export function StarField() {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 70 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random() * 1.6,
        delay: Math.random() * 6,
        dur: 2.5 + Math.random() * 4,
        dim: Math.random() < 0.5,
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
    </div>
  );
}
