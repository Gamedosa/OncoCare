import { useSignedInAuth } from '@/features/auth/AuthProvider';

import { useCreateEntry } from '../hooks';
import { EntryForm } from './EntryForm';
import { useSaveRecording } from '@/features/audio/recordingHooks';

export function NewEntryScreen() {
  const { profile } = useSignedInAuth();
  const create = useCreateEntry(profile.id);
  const recording = useSaveRecording(profile.id);
  return (
    <EntryForm
      title="Novo relato"
      saving={create.isPending || recording.isPending}
      saveError={recording.error ?? create.error}
      onSave={(draft, audio) => audio ? recording.mutateAsync({ draft, audio }) : create.mutateAsync(draft)}
    />
  );
}
