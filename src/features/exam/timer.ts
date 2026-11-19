// Exam timer maths. Pure functions over a start timestamp and an injectable `now`.
// Nothing here counts ticks, so a sleeping or hidden tab cannot make the clock drift.

export interface ExamTimerState {
  startedAtMs: number;
  durationMs: number;
}

/** The warning fires when this much time or less is left. */
export const WARN_AT_MS = 5 * 60 * 1000;
/** Duration used when the demo short timer setting is on. */
export const DEMO_DURATION_MS = 60 * 1000;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Time left, clamped to the range 0 to the duration. A clock that moved back gives the full duration. */
export function remainingMs(s: ExamTimerState, nowMs: number): number {
  const duration = Math.max(0, s.durationMs);
  const left = duration - (nowMs - s.startedAtMs);
  return Number.isFinite(left) ? clamp(left, 0, duration) : 0;
}

/** `mm:ss`, rounding up to the next whole second so 00:00 only shows at expiry. */
export function formatMmSs(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const totalSeconds = Math.ceil(safe / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function hasExpired(s: ExamTimerState, nowMs: number): boolean {
  return remainingMs(s, nowMs) === 0;
}

/**
 * True when the 5 minute warning is due: time is at or below the threshold, the paper
 * is still running, and the warning has not been shown yet in this attempt.
 */
export function shouldWarn(s: ExamTimerState, nowMs: number, alreadyWarned: boolean): boolean {
  if (alreadyWarned) return false;
  const left = remainingMs(s, nowMs);
  return left > 0 && left <= WARN_AT_MS;
}

export function examDurationMs(paperMinutes: number, demoShortTimer: boolean): number {
  return demoShortTimer ? DEMO_DURATION_MS : Math.max(0, paperMinutes) * 60 * 1000;
}
