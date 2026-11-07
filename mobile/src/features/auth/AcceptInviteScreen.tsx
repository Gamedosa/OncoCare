import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { Button, colors, font, Header, Notice, Screen, TextField } from '@/shared/ui';

import { useAuth } from './AuthProvider';
import { isNetworkError, OFFLINE_MESSAGE } from './authErrors';
import { useUpdatePassword, useVerifyInviteLink } from './hooks';
import { inviteLinkSchema, resetPasswordSchema } from './schemas';

export function AcceptInviteScreen() {
  const router = useRouter();
  const auth = useAuth();
  const params = useLocalSearchParams<{ token_hash?: string | string[]; type?: string | string[] }>();
  const [token, setToken] = useState(() => {
    const parsed = inviteLinkSchema.safeParse(params);
    return parsed.success ? parsed.data.token_hash : '';
  });
  const verify = useVerifyInviteLink(() => token);
  const update = useUpdatePassword();
  const [verified, setVerified] = useState(false);
  const [passwordCreated, setPasswordCreated] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmation?: string }>({});

  useEffect(() => {
    if (params.token_hash === undefined && params.type === undefined) return;
    const parsed = inviteLinkSchema.safeParse({ token_hash: params.token_hash, type: params.type });
    setToken(parsed.success ? parsed.data.token_hash : '');
    setVerified(false);
    setPasswordCreated(false);
    // Keep invite credentials out of the visible URL after capturing them in memory.
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

  const save = async () => {
    if (update.isPending) return;
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
      setPasswordCreated(true);
    } catch {
      // The form stays available for errors such as a stricter server password policy.
    }
  };

  const signedInPatient = auth.status === 'signedIn' && auth.profile.role === 'patient';
  const activeInvite = verified && auth.status !== 'signedOut';

  return (
    <Screen header={<Header title="Convite OncoCare" />}>
      {passwordCreated ? (
        <>
          <Notice tone="success">Senha criada. Agora você pode decidir se aceita o acompanhamento.</Notice>
          {auth.status === 'profileError' ? (
            <>
              <Notice tone="error">Não foi possível carregar sua conta. Tente novamente.</Notice>
              <Button variant="secondary" onPress={auth.retry}>Tentar novamente</Button>
            </>
          ) : null}
          <Button onPress={() => router.replace('/patient/invitations')} disabled={!signedInPatient}
            loading={auth.status === 'loading'}>
            Ver convite
          </Button>
        </>
      ) : activeInvite ? (
        <>
          <Text style={styles.intro}>Crie uma senha com pelo menos 6 caracteres para acessar o OncoCare.</Text>
          <TextField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            error={errors.password}
            editable={!update.isPending}
          />
          <TextField
            label="Confirmar senha"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            error={errors.confirmation}
            editable={!update.isPending}
          />
          {update.isError ? (
            <Notice tone="error">{isNetworkError(update.error) ? OFFLINE_MESSAGE :
              'Não foi possível criar a senha. Verifique se ela atende aos requisitos e tente novamente.'}</Notice>
          ) : null}
          <Button onPress={save} loading={update.isPending}>Criar senha</Button>
        </>
      ) : token ? (
        <>
          <Text style={styles.intro}>
            Toque abaixo para validar seu convite. Em seguida, você criará sua senha e poderá aceitar ou recusar o
            acompanhamento.
          </Text>
          {auth.status === 'signedIn' ? (
            <Notice>Ao continuar, a sessão atual neste dispositivo será substituída pela conta do convite.</Notice>
          ) : null}
          {verify.isError ? <Notice tone="error">{isNetworkError(verify.error) ? OFFLINE_MESSAGE :
            'Convite inválido, expirado ou já utilizado. Peça um novo convite ou, se já criou sua senha, entre ou use “Esqueci minha senha”.'}</Notice> : null}
          <Button onPress={validateLink} loading={verify.isPending}>Validar convite</Button>
        </>
      ) : (
        <>
          <Notice tone="error">Link de convite inválido. Peça um novo convite ou, se já criou sua senha, entre no aplicativo.</Notice>
          <Button variant="text" onPress={() => router.replace('/')}>Ir para o início</Button>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: font.body, color: colors.textMuted },
});
