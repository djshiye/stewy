import { afterEach, describe, expect, it } from 'vitest';
import { applyCqZoomFix, detectCqZoom } from './cqUnits';

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
