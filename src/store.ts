/* Brew state: reducer, undo history and localStorage persistence.
   Reads the old vanilla-app key (stewy.v1) so existing saves migrate.
   History is session only; only { unit, brew, name } is persisted. */
import { useEffect, useReducer } from 'react';
import type { BrewEntry } from './data/types';
import { ING_BY_ID } from './data/ingredients';
import { RECIPE_BY_ID } from './data/recipes';
import { isCounted, perPiece, UNITS, type UnitKey } from './lib/units';

/** One undo step: everything the undoable actions can change. */
export interface Snapshot {
  brew: BrewEntry[];
  name: string;
}

export interface BrewState {
  unit: UnitKey;
  brew: BrewEntry[];
  name: string;
  past: Snapshot[];
  future: Snapshot[];
}

export type BrewAction =
  | { type: 'add'; id: string; ml: number }
  | { type: 'setAmount'; id: string; ml: number }
  | { type: 'nudge'; id: string; dir: 1 | -1 }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'loadRecipe'; id: string }
  | { type: 'loadBrew'; brew: BrewEntry[]; name: string }
  | { type: 'setUnit'; unit: UnitKey }
  | { type: 'setName'; name: string }
  | { type: 'undo' }
  | { type: 'redo' };

export const STORAGE_KEY = 'stewy.v2';
export const LEGACY_KEY = 'stewy.v1';
export const DEFAULT_NAME = 'Untitled Brew';
export const HISTORY_LIMIT = 60;

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Keep only known ingredients with a positive amount, merging duplicates. */
export function cleanBrew(entries: unknown): BrewEntry[] {
  if (!Array.isArray(entries)) return [];
  const out: BrewEntry[] = [];
  for (const e of entries) {
    if (!e || typeof e.id !== 'string' || !Object.hasOwn(ING_BY_ID, e.id)) continue;
    const ml = round1(Number(e.ml));
    if (!(ml > 0) || !Number.isFinite(ml)) continue;
    const ex = out.find((x) => x.id === e.id);
    if (ex) ex.ml = round1(ex.ml + ml);
    else out.push({ id: e.id, ml });
  }
  return out;
}

export function initialState(partial?: Partial<Pick<BrewState, 'unit' | 'brew' | 'name'>>): BrewState {
  return { unit: 'oz', brew: [], name: DEFAULT_NAME, past: [], future: [], ...partial };
}

/** Apply a brew/name change as one undoable step. No-ops leave state untouched. */
function commit(state: BrewState, brew: BrewEntry[], name: string = state.name): BrewState {
  if (brew === state.brew && name === state.name) return state;
  const past = [...state.past, { brew: state.brew, name: state.name }].slice(-HISTORY_LIMIT);
  return { ...state, brew, name, past, future: [] };
}

export function reducer(state: BrewState, action: BrewAction): BrewState {
  switch (action.type) {
    case 'add': {
      const ml = round1(action.ml);
      if (!Object.hasOwn(ING_BY_ID, action.id) || !(ml > 0)) return state;
      const brew = state.brew.some((e) => e.id === action.id)
        ? state.brew.map((e) => (e.id === action.id ? { ...e, ml: round1(e.ml + ml) } : e))
        : [...state.brew, { id: action.id, ml }];
      return commit(state, brew);
    }
    case 'setAmount': {
      const ex = state.brew.find((e) => e.id === action.id);
      if (!ex) return state;
      const ml = round1(action.ml);
      if (!(ml > 0)) return commit(state, state.brew.filter((e) => e.id !== action.id));
      if (ml === ex.ml) return state;
      return commit(state, state.brew.map((e) => (e.id === action.id ? { ...e, ml } : e)));
    }
    case 'nudge': {
      const e = state.brew.find((x) => x.id === action.id);
      const ing = e && ING_BY_ID[e.id];
      if (!e || !ing) return state;
      const stepMl = isCounted(ing) ? perPiece(ing) : UNITS[state.unit].step * UNITS[state.unit].toMl;
      const ml = round1(e.ml + action.dir * stepMl);
      return commit(
        state,
        ml <= 0
          ? state.brew.filter((x) => x.id !== action.id)
          : state.brew.map((x) => (x.id === action.id ? { ...x, ml } : x)),
      );
    }
    case 'remove':
      if (!state.brew.some((e) => e.id === action.id)) return state;
      return commit(state, state.brew.filter((x) => x.id !== action.id));
    case 'clear':
      return commit(state, state.brew.length ? [] : state.brew, DEFAULT_NAME);
    case 'loadRecipe': {
      const r = Object.hasOwn(RECIPE_BY_ID, action.id) ? RECIPE_BY_ID[action.id] : null;
      if (!r) return state;
      return commit(state, cleanBrew(r.build.map(([id, ml]) => ({ id, ml }))), r.name);
    }
    case 'loadBrew':
      return commit(state, cleanBrew(action.brew), action.name.trim() || DEFAULT_NAME);
    case 'setUnit':
      return action.unit in UNITS && action.unit !== state.unit ? { ...state, unit: action.unit } : state;
    case 'setName':
      return action.name === state.name ? state : { ...state, name: action.name };
    case 'undo': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        brew: prev.brew,
        name: prev.name,
        past: state.past.slice(0, -1),
        future: [{ brew: state.brew, name: state.name }, ...state.future].slice(0, HISTORY_LIMIT),
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        brew: next.brew,
        name: next.name,
        past: [...state.past, { brew: state.brew, name: state.name }].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
      };
    }
  }
}

/** The slice of state that survives a reload. */
export function serialize(state: BrewState): string {
  return JSON.stringify({ unit: state.unit, brew: state.brew, name: state.name });
}

/** Parse a stored blob (current or legacy shape); null when unusable. */
export function parseStored(raw: string | null): BrewState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as { unit?: string; brew?: unknown; name?: unknown } | null;
    if (!s || !Array.isArray(s.brew)) return null;
    return initialState({
      unit: s.unit && s.unit in UNITS ? (s.unit as UnitKey) : 'oz',
      brew: cleanBrew(s.brew),
      name: typeof s.name === 'string' && s.name ? s.name : DEFAULT_NAME,
    });
  } catch {
    return null;
  }
}

/** Load saved state: current key first, then the legacy one. */
export function loadState(storage: Pick<Storage, 'getItem'> | null): BrewState {
  if (!storage) return initialState();
  for (const key of [STORAGE_KEY, LEGACY_KEY]) {
    try {
      const s = parseStored(storage.getItem(key));
      if (s) return s;
    } catch {
      /* storage blocked: fall through */
    }
  }
  return initialState();
}

const browserStorage = () => (typeof localStorage === 'undefined' ? null : localStorage);

export function useBrewStore() {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState(browserStorage()));
  const { unit, brew, name } = state;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, serialize({ ...initialState(), unit, brew, name }));
    } catch {
      /* private mode or quota: ignore */
    }
  }, [unit, brew, name]);

  return [state, dispatch] as const;
}
