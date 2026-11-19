import fc from 'fast-check';
import {
  GRADES,
  type ChatMessage,
  type ExamInProgress,
  type Exam_Result,
  type Grade,
  type PersistedData,
  type QuizAttempt,
  type Settings,
  type StudentProfile,
} from '../../core/profile/types';
import { FICTIONAL_NAMES } from '../fixtures';

const arbIso = fc
  .integer({ min: Date.UTC(2026, 0, 1), max: Date.UTC(2027, 11, 31) })
  .map((ms) => new Date(ms).toISOString());

export const arbGrade: fc.Arbitrary<Grade> = fc.constantFrom(...GRADES);

export const arbProfile: fc.Arbitrary<StudentProfile> = fc.record({
  name: fc.constantFrom(...FICTIONAL_NAMES),
  form: fc.constantFrom(4 as const, 5 as const),
  subjects: fc.constant(['matematik' as const]),
  language: fc.constantFrom('bm' as const, 'en' as const),
  createdAt: arbIso,
});

const arbText = fc.string({ maxLength: 60 });

export const arbChatMessage: fc.Arbitrary<ChatMessage> = fc.record(
  {
    id: fc.uuid(),
    from: fc.constantFrom('student' as const, 'rakan' as const),
    text: arbText,
    lang: fc.constantFrom('bm' as const, 'en' as const),
    at: arbIso,
    chips: fc.array(fc.constantFrom('quiz' as const, 'exam' as const, 'pathways' as const), { maxLength: 3 }),
    source: fc.constantFrom('rules' as const, 'proxy' as const),
  },
  { requiredKeys: ['id', 'from', 'text', 'lang', 'at'] },
);

export const arbQuizAttempt: fc.Arbitrary<QuizAttempt> = fc.record({
  questionId: fc.constantFrom('q1', 'q2', 'q3'),
  topic: fc.constantFrom('indices', 'algebra', 'statistics'),
  ratio: fc.integer({ min: 0, max: 100 }).map((n) => n / 100),
  at: arbIso,
});

export const arbExamResult: fc.Arbitrary<Exam_Result> = fc.record({
  id: fc.uuid(),
  paperId: fc.constant('paper-1'),
  submittedAt: arbIso,
  trigger: fc.constantFrom('manual' as const, 'timeout' as const, 'resume_expired' as const),
  totalEarned: fc.integer({ min: 0, max: 40 }),
  totalAvailable: fc.constant(40),
  percent: fc.integer({ min: 0, max: 100 }),
  grade: arbGrade,
  questions: fc.constant([]),
  topics: fc.array(
    fc.record({
      topic: fc.constantFrom('indices', 'algebra', 'statistics'),
      earned: fc.integer({ min: 0, max: 5 }),
      available: fc.constant(5),
      ratio: fc.integer({ min: 0, max: 100 }).map((n) => n / 100),
    }),
    { maxLength: 3 },
  ),
});

export const arbExamInProgress: fc.Arbitrary<ExamInProgress> = fc.record({
  paperId: fc.constant('paper-1'),
  startedAtMs: fc.integer({ min: 1_700_000_000_000, max: 1_900_000_000_000 }),
  durationMs: fc.constantFrom(60_000, 5_400_000),
  answers: fc.dictionary(fc.constantFrom('q1', 'q2', 'q3'), arbText),
  currentIndex: fc.integer({ min: 0, max: 20 }),
  warned: fc.boolean(),
});

export const arbSettings: fc.Arbitrary<Settings> = fc.record({
  demoShortTimer: fc.boolean(),
  remote: fc.record({
    userKey: fc.record(
      {
        enabled: fc.boolean(),
        consentAt: arbIso,
        provider: fc.constantFrom('gemini' as const, 'openrouter' as const),
      },
      { requiredKeys: ['enabled', 'provider'] },
    ),
    proxy: fc.record({ enabled: fc.boolean(), consentAt: arbIso }, { requiredKeys: ['enabled'] }),
  }),
  share: fc.record({ name: fc.boolean(), school: fc.boolean(), grades: fc.boolean() }),
});

export const arbGradeSet = fc.record(
  { bm: arbGrade, bi: arbGrade, matematik: arbGrade, sejarah: arbGrade, sains: arbGrade },
  { requiredKeys: [] },
);

export const arbPersistedData: fc.Arbitrary<PersistedData> = fc.record({
  profile: fc.option(arbProfile, { nil: null }),
  progress: fc.record(
    {
      quizAttempts: fc.array(arbQuizAttempt, { maxLength: 8 }),
      examResults: fc.array(arbExamResult, { maxLength: 3 }),
      lastActivityAt: arbIso,
    },
    { requiredKeys: ['quizAttempts', 'examResults'] },
  ),
  grades: arbGradeSet,
  chat: fc.array(arbChatMessage, { maxLength: 10 }),
  examInProgress: fc.option(arbExamInProgress, { nil: null }),
  settings: arbSettings,
});
