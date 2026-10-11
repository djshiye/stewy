import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyCqZoomFix, applyLegacyZoomGuard, detectCqZoom, detectLegacyZoom } from './cqUnits';

describe('container unit zoom fix', () => {
  afterEach(() => document.documentElement.removeAttribute('data-cq-zoom'));

  it('leaves the root alone where the engine cannot report the units (jsdom)', () => {
    expect(detectCqZoom()).toBe(false);
    applyCqZoomFix();
    expect(document.documentElement.hasAttribute('data-cq-zoom')).toBe(false);
  });

  it('marks the root when the probe reports the unit times the zoom', () => {
    const real = window.getComputedStyle;
    window.getComputedStyle = (() => ({ width: '200px' })) as unknown as typeof window.getComputedStyle;
    try {
      applyCqZoomFix();
      expect(document.documentElement.hasAttribute('data-cq-zoom')).toBe(true);
    } finally {
      window.getComputedStyle = real;
    }
  });

  it('does not mark the root when the probe reports the CSS size', () => {
    const real = window.getComputedStyle;
    window.getComputedStyle = (() => ({ width: '100px' })) as unknown as typeof window.getComputedStyle;
    try {
      applyCqZoomFix();
      expect(document.documentElement.hasAttribute('data-cq-zoom')).toBe(false);
    } finally {
      window.getComputedStyle = real;
    }
  });
});

describe('legacy zoom guard', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-legacy-zoom');
    vi.restoreAllMocks();
  });

  const reportWidth = (width: number) =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width } as DOMRect);

  it('probes with a zoom: 2 box that is 50px wide and removes it again', () => {
    let seen = '';
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      seen = this.style.cssText;
      expect(this.isConnected).toBe(true);
      return { width: 100 } as DOMRect;
    });
    detectLegacyZoom();
    expect(seen).toContain('zoom: 2');
    expect(seen).toContain('width: 50px');
    expect(document.body.children).toHaveLength(0);
  });

  it('marks the root when the box reports 50 (Safari before 26.4, or an engine without zoom)', () => {
    reportWidth(50);
    expect(detectLegacyZoom()).toBe(true);
    applyLegacyZoomGuard();
    expect(document.documentElement.hasAttribute('data-legacy-zoom')).toBe(true);
  });

  it('leaves the root alone when the box reports 100 (Chrome, Firefox, Safari 26.4 and later)', () => {
    reportWidth(100);
    expect(detectLegacyZoom()).toBe(false);
    applyLegacyZoomGuard();
    expect(document.documentElement.hasAttribute('data-legacy-zoom')).toBe(false);
  });

  it('treats the middle as modern only from 75 up', () => {
    reportWidth(74.9);
    expect(detectLegacyZoom()).toBe(true);
    reportWidth(75);
    expect(detectLegacyZoom()).toBe(false);
  });

  it('keeps the two detections apart: the cq fix on modern WebKit, the guard on 16.4 to 26.3', () => {
    const real = window.getComputedStyle;
    try {
      // modern WebKit (27.2): zoom applied to the box, container units reported zoomed
      reportWidth(100);
      window.getComputedStyle = (() => ({ width: '200px' })) as unknown as typeof window.getComputedStyle;
      applyLegacyZoomGuard();
      applyCqZoomFix();
      expect(document.documentElement.hasAttribute('data-legacy-zoom')).toBe(false);
      expect(document.documentElement.hasAttribute('data-cq-zoom')).toBe(true);
      document.documentElement.removeAttribute('data-cq-zoom');
      // legacy WebKit (18.4): the guard fires and the root ladder is pinned to 1 by tokens.css
      reportWidth(50);
      window.getComputedStyle = (() => ({ width: '100px' })) as unknown as typeof window.getComputedStyle;
      applyLegacyZoomGuard();
      applyCqZoomFix();
      expect(document.documentElement.hasAttribute('data-legacy-zoom')).toBe(true);
      expect(document.documentElement.hasAttribute('data-cq-zoom')).toBe(false);
    } finally {
      window.getComputedStyle = real;
      document.documentElement.removeAttribute('data-cq-zoom');
    }
  });
});
