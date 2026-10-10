import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { motion } from 'motion/react';
import { CaretLeft, CaretRight, MagnifyingGlass, Minus, X } from '@phosphor-icons/react';
import type { Group, Ingredient } from '../../data/types';
import type { AppModel } from '../../app/types';
import { INGREDIENTS, INGREDIENT_GROUPS } from '../../data/ingredients';
import { amountLabel } from '../../lib/units';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Bottle } from './Bottle';
import { flavourNotes, searchIngredients, sentence, deltaWords, indicatorFor } from './shelfUtils';
import { prefersReducedMotion, useScrollEdges } from './useScrollEdges';
import './Shelf.css';

export interface ShelfProps {
  model: AppModel;
  variant: 'backbar' | 'dock';
  onPick(ing: Ingredient, anchor: DOMRect | null): void;
  onDragStart(ing: Ingredient, ev: React.PointerEvent): void;
  onServe(): void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

interface Tip {
  ing: Ingredient;
  /** viewport x of the bottle centre and y of its top */
  x: number;
  y: number;
  via: 'hover' | 'focus';
}

const GROUP_COUNT = Object.fromEntries(
  INGREDIENT_GROUPS.map((g) => [g, INGREDIENTS.filter((i) => i.group === g).length]),
) as Record<Group, number>;

const BY_GROUP = Object.fromEntries(
  INGREDIENT_GROUPS.map((g) => [g, INGREDIENTS.filter((i) => i.group === g)]),
) as Record<Group, Ingredient[]>;

export function Shelf({ model, variant, onPick, onDragStart, onServe, searchRef }: ShelfProps) {
  const dock = variant === 'dock';
  const uid = useId();
  const panelId = `${uid}-panel`;
  const tabId = (g: Group) => `${uid}-tab-${g}`;

  const [group, setGroup] = useState<Group>(INGREDIENT_GROUPS[0]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const ownInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = searchRef ?? ownInputRef;
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLUListElement | null>(null);
  const tipTimer = useRef<number | undefined>(undefined);

  const searching = query.trim().length > 0;
  const list = useMemo(
    () => (searching ? searchIngredients(INGREDIENTS, query) : BY_GROUP[group]),
    [searching, query, group],
  );

  const listKey = searching ? 'search' : group;
  const tabEdges = useScrollEdges(tabsRef, `${variant}-${searchOpen}`);
  const railEdges = useScrollEdges(railRef, `${variant}-${listKey}-${list.length}`);

  // each group (and each new search) starts at the left end of the slab
  useEffect(() => {
    railRef.current?.scrollTo({ left: 0 });
  }, [group, searching]);

  // keep the selected tab in view
  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [group]);

  // wheel scrolls the slab sideways (never traps the wheel at an end)
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let snapTimer: number | undefined;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = rail.scrollWidth - rail.clientWidth;
      if (max <= 0) return;
      const next = rail.scrollLeft + e.deltaY;
      if ((e.deltaY < 0 && rail.scrollLeft <= 0) || (e.deltaY > 0 && rail.scrollLeft >= max - 1)) return;
      e.preventDefault();
      rail.style.scrollSnapType = 'none';
      rail.scrollLeft = Math.max(0, Math.min(max, next));
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => { rail.style.scrollSnapType = ''; }, 160);
    };
    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      rail.removeEventListener('wheel', onWheel);
      window.clearTimeout(snapTimer);
    };
  }, []);

  // the tooltip belongs to the desktop back bar only; it never outlives its bottle
  useEffect(() => () => window.clearTimeout(tipTimer.current), []);
  const hideTip = useCallback(() => {
    window.clearTimeout(tipTimer.current);
    setTip(null);
  }, []);
  const onTip = useCallback(
    (ing: Ingredient, el: HTMLElement | null, via: 'hover' | 'focus') => {
      window.clearTimeout(tipTimer.current);
      if (!el) {
        setTip((t) => (t && t.ing.id === ing.id && t.via === via ? null : t));
        return;
      }
      const show = () => {
        const r = el.getBoundingClientRect();
        setTip({ ing, x: r.left + r.width / 2, y: r.top, via });
      };
      if (via === 'focus') show();
      else tipTimer.current = window.setTimeout(show, 260);
    },
    [],
  );

  const scrollRail = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  // ---- tabs ------------------------------------------------------------------
  const chooseGroup = (g: Group) => {
    setGroup(g);
    setQuery('');
    setFocusId(null);
    hideTip();
  };

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = INGREDIENT_GROUPS.indexOf(group);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % INGREDIENT_GROUPS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + INGREDIENT_GROUPS.length) % INGREDIENT_GROUPS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = INGREDIENT_GROUPS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    chooseGroup(INGREDIENT_GROUPS[next]);
    tabsRef.current?.querySelector<HTMLElement>(`[role="tab"][data-group="${INGREDIENT_GROUPS[next]}"]`)?.focus();
  };

  // ---- search ----------------------------------------------------------------
  const clearSearch = (close: boolean) => {
    setQuery('');
    setFocusId(null);
    if (close) setSearchOpen(false);
  };

  const onSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (query) clearSearch(dock);
      else if (dock) setSearchOpen(false);
      else e.currentTarget.blur();
    } else if (e.key === 'ArrowDown' && list.length) {
      e.preventDefault();
      rowRef.current?.querySelector<HTMLElement>('[data-bottle]')?.focus();
    }
  };

  useEffect(() => {
    if (dock && searchOpen) inputRef.current?.focus();
  }, [dock, searchOpen, inputRef]);

  // ---- bottle row ------------------------------------------------------------
  const onRowKeyDown = (e: ReactKeyboardEvent<HTMLUListElement>) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-bottle]');
    if (!t) return;
    const all = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-bottle]'));
    const i = all.indexOf(t);
    let next = -1;
    if (e.key === 'ArrowRight') next = Math.min(all.length - 1, i + 1);
    else if (e.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = all.length - 1;
    else if (e.key === 'ArrowUp' && searching) {
      e.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (next < 0) return;
    e.preventDefault();
    all[next]?.focus();
  };

  const inPot = useMemo(() => new Map(model.brew.map((e) => [e.id, e])), [model.brew]);
  const tabbableId = list.some((i) => i.id === focusId) ? focusId : list[0]?.id;

  const onFocusBottle = useCallback((b: Ingredient) => setFocusId(b.id), []);

  const pick = useCallback(
    (ing: Ingredient, anchor: DOMRect | null) => {
      hideTip();
      onPick(ing, anchor);
    },
    [hideTip, onPick],
  );

  const rootCls = ['shelf', `shelf--${variant}`].join(' ');
  const hasBrew = model.brew.length > 0;
  const panelLabel = searching ? 'Search results' : group;

  const tabs = (
    <div
      ref={tabsRef}
      className="shelf__tabs"
      role="tablist"
      aria-label="Ingredient groups"
      data-start={tabEdges.start || undefined}
      data-end={tabEdges.end || undefined}
      onKeyDown={onTabKeyDown}
    >
      {INGREDIENT_GROUPS.map((g) => {
        const active = g === group && !searching;
        return (
          <button
            key={g}
            id={tabId(g)}
            type="button"
            role="tab"
            data-group={g}
            className="shelf__tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={g === group ? 0 : -1}
            onClick={() => chooseGroup(g)}
          >
            <span>{g}</span>
            <span className="shelf__count">{GROUP_COUNT[g]}</span>
            {active && <motion.span layoutId={`${uid}-underline`} className="shelf__underline" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          </button>
        );
      })}
    </div>
  );

  const field = (
    <div className="shelf__search" data-filled={query ? '' : undefined}>
      <MagnifyingGlass size={dock ? 20 : 16} aria-hidden="true" />
      <input
        ref={inputRef}
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        placeholder={`Search ${INGREDIENTS.length} ingredients`}
        aria-label="Search ingredients"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onSearchKeyDown}
        onBlur={() => {
          if (dock && !query) setSearchOpen(false);
        }}
      />
      {dock ? (
        <button
          type="button"
          className="shelf__clear"
          aria-label="Close search"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => clearSearch(true)}
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : query ? (
        <button type="button" className="shelf__clear" aria-label="Clear search" onClick={() => { clearSearch(false); inputRef.current?.focus(); }}>
          <X size={14} aria-hidden="true" />
        </button>
      ) : (
        <kbd aria-hidden="true">/</kbd>
      )}
    </div>
  );

  const tipDelta = tip ? model.deltas?.get(tip.ing.id) : undefined;
  const tipEntry = tip ? inPot.get(tip.ing.id) : undefined;

  return (
    <section className={rootCls} aria-label="Ingredients">
      <div className="shelf__bg" aria-hidden="true" />

      <header className="shelf__head">
        {dock && searchOpen ? (
          field
        ) : (
          <>
            {tabs}
            {!dock && (
              <p className="shelf__legend" aria-hidden="true">
                {searching ? (
                  <span className="shelf__found">{list.length} {list.length === 1 ? 'match' : 'matches'}</span>
                ) : (
                  <>
                    <span className="shelf__key"><span className="bottle__mark bottle__mark--raise">+2</span>raises the score</span>
                    <span className="shelf__key"><span className="bottle__mark bottle__mark--clash"><Minus size={9} weight="bold" /></span>clashes</span>
                  </>
                )}
              </p>
            )}
            {!dock && field}
            {dock && (
              <IconButton
                className="shelf__find"
                label="Search ingredients"
                size="md"
                icon={<MagnifyingGlass size={20} />}
                onClick={() => setSearchOpen(true)}
              />
            )}
          </>
        )}
        {dock && (
          <Button className="shelf__serve" variant="primary" size="sm" disabled={!hasBrew} onClick={onServe}>
            Serve
          </Button>
        )}
      </header>

      <div className="shelf__body">
        <div
          ref={railRef}
          id={panelId}
          className="shelf__rail"
          role="tabpanel"
          aria-label={panelLabel}
          aria-labelledby={searching ? undefined : tabId(group)}
          data-start={railEdges.start || undefined}
          data-end={railEdges.end || undefined}
          onScroll={tip ? hideTip : undefined}
        >
          {list.length > 0 ? (
            <ul ref={rowRef} key={listKey} className="shelf__track" aria-label={panelLabel} onKeyDown={onRowKeyDown}>
              {list.map((ing, i) => {
                const entry = inPot.get(ing.id);
                return (
                  <Bottle
                    key={ing.id}
                    ing={ing}
                    index={i}
                    delta={model.deltas?.get(ing.id)}
                    amount={entry ? amountLabel(entry, ing, model.unit) : null}
                    tabbable={ing.id === tabbableId}
                    onPick={pick}
                    onDragStart={onDragStart}
                    onFocusBottle={onFocusBottle}
                    onTip={dock ? undefined : onTip}
                  />
                );
              })}
            </ul>
          ) : (
            <div className="shelf__track shelf__track--empty">
              <div className="shelf__empty">
                <p className="shelf__empty-title">No ingredient matches</p>
                <p className="shelf__empty-hint">Try a spirit, or a flavour like citrus or bitter.</p>
                <Button variant="secondary" size="sm" onClick={() => { clearSearch(false); inputRef.current?.focus(); }}>
                  Clear search
                </Button>
              </div>
            </div>
          )}
        </div>

        {!dock && (
          <>
            <IconButton
              className="shelf__nudge shelf__nudge--l"
              label="Scroll ingredients left"
              icon={<CaretLeft size={16} weight="bold" />}
              size="sm"
              variant="outline"
              tabIndex={-1}
              data-show={railEdges.start || undefined}
              onClick={() => scrollRail(-1)}
            />
            <IconButton
              className="shelf__nudge shelf__nudge--r"
              label="Scroll ingredients right"
              icon={<CaretRight size={16} weight="bold" />}
              size="sm"
              variant="outline"
              tabIndex={-1}
              data-show={railEdges.end || undefined}
              onClick={() => scrollRail(1)}
            />
          </>
        )}
      </div>

      <span className="ui-vh" role="status">
        {searching ? (list.length ? `${list.length} ingredients match` : 'No ingredient matches') : ''}
      </span>

      {tip && !dock && (
        <div
          className="shelf-tip"
          role="presentation"
          style={{
            left: Math.min(Math.max(tip.x, 140), window.innerWidth - 140),
            bottom: window.innerHeight - tip.y + 8,
          }}
        >
          <div className="shelf-tip__top">
            <span className="shelf-tip__name">{tip.ing.name}</span>
            <span className="shelf-tip__abv">{tip.ing.abv > 0 ? `${tip.ing.abv}% ABV` : 'No alcohol'}</span>
          </div>
          {flavourNotes(tip.ing).length > 0 && (
            <p className="shelf-tip__notes">{sentence(flavourNotes(tip.ing))}</p>
          )}
          {tipEntry ? (
            <p className="shelf-tip__line shelf-tip__line--pot">
              In the pot, {amountLabel(tipEntry, tip.ing, model.unit)}
            </p>
          ) : (
            deltaWords(tipDelta) && (
              <p className={`shelf-tip__line shelf-tip__line--${indicatorFor(tipDelta).kind}`}>{deltaWords(tipDelta)}</p>
            )
          )}
        </div>
      )}
    </section>
  );
}
