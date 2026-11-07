import { describe, expect, it } from '@jest/globals';

import { excerpt, relativeDay } from './format';

describe('relativeDay', () => {
  const now = new Date(2026, 10, 3, 9, 0);

  it('labels today and yesterday', () => {
    expect(relativeDay(new Date(2026, 10, 3, 0, 5), now)).toBe('Hoje');
    expect(relativeDay(new Date(2026, 10, 2, 23, 59), now)).toBe('Ontem');
  });

  it('falls back to the date', () => {
    expect(relativeDay(new Date(2026, 9, 20), now)).toMatch(/20/);
  });
});

describe('excerpt', () => {
  it('collapses whitespace and truncates', () => {
    expect(excerpt('a\n\n b')).toBe('a b');
    expect(excerpt('abcdefghij', 5)).toBe('abcd…');
    expect(excerpt(null)).toBe('');
  });
});
