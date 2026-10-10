import { memo, useMemo, useState, type CSSProperties } from 'react';
import type { Group, Ingredient } from '../data/types';
import { INGREDIENT_GROUPS, INGREDIENTS } from '../data/ingredients';
import { describe, fit, type Harmony } from '../lib/harmony';
import { fitColor } from '../lib/color';
import { IngredientIcon } from '../icons/Icons';

interface Props {
  h: Harmony | null;
  onPick: (ing: Ingredient) => void;
  onDragStart: (ing: Ingredient, ev: React.PointerEvent) => void;
}

type Tab = 'All' | Group;

export const Shelf = memo(function Shelf({ h, onPick, onDragStart }: Props) {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('All');

  const profile = h && Object.keys(h.p).length ? h.p : null;

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return INGREDIENT_GROUPS
      .filter((g) => tab === 'All' || g === tab)
      .map((group) => ({
        group,
        items: INGREDIENTS
          .filter((i) => i.group === group && (!q || i.name.toLowerCase().includes(q)))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .filter((s) => s.items.length > 0);
  }, [query, tab]);

  return (
    <aside className="panel panel-right">
      <div className="panel-head">
        <h2>Ingredients</h2>
        <span className="pill">{INGREDIENTS.length} reagents</span>
      </div>

      <div className="search-wrap">
        <input
          className="search"
          type="search"
          placeholder="Search reagents…"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="group-tabs">
        {(['All', ...INGREDIENT_GROUPS] as Tab[]).map((g) => (
          <button
            key={g}
            className={`group-tab${g === tab ? ' active' : ''}`}
            onClick={() => setTab(g)}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="fit-legend">
        <span>clashes</span>
        <span className="legend-bar" />
        <span>pairs well</span>
      </div>

      <div className={`ing-list${tab !== 'All' ? ' single' : ''}`}>
        {sections.length === 0 && (
          <p className="shelf-empty">No reagent answers to “{query}”.</p>
        )}
        {sections.map(({ group, items }) => (
          <div className="ing-section" key={group}>
            <div className="ing-section-head">
              <span>{group}</span>
              <span className="sec-count">{items.length}</span>
            </div>
            <div className="ing-grid">
              {items.map((ing) => {
                const t = fit(ing, profile);
                return (
                  <button
                    key={ing.id}
                    className={`ing-card${t != null ? ' scored' : ''}`}
                    title={`${ing.name}: ${describe(ing)}`}
                    style={{ '--fit': fitColor(t) } as CSSProperties}
                    onClick={() => onPick(ing)}
                    onPointerDown={(e) => onDragStart(ing, e)}
                  >
                    <span className="fit-dot" />
                    <span className="ing-icon"><IngredientIcon ing={ing} /></span>
                    <span className="ing-name">{ing.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
});
