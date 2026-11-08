import { useMutation, useQueryClient } from '@tanstack/react-query';

import { AccountDeletionError, deleteOwnAccount } from './deletionRepository';

export function useDeleteAccount(password: () => string) {
  const client = useQueryClient();
  const discardAccountData = async () => {
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] !== 'profile' };
    await client.cancelQueries(filters);
    client.removeQueries(filters);
  };
  return useMutation({
    mutationFn: () => deleteOwnAccount(password()),
    gcTime: 0,
    retry: false,
    onSuccess: discardAccountData,
    onError: async (error) => {
      if (!(error instanceof AccountDeletionError) || error.code === 'cleanup_pending' || error.code === 'account_unavailable') {
        await discardAccountData();
        await client.invalidateQueries({ queryKey: ['profile'] });
      }
    },
  });
}

export function accountDeletionMessage(error: unknown): string {
  if (error instanceof AccountDeletionError) {
    switch (error.code) {
      case 'invalid_password': return 'Senha incorreta. Verifique sua senha atual e tente novamente.';
      case 'invalid_input': return 'Informe sua senha atual para excluir a conta.';
      case 'unauthorized': return 'Sua sessão expirou. Entre novamente para continuar.';
      case 'rate_limited': return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      case 'cleanup_pending': return 'A exclusão foi iniciada, mas a limpeza de arquivos ou da conta ainda não terminou. Seus dados não estão mais disponíveis para acompanhamento. Tente concluir a exclusão novamente.';
      case 'account_unavailable': return 'A conta não está disponível. Saia e verifique se a exclusão já foi concluída.';
    }
  }
  return 'Não foi possível confirmar a exclusão. Verifique sua conexão e tente novamente; a solicitação pode ter sido processada.';
}
