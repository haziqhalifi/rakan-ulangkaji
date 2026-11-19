import fc from 'fast-check';
import { GRADES, type Grade, type Grade_Set, type SpmSubject } from '../../core/profile/types';

const SUBJECTS: SpmSubject[] = ['bm', 'bi', 'matematik', 'sejarah', 'sains'];
export const arbGrade: fc.Arbitrary<Grade> = fc.constantFrom(...GRADES);

/** Any grade set, including empty and partial ones. */
export const arbGradeSet: fc.Arbitrary<Grade_Set> = fc
  .record({
    bm: fc.option(arbGrade, { nil: undefined }),
    bi: fc.option(arbGrade, { nil: undefined }),
    matematik: fc.option(arbGrade, { nil: undefined }),
    sejarah: fc.option(arbGrade, { nil: undefined }),
    sains: fc.option(arbGrade, { nil: undefined }),
  })
  .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) as Grade_Set);

/** A grade set where every subject is the same or better, and subjects of `base` stay present. */
export function arbBetterGradeSet(base: Grade_Set): fc.Arbitrary<Grade_Set> {
  return fc
    .tuple(
      ...SUBJECTS.map((s) => {
        const have = base[s];
        if (have === undefined) return fc.option(arbGrade, { nil: undefined });
        const idx = GRADES.indexOf(have);
        return fc.constantFrom(...GRADES.slice(0, idx + 1)).map((g): Grade | undefined => g);
      }),
    )
    .map((vals) => {
      const out: Grade_Set = {};
      SUBJECTS.forEach((s, i) => {
        const v = vals[i];
        if (v !== undefined) out[s] = v;
      });
      return out;
    });
}
