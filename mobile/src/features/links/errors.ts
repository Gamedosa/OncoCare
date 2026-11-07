import { isNetworkError } from '@/shared/errors';

export function unlinkErrorMessage(error: unknown): string {
  if (isNetworkError(error)) return 'Não foi possível conectar. Verifique sua internet e tente novamente.';
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P0002') {
    return 'Este vínculo não está mais disponível. Atualize a tela e tente novamente.';
  }
  return 'Não foi possível encerrar o vínculo. Tente novamente.';
}
