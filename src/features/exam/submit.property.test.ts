import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createProfileStore } from '../../core/profile';
import { computeWeakTopics, deriveTopicMastery } from '../../core/profile/weakTopics';
import { createStorageService } from '../../core/storage/StorageService';
import { arbExamAnswers, paper } from '../../test/arbitraries/exam';
import { fcCheapConfig } from '../../test/fcConfig';
import { sampleData } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';
import { markPaper } from './marker';
import { newRunnerState } from './runnerLogic';
import { finalizeExam } from './submit';
import { examDurationMs } from './timer';

const NOW = () => new Date('2026-11-25T10:00:00.000Z');

async function freshStore() {
  const storage = createStorageService({ backend: fakeDurableBackend() });
  await storage.save(sampleData());
  const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
  await store.init();
  return { store, storage };
}

describe('Property 30: exam result updates shared progress', () => {
  it('stores the result, updates topic mastery and weak topics, and clears the saved attempt', async () => {
    await fc.assert(
      fc.asyncProperty(arbExamAnswers, async (answers) => {
        const { store, storage } = await freshStore();
        store.saveExamInProgress({ ...newRunnerState(paper.id, 1, 1000), answers });
        const res = finalizeExam(paper, answers, 'manual', store, NOW);
        expect(res.ok).toBe(true);
        if (!res.ok) return;
        const s = store.getState();
        expect(s.progress.examResults.at(-1)).toEqual(res.value);
        expect(s.examInProgress).toBeNull();
        for (const topic of res.value.topics) {
          const m = s.topicMastery.find((x) => x.topic === topic.topic);
          expect(m?.latestRatio).toBe(topic.ratio);
          expect(m?.attempts).toBe(1);
        }
        expect(s.weakTopics).toEqual(computeWeakTopics(deriveTopicMastery(s.progress)));
        await store.flush();
        const loaded = await storage.load();
        expect(loaded.status === 'ok' && loaded.data.progress.examResults.length).toBe(1);
      }),
      { numRuns: 25 },
    );
  });

  it('records nothing and keeps the saved attempt when marking throws', async () => {
    const { store } = await freshStore();
    const saved = { ...newRunnerState(paper.id, 1, 1000), answers: { a: 'B' } };
    store.saveExamInProgress(saved);
    const broken = { ...paper, questions: [null as never] };
    const res = finalizeExam(broken, saved.answers, 'manual', store, NOW);
    expect(res.ok).toBe(false);
    expect(store.getState().progress.examResults).toHaveLength(0);
    expect(store.getState().examInProgress?.answers).toEqual({ a: 'B' });
  });
});

describe('Property 40: demo timer does not change marking', () => {
  it('gives equal scores, topics and grade for the demo and the normal duration', () => {
    fc.assert(
      fc.property(arbExamAnswers, (answers) => {
        const normal = newRunnerState(paper.id, 0, examDurationMs(paper.durationMinutes, false));
        const demo = newRunnerState(paper.id, 0, examDurationMs(paper.durationMinutes, true));
        expect(demo.durationMs).toBeLessThan(normal.durationMs);
        const meta = { submittedAt: '2026-11-25T10:00:00.000Z', id: 'r' };
        const a = markPaper(paper, { ...normal.answers, ...answers }, meta);
        const b = markPaper(paper, { ...demo.answers, ...answers }, meta);
        expect(b.questions).toEqual(a.questions);
        expect(b.topics).toEqual(a.topics);
        expect(b.grade).toBe(a.grade);
      }),
      fcCheapConfig,
    );
  });
});
