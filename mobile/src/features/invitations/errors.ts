import { isNetworkError } from '@/shared/errors';

import { InvitationError } from './schemas';

const GENERIC = 'Algo deu errado. Tente novamente em instantes.';
const OFFLINE = 'Não foi possível conectar. Verifique sua internet e tente novamente.';

export function inviteErrorMessage(error: unknown): string {
  if (isNetworkError(error) || (error as { name?: unknown } | null)?.name === 'FunctionsFetchError') return OFFLINE;
  if (!(error instanceof InvitationError)) return GENERIC;
  switch (error.code) {
    case 'invalid_input':
      return 'Confira o nome e o e-mail informados.';
    case 'already_linked':
      return 'Esta paciente já está vinculada a você.';
    case 'invitation_unavailable':
      return 'Não é possível convidar este e-mail como paciente.';
    case 'rate_limited':
      return 'Limite de envio de e-mails atingido. Aguarde alguns minutos e tente novamente.';
    case 'not_psychologist':
    case 'unauthorized':
      return 'Sua sessão não permite enviar convites. Entre novamente.';
    default:
      return GENERIC;
  }
}

export function respondErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return OFFLINE;
  if (error instanceof InvitationError) return 'Este convite não está mais disponível.';
  return GENERIC;
}
