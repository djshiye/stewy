import { useEffect, useMemo, useRef, useState } from 'react';
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

let seq = 0;

export default function App() {
  const [state, dispatch] = useBrewStore();
  const h = useMemo(() => harmony(state.brew), [state.brew]);

  // ---- amount dialog -----------------------------------------------------
  const [dialogIng, setDialogIng] = useState<Ingredient | null>(null);

  // ---- toast ---------------------------------------------------------------
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null);
  const notify = (msg: string) => setToast({ msg, id: ++seq });
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- cauldron splash fx ----------------------------------------------------
  const [splashes, setSplashes] = useState<SplashSpec[]>([]);
  const splash = (color: string) => {
    const id = ++seq;
    setSplashes((s) => [...s, { id, color }]);
    setTimeout(() => setSplashes((s) => s.filter((x) => x.id !== id)), 1250);
  };

  const addIngredient = (ing: Ingredient, ml: number) => {
    dispatch({ type: 'add', id: ing.id, ml });
    splash(ing.color);
    notify(`Added ${ing.name}`);
    setDialogIng(null);
  };

  // ---- pointer drag (mouse / pen; touch taps open the dialog) -------------
  const [dragIng, setDragIng] = useState<Ingredient | null>(null);
  const [overCauldron, setOverCauldron] = useState(false);
  const cauldronBoxRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef({ x: 0, y: 0 });

  const placeGhost = (x: number, y: number) => {
    posRef.current = { x, y };
    if (ghostRef.current) ghostRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const startDrag = (ing: Ingredient, ev: React.PointerEvent) => {
    if (ev.pointerType === 'touch' || ev.button !== 0) return;
    const sx = ev.clientX, sy = ev.clientY;
    let active = false;

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
        // swallow the click that follows a completed drag
        window.addEventListener('click', (c) => { c.stopPropagation(); c.preventDefault(); },
          { capture: true, once: true });
      }
      cleanup();
      if (dropped) setDialogIng(ing);
    };
    const cancel = () => cleanup();

    placeGhost(ev.clientX, ev.clientY);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  return (
    <div className="app">
      <StarField />
      <Header
        unit={state.unit}
        onUnit={(unit) => dispatch({ type: 'setUnit', unit })}
        onRecipe={(r) => { dispatch({ type: 'loadRecipe', id: r.id }); notify(`Loaded ${r.name}`); }}
        onClear={() => { dispatch({ type: 'clear' }); notify('Cauldron emptied'); }}
      />

      <main className="layout">
        <BrewPanel state={state} dispatch={dispatch} h={h} />
        <Stage
          state={state}
          h={h}
          splashes={splashes}
          dragOver={overCauldron}
          onName={(name) => dispatch({ type: 'setName', name })}
          cauldronBoxRef={cauldronBoxRef}
        />
        <Shelf h={h} onPick={setDialogIng} onDragStart={startDrag} />
      </main>

      {dialogIng && (
        <AmountDialog
          ing={dialogIng}
          unit={state.unit}
          onClose={() => setDialogIng(null)}
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
