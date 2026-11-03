import { useQuery } from '@tanstack/react-query';

import { useSignedInAuth } from '@/features/auth/AuthProvider';

import { listLinkedPatients } from './patientsRepository';

export const patientKeys = {
  all: ['patients'] as const,
  linked: (psychologistId: string) => ['patients', 'linked', psychologistId] as const,
};

export function useLinkedPatients() {
  const { profile } = useSignedInAuth();
  return useQuery({ queryKey: patientKeys.linked(profile.id), queryFn: () => listLinkedPatients(profile.id) });
}

// null means the patient is not (or no longer) linked to the signed-in psychologist.
export function useLinkedPatient(patientId: string) {
  const { profile } = useSignedInAuth();
  return useQuery({
    queryKey: patientKeys.linked(profile.id),
    queryFn: () => listLinkedPatients(profile.id),
    select: (patients) => patients.find((patient) => patient.id === patientId) ?? null,
  });
}
