import type { PersistedData } from '../profile/types';

export type BackendKind = 'indexeddb' | 'localstorage' | 'memory';

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clearAll(): Promise<void>;
  readonly kind: BackendKind;
}

export interface Migration {
  /** Migrates data from version `from` to `from + 1`. */
  from: number;
  run(data: unknown): unknown;
}

export type UnreadableReason = 'newer_version' | 'migration_failed' | 'corrupt' | 'backend_error';

export type LoadOutcome =
  | { status: 'empty' }
  | { status: 'ok'; data: PersistedData; migrated: boolean }
  | { status: 'unreadable'; reason: UnreadableReason };

export type SecretName = 'userKeyApiKey';

export interface StorageService {
  load(): Promise<LoadOutcome>;
  save(data: PersistedData): Promise<void>;
  saveSecret(name: SecretName, value: string): Promise<void>;
  loadSecret(name: SecretName): Promise<string | null>;
  savePref(name: 'lang', value: string): Promise<void>;
  loadPref(name: 'lang'): Promise<string | null>;
  clearAll(): Promise<void>;
  /** Which backend is in use. Known after the first call. */
  backendKind(): Promise<BackendKind>;
}
