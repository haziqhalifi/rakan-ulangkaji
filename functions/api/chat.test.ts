import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleChat, MAX_BODY_BYTES, type Env } from './chat';

function fakeEnv(response: unknown = { response: 'Hello' }) {
  const run = vi.fn(() => Promise.resolve(response));
  return { env: { AI: { run } } as Env, run };
}

function post(body: string, headers: Record<string, string> = { 'content-type': 'application/json' }) {
  return new Request('https://example.test/api/chat', { method: 'POST', headers, body });
}

const valid = JSON.stringify({ question: 'What is a ratio?', language: 'en', topic: 'ratio' });

afterEach(() => vi.restoreAllMocks());

describe('Pages Function proxy', () => {
  it('answers a valid body with one AI call and no console output', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m));
    const { env, run } = fakeEnv();
    const res = await handleChat(post(valid), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: 'Hello' });
    expect(run).toHaveBeenCalledTimes(1);
    spies.forEach((s) => expect(s).not.toHaveBeenCalled());
  });

  it('rejects wrong method and content type', async () => {
    const { env, run } = fakeEnv();
    expect((await handleChat(new Request('https://example.test/api/chat'), env)).status).toBe(405);
    expect((await handleChat(post(valid, { 'content-type': 'text/plain' }), env)).status).toBe(415);
    expect(run).not.toHaveBeenCalled();
  });

  it('maps upstream errors to 429 and 502', async () => {
    const run429 = { AI: { run: () => Promise.reject(Object.assign(new Error('x'), { status: 429 })) } };
    const run500 = { AI: { run: () => Promise.reject(new Error('x')) } };
    expect((await handleChat(post(valid), run429)).status).toBe(429);
    expect((await handleChat(post(valid), run500)).status).toBe(502);
    expect((await handleChat(post(valid), fakeEnv({}).env)).status).toBe(502);
  });

  it('Property 9: oversized or malformed bodies get a rejection and no AI call', async () => {
    const arbBad = fc.oneof(
      fc.string({ minLength: MAX_BODY_BYTES + 1, maxLength: MAX_BODY_BYTES + 400 }).map((pad) => JSON.stringify({ question: 'hi', language: 'en', pad })),
      fc.string({ maxLength: 40 }).filter((s) => { try { JSON.parse(s); return false; } catch { return true; } }),
      fc.constantFrom(
        '{}', '[]', 'null', '{"question":"","language":"en"}', '{"question":"hi"}',
        '{"question":"hi","language":"fr"}', '{"question":5,"language":"bm"}',
        JSON.stringify({ question: 'x'.repeat(501), language: 'en' }),
        JSON.stringify({ question: 'hi', language: 'en', topic: 't'.repeat(61) }),
        JSON.stringify({ question: 'hi', language: 'en', topic: 7 }),
      ),
    );
    await fc.assert(
      fc.asyncProperty(arbBad, async (body) => {
        const { env, run } = fakeEnv();
        const res = await handleChat(post(body), env);
        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(run).not.toHaveBeenCalled();
      }),
      { numRuns: 100 },
    );
  });

  it('Property 9: a valid body at or under 2048 bytes calls the AI exactly once', async () => {
    const arbOk = fc.record({
      question: fc.string({ minLength: 1, maxLength: 300 }).filter((s) => s.trim() !== ''),
      language: fc.constantFrom('bm', 'en'),
      topic: fc.option(fc.string({ maxLength: 40 }), { nil: undefined }),
      extra: fc.string({ maxLength: 20 }),
    });
    await fc.assert(
      fc.asyncProperty(arbOk, async (obj) => {
        const body = JSON.stringify(obj);
        fc.pre(new TextEncoder().encode(body).length <= MAX_BODY_BYTES);
        const { env, run } = fakeEnv();
        expect((await handleChat(post(body), env)).status).toBe(200);
        expect(run).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 },
    );
  });
});
