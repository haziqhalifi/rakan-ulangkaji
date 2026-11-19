import type { Question } from '../../content/types';

export interface ObjectiveOption {
  /** Letter of the correct option. */
  correct: string;
  /** Letter the student chose, or null when blank or not one of the options. */
  chosen: string | null;
}

function optionId(q: Question, text: string | undefined): string | null {
  if (text === undefined) return null;
  const cleaned = text.normalize('NFKC').replace(/[()\s.]/g, '').toUpperCase();
  return (q.options ?? []).find((o) => o.id.toUpperCase() === cleaned)?.id ?? null;
}

/** For objective questions, the correct and chosen option letters. Null for structured questions. */
export function objectiveOption(q: Question, answer: string | undefined): ObjectiveOption | null {
  if (q.kind !== 'objective' || !q.options) return null;
  const correct = q.skema.flatMap((p) => p.accepted).map((a) => optionId(q, a)).find((id) => id !== null) ?? null;
  if (correct === null) return null;
  return { correct, chosen: optionId(q, answer) };
}

export function optionLabelKey(o: ObjectiveOption, earned: boolean) {
  if (earned) return 'exam.results.option.correct' as const;
  return o.chosen === null ? ('exam.results.option.missedBlank' as const) : ('exam.results.option.missed' as const);
}
