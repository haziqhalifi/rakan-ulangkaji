import type { StorageBackend } from './types';

export function createMemoryBackend(): StorageBackend {
  const map = new Map<string, string>();
  return {
    kind: 'memory',
    get: async (key) => map.get(key) ?? null,
    set: async (key, value) => {
      map.set(key, value);
    },
    remove: async (key) => {
      map.delete(key);
    },
    clearAll: async () => {
      map.clear();
    },
  };
}
