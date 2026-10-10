// PLACEHOLDER written by the shell builder. The analysis owner replaces this file.
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { VERDICT } from '../../lib/harmony';

export interface BrewSummaryProps {
  model: AppModel;
  onShare(): void;
  onAdd(ing: Ingredient, ml: number): void;
}

export function BrewSummary(props: BrewSummaryProps) {
  const { model, onShare, onAdd } = props;
  const { h } = model;
  return (
    <section aria-label="Summary" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <b style={{ fontSize: 28 }}>{h ? h.score : '-'}</b>
        <div style={{ flex: 1 }}>
          <div className="serif" style={{ fontSize: 30, lineHeight: '34px' }}>{model.name}</div>
          <div style={{ color: 'var(--tx-2)' }}>{VERDICT[h ? h.tier : 'none']}</div>
        </div>
        <button onClick={onShare} aria-label="Share this brew">Share</button>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
        {model.suggestions.map((s) => (
          <button key={s.ing.id} onClick={() => onAdd(s.ing, s.ml)} style={{ flex: 'none', padding: '8px 12px', borderRadius: 999, boxShadow: '0 0 0 1px var(--line-2) inset' }}>
            {s.ing.name} +{s.delta}
          </button>
        ))}
      </div>
    </section>
  );
}
