import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { ExamInProgress } from '../../core/profile/types';
import { fcCheapConfig } from '../../test/fcConfig';
import { createSubmitGuard, decideResume, newRunnerState, runnerReducer, type RunnerAction, type SubmitTrigger } from './runnerLogic';
import { hasExpired, remainingMs } from './timer';

const IDS = ['q1', 'q2', 'q3', 'q4', 'q5'];

describe('Property 21: submission happens exactly once', () => {
  type Ev =
    | { k: 'edit'; id: string; text: string }
    | { k: 'tick'; dt: number }
    | { k: 'confirm' }
    | { k: 'cancel' }
    | { k: 'reload' };

  const arbEv: fc.Arbitrary<Ev> = fc.oneof(
    fc.record({ k: fc.constant('edit' as const), id: fc.constantFrom(...IDS), text: fc.string({ maxLength: 8 }) }),
    fc.record({ k: fc.constant('tick' as const), dt: fc.integer({ min: 0, max: 20_000 }) }),
    fc.constant({ k: 'confirm' as const }),
    fc.constant({ k: 'cancel' as const }),
    fc.constant({ k: 'reload' as const }),
  );

  it('calls submit once, with the answers present at the first trigger', () => {
    fc.assert(
      fc.property(fc.array(arbEv, { maxLength: 80 }), fc.integer({ min: 1000, max: 120_000 }), (events, durationMs) => {
        const startedAtMs = 1_800_000_000_000;
        const timer = { startedAtMs, durationMs };
        const calls: Array<{ trigger: SubmitTrigger; answers: Record<string, string> }> = [];
        const guard = createSubmitGuard((trigger, answers) => calls.push({ trigger, answers }));
        let answers: Record<string, string> = {};
        let now = startedAtMs;
        let expected: Record<string, string> | null = null;

        for (const ev of events) {
          if (ev.k === 'edit') answers = { ...answers, [ev.id]: ev.text };
          else if (ev.k === 'tick') now += ev.dt;
          else if (ev.k === 'confirm') {
            if (expected === null) expected = { ...answers };
            guard.fire('manual', answers);
          }
          // A cancelled confirmation does nothing: no call, same answers.
          // A reload keeps the saved answers and start time, then checks the clock once.
          if (ev.k === 'reload' && hasExpired(timer, now)) {
            if (expected === null) expected = { ...answers };
            guard.fire('resume_expired', answers);
          }
          if (ev.k === 'tick' && hasExpired(timer, now)) {
            if (expected === null) expected = { ...answers };
            guard.fire('timeout', answers);
          }
          if (ev.k === 'cancel') {
            expect(guard.submitted).toBe(expected !== null);
          }
        }
        expect(calls.length).toBe(expected === null ? 0 : 1);
        if (expected !== null) expect(calls[0]?.answers).toEqual(expected);
      }),
      fcCheapConfig,
    );
  });

  it('ignores edits made after the submit', () => {
    const calls: Array<Record<string, string>> = [];
    const guard = createSubmitGuard((_t, a) => calls.push(a));
    const answers = { q1: 'A' };
    guard.fire('manual', answers);
    answers.q1 = 'B';
    guard.fire('timeout', { q1: 'C' });
    expect(calls).toEqual([{ q1: 'A' }]);
  });
});

describe('Property 22: resume decision', () => {
  it('offers resume iff time remains, and auto-submits iff none remains', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 }),
        fc.integer({ min: 1000, max: 3 * 60 * 60 * 1000 }),
        fc.integer({ min: -10_000, max: 4 * 60 * 60 * 1000 }),
        fc.dictionary(fc.constantFrom(...IDS), fc.string({ maxLength: 6 })),
        fc.boolean(),
        (startedAtMs, durationMs, offset, answers, warned) => {
          const saved: ExamInProgress = { paperId: 'p', startedAtMs, durationMs, answers, currentIndex: 0, warned };
          const now = startedAtMs + offset;
          const d = decideResume(saved, now);
          expect(d === 'offer_resume').toBe(remainingMs(saved, now) > 0);
          expect(d === 'auto_submit').toBe(remainingMs(saved, now) === 0);
        },
      ),
      fcCheapConfig,
    );
  });
});

describe('Property 23: answers survive navigation and language change', () => {
  type Step = RunnerAction | { type: 'language' };
  const arbStep: fc.Arbitrary<Step> = fc.oneof(
    fc.record({ type: fc.constant('answer' as const), questionId: fc.constantFrom(...IDS), text: fc.string({ maxLength: 8 }) }),
    fc.record({ type: fc.constant('goto' as const), index: fc.integer({ min: -3, max: 10 }) }),
    fc.constant({ type: 'next' as const }),
    fc.constant({ type: 'prev' as const }),
    fc.constant({ type: 'language' as const }),
  );

  it('keeps the last edit per question and the start timestamp', () => {
    fc.assert(
      fc.property(fc.array(arbStep, { maxLength: 80 }), (steps) => {
        let state = newRunnerState('p', 1_800_000_000_000, 60_000);
        const last: Record<string, string> = {};
        for (const step of steps) {
          if (step.type === 'language') continue; // language lives in i18n state, not here
          if (step.type === 'answer') last[step.questionId] = step.text;
          state = runnerReducer(state, step, IDS.length);
          expect(state.currentIndex).toBeGreaterThanOrEqual(0);
          expect(state.currentIndex).toBeLessThan(IDS.length);
        }
        expect(state.answers).toEqual(last);
        expect(state.startedAtMs).toBe(1_800_000_000_000);
      }),
      fcCheapConfig,
    );
  });
});
