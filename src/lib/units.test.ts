import { describe, expect, it } from 'vitest';
import { ING_BY_ID } from '../data/ingredients';
import { amountLabel, totalLabel, trim } from './units';

describe('trim', () => {
  it('drops trailing zeros', () => {
    expect(trim(1.5, 2)).toBe('1.5');
    expect(trim(2, 2)).toBe('2');
  });

  it('rounds to the requested decimals', () => {
    expect(trim(1.2345, 2)).toBe('1.23');
  });
});

describe('totalLabel', () => {
  it('formats ml, cl and oz', () => {
    expect(totalLabel(135.4, 'ml')).toBe('135 ml');
    expect(totalLabel(135, 'cl')).toBe('13.5 cl');
    expect(totalLabel(75, 'oz')).toBe('2.5 oz');
  });

  it('shows parts of 30 ml, never ml', () => {
    expect(totalLabel(90, 'parts')).toBe('3 parts');
    expect(totalLabel(45, 'parts')).toBe('1.5 parts');
    expect(totalLabel(30, 'parts')).toBe('1 part');
    expect(totalLabel(100, 'parts')).not.toMatch(/ml/);
  });
});

describe('counted amounts', () => {
  const label = (id: string, ml: number) => amountLabel({ id, ml }, ING_BY_ID[id], 'oz');

  it('labels dashes and pieces with sensible plurals', () => {
    expect(label('angostura', 0.9)).toBe('1 dash');
    expect(label('angostura', 1.8)).toBe('2 dashes');
    expect(label('cherry', 9)).toBe('3 cherries');
    expect(label('mint', 8)).toBe('8 leaves');
    expect(label('olive', 3)).toBe('1 olive');
    expect(label('salt', 1)).toBe('rim');
  });

  it('formats volumes in the chosen unit', () => {
    expect(label('gin', 45)).toBe('1.5 oz');
    expect(amountLabel({ id: 'gin', ml: 45 }, ING_BY_ID.gin, 'parts')).toBe('1.5 parts');
  });
});
