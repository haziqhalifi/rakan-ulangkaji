import { describe, expect, it } from 'vitest';
import { fakeDurableBackend } from '../../test/helpers';
import { sampleData } from '../../test/fixtures';
import { createStorageService } from '../storage/StorageService';
import type { StorageService } from '../storage/types';
import { createProfileStore } from './ProfileStore';

const valid = { name: '  Daniel ', form: 4, subjects: ['matematik'], language: 'en' };

async function make(wrap?: (s: StorageService) => StorageService) {
  const base = createStorageService({ backend: fakeDurableBackend() });
  const storage = wrap ? wrap(base) : base;
  const store = createProfileStore({ storage, defaultLanguage: 'bm' });
  await store.init();
  return { store, storage: base };
}

describe('createProfile', () => {
  it('saves a trimmed profile, writes it, and switches to its language', async () => {
    const { store, storage } = await make();
    const r = await store.createProfile(valid);
    expect(r.ok).toBe(true);
    expect(store.getState().profile?.name).toBe('Daniel');
    expect(store.getState().language).toBe('en');
    const loaded = await storage.load();
    expect(loaded.status === 'ok' && loaded.data.profile?.name).toBe('Daniel');
  });

  it('keeps no profile and reports a storage error when the write fails', async () => {
    const { store } = await make((s) => ({ ...s, save: async () => { throw new Error('full'); } }));
    const r = await store.createProfile(valid);
    expect(r).toEqual({ ok: false, error: { kind: 'storage' } });
    expect(store.getState().profile).toBeNull();
  });

  it('names invalid fields and writes nothing', async () => {
    const { store, storage } = await make();
    const r = await store.createProfile({ ...valid, name: '   ', subjects: [] });
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'invalid') {
      expect(r.error.errors.map((e) => e.field).sort()).toEqual(['name', 'subjects']);
    }
    expect((await storage.load()).status).toBe('empty');
  });
});

describe('saveProfile (edit)', () => {
  it('notifies listeners synchronously and keeps createdAt', async () => {
    const { store } = await make();
    await store.createProfile(valid);
    const created = store.getState().profile?.createdAt;
    let calls = 0;
    store.subscribe(() => (calls += 1));
    const r = store.saveProfile({ ...valid, name: 'Ravi', form: 5 });
    expect(r.ok).toBe(true);
    expect(calls).toBeGreaterThan(0);
    expect(store.getState().profile).toMatchObject({ name: 'Ravi', form: 5, createdAt: created });
  });
});

describe('deleteAll', () => {
  it('resets to an empty state and clears storage', async () => {
    const { store, storage } = await make();
    await storage.save(sampleData());
    await store.init();
    expect(store.getState().profile).not.toBeNull();
    await store.deleteAll();
    expect(store.getState().profile).toBeNull();
    expect(store.getState().grades).toEqual({});
    expect((await storage.load()).status).toBe('empty');
  });

  it('keeps everything when storage refuses, so the student can try again', async () => {
    const { store } = await make((s) => ({ ...s, clearAll: async () => { throw new Error('locked'); } }));
    await store.createProfile(valid);
    await expect(store.deleteAll()).rejects.toThrow();
    expect(store.getState().profile?.name).toBe('Daniel');
  });
});
