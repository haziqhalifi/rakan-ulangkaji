import { describe, expect, it } from 'vitest';
import { matematikPaper } from '../../content/matematik.paper';
import { allQuestions, listTopics, questionsForTopic, getQuestion } from '../../content/questionBank';
import { GRADE_BANDS } from '../../content/gradeBands';
import type { Question } from '../../content/types';
import { correctAnswerFor } from '../../test/arbitraries/exam';
import { markQuestion } from './marker';

const questions = matematikPaper.questions;
const bilingualFields = (q: Question): string[] => [
  q.question.bm,
  q.question.en,
  q.explanation.bm,
  q.explanation.en,
  ...(q.options ?? []).flatMap((o) => [o.label.bm, o.label.en]),
  ...q.skema.flatMap((p) => [p.point.bm, p.point.en]),
];

const ALLOWED_NAMES = ['Aina', 'Daniel', 'Mei Ling', 'Ravi'];
// Capitalised words that are not names: sentence starts, symbols and labels.
const ALLOWED_WORDS = new Set([
  ...ALLOWED_NAMES.flatMap((n) => n.split(' ')),
  'Simplify', 'Evaluate', 'Given', 'Find', 'Write', 'Form', 'Set', 'Matrix', 'The', 'A', 'B', 'P', 'M',
  'R', 'D', 'In', 'There', 'Each', 'Ravi', 'He', 'Daniel', 'Dalam', 'Diberi', 'Cari', 'Nilaikan',
  'Ringkaskan', 'Tulis', 'Matriks', 'Masa', 'Seramai', 'Songsangan', 'Penentu', 'Punca', 'Kuasakan',
  'Kemudian', 'Apabila', 'Maka', 'Jadi', 'Langkah', 'Lebih', 'Lukis', 'Indeks', 'Ingat', 'Cuba',
  'Darab', 'Darabkan', 'Daripada', 'Hasilnya', 'Semak', 'Faktor', 'Debat', 'Tiada', 'Robotik',
  'Check', 'Expand', 'Then', 'When', 'So', 'Working', 'More', 'Multiply', 'Remember', 'Determinant',
  'Robotics', 'Debate', 'Neither', 'Matrices', 'Venn', 'Dia', 'Set', 'Kita', 'Apabila', 'Kita',
  'Ravi', 'Hasil', 'Nilai', 'Pilihan', 'Persamaan', 'Hubungan', 'Pemalar', 'Bentukkan', 'Mei', 'Ling',
  'Take', 'Taking', 'Negative', 'Indeks', 'Asas', 'Pelengkap', 'Unsur', 'Faktor', 'Apabila', 'Unsur',
  'Darab', 'Matematik', 'An', 'Lukis', 'Ia', 'Penentu', 'Masa', 'Paip', 'Maka', 'Our', 'We', 'Multiply',
  'Cube', 'Try', 'From', 'Because', 'Then', 'Determinant', 'Safe', 'Pupils', 'Time', 'Mei', 'Ling',
]);

