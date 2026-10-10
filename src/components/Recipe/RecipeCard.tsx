import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDown, Martini, PencilSimple, Trash, X } from '@phosphor-icons/react';
import type { Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { ING_BY_ID } from '../../data/ingredients';
import { GLASS_LABEL } from '../../lib/serve';
import { UNIT_ORDER, UNITS, totalLabel, type UnitKey } from '../../lib/units';
import {
  METHOD_AFTER, METHOD_SENTENCE, METHOD_TIME, METHOD_VERB,
} from '../../lib/profile';
import { useIsDesktop } from '../../app/useMediaQuery';
import { IngredientIcon } from '../../icons/Icons';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Segmented } from '../ui/Segmented';
import { useScrollFade } from '../Analysis/useScrollFade';
import { describeIngredient } from '../Dial/describe';
import { MeasurePill } from './MeasurePill';
import { useRowFit } from './useRowFit';
import './RecipeCard.css';

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

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;

const UNIT_OPTIONS = UNIT_ORDER.map((u) => ({ value: u, label: UNITS[u].label }));

const ARCHETYPE_LINE = {
  sour: 'A sour, sharp and sweet in balance.',
  'spirit-forward': 'Spirit-forward and aromatic.',
  highball: 'A long, tall drink.',
  sparkling: 'Bright and sparkling.',
  dessert: 'Rich, creamy and dessert-like.',
} as const;

/** The one line under the title. */
function subLine(model: AppModel): string {
  const { h, method, brew } = model;
  // a brew that clashes or scores poorly is not "close to" anything, whatever its quantities say
  const match = h && h.parts.clash > -20 && h.score >= 40 ? model.match : null;
  if (match && match.sim >= 0.98) {
    const same = match.recipe.name.toLowerCase() === model.name.trim().toLowerCase();
    return `Recognised classic${same ? '' : `: ${match.recipe.name}`}. ${METHOD_SENTENCE[method]}`;
  }
  if (brew.length === 1) return 'A single pour.';
  const lead = match
    ? `Close to a ${match.recipe.name}.`
    : h?.archetype
      ? ARCHETYPE_LINE[h.archetype]
      : 'Your own brew.';
  return `${lead} ${METHOD_SENTENCE[method]}`;
}

function serveLabel(glass: AppModel['glass']): string {
  const g = GLASS_LABEL[glass];
  return `Serve in ${/^[aeiou]/.test(g) ? 'an' : 'a'} ${g}`;
}

/** Long names step down a size so a title stays on one line where it can. */
const titleSize = (name: string) => (name.length <= 13 ? 'lg' : name.length <= 17 ? 'md' : 'sm');

