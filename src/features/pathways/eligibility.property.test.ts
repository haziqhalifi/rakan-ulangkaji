import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PATHWAY_RULES } from '../../content/pathwayRules';
import { arbBetterGradeSet, arbGradeSet } from '../../test/arbitraries/grades';
import { fcCheapConfig } from '../../test/fcConfig';
import {
  applySuggestions,
  bestHint,
  evaluateAll,
  evaluatePathway,
  HINT_ORDER,
  listOpenPathways,
  PATHWAY_ORDER,
  type Hint,
  type HintLevel,
} from './eligibility';

const LEVELS: HintLevel[] = ['check_closely', 'may_need_more', 'may_be_open'];

describe('eligibility properties', () => {
  // Feature: rakan-ulangkaji-mvp, Property 33: Eligibility returns six well-formed hints
  it('returns six well-formed hints', () => {
    fc.assert(
      fc.property(arbGradeSet, (grades) => {
        const hints = evaluateAll(grades, PATHWAY_RULES);
        expect(hints.map((h) => h.pathway)).toEqual([...PATHWAY_ORDER]);
        for (const h of hints) {
          expect(LEVELS).toContain(h.level);
          expect(h.reasons.length).toBeGreaterThan(0);
          for (const r of h.reasons) expect(r.subject !== undefined || r.conditionId !== '').toBe(true);
        }
        for (const rule of PATHWAY_RULES) {
          const hint = hints.find((h) => h.pathway === rule.pathway) as Hint;
          for (const c of rule.conditions) {
            if (c.kind === 'minGrade' && grades[c.subject] === undefined) {
              expect(hint.level).not.toBe('may_be_open');
              expect(hint.reasons.some((r) => r.missingSubjects.includes(c.subject))).toBe(true);
            }
          }
        }
      }),
      fcCheapConfig,
    );
  });

  // Feature: rakan-ulangkaji-mvp, Property 34: Eligibility is deterministic
  it('is deterministic', () => {
    fc.assert(
      fc.property(arbGradeSet, (grades) => {
        expect(evaluateAll(grades, PATHWAY_RULES)).toEqual(evaluateAll({ ...grades }, PATHWAY_RULES));
      }),
      fcCheapConfig,
    );
  });

  // Feature: rakan-ulangkaji-mvp, Property 35: Eligibility is monotone in grades
  it('is monotone in grades', () => {
    fc.assert(
      fc.property(
        arbGradeSet.chain((base) => fc.tuple(fc.constant(base), arbBetterGradeSet(base))),
        ([base, better]) => {
          const a = evaluateAll(base, PATHWAY_RULES);
          const b = evaluateAll(better, PATHWAY_RULES);
          a.forEach((h, i) => {
            expect(HINT_ORDER[(b[i] as Hint).level]).toBeGreaterThanOrEqual(HINT_ORDER[h.level]);
          });
        },
      ),
      fcCheapConfig,
    );
  });

  // Feature: rakan-ulangkaji-mvp, Property 36: Suggestions improve or keep the level
  it('gives suggestions that lift the level', () => {
    fc.assert(
      fc.property(arbGradeSet, (grades) => {
        for (const rule of PATHWAY_RULES) {
          const hint = evaluatePathway(grades, rule);
          if (hint.level === 'may_be_open') {
            expect(hint.suggestions).toEqual([]);
            continue;
          }
          expect(hint.suggestions.length).toBeGreaterThan(0);
          const after = evaluatePathway(applySuggestions(grades, hint.suggestions), rule);
          expect(HINT_ORDER[after.level]).toBeGreaterThan(HINT_ORDER[hint.level]);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: rakan-ulangkaji-mvp, Property 37: Best hint and open pathway listing
  it('picks the best hint and lists open pathways', () => {
    const arbLevel = fc.constantFrom(...LEVELS);
    fc.assert(
      fc.property(fc.array(arbLevel, { minLength: 6, maxLength: 6 }), (levels) => {
        const hints: Hint[] = PATHWAY_ORDER.map((p, i) => ({
          pathway: p,
          level: levels[i] as HintLevel,
          reasons: [],
          suggestions: [],
        }));
        const best = bestHint(hints) as Hint;
        for (const h of hints) expect(HINT_ORDER[best.level]).toBeGreaterThanOrEqual(HINT_ORDER[h.level]);
        const firstBest = hints.find((h) => h.level === best.level) as Hint;
        expect(best.pathway).toBe(firstBest.pathway);
        expect(listOpenPathways(hints)).toEqual(hints.filter((h) => h.level === 'may_be_open'));
      }),
      fcCheapConfig,
    );
  });
});
