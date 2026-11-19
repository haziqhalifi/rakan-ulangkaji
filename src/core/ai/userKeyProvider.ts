import { SYSTEM_PROMPT } from './systemPrompt';
import type { AIProvider, Reply, ReplyRequest } from './types';

export type UserKeyVendor = 'gemini' | 'openrouter';

/** Constant endpoints. The key is only ever sent to one of these. */
export const VENDOR_URLS: Record<UserKeyVendor, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
};
const OPENROUTER_MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

export interface UserKeyOptions {
  vendor: UserKeyVendor;
  getKey: () => Promise<string | null>;
  fetchFn?: typeof fetch;
}

function userText(request: ReplyRequest): string {
  const lines = [`Language: ${request.language === 'bm' ? 'Bahasa Melayu' : 'English'}`];
  if (request.topic) lines.push(`Topic: ${request.topic}`);
  if (request.shared?.name) lines.push(`Student name: ${request.shared.name}`);
  if (request.shared?.school) lines.push(`School: ${request.shared.school}`);
  if (request.shared?.grades) lines.push(`Grades: ${JSON.stringify(request.shared.grades)}`);
  lines.push(`Question: ${request.question}`);
  return lines.join('\n');
}

function pick(vendor: UserKeyVendor, body: unknown): string {
  const b = body as {
    candidates?: { content?: { parts?: { text?: unknown }[] } }[];
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const raw = vendor === 'gemini' ? b?.candidates?.[0]?.content?.parts?.[0]?.text : b?.choices?.[0]?.message?.content;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function createUserKeyProvider(options: UserKeyOptions): AIProvider {
  const doFetch = options.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    id: 'userKey',
    async generateReply(request, signal): Promise<Reply> {
      const key = (await options.getKey())?.trim();
      if (!key) throw new Error('no key');
      const text = userText(request);
      const init: RequestInit =
        options.vendor === 'gemini'
          ? {
              method: 'POST',
              signal,
              headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ role: 'user', parts: [{ text }] }],
                generationConfig: { maxOutputTokens: 200 },
              }),
            }
          : {
              method: 'POST',
              signal,
              headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
              body: JSON.stringify({
                model: OPENROUTER_MODEL,
                max_tokens: 200,
                messages: [
                  { role: 'system', content: SYSTEM_PROMPT },
                  { role: 'user', content: text },
                ],
              }),
            };
      const res = await doFetch(VENDOR_URLS[options.vendor], init);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const reply = pick(options.vendor, await res.json());
      if (reply === '') throw new Error('empty');
      return { text: reply, source: 'userKey' };
    },
  };
}
