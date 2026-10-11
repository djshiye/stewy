import {
  createContext,
  memo,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
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
import { useIsDesktop, useMediaQuery } from '../../app/useMediaQuery';
import { Glass } from '../../icons/Glass';
import { useScrollFade } from '../Analysis/useScrollFade';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { classicCount, filterClassics, FILTERS, getClassics, METHOD_LABEL, scoreColor, type Classic, type FilterKey } from './classics';
import { snapToRow, tailPadding } from './snapScroll';
import './Grimoire.css';

export interface GrimoireProps {
  open: boolean;
  /** Id of the classic currently in the pot (model.match?.recipe.id when the match is exact). */
  currentId: string | null;
  onClose(): void;
  /** Load a classic into the pot. The shell closes the sheet and toasts with Undo. */
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
      <span className="ui-vh">Score </span>
      {score}
    </span>
  );
}

/* ---------- deferred glasses ---------- */

/**
 * Starts a watch on an element and returns how to stop it. The callback fires once, when the element comes
 * near the scroller; `early` is true when that was found before the first paint (see `sweep`).
 */
type Watch = (el: Element, onNear: (early: boolean) => void) => () => void;

/** How far beyond the scroller (as a share of its height, above and below) a cell counts as near. */
const NEAR = '100% 0px';

/**
 * One IntersectionObserver for the whole index. Each cell's glass is a hand-built SVG of ~140 nodes, so
 * drawing all of them up front dominated the time to open; they are drawn when their cell comes within
 * a screen of the scroller instead. Null where IntersectionObserver
 * does not (jsdom), in which case every glass is drawn straight away.
 */
function makeGate(): { watch: Watch; setRoot(el: Element | null): void; sweep(): void; dispose(): void } | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  let io: IntersectionObserver | null = null;
  let root: Element | null = null;
  const waiting = new Map<Element, (early: boolean) => void>();
  // The root (the scroller) is only known once its ref attaches, which is after its cells' layout effects.
  const start = () => {
    if (!root) return;
    io ??= new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const fn = e.isIntersecting ? waiting.get(e.target) : undefined;
          if (!fn) continue;
          waiting.delete(e.target);
          io?.unobserve(e.target);
          fn(false);
        }
      },
      { root, rootMargin: NEAR },
    );
    for (const el of waiting.keys()) io.observe(el);
  };
  const watch: Watch = (el, onNear) => {
    waiting.set(el, onNear);
    start();
    return () => {
      waiting.delete(el);
      io?.unobserve(el);
    };
  };
  return {
    watch,
    setRoot(el) {
      if (!el || el === root) return;
      root = el;
      io?.disconnect();
      io = null;
      start();
    },
    // The observer reports a frame late, so cells that are in view right now (the screenful at open, after
    // the pre-scroll) are found here by geometry instead, in a layout effect, and drawn before the first paint.
    sweep() {
      if (!root) return;
      const r = root.getBoundingClientRect();
      for (const [el, fn] of [...waiting]) {
        const b = el.getBoundingClientRect();
        if (b.bottom < r.top || b.top > r.bottom) continue;
        waiting.delete(el);
        io?.unobserve(el);
        fn(true);
      }
    },
    dispose() {
      io?.disconnect();
      io = null;
      waiting.clear();
    },
  };
}

