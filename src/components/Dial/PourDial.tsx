import {
  useCallback, useEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent,
} from 'react';
import { ArrowRight, Minus, Plus, Trash } from '@phosphor-icons/react';
import type { BrewEntry, Ingredient } from '../../data/types';
import type { AppModel, DialRequest } from '../../app/types';
import { withAdded } from '../../lib/coach';
import { clamp } from '../../lib/color';
import { explainChange, type ChangeKind } from '../../lib/explain';
import { harmony, type Harmony } from '../../lib/harmony';
import { amountInfo, plural, trim, UNIT_ORDER, UNITS, type UnitKey } from '../../lib/units';
import { IngredientIcon } from '../../icons/Icons';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Segmented';
import { VisuallyHidden } from '../ui/VisuallyHidden';
import { Instrument, CENTER_Y } from './Instrument';
import { describeIngredient } from './describe';
import { angleToFrac, dialRange, formatValue, snapValue, stepValue } from './dialMath';
import './Dial.css';

export interface PourDialProps {
  request: DialRequest;
  model: AppModel;
  onUnit(u: UnitKey): void;
  onConfirm(ing: Ingredient, ml: number, mode: 'add' | 'edit'): void;
  onRemove(ing: Ingredient): void;
  onClose(): void;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** "1 oz", "0.5 oz", "2 dashes", "1 part". */
function amountText(value: number, unitText: string, counted: boolean, dec: number): string {
  const v = formatValue(value, dec);
  if (counted) return `${v} ${plural(unitText, value)}`;
  return `${v} ${unitText === 'parts' && v === '1' ? 'part' : unitText}`;
}

/** The other units, as a conversion line ("37.5 ml, 3.75 cl"). */
function conversionLine(ml: number, unit: UnitKey, counted: boolean): string {
  if (counted) return `${trim(ml, 1)} ml`;
  const parts: string[] = [];
  if (unit !== 'ml') parts.push(`${trim(ml, 1)} ml`);
  if (unit !== 'cl') parts.push(`${trim(ml / UNITS.cl.toMl, 2)} cl`);
  if (unit !== 'oz' && parts.length < 2) parts.push(`${trim(ml / UNITS.oz.toMl, 2)} oz`);
  return parts.slice(0, 2).join(', ');
}

/** The brew as it would stand if the dial were confirmed now (matches the store's add and setAmount). */
function brewAfter(brew: BrewEntry[], ing: Ingredient, ml: number, mode: 'add' | 'edit'): BrewEntry[] {
  if (mode === 'add') return ml > 0 ? withAdded(brew, ing.id, round1(ml)) : brew;
  if (ml <= 0) return brew.filter((e) => e.id !== ing.id);
  const m = round1(ml);
  return brew.some((e) => e.id === ing.id)
    ? brew.map((e) => (e.id === ing.id ? { ...e, ml: m } : e))
    : [...brew, { id: ing.id, ml: m }];
}

/** A value that settles a little after it stops changing, for the screen reader. */
function useSettled<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}

