import { beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppModel } from '../../app/types';
import { scoreDeltas } from '../../lib/coach';
import { harmony, resemblance } from '../../lib/harmony';
import { mixColor } from '../../lib/color';
import { brewStats, inferGarnish, inferGlass, inferMethod } from '../../lib/serve';
import { Shelf } from './Shelf';

function modelFor(brew: { id: string; ml: number }[]): AppModel {
  const match = resemblance(brew);
  const recipe = match?.recipe ?? null;
  const method = inferMethod(brew, recipe);
  return {
    brew, name: 'Test', unit: 'oz', h: harmony(brew), mix: mixColor(brew), match, method,
    stats: brewStats(brew, method), glass: inferGlass(brew, method, recipe),
    garnish: inferGarnish(brew, recipe), deltas: scoreDeltas(brew), suggestions: [], tips: [],
  };
}

// jsdom has no ResizeObserver or scrollTo; the shelf uses them for its scroll edges
beforeAll(() => {
  Element.prototype.scrollTo = () => {};
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

function shelfFor(brew: { id: string; ml: number }[]) {
  return render(
    <Shelf model={modelFor(brew)} variant="dock" onPick={vi.fn()} onDragStart={vi.fn()} onServe={vi.fn()} searchRef={{ current: null }} />,
  );
}

// milk and cognac with a little lemon: scores 40, and more milk would score 57 if the score alone decided
const CURDLED = [{ id: 'milk', ml: 20 }, { id: 'cognac', ml: 30 }, { id: 'creme_de_cacao', ml: 20 }, { id: 'lemon_juice', ml: 5 }];

/** The bottle marks on one group's shelf: bottle id to its mark kind, or null for none. */
async function marksIn(group: string, brew = CURDLED): Promise<Map<string, string | null>> {
  const { container } = shelfFor(brew);
  await userEvent.click(screen.getByRole('tab', { name: new RegExp(group) }));
  const out = new Map<string, string | null>();
  for (const b of container.querySelectorAll('[data-bottle]')) {
    const mark = b.querySelector('.bottle__mark');
    out.set(b.getAttribute('data-bottle') ?? '', mark ? (mark.classList.contains('bottle__mark--raise') ? 'raise' : 'clash') : null);
  }
  return out;
}

describe('Shelf badges on a curdled pot', () => {
  it('shows no green +N and no clash dot on milk and cream', async () => {
    const extras = await marksIn('Extras');
    expect(extras.has('milk')).toBe(true);
    expect(extras.has('heavy_cream')).toBe(true);
    expect(extras.get('milk')).toBeNull();
    expect(extras.get('heavy_cream')).toBeNull();
  });

  it('shows none on Irish cream either', async () => {
    const liqueurs = await marksIn('Liqueurs');
    expect(liqueurs.has('irish_cream')).toBe(true);
    expect(liqueurs.get('irish_cream')).toBeNull();
  });

  it('still shows +N on a bottle that really helps', async () => {
    const all = new Map<string, string | null>();
    for (const g of ['Spirits', 'Liqueurs', 'Mixers', 'Syrups']) {
      for (const [id, m] of await marksIn(g)) all.set(id, m);
      cleanup();
    }
    expect([...all.values()]).toContain('raise');
  });

  it('shows the green +N on milk when the pot does not curdle', async () => {
    const extras = await marksIn('Extras', [{ id: 'coffee_liqueur', ml: 30 }, { id: 'vodka', ml: 45 }]);
    expect(extras.get('milk') === 'raise' || extras.get('heavy_cream') === 'raise').toBe(true);
  });
});
