// Nudge logic. One gentle nudge per app session, never guilt, fear or comparison.

import { topicLabel } from '../../content/questionBank';
import { pick } from '../../core/i18n';
import type { Bilingual, ChipId, Language, TopicId, WeakTopic } from '../../core/profile';

/** Lowest ratio first. Ties go to the earliest topic name. Null when the list is empty. */
export function pickNudgeTopic(weak: readonly WeakTopic[]): WeakTopic | null {
  let best: WeakTopic | null = null;
  for (const w of weak) {
    if (best === null || w.ratio < best.ratio || (w.ratio === best.ratio && w.topic < best.topic)) best = w;
  }
  return best;
}

let nudgeShownThisSession = false;
let nudgeTopic: TopicId | null = null;

export function hasNudgeBeenShown(): boolean {
  return nudgeShownThisSession;
}

/** The topic named in the nudge shown this session, if any. */
export function nudgeTopicThisSession(): TopicId | null {
  return nudgeTopic;
}

export function markNudgeShown(topic: TopicId): void {
  nudgeShownThisSession = true;
  nudgeTopic = topic;
}

/** For tests only. A real session resets when the page reloads. */
export function resetNudgeSession(): void {
  nudgeShownThisSession = false;
  nudgeTopic = null;
}

export const NUDGE_VARIANTS: readonly Bilingual[] = [
  {
    bm: 'Korang, 10 minit je pun. {topic} boleh jadi tempat mula yang baik. Satu kuiz kecil?',
    en: 'Hey, just 10 minutes. {topic} could be a good place to start. A small quiz?',
  },
  {
    bm: 'Hai, kalau awak ada masa sikit, jom cuba {topic}. Perlahan-lahan pun tak apa.',
    en: 'Hi, if you have a little time, let us try {topic}. Slow and steady is fine.',
  },
];

export const NO_WEAK_CHIPS: ChipId[] = ['exam', 'quiz'];

export interface NudgeMessage {
  text: string;
  chips: ChipId[];
}

/** Build the nudge text. The variant depends on the topic name, so it is stable. */
export function nudgeMessage(weak: WeakTopic, lang: Language): NudgeMessage {
  const variant = NUDGE_VARIANTS[weak.topic.length % NUDGE_VARIANTS.length] as Bilingual;
  const text = pick(variant, lang).replace('{topic}', pick(topicLabel(weak.topic), lang));
  return { text, chips: ['quizTopic'] };
}
