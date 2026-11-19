// Reply templates for the rules provider. Pure and deterministic:
// the variant is chosen by hash(message) % variants.length, never by chance or by the clock.

import { explanationFor } from '../../content/topicExplanations';
import { topicLabel } from '../../content/questionBank';
import { pick, getDisclaimer } from '../../core/i18n';
import type { Intent, Reply } from '../../core/ai';
import type { Bilingual, Grade, Language, TopicId, WeakTopic } from '../../core/profile';
import { findTopic } from './intents';

export interface ReplyContext {
  language: Language;
  name: string;
  /** The student's message. Drives the choice of variant. */
  message: string;
  weakTopics: readonly WeakTopic[];
  latestExam?: { percent: number; grade: Grade };
}

type Variants = readonly Bilingual[];

/** Small stable string hash (djb2 variant). Always returns a non-negative integer. */
export function hashMessage(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

function choose(variants: Variants, message: string): Bilingual {
  return variants[hashMessage(message) % variants.length] as Bilingual;
}

function fill(template: string, params: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => params[key] ?? whole);
}

const GREETING: Variants = [
  { bm: 'Hai {name}! Nak ulang kaji apa hari ni?', en: 'Hey {name}! What shall we revise today?' },
  { bm: 'Hai {name}, seronok jumpa awak. Jom mula sikit demi sikit.', en: 'Hi {name}, good to see you. Let us start small.' },
  { bm: 'Hello {name}! Korang boleh tanya apa-apa pasal Matematik.', en: 'Hello {name}! Ask me anything about Matematik.' },
];

const QUIZ: Variants = [
  {
    bm: 'Jom kuiz! Tekan Kuiz saya di bawah, pilih satu topik, dan kita mula satu soalan demi satu soalan.',
    en: 'Let us quiz! Tap Quiz me below, pick a topic, and we go one question at a time.',
  },
];

const EXAM: Variants = [
  {
    bm: 'Jom! Kertas latihan ada masa dan skema jawapan. Tekan butang Mula peperiksaan di bawah bila awak sedia.',
    en: 'Let us go! The practice paper is timed and comes with an answer scheme (skema). Tap Start exam below.',
  },
  {
    bm: 'Boleh. Kertas latihan ini untuk melihat di mana awak berada sekarang. Tekan Mula peperiksaan bila sedia.',
    en: 'Sure. The practice paper shows where you stand right now. Tap Start exam when you are ready.',
  },
];

const REVISE_NONE: Variants = [
  {
    bm: 'Awak belum ada rekod lagi, jadi mula dengan kertas latihan untuk nampak topik mana yang perlu perhatian. Atau tanya saya tentang satu topik.',
    en: 'There is no record yet, so start with the practice paper to see which topic needs attention. Or ask me about one topic.',
  },
  {
    bm: 'Awak boleh mula dari mana-mana pun. Cuba kertas latihan, atau sebut satu topik seperti variasi dan saya terangkan.',
    en: 'You can start anywhere. Try the practice paper, or name a topic like variation and I will explain it.',
  },
];

const REVISE_WEAK_HEAD: Bilingual = {
  bm: 'Belum sampai lagi, tapi awak dah mula. Ini topik yang boleh awak tengok dahulu:',
  en: 'Not there yet, but you have started. Here are topics to look at first:',
};

const REVISE_WEAK_TAIL: Bilingual = {
  bm: 'Tekan "Kuiz saya" untuk berlatih, atau sebut nama topik untuk penerangan ringkas.',
  en: 'Tap "Quiz me" to practise, or say a topic name for a quick explanation.',
};

const REVISE_STRONG: Variants = [
  {
    bm: 'Setakat ini awak buat dengan baik. Untuk terus berlatih, cuba kertas latihan sekali lagi atau tanya saya tentang topik yang awak kurang yakin.',
    en: 'You are doing well so far. To keep going, try the practice paper again or ask me about a topic you feel unsure of.',
  },
];

const PATHWAY: Variants = [
  {
    bm: 'Dengan gred ini, beberapa laluan mungkin terbuka. Tekan Lihat laluan saya di bawah untuk awak melihatnya.',
    en: 'With your grades, some routes may be open. Tap See my pathways below to look.',
  },
  {
    bm: 'Papan laluan boleh tunjuk pilihan yang mungkin sesuai untuk awak, termasuk bila awak cuba gred "kalau-kalau". Tekan Lihat laluan saya.',
    en: 'The pathway board can show options that may suit you, including "what if" grades. Tap See my pathways.',
  },
];

const TOPIC_HELP_OFFER: Bilingual = {
  bm: 'Bila sedia, sebut "kuiz" dan kita cuba soalan.',
  en: 'When you are ready, say "quiz" and we will try some questions.',
};

