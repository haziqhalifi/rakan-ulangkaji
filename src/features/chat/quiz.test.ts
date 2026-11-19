import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import { allQuestions, listTopics } from '../../content/questionBank';
import type { Question } from '../../content/types';
import type { WeakTopic } from '../../core/profile';
import { computeWeakTopics } from '../../core/profile';
import { fcCheapConfig } from '../../test/fcConfig';
import {
  hasNudgeBeenShown,
  markNudgeShown,
  NUDGE_VARIANTS,
  nudgeMessage,
  pickNudgeTopic,
  resetNudgeSession,
} from './nudge';
import { IDLE, isStopCommand, quizReducer, QUIZ_MAX_QUESTIONS, type QuizOutput, type QuizState } from './quiz';
import { ruleReply } from './replies';

const NOW = '2026-11-27T10:00:00.000Z';
const topics = listTopics();
const ctx = { language: 'en' as const, now: NOW };

function start(topic: string, language: 'en' | 'bm' = 'en') {
  const c = { language, now: NOW };
  const req = quizReducer(IDLE, { type: 'request' }, c);
  return { c, out: quizReducer(req.state, { type: 'chooseTopic', topic }, c) };
}

/** The right answer text for a question, from the first accepted variants. */
function rightAnswer(q: Question): string {
  return q.skema.map((p) => p.accepted[0] as string).join('\n');
}

function currentQuestion(state: QuizState): Question {
  if (state.phase !== 'asking') throw new Error('not asking');
  return allQuestions().find((q) => q.id === state.current) as Question;
}

describe('quiz reducer examples', () => {
  it('offers the weakest weak topic first', () => {
    const weak: WeakTopic[] = [
      { topic: 'f5-matrices', ratio: 0.1 },
      { topic: 'f4-sets', ratio: 0.3 },
    ];
    const out = quizReducer(IDLE, { type: 'request', weak }, ctx);
    expect(out.state.phase).toBe('choosing_topic');
    expect(out.topicChoices?.[0]).toBe('f5-matrices');
    expect(out.text).toContain('Matrices');
    expect(out.chips).toContain('stop');
  });

  it('asks in bank order, one at a time, then ends after 5 with a summary', () => {
    const { c, out: first } = start('f4-indices');
    let out: QuizOutput = first;
    const asked: string[] = [];
    let attempts = 0;
    while (out.state.phase === 'asking') {
      asked.push(out.state.current);
      out = quizReducer(out.state, { type: 'answer', text: rightAnswer(currentQuestion(out.state)) }, c);
      if (out.attempt) attempts += 1;
    }
    expect(out.state.phase).toBe('done');
    expect(asked.length).toBeLessThanOrEqual(QUIZ_MAX_QUESTIONS);
    expect(new Set(asked).size).toBe(asked.length);
    const bank = allQuestions().filter((q) => q.topic === 'f4-indices').map((q) => q.id);
    expect(asked).toEqual(bank.slice(0, asked.length));
    expect(attempts).toBe(asked.length);
    expect(out.text).toMatch(/Total marks: \d+\/\d+/);
  });

  it('shows points, marks and the explanation, with short praise on full marks', () => {
    const { c, out } = start('f4-indices');
    const q = currentQuestion(out.state);
    const done = quizReducer(out.state, { type: 'answer', text: rightAnswer(q) }, c);
    expect(done.attempt?.ratio).toBe(1);
    expect(done.text).toContain('Earned:');
    expect(done.text).toContain('Missed: none');
    expect(done.text).toContain(`Marks: ${q.marks}/${q.marks}`);
    expect(done.text).toContain(q.explanation.en);
    const praise = done.text.split('\n')[0] as string;
    expect(praise.split(/[.!?]+\s/).filter(Boolean).length).toBeLessThanOrEqual(2);
  });

  it('encourages on a wrong answer and records ratio 0', () => {
    const { c, out } = start('f4-indices');
    const wrong = quizReducer(out.state, { type: 'answer', text: 'no idea' }, c);
    expect(wrong.attempt?.ratio).toBe(0);
    expect(wrong.text).toContain('Not there yet');
    expect(wrong.text).toContain('Missed:');
  });

  it('keeps the question open and records nothing for a whitespace answer', () => {
    const { c, out } = start('f4-sets');
    const again = quizReducer(out.state, { type: 'answer', text: '  \n ' }, c);
    expect(again.state).toEqual(out.state);
    expect(again.attempt).toBeUndefined();
    expect(again.text).toContain('Try');
  });

  it('stops on "stop" in any case and keeps earned marks', () => {
    const { c, out } = start('f4-indices');
    const q = currentQuestion(out.state);
    const next = quizReducer(out.state, { type: 'answer', text: rightAnswer(q) }, c);
    const stopped = quizReducer(next.state, { type: 'answer', text: '  StOp ' }, c);
    expect(stopped.state).toMatchObject({ phase: 'done', earned: q.marks });
    expect(stopped.attempt).toBeUndefined();
  });

  it('lists topics that have questions when the chosen one has none', () => {
    const only = allQuestions().filter((q) => q.topic === 'f4-sets');
    const c = { language: 'en' as const, questions: only, now: NOW };
    const out = quizReducer({ phase: 'choosing_topic' }, { type: 'chooseTopic', topic: 'f5-matrices' }, c);
    expect(out.state.phase).toBe('choosing_topic');
    expect(out.text).toContain('no questions yet');
    expect(out.topicChoices).toEqual(['f4-sets']);
  });

  it('ends early when the topic runs out of questions', () => {
    const one = allQuestions().filter((q) => q.topic === 'f4-sets').slice(0, 2);
    const c = { language: 'bm' as const, questions: one, now: NOW };
    let out = quizReducer({ phase: 'choosing_topic' }, { type: 'chooseTopic', topic: 'f4-sets' }, c);
    out = quizReducer(out.state, { type: 'answer', text: 'x' }, c);
    out = quizReducer(out.state, { type: 'answer', text: 'x' }, c);
    expect(out.state.phase).toBe('done');
    expect(out.text).toContain('Jumlah markah');
  });
});

