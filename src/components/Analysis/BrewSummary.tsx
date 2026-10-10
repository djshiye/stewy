import { Export } from '@phosphor-icons/react';
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { VERDICT } from '../../lib/harmony';
import { tierTone } from '../../lib/profile';
import { IngredientIcon } from '../../icons/Icons';
import { IconButton } from '../ui/IconButton';
import { ScoreRing } from './ScoreRing';
import { suggestionAmount, suggestionName, worthAdding } from './suggestions';
import './BrewSummary.css';

export interface BrewSummaryProps {
  model: AppModel;
  onShare(): void;
  onAdd(ing: Ingredient, ml: number): void;
}

/** Phones only, directly under the pot: one verdict, then a strip of things worth adding. */
export function BrewSummary({ model, onShare, onAdd }: BrewSummaryProps) {
  const { h, unit } = model;
  const score = h?.score ?? null;
  const suggestions = worthAdding(model.suggestions);
  const tone = score === null ? 'none' : tierTone(score);
  return (
    <section className="bs" aria-label="Summary">
      <div className="bs__top">
        <ScoreRing score={score} size={64} />
        <div className="bs__text">
          <h2 className="bs__name serif">{model.name}</h2>
          <p className="bs__tier" data-tone={tone}>
            <i aria-hidden="true" />
            {VERDICT[h ? h.tier : 'none']}
          </p>
        </div>
        <IconButton
          label="Share this brew"
          icon={<Export size={20} />}
          size="lg"
          disabled={!h}
          onClick={onShare}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="bs__try">
          <span className="bs__try-label" id="bs-try">Try adding</span>
          <ul className="bs__chips" aria-labelledby="bs-try">
            {suggestions.map((s) => (
              <li key={s.ing.id}>
                <button
                  type="button"
                  className="chip"
                  onClick={() => onAdd(s.ing, s.ml)}
                  aria-label={`Add ${suggestionAmount(s, unit)} ${s.ing.name}, raises the score by ${s.delta}`}
                >
                  <span className="chip__tile"><IngredientIcon ing={s.ing} /></span>
                  <span className="chip__name">{suggestionName(s)}</span>
                  <b className="chip__delta">+{s.delta}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
