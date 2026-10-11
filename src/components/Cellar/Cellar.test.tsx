import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { CellarItem } from '../../cellar';
import { Cellar } from './Cellar';

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom has no layout, so nothing counts as rendered; pretend everything is
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
});
afterEach(() => vi.restoreAllMocks());

const item = (name: string, day: number): CellarItem => ({
  id: name.toLowerCase(),
  name,
  brew: [{ id: 'gin', ml: 30 }],
  score: 80,
  color: null,
  savedAt: new Date(Date.UTC(2026, 0, day, 12)).toISOString(),
});

const ALPHA = item('Alpha', 3);
const BRAVO = item('Bravo', 2);
const CHARLIE = item('Charlie', 1);

/** The Cellar over a real list, with delete and restore wired the way the app does (restore puts it back by date). */
function Harness({ start }: { start: CellarItem[] }) {
  const [items, setItems] = useState(start);
  return (
    <>
      <button onClick={() => setItems((cur) => [...cur, BRAVO].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)))}>restore-bravo</button>
      <Cellar
        open
        items={items}
        onClose={() => {}}
        onLoad={() => {}}
        onRename={() => {}}
        onDelete={(it) => setItems((cur) => cur.filter((x) => x.id !== it.id))}
        onOpenGrimoire={() => {}}
      />
    </>
  );
}

const del = (name: string) => screen.getByRole('button', { name: `Delete ${name}` });
const inDialog = () => !!document.activeElement?.closest('[role="dialog"]');

function deleteWithKeyboard(name: string) {
  act(() => del(name).focus());
  fireEvent.click(del(name)); // Enter on a button is a click
}

describe('Cellar focus after a delete', () => {
  it('moves to the Delete button of the next brew', () => {
    render(<Harness start={[ALPHA, BRAVO, CHARLIE]} />);
    deleteWithKeyboard('Bravo');
    expect(document.activeElement).toBe(del('Charlie'));
    expect(inDialog()).toBe(true);
  });

  it('moves to the previous brew when the last one went', () => {
    render(<Harness start={[ALPHA, BRAVO, CHARLIE]} />);
    deleteWithKeyboard('Charlie');
    expect(document.activeElement).toBe(del('Bravo'));
  });

  it('moves to the heading when the list is empty', () => {
    render(<Harness start={[ALPHA]} />);
    deleteWithKeyboard('Alpha');
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'The Cellar' }));
    expect(inDialog()).toBe(true);
  });

  it('leaves focus alone when it was not on the deleted row', () => {
    render(<Harness start={[ALPHA, BRAVO]} />);
    act(() => del('Alpha').focus());
    fireEvent.click(del('Bravo'));
    expect(document.activeElement).toBe(del('Alpha'));
  });
});

describe('Cellar focus after an Undo', () => {
  it('returns to the restored row when focus was in the dialog', () => {
    render(<Harness start={[ALPHA, BRAVO, CHARLIE]} />);
    deleteWithKeyboard('Bravo');
    act(() => screen.getByText('restore-bravo').click());
    expect(document.activeElement).toBe(del('Bravo'));
  });

  it('returns to the restored row when the toast button that ran the Undo has just left', () => {
    render(<Harness start={[ALPHA, BRAVO, CHARLIE]} />);
    deleteWithKeyboard('Bravo');
    const toaster = document.body.appendChild(document.createElement('div'));
    toaster.className = 'ui-toaster';
    const undo = toaster.appendChild(document.createElement('button'));
    act(() => undo.focus());
    act(() => screen.getByText('restore-bravo').click());
    expect(document.activeElement).toBe(del('Bravo'));
    toaster.remove();
  });

  it('does not take focus from somewhere else on the page', () => {
    render(<Harness start={[ALPHA, BRAVO, CHARLIE]} />);
    deleteWithKeyboard('Bravo');
    const outside = document.body.appendChild(document.createElement('input'));
    act(() => outside.focus());
    act(() => screen.getByText('restore-bravo').click());
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
