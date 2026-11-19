// Quiz flow state machine. Pure: the reducer returns the next state plus what to show and record.
// Marking uses the same markQuestion as Exam Mode. No AI is involved, so marks are deterministic.

import { allQuestions, topicLabel } from '../../content/questionBank';
import type { Question, QuestionId } from '../../content/types';
import { pick } from '../../core/i18n';
import type { Bilingual, ChipId, Language, QuizAttempt, TopicId, WeakTopic } from '../../core/profile';
import { markQuestion } from '../../core/marking/marker';
import { findTopic } from './intents';

export const QUIZ_MAX_QUESTIONS = 5;

export type QuizState =
  | { phase: 'idle' }
  | { phase: 'choosing_topic' }
  | { phase: 'asking'; topic: TopicId; asked: QuestionId[]; current: QuestionId; earned: number; available: number }
  | { phase: 'done'; topic: TopicId; earned: number; available: number };

export type QuizEvent =
  | { type: 'request'; weak?: readonly WeakTopic[] }
  | { type: 'chooseTopic'; topic: TopicId }
  | { type: 'answer'; text: string }
  | { type: 'stop' };

export interface QuizContext {
  language: Language;
  /** Injected for tests. Defaults to the real question bank. */
  questions?: readonly Question[];
  /** Used for the attempt timestamp. */
  now?: string;
  /** Weak topics, weakest first. Used to offer a first choice. */
  weak?: readonly WeakTopic[];
}

export interface QuizOutput {
  state: QuizState;
  /** Text for the Rakan bubble. */
  text: string;
  chips: ChipId[];
  /** Topics to show as choice buttons, weakest first. */
  topicChoices?: TopicId[];
  /** One attempt per marked answer. Never set for a blank answer. */
  attempt?: QuizAttempt;
}

export const IDLE: QuizState = { phase: 'idle' };

/** True for "stop" in any case with any surrounding whitespace. */
export function isStopCommand(text: string): boolean {
  return text.trim().toLowerCase() === 'stop';
}

export function isQuizActive(state: QuizState): boolean {
  return state.phase === 'choosing_topic' || state.phase === 'asking';
}

const t = (b: Bilingual, lang: Language) => pick(b, lang);

function fill(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, k: string) => String(params[k] ?? whole));
}

const COPY = {
  choose: {
    bm: 'Jom kuiz! Pilih satu topik. Taip "stop" bila-bila masa untuk berhenti.',
    en: 'Let us quiz! Pick a topic. Type "stop" any time to finish.',
  },
  chooseWeak: {
    bm: 'Jom kuiz! Saya cadangkan {topic} dahulu, sebab di situ awak boleh dapat paling banyak manfaat. Atau pilih topik lain. Taip "stop" bila-bila masa untuk berhenti.',
    en: 'Let us quiz! I suggest {topic} first, since a little practice there may help the most. Or pick another topic. Type "stop" any time to finish.',
  },
  noQuestions: {
    bm: 'Topik itu belum ada soalan lagi. Topik yang ada soalan: {topics}. Pilih satu ya.',
    en: 'That topic has no questions yet. Topics with questions: {topics}. Pick one.',
  },
  pickAgain: {
    bm: 'Saya belum pasti topik mana. Topik yang ada soalan: {topics}. Pilih satu, atau taip "stop".',
    en: 'I am not sure which topic. Topics with questions: {topics}. Pick one, or type "stop".',
  },
  questionHead: { bm: 'Soalan {n} daripada {max} ({marks} markah)', en: 'Question {n} of {max} ({marks} marks)' },
  retry: {
    bm: 'Jawapan kosong. Cuba taip jawapan awak, atau taip "stop" untuk berhenti.',
    en: 'That answer is empty. Try typing your answer, or type "stop" to finish.',
  },
  earned: { bm: 'Betul', en: 'Earned' },
  missed: { bm: 'Terlepas', en: 'Missed' },
  none: { bm: 'tiada', en: 'none' },
  marks: { bm: 'Markah: {earned}/{total}', en: 'Marks: {earned}/{total}' },
  full: [
    { bm: 'Hebat! Markah penuh.', en: 'Well done! Full marks.' },
    { bm: 'Cantik! Awak dapat semuanya.', en: 'Nice work! You got every point.' },
  ] as Bilingual[],
  partial: {
    bm: 'Belum sampai lagi, tapi awak dah mula. Jom tengok yang tersilap.',
    en: 'Not there yet, but you have started. Let us look at what tripped you up.',
  },
  summary: {
    bm: 'Kuiz tamat. Jumlah markah: {earned}/{available}. Setiap cubaan membantu. Bila-bila awak sedia, kita ulang lagi.',
    en: 'Quiz finished. Total marks: {earned}/{available}. Every try helps. Whenever you are ready, we can go again.',
  },
  stoppedIdle: { bm: 'Baik, kita berhenti dulu.', en: 'Okay, we will stop here.' },
} satisfies Record<string, Bilingual | Bilingual[]>;

function questionsFor(ctx: QuizContext, topic: TopicId): Question[] {
  return (ctx.questions ?? allQuestions()).filter((q) => q.topic === topic);
}

/** Topics that have questions, in bank order, with the weakest weak topic first. */
export function topicsWithQuestions(ctx: QuizContext): TopicId[] {
  const seen: TopicId[] = [];
  for (const q of ctx.questions ?? allQuestions()) if (!seen.includes(q.topic)) seen.push(q.topic);
  const first = ctx.weak?.find((w) => seen.includes(w.topic))?.topic;
  return first === undefined ? seen : [first, ...seen.filter((s) => s !== first)];
}

function topicNames(topics: readonly TopicId[], lang: Language): string {
  return topics.map((x) => t(topicLabel(x), lang)).join(', ');
}

