import { usePreventRemove, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isNetworkError } from '@/shared/errors';
import { Button, colors, ConfirmDialog, font, Header, Notice, Screen, spacing, TextField } from '@/shared/ui';

import { MoodSelector } from '../components/MoodSelector';
import { RecordingInput } from '@/features/audio/components/RecordingInput';
import type { RecordedAudio } from '@/features/audio/recordingFile';
import { AudioCleanupPendingError, AudioSaveRecoveryError } from '@/features/audio/saveRecording';
import { entryDraftSchema, type DiaryEntry, type EntryDraft } from '../schemas';

type Props = {
  title: string;
  entry?: DiaryEntry;
  saving: boolean;
  saveError: unknown;
  onSave: (draft: EntryDraft, audio?: RecordedAudio | null) => Promise<DiaryEntry>;
};

export function EntryForm({ title, entry, saving, saveError, onSave }: Props) {
  const router = useRouter();
  const initial = useRef({ content: entry?.content ?? '', mood: entry?.mood ?? null });
  const [content, setContent] = useState(initial.current.content);
  const [mood, setMood] = useState<number | null>(initial.current.mood);
  const [validationError, setValidationError] = useState<string>();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [audio, setAudio] = useState<RecordedAudio | null>(null);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const original = useRef(entry);
  const [audioAction, setAudioAction] = useState<'keep' | 'replace' | 'remove'>('keep');
  const [confirmRemove, setConfirmRemove] = useState(false);

  const hasAudio = !!audio || (audioAction === 'keep' && (original.current?.hasAudio ?? false));
  const dirty = audioAction !== 'keep' || !!audio || recordingBusy || content !== initial.current.content || mood !== initial.current.mood;
  const canSave = (hasAudio || content.trim().length > 0) && (audioAction !== 'replace' || !!audio);
  const recovering = saveError instanceof AudioSaveRecoveryError;
  const cleanupPending = saveError instanceof AudioCleanupPendingError;

  const allowLeave = usePreventRemove(dirty || saving, ({ repeat }) => {
    if (!saving) setPendingLeave(() => repeat);
  });

  const save = async () => {
    if (saving || recordingBusy) return;
    const parsed = entryDraftSchema({ hasAudio }).safeParse({ content, mood });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message);
      return;
    }
    setValidationError(undefined);
    try {
      if (audio) await onSave(parsed.data, audio);
      else if (audioAction === 'remove') await onSave(parsed.data, null);
      else await onSave(parsed.data);
      allowLeave();
      router.back();
    } catch {
      // saveError renders the message; the draft stays on screen.
    }
  };

  return (
    <Screen header={<Header title={title} onBack={() => { if (!saving) router.back(); }} />}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.question}>
          Como você está hoje?
        </Text>
        <MoodSelector value={mood} onChange={(value) => { if (!saving && !recovering) setMood(value); }} />
      </View>

      <TextField
        label="Quer contar mais?"
        hint={hasAudio ? '(opcional)' : undefined}
        placeholder="Escreva do seu jeito, no seu tempo…"
        value={content}
        onChangeText={(value) => {
          setContent(value);
          setValidationError(undefined);
        }}
        multiline
        editable={!saving && !recovering}
        error={validationError}
      />

      {original.current?.hasAudio && audioAction === 'keep' ? (
        <View style={styles.section}>
          <Notice>Este relato tem um áudio. Ele será preservado, a menos que você escolha substituir ou remover.</Notice>
          <Button variant="secondary" disabled={saving || recovering} onPress={() => setAudioAction('replace')}>
            Substituir áudio
          </Button>
          <Button variant="text" disabled={saving || recovering} onPress={() => setConfirmRemove(true)}>
            Remover áudio
          </Button>
        </View>
      ) : audioAction === 'remove' ? (
        <View style={styles.section}>
          <Notice>O áudio será removido somente ao salvar. Mantenha um texto para não deixar o relato vazio.</Notice>
          <Button variant="text" disabled={saving || recovering} onPress={() => setAudioAction('keep')}>
            Manter áudio original
          </Button>
        </View>
      ) : (
        <View style={styles.section}>
          {audioAction === 'replace' ? <Notice>Grave o novo áudio. O original só será excluído após salvar a substituição.</Notice> : null}
          <RecordingInput disabled={saving || recovering} onChange={setAudio} onBusyChange={setRecordingBusy} />
          {audioAction === 'replace' ? (
            <Button variant="text" disabled={saving || recovering || recordingBusy} onPress={() => {
              setAudio(null);
              setAudioAction('keep');
            }}>
              Manter áudio original
            </Button>
          ) : null}
        </View>
      )}

      {saving && audio ? <Notice>Enviando o áudio e confirmando o relato. Aguarde nesta tela.</Notice> : null}

      {saveError ? (
        <Notice tone={isNetworkError(saveError) ? 'warning' : 'error'}>
          {saveError instanceof AudioSaveRecoveryError ? saveError.message : isNetworkError(saveError)
            ? 'Você está sem internet. Seu texto continua aqui — tente salvar quando a conexão voltar.'
            : 'Não foi possível salvar o relato. Tente novamente.'}
        </Notice>
      ) : null}

      <Text style={styles.privacy}>Seu psicólogo vinculado poderá ler e ouvir este relato.</Text>

      <Button onPress={save} loading={saving} disabled={!canSave || recordingBusy}>
        {cleanupPending ? 'Tentar limpeza novamente' : 'Salvar'}
      </Button>
      {!canSave ? <Text style={styles.hint}>
        {audioAction === 'replace' ? 'Grave o novo áudio ou mantenha o original.' : 'Escreva algo para salvar.'}
      </Text> : null}

      <ConfirmDialog
        visible={confirmRemove}
        title="Remover áudio?"
        message="O áudio será excluído após salvar o relato. Você precisará manter ou adicionar um texto."
        confirmLabel="Remover ao salvar"
        cancelLabel="Manter áudio"
        destructive
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          setAudioAction('remove');
        }}
      />

      <ConfirmDialog
        visible={pendingLeave !== null}
        title="Descartar alterações?"
        message={cleanupPending
          ? 'O relato já foi salvo, mas a exclusão do arquivo antigo ficou pendente. A tentativa de limpeza não continuará após sair.'
          : saveError instanceof AudioSaveRecoveryError
          ? 'O salvamento ainda não foi confirmado. Ao sair, confira seu histórico antes de criar outro relato.'
          : 'Seu texto e sua gravação ainda não foram salvos.'}
        confirmLabel="Descartar"
        cancelLabel="Continuar escrevendo"
        destructive
        onCancel={() => setPendingLeave(null)}
        onConfirm={() => {
          const leave = pendingLeave;
          setPendingLeave(null);
          leave?.();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  question: { fontSize: font.title, fontWeight: '800', color: colors.text },
  privacy: { fontSize: font.small, color: colors.textMuted },
  hint: { fontSize: font.small, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
});
