import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { SpmSubject } from '../../core/profile/types';
import { arbGrade, arbGradeSet } from '../../test/arbitraries/grades';
import { fcConfig } from '../../test/fcConfig';
import { activeGrades, editGrade, initialWhatIf, setWhatIf } from './whatIf';

const arbSubject = fc.constantFrom<SpmSubject>('bm', 'bi', 'matematik', 'sejarah', 'sains');

describe('what-if state', () => {
  // Feature: rakan-ulangkaji-mvp, Property 32: What-if mode never changes saved grades
  it('never changes saved grades and discards predictions when turned off', () => {
    fc.assert(
      fc.property(arbGradeSet, fc.array(fc.tuple(arbSubject, arbGrade), { maxLength: 10 }), (saved, edits) => {
        const before = { ...saved };
        let state = setWhatIf(initialWhatIf, true, saved);
        for (const [s, g] of edits) {
          const out = editGrade(state, s, g);
          expect(out.save).toBeUndefined();
          state = out.state;
        }
        expect(saved).toEqual(before);
        expect(activeGrades(state, saved)).toEqual({ ...before, ...Object.fromEntries(edits) });
        const off = setWhatIf(state, false, saved);
        expect(activeGrades(off, saved)).toEqual(before);
        expect(off.predicted).toEqual({});
      }),
      fcConfig,
    );
  });

  it('asks for a save when what-if is off', () => {
    const out = editGrade(initialWhatIf, 'sains', 'B');
    expect(out.save).toEqual({ subject: 'sains', grade: 'B' });
  });
});
