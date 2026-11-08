export type DeleteErrorCode = 'invalid_input' | 'unauthorized' | 'invalid_password' | 'rate_limited'
  | 'account_unavailable' | 'cleanup_pending' | 'internal';

export class DeleteError extends Error {
  constructor(public code: DeleteErrorCode) {
    super(code);
  }
}

export const STATUS_BY_CODE: Record<DeleteErrorCode, number> = {
  invalid_input: 400, unauthorized: 401, invalid_password: 403, rate_limited: 429,
  account_unavailable: 404, cleanup_pending: 503, internal: 500,
};

export type DeleteInput = { password: string } | { userId: string };
export type StoredObject = { bucket_id: string; name: string };
export type DeleteDeps = {
  verifyPassword(userId: string, password: string): Promise<void>;
  begin(userId: string): Promise<void>;
  listObjects(userId: string): Promise<StoredObject[]>;
  removeObjects(bucket: string, paths: string[]): Promise<void>;
  deleteUser(userId: string): Promise<void>;
};

export function parseDeleteInput(body: unknown, isAdmin: boolean): DeleteInput {
  if (!body || typeof body !== 'object') throw new DeleteError('invalid_input');
  const input = body as Record<string, unknown>;
  if (isAdmin) {
    if (typeof input.userId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.userId)) {
      throw new DeleteError('invalid_input');
    }
    return { userId: input.userId };
  }
  if (input.userId !== undefined || typeof input.password !== 'string'
    || input.password.length < 1 || input.password.length > 1024) throw new DeleteError('invalid_input');
  return { password: input.password };
}

export async function deleteAccount(deps: DeleteDeps, callerId: string | null, input: DeleteInput): Promise<void> {
  const userId = 'userId' in input ? input.userId : callerId;
  if (!userId) throw new DeleteError('unauthorized');
  if ('password' in input) await deps.verifyPassword(userId, input.password);
  await deps.begin(userId);
  try {
    // Bounded work per invocation; persistent deletion state permits safe retries.
    for (let batch = 0; batch < 20; batch++) {
      const objects = await deps.listObjects(userId);
      if (objects.length === 0) {
        await deps.deleteUser(userId);
        return;
      }
      const buckets = new Map<string, string[]>();
      for (const object of objects) {
        const paths = buckets.get(object.bucket_id) ?? [];
        paths.push(object.name);
        buckets.set(object.bucket_id, paths);
      }
      for (const [bucket, paths] of buckets) await deps.removeObjects(bucket, paths);
    }
    throw new DeleteError('cleanup_pending');
  } catch (error) {
    if (error instanceof DeleteError) throw error;
    throw new DeleteError('cleanup_pending');
  }
}
