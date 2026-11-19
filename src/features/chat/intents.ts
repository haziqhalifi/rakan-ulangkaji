// Intent engine: keyword matching over a normalised message. Pure, no React.

import type { Intent } from '../../core/ai';
import { TOPIC_EXPLANATIONS } from '../../content/topicExplanations';
import type { TopicId } from '../../core/profile';

type MatchedIntent = Exclude<Intent, 'unknown'>;

/** BM and EN phrases per intent. A phrase matches whole words only. */
export const intentKeywords: Readonly<Record<Exclude<MatchedIntent, 'topic_help'>, readonly string[]>> = {
  language_switch: [
    'switch language', 'change language', 'tukar bahasa', 'ubah bahasa', 'bahasa melayu', 'bahasa inggeris',
    'speak english', 'speak malay', 'cakap melayu', 'cakap inggeris', 'in english', 'in malay', 'dalam bahasa',
    'english', 'inggeris', 'bm',
  ],
  data_help: [
    'export', 'eksport', 'import', 'delete my data', 'padam data', 'padam', 'my data', 'data saya',
    'privacy', 'privasi', 'backup', 'sandaran', 'clear my data',
  ],
  exam_request: [
    'start exam', 'exam', 'mock exam', 'practice paper', 'paper', 'peperiksaan', 'mula peperiksaan',
    'kertas', 'ujian', 'periksa',
  ],
  pathway_request: [
    'pathway', 'pathways', 'laluan', 'matrikulasi', 'matriculation', 'asasi', 'stpm', 'diploma', 'tvet',
    'foundation', 'university', 'universiti', 'after spm', 'lepas spm',
  ],
  quiz_request: [
    'quiz', 'kuiz', 'quiz me', 'kuiz saya', 'test me', 'uji saya', 'soalan', 'question me', 'practice question',
  ],
  revise_advice: [
    'revise', 'revision', 'what should i revise', 'ulang kaji', 'ulangkaji', 'apa patut', 'study plan',
    'what to study', 'nak belajar apa', 'advice', 'nasihat', 'tips',
  ],
  greeting: [
    'hi', 'hai', 'hello', 'helo', 'hey', 'hye', 'yo', 'salam', 'assalamualaikum', 'selamat pagi',
    'selamat petang', 'selamat tengah hari', 'good morning', 'good afternoon', 'good evening', 'apa khabar',
    'how are you',
  ],
};

/**
 * Fixed priority, highest first. When a message matches more than one intent the first
 * one in this list wins, so the answer is always a single intent.
 */
export const INTENT_PRIORITY: readonly MatchedIntent[] = [
  'language_switch',
  'data_help',
  'exam_request',
  'pathway_request',
  'quiz_request',
  'topic_help',
  'revise_advice',
  'greeting',
];

/** Lower case, punctuation turned into spaces, letters and digits kept (diacritics too). */
export function normalise(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasPhrase(padded: string, phrase: string): boolean {
  return padded.includes(` ${phrase} `);
}

function matchesAny(padded: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => hasPhrase(padded, p));
}

/** The first topic whose keywords appear in the message, in bank order. */
export function findTopic(message: string): TopicId | undefined {
  const padded = ` ${normalise(message)} `;
  for (const [topic, info] of Object.entries(TOPIC_EXPLANATIONS)) {
    if (matchesAny(padded, info.keywords)) return topic;
  }
  return undefined;
}

export function classifyIntent(message: string): Intent {
  const norm = normalise(message);
  if (norm === '') return 'unknown';
  const padded = ` ${norm} `;
  for (const intent of INTENT_PRIORITY) {
    if (intent === 'topic_help') {
      if (findTopic(message) !== undefined) return intent;
    } else if (matchesAny(padded, intentKeywords[intent])) {
      return intent;
    }
  }
  return 'unknown';
}
