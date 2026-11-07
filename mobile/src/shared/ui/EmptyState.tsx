import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, font, spacing } from './theme';

type Props = { title: string; text?: string; action?: ReactNode };

export function EmptyState({ title, text, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.badge} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: 40 },
  badge: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface },
  title: { marginTop: spacing.lg, fontSize: font.title, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { marginTop: spacing.sm, fontSize: font.body, color: colors.textMuted, textAlign: 'center' },
  action: { marginTop: spacing.xl, alignSelf: 'stretch' },
});
