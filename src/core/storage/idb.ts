import type { StorageBackend } from './types';

export const DB_NAME = 'rakan-ulangkaji';
export const STORE_NAME = 'kv';

function wrap<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Open the database and return a key-value backend. Rejects if IndexedDB is unavailable. */
export async function openIdbBackend(factory: IDBFactory): Promise<StorageBackend> {
  const openRequest = factory.open(DB_NAME, 1);
  openRequest.onupgradeneeded = () => {
    const db = openRequest.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
  };
  const db = await wrap(openRequest);

  const run = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>) => {
    const tx = db.transaction(STORE_NAME, mode);
    const finished = done(tx);
    const result = await wrap(fn(tx.objectStore(STORE_NAME)));
    await finished;
    return result;
  };

  return {
    kind: 'indexeddb',
    get: async (key) => {
      const value = await run('readonly', (s) => s.get(key));
      return typeof value === 'string' ? value : null;
    },
    set: async (key, value) => {
      await run('readwrite', (s) => s.put(value, key));
    },
    remove: async (key) => {
      await run('readwrite', (s) => s.delete(key));
    },
    clearAll: async () => {
      await run('readwrite', (s) => s.clear());
    },
  };
}
