import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { getClassics } from './classics';
import { Grimoire } from './Grimoire';

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

const total = getClassics().length;

/** The glass slot of a cell: the drawn SVG, or the placeholder that holds its place. */
const glassOf = (cell: Element) => cell.querySelector('.grim-cell__stage > .grim-cell__glass');

function mount(currentId: string | null = null) {
  return render(<Grimoire open currentId={currentId} onClose={() => {}} onLoad={() => {}} />);
}

describe('Grimoire glasses without IntersectionObserver', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  });
  afterEach(() => vi.restoreAllMocks());

  it('draws every glass straight away', () => {
    expect(typeof IntersectionObserver).toBe('undefined');
    mount();
    const cells = document.querySelectorAll('.grim-cell');
    expect(cells).toHaveLength(total);
    for (const cell of cells) expect(glassOf(cell)?.tagName.toLowerCase()).toBe('svg');
    expect(document.querySelector('.grim-cell__glass--ph')).toBeNull();
  });
});

describe('Grimoire deferred glasses', () => {
  let observers: StubObserver[];

  class StubObserver {
    targets = new Set<Element>();
    constructor(
      readonly cb: IntersectionObserverCallback,
      readonly init?: IntersectionObserverInit,
    ) {
      observers.push(this);
    }
    observe(el: Element) { this.targets.add(el); }
    unobserve(el: Element) { this.targets.delete(el); }
    disconnect() { this.targets.clear(); }
    takeRecords() { return []; }
    /** Report these elements as near the scroller. */
    reach(...els: Element[]) {
      this.cb(els.map((target) => ({ target, isIntersecting: true }) as IntersectionObserverEntry), this as unknown as IntersectionObserver);
    }
  }

  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', StubObserver);
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
    // jsdom has no layout: the scroller is 0 to 600 tall and every cell sits a long way below it
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const near = this.classList.contains('grim__scroll');
      return { top: near ? 0 : 5000, bottom: near ? 600 : 5300, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('holds each cell with a placeholder of the same size class until it comes near', () => {
    mount();
    const cells = [...document.querySelectorAll('.grim-cell')];
    expect(cells).toHaveLength(total);
    for (const cell of cells) {
      const slot = glassOf(cell);
      expect(slot?.tagName.toLowerCase()).toBe('span');
      expect(slot?.classList.contains('grim-cell__glass')).toBe(true);
      expect(slot?.classList.contains('grim-cell__glass--ph')).toBe(true);
      expect(slot?.getAttribute('aria-hidden')).toBe('true');
      // the stage that sizes the cell is untouched
      expect(cell.querySelector(':scope > .grim-cell__stage')).not.toBeNull();
    }
    expect(document.querySelector('.grim__scroll svg')).toBeNull();
  });

  it('draws the glass, with the same class plus a fade, when the observer reports the cell near', () => {
    mount();
    const cell = document.querySelectorAll('.grim-cell')[7];
    expect(observers).toHaveLength(1);
    expect(observers[0].init?.root).toBe(document.querySelector('.grim__scroll'));
    expect(observers[0].targets.has(cell)).toBe(true);
    act(() => observers[0].reach(cell));
    const slot = glassOf(cell);
    expect(slot?.tagName.toLowerCase()).toBe('svg');
    expect(slot?.classList.contains('grim-cell__glass')).toBe(true);
    expect(slot?.classList.contains('grim-cell__glass--in')).toBe(true);
    expect(observers[0].targets.has(cell)).toBe(false);
    // the others wait
    expect(glassOf(document.querySelectorAll('.grim-cell')[8])?.tagName.toLowerCase()).toBe('span');
  });

  it('draws the cell in the pot with the first paint, with no fade', () => {
    mount('negroni');
    const cell = document.querySelector('.grim-cell[data-id="negroni"]')!;
    const slot = glassOf(cell);
    expect(slot?.tagName.toLowerCase()).toBe('svg');
    expect(slot?.classList.contains('grim-cell__glass--in')).toBe(false);
  });

  it('draws the cells already in view before the first paint', () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const id = this.getAttribute('data-id');
      const top = this.classList.contains('grim__scroll') ? 0 : id === getClassics()[2].recipe.id ? 100 : 5000;
      return { top, bottom: top + 300, left: 0, right: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} };
    });
    mount();
    const cells = document.querySelectorAll('.grim-cell');
    expect(glassOf(cells[2])?.tagName.toLowerCase()).toBe('svg');
    expect(glassOf(cells[2])?.classList.contains('grim-cell__glass--in')).toBe(false);
    expect(glassOf(cells[3])?.tagName.toLowerCase()).toBe('span');
  });
});
