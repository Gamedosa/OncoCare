import { supabase } from '@/shared/supabase/client';

import { ENTRY_COLUMNS, entryRowSchema, type DiaryEntry, type EntryDraft } from './schemas';

export const PAGE_SIZE = 20;

export type EntryPage = { entries: DiaryEntry[]; nextPage: number | null };

// patient_id filters are for query intent only; RLS decides what each user can read or write.
export async function listEntries(patientId: string, page: number): Promise<EntryPage> {
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from('diary_entries')
    .select(ENTRY_COLUMNS)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + PAGE_SIZE);
  if (error) throw error;
  const rows = entryRowSchema.array().parse(data);
  return {
    entries: rows.slice(0, PAGE_SIZE),
    nextPage: rows.length > PAGE_SIZE ? page + 1 : null,
  };
}

// Returns null when the entry does not exist or RLS hides it (e.g. link removed).
export async function getEntry(entryId: string): Promise<DiaryEntry | null> {
  const { data, error } = await supabase.from('diary_entries').select(ENTRY_COLUMNS).eq('id', entryId).maybeSingle();
  if (error) throw error;
  return data ? entryRowSchema.parse(data) : null;
}

export async function createEntry(patientId: string, draft: EntryDraft): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({ patient_id: patientId, content: draft.content, mood_score: draft.mood })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return entryRowSchema.parse(data);
}

export async function updateEntry(entryId: string, draft: EntryDraft): Promise<DiaryEntry> {
  const { data, error } = await supabase
    .from('diary_entries')
    .update({ content: draft.content, mood_score: draft.mood })
    .eq('id', entryId)
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return entryRowSchema.parse(data);
}
