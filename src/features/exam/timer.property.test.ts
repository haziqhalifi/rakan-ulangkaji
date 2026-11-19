import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fcCheapConfig } from '../../test/fcConfig';
import { formatMmSs, hasExpired, remainingMs, shouldWarn, WARN_AT_MS } from './timer';

const arbDuration = fc.integer({ min: 1000, max: 3 * 60 * 60 * 1000 });
const arbStart = fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 });
const arbOffset = fc.integer({ min: -60_000, max: 4 * 60 * 60 * 1000 });

describe('Property 18: remaining time formula', () => {
  it('equals duration minus elapsed, clamped, and non-increasing', () => {
    fc.assert(
      fc.property(arbStart, arbDuration, arbOffset, arbOffset, (startedAtMs, durationMs, o1, o2) => {
        const s = { startedAtMs, durationMs };
        const [a, b] = o1 <= o2 ? [o1, o2] : [o2, o1];
        const r1 = remainingMs(s, startedAtMs + a);
        const r2 = remainingMs(s, startedAtMs + b);
        expect(r1).toBe(Math.min(durationMs, Math.max(0, durationMs - a)));
        expect(r2).toBeLessThanOrEqual(r1);
        expect(r1).toBeGreaterThanOrEqual(0);
        expect(r1).toBeLessThanOrEqual(durationMs);
        expect(hasExpired(s, startedAtMs + a)).toBe(durationMs - a <= 0);
      }),
      fcCheapConfig,
    );
  });

  it('does not depend on how many ticks happened in between', () => {
    fc.assert(
      fc.property(arbStart, arbDuration, fc.array(arbOffset, { maxLength: 30 }), arbOffset, (startedAtMs, durationMs, ticks, end) => {
        const s = { startedAtMs, durationMs };
        const direct = remainingMs(s, startedAtMs + end);
        for (const t of ticks) remainingMs(s, startedAtMs + t);
        expect(remainingMs(s, startedAtMs + end)).toBe(direct);
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 19: time display format', () => {
  it('is mm:ss with seconds 00 to 59 and parses back within 1 second', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 3 * 60 * 60 * 1000 }), (ms) => {
        const text = formatMmSs(ms);
        const m = /^(\d{2,}):([0-5]\d)$/.exec(text);
        expect(m).not.toBeNull();
        const parsed = (Number(m?.[1]) * 60 + Number(m?.[2])) * 1000;
        expect(Math.abs(parsed - ms)).toBeLessThanOrEqual(1000);
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 20: warning fires once', () => {
  it('fires at most once, only once 5 minutes or less remain, and not again after a reload', () => {
    fc.assert(
      fc.property(
        arbStart,
        fc.integer({ min: 60_000, max: 2 * 60 * 60 * 1000 }),
        fc.array(fc.integer({ min: 0, max: 20 * 60 * 1000 }), { minLength: 1, maxLength: 60 }),
        (startedAtMs, durationMs, steps) => {
          const s = { startedAtMs, durationMs };
          let now = startedAtMs;
          let warned = false;
          let fired = 0;
          for (const step of steps) {
            now += step;
            if (shouldWarn(s, now, warned)) {
              fired += 1;
              expect(remainingMs(s, now)).toBeLessThanOrEqual(WARN_AT_MS);
              warned = true;
            }
          }
          expect(fired).toBeLessThanOrEqual(1);
          // A reload restores warned from ExamInProgress, so nothing fires again.
          expect(shouldWarn(s, now, warned)).toBe(false);
          if (fired === 0) {
            const left = remainingMs(s, now);
            expect(left > 0 && left <= WARN_AT_MS).toBe(false);
          }
        },
      ),
      fcCheapConfig,
    );
  });
});
