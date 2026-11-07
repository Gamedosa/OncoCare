type MaybeError = { name?: unknown; status?: unknown; message?: unknown };

const FETCH_FAILURE = /^(TypeError|FetchError|AbortError)\b.*(fetch|network)/i;

// Detects connectivity failures from supabase-js auth (AuthRetryableFetchError),
// PostgREST ("TypeError: Failed to fetch" in error.message) and raw fetch errors.
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, status, message } = error as MaybeError;
  if (name === 'AuthRetryableFetchError' || status === 0) return true;
  if (error instanceof TypeError) return /fetch|network/i.test(error.message);
  return typeof message === 'string' && FETCH_FAILURE.test(message);
}
