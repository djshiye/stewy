import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AppModel } from '../../app/types';
import { ING_BY_ID } from '../../data/ingredients';
import type { CoachSuggestion } from '../../lib/coach';
import { harmony, resemblance } from '../../lib/harmony';
import { mixColor } from '../../lib/color';
import { brewStats, inferGarnish, inferGlass, inferMethod } from '../../lib/serve';
import { BrewSummary } from './BrewSummary';

function modelFor(brew: { id: string; ml: number }[], suggestions: CoachSuggestion[] = []): AppModel {
  const match = resemblance(brew);
  const recipe = match?.recipe ?? null;
  const method = inferMethod(brew, recipe);
  return {
    brew, name: 'Test', unit: 'oz', h: harmony(brew), mix: mixColor(brew), match, method,
    stats: brewStats(brew, method), glass: inferGlass(brew, method, recipe),
    garnish: inferGarnish(brew, recipe), deltas: null, suggestions, tips: [],
  };
}

describe('BrewSummary', () => {
  it('shows the Try adding chips when something is worth adding', () => {
    const s: CoachSuggestion = { ing: ING_BY_ID.lime_juice, ml: 15, delta: 4, score: 90, inBrew: false };
    render(<BrewSummary model={modelFor([{ id: 'gin', ml: 45 }], [s])} onShare={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.getByText('Try adding')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Lime juice/ })).toBeTruthy();
  });

  // The phone drops the strip entirely rather than leave a label with nothing after it; the analysis card's
  // headline tip under "Why it scores" already says what is wrong with a split brew.
  it('leaves the strip out, label and all, on a split brew with nothing to add', () => {
    const split = [{ id: 'milk', ml: 20 }, { id: 'cognac', ml: 30 }, { id: 'creme_de_cacao', ml: 20 }, { id: 'lemon_juice', ml: 5 }];
    render(<BrewSummary model={modelFor(split)} onShare={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.queryByText('Try adding')).toBeNull();
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('button', { name: 'Share this brew' })).toBeTruthy();
  });
});
