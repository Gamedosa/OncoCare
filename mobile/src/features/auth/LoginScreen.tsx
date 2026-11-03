import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, colors, font, Notice, Screen, spacing, TextField } from '@/shared/ui';

import { signInErrorMessage } from './authErrors';
import { useSignIn } from './hooks';
import { credentialsSchema } from './schemas';

type FieldErrors = { email?: string; password?: string };

export function LoginScreen() {
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const submit = () => {
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    signIn.mutate(parsed.data);
  };

  const clearErrors = () => {
    setFieldErrors({});
    if (signIn.isError) signIn.reset();
  };

  return (
    <Screen>
      <View style={styles.brand}>
        <Image source={require('../../../assets/logo.png')} style={styles.logo} accessible={false} />
        <Text accessibilityRole="header" style={styles.title}>
          OncoCare
        </Text>
        <Text style={styles.subtitle}>Seu diário de cuidado</Text>
      </View>

      {signIn.isError ? <Notice tone="error">{signInErrorMessage(signIn.error)}</Notice> : null}

      <TextField
        label="E-mail"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          clearErrors();
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="username"
        returnKeyType="next"
        error={fieldErrors.email}
      />
      <View style={styles.passwordGroup}>
        <TextField
          label="Senha"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearErrors();
          }}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          error={fieldErrors.password}
        />
        <Button variant="text" onPress={() => setShowPassword((v) => !v)} style={styles.toggle}>
          {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        </Button>
      </View>

      <Button onPress={submit} loading={signIn.isPending}>
        Entrar
      </Button>
      <Link href="/forgot-password" asChild>
        <Button variant="text" style={styles.center}>
          Esqueci minha senha
        </Button>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.sm },
  logo: { width: 128, height: 128 },
  title: { marginTop: spacing.sm, fontSize: font.display, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: font.body, color: colors.textMuted },
  passwordGroup: { gap: spacing.xs },
  toggle: { alignSelf: 'flex-end' },
  center: { alignSelf: 'center' },
});
