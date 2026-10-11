import { describe, expect, it } from 'vitest';
import { keyboardInset, trackKeyboardInset } from './keyboardInset';
import type { KeyboardWindow, VisualViewportLike } from './keyboardInset';

function mockWindow(innerHeight: number, vv: { height: number; offsetTop: number } | null) {
  const listeners = new Map<string, Set<() => void>>();
  const props = new Map<string, string>();
  const viewport: (VisualViewportLike & { height: number; offsetTop: number }) | null = vv && {
    ...vv,
    addEventListener: (type, fn) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(fn); },
    removeEventListener: (type, fn) => { listeners.get(type)?.delete(fn); },
  };
  const win: KeyboardWindow = {
    innerHeight,
    visualViewport: viewport,
    document: { documentElement: { style: { setProperty: (k: string, v: string) => { props.set(k, v); }, removeProperty: (k: string) => { const old = props.get(k) ?? ''; props.delete(k); return old; } } } },
  };
  const fire = (type: 'resize' | 'scroll') => listeners.get(type)?.forEach((fn) => fn());
  const count = () => (listeners.get('resize')?.size ?? 0) + (listeners.get('scroll')?.size ?? 0);
  return { win, viewport, props, fire, count, setInner: (h: number) => { win.innerHeight = h; } };
}

describe('keyboardInset', () => {
  it('is what the visual viewport leaves below it, from innerHeight less its height and offsetTop', () => {
    expect(keyboardInset(mockWindow(844, { height: 844, offsetTop: 0 }).win)).toBe(0);
    expect(keyboardInset(mockWindow(844, { height: 508, offsetTop: 0 }).win)).toBe(336);
    // the page scrolled to reveal the field: the visual viewport has moved down, so less is hidden
    expect(keyboardInset(mockWindow(844, { height: 508, offsetTop: 120 }).win)).toBe(216);
  });

  it('never goes below zero (rubber banding, pinch zoom) and is zero without a visualViewport', () => {
    expect(keyboardInset(mockWindow(844, { height: 844, offsetTop: 30 }).win)).toBe(0);
    expect(keyboardInset(mockWindow(844, { height: 700, offsetTop: 500 }).win)).toBe(0);
    expect(keyboardInset(mockWindow(844, null).win)).toBe(0);
  });
});

describe('trackKeyboardInset', () => {
  it('writes --kb at once and again on every visualViewport resize and scroll', () => {
    const m = mockWindow(844, { height: 844, offsetTop: 0 });
    trackKeyboardInset(m.win);
    expect(m.props.get('--kb')).toBe('0px');
    m.viewport!.height = 508;
    m.fire('resize');
    expect(m.props.get('--kb')).toBe('336px');
    m.viewport!.offsetTop = 120;
    m.fire('scroll');
    expect(m.props.get('--kb')).toBe('216px');
  });

  it('removes its listeners and the property when stopped', () => {
    const m = mockWindow(844, { height: 508, offsetTop: 0 });
    const stop = trackKeyboardInset(m.win);
    expect(m.count()).toBe(2);
    expect(m.props.has('--kb')).toBe(true);
    stop();
    expect(m.count()).toBe(0);
    expect(m.props.has('--kb')).toBe(false);
    m.viewport!.height = 300;
    m.fire('resize');
    expect(m.props.has('--kb')).toBe(false);
  });

  it('does nothing without a visualViewport', () => {
    const m = mockWindow(844, null);
    const stop = trackKeyboardInset(m.win);
    expect(m.props.has('--kb')).toBe(false);
    expect(() => stop()).not.toThrow();
  });
});
