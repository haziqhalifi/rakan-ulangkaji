// Shared types for the student profile, progress record and persisted data.
// Both core and features import from here, so there are no import cycles.

export type Language = 'bm' | 'en';
export type Form = 4 | 5;
export type SubjectId = 'matematik';
export type TopicId = string;
export type Bilingual = { bm: string; en: string };

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'E' | 'G';
export const GRADES: readonly Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];
export type SpmSubject = 'bm' | 'bi' | 'matematik' | 'sejarah' | 'sains';
export type Grade_Set = Partial<Record<SpmSubject, Grade>>;

export type ProviderId = 'rules' | 'userKey' | 'proxy';
export type RemoteProviderId = 'userKey' | 'proxy';
export type ChipId = 'quiz' | 'exam' | 'pathways' | 'revise' | 'stop' | 'quizTopic';

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export interface StudentProfile {
  name: string;
  form: Form;
  subjects: SubjectId[];
  language: Language;
  createdAt: string;
}

export interface Settings {
  demoShortTimer: boolean;
  remote: {
    userKey: { enabled: boolean; consentAt?: string; provider: 'gemini' | 'openrouter' };
    proxy: { enabled: boolean; consentAt?: string };
  };
  share: { name: boolean; school: boolean; grades: boolean };
}

export interface ChatMessage {
  id: string;
  from: 'student' | 'rakan';
  text: string;
  lang: Language;
  at: string;
  chips?: ChipId[];
  source?: ProviderId;
}

export interface QuizAttempt {
  questionId: string;
  topic: TopicId;
  ratio: number;
  at: string;
}

export interface PointResult {
  pointId: string;
  marksAwarded: number;
  marksAvailable: number;
  earned: boolean;
}

export interface QuestionResult {
  questionId: string;
  topic: TopicId;
  marks: number;
  marksAvailable: number;
  unanswered: boolean;
  points: PointResult[];
}

export interface TopicScore {
  topic: TopicId;
  earned: number;
  available: number;
  ratio: number;
}

export interface Exam_Result {
  id: string;
  paperId: string;
  submittedAt: string;
  trigger: 'manual' | 'timeout' | 'resume_expired';
  totalEarned: number;
  totalAvailable: number;
  percent: number;
  grade: Grade;
  questions: QuestionResult[];
  topics: TopicScore[];
}

export interface Progress_Record {
  quizAttempts: QuizAttempt[];
  examResults: Exam_Result[];
  lastActivityAt?: string;
}

export interface ExamInProgress {
  paperId: string;
  startedAtMs: number;
  durationMs: number;
  answers: Record<string, string>;
  currentIndex: number;
  warned: boolean;
}

export interface PersistedData {
  profile: StudentProfile | null;
  progress: Progress_Record;
  grades: Grade_Set;
  chat: ChatMessage[];
  examInProgress: ExamInProgress | null;
  settings: Settings;
}

export interface PersistedDocument {
  schemaVersion: number;
  savedAt: string;
  payload: PersistedData;
}

export const MAX_CHAT_MESSAGES = 200;
export const MAX_QUIZ_ATTEMPTS = 500;
export const MAX_EXAM_RESULTS = 20;

export function defaultSettings(): Settings {
  return {
    demoShortTimer: false,
    remote: {
      userKey: { enabled: false, provider: 'gemini' },
      proxy: { enabled: false },
    },
    share: { name: false, school: false, grades: false },
  };
}

export function emptyPersistedData(): PersistedData {
  return {
    profile: null,
    progress: { quizAttempts: [], examResults: [] },
    grades: {},
    chat: [],
    examInProgress: null,
    settings: defaultSettings(),
  };
}
