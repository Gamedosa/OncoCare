import { StyleSheet, Text, View } from 'react-native';

import { Card, colors, font, Notice, spacing } from '@/shared/ui';

import { formatDateTime } from '../format';
import { moodLabel } from '../mood';
import { isEditedEntry, type DiaryEntry } from '../schemas';

export function EntryContent({ entry }: { entry: DiaryEntry }) {
  const mood = moodLabel(entry.mood);
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.meta}>Criado em {formatDateTime(entry.createdAt)}</Text>
        {isEditedEntry(entry) ? <Text style={styles.meta}>Editado em {formatDateTime(entry.updatedAt)}</Text> : null}
      </View>
      {mood ? (
        <Card>
          <Text style={styles.label}>Humor</Text>
          <Text style={styles.value}>{mood}</Text>
        </Card>
      ) : null}
      {entry.content ? (
        <Card>
          <Text style={styles.body} selectable>
            {entry.content}
          </Text>
        </Card>
      ) : null}
      {entry.hasAudio ? <Notice>Este relato tem um áudio. A reprodução estará disponível em breve no app.</Notice> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  meta: { fontSize: font.small, color: colors.textMuted },
  label: { fontSize: font.small, fontWeight: '700', color: colors.textMuted },
  value: { fontSize: font.body, fontWeight: '700', color: colors.text, marginTop: spacing.xs },
  body: { fontSize: font.body, lineHeight: 24, color: colors.text },
});