/** The brew name: click to edit, Enter or blur commits, Esc cancels. */
function Title({ name, onName, compact }: { name: string; onName(n: string): void; compact: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const input = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const refocus = useRef(false);
  const hintId = useId();

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    } else if (refocus.current) {
      refocus.current = false;
      button.current?.focus();
    }
  }, [editing]);

  const begin = () => {
    cancelled.current = false;
    setDraft(name);
    setEditing(true);
  };

  const commit = () => {
    if (cancelled.current) return;
    const next = draft.trim();
    if (next && next !== name) onName(next);
    setEditing(false);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      refocus.current = true;
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancelled.current = true;
      refocus.current = true;
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={input}
        className="rc__title rc__title--input serif"
        data-size={titleSize(draft)}
        data-compact={compact ? '' : undefined}
        aria-label="Brew name"
        value={draft}
        maxLength={40}
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
      />
    );
  }

  return (
    <>
      <h2 className="rc__heading" data-compact={compact ? '' : undefined} data-size={titleSize(name)}>
        <button
          ref={button}
          type="button"
          className="rc__title serif"
          // phones show only "Rename", so the name must lead with it; on desktop the heading keeps the plain name
          aria-label={compact ? `Rename ${name}` : undefined}
          aria-describedby={compact ? undefined : hintId}
          onClick={begin}
        >
          {compact ? (
            <>
              <PencilSimple size={16} aria-hidden="true" />
              <span className="rc__rename">Rename</span>
            </>
          ) : (
            <>
              <span className="rc__name">{name}</span>
              <PencilSimple className="rc__pencil" size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </h2>
      {!compact && <span id={hintId} className="ui-vh">Click to rename</span>}
    </>
  );
}

export function RecipeCard(props: RecipeCardProps) {
  const { model, onName, onUnit, onEdit, onSetAmount, onRemove, onClear, onServe } = props;
  const { brew, unit, stats, method } = model;
  const desktop = useIsDesktop();
  const empty = brew.length === 0;
  const rowsRef = useScrollFade<HTMLDivElement>();
  const wrapRef = useRef<HTMLDivElement>(null);

  const rows = brew.flatMap((e) => {
    const ing = ING_BY_ID[e.id];
    return ing ? [{ e, ing }] : [];
  });
  const liquids = rows.filter((r) => !r.ing.unit);
  const count = rows.length;
  const { density, overflow, hidden, showMore } = useRowFit(wrapRef, rowsRef, count, desktop);

  const open = (ing: Ingredient, el: HTMLElement) => {
    const row = el.closest('[data-row]') ?? el;
    onEdit(ing, row.getBoundingClientRect());
  };

  return (
    <section className="rc" aria-label="Your brew" data-empty={empty ? '' : undefined}>
      <header className="rc__head">
        <div className="rc__meta">
          <span className="rc__label">Your brew</span>
          <span className="rc__count">{count === 0 ? 'Empty' : `${count} ${count === 1 ? 'item' : 'items'}`}</span>
          {!desktop && (
            <Segmented
              className="rc__units"
              size="sm"
              aria-label="Measuring unit"
              options={UNIT_OPTIONS}
              value={unit}
              onChange={onUnit}
            />
          )}
        </div>
        <Title name={model.name} onName={onName} compact={!desktop} />
        <p className="rc__sub">
          {empty
            ? `${desktop ? 'Drag a bottle up into the pot' : 'Tap a bottle below'}, or open the Grimoire to start from a classic.`
            : subLine(model)}
        </p>
        {liquids.length > 0 && (
          <div className="rc__strip" role="img" aria-label="Proportions of the liquids">
            <AnimatePresence initial={false}>
              {liquids.map(({ e, ing }) => (
                <motion.span
                  key={e.id}
                  layout
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  exit={{ opacity: 0, scaleX: 0.4 }}
                  transition={SPRING}
                  style={{ flexGrow: e.ml, backgroundColor: ing.color, borderRadius: 3 }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </header>

      <div className="rc__rowwrap" ref={wrapRef} data-overflow={overflow ? '' : undefined}>
      <div className="rc__rows" ref={rowsRef} data-density={density}>
        {empty ? (
          <ul className="rc__ghosts" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="ghost" style={{ opacity: 1 - i * 0.3 }}>
                <span className="ghost__tile" />
                <span className="ghost__lines"><i /><i /></span>
                <span className="ghost__pill" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="rc__list">
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map(({ e, ing }) => (
                <motion.li
                  key={e.id}
                  className="row"
                  data-row=""
                  layout="position"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={SPRING}
                >
                  <div className="row__tile">
                    <IngredientIcon ing={ing} />
                    <i className="row__dot" style={{ backgroundColor: ing.color }} aria-hidden="true" />
                    <button
                      type="button"
                      className="row__remove"
                      aria-label={`Remove ${ing.name}`}
                      onClick={() => onRemove(e.id)}
                    >
                      <X size={12} weight="bold" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="row__text">
                    <span className="row__name">{ing.name}</span>
                    <span className="row__desc">{describeIngredient(ing)}</span>
                  </div>
                  <MeasurePill
                    ing={ing}
                    ml={e.ml}
                    unit={unit}
                    onSet={(ml) => onSetAmount(e.id, ml)}
                    onOpen={(el) => open(ing, el)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
      <button
        type="button"
        className="rc__more"
        data-show={hidden > 0 ? '' : undefined}
        aria-label={`Show ${hidden} more ${hidden === 1 ? 'ingredient' : 'ingredients'}`}
        tabIndex={hidden > 0 ? 0 : -1}
        aria-hidden={hidden > 0 ? undefined : true}
        onClick={showMore}
      >
        {hidden} more
        <CaretDown size={12} weight="bold" aria-hidden="true" />
      </button>
      </div>

      <footer className="rc__foot">
        <dl className="stats">
          <div className="stat">
            <dt>Volume</dt>
            <dd>{totalLabel(stats.volumeMl, unit)}</dd>
            <dd className="stat__sub">
              <small>
                {unit === 'ml' ? `${Math.round(stats.finalVolumeMl)} ml served` : `${Math.round(stats.volumeMl)} ml`}
              </small>
            </dd>
          </div>
          <div className="stat">
            <dt>Strength</dt>
            <dd>
              {Math.round(stats.finalAbv)}%<span className="stat__unit"> ABV</span>
            </dd>
            <dd className="stat__sub"><small>{empty ? 'no alcohol yet' : METHOD_AFTER[method]}</small></dd>
          </div>
          <div className="stat">
            <dt>Method</dt>
            <dd>{empty ? 'None' : METHOD_VERB[method]}</dd>
            <dd className="stat__sub"><small>{empty ? 'no method yet' : METHOD_TIME[method]}</small></dd>
          </div>
        </dl>
        <div className="rc__actions">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Martini size={20} />}
            disabled={empty}
            onClick={onServe}
          >
            {empty ? 'Serve' : serveLabel(model.glass)}
          </Button>
          <IconButton
            variant="outline"
            size="lg"
            label="Clear the pot"
            tooltip="Clear"
            icon={<Trash size={19} />}
            disabled={empty}
            onClick={onClear}
          />
        </div>
      </footer>
    </section>
  );
}
