import { useMemo } from 'react';
import type { BrewState } from '../store';
import { harmony, resemblance, suggestions } from '../lib/harmony';
import { mixColor } from '../lib/color';
import { brewStats, inferGarnish, inferGlass, inferMethod } from '../lib/serve';
import { scoreDeltas, topSuggestions } from '../lib/coach';
import type { AppModel } from './types';

/** Everything the UI shows about the current brew, derived once per change. */
export function useAppModel(state: Pick<BrewState, 'brew' | 'name' | 'unit'>): AppModel {
  const { brew, name, unit } = state;

  const h = useMemo(() => harmony(brew), [brew]);
  const mix = useMemo(() => mixColor(brew), [brew]);
  const match = useMemo(() => resemblance(brew), [brew]);
  const recipe = match?.recipe ?? null;
  const method = useMemo(() => inferMethod(brew, recipe), [brew, recipe]);
  const stats = useMemo(() => brewStats(brew, method), [brew, method]);
  const glass = useMemo(() => inferGlass(brew, method, recipe), [brew, method, recipe]);
  const garnish = useMemo(() => inferGarnish(brew, recipe), [brew, recipe]);
  const deltas = useMemo(() => scoreDeltas(brew), [brew]);
  const suggested = useMemo(() => topSuggestions(brew, 3), [brew]);
  const tips = useMemo(() => suggestions(h, brew), [h, brew]);

  return useMemo<AppModel>(
    () => ({
      brew, name, unit, h, mix, match, method, stats, glass, garnish, deltas,
      suggestions: suggested, tips,
    }),
    [brew, name, unit, h, mix, match, method, stats, glass, garnish, deltas, suggested, tips],
  );
}
