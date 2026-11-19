import fc from 'fast-check';
import { matematikPaper } from '../../content/matematik.paper';
import type { Paper, Question, SkemaPoint } from '../../content/types';

export const paper: Paper = matematikPaper;

export const arbQuestion: fc.Arbitrary<Question> = fc.constantFrom(...paper.questions);

/** Any text, including empty, long, unicode and whitespace-only. */
export const arbAnyAnswer: fc.Arbitrary<string | undefined> = fc.oneof(
  fc.constant(undefined),
  fc.string({ maxLength: 60 }),
  fc.string({ unit: 'binary', maxLength: 40 }),
  fc.string({ minLength: 500, maxLength: 800 }),
  fc.constantFrom('', ' ', '\n\t ', ';;;', '\n'),
);

/** The accepted variants of a point, with a point picked at random. */
export const arbPointOf = (q: Question): fc.Arbitrary<SkemaPoint> => fc.constantFrom(...q.skema);

/** Change case, pad, repeat internal spaces. Never changes meaning for the marker. */
export function arbCaseSpaceVariant(s: string): fc.Arbitrary<string> {
  return fc
    .record({
      upper: fc.boolean(),
      lead: fc.constantFrom('', ' ', '  ', '\t'),
      trail: fc.constantFrom('', ' ', '   ', '\t '),
      spaces: fc.constantFrom(' ', '  ', '   ', '\t'),
    })
    .map(({ upper, lead, trail, spaces }) => {
      const cased = upper ? s.toUpperCase() : s;
      return `${lead}${cased.replace(/ /g, spaces)}${trail}`;
    });
}

/** Full-marks answer text for a question. */
export function correctAnswerFor(q: Question): string {
  return q.skema.map((p) => p.accepted[0] as string).join('\n');
}

export const arbAnswerFor = (q: Question): fc.Arbitrary<string | undefined> =>
  fc.oneof(
    fc.constant(correctAnswerFor(q)),
    ...q.skema.map((p) => fc.constantFrom(...p.accepted)),
    arbAnyAnswer,
  );

export const arbExamAnswers: fc.Arbitrary<Record<string, string>> = fc
  .tuple(...paper.questions.map((q) => fc.oneof({ weight: 3, arbitrary: arbAnswerFor(q) }, fc.constant(undefined))))
  .map((vals) => {
    const out: Record<string, string> = {};
    paper.questions.forEach((q, i) => {
      const v = vals[i];
      if (v !== undefined) out[q.id] = v;
    });
    return out;
  });
