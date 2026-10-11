import type { CoachSuggestion } from '../../lib/coach';
import type { UnitKey } from '../../lib/units';
import { amountLabel } from '../../lib/units';

const LOWER_GROUPS = new Set(['Juices', 'Mixers', 'Syrups', 'Extras', 'Garnish']);

/** "Orange bitters" or, when it is already in the brew, "More orange slice". */
export function suggestionName(s: CoachSuggestion): string {
  if (!s.inBrew) return s.ing.name;
  const n = s.ing.name;
  const tail = LOWER_GROUPS.has(s.ing.group) ? n.charAt(0).toLowerCase() + n.slice(1) : n;
  return `More ${tail}`;
}

/** The suggested amount in the active unit ("0.5 oz", "1 dash"). */
export function suggestionAmount(s: CoachSuggestion, unit: UnitKey): string {
  return amountLabel({ id: s.ing.id, ml: s.ml }, s.ing, unit);
}

/** Smallest score gain worth showing; anything less is noise a drinker cannot taste. */
export const MIN_SUGGESTION_DELTA = 3;

/** Only the additions that move the score by a meaningful amount. */
export function worthAdding(list: readonly CoachSuggestion[]): CoachSuggestion[] {
  return list.filter((s) => s.delta >= MIN_SUGGESTION_DELTA);
}

/** The quiet line shown when a brew exists but nothing on the shelf is worth adding. A curdled pot gets its
    own line: the headline tip already says to pick one or the other, so this only says the shelf cannot help. */
export function finishedNote(score: number, curdled = false): { done: boolean; text: string } {
  if (curdled) return { done: false, text: 'Nothing on the shelf saves a split brew.' };
  return score >= 80
    ? { done: true, text: 'Nothing on the shelf improves this by more than a point or two.' }
    : { done: false, text: 'No single addition helps much. Try adjusting the measures instead.' };
}
