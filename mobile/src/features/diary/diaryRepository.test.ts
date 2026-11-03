import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { createEntry, getEntryByAudioPath, updateEntry } from './diaryRepository';

const mockSingle = jest.fn<() => Promise<{ data: typeof row; error: null }>>();
const mockEq = jest.fn((_column: string, _value: string) => ({
  select: mockSelect,
  single: mockSingle,
  maybeSingle: mockSingle,
}));
const mockSelect = jest.fn((_columns: string) => ({
  single: mockSingle, maybeSingle: mockSingle, eq: mockEq,
}));
const mockInsert = jest.fn((_values: unknown) => ({ select: mockSelect }));
const mockUpdate = jest.fn((_values: unknown) => ({ eq: mockEq }));
jest.mock('@/shared/supabase/client', () => ({
  supabase: { from: () => ({ insert: mockInsert, update: mockUpdate, select: mockSelect }) },
}));
const PATIENT = '00000000-0000-4000-8000-000000000001';
const ID = '00000000-0000-4000-8000-000000000010';
const row = {
  id: ID, patient_id: PATIENT, content: 'Texto', mood_score: 4,
  audio_path: null, created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z',
};
const draft = { content: 'Texto', mood: 4 };

describe('diary repository audio compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({ data: row, error: null });
  });

  it('preserves the original text-only insert shape', async () => {
    await createEntry(PATIENT, draft);
    expect(mockInsert).toHaveBeenCalledWith({ patient_id: PATIENT, content: 'Texto', mood_score: 4 });
  });

  it('attaches the object ID without writing the derived path or a custom entry ID', async () => {
    await createEntry(PATIENT, { content: null, mood: null }, ID);
    expect(mockInsert).toHaveBeenCalledWith({
      patient_id: PATIENT, content: null, mood_score: null, audio_object_id: ID,
    });
  });

  it('does not touch existing audio when editing only text', async () => {
    await updateEntry(ID, draft);
    expect(mockUpdate).toHaveBeenCalledWith({ content: 'Texto', mood_score: 4 });
  });

  it('can add uploaded audio to an existing entry', async () => {
    await updateEntry(ID, draft, ID);
    expect(mockUpdate).toHaveBeenCalledWith({ content: 'Texto', mood_score: 4, audio_object_id: ID });
  });

  it('reconciles by the server-derived audio path using RLS', async () => {
    await getEntryByAudioPath(`${PATIENT}/${ID}.m4a`);
    expect(mockEq).toHaveBeenCalledWith('audio_path', `${PATIENT}/${ID}.m4a`);
  });
});
