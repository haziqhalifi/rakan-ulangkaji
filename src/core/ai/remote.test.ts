import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '../profile/types';
import { generateReply } from './generateReply';
import { buildRemotePayload } from './payload';
import { createProxyProvider } from './proxyProvider';
import { remoteStatus } from './status';
import { createUserKeyProvider, VENDOR_URLS } from './userKeyProvider';
import { consentedSettings, fakeProvider, makeRequest, okProvider } from './remoteHelpers';

beforeEach(() => {
  vi.useFakeTimers();
  remoteStatus.set(false);
});
afterEach(() => vi.useRealTimers());

const online = () => true;

describe('generateReply fallback path', () => {
  it('returns the remote text on success and keeps the rule chips', async () => {
    const p = okProvider();
    const r = await generateReply(makeRequest(), { settings: consentedSettings(), providers: { proxy: p }, online });
    expect(r).toEqual({ text: 'Remote words', chips: ['quiz'], source: 'proxy' });
    expect(remoteStatus.get()).toBe(false);
  });

  it('falls back on failure, then the next message still works', async () => {
    let fail = true;
    const p = fakeProvider('userKey', () => (fail ? Promise.reject(new Error('boom')) : Promise.resolve({ text: 'ok', source: 'userKey' })));
    const deps = { settings: consentedSettings(['userKey']), providers: { userKey: p }, online };
    expect((await generateReply(makeRequest(), deps)).text).toBe('RULES REPLY');
    expect(remoteStatus.get()).toBe(true);
    fail = false;
    expect((await generateReply(makeRequest(), deps)).text).toBe('ok');
    expect(remoteStatus.get()).toBe(false);
  });

  it('falls back after 8 seconds and aborts the call', async () => {
    let aborted = false;
    const p = fakeProvider('proxy', (_r, signal) => new Promise(() => signal?.addEventListener('abort', () => (aborted = true))));
    const pending = generateReply(makeRequest(), { settings: consentedSettings(), providers: { proxy: p }, online });
    await vi.advanceTimersByTimeAsync(7999);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await pending).text).toBe('RULES REPLY');
    expect(aborted).toBe(true);
  });

  it('falls back on a 429 from the proxy provider', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 429 })));
    const p = createProxyProvider({ fetchFn: fetchFn as unknown as typeof fetch });
    const r = await generateReply(makeRequest(), { settings: consentedSettings(), providers: { proxy: p }, online });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(r.source).toBe('rules');
  });

  it('falls back silently on a 404 or a network error (static hosting without /api/chat)', async () => {
    const notFound = vi.fn(() => Promise.resolve(new Response('Not found', { status: 404 })));
    const broken = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')));
    for (const fetchFn of [notFound, broken]) {
      const p = createProxyProvider({ fetchFn: fetchFn as unknown as typeof fetch });
      const r = await generateReply(makeRequest(), { settings: consentedSettings(), providers: { proxy: p }, online });
      expect(r.source).toBe('rules');
    }
  });

  it('calls the proxy under the app base path', async () => {
    const fetchFn = vi.fn(() => Promise.resolve(new Response('{}', { status: 404 })));
    const p = createProxyProvider({ fetchFn: fetchFn as unknown as typeof fetch });
    await generateReply(makeRequest(), { settings: consentedSettings(), providers: { proxy: p }, online });
    expect((fetchFn.mock.calls[0] as unknown[])[0]).toBe(`${import.meta.env.BASE_URL}api/chat`);
  });

  it('makes no call without consent, when disabled, or offline', async () => {
    const p = okProvider();
    const noConsent = defaultSettings();
    noConsent.remote.proxy.enabled = true;
    const disabled = consentedSettings();
    disabled.remote.proxy.enabled = false;
    for (const [settings, on] of [[noConsent, true], [disabled, true], [consentedSettings(), false]] as const) {
      const r = await generateReply(makeRequest(), { settings, providers: { proxy: p }, online: () => on });
      expect(r.text).toBe('RULES REPLY');
    }
    expect(p.calls).toHaveLength(0);
  });

  it('never rephrases quiz, nudge or pathway intents', async () => {
    const p = okProvider();
    for (const intent of ['quiz_request', 'revise_advice', 'exam_request', 'pathway_request', 'data_help', 'language_switch'] as const) {
      await generateReply(makeRequest({ intent }), { settings: consentedSettings(), providers: { proxy: p }, online });
    }
    expect(p.calls).toHaveLength(0);
  });

  it('skips the call when the payload is over 1.8 KB', async () => {
    const p = okProvider();
    const settings = consentedSettings();
    settings.share.grades = true;
    const big = { name: 'x'.repeat(2000) };
    settings.share.name = true;
    const r = await generateReply(makeRequest({ shared: big }), { settings, providers: { proxy: p }, online });
    expect(r.source).toBe('rules');
    expect(p.calls).toHaveLength(0);
  });
});

describe('payload builder', () => {
  it('shares only opted-in items', () => {
    const req = makeRequest({ shared: { name: 'Aina', school: 'SMK Contoh', grades: { matematik: 'B' } } });
    expect(buildRemotePayload(req, { name: false, school: false, grades: false }).shared).toBeUndefined();
    expect(buildRemotePayload(req, { name: true, school: false, grades: false }).shared).toEqual({ name: 'Aina' });
  });
});

describe('user key provider', () => {
  it('sends the key only to the chosen vendor URL, in a header', async () => {
    const fetchFn = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() =>
      Promise.resolve(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: ' Hi ' }] } }] }), { status: 200 })),
    );
    const p = createUserKeyProvider({ vendor: 'gemini', getKey: () => Promise.resolve('SECRET'), fetchFn: fetchFn as unknown as typeof fetch });
    const r = await p.generateReply(makeRequest());
    expect(r.text).toBe('Hi');
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe(VENDOR_URLS.gemini);
    expect(url).not.toContain('SECRET');
    expect(String(init?.body)).not.toContain('SECRET');
  });

  it('rejects when there is no key', async () => {
    const p = createUserKeyProvider({ vendor: 'openrouter', getKey: () => Promise.resolve(null), fetchFn: vi.fn() as unknown as typeof fetch });
    await expect(p.generateReply(makeRequest())).rejects.toThrow();
  });
});
