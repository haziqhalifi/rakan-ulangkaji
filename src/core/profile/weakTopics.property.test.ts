import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fcCheapConfig } from '../../test/fcConfig';
import { computeWeakTopics, isWeak } from './weakTopics';

describe('Property 14: Weak_Topic definition', () => {
  it('is weak exactly when ratio < 0.5, or ratio < 0.6 with fewer than 2 attempts', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.integer({ min: 1, max: 10 }), (ratio, attempts) => {
        const expected = ratio < 0.5 || (attempts < 2 && ratio < 0.6);
        expect(isWeak({ latestRatio: ratio, attempts })).toBe(expected);
        const listed = computeWeakTopics([{ topic: 't', latestRatio: ratio, attempts, lastAt: 'x' }]).length === 1;
        expect(listed).toBe(expected);
      }),
      fcCheapConfig,
    );
  });

  it('handles the boundary values', () => {
    expect(isWeak({ latestRatio: 0.5, attempts: 2 })).toBe(false);
    expect(isWeak({ latestRatio: 0.5, attempts: 1 })).toBe(true);
    expect(isWeak({ latestRatio: 0.6, attempts: 1 })).toBe(false);
    expect(isWeak({ latestRatio: 0.6, attempts: 0 })).toBe(false);
  });
});
