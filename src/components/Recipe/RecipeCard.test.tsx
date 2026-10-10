import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppModel } from '../../app/types';
import { harmony, resemblance } from '../../lib/harmony';
import { mixColor } from '../../lib/color';
import { brewStats, inferGarnish, inferGlass, inferMethod } from '../../lib/serve';
import { RecipeCard } from './RecipeCard';

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: q.includes('min-width'), media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function modelFor(brew: { id: string; ml: number }[], name = 'Negroni'): AppModel {
  const match = resemblance(brew);
  const recipe = match?.recipe ?? null;
  const method = inferMethod(brew, recipe);
  return {
    brew, name, unit: 'oz', h: harmony(brew), mix: mixColor(brew), match, method,
    stats: brewStats(brew, method), glass: inferGlass(brew, method, recipe),
    garnish: inferGarnish(brew, recipe), deltas: null, suggestions: [], tips: [],
  };
}

const NEGRONI = [
  { id: 'gin', ml: 30 }, { id: 'campari', ml: 30 }, { id: 'sweet_vermouth', ml: 30 }, { id: 'orange_slice', ml: 3 },
];

function setup(model = modelFor(NEGRONI)) {
  const props = {
    model,
    onName: vi.fn(), onUnit: vi.fn(), onEdit: vi.fn(), onSetAmount: vi.fn(),
    onRemove: vi.fn(), onClear: vi.fn(), onServe: vi.fn(),
  };
  render(<RecipeCard {...props} />);
  return props;
}

describe('RecipeCard', () => {
  it('shows the name, the classic line and a glass-aware Serve button', () => {
    setup();
    expect(screen.getByText('Negroni')).toBeTruthy();
    expect(screen.getByText(/Recognised classic\. Stirred over ice\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Serve in a rocks glass/ })).toBeTruthy();
    expect(screen.getByText('4 items')).toBeTruthy();
  });

  it('does not call a clashing, low scoring brew close to a classic', () => {
    const sludge = [
      { id: 'heavy_cream', ml: 30 }, { id: 'lime_juice', ml: 25 }, { id: 'mezcal', ml: 30 }, { id: 'ginger_beer', ml: 120 },
    ];
    const model = modelFor(sludge, 'Cursed Sludge');
    expect(model.match?.recipe.name).toBe('Moscow Mule');
    expect(model.h?.score).toBeLessThan(40);
    setup(model);
    expect(screen.queryByText(/Close to/)).toBeNull();
    expect(screen.getByText(/Your own brew\. Built over ice\./)).toBeTruthy();
  });

  it('steps the amount with the arrow keys', async () => {
    const p = setup();
    const pill = screen.getByRole('button', { name: 'Gin, 1 oz' });
    pill.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(p.onSetAmount).toHaveBeenCalledWith('gin', 37.5);
    await userEvent.keyboard('{ArrowLeft}');
    expect(p.onSetAmount).toHaveBeenLastCalledWith('gin', 22.5);
  });

  it('scrubs past the 6px threshold and does not open the dial', () => {
    const p = setup();
    const pill = screen.getByRole('button', { name: 'Gin, 1 oz' });
    // jsdom has no pointer capture
    pill.setPointerCapture = () => {};
    fireEvent.pointerDown(pill, { clientX: 100, button: 0, pointerId: 1 });
    fireEvent.pointerMove(pill, { clientX: 104, pointerId: 1 });
    expect(p.onSetAmount).not.toHaveBeenCalled();
    fireEvent.pointerMove(pill, { clientX: 107, pointerId: 1 });
    expect(p.onSetAmount).toHaveBeenCalledWith('gin', 37.5);
    fireEvent.pointerUp(pill, { pointerId: 1 });
    fireEvent.click(pill);
    expect(p.onEdit).not.toHaveBeenCalled();
  });

  it('opens the dial on click', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Gin, 1 oz' }));
    expect(p.onEdit).toHaveBeenCalledTimes(1);
    expect(p.onEdit.mock.calls[0][0].id).toBe('gin');
  });

  it('removes a row', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Campari' }));
    expect(p.onRemove).toHaveBeenCalledWith('campari');
  });

  it('renames inline: Enter commits, Escape cancels', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { description: 'Click to rename' }));
    let input = screen.getByRole('textbox', { name: 'Brew name' });
    await userEvent.clear(input);
    await userEvent.type(input, 'My negroni{Enter}');
    expect(p.onName).toHaveBeenCalledWith('My negroni');

    await userEvent.click(screen.getByRole('button', { description: 'Click to rename' }));
    input = screen.getByRole('textbox', { name: 'Brew name' });
    await userEvent.type(input, 'xyz{Escape}');
    expect(p.onName).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('has an honest empty state with Serve and Clear disabled', () => {
    setup(modelFor([], 'Untitled brew'));
    expect(screen.getByText('Untitled brew')).toBeTruthy();
    expect(screen.getByText(/Drag a bottle up into the pot/)).toBeTruthy();
    const serve = screen.getByRole('button', { name: /Serve/ }) as HTMLButtonElement;
    expect(serve.disabled).toBe(true);
    expect(serve.textContent).toBe('Serve');
    expect((screen.getByRole('button', { name: 'Clear the pot' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
