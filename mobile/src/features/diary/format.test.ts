import { describe, expect, it } from '@jest/globals';

import { diaryDayKey, excerpt, formatDateTime, formatDiaryDay, relativeDay } from './format';

describe('relativeDay', () => {
  const now = new Date('2026-11-03T09:00:00-03:00');

  it('labels today and yesterday', () => {
    expect(relativeDay(new Date('2026-11-03T00:05:00-03:00'), now)).toBe('Hoje');
    expect(relativeDay(new Date('2026-11-02T23:59:00-03:00'), now)).toBe('Ontem');
  });

  it('falls back to the date', () => {
    expect(relativeDay(new Date('2026-10-20T12:00:00-03:00'), now)).toMatch(/20/);
  });

  it('uses Brasilia midnight rather than UTC or device midnight', () => {
    expect(diaryDayKey(new Date('2026-11-03T02:59:59Z'))).toBe('2026-11-02');
    expect(diaryDayKey(new Date('2026-11-03T03:00:00Z'))).toBe('2026-11-03');
    expect(formatDiaryDay('2026-11-03')).toMatch(/03.*nov.*2026/);
    expect(formatDateTime(new Date('2026-11-03T03:05:00Z'))).toMatch(/00:05/);
  });
});

describe('excerpt', () => {
  it('collapses whitespace and truncates', () => {
    expect(excerpt('a\n\n b')).toBe('a b');
    expect(excerpt('abcdefghij', 5)).toBe('abcd…');
    expect(excerpt(null)).toBe('');
  });
});