function renderQuestion(q: Question, n: number, lang: Language): string {
  const head = fill(t(COPY.questionHead, lang), { n, max: QUIZ_MAX_QUESTIONS, marks: q.marks });
  const options = (q.options ?? []).map((o) => `${o.id}. ${t(o.label, lang)}`);
  return [head, t(q.question, lang), ...options].join('\n');
}

function summary(state: Extract<QuizState, { phase: 'done' }>, lang: Language): string {
  return fill(t(COPY.summary, lang), { earned: state.earned, available: state.available });
}

function chooseOutput(ctx: QuizContext): QuizOutput {
  const lang = ctx.language;
  const topics = topicsWithQuestions(ctx);
  const weakFirst = ctx.weak?.find((w) => topics.includes(w.topic));
  const text = weakFirst
    ? fill(t(COPY.chooseWeak, lang), { topic: t(topicLabel(weakFirst.topic), lang) })
    : t(COPY.choose, lang);
  return { state: { phase: 'choosing_topic' }, text, chips: ['stop'], topicChoices: topics };
}

function startTopic(topic: TopicId, ctx: QuizContext): QuizOutput {
  const lang = ctx.language;
  const first = questionsFor(ctx, topic)[0];
  if (!first) {
    const topics = topicsWithQuestions(ctx);
    return {
      state: { phase: 'choosing_topic' },
      text: fill(t(COPY.noQuestions, lang), { topics: topicNames(topics, lang) }),
      chips: ['stop'],
      topicChoices: topics,
    };
  }
  return {
    state: { phase: 'asking', topic, asked: [first.id], current: first.id, earned: 0, available: 0 },
    text: renderQuestion(first, 1, lang),
    chips: ['stop'],
  };
}

function finish(state: QuizState, ctx: QuizContext): QuizOutput {
  if (state.phase !== 'asking') {
    return { state: IDLE, text: t(COPY.stoppedIdle, ctx.language), chips: [] };
  }
  const done: Extract<QuizState, { phase: 'done' }> = {
    phase: 'done',
    topic: state.topic,
    earned: state.earned,
    available: state.available,
  };
  return { state: done, text: summary(done, ctx.language), chips: ['quiz', 'exam'] };
}

function feedback(q: Question, result: ReturnType<typeof markQuestion>, lang: Language, seed: number): string {
  const earnedPts = q.skema.filter((_p, i) => result.points[i]?.earned).map((p) => t(p.point, lang));
  const missedPts = q.skema.filter((_p, i) => !result.points[i]?.earned).map((p) => t(p.point, lang));
  const none = t(COPY.none, lang);
  const lines = [
    result.marks === result.marksAvailable
      ? t(COPY.full[seed % COPY.full.length] as Bilingual, lang)
      : t(COPY.partial, lang),
    `${t(COPY.earned, lang)}: ${earnedPts.length ? earnedPts.join('; ') : none}`,
    `${t(COPY.missed, lang)}: ${missedPts.length ? missedPts.join('; ') : none}`,
    fill(t(COPY.marks, lang), { earned: result.marks, total: result.marksAvailable }),
    t(q.explanation, lang),
  ];
  return lines.join('\n');
}

function answerQuestion(state: Extract<QuizState, { phase: 'asking' }>, text: string, ctx: QuizContext): QuizOutput {
  const lang = ctx.language;
  const all = questionsFor(ctx, state.topic);
  const q = all.find((x) => x.id === state.current);
  if (!q) return finish(state, ctx);
  if (text.trim() === '') {
    return { state, text: t(COPY.retry, lang), chips: ['stop'] };
  }
  const result = markQuestion(q, text);
  const attempt: QuizAttempt = {
    questionId: q.id,
    topic: q.topic,
    ratio: result.marksAvailable > 0 ? result.marks / result.marksAvailable : 0,
    at: ctx.now ?? new Date().toISOString(),
  };
  const earned = state.earned + result.marks;
  const available = state.available + result.marksAvailable;
  const body = feedback(q, result, lang, state.asked.length);
  const next = all.find((x) => !state.asked.includes(x.id));
  if (state.asked.length >= QUIZ_MAX_QUESTIONS || !next) {
    const out = finish({ ...state, earned, available }, ctx);
    return { ...out, text: `${body}\n\n${out.text}`, attempt };
  }
  const asked = [...state.asked, next.id];
  return {
    state: { ...state, asked, current: next.id, earned, available },
    text: `${body}\n\n${renderQuestion(next, asked.length, lang)}`,
    chips: ['stop'],
    attempt,
  };
}

/** Reducer: next state and the output for one event. */
export function quizReducer(state: QuizState, event: QuizEvent, ctx: QuizContext): QuizOutput {
  const withWeak: QuizContext = { ...ctx, weak: event.type === 'request' ? (event.weak ?? ctx.weak) : ctx.weak };
  switch (event.type) {
    case 'request':
      return chooseOutput(withWeak);
    case 'chooseTopic':
      return startTopic(event.topic, ctx);
    case 'stop':
      return finish(state, ctx);
    case 'answer': {
      if (isStopCommand(event.text)) return finish(state, ctx);
      if (state.phase === 'choosing_topic') {
        const named = findTopic(event.text);
        if (named !== undefined) return startTopic(named, ctx);
        const topics = topicsWithQuestions(ctx);
        return {
          state,
          text: fill(t(COPY.pickAgain, ctx.language), { topics: topicNames(topics, ctx.language) }),
          chips: ['stop'],
          topicChoices: topics,
        };
      }
      if (state.phase === 'asking') return answerQuestion(state, event.text, ctx);
      return { state, text: '', chips: [] };
    }
  }
}