describe('Property 16: quiz invariants', () => {
  it('never repeats a question, caps at 5, and records only marked answers', () => {
    const arbEvent = fc.oneof(
      fc.constant<'right'>('right'),
      fc.constant<'wrong'>('wrong'),
      fc.constant<'blank'>('blank'),
    );
    fc.assert(
      fc.property(fc.constantFrom(...topics), fc.array(arbEvent, { maxLength: 12 }), (topic, events) => {
        const { c, out } = start(topic);
        let cur: QuizOutput = out;
        const asked: string[] = [];
        let marked = 0;
        let attempts = 0;
        for (const e of events) {
          if (cur.state.phase !== 'asking') break;
          asked.push(cur.state.current);
          const text = e === 'right' ? rightAnswer(currentQuestion(cur.state)) : e === 'wrong' ? 'zzz' : ' ';
          const next = quizReducer(cur.state, { type: 'answer', text }, c);
          if (e === 'blank') {
            expect(next.attempt).toBeUndefined();
            expect(next.state).toEqual(cur.state);
            asked.pop();
          } else {
            marked += 1;
          }
          if (next.attempt) attempts += 1;
          cur = next;
        }
        expect(attempts).toBe(marked);
        expect(new Set(asked).size).toBe(asked.length);
        expect(asked.length).toBeLessThanOrEqual(QUIZ_MAX_QUESTIONS);
        if (cur.state.phase === 'asking') expect(cur.state.asked.length).toBeLessThanOrEqual(QUIZ_MAX_QUESTIONS);
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 17: stop command matching', () => {
  it('treats any case and whitespace variant of stop as stop', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
        fc.stringMatching(/^[ \t\n]{0,4}$/),
        fc.stringMatching(/^[ \t\n]{0,4}$/),
        (flags, pre, post) => {
          const word = [...'stop'].map((ch, i) => (flags[i] ? ch.toUpperCase() : ch)).join('');
          expect(isStopCommand(`${pre}${word}${post}`)).toBe(true);
          const { c, out } = start('f4-indices');
          const stopped = quizReducer(out.state, { type: 'answer', text: `${pre}${word}${post}` }, c);
          expect(stopped.state.phase).toBe('done');
          expect(stopped.attempt).toBeUndefined();
        },
      ),
      fcCheapConfig,
    );
  });

  it('treats any other string as an answer', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 20 }), (text) => {
        fc.pre(text.trim().toLowerCase() !== 'stop');
        expect(isStopCommand(text)).toBe(false);
        const { c, out } = start('f4-indices');
        const next = quizReducer(out.state, { type: 'answer', text }, c);
        expect(next.state.phase === 'asking' || next.state.phase === 'done').toBe(true);
        expect(next.attempt !== undefined).toBe(text.trim() !== '');
      }),
      fcCheapConfig,
    );
  });
});

