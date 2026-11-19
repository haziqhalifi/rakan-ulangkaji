import type { Migration } from './types';

export const CURRENT_SCHEMA_VERSION = 1;

/** Empty at v1. Add `{ from: 1, run }` here when the schema changes. */
export const migrations: Migration[] = [];

export type MigrationResult =
  | { ok: true; data: unknown; migrated: boolean }
  | { ok: false; reason: 'newer_version' | 'migration_failed' };

/**
 * Run each migration step once, in ascending order, from `version` up to `target`.
 * Never mutates storage. The caller decides whether to write the result.
 */
export function runMigrations(
  data: unknown,
  version: number,
  chain: readonly Migration[] = migrations,
  target: number = CURRENT_SCHEMA_VERSION,
): MigrationResult {
  if (version > target) return { ok: false, reason: 'newer_version' };
  let current = data;
  for (let v = version; v < target; v += 1) {
    const step = chain.find((m) => m.from === v);
    if (!step) return { ok: false, reason: 'migration_failed' };
    try {
      current = step.run(current);
    } catch {
      return { ok: false, reason: 'migration_failed' };
    }
  }
  return { ok: true, data: current, migrated: version < target };
}
