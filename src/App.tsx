import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Ingredient, Recipe } from './data/types';
import { ING_BY_ID } from './data/ingredients';
import { useBrewStore } from './store';
import { useCellar, type CellarItem } from './cellar';
import { VERDICT } from './lib/harmony';
import { clearShareHash, readSharedBrew, shareUrl } from './lib/share';
import type { UnitKey } from './lib/units';
import type { DialRequest, PourEvent } from './app/types';
import { useAppModel } from './app/useAppModel';
import { useBrewTheme } from './app/useBrewTheme';
import { useDrag } from './app/useDrag';
import { useHotkeys } from './app/useHotkeys';
import { useIsDesktop } from './app/useMediaQuery';
import { useToasts, type ToastAction } from './app/useToasts';
import { copyText } from './app/clipboard';
import { TopBar } from './components/TopBar/TopBar';
import { Stage } from './components/Stage/Stage';
import { Shelf } from './components/Shelf/Shelf';
import { RecipeCard } from './components/Recipe/RecipeCard';
import { AnalysisPanel } from './components/Analysis/AnalysisPanel';
import { BrewSummary } from './components/Analysis/BrewSummary';
import { PourDial } from './components/Dial/PourDial';
import { ServeSheet } from './components/Serve/ServeSheet';
import { Grimoire } from './components/Grimoire/Grimoire';
import { Cellar } from './components/Cellar/Cellar';
import { Toaster } from './components/ui/Toaster';
import { LiveRegion } from './components/ui/LiveRegion';
import { IngredientIcon } from './icons/Icons';

type SheetName = 'serve' | 'grimoire' | 'cellar' | null;

let pourSeq = 0;
const POUR_MS = 1400;
const SCRUB_MERGE_MS = 700;

const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

