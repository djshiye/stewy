import { describe, expect, it } from 'vitest';
import { trim } from './units';

describe('trim', () => {
  it('drops trailing zeros', () => {
    expect(trim(1.5, 2)).toBe('1.5');
    expect(trim(2, 2)).toBe('2');
  });

  it('rounds to the requested decimals', () => {
    expect(trim(1.2345, 2)).toBe('1.23');
  });
});
