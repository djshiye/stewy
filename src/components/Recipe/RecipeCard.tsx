// PLACEHOLDER written by the shell builder. The analysis owner replaces this file.
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import type { UnitKey } from '../../lib/units';
import { ING_BY_ID } from '../../data/ingredients';
import { amountLabel } from '../../lib/units';

export interface RecipeCardProps {
  model: AppModel;
  onName(name: string): void;
  onUnit(u: UnitKey): void;
  onEdit(ing: Ingredient, anchor: DOMRect | null): void;
  onSetAmount(id: string, ml: number): void;
  onRemove(id: string): void;
  onClear(): void;
  onServe(): void;
}

export function RecipeCard(props: RecipeCardProps) {
  const { model, onName, onEdit, onRemove, onClear, onServe } = props;
  return (
    <section
      aria-label="Your brew"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        borderRadius: 16,
        background: 'linear-gradient(180deg,#171a22,#10131a)',
        boxShadow: 'var(--sh-2), 0 0 0 1px var(--line) inset',
        overflow: 'auto',
      }}
    >
      <span style={{ color: 'var(--tx-3)', fontSize: 12 }}>Your brew</span>
      <input
        className="serif"
        aria-label="Drink name"
        value={model.name}
        onChange={(e) => onName(e.target.value)}
        style={{ background: 'none', border: 0, fontSize: 40, lineHeight: '44px', letterSpacing: '-0.015em' }}
      />
      <ul style={{ display: 'grid', gap: 4 }}>
        {model.brew.map((e) => {
          const ing = ING_BY_ID[e.id];
          if (!ing) return null;
          return (
            <li key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{ing.name}</span>
              <span style={{ display: 'flex', gap: 8 }}>
                <button onClick={(ev) => onEdit(ing, ev.currentTarget.getBoundingClientRect())}>
                  {amountLabel(e, ing, model.unit)}
                </button>
                <button aria-label={`Remove ${ing.name}`} onClick={() => onRemove(e.id)}>x</button>
              </span>
            </li>
          );
        })}
      </ul>
      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button
          onClick={onServe}
          disabled={!model.brew.length}
          style={{ flex: 1, height: 46, borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600, opacity: model.brew.length ? 1 : 0.4 }}
        >
          Serve
        </button>
        <button onClick={onClear} disabled={!model.brew.length} aria-label="Clear the pot" style={{ width: 46 }}>
          Clear
        </button>
      </div>
    </section>
  );
}
