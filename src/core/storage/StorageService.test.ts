import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { sampleData } from '../../test/fixtures';
import { FakeLocalStorage } from '../../test/helpers';
import { createLocalBackend, LOCAL_PREFIX } from './localStore';
import { CURRENT_SCHEMA_VERSION } from './migrations';
import { createStorageService, DATA_KEY, secretKey } from './StorageService';

/** An IDBFactory whose open() always fails, like private browsing in some browsers. */
function brokenIdb(): IDBFactory {
  return {
    open() {
      throw new Error('IndexedDB is blocked');
    },
  } as unknown as IDBFactory;
}

describe('StorageService backends', () => {
  it('uses IndexedDB when it opens', async () => {
    const service = createStorageService({ idb: new IDBFactory(), local: new FakeLocalStorage() });
    expect(await service.backendKind()).toBe('indexeddb');
    expect(await service.load()).toEqual({ status: 'empty' });
  });

  it('falls back to localStorage with the rakan: prefix when IndexedDB fails to open', async () => {
    const local = new FakeLocalStorage();
    const service = createStorageService({ idb: brokenIdb(), local });
    expect(await service.backendKind()).toBe('localstorage');
    await service.save(sampleData());
    expect(local.getItem(`${LOCAL_PREFIX}${DATA_KEY}`)).not.toBeNull();
    const outcome = await service.load();
    expect(outcome.status).toBe('ok');
  });

  it('falls back to memory when both IndexedDB and localStorage fail', async () => {
    const throwing = new FakeLocalStorage();
    throwing.setItem = () => {
      throw new Error('quota');
    };
    const service = createStorageService({ idb: brokenIdb(), local: throwing });
    expect(await service.backendKind()).toBe('memory');
    const data = sampleData({ grades: { matematik: 'A' } });
    await service.save(data);
    expect(await service.load()).toEqual({ status: 'ok', data, migrated: false });
  });

  it('falls back to memory when neither API exists', async () => {
    const service = createStorageService({ idb: undefined, local: undefined });
    expect(await service.backendKind()).toBe('memory');
  });
});

describe('StorageService data', () => {
  it('stores the schema version as a positive integer with the data', async () => {
    const local = new FakeLocalStorage();
    const service = createStorageService({ idb: undefined, local });
    await service.save(sampleData());
    const doc = JSON.parse(local.getItem(`${LOCAL_PREFIX}${DATA_KEY}`) ?? '{}') as { schemaVersion: number };
    expect(doc.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(Number.isInteger(doc.schemaVersion) && doc.schemaVersion > 0).toBe(true);
  });

  it('keeps the API key under a separate key, outside the data document', async () => {
    const local = new FakeLocalStorage();
    const service = createStorageService({ idb: undefined, local });
    await service.saveSecret('userKeyApiKey', 'demo-key-12345');
    await service.save(sampleData());
    expect(local.getItem(`${LOCAL_PREFIX}${secretKey('userKeyApiKey')}`)).toBe('demo-key-12345');
    expect(local.getItem(`${LOCAL_PREFIX}${DATA_KEY}`)).not.toContain('demo-key-12345');
    expect(await service.loadSecret('userKeyApiKey')).toBe('demo-key-12345');
  });

  it('clearAll removes data, secret and prefs from IndexedDB', async () => {
    const service = createStorageService({ idb: new IDBFactory() });
    await service.save(sampleData());
    await service.saveSecret('userKeyApiKey', 'demo-key-12345');
    await service.savePref('lang', 'en');
    await service.clearAll();
    expect(await service.load()).toEqual({ status: 'empty' });
    expect(await service.loadSecret('userKeyApiKey')).toBeNull();
    expect(await service.loadPref('lang')).toBeNull();
  });

  it('clearAll on localStorage only removes keys with the prefix', async () => {
    const local = new FakeLocalStorage();
    local.setItem('other-site-key', 'keep me');
    const service = createStorageService({ idb: undefined, local });
    await service.save(sampleData());
    await service.clearAll();
    expect(local.getItem('other-site-key')).toBe('keep me');
    expect(local.length).toBe(1);
    expect(await service.load()).toEqual({ status: 'empty' });
  });

  it('a read error reports backend_error and writes nothing', async () => {
    const backend = createLocalBackend(new FakeLocalStorage());
    const failing = { ...backend, get: () => Promise.reject(new Error('read failed')) };
    const service = createStorageService({ backend: failing });
    expect(await service.load()).toEqual({ status: 'unreadable', reason: 'backend_error' });
  });

  it('load never writes, even when it migrated', async () => {
    const local = new FakeLocalStorage();
    const raw = JSON.stringify({ schemaVersion: 0, savedAt: 'x', payload: sampleData() });
    local.setItem(`${LOCAL_PREFIX}${DATA_KEY}`, raw);
    const service = createStorageService({
      idb: undefined,
      local,
      currentVersion: 1,
      migrations: [{ from: 0, run: (d) => d }],
    });
    const outcome = await service.load();
    expect(outcome.status === 'ok' && outcome.migrated).toBe(true);
    expect(local.getItem(`${LOCAL_PREFIX}${DATA_KEY}`)).toBe(raw);
  });
});