const GlassGate = createContext<Watch | null>(null);

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
  const watch = useContext(GlassGate);
  const ref = useRef<HTMLLIElement>(null);
  // 'first': drawn with the cell; 'late': drawn after it came near (fades in); 'none': not yet.
  const [glass, setGlass] = useState<'none' | 'first' | 'late'>(!watch || inPot ? 'first' : 'none');
  useLayoutEffect(() => {
    const el = ref.current;
    if (glass !== 'none' || !watch || !el) return;
    return watch(el, (early) => setGlass(early ? 'first' : 'late'));
  }, [glass, watch]);
  return (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      data-id={recipe.id}
      className="grim-cell"
      style={{ '--c': c.color, '--i': Math.min(index, 14) } as CSSProperties}
      onClick={() => onSelect(recipe.id)}
      onFocus={() => onActive(recipe.id)}
    >
      <div className="grim-cell__stage">
        {glass === 'none' ? (
          <span className="grim-cell__glass grim-cell__glass--ph" aria-hidden="true" />
        ) : (
          <Glass
            kind={recipe.glass}
            color={c.color}
            garnish={c.garnish}
            ice={c.ice}
            foam={c.foam}
            className={glass === 'late' ? 'grim-cell__glass grim-cell__glass--in' : 'grim-cell__glass'}
          />
        )}
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

/** Keyed by the classic at the call sites: a pick remounts it, which restarts the fade-in and the scroll fade's watch. */
function Detail({ c, unit, inPot, onLoad, onBack }: DetailProps) {
  const { recipe } = c;
  const tier = tierFor(c.score);
  const scrollRef = useScrollFade<HTMLDivElement>();
  return (
    <div className="grim-detail">
      <div className="grim-detail__scroll" ref={scrollRef}>
        <div className="grim-detail__lead">
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
          Load into the pot
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
      <p className="grim-hint__text">Its full build, glass and method appear here, ready to load into the pot.</p>
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

/** A real mouse or trackpad: only then does opening the sheet focus the search field. A touch screen (an iPad with the
 *  desktop layout, as much as a phone) would raise its keyboard over the index, so the title takes the focus instead. */
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** A phone on its side: the same query as the landscape block of Grimoire.css, where the selection bar is a column beside the index. */
const LANDSCAPE_PHONE = '(max-width: 999px) and (orientation: landscape) and (max-height: 500px)';

function GrimoireBody({ currentId, onLoad, unit }: { currentId: string | null; onLoad(r: Recipe): void; unit: UnitKey }) {
  const desktop = useIsDesktop();
  const finePointer = useMediaQuery(FINE_POINTER);
  const focusSearch = desktop && finePointer; // phones keep the title whatever the pointer
  const landscape = useMediaQuery(LANDSCAPE_PHONE) && !desktop;
  const all = getClassics();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(currentId);
  const [detailOpen, setDetailOpen] = useState(false);
  const selRef = useRef<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOverlay = useRef(false);

  const [gate] = useState(makeGate);
  const scrollEl = useCallback(
    (el: HTMLDivElement | null) => {
      scrollRef.current = el;
      gate?.setRoot(el);
    },
    [gate],
  );
  useEffect(() => () => gate?.dispose(), [gate]);

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

  // The phone overlay behaves like a nested dialog: the index goes inert, focus moves in, Tab stays
  // inside (Back, Load and the sheet's Close), and Esc steps back to the index instead of closing the sheet.
  const overlayOpen = !desktop && selected !== null && detailOpen;
  useEffect(() => {
    if (!overlayOpen) {
      if (wasOverlay.current) {
        wasOverlay.current = false;
        const opener = openerRef.current;
        const back = opener?.isConnected ? opener : listRef.current?.querySelector<HTMLElement>('[tabindex="0"]');
        back?.focus({ preventScroll: true });
      }
      return;
    }
    wasOverlay.current = true;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = overlayRef.current;
    overlay?.querySelector<HTMLElement>('.grim-detail__back')?.focus({ preventScroll: true });
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setDetailOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !overlay) return;
      const close = overlay.closest('[role="dialog"]')?.querySelector<HTMLElement>('.ui-sheet__close');
      const list = [...overlay.querySelectorAll<HTMLElement>('button:not([disabled])'), ...(close ? [close] : [])];
      if (!list.length) return;
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : i < 0 || i === list.length - 1 ? 0 : i + 1;
      e.preventDefault();
      e.stopPropagation();
      list[next].focus();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [overlayOpen]);

  // a filter or a search replaces the list: drop the room the opening scroll left below the last row
  useLayoutEffect(() => {
    if (listRef.current) listRef.current.style.paddingBottom = '';
  }, [visible]);

  // Opening with a classic in the pot: bring its entry into view (the index stays unselected).
  // A layout effect, so the first painted frame is already scrolled.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const list = listRef.current;
    const el = currentId ? list?.querySelector<HTMLElement>(`[data-id="${CSS.escape(currentId)}"]`) : null;
    if (!scroller || !list || !el) return;
    // The sheet's first layout is not its final one: off-screen cells collapse to their estimated height
    // (content-visibility) a moment after opening, and cells near the view swap their estimate for their real
    // height, which moves the rows without changing the grid's own height (so nothing observes it). So aim
    // again on every frame until the user takes over or the layout has had time to settle. Offsets, not rects:
    // the sheet is still scaling in while this runs.
    const aim = () => {
      const items = Array.from(list.children) as HTMLElement[];
      const origin = items[0]?.offsetTop ?? 0;
      const rowTops = [...new Set(items.map((c) => c.offsetTop - origin))].sort((a, b) => a - b);
      const cellTop = el.offsetTop - origin;
      // The grid's own height, from offsets: scrollHeight also counts the 8px the cells are still sliding up
      // by (grim-in), which would put the scroll limit that far out for the first few frames.
      const last = items[items.length - 1];
      const content = last.offsetTop + last.offsetHeight - origin;
      // a viewport just over two rows stops a little short of the last row: give it the room to land on
      const room = tailPadding(rowTops, cellTop, el.offsetHeight, scroller.clientHeight, content);
      if (room !== (parseFloat(list.style.paddingBottom) || 0)) list.style.paddingBottom = room ? `${room}px` : '';
      // centre the cell, then land on a row boundary so the first visible row is whole
      scroller.scrollTop = snapToRow(rowTops, cellTop, el.offsetHeight, scroller.clientHeight, content + room - scroller.clientHeight);
    };
    aim();
    let frame = 0;
    const loop = () => {
      aim();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const stop = () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
    const timer = setTimeout(stop, 1200);
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
    for (const e of events) scroller.addEventListener(e, stop, { once: true, passive: true });
    return () => {
      stop();
      for (const e of events) scroller.removeEventListener(e, stop);
    };
  }, [currentId]);
  // A pick on a phone: the bar that appears for it takes room from the index (under it in portrait, beside it in
  // landscape), so the tapped cell can end up cut by the index's edge. Scroll it whole into view, with the
  // index's scroll padding (a little air below, none above). A cell taller than the room keeps its top.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const el = selectedId && !desktop ? listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`) : null;
    if (!scroller || !el) return;
    const bring = () => {
      const view = scroller.getBoundingClientRect();
      const cell = el.getBoundingClientRect();
      const scale = view.height / scroller.clientHeight || 1; // the sheet is still scaling in just after it opens
      const pad = parseFloat(getComputedStyle(scroller).scrollPaddingBottom) || 0;
      let by = 0;
      if (cell.top < view.top) by = cell.top - view.top;
      else if (cell.bottom > view.bottom - pad) {
        // the least that shows the cell whole, and no more than its own top: land on the first row top in that
        // range, so no sliver of the row above stays under the header
        const least = cell.bottom - (view.bottom - pad);
        const most = cell.top - view.top;
        const tops = Array.from(listRef.current!.children, (c) => c.getBoundingClientRect().top - view.top);
        const row = Math.min(...tops.filter((t) => t >= least - 0.5 && t <= most + 0.5), Infinity);
        by = Number.isFinite(row) ? row : Math.min(least, most);
      }
      if (Math.abs(by) >= 1) scroller.scrollTop += by / scale;
    };
    bring();
    // the rows can still settle (content-visibility) once the scroll has moved new cells into view
    const frame = requestAnimationFrame(bring);
    return () => cancelAnimationFrame(frame);
  }, [selectedId, desktop]);
  // after the pre-scroll above: draw the glasses already in view before the first paint
  useLayoutEffect(() => gate?.sweep(), [gate]);

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
      <div className="grim__main" inert={overlayOpen}>
        <header className="grim__head">
          <div className="grim__title">
            <h2 id="grimoire-title" className="serif" tabIndex={-1} data-autofocus={focusSearch ? undefined : ''}>
              The Grimoire
            </h2>
            <p aria-live="polite">{count}</p>
          </div>
          <label className="grim__search">
            <MagnifyingGlass size={18} aria-hidden="true" />
            <input
              type="text"
              value={query}
              placeholder="Try gin or negroni…"
              aria-label="Search by name or ingredient"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="search"
              data-autofocus={focusSearch ? '' : undefined}
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

        <div className="grim__scroll" ref={scrollEl}>
          {visible.length ? (
            <GlassGate.Provider value={gate?.watch ?? null}>
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
            </GlassGate.Provider>
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

        {/* the bar's column is there from the start in landscape, so the first pick does not move the index */}
        {landscape && !selected && (
          <div className="grim-side">
            <PaneHint />
          </div>
        )}
        {!desktop && selected && (
          <div className="grim-bar" key={selected.recipe.id}>
            <button
              type="button"
              className="grim-bar__info"
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
              <span className="ui-vh">, show the build</span>
            </button>
            <Button
              variant="primary"
              size="lg"
              aria-label={`Load ${selected.recipe.name} into the pot`}
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
            <Detail key={selected.recipe.id} c={selected} unit={unit} inPot={selected.recipe.id === currentId} onLoad={loadSelected} />
          ) : (
            <PaneHint />
          )}
        </aside>
      )}

      {overlayOpen && selected && (
        <aside className="grim__overlay" ref={overlayRef} aria-label={`${selected.recipe.name} details`}>
          <Detail
            key={selected.recipe.id}
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