describe('Paper content integrity', () => {
  it('has 10 to 15 objective and 3 to 4 structured questions', () => {
    const obj = questions.filter((q) => q.kind === 'objective').length;
    const str = questions.filter((q) => q.kind === 'structured').length;
    expect(obj).toBeGreaterThanOrEqual(10);
    expect(obj).toBeLessThanOrEqual(15);
    expect(str).toBeGreaterThanOrEqual(3);
    expect(str).toBeLessThanOrEqual(4);
  });

  it('covers at least 4 topics across Form 4 and Form 5', () => {
    expect(new Set(questions.map((q) => q.topic)).size).toBeGreaterThanOrEqual(4);
    expect(questions.some((q) => q.form === 4)).toBe(true);
    expect(questions.some((q) => q.form === 5)).toBe(true);
  });

  it('has unique ids and the original flag on every question', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    for (const q of questions) {
      expect(q.original).toBe(true);
      expect(q.subject).toBe('matematik');
      expect(q.language).toBe('both');
    }
  });

  it('has kind-specific skema shapes and 1 to 10 marks', () => {
    for (const q of questions) {
      expect(Number.isInteger(q.marks)).toBe(true);
      expect(q.marks).toBeGreaterThanOrEqual(1);
      expect(q.marks).toBeLessThanOrEqual(10);
      if (q.kind === 'objective') {
        expect(q.skema).toHaveLength(1);
        expect(q.options?.length).toBe(4);
        expect(q.options?.some((o) => q.skema[0]?.accepted.includes(o.id))).toBe(true);
      } else {
        expect(q.skema.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has non-empty bilingual text in every field', () => {
    for (const q of questions) {
      for (const text of bilingualFields(q)) expect(text.trim()).not.toBe('');
    }
  });

  it('uses only fictional names from the allow list', () => {
    for (const q of questions) {
      for (const text of [q.question.bm, q.question.en]) {
        const words = text.match(/\b\p{Lu}\p{Ll}+\b/gu) ?? [];
        for (const w of words) expect(ALLOWED_WORDS.has(w), `${q.id}: ${w}`).toBe(true);
      }
    }
    const named = questions.filter((q) => ALLOWED_NAMES.some((n) => q.question.en.includes(n)));
    expect(named.length).toBeGreaterThan(0);
  });

  it('has no em dash, banned pronoun or placeholder text', () => {
    const banned = new RegExp(`\\b${['k', 'a', 'u'].join('')}\\b`, 'i');
    for (const q of questions) {
      for (const text of bilingualFields(q)) {
        expect(text).not.toContain('\u2014');
        expect(text).not.toMatch(banned);
        expect(text.toLowerCase()).not.toMatch(/todo|lorem/);
      }
    }
  });
});

describe('Property 41: every shipped question has a consistent skema', () => {
  it('skema marks sum to the question marks and every point has an accepted variant', () => {
    for (const q of allQuestions()) {
      expect(q.skema.reduce((n, p) => n + p.marks, 0)).toBe(q.marks);
      for (const p of q.skema) {
        expect(Number.isInteger(p.marks) && p.marks >= 1).toBe(true);
        expect(p.accepted.length).toBeGreaterThanOrEqual(1);
        for (const v of p.accepted) expect(v.trim()).not.toBe('');
      }
    }
  });

  it('accepted answers earn full marks and a wrong answer earns zero', () => {
    for (const q of allQuestions()) {
      const full = markQuestion(q, correctAnswerFor(q));
      expect(full.marks, q.id).toBe(q.marks);
      expect(full.unanswered).toBe(false);
      const wrong = markQuestion(q, 'zzz wrong 987');
      expect(wrong.marks, q.id).toBe(0);
      expect(wrong.unanswered).toBe(false);
    }
  });

  it('every accepted variant alone earns at least one mark', () => {
    for (const q of allQuestions()) {
      for (const p of q.skema) {
        for (const v of p.accepted) {
          expect(markQuestion(q, v).marks, `${q.id}/${p.id}/${v}`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('question bank and grade bands', () => {
  it('shares the Paper questions in a fixed order', () => {
    expect(allQuestions()).toEqual(questions);
    expect(listTopics().length).toBeGreaterThanOrEqual(4);
    for (const topic of listTopics()) {
      expect(questionsForTopic(topic).every((q) => q.topic === topic)).toBe(true);
    }
    expect(getQuestion('mat-f4-ind-01')?.topic).toBe('f4-indices');
    expect(getQuestion('nope')).toBeUndefined();
  });

  it('has bands sorted descending and ending at 0', () => {
    for (let i = 1; i < GRADE_BANDS.length; i++) {
      expect((GRADE_BANDS[i] as { minPercent: number }).minPercent).toBeLessThan(
        (GRADE_BANDS[i - 1] as { minPercent: number }).minPercent,
      );
    }
    expect(GRADE_BANDS[GRADE_BANDS.length - 1]?.minPercent).toBe(0);
  });
});
