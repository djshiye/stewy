/**
 * The on-screen keyboard on iOS covers the bottom of the layout viewport without resizing it, so a fixed bar
 * (the dock, with the shelf search in its top row) stays behind the keys. The visual viewport is what is left
 * above the keyboard: its height shrinks, and its offsetTop grows when the page has been scrolled to reveal the
 * field. What the keyboard hides is whatever is below the visual viewport.
 */
export interface VisualViewportLike {
  height: number;
  offsetTop: number;
  addEventListener(type: 'resize' | 'scroll', listener: () => void): void;
  removeEventListener(type: 'resize' | 'scroll', listener: () => void): void;
}

export interface KeyboardWindow {
  innerHeight: number;
  visualViewport?: VisualViewportLike | null;
  document: { documentElement: { style: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'> } };
}

/** Pixels of the layout viewport hidden below the visual viewport (0 with no keyboard or no visualViewport). */
export function keyboardInset(win: KeyboardWindow): number {
  const vv = win.visualViewport;
  if (!vv) return 0;
  const hidden = win.innerHeight - vv.height - vv.offsetTop;
  return Number.isFinite(hidden) ? Math.max(0, hidden) : 0;
}

/**
 * Writes the inset to --kb on the root (in px) now and on every visualViewport resize and scroll, until the
 * returned function is called, which removes the listeners and the property.
 */
export function trackKeyboardInset(win: KeyboardWindow = window): () => void {
  const vv = win.visualViewport;
  const style = win.document.documentElement.style;
  if (!vv) return () => {};
  const update = () => style.setProperty('--kb', `${keyboardInset(win)}px`);
  update();
  vv.addEventListener('resize', update);
  vv.addEventListener('scroll', update);
  return () => {
    vv.removeEventListener('resize', update);
    vv.removeEventListener('scroll', update);
    style.removeProperty('--kb');
  };
}
