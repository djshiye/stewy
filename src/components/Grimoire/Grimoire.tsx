import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { CaretLeft, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { Recipe } from '../../data/types';
import { ING_BY_ID } from '../../data/ingredients';
import { VERDICT, tierFor } from '../../lib/harmony';
import { GLASS_LABEL, methodLine } from '../../lib/serve';
import { amountLabel, type UnitKey } from '../../lib/units';
import { useIsDesktop } from '../../app/useMediaQuery';
import { Glass } from '../../icons/Glass';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { classicCount, filterClassics, FILTERS, getClassics, METHOD_LABEL, scoreColor, type Classic, type FilterKey } from './classics';
import './Grimoire.css';

export interface GrimoireProps {
  open: boolean;
  /** Id of the classic currently in the pot (model.match?.recipe.id when the match is exact). */
  currentId: string | null;
  onClose(): void;
  /** Load a classic into the cauldron. The shell closes the sheet and toasts with Undo. */
  onLoad(recipe: Recipe): void;
  /** Unit for the amounts in the detail view. */
  unit?: UnitKey;
}

export function Grimoire({ open, currentId, onClose, onLoad, unit = 'oz' }: GrimoireProps) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="grimoire-title" size="grimoire" className="grim-sheet">
      <GrimoireBody currentId={currentId} onLoad={onLoad} unit={unit} />
    </Sheet>
  );
}

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function ScoreMark({ score, className }: { score: number; className?: string }) {
  return (
    <span className={['grim-score', className].filter(Boolean).join(' ')} style={{ '--tier': scoreColor(score) } as CSSProperties}>
      <i aria-hidden="true" />
      {score}
    </span>
  );
}

/* ---------- one entry of the index ---------- */

interface CellProps {
  c: Classic;
  index: number;
  selected: boolean;
  inPot: boolean;
  tabbable: boolean;
  onSelect(id: string): void;
  onActive(id: string): void;
}

const Cell = memo(function Cell({ c, index, selected, inPot, tabbable, onSelect, onActive }: CellProps) {
  const { recipe } = c;
  return (
    <li
      role="option"
      aria-selected={selected}
      aria-label={`${recipe.name}, ${METHOD_LABEL[recipe.method].toLowerCase()}, score ${c.score}${inPot ? ', in the pot' : ''}`}
      tabIndex={tabbable ? 0 : -1}
      data-id={recipe.id}
      className="grim-cell"
      style={{ '--c': c.color, '--i': Math.min(index, 14) } as CSSProperties}
      onClick={() => onSelect(recipe.id)}
      onFocus={() => onActive(recipe.id)}
    >
      <div className="grim-cell__stage">
        <Glass kind={recipe.glass} color={c.color} garnish={c.garnish} ice={c.ice} foam={c.foam} className="grim-cell__glass" />
      </div>
      <h3 className="grim-cell__name serif">{recipe.name}</h3>
      <p className="grim-cell__key">{c.key}</p>
      <div className="grim-cell__meta">
        <span>{METHOD_LABEL[recipe.method]}</span>
        <ScoreMark score={c.score} />
      </div>
      {inPot && <span className="grim-cell__pot">In the pot</span>}
    </li>
  );
});

/* ---------- detail (desktop pane, phone overlay) ---------- */

interface DetailProps {
  c: Classic;
  unit: UnitKey;
  inPot: boolean;
  onLoad(): void;
  onBack?(): void;
}

