/* Brew state: reducer + localStorage persistence.
   Reads the old vanilla-app key (stewy.v1) so existing saves migrate. */
import { useEffect, useReducer } from 'react';
import type { BrewEntry } from './data/types';
import { ING_BY_ID } from './data/ingredients';
import { RECIPE_BY_ID } from './data/recipes';
import { isCounted, PER, UNITS, type UnitKey } from './lib/units';

export interface BrewState {
  unit: UnitKey;
  brew: BrewEntry[];
  name: string;
}

export type BrewAction =
  | { type: 'add'; id: string; ml: number }
  | { type: 'nudge'; id: string; dir: 1 | -1 }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'loadRecipe'; id: string }
  | { type: 'setUnit'; unit: UnitKey }
  | { type: 'setName'; name: string };

const STORAGE_KEY = 'stewy.v2';
const LEGACY_KEY = 'stewy.v1';
const DEFAULT_NAME = 'Untitled Brew';

const round1 = (v: number) => Math.round(v * 10) / 10;

function reducer(state: BrewState, action: BrewAction): BrewState {
  switch (action.type) {
    case 'add': {
      const ex = state.brew.find((e) => e.id === action.id);
      const brew = ex
        ? state.brew.map((e) => (e.id === action.id ? { ...e, ml: round1(e.ml + action.ml) } : e))
        : [...state.brew, { id: action.id, ml: round1(action.ml) }];
      return { ...state, brew };
    }
    case 'nudge': {
      const e = state.brew.find((x) => x.id === action.id);
      if (!e) return state;
      const ing = ING_BY_ID[e.id];
      const stepMl = isCounted(ing) ? (PER[e.id] ?? 1) : UNITS[state.unit].step * UNITS[state.unit].toMl;
      const ml = round1(e.ml + action.dir * stepMl);
      const brew = ml <= 0
        ? state.brew.filter((x) => x.id !== action.id)
        : state.brew.map((x) => (x.id === action.id ? { ...x, ml } : x));
      return { ...state, brew };
    }
    case 'remove':
      return { ...state, brew: state.brew.filter((x) => x.id !== action.id) };
    case 'clear':
      return { ...state, brew: [], name: DEFAULT_NAME };
    case 'loadRecipe': {
      const r = RECIPE_BY_ID[action.id];
      if (!r) return state;
      return {
        ...state,
        brew: r.build.filter(([id]) => ING_BY_ID[id]).map(([id, ml]) => ({ id, ml })),
        name: r.name,
      };
    }
    case 'setUnit':
      return { ...state, unit: action.unit };
    case 'setName':
      return { ...state, name: action.name };
  }
}

function loadInitial(): BrewState {
  const fallback: BrewState = { unit: 'oz', brew: [], name: DEFAULT_NAME };
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return fallback;
    const s = JSON.parse(raw) as Partial<BrewState>;
    if (!s || !Array.isArray(s.brew)) return fallback;
    return {
      unit: s.unit && s.unit in UNITS ? s.unit : 'oz',
      brew: s.brew
        .filter((e): e is BrewEntry => !!e && typeof e.id === 'string' && !!ING_BY_ID[e.id])
        .map((e) => ({ id: e.id, ml: +e.ml || 0 }))
        .filter((e) => e.ml > 0),
      name: typeof s.name === 'string' && s.name ? s.name : DEFAULT_NAME,
    };
  } catch {
    return fallback;
  }
}

export function useBrewStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* private mode / quota — ignore */
    }
  }, [state]);

  return [state, dispatch] as const;
}
