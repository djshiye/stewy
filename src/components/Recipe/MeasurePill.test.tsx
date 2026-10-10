import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
