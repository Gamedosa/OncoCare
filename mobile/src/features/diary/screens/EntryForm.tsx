import { usePreventRemove, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isNetworkError } from '@/shared/errors';
import { Button, colors, ConfirmDialog, font, Header, Notice, Screen, spacing, TextField } from '@/shared/ui';

import { MoodSelector } from '../components/MoodSelector';
import { RecordingInput } from '@/features/audio/components/RecordingInput';
import type { RecordedAudio } from '@/features/audio/recordingFile';
import { AudioSaveRecoveryError } from '@/features/audio/saveRecording';
import { entryDraftSchema, type DiaryEntry, type EntryDraft } from '../schemas';

type Props = {
  title: string;
  entry?: DiaryEntry;
  saving: boolean;
  saveError: unknown;
  onSave: (draft: EntryDraft, audio?: RecordedAudio) => Promise<DiaryEntry>;
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

  const hasAudio = !!audio || (entry?.hasAudio ?? false);
  const dirty = !!audio || recordingBusy || content !== initial.current.content || mood !== initial.current.mood;
  const canSave = hasAudio || content.trim().length > 0;
  const recovering = saveError instanceof AudioSaveRecoveryError;

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

      {!entry?.hasAudio ? (
        <RecordingInput disabled={saving || recovering} onChange={setAudio} onBusyChange={setRecordingBusy} />
      ) : (
        <Notice>O áudio deste relato será preservado. Substituição e remoção serão disponibilizadas em outro incremento.</Notice>
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
        Salvar
      </Button>
      {!canSave ? <Text style={styles.hint}>Escreva algo para salvar.</Text> : null}

      <ConfirmDialog
        visible={pendingLeave !== null}
        title="Descartar alterações?"
        message={saveError instanceof AudioSaveRecoveryError
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
