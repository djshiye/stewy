import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppModel } from '../../app/types';
import { ING_BY_ID } from '../../data/ingredients';
import type { CoachSuggestion } from '../../lib/coach';
import { harmony, resemblance } from '../../lib/harmony';
import { mixColor } from '../../lib/color';
import { brewStats, inferGarnish, inferGlass, inferMethod } from '../../lib/serve';
import { AnalysisPanel } from './AnalysisPanel';
import { finishedNote, worthAdding } from './suggestions';

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

const sug = (id: string, delta: number): CoachSuggestion => ({
  ing: ING_BY_ID[id], ml: 15, delta, score: 90, inBrew: false,
});

const NEGRONI = [{ id: 'gin', ml: 30 }, { id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }];

describe('suggestions', () => {
  it('keeps only additions worth 3 points or more', () => {
    const kept = worthAdding([sug('triple_sec', 2), sug('lime_juice', 3), sug('gin', 7)]);
    expect(kept.map((s) => s.ing.id)).toEqual(['lime_juice', 'gin']);
  });

  it('words the finished state by score', () => {
    expect(finishedNote(90)).toEqual({ done: true, text: 'Nothing on the shelf improves this by more than a point or two.' });
    expect(finishedNote(60).done).toBe(false);
    expect(finishedNote(60).text).toBe('No single addition helps much. Try adjusting the measures instead.');
  });
});

describe('AnalysisPanel', () => {
  it('lists only meaningful suggestions', () => {
    render(<AnalysisPanel model={modelFor(NEGRONI, [sug('triple_sec', 2), sug('lime_juice', 4)])} onAdd={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Lime juice/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Triple sec/ })).toBeNull();
  });

  it('shows a quiet finished state when nothing qualifies', () => {
    render(<AnalysisPanel model={modelFor(NEGRONI, [sug('triple_sec', 2)])} onAdd={vi.fn()} />);
    expect(screen.queryByText('Try adding')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Triple sec/ })).toBeNull();
    expect(screen.getByText(/Nothing on the shelf improves this|No single addition helps much/)).toBeTruthy();
  });

  it('offers three classics on an empty pot and loads the one picked', async () => {
    const onLoadRecipe = vi.fn();
    render(<AnalysisPanel model={modelFor([])} onAdd={vi.fn()} onLoadRecipe={onLoadRecipe} />);
    expect(screen.getByText('Start from a classic')).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    for (const name of ['Negroni', 'Daiquiri', 'Old Fashioned']) expect(screen.getByText(name)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /Load Daiquiri/ }));
    expect(onLoadRecipe).toHaveBeenCalledWith(expect.objectContaining({ id: 'daiquiri' }));
  });

  it('hides the picks without a handler or once a brew exists', () => {
    const { unmount } = render(<AnalysisPanel model={modelFor([])} onAdd={vi.fn()} />);
    expect(screen.queryByText('Start from a classic')).toBeNull();
    unmount();
    render(<AnalysisPanel model={modelFor(NEGRONI)} onAdd={vi.fn()} onLoadRecipe={vi.fn()} />);
    expect(screen.queryByText('Start from a classic')).toBeNull();
  });
});
