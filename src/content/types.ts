// Content types for the Paper, questions and skema.
// Content is typed data. Marking against it stays deterministic.

import type { Bilingual, Form, Grade, Language, SubjectId, TopicId } from '../core/profile/types';

export type { Bilingual };
export type QuestionId = string;

export interface SkemaPoint {
  id: string;
  /** Short description shown in results. */
  point: Bilingual;
  /** Integer, at least 1. */
  marks: number;
  /** At least one accepted variant. Compared after normalisation. */
  accepted: string[];
  /** Unit text removed before comparing. */
  stripUnits?: string[];
}

export interface QuestionOption {
  id: string;
  label: Bilingual;
}

export interface Question {
  id: QuestionId;
  subject: SubjectId;
  form: Form;
  topic: TopicId;
  /** `both` for bilingual items. */
  language: Language | 'both';
  kind: 'objective' | 'structured';
  question: Bilingual;
  /** Objective only. The answer text is the option id. */
  options?: QuestionOption[];
  /** Integer from 1 to 10, equal to the sum of the skema marks. */
  marks: number;
  /** Objective: exactly one point. Structured: two or more. */
  skema: SkemaPoint[];
  explanation: Bilingual;
  /** Literal type, so a missing flag fails to compile. */
  original: true;
}

export interface Paper {
  id: string;
  subject: SubjectId;
  title: Bilingual;
  durationMinutes: number;
  /** 10 to 15 objective plus 3 to 4 structured. */
  questions: Question[];
}

export interface GradeBand {
  /** Lowest percentage that earns this grade. */
  minPercent: number;
  grade: Grade;
}
