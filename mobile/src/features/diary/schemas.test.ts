import { describe, expect, it } from '@jest/globals';

import { moodLabel } from './mood';
import { EMPTY_ENTRY_MESSAGE, entryDraftSchema, entryRowSchema, isEditedEntry, parseTimestamp } from './schemas';

const row = {
  id: '00000000-0000-4000-8000-000000000010',
  patient_id: '00000000-0000-4000-8000-000000000001',
  content: 'Dia tranquilo.',
  mood_score: 4,
  audio_path: null,
  created_at: '2026-11-03T12:00:00.123456+00:00',
  updated_at: '2026-11-03T12:00:00.123456+00:00',
};

describe('entryRowSchema', () => {
  it('maps database rows to diary entries', () => {
    const entry = entryRowSchema.parse(row);
    expect(entry).toMatchObject({ id: row.id, patientId: row.patient_id, content: 'Dia tranquilo.', mood: 4, hasAudio: false });
    expect(entry.createdAt.toISOString()).toBe('2026-11-03T12:00:00.123Z');
    expect(isEditedEntry(entry)).toBe(false);
  });

  it('flags audio and edits', () => {
    const entry = entryRowSchema.parse({
      ...row,
      content: null,
      audio_path: 'user/file.m4a',
      updated_at: '2026-11-04T08:00:00+00:00',
    });
    expect(entry.hasAudio).toBe(true);
    expect(isEditedEntry(entry)).toBe(true);
  });
});

describe('parseTimestamp', () => {
  it('handles microsecond precision', () => {
    expect(parseTimestamp('2026-11-03T12:00:00.987654+00:00').getTime()).toBe(Date.UTC(2026, 10, 3, 12, 0, 0, 987));
  });
});

describe('entryDraftSchema', () => {
  it('trims text and keeps mood', () => {
    expect(entryDraftSchema({ hasAudio: false }).parse({ content: '  oi  ', mood: 3 })).toEqual({ content: 'oi', mood: 3 });
  });

  it('requires text when there is no audio', () => {
    const result = entryDraftSchema({ hasAudio: false }).safeParse({ content: '   ', mood: null });
    expect(result.error?.issues[0]?.message).toBe(EMPTY_ENTRY_MESSAGE);
  });

  it('allows empty text when the entry has audio and sends null', () => {
    expect(entryDraftSchema({ hasAudio: true }).parse({ content: ' ', mood: null })).toEqual({ content: null, mood: null });
  });

  it('rejects moods outside the provisional scale', () => {
    expect(entryDraftSchema({ hasAudio: false }).safeParse({ content: 'x', mood: 6 }).success).toBe(false);
    expect(entryDraftSchema({ hasAudio: false }).safeParse({ content: 'x', mood: 0 }).success).toBe(false);
  });
});

describe('moodLabel', () => {
  it('returns labels for known values only', () => {
    expect(moodLabel(1)).toBe('Muito difícil');
    expect(moodLabel(null)).toBeNull();
    expect(moodLabel(9)).toBeNull();
  });
});
