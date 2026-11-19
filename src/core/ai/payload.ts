import type { Language } from '../profile/types';
import type { Intent, ReplyRequest, SharedItems } from './types';

export const MAX_QUESTION_CHARS = 500;
export const MAX_TOPIC_CHARS = 60;
/** The client skips the call above this size. The proxy hard limit is 2048 bytes. */
export const MAX_PAYLOAD_BYTES = 1800;
export const PROXY_MAX_BYTES = 2048;

/** Only these intents may be rephrased. Marks, nudges and pathway replies stay rules output. */
export const REPHRASABLE_INTENTS: readonly Intent[] = ['topic_help', 'greeting', 'unknown'];

export interface ShareOptIns {
  name: boolean;
  school: boolean;
  grades: boolean;
}

export interface RemotePayload {
  question: string;
  language: Language;
  topic?: string;
  shared?: SharedItems;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** Build the smallest body that can answer the question. Shared items need an opt-in. */
export function buildRemotePayload(request: ReplyRequest, optIns: ShareOptIns): RemotePayload {
  const payload: RemotePayload = {
    question: Array.from(request.question).slice(0, MAX_QUESTION_CHARS).join(''),
    language: request.language,
  };
  if (request.topic) payload.topic = Array.from(request.topic).slice(0, MAX_TOPIC_CHARS).join('');
  const s = request.shared;
  if (s) {
    const shared: SharedItems = {};
    if (optIns.name && s.name) shared.name = s.name;
    if (optIns.school && s.school) shared.school = s.school;
    if (optIns.grades && s.grades && Object.keys(s.grades).length > 0) shared.grades = s.grades;
    if (Object.keys(shared).length > 0) payload.shared = shared;
  }
  return payload;
}

export function payloadBytes(payload: RemotePayload): number {
  return byteLength(JSON.stringify(payload));
}

/** Rebuild a request that carries only what the payload allows. */
export function requestFromPayload(request: ReplyRequest, payload: RemotePayload): ReplyRequest {
  return { ...request, question: payload.question, topic: payload.topic, shared: payload.shared };
}
