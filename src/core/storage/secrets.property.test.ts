import { IDBFactory } from 'fake-indexeddb';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfileStore } from '../profile/ProfileStore';
import { arbPersistedData } from '../../test/arbitraries/persisted';
import { fcConfig } from '../../test/fcConfig';
import { FakeLocalStorage } from '../../test/helpers';
import { createStorageService } from './StorageService';

// Keys look like real ones: a fixed prefix plus a random id, 8 or more characters.
const arbKey = fc.uuid().map((id) => `sk-${id}`);

describe('Property 11: export never contains API keys', () => {
  it('keeps the key out of the export, and deleteAll leaves no stored key', async () => {
    await fc.assert(
      fc.asyncProperty(arbPersistedData, arbKey, async (data, key) => {
        const storage = createStorageService({ idb: new IDBFactory(), local: new FakeLocalStorage() });
        await storage.save(data);
        await storage.saveSecret('userKeyApiKey', key);
        const store = createProfileStore({ storage });
        await store.init();

        expect(JSON.stringify(store.exportData())).not.toContain(key);
        expect(await storage.loadSecret('userKeyApiKey')).toBe(key);

        await store.deleteAll();
        expect(await storage.loadSecret('userKeyApiKey')).toBeNull();
        expect((await storage.load()).status).toBe('empty');
        expect(store.getState().profile).toBeNull();
      }),
      fcConfig,
    );
  });

  it('also sweeps localStorage data left from an earlier fallback', async () => {
    const local = new FakeLocalStorage();
    local.setItem('rakan:data', '{}');
    local.setItem('rakan:secret:userKeyApiKey', 'sk-old-value');
    local.setItem('other-site', 'keep');
    const storage = createStorageService({ idb: new IDBFactory(), local });
    await storage.clearAll();
    expect(local.getItem('rakan:data')).toBeNull();
    expect(local.getItem('rakan:secret:userKeyApiKey')).toBeNull();
    expect(local.getItem('other-site')).toBe('keep');
  });
});
