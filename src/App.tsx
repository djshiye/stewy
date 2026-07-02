import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Ingredient } from './data/types';
import { useBrewStore } from './store';
import { harmony } from './lib/harmony';
import { Header } from './components/Header';
import { BrewPanel } from './components/BrewPanel';
import { Stage } from './components/Stage';
import { Shelf } from './components/Shelf';
import { AmountDialog } from './components/AmountDialog';
import { StarField } from './components/StarField';
import { IngredientIcon } from './icons/Icons';
import type { SplashSpec } from './components/Cauldron';
import type { Recipe } from './data/types';
import type { UnitKey } from './lib/units';

let seq = 0;

export default function App() {
  const [state, dispatch] = useBrewStore();
  const h = useMemo(() => harmony(state.brew), [state.brew]);

  // ---- amount dialog -----------------------------------------------------
  const [dialogIng, setDialogIng] = useState<Ingredient | null>(null);
  const closeDialog = useCallback(() => setDialogIng(null), []);

  // ---- toast ---------------------------------------------------------------
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const notify = useCallback((msg: string) => setToast({ msg, id: ++seq }), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- cauldron splash fx ----------------------------------------------------
  const [splashes, setSplashes] = useState<SplashSpec[]>([]);
  const splash = useCallback((color: string) => {
    const id = ++seq;
    setSplashes((s) => [...s, { id, color }]);
    setTimeout(() => setSplashes((s) => s.filter((x) => x.id !== id)), 1250);
  }, []);

  const addIngredient = useCallback((ing: Ingredient, ml: number) => {
    dispatch({ type: 'add', id: ing.id, ml });
    splash(ing.color);
    notify(`Added ${ing.name}`);
    setDialogIng(null);
  }, [dispatch, splash, notify]);

  // ---- header actions ------------------------------------------------------
  const setUnit = useCallback((unit: UnitKey) => dispatch({ type: 'setUnit', unit }), [dispatch]);
  const loadRecipe = useCallback((r: Recipe) => {
    dispatch({ type: 'loadRecipe', id: r.id });
    notify(`Loaded ${r.name}`);
  }, [dispatch, notify]);
  const clearBrew = useCallback(() => {
    dispatch({ type: 'clear' });
    notify('Cauldron emptied');
  }, [dispatch, notify]);
  const setName = useCallback((name: string) => dispatch({ type: 'setName', name }), [dispatch]);

  // ---- pointer drag (mouse / pen; touch taps open the dialog) -------------
  const [dragIng, setDragIng] = useState<Ingredient | null>(null);
  const [overCauldron, setOverCauldron] = useState(false);
  const cauldronBoxRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const startDrag = useCallback((ing: Ingredient, ev: React.PointerEvent) => {
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    const sx = ev.clientX, sy = ev.clientY;
    let active = false;

    // capture guarantees pointerup/cancel delivery even if released off-window
    try {
      (ev.target as Element).setPointerCapture?.(ev.pointerId);
    } catch { /* pointer already released — drag still works, only capture is lost */ }

    const placeGhost = (x: number, y: number) => {
      posRef.current = { x, y };
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    const inCauldron = (e: PointerEvent) => {
      const box = cauldronBoxRef.current?.getBoundingClientRect();
      return !!box && e.clientX >= box.left && e.clientX <= box.right
        && e.clientY >= box.top && e.clientY <= box.bottom;
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      document.body.classList.remove('is-dragging');
      setDragIng(null);
      setOverCauldron(false);
    };
    const move = (e: PointerEvent) => {
      if (!active && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) {
        active = true;
        document.body.classList.add('is-dragging');
        setDragIng(ing);
      }
      if (active) {
        placeGhost(e.clientX, e.clientY);
        const over = inCauldron(e);
        setOverCauldron((prev) => (prev === over ? prev : over));
      }
    };
    const up = (e: PointerEvent) => {
      const dropped = active && inCauldron(e);
      if (active) {
        // swallow the click that follows a completed drag; self-disarm in case
        // the browser never dispatches one
        const swallow = (c: MouseEvent) => { c.stopPropagation(); c.preventDefault(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 150);
      }
      cleanup();
      if (dropped) setDialogIng(ing);
    };
    const cancel = () => cleanup();

    placeGhost(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  }, []);

  return (
    <div className="app">
      <StarField />
      <Header unit={state.unit} onUnit={setUnit} onRecipe={loadRecipe} onClear={clearBrew} />

      <main className="layout">
        <BrewPanel brew={state.brew} unit={state.unit} dispatch={dispatch} h={h} />
        <Stage
          name={state.name}
          brew={state.brew}
          h={h}
          splashes={splashes}
          dragOver={overCauldron}
          onName={setName}
          cauldronBoxRef={cauldronBoxRef}
        />
        <Shelf h={h} onPick={setDialogIng} onDragStart={startDrag} />
      </main>

      {dialogIng && (
        <AmountDialog
          key={dialogIng.id}
          ing={dialogIng}
          unit={state.unit}
          onClose={closeDialog}
          onAdd={addIngredient}
        />
      )}

      {dragIng && (
        <div
          className="drag-ghost"
          ref={(el) => {
            ghostRef.current = el;
            if (el) el.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
          }}
        >
          <IngredientIcon ing={dragIng} />
        </div>
      )}

      {toast && <div className="toast" key={toast.id} role="status">{toast.msg}</div>}
    </div>
  );
}