function Detail({ c, unit, inPot, onLoad, onBack }: DetailProps) {
  const { recipe } = c;
  const tier = tierFor(c.score);
  return (
    <div className="grim-detail" key={recipe.id}>
      <div className="grim-detail__scroll">
        {onBack && (
          <button type="button" className="grim-detail__back" onClick={onBack}>
            <CaretLeft size={18} aria-hidden="true" />
            Back to the index
          </button>
        )}
        <div className="grim-detail__stage" style={{ '--c': c.color } as CSSProperties}>
          <Glass kind={recipe.glass} color={c.color} garnish={c.garnish} ice={c.ice} foam={c.foam} fit className="grim-detail__glass" />
        </div>
        <h3 className="grim-detail__name serif">{recipe.name}</h3>
        <div className="grim-detail__pills">
          <ScoreMark score={c.score} className="grim-score--lg" />
          <span className="grim-detail__verdict">{VERDICT[tier]}</span>
          {inPot && <span className="grim-detail__pot">In the pot</span>}
        </div>
        <p className="grim-detail__note">{recipe.note}</p>

        <h4 className="grim-detail__h">Build</h4>
        <ul className="grim-detail__build">
          {c.brew.map((e) => {
            const ing = ING_BY_ID[e.id];
            if (!ing) return null;
            return (
              <li key={e.id}>
                <i aria-hidden="true" style={{ background: ing.color }} />
                <span>{ing.name}</span>
                <b aria-hidden="true" />
                <span className="grim-detail__amt">{amountLabel(e, ing, unit)}</span>
              </li>
            );
          })}
        </ul>

        <dl className="grim-detail__facts">
          <dt>Glass</dt>
          <dd>{sentence(GLASS_LABEL[recipe.glass])}</dd>
          <dt>Method</dt>
          <dd>{methodLine(recipe)}</dd>
          <dt>Garnish</dt>
          <dd>{recipe.garnish ?? 'None'}</dd>
        </dl>
      </div>
      <div className="grim-detail__foot">
        <Button variant="primary" size="lg" fullWidth onClick={onLoad}>
          Load into the cauldron
        </Button>
      </div>
    </div>
  );
}

/** What the pane shows before anything is picked. */
function PaneHint() {
  return (
    <div className="grim-hint">
      <div className="grim-hint__glasses" aria-hidden="true">
        <Glass kind="coupe" color="rgba(190, 205, 230, 0.5)" fill={0} className="grim-hint__g" />
        <Glass kind="rocks" color="rgba(190, 205, 230, 0.5)" fill={0} className="grim-hint__g" />
      </div>
      <p className="grim-hint__title serif">Pick a classic</p>
      <p className="grim-hint__text">Its full build, glass and method appear here, ready to load into the cauldron.</p>
    </div>
  );
}

/* ---------- the sheet's content ---------- */

function columnsOf(items: HTMLElement[]): number {
  if (!items.length) return 1;
  const top = items[0].offsetTop;
  let n = 0;
  while (n < items.length && items[n].offsetTop === top) n++;
  return Math.max(1, n);
}