const TOPIC_HELP_MISSING: Bilingual = {
  bm: 'Saya boleh terangkan indeks, set, variasi atau matriks. Topik mana yang awak mahu?',
  en: 'I can explain indices, sets, variation or matrices. Which topic would you like?',
};

const LANGUAGE: Record<Language, Variants> = {
  bm: [{ bm: 'Baik, kita guna Bahasa Melayu.', en: 'Okay, we will use Bahasa Melayu.' }],
  en: [{ bm: 'Okay, kita guna English.', en: 'Okay, we will use English.' }],
};

const DATA_HELP: Variants = [
  {
    bm: 'Data awak kekal dalam pelayar ini. Di Tetapan, awak boleh eksport salinan atau padam semuanya.',
    en: 'Your data stays in this browser. In Settings you can export a copy or delete everything.',
  },
  {
    bm: 'Korang boleh urus data di Tetapan: eksport, import atau padam. Tiada apa dihantar ke mana-mana secara lalai.',
    en: 'You can manage your data in Settings: export, import or delete. Nothing is sent anywhere by default.',
  },
];

const UNKNOWN: Variants = [
  {
    bm: 'Saya belum faham yang itu. Ini yang saya boleh buat: beri kuiz, cadangan ulang kaji, mula peperiksaan, tunjuk laluan, terangkan topik, tukar bahasa, dan bantu urus data awak.',
    en: 'I did not catch that. Here is what I can do: give quizzes, give revision advice, start an exam, show pathways, explain a topic, switch language, and help with your data.',
  },
  {
    bm: 'Hmm, saya tak pasti. Awak boleh minta kuiz, cadangan ulang kaji, peperiksaan, laluan, penerangan topik, tukar bahasa, atau bantuan data.',
    en: 'Hmm, I am not sure. You can ask for a quiz, revision advice, an exam, pathways, a topic explanation, a language switch, or data help.',
  },
];

/** Which language the student asked for. Without a clear word, flip the current one. */
export function requestedLanguage(message: string, current: Language): Language {
  const m = ` ${message.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  if (/ (english|inggeris) /.test(m)) return 'en';
  if (/ (bm|melayu|malay|bahasa) /.test(m)) return 'bm';
  return current === 'bm' ? 'en' : 'bm';
}

function text(variants: Variants, ctx: ReplyContext, params: Record<string, string> = {}): string {
  return fill(pick(choose(variants, ctx.message), ctx.language), { name: ctx.name, ...params });
}

export function ruleReply(intent: Intent, ctx: ReplyContext): Reply {
  const lang = ctx.language;
  switch (intent) {
    case 'greeting':
      return { text: text(GREETING, ctx), source: 'rules' };
    case 'quiz_request':
      return { text: text(QUIZ, ctx), source: 'rules' };
    case 'exam_request':
      return { text: text(EXAM, ctx), source: 'rules' };
    case 'revise_advice': {
      const weak = ctx.weakTopics[0];
      if (weak) {
        const lines = ctx.weakTopics
          .slice(0, 3)
          .map((w, i) => `${i + 1}. ${pick(topicLabel(w.topic), lang)}: ${Math.round(w.ratio * 100)}%`);
        return {
          text: `${pick(REVISE_WEAK_HEAD, lang)}\n${lines.join('\n')}\n\n${pick(REVISE_WEAK_TAIL, lang)}`,
          chips: ['quiz'],
          source: 'rules',
        };
      }
      return { text: text(ctx.latestExam ? REVISE_STRONG : REVISE_NONE, ctx), chips: ['exam', 'quiz'], source: 'rules' };
    }
    case 'pathway_request':
      return { text: `${text(PATHWAY, ctx)}\n\n${getDisclaimer(lang)}`, source: 'rules' };
    case 'topic_help': {
      const topic: TopicId | undefined = findTopic(ctx.message);
      const explanation = topic ? explanationFor(topic) : undefined;
      if (!topic || !explanation) return { text: pick(TOPIC_HELP_MISSING, lang), source: 'rules' };
      return {
        text: `${pick(explanation, lang)}\n\n${pick(TOPIC_HELP_OFFER, lang)}`,
        source: 'rules',
      };
    }
    case 'language_switch': {
      const target = requestedLanguage(ctx.message, lang);
      return {
        text: pick(choose(LANGUAGE[target], ctx.message), target),
        source: 'rules',
        action: { action: 'setLanguage', lang: target },
      };
    }
    case 'data_help':
      return { text: text(DATA_HELP, ctx), source: 'rules' };
    case 'unknown':
      return { text: text(UNKNOWN, ctx), source: 'rules' };
  }
}

/** The greeting shown when the chat opens. Uses the first variant so it never flickers. */
export function openingGreeting(lang: Language, name: string): string {
  return fill(pick(GREETING[0] as Bilingual, lang), { name });
}
