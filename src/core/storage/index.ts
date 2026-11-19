export { createStorageService, selectBackend, DATA_KEY, secretKey, prefKey } from './StorageService';
export type { StorageOptions } from './StorageService';
export { CURRENT_SCHEMA_VERSION, runMigrations, migrations } from './migrations';
export { createMemoryBackend } from './memory';
export { createLocalBackend, LOCAL_PREFIX } from './localStore';
export { openIdbBackend, DB_NAME, STORE_NAME } from './idb';
export { isPersistedData } from './validate';
export type {
  StorageService,
  StorageBackend,
  BackendKind,
  Migration,
  LoadOutcome,
  UnreadableReason,
  SecretName,
} from './types';
export { buildExport, parseImport, EXPORT_APP_ID } from './exportImport';
export type { ExportBundle, ExportPayload, ImportError } from './exportImport';
