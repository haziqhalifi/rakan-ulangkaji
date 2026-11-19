import type { PersistedData, PersistedDocument } from '../profile/types';
import { createLocalBackend } from './localStore';
import { openIdbBackend } from './idb';
import { createMemoryBackend } from './memory';
import { CURRENT_SCHEMA_VERSION, migrations as defaultMigrations, runMigrations } from './migrations';
import type { BackendKind, LoadOutcome, Migration, SecretName, StorageBackend, StorageService } from './types';
import { isPersistedData } from './validate';

export const DATA_KEY = 'data';
export const secretKey = (name: SecretName) => `secret:${name}`;
export const prefKey = (name: 'lang') => `pref:${name}`;

export interface StorageOptions {
  /** IndexedDB factory. Defaults to the browser's. Pass undefined to skip IndexedDB. */
  idb?: IDBFactory;
  /** localStorage-like object. Defaults to the browser's. */
  local?: Storage;
  /** Use a fixed backend, skipping detection. Mainly for tests. */
  backend?: StorageBackend;
  migrations?: readonly Migration[];
  currentVersion?: number;
  now?: () => Date;
}

function browserIdb(): IDBFactory | undefined {
  return typeof indexedDB === 'undefined' ? undefined : indexedDB;
}

function browserLocal(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

async function probe(backend: StorageBackend): Promise<boolean> {
  try {
    await backend.set('probe', '1');
    await backend.remove('probe');
    return true;
  } catch {
    return false;
  }
}

/** Backend order: IndexedDB, then localStorage with prefix `rakan:`, then memory. */
export async function selectBackend(options: StorageOptions = {}): Promise<StorageBackend> {
  if (options.backend) return options.backend;
  const factory = 'idb' in options ? options.idb : browserIdb();
  if (factory) {
    try {
      const backend = await openIdbBackend(factory);
      if (await probe(backend)) return backend;
    } catch {
      // fall through to localStorage
    }
  }
  const local = 'local' in options ? options.local : browserLocal();
  if (local) {
    const backend = createLocalBackend(local);
    if (await probe(backend)) return backend;
  }
  return createMemoryBackend();
}

export function createStorageService(options: StorageOptions = {}): StorageService {
  const chain = options.migrations ?? defaultMigrations;
  const version = options.currentVersion ?? CURRENT_SCHEMA_VERSION;
  const now = options.now ?? (() => new Date());
  let pending: Promise<StorageBackend> | null = null;
  const backend = () => (pending ??= selectBackend(options));

  async function load(): Promise<LoadOutcome> {
    let raw: string | null;
    try {
      raw = await (await backend()).get(DATA_KEY);
    } catch {
      return { status: 'unreadable', reason: 'backend_error' };
    }
    if (raw === null) return { status: 'empty' };

    let doc: unknown;
    try {
      doc = JSON.parse(raw);
    } catch {
      return { status: 'unreadable', reason: 'corrupt' };
    }
    if (typeof doc !== 'object' || doc === null) return { status: 'unreadable', reason: 'corrupt' };
    const { schemaVersion, payload } = doc as Partial<PersistedDocument>;
    if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 0) {
      return { status: 'unreadable', reason: 'corrupt' };
    }

    const result = runMigrations(payload, schemaVersion, chain, version);
    if (!result.ok) return { status: 'unreadable', reason: result.reason };
    if (!isPersistedData(result.data)) return { status: 'unreadable', reason: 'corrupt' };
    // Nothing is written back here. The next save stores the migrated data.
    return { status: 'ok', data: result.data, migrated: result.migrated };
  }

  return {
    load,
    async save(data: PersistedData) {
      const doc: PersistedDocument = { schemaVersion: version, savedAt: now().toISOString(), payload: data };
      await (await backend()).set(DATA_KEY, JSON.stringify(doc));
    },
    async saveSecret(name, value) {
      await (await backend()).set(secretKey(name), value);
    },
    async loadSecret(name) {
      return (await backend()).get(secretKey(name));
    },
    async savePref(name, value) {
      await (await backend()).set(prefKey(name), value);
    },
    async loadPref(name) {
      try {
        return await (await backend()).get(prefKey(name));
      } catch {
        return null;
      }
    },
    async clearAll() {
      await (await backend()).clearAll();
    },
    async backendKind(): Promise<BackendKind> {
      return (await backend()).kind;
    },
  };
}
