import type { BrewEntry, GlassKind, Ingredient, Method, Recipe } from '../data/types';
import type { Harmony, Suggestion } from '../lib/harmony';
import type { Mix } from '../lib/color';
import type { BrewStats } from '../lib/serve';
import type { CoachSuggestion, Delta } from '../lib/coach';
import type { UnitKey } from '../lib/units';

export interface AppModel {
  brew: BrewEntry[];
  name: string;
  unit: UnitKey;
  h: Harmony | null;
  mix: Mix | null;
  match: { recipe: Recipe; sim: number } | null;
  method: Method;
  stats: BrewStats;
  glass: GlassKind;
  garnish: string | null;
  deltas: Map<string, Delta> | null;   // scoreDeltas(brew)
  suggestions: CoachSuggestion[];      // topSuggestions(brew, 3)
  tips: Suggestion[];                  // harmony suggestions(h, brew)
}

/** A pour that just happened (drives the splash and ripple in the pot). */
export interface PourEvent { id: number; color: string; ingId: string }

/** Opens the Pour dial. */
export interface DialRequest {
  ing: Ingredient;
  mode: 'add' | 'edit';
  /** ml currently in the brew (edit) or the default pour (add). */
  ml: number;
  /** element the dial anchors to on desktop (row or bottle), optional */
  anchor?: DOMRect | null;
}
