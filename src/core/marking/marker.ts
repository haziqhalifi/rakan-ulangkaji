// Deterministic marker. Pure and synchronous. It must never import core/ai.
// Shared by Exam Mode and the Rakan quiz, so it lives in core. features/exam/marker.ts re-exports it.

import { GRADE_BANDS } from '../../content/gradeBands';
import type { GradeBand, Paper, Question, QuestionId, SkemaPoint } from '../../content/types';
import type {
  Exam_Result,
  Grade,
  PointResult,
  QuestionResult,
  TopicScore,
} from '../profile/types';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function base(input: string): string {
  return input.normalize('NFKC').toLowerCase();
}

/**
 * Lower case, strip listed units as whole words, collapse whitespace, trim.
 * Commas are left as they are (documented limitation). Variants in the data
 * cover decimal and fraction forms explicitly.
 */
export function normalise(input: string, unitsToStrip: readonly string[] = []): string {
  let s = base(input);
  const units = unitsToStrip
    .map((u) => base(u).trim())
    .filter((u) => u !== '')
    .sort((a, b) => b.length - a.length);
  for (const unit of units) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(unit)}(?![\\p{L}])`, 'gu');
    s = s.replace(re, ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function isBlank(answer: string | undefined): boolean {
  return answer === undefined || answer.trim() === '';
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function matches(point: SkemaPoint, candidate: string): boolean {
  const units = point.stripUnits ?? [];
  const norm = normalise(candidate, units);
  if (norm === '') return false;
  return point.accepted.some((variant) => normalise(variant, units) === norm);
}

function segmentsOf(answer: string): string[] {
  return answer
    .split(/[\n;]/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

/** Mark one question. Each point is awarded at most once and each segment satisfies at most one point. */
export function markQuestion(q: Question, answer: string | undefined): QuestionResult {
  const available = q.marks;
  if (isBlank(answer)) {
    return {
      questionId: q.id,
      topic: q.topic,
      marks: 0,
      marksAvailable: available,
      unanswered: true,
      points: q.skema.map((p) => ({
        pointId: p.id,
        marksAwarded: 0,
        marksAvailable: p.marks,
        earned: false,
      })),
    };
  }

  const text = answer as string;
  const segments = segmentsOf(text);
  // A whole-answer candidate is only useful when there are several segments.
  const candidates = segments.length > 1 ? [...segments, text] : segments;
  const used = new Set<number>();

  const points: PointResult[] = q.skema.map((p) => {
    let earned = false;
    for (let i = 0; i < candidates.length; i++) {
      if (used.has(i)) continue;
      if (matches(p, candidates[i] as string)) {
        used.add(i);
        earned = true;
        break;
      }
    }
    return {
      pointId: p.id,
      marksAwarded: earned ? p.marks : 0,
      marksAvailable: p.marks,
      earned,
    };
  });

  const sum = points.reduce((n, p) => n + p.marksAwarded, 0);
  return {
    questionId: q.id,
    topic: q.topic,
    marks: clamp(sum, 0, available),
    marksAvailable: available,
    unanswered: false,
    points,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Per-topic marks, in order of first appearance in the Paper. */
export function topicBreakdown(results: readonly QuestionResult[], paper: Paper): TopicScore[] {
  const order: string[] = [];
  for (const q of paper.questions) if (!order.includes(q.topic)) order.push(q.topic);
  return order.map((topic) => {
    const mine = results.filter((r) => r.topic === topic);
    const earned = mine.reduce((n, r) => n + r.marks, 0);
    const available = mine.reduce((n, r) => n + r.marksAvailable, 0);
    return { topic, earned, available, ratio: available > 0 ? round2(earned / available) : 0 };
  });
}

/** First band with `pct >= minPercent`, otherwise G. Total for any number. */
export function gradeForPercent(pct: number, bands: readonly GradeBand[] = GRADE_BANDS): Grade {
  if (!Number.isFinite(pct)) return 'G';
  for (const b of bands) if (pct >= b.minPercent) return b.grade;
  return 'G';
}

export interface MarkMeta {
  id?: string;
  submittedAt?: string;
  trigger?: Exam_Result['trigger'];
  bands?: readonly GradeBand[];
}

/** Mark the whole Paper. Pass `meta.submittedAt` for a fully deterministic result. */
export function markPaper(
  paper: Paper,
  answers: Readonly<Record<QuestionId, string>>,
  meta: MarkMeta = {},
): Exam_Result {
  const questions = paper.questions.map((q) => markQuestion(q, answers[q.id]));
  const totalEarned = questions.reduce((n, r) => n + r.marks, 0);
  const totalAvailable = questions.reduce((n, r) => n + r.marksAvailable, 0);
  const percent = totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 1000) / 10 : 0;
  const submittedAt = meta.submittedAt ?? new Date().toISOString();
  return {
    id: meta.id ?? `${paper.id}-${submittedAt}`,
    paperId: paper.id,
    submittedAt,
    trigger: meta.trigger ?? 'manual',
    totalEarned,
    totalAvailable,
    percent,
    grade: gradeForPercent(percent, meta.bands ?? GRADE_BANDS),
    questions,
    topics: topicBreakdown(questions, paper),
  };
}
