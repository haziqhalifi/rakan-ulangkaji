import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fcConfig } from '../../test/fcConfig';
import { defaultSettings } from '../profile/types';
import { generateReply } from './generateReply';
import { buildRemotePayload, byteLength, MAX_QUESTION_CHARS } from './payload';
import { INTENTS, type Intent } from './types';
import { consentedSettings, fakeProvider, makeRequest, okProvider } from './remoteHelpers';

afterEach(() => vi.useRealTimers());

const REPHRASABLE: Intent[] = ['topic_help', 'greeting', 'unknown'];
const arbQuestion = fc.string({ minLength: 1, maxLength: 500 });
const arbIntent = fc.constantFrom(...REPHRASABLE);
const arbFailure = fc.constantFrom('reject', 'timeout', 'rate_limit', 'empty', 'malformed');

describe('Property 6: remote failure falls back to the rules reply', () => {
  it('returns the rules reply for every failure mode, and the next call works', async () => {
    await fc.assert(
      fc.asyncProperty(arbQuestion, arbIntent, arbFailure, async (question, intent, mode) => {
        vi.useFakeTimers();
        const provider = fakeProvider('proxy', () => {
          switch (mode) {
            case 'reject': return Promise.reject(new Error('down'));
            case 'timeout': return new Promise(() => undefined);
            case 'rate_limit': return Promise.reject(Object.assign(new Error('429'), { status: 429 }));
            case 'empty': return Promise.resolve({ text: '  ', source: 'proxy' as const });
            default: return Promise.resolve({ text: 42 } as unknown as { text: string; source: 'proxy' });
          }
        });
        const req = makeRequest({ question, intent });
        const deps = { settings: consentedSettings(), providers: { proxy: provider }, online: () => true };
        const pending = generateReply(req, deps);
        await vi.advanceTimersByTimeAsync(8000);
        const reply = await pending;
        expect(reply).toEqual(req.ruleReply);
        const next = generateReply(req, { ...deps, providers: { proxy: okProvider() } });
        await vi.advanceTimersByTimeAsync(0);
        expect((await next).source).toBe('proxy');
        vi.useRealTimers();
      }),
      fcConfig,
    );
  });
});

describe('Property 7: no consent or offline means zero remote calls', () => {
  it('a default Settings value has every provider off and unrecorded', () => {
    const s = defaultSettings();
    expect(s.remote.proxy).toEqual({ enabled: false });
    expect(s.remote.userKey.enabled).toBe(false);
    expect(s.remote.userKey.consentAt).toBeUndefined();
  });

  it('makes zero calls and returns the rules reply', async () => {
    const arbBlock = fc.constantFrom('no_consent', 'disabled', 'offline', 'default');
    await fc.assert(
      fc.asyncProperty(arbQuestion, fc.constantFrom(...INTENTS), arbBlock, async (question, intent, block) => {
        const p = okProvider('proxy');
        const settings = block === 'default' ? defaultSettings() : consentedSettings();
        if (block === 'no_consent') delete settings.remote.proxy.consentAt;
        if (block === 'disabled') settings.remote.proxy.enabled = false;
        const req = makeRequest({ question, intent });
        const r = await generateReply(req, { settings, providers: { proxy: p }, online: () => block !== 'offline' });
        expect(p.calls).toHaveLength(0);
        expect(r).toEqual(req.ruleReply);
      }),
      fcConfig,
    );
  });
});

describe('Property 8: remote payload is minimal', () => {
  it('caps the question, keeps at most one topic, and adds shared items only with opt-in', () => {
    const arbOpt = fc.record({ name: fc.boolean(), school: fc.boolean(), grades: fc.boolean() });
    fc.assert(
      fc.property(fc.string({ maxLength: 900 }), arbOpt, (question, opt) => {
        const req = makeRequest({ question, shared: { name: 'Aina', school: 'SMK Contoh', grades: { matematik: 'A' } } });
        const p = buildRemotePayload(req, opt);
        expect(Array.from(p.question).length).toBeLessThanOrEqual(MAX_QUESTION_CHARS);
        expect(typeof p.topic === 'string' || p.topic === undefined).toBe(true);
        expect(Object.keys(p).every((k) => ['question', 'language', 'topic', 'shared'].includes(k))).toBe(true);
        expect(p.shared?.name !== undefined).toBe(opt.name);
        expect(p.shared?.school !== undefined).toBe(opt.school);
        expect(p.shared?.grades !== undefined).toBe(opt.grades);
        expect(byteLength(JSON.stringify({ ...p, question: '' }))).toBeLessThan(400);
      }),
      fcConfig,
    );
  });
});
