import { IDBFactory } from 'fake-indexeddb';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { arbPersistedData } from '../../test/arbitraries/persisted';
import { fcConfig } from '../../test/fcConfig';
import { createStorageService } from './StorageService';

describe('Property 10: persistence round trip', () => {
  it('save then load through IndexedDB returns equal data', async () => {
    await fc.assert(
      fc.asyncProperty(arbPersistedData, async (data) => {
        const service = createStorageService({ idb: new IDBFactory() });
        await service.save(data);
        const outcome = await service.load();
        expect(outcome.status).toBe('ok');
        if (outcome.status === 'ok') {
          expect(outcome.data).toEqual(data);
          expect(outcome.migrated).toBe(false);
        }
      }),
      fcConfig,
    );
  });

  it('survives a new service over the same database (a page reload)', async () => {
    await fc.assert(
      fc.asyncProperty(arbPersistedData, async (data) => {
        const idb = new IDBFactory();
        await createStorageService({ idb }).save(data);
        const outcome = await createStorageService({ idb }).load();
        expect(outcome).toEqual({ status: 'ok', data, migrated: false });
      }),
      fcConfig,
    );
  });
});
