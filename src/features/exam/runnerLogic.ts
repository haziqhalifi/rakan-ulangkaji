// Pure runner logic: answers and navigation reducer, submit-once guard, resume decision.
// No React and no i18n here, so a language change cannot touch answers, index or start time.

import type { ExamInProgress, Exam_Result } from '../../core/profile/types';
import { remainingMs, type ExamTimerState } from './timer';

export interface RunnerState {
  paperId: string;
  startedAtMs: number;
  durationMs: number;
  answers: Record<string, string>;
  currentIndex: number;
  warned: boolean;
}

export type RunnerAction =
  | { type: 'answer'; questionId: string; text: string }
  | { type: 'goto'; index: number }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'warned' };

export function initialRunnerState(saved: ExamInProgress): RunnerState {
  return { ...saved, answers: { ...saved.answers } };
}

export function newRunnerState(paperId: string, startedAtMs: number, durationMs: number): RunnerState {
  return { paperId, startedAtMs, durationMs, answers: {}, currentIndex: 0, warned: false };
}

export function runnerReducer(state: RunnerState, action: RunnerAction, questionCount: number): RunnerState {
  const last = Math.max(0, questionCount - 1);
  const clampIndex = (i: number) => Math.min(last, Math.max(0, Math.trunc(Number.isFinite(i) ? i : 0)));
  switch (action.type) {
    case 'answer':
      return { ...state, answers: { ...state.answers, [action.questionId]: action.text } };
    case 'goto':
      return { ...state, currentIndex: clampIndex(action.index) };
    case 'next':
      return { ...state, currentIndex: clampIndex(state.currentIndex + 1) };
    case 'prev':
      return { ...state, currentIndex: clampIndex(state.currentIndex - 1) };
    case 'warned':
      return state.warned ? state : { ...state, warned: true };
  }
}

export function toInProgress(state: RunnerState): ExamInProgress {
  return { ...state, answers: { ...state.answers } };
}

export function timerOf(state: RunnerState): ExamTimerState {
  return { startedAtMs: state.startedAtMs, durationMs: state.durationMs };
}

export function answeredCount(answers: Readonly<Record<string, string>>, questionIds: readonly string[]): number {
  return questionIds.filter((id) => (answers[id] ?? '').trim() !== '').length;
}

export type SubmitTrigger = Exam_Result['trigger'];

export interface SubmitGuard {
  /** Runs the submit callback on the first call only. Returns true when it ran. */
  fire(trigger: SubmitTrigger, answers: Readonly<Record<string, string>>): boolean;
  readonly submitted: boolean;
}

/**
 * Submit-once guard, the plain-code twin of a `submittedRef`. Manual confirm, expiry and
 * reload-at-zero all go through it, so marking happens once, with the answers at that moment.
 * The answers are copied, so later edits cannot change what was submitted.
 */
export function createSubmitGuard(
  onSubmit: (trigger: SubmitTrigger, answers: Record<string, string>) => void,
): SubmitGuard {
  let submitted = false;
  return {
    fire(trigger, answers) {
      if (submitted) return false;
      submitted = true;
      onSubmit(trigger, { ...answers });
      return true;
    },
    get submitted() {
      return submitted;
    },
  };
}

export type ResumeDecision = 'offer_resume' | 'auto_submit';

/** Time left means offer to resume. No time left means submit the saved answers. */
export function decideResume(saved: ExamInProgress, nowMs: number): ResumeDecision {
  return remainingMs(saved, nowMs) > 0 ? 'offer_resume' : 'auto_submit';
}