describe('Property 15: weak topics are ordered and the nudge picks the first', () => {
  const arbMastery = fc.record({
    topic: fc.constantFrom('a', 'b', 'c', 'd', 'e'),
    latestRatio: fc.constantFrom(0, 0.1, 0.25, 0.4, 0.55, 0.7, 1),
    attempts: fc.integer({ min: 1, max: 4 }),
    lastAt: fc.constant('x'),
  });

  it('sorts by ratio then name, and the nudge and revise reply use that order', () => {
    fc.assert(
      fc.property(fc.array(arbMastery, { maxLength: 8 }), (all) => {
        const weak = computeWeakTopics(all);
        for (let i = 1; i < weak.length; i++) {
          const a = weak[i - 1] as WeakTopic;
          const b = weak[i] as WeakTopic;
          expect(a.ratio < b.ratio || (a.ratio === b.ratio && a.topic <= b.topic)).toBe(true);
        }
        expect(pickNudgeTopic(weak)).toEqual(weak[0] ?? null);
        const reply = ruleReply('revise_advice', { language: 'en', name: 'Aina', message: 'revise', weakTopics: weak });
        const lines = reply.text.split('\n').filter((l) => /^\d\. /.test(l));
        expect(lines).toHaveLength(Math.min(3, weak.length));
        lines.forEach((l, i) => expect(l).toContain(`${Math.round((weak[i] as WeakTopic).ratio * 100)}%`));
      }),
      fcCheapConfig,
    );
  });
});

describe('nudge', () => {
  beforeEach(() => resetNudgeSession());

  it('picks the lowest ratio and breaks ties by topic name', () => {
    expect(pickNudgeTopic([])).toBeNull();
    expect(
      pickNudgeTopic([
        { topic: 'f5-matrices', ratio: 0.3 },
        { topic: 'f4-sets', ratio: 0.3 },
        { topic: 'f4-indices', ratio: 0.5 },
      ]),
    ).toEqual({ topic: 'f4-sets', ratio: 0.3 });
  });

  it('is shown at most once per session', () => {
    expect(hasNudgeBeenShown()).toBe(false);
    markNudgeShown('f4-sets');
    expect(hasNudgeBeenShown()).toBe(true);
  });

  it('carries a Quiz me on this chip and names the topic', () => {
    const n = nudgeMessage({ topic: 'f4-sets', ratio: 0.2 }, 'bm');
    expect(n.chips).toContain('quizTopic');
    expect(n.text).toContain('Set');
  });

  it('suggests Start exam and Quiz me chips when nothing is weak', () => {
    const r = ruleReply('revise_advice', { language: 'en', name: 'Aina', message: 'revise', weakTopics: [] });
    expect(r.chips).toEqual(['exam', 'quiz']);
  });
});

describe('tone and copy scan', () => {
  const GUILT = /\b(lazy|malas|fail(ed|ure)?|gagal|stupid|bodoh|teruk|afraid|takut|worry|risau|behind|ketinggalan|other students|pelajar lain|kawan-kawan lain|everyone else|better than)\b/i;

  function samples(): string[] {
    const out: string[] = [];
    for (const lang of ['bm', 'en'] as const) {
      for (const v of NUDGE_VARIANTS) out.push(v[lang]);
      for (const topic of topics) {
        out.push(nudgeMessage({ topic, ratio: 0.1 }, lang).text);
        const { c, out: first } = start(topic, lang);
        out.push(first.text);
        const q = currentQuestion(first.state);
        out.push(quizReducer(first.state, { type: 'answer', text: rightAnswer(q) }, c).text);
        out.push(quizReducer(first.state, { type: 'answer', text: 'zzz' }, c).text);
        out.push(quizReducer(first.state, { type: 'answer', text: ' ' }, c).text);
        out.push(quizReducer(first.state, { type: 'stop' }, c).text);
      }
      out.push(quizReducer(IDLE, { type: 'request', weak: [{ topic: topics[0] as string, ratio: 0.2 }] }, { language: lang }).text);
      out.push(ruleReply('revise_advice', { language: lang, name: 'Aina', message: 'x', weakTopics: [{ topic: topics[0] as string, ratio: 0.2 }] }).text);
    }
    return out;
  }

  it('has no em dash and no guilt, fear or comparison wording', () => {
    for (const s of samples()) {
      expect(s).not.toContain('\u2014');
      expect(s).not.toMatch(GUILT);
    }
  });

  it('uses no banned BM pronoun', () => {
    for (const s of samples()) expect(s).not.toMatch(new RegExp(`(?<![\\p{L}\\p{N}_])${'ka' + 'u'}(?![\\p{L}\\p{N}_])`, 'iu'));
  });
});
