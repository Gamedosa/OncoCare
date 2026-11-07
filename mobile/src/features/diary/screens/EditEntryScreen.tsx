import { useUpdateEntry } from '../hooks';
import type { DiaryEntry } from '../schemas';
import { EntryForm } from './EntryForm';
import { EntryLoader } from './EntryLoader';
import { useSaveRecording } from '@/features/audio/recordingHooks';

export function EditEntryScreen() {
  return <EntryLoader title="Editar relato">{(entry) => <EditForm entry={entry} />}</EntryLoader>;
}

function EditForm({ entry }: { entry: DiaryEntry }) {
  const update = useUpdateEntry(entry.id);
  const recording = useSaveRecording(entry.patientId, entry);
  return (
    <EntryForm
      title="Editar relato"
      entry={entry}
      saving={update.isPending || recording.isPending}
      saveError={recording.error ?? update.error}
      onSave={(draft, audio) => audio !== undefined ? recording.mutateAsync({ draft, audio }) : update.mutateAsync(draft)}
    />
  );
}
