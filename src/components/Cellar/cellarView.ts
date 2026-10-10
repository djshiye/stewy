/* Pure helpers for the Cellar list: how a saved date reads, and which glass a saved brew
   is drawn in. Kept apart from the component so they can be tested. */
import type { BrewEntry, GlassKind } from '../../data/types';
import { mixColor } from '../../lib/color';
import { resemblance } from '../../lib/harmony';
import { inferGarnish, inferGlass, inferMethod } from '../../lib/serve';
import { foamFor, garnishFor, iceFor, type GarnishKind, type Ice } from '../../icons/garnish';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", "3 Oct", or "3 Oct 2025" for another year. Counted in calendar days. */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

export interface SavedGlass {
  kind: GlassKind;
  color: string;
  ice: Ice;
  garnish: GarnishKind[];
  foam: string | null;
}

/** Fallback liquid colour when a saved item has none and the mix cannot be read. */
const NO_COLOR = 'rgba(255, 255, 255, 0.14)';

/** The glass a saved brew is drawn in: a matched classic wins, otherwise the serve heuristics. */
export function savedGlass(brew: BrewEntry[], color: string | null): SavedGlass {
  const match = resemblance(brew)?.recipe ?? null;
  const method = inferMethod(brew, match);
  const kind = inferGlass(brew, method, match);
  return {
    kind,
    color: color ?? mixColor(brew)?.css ?? NO_COLOR,
    ice: iceFor(kind, method),
    garnish: garnishFor(inferGarnish(brew, match)),
    foam: foamFor(brew),
  };
}
