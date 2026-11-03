import { describe, expect, it } from '@jest/globals';

import { createChunkedStorage, type KeyValueStore } from './chunkedStorage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

describe('createChunkedStorage', () => {
  it('splits large values into chunks and restores them', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);

    await storage.setItem('sb-auth', 'abcdefghij');

    expect(store.data.get('sb-auth.chunks')).toBe('3');
    expect(store.data.get('sb-auth.2')).toBe('ij');
    await expect(storage.getItem('sb-auth')).resolves.toBe('abcdefghij');
  });

  it('removes stale chunks when a shorter value is written', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);

    await storage.setItem('sb-auth', 'abcdefghij');
    await storage.setItem('sb-auth', 'xy');

    expect([...store.data.keys()].sort()).toEqual(['sb-auth.0', 'sb-auth.chunks']);
    await expect(storage.getItem('sb-auth')).resolves.toBe('xy');
  });

  it('returns null for missing or incomplete values', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);

    await expect(storage.getItem('sb-auth')).resolves.toBeNull();

    await storage.setItem('sb-auth', 'abcdefghij');
    store.data.delete('sb-auth.1');
    await expect(storage.getItem('sb-auth')).resolves.toBeNull();
  });

  it('removes every chunk', async () => {
    const store = memoryStore();
    const storage = createChunkedStorage(store, 4);

    await storage.setItem('sb-auth', 'abcdefghij');
    await storage.removeItem('sb-auth');

    expect(store.data.size).toBe(0);
  });
});