function GrimoireBody({ currentId, onLoad, unit }: { currentId: string | null; onLoad(r: Recipe): void; unit: UnitKey }) {
  const desktop = useIsDesktop();
  const all = getClassics();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(currentId);
  const [detailOpen, setDetailOpen] = useState(false);
  const selRef = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const deferred = useDeferredValue(query);
  const visible = useMemo(() => filterClassics(all, filter, deferred), [all, filter, deferred]);
  const tabId = visible.some((c) => c.recipe.id === activeId) ? activeId : visible[0]?.recipe.id ?? null;
  const selected = useMemo(() => all.find((c) => c.recipe.id === selectedId) ?? null, [all, selectedId]);

  const onSelect = useCallback((id: string) => {
    setActiveId(id);
    if (selRef.current === id) {
      setDetailOpen(true); // a second tap opens the details on phones
    } else {
      selRef.current = id;
      setSelectedId(id);
    }
  }, []);
  const onActive = useCallback((id: string) => setActiveId(id), []);

  // Opening with a classic in the pot: bring its entry into view (the index stays unselected).
  useEffect(() => {
    const scroller = scrollRef.current;
    const el = currentId ? listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(currentId)}"]`) : null;
    if (!scroller || !el) return;
    const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTop = Math.max(0, top - (scroller.clientHeight - el.offsetHeight) / 2);
  }, [currentId]);

  const toTop = () => scrollRef.current?.scrollTo({ top: 0 });
  const pickFilter = (key: FilterKey) => {
    setFilter(key);
    toTop();
  };
  const reset = () => {
    setQuery('');
    setFilter('all');
    toTop();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const opt = (e.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    const list = listRef.current;
    if (!opt || !list) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(opt.dataset.id ?? '');
      return;
    }
    const items = Array.from(list.children) as HTMLElement[];
    const i = items.indexOf(opt);
    const cols = columnsOf(items);
    const last = items.length - 1;
    let next = i;
    switch (e.key) {
      case 'ArrowRight': next = Math.min(last, i + 1); break;
      case 'ArrowLeft': next = Math.max(0, i - 1); break;
      case 'ArrowDown': next = i + cols <= last ? i + cols : Math.floor(i / cols) < Math.floor(last / cols) ? last : i; break;
      case 'ArrowUp': next = Math.max(0, i - cols); break;
      case 'Home': next = 0; break;
      case 'End': next = last; break;
      default: return;
    }
    e.preventDefault();
    items[next]?.focus();
  };

  const loadSelected = () => {
    if (selected) onLoad(selected.recipe);
  };

  const total = classicCount();
  const count =
    visible.length === total ? `${total} classics` : `${visible.length} of ${total} classics`;
  const filtered = query.trim() !== '' || filter !== 'all';

  return (
    <div className="grim" data-detail={selected ? 'open' : 'none'}>
      <div className="grim__main">
        <header className="grim__head">
          <div className="grim__title">
            <h2 id="grimoire-title" className="serif" tabIndex={-1} data-autofocus={desktop ? undefined : ''}>
              The Grimoire
            </h2>
            <p aria-live="polite">{count}</p>
          </div>
          <label className="grim__search">
            <MagnifyingGlass size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              placeholder="Search by name or ingredient"
              aria-label="Search by name or ingredient"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              data-autofocus={desktop ? '' : undefined}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuery('');
                }
              }}
            />
            {query && (
              <button type="button" className="grim__clear" aria-label="Clear search" onClick={() => setQuery('')}>
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </label>
        </header>

        <div className="grim__chips" role="group" aria-label="Filter classics">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="grim-chip"
              aria-pressed={filter === f.key}
              onClick={() => pickFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grim__scroll" ref={scrollRef}>
          {visible.length ? (
            <ul
              ref={listRef}
              className="grim__grid"
              role="listbox"
              aria-label="Classics"
              onKeyDown={onKeyDown}
            >
              {visible.map((c, i) => (
                <Cell
                  key={c.recipe.id}
                  c={c}
                  index={i}
                  selected={c.recipe.id === selectedId}
                  inPot={c.recipe.id === currentId}
                  tabbable={c.recipe.id === tabId}
                  onSelect={onSelect}
                  onActive={onActive}
                />
              ))}
            </ul>
          ) : (
            <div className="grim__empty">
              <Glass kind="coupe" color="rgba(190, 205, 230, 0.5)" fill={0} className="grim__empty-glass" />
              <p className="grim__empty-title serif">
                {query.trim() ? `No classic matches \u201c${query.trim().slice(0, 24)}\u201d` : 'No classic matches that'}
              </p>
              <p className="grim__empty-text">Try a spirit, a mixer or a different filter.</p>
              {filtered && (
                <Button size="sm" onClick={reset}>
                  {query.trim() ? 'Clear search and filter' : 'Show every classic'}
                </Button>
              )}
            </div>
          )}
        </div>

        {!desktop && selected && (
          <div className="grim-bar" key={selected.recipe.id}>
            <button
              type="button"
              className="grim-bar__info"
              aria-label={`Show the build of ${selected.recipe.name}`}
              onClick={() => setDetailOpen(true)}
            >
              <Glass
                kind={selected.recipe.glass}
                color={selected.color}
                garnish={selected.garnish}
                ice={selected.ice}
                foam={selected.foam}
                fit
                className="grim-bar__glass"
              />
              <span className="grim-bar__text">
                <span className="grim-bar__name serif">{selected.recipe.name}</span>
                <span className="grim-bar__sub">
                  {METHOD_LABEL[selected.recipe.method]}
                  <ScoreMark score={selected.score} />
                </span>
              </span>
            </button>
            <Button
              variant="primary"
              size="lg"
              aria-label={`Load ${selected.recipe.name} into the cauldron`}
              onClick={loadSelected}
            >
              Load
            </Button>
          </div>
        )}
      </div>

      {desktop && (
        <aside className="grim__pane" aria-label="Classic details">
          {selected ? (
            <Detail c={selected} unit={unit} inPot={selected.recipe.id === currentId} onLoad={loadSelected} />
          ) : (
            <PaneHint />
          )}
        </aside>
      )}

      {!desktop && selected && detailOpen && (
        <aside className="grim__overlay" aria-label={`${selected.recipe.name} details`}>
          <Detail
            c={selected}
            unit={unit}
            inPot={selected.recipe.id === currentId}
            onLoad={loadSelected}
            onBack={() => setDetailOpen(false)}
          />
        </aside>
      )}
    </div>
  );
}
