import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, font, radius, spacing } from './theme';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmDialog({ visible, title, message, confirmLabel, cancelLabel, onConfirm, onCancel, destructive }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <Button variant={destructive ? 'danger' : 'primary'} onPress={onConfirm}>
              {confirmLabel}
            </Button>
            <Button variant="secondary" onPress={onCancel}>
              {cancelLabel}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(58, 42, 48, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text },
  message: { fontSize: font.body, color: colors.textMuted },
  actions: { gap: spacing.md, marginTop: spacing.sm },
});
