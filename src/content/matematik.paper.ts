import { MATEMATIK_QUESTIONS } from './matematikQuestions';
import type { Paper } from './types';

/**
 * The one original Matematik practice Paper.
 * Exam Mode loads this module lazily, only when the Student opens `#/exam`.
 */
export const matematikPaper: Paper = {
  id: 'matematik-practice-1',
  subject: 'matematik',
  title: { bm: 'Kertas latihan Matematik', en: 'Matematik practice paper' },
  durationMinutes: 45,
  questions: MATEMATIK_QUESTIONS,
};

export default matematikPaper;
