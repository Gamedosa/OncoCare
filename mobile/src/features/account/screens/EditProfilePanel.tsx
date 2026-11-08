import { useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import type { Profile } from '@/features/auth/schemas';
import { emailSchema } from '@/features/auth/schemas';
import { Button, colors, Notice, TextField } from '@/shared/ui';
import { useAccountContact, useRequestEmailChange, useUpdateDisplayName } from '../hooks';
import { displayNameSchema } from '../profileSchemas';

export function EditProfilePanel({ profile }: { profile: Profile }) {
  const contact = useAccountContact(profile.id);
  const nameMutation = useUpdateDisplayName(profile.id);
  const emailMutation = useRequestEmailChange(profile.id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.displayName ?? '');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [emailError, setEmailError] = useState<string>();
  const busy = nameMutation.isPending || emailMutation.isPending;
  const saveName = () => {
    const parsed = displayNameSchema.safeParse(name);
    setNameError(parsed.success ? undefined : parsed.error.issues[0]?.message);
    if (parsed.success) nameMutation.mutate(parsed.data);
  };
  const saveEmail = () => {
    const parsed = emailSchema.safeParse(email);
    setEmailError(parsed.success ? undefined : parsed.error.issues[0]?.message);
    if (parsed.success) emailMutation.mutate(parsed.data);
  };
  return (
    <>
      {contact.isPending ? <ActivityIndicator color={colors.primary} accessibilityLabel="Carregando e-mail" /> : null}
      {contact.isError ? (
        <>
          <Notice tone="error">Não foi possível carregar seu e-mail.</Notice>
          <Button variant="text" onPress={() => void contact.refetch()}>Carregar e-mail novamente</Button>
        </>
      ) : contact.data ? <Text style={{ color: colors.text }}>E-mail: {contact.data.email}</Text> : null}
      {contact.data?.pendingEmail ? (
        <Notice>Alteração aguardando confirmação: {contact.data.pendingEmail}. Confirme os links enviados para o e-mail atual e o novo e-mail.</Notice>
      ) : null}
      {editing ? (
        <>
          <TextField label="Nome de exibição" value={name} error={nameError} editable={!busy}
            onChangeText={(value) => { setName(value); setNameError(undefined); nameMutation.reset(); }} maxLength={120} />
          {nameMutation.isError ? <Notice tone="error">Não foi possível salvar seu nome. Tente novamente.</Notice> : null}
          {nameMutation.isSuccess ? <Notice tone="success">Nome atualizado.</Notice> : null}
          <Button disabled={busy || name.trim() === profile.displayName} loading={nameMutation.isPending} onPress={saveName}>Salvar nome</Button>
          {contact.data ? (
            <>
              <TextField label="Novo e-mail" value={email} error={emailError} editable={!busy} autoCapitalize="none"
                autoCorrect={false} keyboardType="email-address" autoComplete="email"
                onChangeText={(value) => { setEmail(value); setEmailError(undefined); emailMutation.reset(); }} />
              <Notice>A troca de e-mail exige confirmação. Seu e-mail de acesso só muda após concluir os links enviados pelo Supabase.</Notice>
              {emailMutation.isError ? <Notice tone="error">Não foi possível solicitar a troca de e-mail. Verifique o endereço e tente novamente mais tarde.</Notice> : null}
              {emailMutation.isSuccess ? <Notice tone="success">{emailMutation.data.pendingEmail
                ? 'Solicitação enviada. Confirme os links recebidos no e-mail atual e no novo endereço.'
                : 'E-mail atualizado pelo servidor. Use o endereço mostrado acima para entrar.'}</Notice> : null}
              <Button disabled={busy || !email.trim() || email.trim().toLowerCase() === contact.data.email.toLowerCase()}
                loading={emailMutation.isPending} onPress={saveEmail}>Solicitar troca de e-mail</Button>
            </>
          ) : null}
          <Button variant="text" disabled={busy} onPress={() => {
            setEditing(false); setEmail(''); setNameError(undefined); setEmailError(undefined);
            nameMutation.reset(); emailMutation.reset();
          }}>Concluir edição</Button>
        </>
      ) : <Button variant="secondary" onPress={() => {
        setName(profile.displayName ?? ''); setEmail(''); setEditing(true);
      }}>Editar dados</Button>}
    </>
  );
}
