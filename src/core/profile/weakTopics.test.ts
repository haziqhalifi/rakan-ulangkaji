import { describe, expect, it } from 'vitest';
import { computeWeakTopics, deriveTopicMastery, isWeak } from './weakTopics';
import type { Exam_Result } from './types';

describe('isWeak boundaries', () => {
  it('0.5 is not weak by the first clause', () => {
    expect(isWeak({ latestRatio: 0.5, attempts: 2 })).toBe(false);
    expect(isWeak({ latestRatio: 0.49, attempts: 5 })).toBe(true);
  });

  it('0.6 is not weak by the second clause', () => {
    expect(isWeak({ latestRatio: 0.6, attempts: 1 })).toBe(false);
    expect(isWeak({ latestRatio: 0.59, attempts: 1 })).toBe(true);
    expect(isWeak({ latestRatio: 0.59, attempts: 2 })).toBe(false);
  });
});

describe('computeWeakTopics', () => {
  it('sorts by ratio, then topic name', () => {
    const weak = computeWeakTopics([
      { topic: 'b', latestRatio: 0.3, attempts: 3, lastAt: 'x' },
      { topic: 'a', latestRatio: 0.3, attempts: 3, lastAt: 'x' },
      { topic: 'c', latestRatio: 0.1, attempts: 3, lastAt: 'x' },
      { topic: 'd', latestRatio: 0.9, attempts: 3, lastAt: 'x' },
    ]);
    expect(weak.map((w) => w.topic)).toEqual(['c', 'a', 'b']);
  });
});

describe('deriveTopicMastery', () => {
  const exam = (at: string, ratio: number): Exam_Result => ({
    id: at,
    paperId: 'p',
    submittedAt: at,
    trigger: 'manual',
    totalEarned: 0,
    totalAvailable: 0,
    percent: 0,
    grade: 'G',
    questions: [],
    topics: [{ topic: 'indices', earned: 0, available: 5, ratio }],
  });

  it('uses the latest event and counts quiz answers and exam topic scores', () => {
    const m = deriveTopicMastery({
      quizAttempts: [
        { questionId: 'q1', topic: 'indices', ratio: 0, at: '2026-11-22T10:00:00.000Z' },
        { questionId: 'q2', topic: 'indices', ratio: 1, at: '2026-11-22T11:00:00.000Z' },
      ],
      examResults: [exam('2026-11-22T12:00:00.000Z', 0.4)],
    });
    expect(m).toEqual([{ topic: 'indices', latestRatio: 0.4, attempts: 3, lastAt: '2026-11-22T12:00:00.000Z' }]);
  });

  it('an older event does not replace a newer one', () => {
    const m = deriveTopicMastery({
      quizAttempts: [{ questionId: 'q1', topic: 'indices', ratio: 0, at: '2026-11-20T10:00:00.000Z' }],
      examResults: [exam('2026-11-22T12:00:00.000Z', 0.8)],
    });
    expect(m[0]?.latestRatio).toBe(0.8);
    expect(m[0]?.attempts).toBe(2);
  });
});
