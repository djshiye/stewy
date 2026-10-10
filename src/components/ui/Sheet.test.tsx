import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sheet } from './Sheet';

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

function Demo({ open, onClose = () => {} }: { open: boolean; onClose?: () => void }) {
  return (
    <>
      <button>opener</button>
      <Sheet open={open} onClose={onClose} labelledBy="a-title" size="cellar">
        <h2 id="a-title">First</h2>
        <button>one</button>
        <input aria-label="two" />
      </Sheet>
    </>
  );
}

describe('Sheet', () => {
  it('moves focus in when it opens and back to the opener when it closes', () => {
    const { rerender } = render(<Demo open={false} />);
    const opener = screen.getByText('opener');
    opener.focus();
    rerender(<Demo open />);
    const dialog = screen.getByRole('dialog', { name: 'First' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByText('one'));
    rerender(<Demo open={false} />);
    expect(document.activeElement).toBe(opener);
  });

  it('returns focus to the body, without scrolling, when a hotkey opened it from the page', () => {
    const { rerender } = render(<Demo open={false} />);
    expect(document.activeElement).toBe(document.body);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    rerender(<Demo open />);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    rerender(<Demo open={false} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('prefers the data-autofocus element', () => {
    render(
      <Sheet open onClose={() => {}} labelledBy="t" size="cellar">
        <h2 id="t">T</h2>
        <button>first</button>
        <input aria-label="field" data-autofocus />
      </Sheet>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText('field'));
  });

  it('traps Tab and Shift+Tab inside the dialog', async () => {
    render(<Demo open />);
    const user = userEvent.setup();
    const dialog = screen.getByRole('dialog');
    const close = screen.getByLabelText('Close');
    expect(document.activeElement).toBe(screen.getByText('one'));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('two'));
    await user.tab();
    expect(document.activeElement).toBe(close);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByText('one'));
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(close);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('wraps Shift+Tab from the first real stop even when a parked radio (tabindex -1) comes first in the DOM', async () => {
    render(
      <Sheet open onClose={() => {}} labelledBy="t" size="dial">
        <h2 id="t" tabIndex={-1}>Title</h2>
        <div role="radiogroup" aria-label="Unit">
          <button role="radio" aria-checked="false" tabIndex={-1}>ml</button>
          <button role="radio" aria-checked="true" tabIndex={0}>oz</button>
        </div>
        <button>pour</button>
      </Sheet>,
    );
    const user = userEvent.setup();
    const dialog = screen.getByRole('dialog');
    const oz = screen.getByRole('radio', { name: 'oz' });
    oz.focus();
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByLabelText('Close'));
    expect(dialog.contains(document.activeElement)).toBe(true);
    // forward from Close wraps to the first stop, never onto the parked radio
    await user.tab();
    expect(document.activeElement).toBe(oz);
  });

  it('keeps Shift+Tab inside when focus rests on the heading (not a Tab stop)', async () => {
    render(
      <Sheet open onClose={() => {}} labelledBy="t" size="dial">
        <h2 id="t" tabIndex={-1}>Title</h2>
        <button>pour</button>
      </Sheet>,
    );
    const user = userEvent.setup();
    screen.getByRole('heading').focus();
    await user.tab({ shift: true });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByLabelText('Close'));
  });

  it('locks the page while open and Esc closes only the topmost sheet', () => {
    const closeA = vi.fn();
    const closeB = vi.fn();
    const Two = ({ b }: { b: boolean }) => (
      <>
        <Sheet open onClose={closeA} labelledBy="a" size="cellar"><h2 id="a">A</h2></Sheet>
        <Sheet open={b} onClose={closeB} labelledBy="b" size="dial"><h2 id="b">B</h2></Sheet>
      </>
    );
    const { rerender } = render(<Two b={false} />);
    expect(document.body.classList.contains('is-locked')).toBe(true);
    rerender(<Two b />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closeB).toHaveBeenCalledOnce();
    expect(closeA).not.toHaveBeenCalled();
    rerender(<Two b={false} />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(closeA).toHaveBeenCalledOnce();
    expect(closeB).toHaveBeenCalledOnce();
  });
});
