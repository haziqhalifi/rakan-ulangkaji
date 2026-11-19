// Cloudflare Pages Function. Same-origin proxy to the Workers AI free tier.
// It never logs request or response text. The system prompt lives here, not on the client.

export interface Env {
  AI: { run(model: string, input: unknown): Promise<unknown> };
}

export const MAX_BODY_BYTES = 2048;
export const MAX_QUESTION = 500;
export const MAX_TOPIC = 60;
export const MODEL = '@cf/meta/llama-3.2-1b-instruct';
const MAX_TOKENS = 200;

const SYSTEM_PROMPT =
  'You are Rakan, a kind SPM study buddy for Malaysian students. Reply in the language given (BM or EN), in at most four short sentences. Be warm and never scold. Do not state marks, grades or eligibility results. Do not change any numbers the student gives.';

interface ChatBody {
  question: string;
  language: 'bm' | 'en';
  topic?: string;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function parseBody(raw: unknown): ChatBody | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.question !== 'string' || r.question.trim() === '' || Array.from(r.question).length > MAX_QUESTION) return null;
  if (r.language !== 'bm' && r.language !== 'en') return null;
  const out: ChatBody = { question: r.question, language: r.language };
  if (r.topic !== undefined) {
    if (typeof r.topic !== 'string' || Array.from(r.topic).length > MAX_TOPIC) return null;
    out.topic = r.topic;
  }
  return out; // any other field is ignored
}

function extractText(result: unknown): string {
  const r = result as { response?: unknown } | null;
  return typeof r?.response === 'string' ? r.response.trim() : '';
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return json({ error: 'type' }, 415);
  }
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json({ error: 'size' }, 413);

  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return json({ error: 'size' }, 413);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ error: 'shape' }, 400);
  }
  const body = parseBody(parsed);
  if (!body) return json({ error: 'shape' }, 400);

  const lang = body.language === 'bm' ? 'Bahasa Melayu' : 'English';
  const user = `Language: ${lang}\n${body.topic ? `Topic: ${body.topic}\n` : ''}Question: ${body.question}`;
  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
      max_tokens: MAX_TOKENS,
    });
    const reply = extractText(result);
    if (reply === '') return json({ error: 'empty' }, 502);
    return json({ text: reply }, 200);
  } catch (err) {
    const status = (err as { status?: unknown } | null)?.status;
    return json({ error: 'upstream' }, status === 429 ? 429 : 502);
  }
}

export const onRequest = (ctx: { request: Request; env: Env }): Promise<Response> =>
  handleChat(ctx.request, ctx.env);
