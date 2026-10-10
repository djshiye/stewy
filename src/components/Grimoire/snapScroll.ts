/**
 * Where to scroll the index so a cell is in view and the first visible row is whole.
 *
 * `rowTops` are the offsets of each grid row's top inside the scroller's content (ascending), `cellTop`
 * and `cellHeight` locate the cell, `viewport` is the scroller's visible height and `max` its largest
 * scrollTop. The cell is centred first, then the result snaps to the nearest row top that still keeps
 * the whole cell visible (the row of the cell, or an earlier one).
 */
export function snapToRow(
  rowTops: readonly number[],
  cellTop: number,
  cellHeight: number,
  viewport: number,
  max: number,
): number {
  const wanted = cellTop - (viewport - cellHeight) / 2;
  const reachable = rowTops.filter((t) => t <= max);
  const fits = reachable.filter((t) => t <= cellTop && t + viewport >= cellTop + cellHeight);
  const pool = fits.length ? fits : reachable.filter((t) => t <= cellTop);
  if (!pool.length) return Math.max(0, Math.min(max, wanted));
  let best = pool[0];
  for (const t of pool) if (Math.abs(t - wanted) < Math.abs(best - wanted)) best = t;
  return Math.max(0, best);
}
