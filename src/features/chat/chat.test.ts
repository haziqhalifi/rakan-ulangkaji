import { describe, expect, it } from 'vitest';
import { generateReply, type AIProvider, type Intent } from '../../core/ai';
import { listTopics } from '../../content/questionBank';
import { TOPIC_EXPLANATIONS } from '../../content/topicExplanations';
import { classifyIntent, findTopic, INTENT_PRIORITY } from './intents';
import { ruleReply, hashMessage } from './replies';

const TABLE: Array<[Intent, string[]]> = [
  ['greeting', ['Hi', 'hai!', 'Assalamualaikum', 'selamat pagi', 'Good morning']],
  ['quiz_request', ['Quiz me', 'Kuiz saya', 'test me please', 'uji saya']],
  ['revise_advice', ['What should I revise?', 'Apa patut saya ulang kaji?', 'study plan', 'tips']],
  ['exam_request', ['Start exam', 'Mula peperiksaan', 'mock exam', 'nak buat kertas latihan']],
  ['pathway_request', ['See my pathways', 'Lihat laluan saya', 'matrikulasi', 'what about STPM']],
  ['topic_help', ['help with indices', 'terangkan matriks', 'what is a Venn diagram', 'variasi songsang']],
  ['language_switch', ['switch language', 'tukar bahasa', 'speak English', 'cakap melayu']],
  ['data_help', ['export my data', 'padam data saya', 'privasi', 'how do I delete my data']],
  ['unknown', ['', '   ', 'blah blah', 'cuaca hari ini']],
];

describe('intent table', () => {
  for (const [intent, phrases] of TABLE) {
    it(`classifies ${intent}`, () => {
      for (const p of phrases) expect(classifyIntent(p), p).toBe(intent);
    });
  }

  it('resolves ties by the fixed priority', () => {
    expect(classifyIntent('hi, quiz me')).toBe('quiz_request');
    expect(classifyIntent('quiz me on indices')).toBe('quiz_request');
    expect(classifyIntent('hello, switch language')).toBe('language_switch');
    expect(INTENT_PRIORITY[0]).toBe('language_switch');
  });

  it('finds a topic by keyword', () => {
    expect(findTopic('tell me about matrices')).toBe('f5-matrices');
    expect(findTopic('nothing here')).toBeUndefined();
  });
});

describe('topic explanations', () => {
  const words = (s: string) => s.trim().split(/\s+/).length;
  it('cover every topic in the question bank, in 100 words or fewer', () => {
    for (const topic of listTopics()) {
      const info = TOPIC_EXPLANATIONS[topic];
      expect(info, topic).toBeDefined();
      expect(words(info!.text.en)).toBeLessThanOrEqual(100);
      expect(words(info!.text.bm)).toBeLessThanOrEqual(100);
    }
  });
});

describe('replies', () => {
  const base = { name: 'Aina', weakTopics: [] as { topic: string; ratio: number }[] };
  const intents: Intent[] = ['greeting', 'quiz_request', 'revise_advice', 'exam_request', 'pathway_request', 'topic_help', 'language_switch', 'data_help', 'unknown'];

  it('greets by name', () => {
    expect(ruleReply('greeting', { ...base, language: 'en', message: 'hi' }).text).toContain('Aina');
    expect(ruleReply('greeting', { ...base, language: 'bm', message: 'hai' }).text).toContain('Aina');
  });

  it('uses awak or korang and never the banned pronoun in BM', () => {
    const banned = new RegExp(`(?<![\\p{L}])${['k', 'a', 'u'].join('')}(?![\\p{L}])`, 'iu');
    for (const intent of intents) {
      for (const message of ['a', 'bb', 'ccc', 'indeks', 'matriks', 'hello']) {
        const text = ruleReply(intent, { ...base, language: 'bm', message }).text;
        expect(banned.test(text)).toBe(false);
        expect(text.includes('\u2014')).toBe(false);
      }
    }
    const bmTexts = ['revise_advice', 'exam_request', 'data_help', 'pathway_request'].map(
      (i) => ruleReply(i as Intent, { ...base, language: 'bm', message: 'x' }).text,
    );
    for (const t of bmTexts) expect(/awak|korang/i.test(t)).toBe(true);
  });

  it('shows the full disclaimer on pathway replies', () => {
    expect(ruleReply('pathway_request', { ...base, language: 'en', message: 'x' }).text).toContain('This is guidance only.');
    expect(ruleReply('pathway_request', { ...base, language: 'bm', message: 'x' }).text).toContain('Ini panduan sahaja.');
  });

  it('explains a topic and offers a quiz', () => {
    const r = ruleReply('topic_help', { ...base, language: 'en', message: 'help with indices' });
    expect(r.text).toContain('Indices');
    expect(r.text).toContain('quiz');
  });

  it('names the weakest topic in revise advice', () => {
    const r = ruleReply('revise_advice', { ...base, language: 'en', message: 'x', weakTopics: [{ topic: 'f5-matrices', ratio: 0.2 }] });
    expect(r.text).toContain('Matrices');
  });

  it('returns a setLanguage descriptor', () => {
    expect(ruleReply('language_switch', { ...base, language: 'bm', message: 'speak English' }).action).toEqual({ action: 'setLanguage', lang: 'en' });
    expect(ruleReply('language_switch', { ...base, language: 'en', message: 'tukar bahasa' }).action).toEqual({ action: 'setLanguage', lang: 'bm' });
  });

  it('hashes stably', () => {
    expect(hashMessage('abc')).toBe(hashMessage('abc'));
  });
});

describe('generateReply fallback', () => {
  const request = {
    question: 'hi',
    language: 'en' as const,
    intent: 'greeting' as const,
    ruleReply: { text: 'Hey Aina!', source: 'rules' as const },
  };

  it('returns the rule reply when a provider fails or returns nothing', async () => {
    const failing: AIProvider = { id: 'proxy', generateReply: () => Promise.reject(new Error('down')) };
    const empty: AIProvider = { id: 'userKey', generateReply: () => Promise.resolve({ text: ' ', source: 'userKey' }) };
    expect((await generateReply(request, { provider: failing })).text).toBe('Hey Aina!');
    expect((await generateReply(request, { provider: empty })).source).toBe('rules');
  });
});
