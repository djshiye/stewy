// PLACEHOLDER written by the shell builder. The shelf owner replaces this file.
import { useState } from 'react';
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { INGREDIENTS, INGREDIENT_GROUPS } from '../../data/ingredients';

export interface ShelfProps {
  model: AppModel;
  variant: 'backbar' | 'dock';
  onPick(ing: Ingredient, anchor: DOMRect | null): void;
  onDragStart(ing: Ingredient, ev: React.PointerEvent): void;
  onServe(): void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export function Shelf(props: ShelfProps) {
  const { model, variant, onPick, onDragStart, onServe, searchRef } = props;
  const [group, setGroup] = useState(INGREDIENT_GROUPS[0]);
  const [q, setQ] = useState('');
  const list = q.trim()
    ? INGREDIENTS.filter((i) => i.name.toLowerCase().includes(q.trim().toLowerCase()))
    : INGREDIENTS.filter((i) => i.group === group);
  const dock = variant === 'dock';
  return (
    <section
      aria-label="Ingredients"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: dock ? '12px 16px 0' : '12px 20px 0',
        borderRadius: dock ? 0 : 16,
        background: dock ? 'transparent' : 'linear-gradient(180deg,#121720,#0d1118)',
        boxShadow: dock ? 'none' : 'var(--sh-2), 0 0 0 1px var(--line) inset',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div role="tablist" style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
          {INGREDIENT_GROUPS.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={g === group}
              onClick={() => { setGroup(g); setQ(''); }}
              style={{ padding: '6px 10px', color: g === group ? 'var(--tx-1)' : 'var(--tx-3)', whiteSpace: 'nowrap' }}
            >
              {g}
            </button>
          ))}
        </div>
        {!dock && (
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            aria-label="Search ingredients"
            style={{ width: 160, height: 32, padding: '0 10px', borderRadius: 10, background: 'rgba(7,9,13,.5)', border: '1px solid var(--line)' }}
          />
        )}
        {dock && (
          <button
            onClick={onServe}
            disabled={!model.brew.length}
            style={{ height: 32, padding: '0 14px', borderRadius: 10, background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 600, opacity: model.brew.length ? 1 : 0.4 }}
          >
            Serve
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
        {list.map((ing) => (
          <button
            key={ing.id}
            onClick={(e) => onPick(ing, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e) => onDragStart(ing, e)}
            style={{ flex: 'none', padding: '10px 12px', borderRadius: 10, boxShadow: '0 0 0 1px var(--line-2) inset', color: 'var(--tx-2)', touchAction: 'pan-x' }}
          >
            {ing.name}
          </button>
        ))}
      </div>
    </section>
  );
}
