import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useHotkeys } from './useHotkeys';
import { Sheet } from '../components/ui/Sheet';

if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false, media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function handlers() {
  return {
    onUndo: vi.fn(), onRedo: vi.fn(), onSearch: vi.fn(),
    onGrimoire: vi.fn(), onCellar: vi.fn(), onServe: vi.fn(),
  };
}

function Harness({ h, sheet }: { h: ReturnType<typeof handlers>; sheet?: boolean }) {
  useHotkeys(h);
  return (
    <>
      <button>plain</button>
      <input aria-label="search" />
      <textarea aria-label="notes" />
      <select aria-label="pick"><option>a</option></select>
      <div contentEditable suppressContentEditableWarning data-testid="editable" tabIndex={0}>
        <span data-testid="inner">text</span>
      </div>
      <Sheet open={!!sheet} onClose={() => {}} labelledBy="t" size="cellar">
        <h2 id="t">Sheet</h2>
        <input aria-label="sheet field" data-autofocus />
      </Sheet>
    </>
  );
}

const none = (h: ReturnType<typeof handlers>) => Object.values(h).forEach((f) => expect(f).not.toHaveBeenCalled());

describe('useHotkeys', () => {
  it('fires G, C, S and / from the page', async () => {
    const h = handlers();
    render(<Harness h={h} />);
    const user = userEvent.setup();
    await user.keyboard('gcs/');
    expect(h.onGrimoire).toHaveBeenCalledOnce();
    expect(h.onCellar).toHaveBeenCalledOnce();
    expect(h.onServe).toHaveBeenCalledOnce();
    expect(h.onSearch).toHaveBeenCalledOnce();
  });

  it('undoes and redoes with Ctrl or Cmd outside text fields', () => {
    const h = handlers();
    render(<Harness h={h} />);
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true, shiftKey: true });
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true });
    expect(h.onUndo).toHaveBeenCalledOnce();
    expect(h.onRedo).toHaveBeenCalledTimes(2);
  });

  it.each(['search', 'notes', 'pick'])('never fires while typing in the %s field', async (label) => {
    const h = handlers();
    render(<Harness h={h} />);
    const el = screen.getByLabelText(label);
    el.focus();
    await userEvent.setup().keyboard('gcs/GCS');
    none(h);
  });

  it('never fires inside contenteditable, nested elements included', () => {
    const h = handlers();
    render(<Harness h={h} />);
    for (const id of ['editable', 'inner']) {
      for (const key of ['g', 'c', 's', '/']) fireEvent.keyDown(screen.getByTestId(id), { key });
    }
    none(h);
  });

  it('leaves Ctrl and Cmd+Z to the field own undo', () => {
    const h = handlers();
    render(<Harness h={h} />);
    for (const el of [screen.getByLabelText('search'), screen.getByLabelText('notes'), screen.getByTestId('editable')]) {
      el.focus();
      // fireEvent returns false when the default was prevented
      expect(fireEvent.keyDown(el, { key: 'z', ctrlKey: true })).toBe(true);
      expect(fireEvent.keyDown(el, { key: 'z', metaKey: true, shiftKey: true })).toBe(true);
      expect(fireEvent.keyDown(el, { key: 'y', ctrlKey: true })).toBe(true);
    }
    none(h);
  });

  it('stands down for letters, and for text undo, when a sheet field has focus', async () => {
    const h = handlers();
    render(<Harness h={h} sheet />);
    const field = screen.getByLabelText('sheet field');
    expect(document.activeElement).toBe(field);
    await userEvent.setup().keyboard('gcs/');
    expect(fireEvent.keyDown(field, { key: 'z', ctrlKey: true })).toBe(true);
    none(h);
  });

  it('stands down for letters while a sheet is open even without a field focused', () => {
    const h = handlers();
    render(<Harness h={h} sheet />);
    (document.activeElement as HTMLElement).blur();
    fireEvent.keyDown(document.body, { key: 'g' });
    expect(h.onGrimoire).not.toHaveBeenCalled();
  });
});
