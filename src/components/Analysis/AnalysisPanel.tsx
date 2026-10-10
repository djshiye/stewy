import type { CSSProperties } from 'react';
import { Plus } from '@phosphor-icons/react';
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { VERDICT } from '../../lib/harmony';
import {
  STRENGTH, balancePosition, balanceWord, breakdown, signed, strengthPosition, strengthZone,
  structureNote, tierTone, TIER_STOPS, METHOD_AFTER, type StrengthZone,
} from '../../lib/profile';
import { IngredientIcon } from '../../icons/Icons';
import { ScoreRing } from './ScoreRing';
import { useScrollFade } from './useScrollFade';
import { Radar } from './Radar';
import { suggestionAmount, suggestionName } from './suggestions';
import './Analysis.css';

export interface AnalysisPanelProps {
  model: AppModel;
  onAdd(ing: Ingredient, ml: number): void;
}

const ZONES: StrengthZone[] = ['light', 'classic', 'strong'];
const pos = (p: number) => ({ '--p': p }) as CSSProperties;

export function AnalysisPanel({ model, onAdd }: AnalysisPanelProps) {
  const { h, unit } = model;
  const bodyRef = useScrollFade<HTMLDivElement>();
  const score = h?.score ?? null;
  const tone = score === null ? null : tierTone(score);
  const headline = model.tips[0];
  const notes = model.tips.slice(1);
  const b = h ? breakdown(h.parts, h.score) : null;
  const struct = h && b ? structureNote(b.rows[2].value, h.archetype) : null;
  const abv = model.stats.finalAbv;
  const zone = strengthZone(abv);

  return (
    <section className="ap" aria-label="Score and analysis" data-empty={h ? undefined : ''}>
      <div className="ap__body" ref={bodyRef}>
        <header className="ap__hero">
          <ScoreRing score={score} />
          <div className="ap__verdict">
            <h2 className="ap__title">{VERDICT[h ? h.tier : 'none']}</h2>
            {headline && <p className="ap__line" data-kind={headline.kind}>{headline.text}</p>}
            {score !== null && (
              <div className="tier-track" style={pos(score / 100)} role="img" aria-label={`Score ${score} of 100`}>
                <span className="tier-track__seg" data-tone="bad" style={{ flexGrow: TIER_STOPS.warn }} />
                <span className="tier-track__seg" data-tone="warn" style={{ flexGrow: TIER_STOPS.good - TIER_STOPS.warn }} />
                <span className="tier-track__seg" data-tone="good" style={{ flexGrow: 100 - TIER_STOPS.good }} />
                <span className="tier-track__mark" data-tone={tone} />
              </div>
            )}
          </div>
        </header>

        <div className="ap__why">
          <h2 className="ap__why-title">Why it scores</h2>
          {headline && <p className="ap__why-line">{headline.text}</p>}
        </div>

        <div className="ap__profile">
          <Radar p={h?.p ?? null} />
          {b && (
            <ul className="ap__parts" aria-label="Score breakdown">
              {b.rows.map((r) => (
                <li key={r.key} className="part" data-neg={r.value < 0 ? '' : undefined}>
                  <span className="part__label">{r.label}</span>
                  <b className="part__value">{r.value === 0 && r.key === 'penalties' ? 'None' : signed(r.value)}</b>
                  <span className="part__bar" aria-hidden="true">
                    <i style={{ transform: `scaleX(${Math.min(1, Math.abs(r.value) / 30)})` }} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {b && (
          <div className="ap__sum eq">
            <div className="eq__row">
              <span className="eq__label">It adds up</span>
              <span className="eq__sum">
                {b.equation.replace(/ = .*/, ' = ')}
                <b>{b.total}</b>
                {b.clampNote && <span className="eq__note">, {b.clampNote}</span>}
              </span>
              <span className="ui-vh">Base {b.base}, then pairing, balance, structure and penalties.</span>
            </div>
            {(struct || b.penalties.length > 0) && (
              <ul className="notes">
                {struct && <li>{struct}.</li>}
                {b.penalties.slice(0, 2).map((p) => (
                  <li key={p.key} data-clash={p.key === 'clash' ? '' : undefined}>
                    {p.key === 'clash' && <span className="clash-mark" aria-hidden="true" />}
                    {p.label} {signed(p.value)}.
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="ap__meters">
          <div className="meter" role="group" aria-label="Balance">
            <span className="meter__label">Balance</span>
            <b className="meter__value">{h ? balanceWord(h.balance) : 'Waiting'}</b>
            <div className="meter__lane" style={h?.balance != null ? pos(balancePosition(h.balance)) : undefined}>
              <span className="meter__mid" />
              {h?.balance != null && <span className="meter__mark" />}
            </div>
            <div className="meter__ends"><span>Sweet</span><span>Sour and bitter</span></div>
          </div>

          <div className="meter" role="group" aria-label="Strength">
            <span className="meter__label">Strength</span>
            <b className="meter__value">
              {h ? (
                <>
                  {Math.round(abv)}% ABV <span>{METHOD_AFTER[model.method]}</span>
                </>
              ) : (
                'Waiting'
              )}
            </b>
            <div className="meter__lane meter__lane--zones" style={h ? pos(strengthPosition(abv)) : undefined}>
              {ZONES.map((z) => (
                <span key={z} className="meter__zone" data-on={h && zone === z ? '' : undefined} />
              ))}
              {h && <span className="meter__mark" />}
            </div>
            <div className="meter__zones">
              {ZONES.map((z) => (
                <span key={z} data-on={h && zone === z ? '' : undefined}>
                  {z === 'light' ? 'Light' : z === 'classic' ? 'Classic' : 'Strong'}
                </span>
              ))}
            </div>
            <span className="ui-vh">
              Light is under {STRENGTH.classic} percent and strong is {STRENGTH.strong} percent or more.
            </span>
          </div>
        </div>

        {h && (
          <div className="ap__try">
            <h3 className="ap__h">Try adding</h3>
            {model.suggestions.length > 0 ? (
              <ul className="try">
                {model.suggestions.map((s) => {
                  const name = suggestionName(s);
                  const amount = suggestionAmount(s, unit);
                  return (
                    <li key={s.ing.id}>
                      <button
                        type="button"
                        className="try__row"
                        onClick={() => onAdd(s.ing, s.ml)}
                        aria-label={`Add ${amount} ${s.ing.name}, raises the score by ${s.delta}`}
                      >
                        <span className="try__tile"><IngredientIcon ing={s.ing} /></span>
                        <span className="try__text">
                          <span className="try__name">{name}</span>
                          <span className="try__amt">{amount}</span>
                        </span>
                        <span className="try__delta">+{s.delta}</span>
                        <span className="try__add" aria-hidden="true"><Plus size={14} weight="bold" /></span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ap__none">No single addition raises this score.</p>
            )}
          </div>
        )}

        {notes.length > 0 && (
          <div className="ap__tips">
            <h3 className="ap__h">Tips</h3>
            <ul>
              {notes.map((t) => (
                <li key={t.text} data-kind={t.kind}>
                  {t.kind === 'bad' && <span className="clash-mark" aria-hidden="true" />}
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
