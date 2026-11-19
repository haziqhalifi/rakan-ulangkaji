import { describe, expect, it } from 'vitest';
import { PATHWAY_RULES } from '../../content/pathwayRules';
import type { Grade_Set } from '../../core/profile/types';
import { bestHint, evaluateAll, evaluatePathway, gradeRank, PATHWAY_ORDER, type Hint } from './eligibility';

const rule = (id: string) => PATHWAY_RULES.find((r) => r.pathway === id)!;
const hintFor = (g: Grade_Set, id: string): Hint => evaluatePathway(g, rule(id));

describe('gradeRank', () => {
  it('orders A+ above G', () => {
    expect(gradeRank('A+')).toBe(9);
    expect(gradeRank('G')).toBe(0);
    expect(gradeRank('B+')).toBeGreaterThan(gradeRank('B'));
  });
});

describe('pathway examples (fictional students)', () => {
  it('Matrikulasi: Aina with strong grades may be open', () => {
    const aina: Grade_Set = { bm: 'A-', bi: 'B', matematik: 'A', sejarah: 'B', sains: 'B+' };
    expect(hintFor(aina, 'matrikulasi').level).toBe('may_be_open');
  });

  it('Matrikulasi: a Matematik C is one step short, so it may need more and names Matematik B', () => {
    const g: Grade_Set = { bm: 'B', bi: 'B', matematik: 'C+', sejarah: 'B', sains: 'B' };
    const h = hintFor(g, 'matrikulasi');
    expect(h.level).toBe('may_need_more');
    expect(h.reasons.some((r) => r.subject === 'matematik' && r.required === 'B')).toBe(true);
    expect(h.suggestions).toEqual([{ subject: 'matematik', targetGrade: 'B' }]);
  });

  it('Asasi: Daniel with high Matematik and Sains may be open', () => {
    const daniel: Grade_Set = { bm: 'B', bi: 'B+', matematik: 'A-', sejarah: 'C', sains: 'A-' };
    expect(hintFor(daniel, 'asasi').level).toBe('may_be_open');
  });

  it('Asasi: a weak Matematik and Sains means check closely', () => {
    const g: Grade_Set = { bm: 'C', bi: 'C', matematik: 'D', sejarah: 'C', sains: 'D' };
    expect(hintFor(g, 'asasi').level).toBe('check_closely');
  });

  it('STPM: Mei Ling with three credits including BM may be open', () => {
    const g: Grade_Set = { bm: 'C+', bi: 'C', matematik: 'C', sejarah: 'D', sains: 'E' };
    expect(hintFor(g, 'stpm').level).toBe('may_be_open');
  });

  it('Diploma: Ravi with a pass in BM and Sejarah and three credits may be open', () => {
    const g: Grade_Set = { bm: 'D', bi: 'C', matematik: 'C', sejarah: 'E', sains: 'C' };
    expect(hintFor(g, 'diploma').level).toBe('may_be_open');
  });

  it('TVET: basic passes in BM and Matematik, but few D grades, may need more', () => {
    const g: Grade_Set = { bm: 'E', bi: 'G', matematik: 'E', sejarah: 'G', sains: 'G' };
    const h = hintFor(g, 'tvet');
    expect(h.level).toBe('may_need_more');
    expect(h.reasons.some((r) => r.kind === 'minCount' && r.required === 'D')).toBe(true);
  });

  it('Foundation: Matematik C, English D and three C grades may be open only with two Bs', () => {
    const base: Grade_Set = { bm: 'C', bi: 'D', matematik: 'C', sejarah: 'C', sains: 'D' };
    expect(hintFor(base, 'foundation').level).toBe('may_need_more');
    expect(hintFor({ ...base, bm: 'B', sejarah: 'B' }, 'foundation').level).toBe('may_be_open');
  });
});

describe('edge cases', () => {
  it('an empty grade set gives six check_closely hints', () => {
    const hints = evaluateAll({}, PATHWAY_RULES);
    expect(hints.map((h) => h.pathway)).toEqual([...PATHWAY_ORDER]);
    expect(hints.every((h) => h.level === 'check_closely')).toBe(true);
    expect(hints.every((h) => h.reasons.length > 0 && h.suggestions.length > 0)).toBe(true);
  });

  it('names a missing subject in the reasons', () => {
    const g: Grade_Set = { bm: 'B', bi: 'B', sejarah: 'B', sains: 'B' };
    const h = hintFor(g, 'matrikulasi');
    expect(h.level).not.toBe('may_be_open');
    expect(h.reasons.some((r) => r.missingSubjects.includes('matematik'))).toBe(true);
  });

  it('still returns six hints when a rule is missing', () => {
    const hints = evaluateAll({ bm: 'A' }, PATHWAY_RULES.slice(1));
    expect(hints).toHaveLength(6);
    expect(hints[0]?.level).toBe('check_closely');
  });

  it('bestHint breaks ties by pathway order', () => {
    const hints = evaluateAll({}, PATHWAY_RULES);
    expect(bestHint(hints)?.pathway).toBe('matrikulasi');
  });

  it('all A+ opens every pathway', () => {
    const g: Grade_Set = { bm: 'A+', bi: 'A+', matematik: 'A+', sejarah: 'A+', sains: 'A+' };
    expect(evaluateAll(g, PATHWAY_RULES).every((h) => h.level === 'may_be_open')).toBe(true);
  });
});

describe('pathway rule data', () => {
  it('has all six pathways with a review date and a source note', () => {
    expect(PATHWAY_RULES.map((r) => r.pathway).sort()).toEqual([...PATHWAY_ORDER].sort());
    for (const r of PATHWAY_RULES) {
      expect(r.lastReviewed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.lastReviewed))).toBe(false);
      expect(r.sourceNote.trim()).not.toBe('');
      expect(r.usuallyNeeds.bm && r.usuallyNeeds.en && r.nextStep.bm && r.nextStep.en).toBeTruthy();
      expect(r.conditions.some((c) => c.strength === 'core')).toBe(true);
    }
  });

  it('uses hedged wording only', () => {
    const banned = /you are eligible|you will get in|awak layak|anda layak|pasti (diterima|dapat)|akan diterima/i;
    for (const r of PATHWAY_RULES) {
      for (const text of [r.usuallyNeeds.en, r.usuallyNeeds.bm, r.nextStep.en, r.nextStep.bm]) {
        expect(text).not.toMatch(banned);
      }
    }
  });
});
