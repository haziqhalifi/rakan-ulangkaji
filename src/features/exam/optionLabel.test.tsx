// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider } from '../../app/NavigationContext';
import type { Paper, Question } from '../../content/types';
import { I18nProvider } from '../../core/i18n';
import type { Language } from '../../core/profile';
import { markPaper } from './marker';
import { objectiveOption } from './optionLabel';
import { Results } from './Results';

const same = (s: string) => ({ bm: s, en: s });

const q: Question = {
  id: 'fiction-obj-1',
  subject: 'matematik',
  form: 4,
  topic: 'f4-indices',
  language: 'both',
  kind: 'objective',
  question: same('Pick one.'),
  options: ['A', 'B', 'C', 'D'].map((id) => ({ id, label: same(`Option ${id}`) })),
  marks: 1,
  skema: [{ id: 'p1', point: { bm: 'Pilihan jawapan yang betul', en: 'The correct option' }, marks: 1, accepted: ['B', '(B)'] }],
  explanation: same('Because.'),
  original: true,
};

const paper: Paper = { id: 'fiction-paper', subject: 'matematik', title: same('Fiction'), durationMinutes: 10, questions: [q] };

function show(answer: string | undefined, lang: Language) {
  const answers = answer === undefined ? {} : { [q.id]: answer };
  const result = markPaper(paper, answers);
  render(
    <I18nProvider language={lang} setLanguage={() => undefined}>
      <NavigationProvider navigate={() => undefined}>
        <Results paper={paper} result={result} answers={answers} onAgain={() => undefined} />
      </NavigationProvider>
    </I18nProvider>,
  );
}

afterEach(cleanup);

describe('objectiveOption', () => {
  it('finds the correct and chosen letters', () => {
    expect(objectiveOption(q, 'c')).toEqual({ correct: 'B', chosen: 'C' });
    expect(objectiveOption(q, ' (B) ')).toEqual({ correct: 'B', chosen: 'B' });
    expect(objectiveOption(q, undefined)).toEqual({ correct: 'B', chosen: null });
    expect(objectiveOption(q, 'Z')).toEqual({ correct: 'B', chosen: null });
  });

  it('is null for structured questions', () => {
    expect(objectiveOption({ ...q, kind: 'structured', options: undefined }, 'B')).toBeNull();
  });
});

describe('Results option label', () => {
  it('EN earned', () => {
    show('B', 'en');
    expect(screen.getByText(/correct option \(B\)/).textContent).toBe('\u2713 Earned: correct option (B)');
    expect(screen.getByText(/1 of 1 mark$/)).toBeInTheDocument();
  });

  it('EN missed with a wrong choice', () => {
    show('C', 'en');
    expect(screen.getByText(/correct option/).textContent).toBe('\u2717 Missed: correct option (B), you chose (C)');
  });

  it('EN missed with no answer', () => {
    show(undefined, 'en');
    expect(screen.getByText(/correct option/).textContent).toBe('\u2717 Missed: correct option (B), you did not answer');
  });

  it('BM variants use awak', () => {
    show('C', 'bm');
    expect(screen.getByText(/pilihan yang betul/).textContent).toBe('\u2717 Belum dapat: pilihan yang betul (B), awak pilih (C)');
    cleanup();
    show(undefined, 'bm');
    expect(screen.getByText(/pilihan yang betul/).textContent).toContain('awak tidak menjawab');
    cleanup();
    show('B', 'bm');
    expect(screen.getByText(/1 daripada 1 markah$/)).toBeInTheDocument();
  });
});
