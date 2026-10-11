/**
 * Container query units inside a CSS `zoom` should be measured in the zoomed (CSS) pixels. WebKit reports them
 * in viewport pixels instead, so 100cqw comes out times the zoom and, used as a length, gets zoomed again. This
 * measures the engine once and, when it is wrong, marks the root so tokens.css divides the units by the zoom.
 */
export function detectCqZoom(doc: Document = document): boolean {
  const host = doc.createElement('div');
  host.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;zoom:2;container-type:size;width:100px;height:100px';
  const probe = doc.createElement('div');
  probe.style.cssText = 'width:100cqw;height:1px';
  host.appendChild(probe);
  doc.body.appendChild(host);
  const w = parseFloat(doc.defaultView?.getComputedStyle(probe).width ?? '');
  host.remove();
  return Number.isFinite(w) && w > 150;
}

/** Marks the root when the engine needs the container-unit correction. */
export function applyCqZoomFix(doc: Document = document): void {
  if (detectCqZoom(doc)) doc.documentElement.setAttribute('data-cq-zoom', '');
}

/**
 * WebKit before Safari 26.4 implements CSS `zoom` the old way: getBoundingClientRect returns unzoomed values while
 * pointer coordinates stay in viewport pixels, and viewport units inside a zoomed box are not scaled. Every piece
 * of the interface scale (the shell height, the tooltip, the drag ghost, the pill scrub, the dial) assumes the
 * modern behaviour, so those engines get no zoom at all. A zoom: 2 box 50px wide measures 100 where the zoom
 * is applied to the box (modern) and 50 where it is not (legacy); a browser without zoom reads 50 as well.
 */
export function detectLegacyZoom(doc: Document = document): boolean {
  const host = doc.createElement('div');
  host.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;zoom:2;width:50px;height:1px';
  doc.body.appendChild(host);
  const w = host.getBoundingClientRect().width;
  host.remove();
  return Number.isFinite(w) && w < 75;
}

/** Marks the root when the engine's zoom cannot be trusted, so tokens.css pins --ui-zoom to 1. */
export function applyLegacyZoomGuard(doc: Document = document): void {
  if (detectLegacyZoom(doc)) doc.documentElement.setAttribute('data-legacy-zoom', '');
}
