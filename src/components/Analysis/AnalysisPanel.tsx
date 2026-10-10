// PLACEHOLDER written by the shell builder. The analysis owner replaces this file.
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { VERDICT } from '../../lib/harmony';

export interface AnalysisPanelProps {
  model: AppModel;
  onAdd(ing: Ingredient, ml: number): void;
}

export function AnalysisPanel(props: AnalysisPanelProps) {
  const { model, onAdd } = props;
  const { h } = model;
  return (
    <section
      aria-label="Score and analysis"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        borderRadius: 16,
        background: 'linear-gradient(180deg,#141922,#10141b)',
        boxShadow: 'var(--sh-2), 0 0 0 1px var(--line) inset',
        overflow: 'auto',
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 600 }}>{h ? h.score : '-'}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{VERDICT[h ? h.tier : 'none']}</div>
      <ul style={{ display: 'grid', gap: 4, color: 'var(--tx-2)' }}>
        {model.tips.map((t) => <li key={t.text}>{t.text}</li>)}
      </ul>
      <div style={{ color: 'var(--tx-3)', fontSize: 12 }}>Try adding</div>
      {model.suggestions.map((s) => (
        <button key={s.ing.id} onClick={() => onAdd(s.ing, s.ml)} style={{ textAlign: 'left' }}>
          {s.ing.name} +{s.delta}
        </button>
      ))}
    </section>
  );
}
