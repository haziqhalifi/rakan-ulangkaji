// The AI layer contract. `Intent` lives here so that core never imports a feature.

import type { ChipId, Grade_Set, Language, ProviderId, TopicId } from '../profile/types';

export type { ProviderId };

export type Intent =
  | 'greeting'
  | 'quiz_request'
  | 'revise_advice'
  | 'exam_request'
  | 'pathway_request'
  | 'topic_help'
  | 'language_switch'
  | 'data_help'
  | 'unknown';

export const INTENTS: readonly Intent[] = [
  'greeting',
  'quiz_request',
  'revise_advice',
  'exam_request',
  'pathway_request',
  'topic_help',
  'language_switch',
  'data_help',
  'unknown',
];

/** A side effect the screen runs. Keeps the reply functions pure. */
export type ReplyAction = { action: 'setLanguage'; lang: Language };

export interface Reply {
  text: string;
  chips?: ChipId[];
  source: ProviderId;
  action?: ReplyAction;
}

export interface ReplyRequest {
  /** The student's message, at most 500 characters. */
  question: string;
  language: Language;
  topic?: TopicId;
  intent: Intent;
  /** The deterministic reply for the same input. Always computed first. */
  ruleReply: Reply;
  /** Candidate personal items. Only sent when the student opted in (5.6). */
  shared?: SharedItems;
}

export interface SharedItems {
  name?: string;
  school?: string;
  grades?: Grade_Set;
}

export interface AIProvider {
  readonly id: ProviderId;
  generateReply(request: ReplyRequest, signal?: AbortSignal): Promise<Reply>;
}
