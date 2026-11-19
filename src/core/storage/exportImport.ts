import { defaultSettings, type PersistedData, type Result } from '../profile/types';
import { validateProfileInput } from '../profile/validation';
import { CURRENT_SCHEMA_VERSION, runMigrations } from './migrations';
import type { Migration } from './types';
import { isPersistedData } from './validate';

export const EXPORT_APP_ID = 'rakan-ulangkaji';

/** What a student may take out: profile, progress, grades and chat. No keys, settings or exam state. */
export type ExportPayload = Pick<PersistedData, 'profile' | 'progress' | 'grades' | 'chat'>;

export interface ExportBundle {
  app: typeof EXPORT_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  payload: ExportPayload;
}

export type ImportError = 'bad_shape' | 'newer_version' | 'migration_failed' | 'invalid_data';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function buildExport(data: PersistedData, now: Date = new Date()): ExportBundle {
  return {
    app: EXPORT_APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    payload: {
      profile: data.profile,
      progress: data.progress,
      grades: data.grades,
      chat: data.chat,
    },
  };
}

/**
 * Check a parsed import file. Guards the shape and version, runs migrations, and
 * validates the result. Never touches storage. The caller decides what to replace.
 */
export function parseImport(
  bundle: unknown,
  chain?: readonly Migration[],
  target: number = CURRENT_SCHEMA_VERSION,
): Result<ExportPayload, ImportError> {
  if (!isObject(bundle) || bundle.app !== EXPORT_APP_ID) return { ok: false, error: 'bad_shape' };
  const { schemaVersion, payload } = bundle;
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 0) {
    return { ok: false, error: 'bad_shape' };
  }
  if (!isObject(payload)) return { ok: false, error: 'bad_shape' };

  // Migrations work on a full document, so fill in the parts an export leaves out.
  const full = { ...payload, settings: defaultSettings(), examInProgress: null };
  const migrated = runMigrations(full, schemaVersion, chain, target);
  if (!migrated.ok) return { ok: false, error: migrated.reason };
  if (!isPersistedData(migrated.data)) return { ok: false, error: 'invalid_data' };

  const { profile, progress, grades, chat } = migrated.data;
  if (profile !== null) {
    const checked = validateProfileInput(profile, typeof profile.createdAt === 'string' ? profile.createdAt : '');
    if (!checked.ok || typeof profile.createdAt !== 'string') return { ok: false, error: 'invalid_data' };
  }
  return { ok: true, value: { profile, progress, grades, chat } };
}
