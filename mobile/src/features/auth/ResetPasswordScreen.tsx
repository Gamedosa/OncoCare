import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { Button, colors, font, Header, Notice, Screen, TextField } from '@/shared/ui';

import { useAuth } from './AuthProvider';
import { isNetworkError, OFFLINE_MESSAGE } from './authErrors';
import { useFinishPasswordRecovery, useSignOut, useUpdatePassword, useVerifyRecoveryLink } from './hooks';
import { recoveryLinkSchema, resetPasswordSchema } from './schemas';

export function ResetPasswordScreen() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ token_hash?: string | string[]; type?: string | string[] }>();
  const [token, setToken] = useState(() => {
    const parsed = recoveryLinkSchema.safeParse(params);
    return parsed.success ? parsed.data.token_hash : '';
  });
  const verify = useVerifyRecoveryLink(() => token);
  const update = useUpdatePassword();
  const finish = useFinishPasswordRecovery();
  const leave = useSignOut();
  const [verified, setVerified] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [complete, setComplete] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});

  useEffect(() => {
    if (params.token_hash === undefined && params.type === undefined) return;
    const parsed = recoveryLinkSchema.safeParse({ token_hash: params.token_hash, type: params.type });
    setToken(parsed.success ? parsed.data.token_hash : '');
    setVerified(false);
    setPasswordChanged(false);
    setComplete(false);
    setPassword('');
    setConfirmation('');
    setErrors({});
    // Keep recovery credentials out of the visible URL after capturing them in memory.
    router.setParams({ token_hash: undefined, type: undefined });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, [params.token_hash, params.type, router]);

  const validateLink = async () => {
    try {
      await verify.mutateAsync();
      setToken('');
      setVerified(true);
    } catch {
      // The mutation renders a neutral error, never the token or server response.
    }
  };

  const closeSessions = async () => {
    try {
      await finish.mutateAsync();
      setComplete(true);
    } catch {
      // Password is already changed; retry sign-out only.
    }
  };

  const save = async () => {
    if (update.isPending || finish.isPending) return;
    const parsed = resetPasswordSchema.safeParse({ password, confirmation });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ password: fieldErrors.password?.[0], confirmation: fieldErrors.confirmation?.[0] });
      return;
    }
    setErrors({});
    try {
      await update.mutateAsync(parsed.data.password);
      setPassword('');
      setConfirmation('');
      update.reset();
      setPasswordChanged(true);
      await closeSessions();
    } catch {
      // The form stays available for errors such as a stricter server password policy.
    }
  };

  const activeRecovery = verified && auth.status === 'passwordRecovery';
  const requestAnother = async () => {
    try {
      await leave.mutateAsync();
      router.replace('/forgot-password');
    } catch {
      // Do not navigate to a signed-out route before confirming session cleanup.
    }
  };
  return (
    <Screen header={<Header title="Redefinir senha" />}>
      {complete ? (
        <>
          <Notice tone="success">Senha redefinida. Entre novamente com sua nova senha.</Notice>
          <Button onPress={() => router.replace('/login')}>Voltar ao login</Button>
        </>
      ) : passwordChanged ? (
        <>
          <Notice>Senha alterada. Estamos encerrando as sessões da sua conta.</Notice>
          {finish.isError ? <Notice tone="error">Não foi possível encerrar as sessões. Tente novamente.</Notice> : null}
          <Button onPress={closeSessions} loading={finish.isPending}>Concluir e encerrar sessões</Button>
        </>
      ) : activeRecovery ? (
        <>
          <Text style={styles.intro}>Escolha uma nova senha com pelo menos 6 caracteres.</Text>
          <TextField
            label="Nova senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            error={errors.password}
            editable={!update.isPending && !leave.isPending}
          />
          <TextField
            label="Confirmar nova senha"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            error={errors.confirmation}
            editable={!update.isPending && !leave.isPending}
          />
          {update.isError ? (
            <Notice tone="error">{isNetworkError(update.error) ? OFFLINE_MESSAGE :
              'Não foi possível alterar a senha. Ela deve ser diferente da anterior e atender aos requisitos da sua conta. Se o link expirou, solicite outro.'}</Notice>
          ) : null}
          <Button onPress={save} loading={update.isPending} disabled={leave.isPending}>Salvar nova senha</Button>
        </>
      ) : token ? (
        <>
          <Text style={styles.intro}>Toque abaixo para validar seu link de recuperação e escolher uma nova senha.</Text>
          {verify.isError ? <Notice tone="error">{isNetworkError(verify.error) ? OFFLINE_MESSAGE :
            'Link inválido, expirado ou já utilizado. Solicite novas instruções de recuperação.'}</Notice> : null}
          <Button onPress={validateLink} loading={verify.isPending} disabled={leave.isPending}>Validar link de recuperação</Button>
        </>
      ) : (
        <Notice tone="error">Link de recuperação inválido ou sessão encerrada. Solicite novas instruções de recuperação.</Notice>
      )}
      {!complete && !passwordChanged ? (
        <>
          {leave.isError ? <Notice tone="error">Não foi possível encerrar a sessão. Tente novamente.</Notice> : null}
          <Button variant="text" disabled={verify.isPending || update.isPending} loading={leave.isPending}
            onPress={requestAnother}>
            Solicitar outro link
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: font.body, color: colors.textMuted },
});
