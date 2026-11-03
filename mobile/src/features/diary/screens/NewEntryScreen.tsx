import { useSignedInAuth } from '@/features/auth/AuthProvider';

import { useCreateEntry } from '../hooks';
import { EntryForm } from './EntryForm';

export function NewEntryScreen() {
  const { profile } = useSignedInAuth();
  const create = useCreateEntry(profile.id);
  return <EntryForm title="Novo relato" saving={create.isPending} saveError={create.error} onSave={create.mutateAsync} />;
}
