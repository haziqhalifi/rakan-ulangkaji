import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryBackend } from '../storage/memory';
import { createStorageService, DATA_KEY } from '../storage/StorageService';
import type { StorageService } from '../storage/types';
import { sampleData, sampleProfile } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';
import { createProfileStore } from './ProfileStore';
import type { ChatMessage, Exam_Result } from './types';

const msg = (n: number): ChatMessage => ({
  id: `m${n}`,
  from: 'student',
  text: `hello ${n}`,
  lang: 'en',
  at: '2026-11-22T10:00:00.000Z',
});

const result = (grade: Exam_Result['grade'], ratio = 0.3): Exam_Result => ({
  id: `r-${grade}`,
  paperId: 'paper-1',
  submittedAt: '2026-11-23T10:00:00.000Z',
  trigger: 'manual',
  totalEarned: 10,
  totalAvailable: 40,
  percent: 25,
  grade,
  questions: [],
  topics: [{ topic: 'indices', earned: 1, available: 5, ratio }],
});

async function makeStore(initial = sampleData()) {
  const backend = fakeDurableBackend();
  const storage = createStorageService({ backend });
  await storage.save(initial);
  const store = createProfileStore({ storage, debounceMs: 250 });
  await store.init();
  return { store, storage, backend };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ProfileStore', () => {
  it('loads saved data and marks itself ready', async () => {
    const { store } = await makeStore();
    expect(store.getState().ready).toBe(true);
    expect(store.getState().profile?.name).toBe('Aina');
    expect(store.getState().language).toBe('bm');
  });

  it('starts empty when nothing is saved', async () => {
    const store = createProfileStore({ storage: createStorageService({ backend: fakeDurableBackend() }) });
    await store.init();
    expect(store.getState().profile).toBeNull();
    expect(store.getState().storageStatus).toBe('ok');
  });

  it('notifies subscribers synchronously and stops after unsubscribe', async () => {
    const { store } = await makeStore();
    const seen: number[] = [];
    const off = store.subscribe(() => seen.push(store.getState().chat.length));
    store.appendChat(msg(1));
    expect(seen).toEqual([1]);
    off();
    store.appendChat(msg(2));
    expect(seen).toEqual([1]);
  });

  it('caps chat at 200, quiz attempts at 500 and exam results at 20, keeping the latest', async () => {
    const { store } = await makeStore();
    for (let i = 0; i < 205; i += 1) store.appendChat(msg(i));
    expect(store.getState().chat).toHaveLength(200);
    expect(store.getState().chat[0]?.id).toBe('m5');
    expect(store.getState().chat.at(-1)?.id).toBe('m204');

    for (let i = 0; i < 503; i += 1) {
      store.recordQuizAttempt({ questionId: `q${i}`, topic: 'indices', ratio: 1, at: '2026-11-22T10:00:00.000Z' });
    }
    expect(store.getState().progress.quizAttempts).toHaveLength(500);
    expect(store.getState().progress.quizAttempts[0]?.questionId).toBe('q3');

    for (let i = 0; i < 22; i += 1) store.addExamResult({ ...result('B'), id: `e${i}` });
    expect(store.getState().progress.examResults).toHaveLength(20);
    expect(store.getState().progress.examResults[0]?.id).toBe('e2');
  });

  it('debounces writes by about 250 ms and writes once', async () => {
    const { store, storage } = await makeStore();
    const spy = vi.spyOn(storage, 'save');
    store.appendChat(msg(1));
    store.appendChat(msg(2));
    await vi.advanceTimersByTimeAsync(249);
    expect(spy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0].chat).toHaveLength(2);
  });

  it('writes exam saves immediately', async () => {
    const { store, storage } = await makeStore();
    const spy = vi.spyOn(storage, 'save');
    store.saveExamInProgress({
      paperId: 'paper-1',
      startedAtMs: 1_800_000_000_000,
      durationMs: 60_000,
      answers: { q1: 'A' },
      currentIndex: 0,
      warned: false,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(store.getState().examInProgress?.answers).toEqual({ q1: 'A' });
  });

  it('exam results update topic mastery and weak topics at once', async () => {
    const { store } = await makeStore();
    store.addExamResult(result('E', 0.2));
    expect(store.getState().weakTopics).toEqual([{ topic: 'indices', ratio: 0.2 }]);
    expect(store.getState().topicMastery[0]?.attempts).toBe(1);
  });

  it('sets storageStatus on write failure and retries on the next mutation', async () => {
    const { store, storage } = await makeStore();
    const spy = vi.spyOn(storage, 'save').mockRejectedValueOnce(new Error('quota'));
    store.appendChat(msg(1));
    await store.flush();
    expect(store.getState().storageStatus).toBe('write_failed');
    expect(store.getState().chat).toHaveLength(1);

    store.appendChat(msg(2));
    await store.flush();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy.mock.calls[1]?.[0].chat).toHaveLength(2);
    expect(store.getState().storageStatus).toBe('ok');
  });

  it('reports memory_only when the backend is memory', async () => {
    const store = createProfileStore({ storage: createStorageService({ backend: createMemoryBackend() }) });
    await store.init();
    expect(store.getState().storageStatus).toBe('memory_only');
  });

  it('imports only the Matematik grade from the latest exam', async () => {
    const { store } = await makeStore(sampleData({ grades: { bm: 'A', matematik: 'D', sains: 'C' } }));
    expect(store.importMathGradeFromLatestExam()).toEqual({ status: 'no_result' });
    expect(store.getState().grades.matematik).toBe('D');
    store.addExamResult(result('B+'));
    expect(store.importMathGradeFromLatestExam()).toEqual({ status: 'ok', grade: 'B+' });
    expect(store.getState().grades).toEqual({ bm: 'A', matematik: 'B+', sains: 'C' });
  });

  it('setGrade changes one subject', async () => {
    const { store } = await makeStore(sampleData({ grades: { bm: 'A' } }));
    store.setGrade('sains', 'C+');
    expect(store.getState().grades).toEqual({ bm: 'A', sains: 'C+' });
  });

  it('records and revokes remote consent, and merges settings patches', async () => {
    const { store } = await makeStore();
    store.setSettings({ demoShortTimer: true, remote: { proxy: { enabled: true } } });
    store.recordRemoteConsent('proxy');
    expect(store.getState().settings.remote.proxy.consentAt).toBeTypeOf('string');
    expect(store.getState().settings.demoShortTimer).toBe(true);
    expect(store.getState().settings.share).toEqual({ name: false, school: false, grades: false });
    store.revokeRemoteConsent('proxy');
    expect(store.getState().settings.remote.proxy).toEqual({ enabled: false });
  });

  it('setLanguage updates the profile and persists a pre-profile preference', async () => {
    const { store, storage } = await makeStore();
    store.setLanguage('en');
    expect(store.getState().profile?.language).toBe('en');
    expect(await storage.loadPref('lang')).toBe('en');

    const empty = createProfileStore({ storage: createStorageService({ backend: fakeDurableBackend() }) });
    await empty.init();
    empty.setLanguage('en');
    expect(empty.getState().language).toBe('en');
    expect(empty.getState().profile).toBeNull();
  });

  it('restores the saved language preference when there is no profile', async () => {
    const storage: StorageService = createStorageService({ backend: fakeDurableBackend() });
    await storage.savePref('lang', 'en');
    const store = createProfileStore({ storage, defaultLanguage: 'bm' });
    await store.init();
    expect(store.getState().language).toBe('en');
  });

  it('caps oversized stored history on restore', async () => {
    const chat = Array.from({ length: 230 }, (_, i) => msg(i));
    const { store } = await makeStore(sampleData({ chat }));
    expect(store.getState().chat).toHaveLength(200);
    expect(store.getState().chat[0]?.id).toBe('m30');
  });

  it('persists what it holds', async () => {
    const { store, backend } = await makeStore(sampleData({ profile: sampleProfile({ name: 'Mei Ling' }) }));
    store.setGrade('matematik', 'A-');
    await store.flush();
    expect(await backend.get(DATA_KEY)).toContain('"A-"');
  });
});
