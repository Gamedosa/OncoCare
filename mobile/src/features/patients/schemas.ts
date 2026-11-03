import { z } from 'zod';

import { parseTimestamp } from '@/features/diary/schemas';

export const UNNAMED_PATIENT = 'Nome não informado';

export const linkedPatientRowSchema = z
  .object({
    user_id: z.uuid(),
    profile: z.object({ display_name: z.string().nullable() }).nullable(),
    diary_entries: z.array(z.object({ created_at: z.string() })),
  })
  .transform((row) => ({
    id: row.user_id,
    displayName: row.profile?.display_name?.trim() || null,
    lastEntryAt: row.diary_entries[0] ? parseTimestamp(row.diary_entries[0].created_at) : null,
  }));

export type LinkedPatient = z.output<typeof linkedPatientRowSchema>;

export function patientName(patient: Pick<LinkedPatient, 'displayName'>): string {
  return patient.displayName ?? UNNAMED_PATIENT;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function sortPatients(patients: LinkedPatient[]): LinkedPatient[] {
  return [...patients].sort((a, b) => patientName(a).localeCompare(patientName(b), 'pt-BR'));
}

// Accent- and case-insensitive name search.
export function filterPatients(patients: LinkedPatient[], search: string): LinkedPatient[] {
  const term = normalize(search);
  if (!term) return patients;
  return patients.filter((patient) => normalize(patientName(patient)).includes(term));
}
