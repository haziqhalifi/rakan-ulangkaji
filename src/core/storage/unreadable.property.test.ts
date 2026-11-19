import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfileStore } from '../profile/ProfileStore';
import { sampleData } from '../../test/fixtures';
import { fcConfig } from '../../test/fcConfig';
import { createMemoryBackend } from './memory';
import { CURRENT_SCHEMA_VERSION } from './migrations';
import { createStorageService, DATA_KEY } from './StorageService';
import type { Migration } from './types';

function docWith(schemaVersion: number): string {
  return JSON.stringify({ schemaVersion, savedAt: '2026-11-22T10:00:00.000Z', payload: sampleData() });
}

describe('Property 13: unreadable data is left unchanged', () => {
  it('newer versions are unreadable and the stored bytes do not change', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 1000 }), async (ahead) => {
        const backend = createMemoryBackend();
        const raw = docWith(CURRENT_SCHEMA_VERSION + ahead);
        await backend.set(DATA_KEY, raw);
        const service = createStorageService({ backend });

        expect(await service.load()).toEqual({ status: 'unreadable', reason: 'newer_version' });
        expect(await backend.get(DATA_KEY)).toBe(raw);

        const store = createProfileStore({ storage: service, debounceMs: 0 });
        await store.init();
        expect(store.getState().profile).toBeNull();
        expect(store.getState().storageStatus).toBe('unreadable');
        // A change does not overwrite the unreadable data until the student starts fresh.
        store.appendChat({ id: 'm1', from: 'student', text: 'hi', lang: 'en', at: '2026-11-22T10:00:00.000Z' });
        await store.flush();
        expect(await backend.get(DATA_KEY)).toBe(raw);
      }),
      fcConfig,
    );
  });

  it('a throwing migration is unreadable and nothing is written', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (message) => {
        const backend = createMemoryBackend();
        const raw = docWith(0);
        await backend.set(DATA_KEY, raw);
        const chain: Migration[] = [
          {
            from: 0,
            run: () => {
              throw new Error(message);
            },
          },
        ];
        const service = createStorageService({ backend, migrations: chain });
        expect(await service.load()).toEqual({ status: 'unreadable', reason: 'migration_failed' });
        expect(await backend.get(DATA_KEY)).toBe(raw);
      }),
      fcConfig,
    );
  });

  it('a missing migration step is unreadable', async () => {
    const backend = createMemoryBackend();
    await backend.set(DATA_KEY, docWith(0));
    const service = createStorageService({ backend, migrations: [] });
    expect(await service.load()).toEqual({ status: 'unreadable', reason: 'migration_failed' });
  });

  it('corrupt text is unreadable and left unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        async (junk) => {
          const backend = createMemoryBackend();
          await backend.set(DATA_KEY, junk);
          const service = createStorageService({ backend });
          expect(await service.load()).toEqual({ status: 'unreadable', reason: 'corrupt' });
          expect(await backend.get(DATA_KEY)).toBe(junk);
        },
      ),
      fcConfig,
    );
  });

  it('valid JSON with the wrong shape is unreadable', async () => {
    const backend = createMemoryBackend();
    await backend.set(DATA_KEY, JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, payload: { nope: true } }));
    const outcome = await createStorageService({ backend }).load();
    expect(outcome).toEqual({ status: 'unreadable', reason: 'corrupt' });
  });

  it('startFresh lets the next change replace the unreadable data', async () => {
    const backend = createMemoryBackend();
    await backend.set(DATA_KEY, docWith(CURRENT_SCHEMA_VERSION + 1));
    const store = createProfileStore({ storage: createStorageService({ backend }), debounceMs: 0 });
    await store.init();
    store.startFresh();
    expect(store.getState().storageStatus).toBe('ok');
    store.setGrade('matematik', 'A');
    await store.flush();
    const stored = JSON.parse((await backend.get(DATA_KEY)) ?? '{}') as { schemaVersion: number };
    expect(stored.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });
});
