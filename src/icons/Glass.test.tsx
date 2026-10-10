import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { GlassKind } from '../data/types';
import { Glass } from './Glass';
import { GARNISH_KINDS } from './garnish';

const KINDS: GlassKind[] = ['coupe', 'martini', 'rocks', 'highball', 'copper-mug', 'wine', 'flute', 'hurricane', 'julep', 'tiki'];

describe('Glass', () => {
  it.each(KINDS)('renders a %s in the shared box without filters', (kind) => {
    const { container } = render(<Glass kind={kind} color="rgb(190, 40, 60)" ice="cubes" condensation />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('0 0 120 160');
    expect(container.querySelector('filter')).toBeNull();
    expect(container.querySelectorAll('path').length).toBeGreaterThan(3);
  });

  it('renders every ice type, foam and garnish for every glass', () => {
    for (const kind of KINDS) {
      for (const ice of ['none', 'cubes', 'large-cube', 'crushed'] as const) {
        const { container, unmount } = render(
          <Glass kind={kind} color="#d9a441" ice={ice} foam="#f5efe3" garnish={[...GARNISH_KINDS]} fill={0.5} />,
        );
        expect(container.querySelector('svg')).not.toBeNull();
        expect(container.innerHTML).not.toMatch(/NaN|undefined/);
        unmount();
      }
    }
  });

  it('is decorative without a title and labelled with one', () => {
    const a = render(<Glass kind="rocks" color="#c0392b" />);
    expect(a.container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(a.container.querySelector('title')).toBeNull();
    const b = render(<Glass kind="rocks" color="#c0392b" title="Negroni in a rocks glass" />);
    const svg = b.container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelector('title')!.textContent).toBe('Negroni in a rocks glass');
  });

  it('gives each instance its own gradient ids', () => {
    const { container } = render(<><Glass kind="coupe" color="#fff" /><Glass kind="coupe" color="#fff" /></>);
    const ids = Array.from(container.querySelectorAll('[id]')).map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((i) => /^[a-zA-Z0-9_-]+$/.test(i))).toBe(true);
  });

  it('accepts hex, rgb and rgba colours and crops with fit', () => {
    for (const color of ['#abc', '#aabbcc', 'rgb(1, 2, 3)', 'rgba(255, 255, 255, 0.14)', 'nonsense']) {
      const { container, unmount } = render(<Glass kind="martini" color={color} fit />);
      expect(container.innerHTML).not.toMatch(/NaN/);
      expect(container.querySelector('svg')!.getAttribute('viewBox')).toMatch(/^0 \d+(\.\d+)? 120 /);
      unmount();
    }
  });
});
