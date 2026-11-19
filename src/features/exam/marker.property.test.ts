import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { GRADE_BANDS } from '../../content/gradeBands';
import { GRADES } from '../../core/profile/types';
import { fcCheapConfig } from '../../test/fcConfig';
import {
  arbAnyAnswer,
  arbAnswerFor,
  arbCaseSpaceVariant,
  arbExamAnswers,
  arbQuestion,
  paper,
} from '../../test/arbitraries/exam';
import { gradeForPercent, markPaper, markQuestion } from './marker';

const META = { submittedAt: '2026-11-24T10:00:00.000Z', id: 'r1' };

describe('Property 24: marker bounds and determinism', () => {
  it('returns marks within [0, total] and the same result twice', () => {
    fc.assert(
      fc.property(arbQuestion, arbAnyAnswer, (q, a) => {
        const r1 = markQuestion(q, a);
        const r2 = markQuestion(q, a);
        expect(r1).toEqual(r2);
        expect(r1.marks).toBeGreaterThanOrEqual(0);
        expect(r1.marks).toBeLessThanOrEqual(q.marks);
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 25: marker ignores case, spacing, and listed units', () => {
  it('gives the same marks for case and whitespace changes of an accepted variant', () => {
    fc.assert(
      fc.property(
        arbQuestion.chain((q) =>
          fc.constantFrom(...q.skema.flatMap((p) => p.accepted)).chain((v) =>
            arbCaseSpaceVariant(v).map((t) => ({ q, v, t })),
          ),
        ),
        ({ q, v, t }) => {
          expect(markQuestion(q, t).marks).toBe(markQuestion(q, v).marks);
        },
      ),
      fcCheapConfig,
    );
  });

  it('gives the same marks when a listed unit is appended', () => {
    const withUnits = paper.questions.flatMap((q) =>
      q.skema.filter((p) => (p.stripUnits ?? []).length > 0).map((p) => ({ q, p })),
    );
    expect(withUnits.length).toBeGreaterThan(0);
    fc.assert(
      fc.property(
        fc.constantFrom(...withUnits).chain(({ q, p }) =>
          fc
            .record({
              v: fc.constantFrom(...p.accepted),
              unit: fc.constantFrom(...(p.stripUnits as string[])),
              upper: fc.boolean(),
            })
            .map((x) => ({ q, ...x })),
        ),
        ({ q, v, unit, upper }) => {
          const withUnit = `${v} ${upper ? unit.toUpperCase() : unit}`;
          expect(markQuestion(q, withUnit).marks).toBe(markQuestion(q, v).marks);
        },
      ),
      fcCheapConfig,
    );
  });
});

describe('Property 26: marks are awarded per point and never twice', () => {
  it('sums earned points, lists each point once and awards each at most once', () => {
    fc.assert(
      fc.property(
        arbQuestion.chain((q) => arbAnswerFor(q).map((a) => ({ q, a }))),
        ({ q, a }) => {
          const r = markQuestion(q, a);
          expect(r.points.map((p) => p.pointId)).toEqual(q.skema.map((p) => p.id));
          const sum = r.points.reduce((n, p) => n + p.marksAwarded, 0);
          expect(r.marks).toBe(Math.min(sum, q.marks));
          for (const p of r.points) {
            expect([0, p.marksAvailable]).toContain(p.marksAwarded);
            expect(p.earned).toBe(p.marksAwarded > 0);
          }
        },
      ),
      fcCheapConfig,
    );
  });

  it('lets one segment satisfy at most one point', () => {
    const q = paper.questions.find((x) => x.id === 'mat-f5-mat-s1');
    expect(q).toBeDefined();
    if (!q) return;
    // Points a and b both accept "1". A single "1" can only earn one of them.
    const one = markQuestion(q, '1');
    expect(one.points.filter((p) => p.earned)).toHaveLength(1);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), (n) => {
        const r = markQuestion(q, Array.from({ length: n }, () => '1').join('\n'));
        expect(r.points.filter((p) => p.earned).length).toBeLessThanOrEqual(2);
        expect(r.marks).toBeLessThanOrEqual(2);
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 27: unanswered questions score zero', () => {
  it('gives zero marks and all points missed for undefined or blank answers', () => {
    fc.assert(
      fc.property(
        arbQuestion,
        fc.oneof(
          fc.constant(undefined),
          fc.array(fc.constantFrom(' ', '\t', '\n', '  '), { maxLength: 8 }).map((a) => a.join('')),
        ),
        (q, a) => {
          const r = markQuestion(q, a);
          expect(r.marks).toBe(0);
          expect(r.unanswered).toBe(true);
          expect(r.points).toHaveLength(q.skema.length);
          expect(r.points.every((p) => !p.earned && p.marksAwarded === 0)).toBe(true);
        },
      ),
      fcCheapConfig,
    );
  });
});

describe('Property 28: exam totals and topic breakdown are consistent', () => {
  it('adds up per question, per topic and overall', () => {
    fc.assert(
      fc.property(arbExamAnswers, (answers) => {
        const r = markPaper(paper, answers, META);
        const qSum = r.questions.reduce((n, x) => n + x.marks, 0);
        expect(r.totalEarned).toBe(qSum);
        expect(r.topics.reduce((n, t) => n + t.earned, 0)).toBe(r.totalEarned);
        expect(r.topics.reduce((n, t) => n + t.available, 0)).toBe(r.totalAvailable);
        expect(r.totalAvailable).toBe(paper.questions.reduce((n, q) => n + q.marks, 0));
        for (const t of r.topics) {
          expect(t.ratio).toBeGreaterThanOrEqual(0);
          expect(t.ratio).toBeLessThanOrEqual(1);
          expect(t.ratio).toBe(Math.round((t.earned / t.available) * 100) / 100);
        }
        expect(r.questions).toHaveLength(paper.questions.length);
        expect(r.grade).toBe(gradeForPercent(r.percent));
      }),
      fcCheapConfig,
    );
  });

  it('is deterministic for fixed metadata', () => {
    fc.assert(
      fc.property(arbExamAnswers, (answers) => {
        expect(markPaper(paper, answers, META)).toEqual(markPaper(paper, answers, META));
      }),
      { numRuns: 50 },
    );
  });
});

describe('Property 29: grade mapping is total and monotone', () => {
  const rank = (g: string) => GRADES.indexOf(g as (typeof GRADES)[number]);

  it('maps every percentage to a grade and never lowers a grade as percent rises', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (a, b) => {
          const [p1, p2] = a <= b ? [a, b] : [b, a];
          const g1 = gradeForPercent(p1, GRADE_BANDS);
          const g2 = gradeForPercent(p2, GRADE_BANDS);
          expect(rank(g1)).toBeGreaterThanOrEqual(0);
          expect(rank(g2)).toBeGreaterThanOrEqual(0);
          // Lower index means a better grade.
          expect(rank(g1)).toBeGreaterThanOrEqual(rank(g2));
        },
      ),
      fcCheapConfig,
    );
  });

  it('returns G for values outside the bands', () => {
    expect(gradeForPercent(-5)).toBe('G');
    expect(gradeForPercent(Number.NaN)).toBe('G');
  });
});
