import { z } from 'zod';

import { MOOD_MAX, MOOD_MIN } from './mood';

// Postgres returns microseconds; trim to milliseconds so every JS engine parses it.
export function parseTimestamp(value: string): Date {
  return new Date(value.replace(/(\.\d{3})\d+/, '$1'));
}

export const ENTRY_COLUMNS = 'id, patient_id, content, mood_score, audio_path, created_at, updated_at';

export const entryRowSchema = z
  .object({
    id: z.uuid(),
    patient_id: z.uuid(),
    content: z.string().nullable(),
    mood_score: z.number().int().nullable(),
    audio_path: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    patientId: row.patient_id,
    content: row.content,
    mood: row.mood_score,
    hasAudio: row.audio_path !== null,
    audioPath: row.audio_path,
    createdAt: parseTimestamp(row.created_at),
    updatedAt: parseTimestamp(row.updated_at),
  }));

export type DiaryEntry = z.output<typeof entryRowSchema>;

export const EMPTY_ENTRY_MESSAGE = 'Escreva algo para salvar o relato.';

// Mirrors the database check: an entry needs non-blank text or an audio.
export function entryDraftSchema({ hasAudio }: { hasAudio: boolean }) {
  return z
    .object({
      content: z.string().transform((value) => value.trim()),
      mood: z.number().int().min(MOOD_MIN).max(MOOD_MAX).nullable(),
    })
    .refine((draft) => hasAudio || draft.content.length > 0, { message: EMPTY_ENTRY_MESSAGE, path: ['content'] })
    .transform((draft) => ({ content: draft.content.length > 0 ? draft.content : null, mood: draft.mood }));
}

export type EntryDraftInput = { content: string; mood: number | null };
export type EntryDraft = { content: string | null; mood: number | null };

export function isEditedEntry(entry: Pick<DiaryEntry, 'createdAt' | 'updatedAt'>): boolean {
  // Ignore the few milliseconds between insert defaults and trigger timestamps.
  return entry.updatedAt.getTime() - entry.createdAt.getTime() > 1000;
}