export default function App() {
  const [state, dispatch] = useBrewStore();
  const cellar = useCellar();
  const model = useAppModel(state);
  useBrewTheme(model.mix);
  const desktop = useIsDesktop();
  const { toast, push, dismiss, pause, resume } = useToasts();

  const potRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pours, setPours] = useState<PourEvent[]>([]);
  const [dial, setDial] = useState<DialRequest | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);

  const undoAction: ToastAction = useMemo(
    () => ({ label: 'Undo', run: () => dispatch({ type: 'undo' }) }),
    [dispatch],
  );

  // ---- history --------------------------------------------------------------
  /** Undo also answers a visible Undo toast, so it reverses whatever the toast names. */
  const undo = useCallback(() => {
    if (toast?.action?.label === 'Undo') {
      const run = toast.action.run;
      dismiss();
      run();
    } else {
      dispatch({ type: 'undo' });
    }
  }, [toast, dismiss, dispatch]);
  const redo = useCallback(() => dispatch({ type: 'redo' }), [dispatch]);

  // ---- pouring --------------------------------------------------------------
  const pour = useCallback((ing: Ingredient) => {
    const id = ++pourSeq;
    setPours((p) => [...p, { id, color: ing.color, ingId: ing.id }]);
    setTimeout(() => setPours((p) => p.filter((x) => x.id !== id)), POUR_MS);
    if (isTouch()) navigator.vibrate?.(8);
  }, []);

  const addIngredient = useCallback(
    (ing: Ingredient, ml: number, announce = false) => {
      dispatch({ type: 'add', id: ing.id, ml });
      pour(ing);
      if (announce) push(`Added ${ing.name}`, undoAction);
    },
    [dispatch, pour, push, undoAction],
  );

  const removeIngredient = useCallback(
    (id: string) => {
      const ing = ING_BY_ID[id];
      dispatch({ type: 'remove', id });
      if (ing) push(`Removed ${ing.name}`, undoAction);
    },
    [dispatch, push, undoAction],
  );

  // ---- the dial -------------------------------------------------------------
  const openAdd = useCallback((ing: Ingredient, anchor: DOMRect | null) => {
    setDial({ ing, mode: 'add', ml: ing.amt, anchor });
  }, []);

  const openEdit = useCallback(
    (ing: Ingredient, anchor: DOMRect | null) => {
      const entry = model.brew.find((e) => e.id === ing.id);
      setDial({ ing, mode: 'edit', ml: entry?.ml ?? ing.amt, anchor });
    },
    [model.brew],
  );

  const closeDial = useCallback(() => setDial(null), []);

  const confirmDial = useCallback(
    (ing: Ingredient, ml: number, mode: 'add' | 'edit') => {
      if (mode === 'add') {
        addIngredient(ing, ml);
      } else {
        const current = model.brew.find((e) => e.id === ing.id)?.ml ?? 0;
        dispatch({ type: 'setAmount', id: ing.id, ml });
        if (ml > current) pour(ing);
      }
      setDial(null);
    },
    [addIngredient, dispatch, model.brew, pour],
  );

  const removeFromDial = useCallback(
    (ing: Ingredient) => {
      removeIngredient(ing.id);
      setDial(null);
    },
    [removeIngredient],
  );

  // ---- drag from the shelf --------------------------------------------------
  const { dragging, dragOver, start: startDrag, ghostRef } = useDrag(potRef, (ing) => openAdd(ing, null));

  // ---- brew actions ---------------------------------------------------------
  const setUnit = useCallback((unit: UnitKey) => dispatch({ type: 'setUnit', unit }), [dispatch]);
  const setName = useCallback((name: string) => dispatch({ type: 'setName', name }), [dispatch]);
  // A scrub fires one setAmount per unit step; steps on the same row within a moment
  // fold into one undo entry.
  const lastScrub = useRef<{ id: string; at: number } | null>(null);
  const setAmount = useCallback(
    (id: string, ml: number) => {
      const now = performance.now();
      const last = lastScrub.current;
      const merge = !!last && last.id === id && now - last.at < SCRUB_MERGE_MS;
      lastScrub.current = { id, at: now };
      dispatch({ type: 'setAmount', id, ml, merge });
    },
    [dispatch],
  );
  const clearBrew = useCallback(() => {
    dispatch({ type: 'clear' });
    push('Cleared the pot', undoAction);
  }, [dispatch, push, undoAction]);

  const tryAdding = useCallback(
    (ing: Ingredient, ml: number) => addIngredient(ing, ml, true),
    [addIngredient],
  );

  // ---- sharing and copying --------------------------------------------------
  const share = useCallback(async () => {
    if (!model.brew.length) {
      push('Add an ingredient to share a brew');
      return;
    }
    const url = shareUrl({ brew: model.brew, name: model.name });
    if (isTouch() && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${model.name} on Stewy`, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    push((await copyText(url)) ? 'Link copied' : 'Could not copy the link');
  }, [model.brew, model.name, push]);

  const copyRecipe = useCallback(
    async (text: string) => {
      push((await copyText(text)) ? 'Recipe copied' : 'Could not copy the recipe');
    },
    [push],
  );

  // ---- sheets ---------------------------------------------------------------
  const closeSheet = useCallback(() => setSheet(null), []);
  const openServe = useCallback(() => {
    if (model.brew.length) setSheet('serve');
  }, [model.brew.length]);

  const saveToCellar = useCallback(() => {
    const item = cellar.save({
      name: model.name,
      brew: model.brew,
      score: model.h?.score ?? null,
      color: model.mix?.css ?? null,
    });
    push(`Saved ${item.name} to the Cellar`, { label: 'Undo', run: () => cellar.remove(item.id) });
  }, [cellar, model, push]);

  const loadRecipe = useCallback(
    (r: Recipe) => {
      dispatch({ type: 'loadRecipe', id: r.id });
      setSheet(null);
      push(`Loaded ${r.name}`, undoAction);
    },
    [dispatch, push, undoAction],
  );

  const loadFromCellar = useCallback(
    (item: CellarItem) => {
      dispatch({ type: 'loadBrew', brew: item.brew, name: item.name });
      setSheet(null);
      push(`Loaded ${item.name}`, undoAction);
    },
    [dispatch, push, undoAction],
  );

  const deleteFromCellar = useCallback(
    (item: CellarItem) => {
      cellar.remove(item.id);
      push(`Deleted ${item.name}`, { label: 'Undo', run: () => cellar.restore(item) });
    },
    [cellar, push],
  );

  // ---- shared link on first load --------------------------------------------
  useEffect(() => {
    const shared = readSharedBrew();
    if (!shared) return;
    dispatch({ type: 'loadBrew', brew: shared.brew, name: shared.name });
    clearShareHash();
    push('Opened a shared brew', { label: 'Undo', run: () => dispatch({ type: 'undo' }) });
  }, [dispatch, push]);

  // ---- pause ambient loops while the tab is hidden --------------------------
  useEffect(() => {
    const sync = () => document.body.classList.toggle('is-hidden', document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // ---- keyboard -------------------------------------------------------------
  useHotkeys({
    onUndo: undo,
    onRedo: redo,
    onSearch: () => searchRef.current?.focus(),
    onGrimoire: () => setSheet('grimoire'),
    onCellar: () => setSheet('cellar'),
    onServe: openServe,
  });

  // ---- score changes, read out politely -------------------------------------
  const announcement = model.h
    ? `Score ${model.h.score}. ${VERDICT[model.h.tier]}.`
    : 'The pot is empty.';

  const currentId = model.match && model.match.sim >= 0.98 ? model.match.recipe.id : null;

  return (
    <>
      <div className="scene" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <div className="app">
        <TopBar
          unit={model.unit}
          onUnit={setUnit}
          canUndo={state.past.length > 0}
          canRedo={state.future.length > 0}
          onUndo={undo}
          onRedo={redo}
          cellarCount={cellar.items.length}
          onOpenGrimoire={() => setSheet('grimoire')}
          onOpenCellar={() => setSheet('cellar')}
          onShare={share}
        />

        <main className="counter">
          <div className="slot slot--stage">
            <Stage model={model} pours={pours} dragging={dragging} dragOver={dragOver} potRef={potRef} />
          </div>
          {!desktop && (
            <div className="slot slot--summary">
              <BrewSummary model={model} onShare={share} onAdd={tryAdding} />
            </div>
          )}
          <div className="slot slot--recipe">
            <RecipeCard
              model={model}
              onName={setName}
              onUnit={setUnit}
              onEdit={openEdit}
              onSetAmount={setAmount}
              onRemove={removeIngredient}
              onClear={clearBrew}
              onServe={openServe}
            />
          </div>
          <div className="slot slot--analysis">
            <AnalysisPanel model={model} onAdd={tryAdding} />
          </div>
        </main>

        {desktop ? (
          <div className="shelf-slot">
            <Shelf
              model={model}
              variant="backbar"
              onPick={openAdd}
              onDragStart={startDrag}
              onServe={openServe}
              searchRef={searchRef}
            />
          </div>
        ) : (
          <div className="dock">
            <Shelf model={model} variant="dock" onPick={openAdd} onDragStart={startDrag} onServe={openServe} />
          </div>
        )}
      </div>

      <AnimatePresence>
        {dial && (
          <PourDial
            key={`${dial.ing.id}:${dial.mode}`}
            request={dial}
            model={model}
            onUnit={setUnit}
            onConfirm={confirmDial}
            onRemove={removeFromDial}
            onClose={closeDial}
          />
        )}
      </AnimatePresence>

      <ServeSheet
        open={sheet === 'serve'}
        model={model}
        onClose={closeSheet}
        onSave={saveToCellar}
        onShare={share}
        onCopy={copyRecipe}
      />
      <Grimoire open={sheet === 'grimoire'} currentId={currentId} unit={model.unit} onClose={closeSheet} onLoad={loadRecipe} />
      <Cellar
        open={sheet === 'cellar'}
        items={cellar.items}
        onClose={closeSheet}
        onLoad={loadFromCellar}
        onRename={cellar.rename}
        onDelete={deleteFromCellar}
        onOpenGrimoire={() => setSheet('grimoire')}
      />

      <Toaster toast={toast} onDismiss={dismiss} onPause={pause} onResume={resume} />
      <LiveRegion message={announcement} />

      {dragging && (
        <div className="drag-ghost" ref={ghostRef} aria-hidden="true">
          <IngredientIcon ing={dragging} />
        </div>
      )}
    </>
  );
}
