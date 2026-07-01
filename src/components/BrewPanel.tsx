import type { Dispatch } from 'react';
import type { BrewAction, BrewState } from '../store';
import type { Harmony } from '../lib/harmony';
import { ING_BY_ID } from '../data/ingredients';
import { amountLabel, trim, UNITS } from '../lib/units';
import { IngredientIcon } from '../icons/Icons';
import { HarmonyCard } from './HarmonyCard';

interface Props {
  state: BrewState;
  dispatch: Dispatch<BrewAction>;
  h: Harmony | null;
}

export function BrewPanel({ state, dispatch, h }: Props) {
  const { brew, unit } = state;
  const totalMl = brew.reduce((s, e) => s + e.ml, 0);
  const alc = brew.reduce((s, e) => s + e.ml * (ING_BY_ID[e.id]?.abv ?? 0), 0);
  const abv = totalMl > 0 ? alc / totalMl : 0;
  const u = UNITS[unit];
  const volLabel = unit === 'parts'
    ? `${Math.round(totalMl)} ml`
    : `${trim(totalMl / u.toMl, u.dec)} ${u.label}`;

  return (
    <aside className="panel panel-left">
      <div className="panel-head">
        <h2>Your Brew</h2>
        <span className="pill">{brew.length} reagent{brew.length === 1 ? '' : 's'}</span>
      </div>

      {brew.length === 0 ? (
        <p className="brew-empty">
          The cauldron is empty. Drag a reagent in from the shelf, or load a
          recipe from the Grimoire.
        </p>
      ) : (
        <ul className="brew-list">
          {brew.map((e) => {
            const ing = ING_BY_ID[e.id];
            if (!ing) return null;
            return (
              <li className="brew-row" key={e.id}>
                <span className="br-icon"><IngredientIcon ing={ing} /></span>
                <span className="br-mid">
                  <span className="br-name">{ing.name}</span>
                  <span className="br-amt">{amountLabel(e, ing, unit)}</span>
                </span>
                <span className="br-ctrls">
                  <button className="br-btn" title="Less" aria-label={`Less ${ing.name}`}
                    onClick={() => dispatch({ type: 'nudge', id: e.id, dir: -1 })}>−</button>
                  <button className="br-btn" title="More" aria-label={`More ${ing.name}`}
                    onClick={() => dispatch({ type: 'nudge', id: e.id, dir: 1 })}>+</button>
                  <button className="br-btn br-del" title="Remove" aria-label={`Remove ${ing.name}`}
                    onClick={() => dispatch({ type: 'remove', id: e.id })}>×</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="totals">
        <div className="total-item">
          <span className="total-label">Volume</span>
          <span className="total-val">{volLabel}</span>
        </div>
        <div className="total-item">
          <span className="total-label">Potency</span>
          <span className="total-val">{Math.round(abv)}% ABV</span>
        </div>
      </div>

      <HarmonyCard h={h} brew={brew} />
    </aside>
  );
}
