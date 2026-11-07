import { isNetworkError } from '@/shared/errors';

export { isNetworkError };

export const OFFLINE_MESSAGE = 'Não foi possível conectar. Verifique sua internet e tente novamente.';
export const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha incorretos.';
export const GENERIC_ERROR_MESSAGE = 'Algo deu errado. Tente novamente em instantes.';
export const RATE_LIMIT_MESSAGE = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

type MaybeAuthError = { code?: unknown; status?: unknown };

// Never reveal whether an e-mail exists: every credential failure gets the same message.
export function signInErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return OFFLINE_MESSAGE;
  const { code, status } = (error ?? {}) as MaybeAuthError;
  if (code === 'over_request_rate_limit' || status === 429) return RATE_LIMIT_MESSAGE;
  if (code === 'invalid_credentials' || code === 'email_not_confirmed' || status === 400) return INVALID_CREDENTIALS_MESSAGE;
  return GENERIC_ERROR_MESSAGE;
}
