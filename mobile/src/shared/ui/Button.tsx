import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { colors, font, minTouch, radius, spacing } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'text' | 'danger';

type Props = Omit<PressableProps, 'children'> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ children, variant = 'primary', loading = false, disabled, style, ...rest }: Props) {
  const isDisabled = !!disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        variant !== 'text' && styles.block,
        styles[variant],
        state.pressed && pressedStyles[variant],
        isDisabled && disabledStyles[variant],
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
      ) : (
        <Text style={[styles.label, labelStyles[variant], isDisabled && styles.labelDisabled]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouch,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  block: { alignSelf: 'stretch' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary },
  text: { paddingHorizontal: spacing.sm },
  danger: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.danger },
  label: { fontSize: font.body, fontWeight: '700', textAlign: 'center' },
  labelDisabled: { color: colors.textMuted },
});

const labelStyles = StyleSheet.create({
  primary: { color: colors.onPrimary },
  secondary: { color: colors.primary },
  text: { color: colors.primary, textDecorationLine: 'underline' },
  danger: { color: colors.danger },
});

const pressedStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surface },
  text: { opacity: 0.7 },
  danger: { backgroundColor: colors.disabled },
});

const disabledStyles = StyleSheet.create({
  primary: { backgroundColor: colors.disabled },
  secondary: { borderColor: colors.border },
  text: {},
  danger: { borderColor: colors.border },
});
