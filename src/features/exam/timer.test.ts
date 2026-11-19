import { describe, expect, it } from 'vitest';
import { createSubmitGuard, decideResume } from './runnerLogic';
import { DEMO_DURATION_MS, examDurationMs, formatMmSs, hasExpired, remainingMs, shouldWarn } from './timer';

const START = Date.parse('2026-11-25T09:00:00.000Z');
const MIN = 60_000;

describe('timer on a fake clock', () => {
  const s = { startedAtMs: START, durationMs: 45 * MIN };

  it('counts down as the clock moves', () => {
    expect(formatMmSs(remainingMs(s, START))).toBe('45:00');
    expect(formatMmSs(remainingMs(s, START + 1))).toBe('45:00');
    expect(formatMmSs(remainingMs(s, START + 1000))).toBe('44:59');
    expect(formatMmSs(remainingMs(s, START + 44 * MIN + 30_000))).toBe('00:30');
  });

  it('stops at zero and stays there', () => {
    expect(remainingMs(s, START + 45 * MIN)).toBe(0);
    expect(remainingMs(s, START + 90 * MIN)).toBe(0);
    expect(formatMmSs(0)).toBe('00:00');
    expect(hasExpired(s, START + 45 * MIN - 1)).toBe(false);
    expect(hasExpired(s, START + 45 * MIN)).toBe(true);
  });

  it('warns once when 5 minutes remain', () => {
    expect(shouldWarn(s, START + 39 * MIN, false)).toBe(false);
    expect(shouldWarn(s, START + 40 * MIN, false)).toBe(true);
    expect(shouldWarn(s, START + 41 * MIN, true)).toBe(false);
    expect(shouldWarn(s, START + 45 * MIN, false)).toBe(false);
  });

  it('submits a single time at expiry even when ticks keep arriving', () => {
    const calls: string[] = [];
    const guard = createSubmitGuard((trigger) => calls.push(trigger));
    for (let t = 44 * MIN; t <= 46 * MIN; t += 250) {
      if (hasExpired(s, START + t)) guard.fire('timeout', {});
    }
    expect(calls).toEqual(['timeout']);
  });

  it('resumes at fixed timestamps, using the saved start time', () => {
    const saved = { paperId: 'p', ...s, answers: { q1: 'A' }, currentIndex: 3, warned: false };
    expect(decideResume(saved, START + 10 * MIN)).toBe('offer_resume');
    expect(formatMmSs(remainingMs(saved, START + 10 * MIN))).toBe('35:00');
    expect(decideResume(saved, START + 45 * MIN)).toBe('auto_submit');
  });

  it('uses 60 seconds for the demo setting and the paper length otherwise', () => {
    expect(examDurationMs(45, true)).toBe(DEMO_DURATION_MS);
    expect(examDurationMs(45, false)).toBe(45 * MIN);
  });
});
