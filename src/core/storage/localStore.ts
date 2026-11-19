import type { StorageBackend } from './types';

export const LOCAL_PREFIX = 'rakan:';

/** localStorage backend. Every key is prefixed so clearAll never touches other sites' data. */
export function createLocalBackend(storage: Storage): StorageBackend {
  return {
    kind: 'localstorage',
    get: async (key) => storage.getItem(LOCAL_PREFIX + key),
    set: async (key, value) => {
      storage.setItem(LOCAL_PREFIX + key, value);
    },
    remove: async (key) => {
      storage.removeItem(LOCAL_PREFIX + key);
    },
    clearAll: async () => {
      const doomed: string[] = [];
      for (let i = 0; i < storage.length; i += 1) {
        const k = storage.key(i);
        if (k !== null && k.startsWith(LOCAL_PREFIX)) doomed.push(k);
      }
      doomed.forEach((k) => storage.removeItem(k));
    },
  };
}
