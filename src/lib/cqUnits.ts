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
