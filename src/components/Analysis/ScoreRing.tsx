import { motion, useTransform } from 'motion/react';
import { tierTone } from '../../lib/profile';
import { useMotionLerp } from './useMotionLerp';
import './ScoreRing.css';

const R = 42;
const C = 2 * Math.PI * R;

interface ScoreRingProps {
  /** Null while the pot is empty. */
  score: number | null;
  /** 96 for the verdict, 64 for the mobile summary. */
  size?: 96 | 64;
  /** Shown under the numeral at 96px. */
  caption?: boolean;
}

/** The one verdict: a ring in the tier colour with a numeral that counts to the score. */
export function ScoreRing({ score, size = 96, caption = true }: ScoreRingProps) {
  const value = useMotionLerp([score ?? 0]);
  const offset = useTransform(value, (v) => C * (1 - Math.min(100, Math.max(0, v[0])) / 100));
  const numeral = useTransform(value, (v) => Math.round(v[0]));
  const tone = score === null ? null : tierTone(score);

  return (
    <div
      className="score-ring"
      data-size={size}
      data-tone={tone ?? 'none'}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
        <circle className="score-ring__track" cx="48" cy="48" r={R} />
        {score !== null && (
          <motion.circle
            className="score-ring__arc"
            cx="48"
            cy="48"
            r={R}
            strokeDasharray={C}
            style={{ strokeDashoffset: offset }}
          />
        )}
      </svg>
      <div className="score-ring__num">
        {score === null ? (
          <span className="score-ring__dash" aria-hidden="true" />
        ) : (
          <>
            <motion.b>{numeral}</motion.b>
            {caption && size === 96 && <small>of 100</small>}
          </>
        )}
      </div>
    </div>
  );
}
