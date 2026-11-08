import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { z } from 'zod';
import { Button, Header, Notice, Screen } from '@/shared/ui';
import { useVerifyEmailChangeLink } from './hooks';

const linkSchema = z.object({ token_hash: z.string().min(1).max(2048), type: z.literal('email_change') });
export function ConfirmEmailScreen() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const router = useRouter();
  const [token, setToken] = useState(() => {
    const parsed = linkSchema.safeParse(params);
    return parsed.success ? parsed.data.token_hash : '';
  });
  const verify = useVerifyEmailChangeLink(() => token);
  const capturedLink = useRef<string | null>(null);
  useEffect(() => {
    if (params.token_hash === undefined && params.type === undefined) return;
    const linkId = JSON.stringify([params.token_hash, params.type]);
    if (capturedLink.current === linkId) return;
    capturedLink.current = linkId;
    const parsed = linkSchema.safeParse(params);
    setToken(parsed.success ? parsed.data.token_hash : '');
    verify.reset();
    router.setParams({ token_hash: undefined, type: undefined });
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, [params.token_hash, params.type, router, verify.reset]);
  const confirm = async () => {
    try { await verify.mutateAsync(); setToken(''); }
    catch { /* The mutation error is displayed below without exposing the token. */ }
  };
  return (
    <Screen header={<Header title="Confirmar e-mail · ElaConta" />}>
      {verify.isSuccess ? (
        <Notice tone="success">Link confirmado. Se a confirmação segura estiver habilitada, confirme também o link do outro endereço. A mudança só termina após todas as confirmações exigidas.</Notice>
      ) : token ? (
        <>
          <Notice>Confirme a alteração de e-mail solicitada para sua conta. Validar este link pode substituir a sessão aberta neste dispositivo.</Notice>
          {verify.isError ? <Notice tone="error">Não foi possível confirmar. O link pode estar inválido, expirado ou já utilizado. Verifique sua conexão ou solicite a troca novamente em Conta.</Notice> : null}
          <Button loading={verify.isPending} onPress={confirm}>Confirmar alteração de e-mail</Button>
        </>
      ) : <Notice tone="error">Link de confirmação inválido. Solicite a alteração novamente em Conta.</Notice>}
      <Button variant="secondary" disabled={verify.isPending} onPress={() => router.replace('/')}>Voltar ao aplicativo</Button>
    </Screen>
  );
}
