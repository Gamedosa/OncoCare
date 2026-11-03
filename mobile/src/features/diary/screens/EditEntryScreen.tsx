import { useUpdateEntry } from '../hooks';
import type { DiaryEntry } from '../schemas';
import { EntryForm } from './EntryForm';
import { EntryLoader } from './EntryLoader';

export function EditEntryScreen() {
  return <EntryLoader title="Editar relato">{(entry) => <EditForm entry={entry} />}</EntryLoader>;
}

function EditForm({ entry }: { entry: DiaryEntry }) {
  const update = useUpdateEntry(entry.id);
  return (
    <EntryForm
      title="Editar relato"
      entry={entry}
      saving={update.isPending}
      saveError={update.error}
      onSave={update.mutateAsync}
    />
  );
}
