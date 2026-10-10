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
