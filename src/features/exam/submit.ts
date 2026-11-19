// Mark-on-submit wiring. Marking is deterministic and never touches the AI core.

import type { Paper } from '../../content/types';
import type { Exam_Result, ProfileStore, Result } from '../../core/profile';
import { markPaper } from './marker';
import type { SubmitTrigger } from './runnerLogic';

/**
 * Mark the answers, record the result in the shared profile, then clear the saved attempt.
 * If marking throws, nothing is recorded and the caller keeps the answers to retry.
 */
export function finalizeExam(
  paper: Paper,
  answers: Readonly<Record<string, string>>,
  trigger: SubmitTrigger,
  store: Pick<ProfileStore, 'addExamResult' | 'saveExamInProgress'>,
  now: () => Date = () => new Date(),
): Result<Exam_Result, 'mark_failed'> {
  let result: Exam_Result;
  try {
    result = markPaper(paper, answers, { trigger, submittedAt: now().toISOString() });
  } catch {
    return { ok: false, error: 'mark_failed' };
  }
  store.addExamResult(result);
  store.saveExamInProgress(null);
  return { ok: true, value: result };
}