export function PourDial({ request, model, onUnit, onConfirm, onRemove, onClose }: PourDialProps) {
  const { ing, mode } = request;
  const edit = mode === 'edit';
  const unit = model.unit;
  const info = amountInfo(ing, unit);
  const range = useMemo(() => dialRange(ing, unit, request.ml), [ing, unit, request.ml]);

  // a counted item (dashes, pieces) always holds whole units; an exact amount stays as it is
  const [ml, setMl] = useState(() =>
    info.counted ? round2(Math.max(1, Math.round(request.ml / info.per)) * info.per) : request.ml,
  );
  const padRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const value = ml / info.per;
  const frac = clamp(value / range.max, 0, 1);
  const ghost = edit ? clamp(request.ml / info.per / range.max, 0, 1) : null;
  const unitText = range.unit;
  const readout = formatValue(value, range.dec);

  const latest = useRef({ ml, info, range, value });
  useEffect(() => {
    latest.current = { ml, info, range, value };
  });

  /** Set the amount from a value in the display unit; haptic tick when it actually moves. */
  const setValue = useCallback((v: number) => {
    const { ml: cur, info: i, range: r } = latest.current;
    const next = round2(clamp(v, 0, r.max) * i.per);
    if (next === cur) return;
    setMl(next);
    if (isTouch()) navigator.vibrate?.(4);
  }, []);

  const stepBy = useCallback((dir: 1 | -1, finer: boolean) => {
    const { range: r, value: v } = latest.current;
    setValue(stepValue(v, dir, finer && !r.counted ? r.fine : r.step, r.max));
  }, [setValue]);

  // ---- pointer: drag around the knob --------------------------------------
  const fromPointer = (e: ReactPointerEvent) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height * CENTER_Y);
    if (Math.hypot(dx, dy) < rect.width * 0.1) return; // the readout is not a handle
    const { range: r, value: v } = latest.current;
    const f = angleToFrac(dx, dy, clamp(v / r.max, 0, 1));
    setValue(snapValue(f * r.max, e.shiftKey && !r.counted ? r.fine : r.step, r.max));
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).focus({ preventScroll: true });
    fromPointer(e);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (dragging.current) fromPointer(e);
  };
  const endDrag = (e: ReactPointerEvent) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ---- wheel: needs a non-passive listener to stop the sheet scrolling ----
  useEffect(() => {
    const pad = padRef.current;
    if (!pad) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 40) return;
      stepBy(acc < 0 ? 1 : -1, e.shiftKey);
      acc = 0;
    };
    pad.addEventListener('wheel', onWheel, { passive: false });
    return () => pad.removeEventListener('wheel', onWheel);
  }, [stepBy]);

  const confirm = useCallback(() => {
    if (!(ml > 0)) return;
    onConfirm(ing, ml, mode);
  }, [ml, onConfirm, ing, mode]);

  // ---- keyboard on the slider ----------------------------------------------
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const { range: r } = latest.current;
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight': stepBy(1, e.shiftKey); break;
      case 'ArrowDown':
      case 'ArrowLeft': stepBy(-1, e.shiftKey); break;
      case 'PageUp': setValue(stepValue(latest.current.value, 1, r.major, r.max)); break;
      case 'PageDown': setValue(stepValue(latest.current.value, -1, r.major, r.max)); break;
      case 'Home': setValue(0); break;
      case 'End': setValue(r.max); break;
      case 'Enter': confirm(); break;
      default: return;
    }
    e.preventDefault();
  };

  // ---- quick chips: one radio group, arrows move and select ----------------
  const chips = info.chips.filter((c) => c <= range.max + 1e-9);
  const chipIdx = chips.findIndex((c) => Math.abs(c - value) < 1e-6);
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onChipKey = (e: ReactKeyboardEvent) => {
    const n = chips.length;
    let next = -1;
    const from = chipIdx < 0 ? 0 : chipIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = chipIdx < 0 ? 0 : (from + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = chipIdx < 0 ? n - 1 : (from - 1 + n) % n;
    if (next < 0) return;
    e.preventDefault();
    setValue(chips[next]);
    chipRefs.current[next]?.focus();
  };
  const chipLabel = (c: number) => {
    const v = trim(c, info.dec);
    if (info.counted) return v;
    return (
      <>
        {v}
        <span className="dial__chip-unit"> {info.label}</span>
      </>
    );
  };
  const chipName = (c: number) => amountText(c, unitText, range.counted, info.dec);

  // ---- preview -----------------------------------------------------------
  const before = model.h;
  const inBrew = model.brew.some((e) => e.id === ing.id);
  const after: Harmony | null = useMemo(
    () => harmony(brewAfter(model.brew, ing, ml, mode)),
    [model.brew, ing, ml, mode],
  );
  const kind: ChangeKind = useMemo(() => {
    if (edit) {
      if (ml <= 0) return 'remove';
      if (Math.abs(ml - request.ml) < 1e-6) return 'same';
      return ml > request.ml ? 'more' : 'less';
    }
    return inBrew ? 'more' : 'add';
  }, [edit, ml, request.ml, inBrew]);
  const nothing = ml <= 0;
  const reason = nothing
    ? edit ? 'At zero this comes out of the pot.' : 'Turn the dial up to set an amount.'
    : explainChange(before, after, ing.name, kind);
  const delta = before && after ? after.score - before.score : null;
  const amountNow = amountText(value, unitText, range.counted, range.dec);
  const withLabel = nothing ? 'Without it' : `With ${amountNow}`;

  const announce = useSettled(
    `${amountNow}. ${before ? `Score now ${before.score}.` : ''} ${after ? `With this, ${after.score}.` : 'The pot would be empty.'}`,
    500,
  );

  // ---- reset target ---------------------------------------------------------
  const defaultValue = info.counted
    ? Math.max(1, Math.round(ing.amt / info.per))
    : snapValue(ing.amt / info.per, range.fine, range.max);
  const atDefault = Math.abs(value - defaultValue) < 1e-6;
  const resetText = amountText(defaultValue, unitText, range.counted, range.dec);

  const deltaTone = delta === null ? 'none' : delta > 0 ? 'good' : delta < 0 ? 'bad' : 'flat';
  const deltaText = delta === null ? '' : delta > 0 ? `+${delta}` : delta < 0 ? `-${Math.abs(delta)}` : 'No change';

  return (
    <Sheet open onClose={onClose} labelledBy="dial-title" size="dial" className="dial-sheet">
      <div className="dial">
        <header className="dial__head">
          <span className="dial__tile" aria-hidden="true">
            <IngredientIcon ing={ing} variant="tile" />
          </span>
          <div className="dial__titles">
            <h2 id="dial-title" className="dial__name">{ing.name}</h2>
            <p className="dial__kind">{describeIngredient(ing)}</p>
          </div>
        </header>

        <div className="dial__stage">
          {!range.counted && (
            <div className="dial__units">
              <Segmented
                size="sm"
                aria-label="Unit"
                options={UNIT_ORDER.map((u) => ({ value: u, label: UNITS[u].label }))}
                value={unit}
                onChange={onUnit}
              />
            </div>
          )}

          <div className="dial__pad-wrap">
            <div
              ref={padRef}
              className="dial__pad"
              role="slider"
              tabIndex={0}
              data-autofocus
              aria-label={`${ing.name} amount`}
              aria-valuemin={0}
              aria-valuemax={range.max}
              aria-valuenow={Number(value.toFixed(3))}
              aria-valuetext={amountNow}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onLostPointerCapture={() => { dragging.current = false; }}
            >
              <Instrument frac={frac} ghost={ghost} range={range} />
              <div className="dial__readout" aria-hidden="true">
                <span className="dial__value" data-long={readout.length > 4 || undefined}>{readout}</span>
                <span className="dial__unit">{unitText}</span>
                <span className="dial__conv">{conversionLine(ml, unit, range.counted)}</span>
              </div>
            </div>
            <button
              type="button"
              className="dial__step dial__step--minus"
              aria-label={`Less ${ing.name}`}
              disabled={ml <= 0}
              onClick={() => stepBy(-1, false)}
            >
              <Minus size={18} />
            </button>
            <button
              type="button"
              className="dial__step dial__step--plus"
              aria-label={`More ${ing.name}`}
              disabled={value >= range.max - 1e-9}
              onClick={() => stepBy(1, false)}
            >
              <Plus size={18} />
            </button>
          </div>

          <div
            className="dial__chips"
            role="radiogroup"
            aria-label={`Quick measures in ${unitText}`}
            style={{ ['--chips' as string]: chips.length }}
            onKeyDown={onChipKey}
          >
            {chips.map((c, i) => {
              const on = i === chipIdx;
              return (
                <button
                  key={c}
                  ref={(el) => { chipRefs.current[i] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={chipName(c)}
                  tabIndex={on || (chipIdx < 0 && i === 0) ? 0 : -1}
                  className="dial__chip"
                  onClick={() => setValue(c)}
                >
                  {chipLabel(c)}
                </button>
              );
            })}
          </div>

          <p className="dial__hint">
            <span className="dial__hint--fine">Drag the dial, scroll, or use the arrow keys. Hold Shift for fine steps.</span>
            <span className="dial__hint--touch">Drag the dial or tap a measure.</span>
          </p>
        </div>

        <section className="dial__preview" aria-label="Score preview">
          <div className="dial__scores">
            <div className="dial__score">
              <span className="dial__label">Score now</span>
              <b className={before ? 'dial__num dial__num--before' : 'dial__num dial__num--word'}>{before ? before.score : 'Empty'}</b>
            </div>
            <ArrowRight size={18} className="dial__arrow" aria-hidden="true" />
            <div className="dial__score dial__score--after">
              <span className="dial__label">{withLabel}</span>
              <span className="dial__after-row">
                {delta !== null && !nothing && (
                  <span className={`dial__delta dial__delta--${deltaTone}`}>{deltaText}</span>
                )}
                <b className={after ? 'dial__num' : 'dial__num dial__num--word'}>{after ? after.score : 'Empty'}</b>
              </span>
            </div>
          </div>
          <p className="dial__why">{reason}</p>
          <VisuallyHidden aria-live="polite">{announce}</VisuallyHidden>
        </section>

        <footer className="dial__actions">
          {edit ? (
            <>
              <Button variant="danger-ghost" size="lg" icon={<Trash size={18} />} onClick={() => onRemove(ing)}>
                Remove
              </Button>
              <Button variant="ghost" size="lg" disabled={atDefault} onClick={() => setValue(defaultValue)}>
                Reset to {resetText}
              </Button>
              <Button variant="primary" size="lg" className="dial__go" disabled={nothing} onClick={confirm}>
                Update
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="lg" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="lg" className="dial__go" disabled={nothing} onClick={confirm}>
                Pour into the pot
              </Button>
            </>
          )}
        </footer>
      </div>
    </Sheet>
  );
}
