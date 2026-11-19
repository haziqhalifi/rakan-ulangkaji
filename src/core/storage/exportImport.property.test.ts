import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfileStore } from '../profile/ProfileStore';
import { arbPersistedData } from '../../test/arbitraries/persisted';
import { fcConfig } from '../../test/fcConfig';
import { fakeDurableBackend } from '../../test/helpers';
import { parseImport } from './exportImport';
import { createStorageService } from './StorageService';

async function storeWith(data: Parameters<ReturnType<typeof createStorageService>['save']>[0]) {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(data);
  const store = createProfileStore({ storage });
  await store.init();
  return { store, storage };
}

describe('Property 10: export and import round trip', () => {
  it('importing an export (through a JSON file) reproduces profile, progress, grades and chat', async () => {
    await fc.assert(
      fc.asyncProperty(arbPersistedData, arbPersistedData, async (original, other) => {
        const { store: source } = await storeWith(original);
        const file = JSON.stringify(source.exportData());

        const { store: target } = await storeWith(other);
        const result = target.importData(JSON.parse(file));
        expect(result.ok).toBe(true);
        const got = target.getState();
        expect(got.profile).toEqual(original.profile);
        expect(got.progress).toEqual(source.getState().progress);
        expect(got.grades).toEqual(original.grades);
        expect(got.chat).toEqual(source.getState().chat);
      }),
      fcConfig,
    );
  });

  it('keeps the receiving device settings and drops any unfinished exam', async () => {
    await fc.assert(
      fc.asyncProperty(arbPersistedData, arbPersistedData, async (original, other) => {
        const { store: source } = await storeWith(original);
        const { store: target } = await storeWith(other);
        target.importData(JSON.parse(JSON.stringify(source.exportData())));
        expect(target.getState().settings).toEqual(other.settings);
        expect(target.getState().examInProgress).toBeNull();
      }),
      fcConfig,
    );
  });
});

describe('import guards', () => {
  const good = () => ({
    app: 'rakan-ulangkaji',
    schemaVersion: 1,
    exportedAt: '2026-11-23T10:00:00.000Z',
    payload: { profile: null, progress: { quizAttempts: [], examResults: [] }, grades: {}, chat: [] },
  });

  it('accepts a minimal valid file', () => {
    expect(parseImport(good()).ok).toBe(true);
  });

  it.each([null, 'text', 42, [], {}, { app: 'other' }, { ...good(), payload: 3 }, { ...good(), schemaVersion: 'one' }])(
    'rejects a bad shape: %j',
    (bundle) => {
      const r = parseImport(bundle);
      expect(r).toEqual({ ok: false, error: 'bad_shape' });
    },
  );

  it('rejects a file from a newer version', () => {
    expect(parseImport({ ...good(), schemaVersion: 2 })).toEqual({ ok: false, error: 'newer_version' });
  });

  it('rejects invalid grades and invalid profiles', () => {
    const badGrade = { ...good(), payload: { ...good().payload, grades: { matematik: 'Z' } } };
    expect(parseImport(badGrade)).toEqual({ ok: false, error: 'invalid_data' });
    const badProfile = {
      ...good(),
      payload: {
        ...good().payload,
        profile: { name: '', form: 5, subjects: ['matematik'], language: 'bm', createdAt: 'x' },
      },
    };
    expect(parseImport(badProfile)).toEqual({ ok: false, error: 'invalid_data' });
  });

  it('runs migrations for an older file and reports a failing one', () => {
    const old = { ...good(), schemaVersion: 0 };
    const ok = parseImport(old, [{ from: 0, run: (d) => d }], 1);
    expect(ok.ok).toBe(true);
    const broken = parseImport(old, [{ from: 0, run: () => { throw new Error('x'); } }], 1);
    expect(broken).toEqual({ ok: false, error: 'migration_failed' });
  });

  it('leaves the store unchanged when an import is rejected', async () => {
    const { store } = await storeWith({
      profile: { name: 'Aina', form: 5, subjects: ['matematik'], language: 'bm', createdAt: '2026-11-22T10:00:00.000Z' },
      progress: { quizAttempts: [], examResults: [] },
      grades: { matematik: 'B' },
      chat: [],
      examInProgress: null,
      settings: { demoShortTimer: false, remote: { userKey: { enabled: false, provider: 'gemini' }, proxy: { enabled: false } }, share: { name: false, school: false, grades: false } },
    });
    const before = store.getState();
    expect(store.importData({ app: 'rakan-ulangkaji' }).ok).toBe(false);
    expect(store.getState()).toBe(before);
  });
});
