import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { INTENTS, generateReply, rulesProvider } from '../../core/ai';
import { createProfileStore } from '../../core/profile';
import { createStorageService } from '../../core/storage/StorageService';
import { arbChatMessage } from '../../test/arbitraries/persisted';
import { fcCheapConfig } from '../../test/fcConfig';
import { sampleData } from '../../test/fixtures';
import { fakeDurableBackend } from '../../test/helpers';
import { CHAT_MAX_LENGTH, clampChatInput, validateChatInput } from './input';
import { classifyIntent } from './intents';
import { ruleReply } from './replies';

const arbMessage = fc.oneof(fc.string({ maxLength: 80 }), fc.stringMatching(/^[a-zA-Z .,!?]{0,60}$/));
const arbLang = fc.constantFrom('bm' as const, 'en' as const);
const arbWeak = fc.array(
  fc.record({ topic: fc.constantFrom('f4-indices', 'f4-sets', 'f5-variation', 'f5-matrices'), ratio: fc.double({ min: 0, max: 0.59, noNaN: true }) }),
  { maxLength: 3 },
);

describe('Property 4: intent classification is total and single-valued', () => {
  it('returns one allowed intent, and unknown for blank input', () => {
    fc.assert(
      fc.property(arbMessage, (m) => {
        const intent = classifyIntent(m);
        expect(INTENTS).toContain(intent);
        expect(classifyIntent(m)).toBe(intent);
      }),
      fcCheapConfig,
    );
    fc.assert(
      fc.property(fc.stringMatching(/^[ \t\n]{0,20}$/), (m) => {
        expect(classifyIntent(m)).toBe('unknown');
      }),
    );
  });
});

describe('Property 2: chat message validation', () => {
  it('accepts exactly when the trimmed length is 1 to 500', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 700 }), (raw) => {
        const n = raw.trim().length;
        expect(validateChatInput(raw).ok).toBe(n >= 1 && n <= 500);
      }),
      fcCheapConfig,
    );
  });

  it('clamps long input to 500 characters and keeps the earlier text', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 501, maxLength: 900 }), (raw) => {
        const out = clampChatInput(raw);
        expect(out.length).toBe(CHAT_MAX_LENGTH);
        expect(raw.startsWith(out)).toBe(true);
      }),
    );
  });
});

describe('Property 5: rules provider is deterministic and always replies', () => {
  it('gives equal, non-empty replies for the same input', async () => {
    await fc.assert(
      fc.asyncProperty(arbMessage, arbLang, arbWeak, async (message, language, weakTopics) => {
        const intent = classifyIntent(message);
        const ctx = { language, name: 'Aina', message, weakTopics };
        const a = ruleReply(intent, ctx);
        const b = ruleReply(intent, { ...ctx });
        expect(a).toEqual(b);
        expect(a.text.trim()).not.toBe('');
        const req = { question: message, language, intent, ruleReply: a };
        expect(await generateReply(req)).toEqual(await rulesProvider.generateReply(req));
      }),
      fcCheapConfig,
    );
  });

  it('lists the seven capabilities for unknown, in both languages', () => {
    const en = ['quiz', 'revision', 'exam', 'pathway', 'topic', 'language', 'data'];
    const bm = ['kuiz', 'ulang kaji', 'peperiksaan', 'laluan', 'topik', 'bahasa', 'data'];
    for (const message of ['', 'zzz', 'qwerty', 'asdf', 'lorem ipsum']) {
      const e = ruleReply('unknown', { language: 'en', name: 'Aina', message, weakTopics: [] }).text.toLowerCase();
      const b = ruleReply('unknown', { language: 'bm', name: 'Aina', message, weakTopics: [] }).text.toLowerCase();
      en.forEach((w) => expect(e).toContain(w));
      bm.forEach((w) => expect(b).toContain(w));
    }
  });
});

describe('Property 3: chat history restore keeps the latest 200 in order', () => {
  it('persists then restores the last min(n, 200) messages', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbChatMessage, { maxLength: 260 }), async (thread) => {
        const storage = createStorageService({ backend: fakeDurableBackend() });
        await storage.save(sampleData());
        const store = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
        await store.init();
        thread.forEach((m) => store.appendChat(m));
        await store.flush();
        const reopened = createProfileStore({ storage, defaultLanguage: 'en', debounceMs: 0 });
        await reopened.init();
        expect(reopened.getState().chat).toEqual(thread.slice(-200));
      }),
      { numRuns: 25 },
    );
  });
});
