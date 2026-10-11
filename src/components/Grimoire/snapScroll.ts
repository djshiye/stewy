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

/**
 * Extra room below the index when the scroll limit leaves no row to land on that shows the whole cell. A viewport
 * a little over two rows (say 2.03) stops 10 px short of the row above the last, so the snap would fall back to
 * an earlier row and the last row would hardly show. The room lets the nearest row above the cell that shows it
 * whole reach the top of the view. When no earlier row can show it (a view under two rows tall, as on a phone in
 * landscape), the room lets the cell's own row reach the top instead, so the cell is whole when the view is at
 * least as tall as the cell, and shows its top when it is not.
 * It is 0 when a reachable row already shows the cell whole.
 * `contentHeight` is the scroller's scroll height without that room.
 */
export function tailPadding(
  rowTops: readonly number[],
  cellTop: number,
  cellHeight: number,
  viewport: number,
  contentHeight: number,
): number {
  const max = contentHeight - viewport;
  const whole = (t: number) => t <= cellTop && t + viewport >= cellTop + cellHeight;
  if (rowTops.some((t) => t <= max && whole(t))) return 0;
  const row = rowTops.find((t) => t < cellTop && whole(t)) ?? cellTop;
  return Math.max(0, Math.ceil(row - max));
}
