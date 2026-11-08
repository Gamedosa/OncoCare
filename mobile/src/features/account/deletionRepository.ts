import { FunctionsHttpError } from '@supabase/supabase-js';
import { z } from 'zod';

import { supabase } from '@/shared/supabase/client';

const errorCodeSchema = z.enum([
  'invalid_input', 'unauthorized', 'invalid_password', 'rate_limited',
  'account_unavailable', 'cleanup_pending', 'internal',
]);
export class AccountDeletionError extends Error {
  constructor(public code: z.infer<typeof errorCodeSchema>) { super(code); }
}

export async function deleteOwnAccount(password: string): Promise<void> {
  if (!password) throw new AccountDeletionError('invalid_input');
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { password } });
  if (error instanceof FunctionsHttpError) {
    const body: unknown = await error.context.json();
    const parsed = z.object({ error: errorCodeSchema }).safeParse(body);
    throw new AccountDeletionError(parsed.success ? parsed.data.error : 'internal');
  }
  if (error) throw error;
  z.object({ status: z.literal('deleted') }).parse(data);
}
