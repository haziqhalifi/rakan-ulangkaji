import { PROXY_MAX_BYTES, byteLength } from './payload';
import type { AIProvider, Reply } from './types';

export const PROXY_PATH = '/api/chat';

export function createProxyProvider(options: { fetchFn?: typeof fetch } = {}): AIProvider {
  const doFetch = options.fetchFn ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  return {
    id: 'proxy',
    async generateReply(request, signal): Promise<Reply> {
      // The server owns the prompt and the schema, so only these three fields go out.
      const body = JSON.stringify({
        question: request.question,
        language: request.language,
        ...(request.topic ? { topic: request.topic } : {}),
      });
      if (byteLength(body) > PROXY_MAX_BYTES) throw new Error('too large');
      const res = await doFetch(PROXY_PATH, {
        method: 'POST',
        signal,
        headers: { 'content-type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as { text?: unknown } | null;
      const text = typeof data?.text === 'string' ? data.text.trim() : '';
      if (text === '') throw new Error('empty');
      return { text, source: 'proxy' };
    },
  };
}
