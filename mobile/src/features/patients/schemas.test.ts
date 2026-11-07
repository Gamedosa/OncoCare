import { describe, expect, it } from '@jest/globals';

import { filterPatients, linkedPatientRowSchema, patientName, sortPatients, type LinkedPatient } from './schemas';

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const patient = (n: number, displayName: string | null): LinkedPatient => ({ id: id(n), displayName, lastEntryAt: null });

describe('linkedPatientRowSchema', () => {
  it('maps the row, the profile name and the latest entry date', () => {
    expect(
      linkedPatientRowSchema.parse({
        user_id: id(1),
        profile: { display_name: ' Ana ' },
        diary_entries: [{ created_at: '2026-11-03T10:00:00.123456+00:00' }],
      }),
    ).toEqual({ id: id(1), displayName: 'Ana', lastEntryAt: new Date('2026-11-03T10:00:00.123Z') });
  });

  it('handles patients without name or entries', () => {
    expect(linkedPatientRowSchema.parse({ user_id: id(1), profile: null, diary_entries: [] })).toEqual({
      id: id(1),
      displayName: null,
      lastEntryAt: null,
    });
    expect(patientName({ displayName: null })).toBe('Nome não informado');
  });
});

describe('sortPatients and filterPatients', () => {
  const patients = [patient(1, 'Márcia'), patient(2, 'ana'), patient(3, null), patient(4, 'Beatriz')];

  it('sorts by name in pt-BR order', () => {
    expect(sortPatients(patients).map(patientName)).toEqual(['ana', 'Beatriz', 'Márcia', 'Nome não informado']);
  });

  it('searches ignoring case and accents', () => {
    expect(filterPatients(patients, ' MARC ').map((p) => p.id)).toEqual([id(1)]);
    expect(filterPatients(patients, '')).toBe(patients);
    expect(filterPatients(patients, 'zzz')).toEqual([]);
  });
});
