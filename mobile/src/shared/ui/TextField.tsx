import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, font, minTouch, radius, spacing } from './theme';

type Props = ComponentProps<typeof TextInput> & { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, style, onFocus, onBlur, multiline, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {hint ? <Text style={styles.hint}> {hint}</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          error ? styles.invalid : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: font.body, fontWeight: '700', color: colors.text },
  hint: { fontWeight: '400', color: colors.textMuted },
  input: {
    minHeight: minTouch,
    borderWidth: 2,
    borderColor: colors.input,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    fontSize: font.body,
    color: colors.text,
  },
  multiline: { minHeight: 140, paddingVertical: spacing.md },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.danger },
  error: { fontSize: font.small, fontWeight: '600', color: colors.danger },
});
