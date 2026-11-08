import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { signOutLocally } from '@/features/auth/authRepository';
import type { Role } from '@/features/auth/schemas';
import { Button, Card, colors, ConfirmDialog, font, Notice, TextField } from '@/shared/ui';
import { accountDeletionMessage, useDeleteAccount } from '../deletionHooks';

export function DeleteAccountPanel({ role, pending = false }: { role: Role; pending?: boolean }) {
  const [expanded, setExpanded] = useState(pending);
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const deletion = useDeleteAccount(() => password);
  const finishSession = useMutation({ mutationFn: signOutLocally, retry: false });
  const { mutate: finish } = finishSession;
  useEffect(() => { if (deletion.isSuccess) finish(); }, [deletion.isSuccess, finish]);
  const message = role === 'patient'
    ? 'Sua conta, seus relatos de texto, áudios, convites e notificações serão excluídos permanentemente do ambiente ativo. Seu psicólogo perderá o acesso aos seus registros.'
    : 'Sua conta, convites e notificações serão excluídos permanentemente. Suas pacientes perderão apenas o vínculo com você: as contas e todos os relatos delas serão preservados.';
  const confirm = async () => {
    setConfirming(false);
    try { await deletion.mutateAsync(); } catch { /* The mutation error is displayed below. */ }
    finally { setPassword(''); }
  };

  if (deletion.isSuccess) return (
    <Card>
      <Notice tone="success">Conta excluída. Encerrando a sessão neste dispositivo.</Notice>
      {finishSession.isError ? (
        <>
          <Notice tone="error">A conta foi excluída, mas não foi possível encerrar a sessão local. Tente novamente.</Notice>
          <Button onPress={() => finish()} loading={finishSession.isPending}>Encerrar sessão</Button>
        </>
      ) : null}
    </Card>
  );
  return (
    <Card>
      <Text accessibilityRole="header" style={styles.title}>Excluir conta</Text>
      {pending ? <Notice tone="error">A exclusão da sua conta está em andamento. Conclua a limpeza abaixo. Esta operação não pode ser desfeita.</Notice> : null}
      <Text style={styles.text}>{message} Esta ação não pode ser desfeita.</Text>
      <Text style={styles.text}>Backups não são apagados instantaneamente e a política de retenção ainda está em definição. Cópias já obtidas por outras pessoas não podem ser apagadas pelo app.</Text>
      {expanded ? (
        <>
          <TextField label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry
            autoCapitalize="none" autoCorrect={false} editable={!deletion.isPending} />
          {deletion.isError ? <Notice tone="error">{accountDeletionMessage(deletion.error)}</Notice> : null}
          <Button variant="danger" disabled={!password} loading={deletion.isPending} onPress={() => setConfirming(true)}>
            {pending ? 'Concluir exclusão' : 'Excluir minha conta'}
          </Button>
          {!pending ? <Button variant="text" disabled={deletion.isPending} onPress={() => {
            setPassword(''); setExpanded(false); deletion.reset();
          }}>Cancelar</Button> : null}
        </>
      ) : <Button variant="danger" onPress={() => setExpanded(true)}>Excluir minha conta</Button>}
      <ConfirmDialog visible={confirming} title="Excluir sua conta permanentemente?" message={message}
        confirmLabel="Excluir permanentemente" cancelLabel="Voltar" destructive
        onConfirm={confirm} onCancel={() => setConfirming(false)} />
    </Card>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: font.body, fontWeight: '800', color: colors.text },
  text: { fontSize: font.body, color: colors.text, lineHeight: 22 },
});
