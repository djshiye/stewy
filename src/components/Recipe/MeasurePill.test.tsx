import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ING_BY_ID } from '../../data/ingredients';
import type { UnitKey } from '../../lib/units';
import { MeasurePill } from './MeasurePill';

/** Holds the amount like the store does, so a step shows up in the label. */
function Harness({ id, start, unit = 'oz' }: { id: string; start: number; unit?: UnitKey }) {
  const [ml, setMl] = useState(start);
  return <MeasurePill ing={ING_BY_ID[id]} ml={ml} unit={unit} onSet={setMl} onOpen={() => {}} />;
}

describe('MeasurePill', () => {
  it('says the new amount when an arrow key steps it', async () => {
    render(<Harness id="vodka" start={15} />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    screen.getByRole('button', { name: 'Vodka, 0.5 oz' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(status.textContent).toBe('Vodka 0.75 oz');
    await userEvent.keyboard('{ArrowRight}');
    expect(status.textContent).toBe('Vodka 1 oz');
  });

  it('clears the announcement when focus leaves', async () => {
    render(<Harness id="vodka" start={15} />);
    screen.getByRole('button').focus();
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.tab();
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('keeps the usage hint out of the browse tree but still describes the button with it', () => {
    render(<Harness id="vodka" start={15} />);
    const pill = screen.getByRole('button');
    const hint = document.getElementById(pill.getAttribute('aria-describedby') ?? '');
    expect(hint?.getAttribute('aria-hidden')).toBe('true');
    expect(hint?.textContent).toMatch(/arrow keys/);
  });

  it('labels a sliver as less than the smallest shown amount instead of 0', () => {
    for (const [unit, label] of [['oz', '<0.01 oz'], ['parts', '<0.1 parts'], ['ml', '<1 ml']] as const) {
      const { unmount } = render(<Harness id="gin" start={0.1} unit={unit} />);
      expect(screen.getByRole('button', { name: `Gin, ${label}` })).toBeTruthy();
      unmount();
    }
  });

  it('a step up never lowers an amount that is already above the usual ceiling', async () => {
    render(<Harness id="gin" start={900} unit="ml" />);
    screen.getByRole('button').focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: 'Gin, 905 ml' })).toBeTruthy();
  });

  it('a step down never raises a sliver to the step size', async () => {
    render(<Harness id="gin" start={0.1} unit="ml" />);
    screen.getByRole('button').focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: 'Gin, <1 ml' })).toBeTruthy();
  });

  describe('scrub under interface zoom', () => {
    afterEach(() => vi.restoreAllMocks());

    /** Drags `px` viewport pixels from the pill, with each CSS pixel drawn as `zoom` viewport pixels. */
    function scrub(zoom: number, px: number) {
      HTMLElement.prototype.setPointerCapture = () => {};
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        () => ({ width: 100 * zoom, height: 0, x: 0, y: 0, top: 0, left: 0, right: 100 * zoom, bottom: 0, toJSON() {} }) as DOMRect,
      );
      render(<Harness id="vodka" start={15} />);
      const pill = screen.getByRole('button');
      const base = { pointerId: 1, button: 0 };
      fireEvent.pointerDown(pill, { ...base, clientX: 200 });
      fireEvent.pointerMove(pill, { ...base, clientX: 200 + px });
      return screen.getByRole('button').getAttribute('aria-label');
    }

    it('counts one step per 14 CSS pixels at zoom 1', () => {
      // 100px: 1 step past the 6px threshold, then 6 more
      expect(scrub(1, 100)).toBe('Vodka, 2.25 oz');
    });

    it('divides the drag by the zoom, so the same CSS distance gives the same steps', () => {
      expect(scrub(2, 200)).toBe('Vodka, 2.25 oz');
    });

    it('a viewport drag that is short in CSS pixels moves fewer steps at a higher zoom', () => {
      expect(scrub(2, 100)).toBe('Vodka, 1.5 oz');
    });
  });
});
