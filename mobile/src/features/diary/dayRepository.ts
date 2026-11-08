import { z } from 'zod';
import { supabase } from '@/shared/supabase/client';
import { PAGE_SIZE, type EntryPage } from './diaryRepository';
import { entryRowSchema } from './schemas';

export const diaryDaySchema = z.iso.date();
const daySummarySchema = z.object({
  day: diaryDaySchema, entry_count: z.number().int().positive(), has_audio: z.boolean(),
}).transform((row) => ({ day: row.day, count: row.entry_count, hasAudio: row.has_audio }));
export type DiaryDay = z.output<typeof daySummarySchema>;
export type DiaryDayPage = { days: DiaryDay[]; nextDay: string | null };

export async function listDiaryDays(patientId: string, before: string | null): Promise<DiaryDayPage> {
  if (before) diaryDaySchema.parse(before);
  const { data, error } = await supabase.rpc('list_diary_days', {
    p_patient_id: patientId, ...(before ? { p_before: before } : {}),
  });
  if (error) throw error;
  const rows = daySummarySchema.array().parse(data);
  const days = rows.slice(0, PAGE_SIZE);
  return { days, nextDay: rows.length > PAGE_SIZE ? days[days.length - 1]!.day : null };
}

export async function listDiaryDayEntries(patientId: string, day: string, page: number): Promise<EntryPage> {
  diaryDaySchema.parse(day);
  const { data, error } = await supabase.rpc('list_diary_day_entries', {
    p_patient_id: patientId, p_day: day, p_page: page,
  });
  if (error) throw error;
  const rows = entryRowSchema.array().parse(data);
  return { entries: rows.slice(0, PAGE_SIZE), nextPage: rows.length > PAGE_SIZE ? page + 1 : null };
}
