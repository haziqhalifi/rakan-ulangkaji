import type { Exam_Result, Progress_Record, QuizAttempt, TopicId } from './types';

export interface TopicMastery {
  topic: TopicId;
  /** 0..1 from the most recent quiz answer or exam topic score. */
  latestRatio: number;
  /** Number of events: quiz answers plus exam topic scores. */
  attempts: number;
  lastAt: string;
}

export interface WeakTopic {
  topic: TopicId;
  ratio: number;
}

/** Weak when the latest ratio is under 0.5, or under 0.6 with fewer than 2 attempts. */
export function isWeak(m: Pick<TopicMastery, 'latestRatio' | 'attempts'>): boolean {
  return m.latestRatio < 0.5 || (m.attempts < 2 && m.latestRatio < 0.6);
}

/** Weak topics sorted by ratio ascending, then topic name ascending. */
export function computeWeakTopics(all: readonly TopicMastery[]): WeakTopic[] {
  return all
    .filter(isWeak)
    .map((m) => ({ topic: m.topic, ratio: m.latestRatio }))
    .sort((a, b) => a.ratio - b.ratio || (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
}

interface TopicEvent {
  topic: TopicId;
  ratio: number;
  at: string;
}

function quizEvents(attempts: readonly QuizAttempt[]): TopicEvent[] {
  return attempts.map((a) => ({ topic: a.topic, ratio: a.ratio, at: a.at }));
}

function examEvents(results: readonly Exam_Result[]): TopicEvent[] {
  return results.flatMap((r) => r.topics.map((s) => ({ topic: s.topic, ratio: s.ratio, at: r.submittedAt })));
}

/**
 * Derive topic mastery from the progress record. Not persisted.
 * The latest event wins by timestamp. Equal timestamps go to the event listed later.
 */
export function deriveTopicMastery(progress: Pick<Progress_Record, 'quizAttempts' | 'examResults'>): TopicMastery[] {
  const events = [...quizEvents(progress.quizAttempts), ...examEvents(progress.examResults)];
  const byTopic = new Map<TopicId, TopicMastery>();
  for (const e of events) {
    const prev = byTopic.get(e.topic);
    if (!prev) {
      byTopic.set(e.topic, { topic: e.topic, latestRatio: e.ratio, attempts: 1, lastAt: e.at });
    } else if (e.at >= prev.lastAt) {
      byTopic.set(e.topic, { topic: e.topic, latestRatio: e.ratio, attempts: prev.attempts + 1, lastAt: e.at });
    } else {
      byTopic.set(e.topic, { ...prev, attempts: prev.attempts + 1 });
    }
  }
  return [...byTopic.values()].sort((a, b) => (a.topic < b.topic ? -1 : a.topic > b.topic ? 1 : 0));
}
