import { useMemo } from 'react';
import type { BrewEntry } from '../data/types';
import { resemblance, suggestions, VERDICT, type Harmony } from '../lib/harmony';
import { clamp, fitColor } from '../lib/color';
import { FlavorRadar } from './FlavorRadar';

const CIRC = 2 * Math.PI * 27; // score-ring circumference

export function HarmonyCard({ h, brew }: { h: Harmony | null; brew: BrewEntry[] }) {
  const sug = useMemo(() => suggestions(h, brew), [h, brew]);
  const match = useMemo(() => resemblance(brew), [brew]);
  const col = h ? fitColor(clamp(h.score / 100, 0, 1)) : 'rgba(255,255,255,0.2)';

  return (
    <div className="harmony-card">
      <div className="harmony-top">
        <svg className="score-ring" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="ring-bg" cx="32" cy="32" r="27" />
          <circle
            className="ring-fg"
            cx="32" cy="32" r="27"
            style={{
              strokeDasharray: CIRC,
              strokeDashoffset: h ? CIRC * (1 - h.score / 100) : CIRC,
              stroke: col,
            }}
          />
        </svg>
        <div className="score-center">
          <span className="score-value">{h ? h.score : '—'}</span>
          <span className="score-unit">/100</span>
        </div>
        <div className="harmony-meta">
          <span className="harmony-label">Harmony</span>
          <span className="harmony-verdict">{VERDICT[h ? h.tier : 'none']}</span>
          {match && (
            <span className="harmony-match" title={`${Math.round(match.sim * 100)}% match`}>
              resembles {match.recipe.name}
            </span>
          )}
        </div>
      </div>

      {h && <FlavorRadar p={h.p} />}

      <ul className="suggestions">
        {sug.map((s, i) => (
          <li key={i} className={s.kind}>{s.text}</li>
        ))}
      </ul>
    </div>
  );
}
