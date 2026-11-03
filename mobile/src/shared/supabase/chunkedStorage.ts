import type { SupportedStorage } from '@supabase/supabase-js';

export type KeyValueStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

// expo-secure-store warns above ~2048 bytes per value; 600 UTF-16 units stays
// below that even when every character needs 3 UTF-8 bytes.
export const CHUNK_SIZE = 600;

const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

export function createChunkedStorage(store: KeyValueStore, chunkSize = CHUNK_SIZE): SupportedStorage {
  async function readCount(key: string): Promise<number> {
    const raw = await store.getItemAsync(countKey(key));
    const count = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isInteger(count) && count > 0 ? count : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await Promise.all(Array.from({ length: count }, (_, i) => store.deleteItemAsync(chunkKey(key, i))));
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key) {
      const count = await readCount(key);
      if (count === 0) return null;
      const chunks = await Promise.all(Array.from({ length: count }, (_, i) => store.getItemAsync(chunkKey(key, i))));
      if (chunks.some((chunk) => chunk === null)) return null;
      return chunks.join('');
    },

    async setItem(key, value) {
      await removeItem(key);
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      await Promise.all(chunks.map((chunk, i) => store.setItemAsync(chunkKey(key, i), chunk)));
      await store.setItemAsync(countKey(key), String(chunks.length));
    },

    removeItem,
  };
}
