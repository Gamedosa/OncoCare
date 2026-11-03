import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, colors, font, Header, Notice, Screen, TextField } from '@/shared/ui';

import { isNetworkError, OFFLINE_MESSAGE } from './authErrors';
import { useRequestPasswordReset } from './hooks';
import { emailSchema } from './schemas';

export function ForgotPasswordScreen() {
  const router = useRouter();
  const reset = useRequestPasswordReset();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  const submit = () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    reset.mutate(parsed.data);
  };

  // Any non-network failure still shows the neutral confirmation so the screen
  // never reveals whether an account exists.
  const sent = reset.isSuccess || (reset.isError && !isNetworkError(reset.error));

  return (
    <Screen header={<Header title="Recuperar senha" onBack={() => router.back()} />}>
      <Text style={styles.intro}>Informe seu e-mail e enviaremos as instruções para criar uma nova senha.</Text>
      <TextField
        label="E-mail"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError(undefined);
          reset.reset();
        }}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="send"
        onSubmitEditing={submit}
        error={error}
      />
      {sent ? <Notice tone="success">Se houver uma conta com este e-mail, enviaremos as instruções.</Notice> : null}
      {reset.isError && isNetworkError(reset.error) ? <Notice tone="error">{OFFLINE_MESSAGE}</Notice> : null}
      <Button onPress={submit} loading={reset.isPending}>
        Enviar instruções
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: font.body, color: colors.textMuted },
});
