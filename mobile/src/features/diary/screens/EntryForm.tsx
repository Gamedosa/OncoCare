import { usePreventRemove, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { isNetworkError } from '@/shared/errors';
import { Button, colors, ConfirmDialog, font, Header, Notice, Screen, spacing, TextField } from '@/shared/ui';

import { MoodSelector } from '../components/MoodSelector';
import { entryDraftSchema, type DiaryEntry, type EntryDraft } from '../schemas';

type Props = {
  title: string;
  entry?: DiaryEntry;
  saving: boolean;
  saveError: unknown;
  onSave: (draft: EntryDraft) => Promise<DiaryEntry>;
};

export function EntryForm({ title, entry, saving, saveError, onSave }: Props) {
  const router = useRouter();
  const initial = useRef({ content: entry?.content ?? '', mood: entry?.mood ?? null });
  const [content, setContent] = useState(initial.current.content);
  const [mood, setMood] = useState<number | null>(initial.current.mood);
  const [validationError, setValidationError] = useState<string>();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  const hasAudio = entry?.hasAudio ?? false;
  const dirty = content !== initial.current.content || mood !== initial.current.mood;
  const canSave = hasAudio || content.trim().length > 0;

  const allowLeave = usePreventRemove(dirty, ({ repeat }) => setPendingLeave(() => repeat));

  const save = async () => {
    const parsed = entryDraftSchema({ hasAudio }).safeParse({ content, mood });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message);
      return;
    }
    setValidationError(undefined);
    try {
      await onSave(parsed.data);
      allowLeave();
      router.back();
    } catch {
      // saveError renders the message; the draft stays on screen.
    }
  };

  return (
    <Screen header={<Header title={title} onBack={() => router.back()} />}>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.question}>
          Como você está hoje?
        </Text>
        <MoodSelector value={mood} onChange={setMood} />
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
        error={validationError}
      />

      {saveError ? (
        <Notice tone={isNetworkError(saveError) ? 'warning' : 'error'}>
          {isNetworkError(saveError)
            ? 'Você está sem internet. Seu texto continua aqui — tente salvar quando a conexão voltar.'
            : 'Não foi possível salvar o relato. Tente novamente.'}
        </Notice>
      ) : null}

      <Text style={styles.privacy}>Seu psicólogo vinculado poderá ler este relato.</Text>

      <Button onPress={save} loading={saving} disabled={!canSave}>
        Salvar
      </Button>
      {!canSave ? <Text style={styles.hint}>Escreva algo para salvar.</Text> : null}

      <ConfirmDialog
        visible={pendingLeave !== null}
        title="Descartar alterações?"
        message="O que você escreveu ainda não foi salvo."
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
