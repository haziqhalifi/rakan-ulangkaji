// Small question bank shared by Rakan quiz and Exam Mode.
// It holds the same original questions as the Paper, in a fixed order.
// Rakan quiz imports this module only, so the exam chunk stays unloaded.

import type { Bilingual, TopicId } from '../core/profile/types';
import { MATEMATIK_QUESTIONS } from './matematikQuestions';
import type { Question, QuestionId } from './types';

export const TOPIC_LABELS: Readonly<Record<TopicId, Bilingual>> = {
  'f4-indices': { bm: 'Indeks (Tingkatan 4)', en: 'Indices (Form 4)' },
  'f4-sets': { bm: 'Set (Tingkatan 4)', en: 'Sets (Form 4)' },
  'f5-variation': { bm: 'Variasi (Tingkatan 5)', en: 'Variation (Form 5)' },
  'f5-matrices': { bm: 'Matriks (Tingkatan 5)', en: 'Matrices (Form 5)' },
};

export function allQuestions(): readonly Question[] {
  return MATEMATIK_QUESTIONS;
}

/** Topics in first-appearance order. */
export function listTopics(): TopicId[] {
  const seen: TopicId[] = [];
  for (const q of MATEMATIK_QUESTIONS) if (!seen.includes(q.topic)) seen.push(q.topic);
  return seen;
}

/** Questions for a topic in the fixed bank order. */
export function questionsForTopic(topic: TopicId): Question[] {
  return MATEMATIK_QUESTIONS.filter((q) => q.topic === topic);
}

export function getQuestion(id: QuestionId): Question | undefined {
  return MATEMATIK_QUESTIONS.find((q) => q.id === id);
}

export function topicLabel(topic: TopicId): Bilingual {
  return TOPIC_LABELS[topic] ?? { bm: topic, en: topic };
}
